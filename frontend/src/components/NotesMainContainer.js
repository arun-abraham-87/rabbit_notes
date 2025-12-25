import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { debounce } from 'lodash';
import { useLocation } from 'react-router-dom';
import { XMarkIcon, EyeIcon, EyeSlashIcon, FireIcon, TrashIcon } from '@heroicons/react/24/solid';
import InfoPanel from './InfoPanel.js';
import NotesList from './NotesList.js';
import WatchList from './WatchList';
import { updateNoteById, loadNotes, defaultSettings, deleteNoteById, deleteNoteWithImages } from '../utils/ApiUtils';
import { isSameAsTodaysDate } from '../utils/DateUtils';
import { searchInNote, buildSuggestionsFromNotes } from '../utils/NotesUtils';
import NoteFilters from './NoteFilters';

// API Base URL for image uploads
const API_BASE_URL = 'http://localhost:5001/api';

const NotesMainContainer = ({
    objList = [],
    allNotes = [],
    addNote,
    setAllNotes,
    objects = [],
    searchQuery = '',
    setSearchQuery,
    addTag,
    settings = defaultSettings,
    refreshTags = () => { },
}) => {
    // Debug logging for developer mode

    const location = useLocation();
    const [checked, setChecked] = useState(false);
    const [compressedView, setCompressedView] = useState(false);
    const [totals, setTotals] = useState({ totals: 0 });
    const [currentDate, setCurrentDate] = useState(null);
    const [excludeEvents, setExcludeEvents] = useState(settings?.excludeEventsByDefault || false);
    const [excludeMeetings, setExcludeMeetings] = useState(settings?.excludeMeetingsByDefault || false);
    const [excludeEventNotes, setExcludeEventNotes] = useState(true); // Default to true to exclude event notes
    const [excludeBackupNotes, setExcludeBackupNotes] = useState(true); // Default to true to exclude backup notes
    const [excludeWatchEvents, setExcludeWatchEvents] = useState(true); // Default to true to exclude watch events
    const [excludeBookmarks, setExcludeBookmarks] = useState(true); // Default to true to exclude bookmarks
    const [excludeExpenses, setExcludeExpenses] = useState(true); // Default to true to exclude expenses
    const [excludeSensitive, setExcludeSensitive] = useState(true); // Default to true to exclude sensitive notes
    const [excludeTrackers, setExcludeTrackers] = useState(true); // Default to true to exclude tracker notes
    const [showDeadlinePassedFilter, setShowDeadlinePassedFilter] = useState(false);
    const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
    const [resetFilters, setResetFilters] = useState(false);
    const [focusMode, setFocusMode] = useState(() => {
        // Load focus mode state from localStorage on component mount
        const saved = localStorage.getItem('focusMode');
        return saved ? JSON.parse(saved) : false;
    });

    const [popularMode, setPopularMode] = useState(() => {
        // Load popular mode state from localStorage on component mount
        const saved = localStorage.getItem('popularMode');
        return saved ? JSON.parse(saved) : false;
    });

    const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
    const [bulkDeleteNoteId, setBulkDeleteNoteId] = useState(null);
    const searchInputRef = useRef(null);
    const hasParsedInitialUrl = useRef(false);

    // Add suggestion state
    const [showPopup, setShowPopup] = useState(false);
    const [filteredTags, setFilteredTags] = useState([]);
    const [selectedTagIndex, setSelectedTagIndex] = useState(-1);
    const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
    const throttleRef = useRef(null);

    // Image handling state
    const [pastedImage, setPastedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);

    // Compress image while maintaining dimensions
    const compressImage = (file, quality = 0.8) => {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                // Keep original dimensions
                canvas.width = img.width;
                canvas.height = img.height;

                // Draw image on canvas
                ctx.drawImage(img, 0, 0);

                // Convert to blob with compression
                canvas.toBlob(
                    (blob) => resolve(blob),
                    'image/jpeg', // Convert to JPEG for better compression
                    quality
                );
            };

            img.src = URL.createObjectURL(file);
        });
    };

    // Upload image to server
    const uploadImage = async (file) => {
        const formData = new FormData();

        // Compress image first (except for GIFs to preserve animation)
        let fileToProcess = file;
        if (file.type !== 'image/gif') {
            console.log(`📊 Original size: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
            fileToProcess = await compressImage(file, 0.8);
            console.log(`📊 Compressed size: ${(fileToProcess.size / 1024 / 1024).toFixed(2)} MB`);
        }

        // Ensure the file has a proper extension based on its MIME type
        let filename = file.name;
        if (!filename || !filename.includes('.')) {
            const mimeType = fileToProcess.type;
            let extension = '.jpg'; // Default to JPG for compressed images

            if (file.type === 'image/gif') extension = '.gif'; // Keep GIF as GIF
            else if (file.type === 'image/png' && file.type === fileToProcess.type) extension = '.png';
            else extension = '.jpg'; // Compressed images become JPG

            filename = `clipboard-image${extension}`;
        } else {
            // Update extension if we compressed to JPEG
            if (file.type !== 'image/gif' && !filename.toLowerCase().endsWith('.gif')) {
                filename = filename.replace(/\.[^/.]+$/, '.jpg');
            }
        }

        // Create a new File object with proper filename
        const finalFile = new File([fileToProcess], filename, { type: fileToProcess.type });

        formData.append('image', finalFile);

        try {
            const response = await fetch(`${API_BASE_URL}/images`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error('Failed to upload image');
            }

            const data = await response.json();
            return {
                imageUrl: data.imageUrl,
                imageId: data.imageId
            };
        } catch (error) {
            console.error('Error uploading image:', error);
            throw error;
        }
    };

    // Cleanup image preview URL on unmount
    useEffect(() => {
        return () => {
            if (imagePreview) {
                URL.revokeObjectURL(imagePreview);
            }
        };
    }, [imagePreview]);

    // Handle image paste
    const handlePaste = (e) => {
        // Check for images first
        const items = e.clipboardData?.items;
        if (items) {
            for (let i = 0; i < items.length; i++) {
                const item = items[i];
                if (item.type.startsWith('image/')) {
                    e.preventDefault();
                    const blob = item.getAsFile();
                    if (blob) {
                        // Create a proper File object with extension from MIME type
                        let extension = '.png'; // Default
                        if (item.type === 'image/jpeg') extension = '.jpg';
                        else if (item.type === 'image/png') extension = '.png';
                        else if (item.type === 'image/gif') extension = '.gif';
                        else if (item.type === 'image/webp') extension = '.webp';

                        const file = new File([blob], `clipboard-image${extension}`, { type: item.type });

                        setPastedImage(file);
                        setImagePreview(URL.createObjectURL(file));
                        console.log('📸 [NotesMainContainer] Image pasted and preview set');
                    }
                    return;
                }
            }
        }
    };

    // Handle note creation with optional image
    const handleCreateNote = async () => {
        try {
            setIsUploadingImage(true);
            let noteContent = localSearchQuery.trim();

            // Handle image upload if image is pasted
            if (pastedImage) {
                const response = await uploadImage(pastedImage);
                const { imageId } = response;

                // Add only the meta tag (no markdown line)
                const imageMetaTag = `meta::image::${imageId}`;
                noteContent = noteContent +
                    (noteContent ? '\n' : '') +
                    imageMetaTag;

                console.log('✅ [NotesMainContainer] Image uploaded and added to note');
            }

            // Create note if there's content or an image
            if (noteContent || pastedImage) {
                addNote(noteContent || 'Image');
                setLocalSearchQuery('');
                setSearchQuery('');

                // Clear image state after successful save
                setPastedImage(null);
                setImagePreview(null);
            }

            setIsUploadingImage(false);
        } catch (error) {
            console.error('❌ [NotesMainContainer] Error creating note with image:', error);
            alert('Failed to upload image. Please try again.');
            setIsUploadingImage(false);
        }
    };

    // Focus search input on mount
    useEffect(() => {
        if (searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, []);

    // Synchronize localSearchQuery with searchQuery prop
    useEffect(() => {
        setLocalSearchQuery(searchQuery);
    }, [searchQuery]);

    // Handle navigation state from search modal
    useEffect(() => {
        if (location.state?.searchQuery) {
            setSearchQuery(location.state.searchQuery);
            setLocalSearchQuery(location.state.searchQuery);
            // Clear all filters when showing a specific note
            setExcludeEvents(false);
            setExcludeMeetings(false);
            setExcludeEventNotes(false);
            setExcludeBackupNotes(false);
            setExcludeWatchEvents(false);
            setShowDeadlinePassedFilter(false);
            // Trigger UI filter reset
            setResetFilters(true);
            // Clear the state to prevent it from persisting
            window.history.replaceState({}, document.title);
        }
    }, [location.state, setSearchQuery]);

    // Handle URL query parameters for note filtering
    useEffect(() => {
        if (hasParsedInitialUrl.current) return;

        // Parse query parameters from both location.search and the hash portion
        let urlParams;
        if (location.search) {
            // Standard query parameters
            urlParams = new URLSearchParams(location.search);
        } else {
            // For HashRouter, check if there are query parameters in the pathname
            const pathWithQuery = location.pathname;
            const queryIndex = pathWithQuery.indexOf('?');
            if (queryIndex !== -1) {
                const queryString = pathWithQuery.substring(queryIndex + 1);
                urlParams = new URLSearchParams(queryString);
            }
        }

        const noteId = urlParams?.get('note');

        if (noteId) {
            // Use the existing ID-based search functionality with 'id:' prefix
            const idSearchQuery = `id:${noteId}`;
            setSearchQuery(idSearchQuery);

            // Find the note to display a user-friendly search query
            const targetNote = allNotes.find(note => note.id === noteId);
            if (targetNote) {
                const firstLine = targetNote.content.split('\n')[0]?.trim();
                const displayQuery = firstLine ? `Showing note: ${firstLine}` : `Showing note ID: ${noteId}`;
                setLocalSearchQuery(displayQuery);
            } else {
                setLocalSearchQuery(idSearchQuery);
            }

            // Clear all filters when showing a specific note
            setExcludeEvents(false);
            setExcludeMeetings(false);
            setExcludeEventNotes(false);
            setExcludeBackupNotes(false);
            setExcludeWatchEvents(false);
            setExcludeSensitive(false);
            setExcludeTrackers(false);
            setExcludeBookmarks(false);
            setExcludeExpenses(false);
            setShowDeadlinePassedFilter(false);
            // Trigger UI filter reset
            setResetFilters(true);
            hasParsedInitialUrl.current = true;
        }
    }, [location.pathname, location.search, allNotes, setSearchQuery]);

    // Handle temporary search query from localStorage (for bookmark navigation)
    useEffect(() => {
        const tempSearchQuery = localStorage.getItem('tempSearchQuery');
        if (tempSearchQuery) {
            setSearchQuery(tempSearchQuery);
            setLocalSearchQuery(tempSearchQuery);
            // Clear all filters when showing a specific note
            setExcludeEvents(false);
            setExcludeMeetings(false);
            setExcludeEventNotes(false);
            setExcludeBackupNotes(false);
            setExcludeWatchEvents(false);
            setShowDeadlinePassedFilter(false);
            // Trigger UI filter reset
            setResetFilters(true);
            // Clear the temporary search query
            localStorage.removeItem('tempSearchQuery');
        }
    }, [setSearchQuery]);

    // Reset the resetFilters flag after it's been processed
    useEffect(() => {
        if (resetFilters) {
            // Reset the flag after a short delay to allow the NoteFilters component to process it
            const timer = setTimeout(() => {
                setResetFilters(false);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [resetFilters]);

    // Global keyboard event listener for 'f' key to toggle focus mode and 'c' key to focus search
    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            // Only handle keys when not in an input/textarea and no modifier keys
            if (!e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey &&
                e.target.tagName !== 'INPUT' &&
                e.target.tagName !== 'TEXTAREA' &&
                e.target.contentEditable !== 'true') {



                if (e.key === "f") {
                    e.preventDefault();
                    setFocusMode(!focusMode);
                }
                if (e.key === "d") {
                    e.preventDefault();
                    // Dispatch a custom event to trigger bulk delete mode
                    const bulkDeleteEvent = new CustomEvent('toggleBulkDeleteMode');
                    document.dispatchEvent(bulkDeleteEvent);
                }
                if (e.key === "m") {
                    e.preventDefault();
                    // Dispatch a custom event to trigger multi-move mode
                    const multiMoveEvent = new CustomEvent('toggleMultiMoveMode');
                    document.dispatchEvent(multiMoveEvent);
                }
                if (e.key === "t") {
                    e.preventDefault();

                    // Dispatch a custom event to open note editor in text mode
                    const openNoteEditorEvent = new CustomEvent('openNoteEditorTextMode');
                    document.dispatchEvent(openNoteEditorEvent);
                }
                if (e.key === "Escape") {
                    e.preventDefault();
                    // Dispatch a custom event to exit bulk delete mode
                    const exitBulkDeleteEvent = new CustomEvent('exitBulkDeleteMode');
                    document.dispatchEvent(exitBulkDeleteEvent);
                }
            }


        };

        document.addEventListener('keydown', handleGlobalKeyDown);

        return () => {
            document.removeEventListener('keydown', handleGlobalKeyDown);
        };
    }, [focusMode]);

    // Listen for return to search event from notes navigation
    useEffect(() => {


        const handleReturnToSearch = () => {

            // Focus the search input
            if (searchInputRef.current) {
                searchInputRef.current.focus();
                // Move cursor to end of text
                const length = searchInputRef.current.value.length;
                searchInputRef.current.setSelectionRange(length, length);
            }
            // Clear the focused note by dispatching a custom event
            const clearFocusedNoteEvent = new CustomEvent('clearFocusedNote');
            document.dispatchEvent(clearFocusedNoteEvent);

        };

        document.addEventListener('returnToSearch', handleReturnToSearch);
        return () => {

            document.removeEventListener('returnToSearch', handleReturnToSearch);
        };
    }, []);

    // Listen for toggle focus mode event from notes navigation
    useEffect(() => {


        const handleToggleFocusMode = () => {

            setFocusMode(false); // Exit focus mode
        };

        document.addEventListener('toggleFocusMode', handleToggleFocusMode);
        return () => {

            document.removeEventListener('toggleFocusMode', handleToggleFocusMode);
        };
    }, []);

    // Debug: Log objList
    useEffect(() => {



    }, [objList]);

    // Save focus mode state to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('focusMode', JSON.stringify(focusMode));
    }, [focusMode]);

    // Save popular mode state to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('popularMode', JSON.stringify(popularMode));
    }, [popularMode]);

    // Debounced search function
    const debouncedSetSearchQuery = useCallback(
        debounce((query) => {
            setSearchQuery(query);
        }, 500),
        []
    );

    // Get cursor coordinates for popup positioning
    const getCursorCoordinates = (event) => {
        const textarea = event.target;
        const rect = textarea.getBoundingClientRect();

        // Get cursor position within the textarea
        const textBeforeCursor = textarea.value.substring(0, textarea.selectionStart);
        const lines = textBeforeCursor.split('\n');
        const currentLine = lines[lines.length - 1];

        // Create a temporary element to measure text width
        const temp = document.createElement('span');
        temp.style.font = window.getComputedStyle(textarea).font;
        temp.style.whiteSpace = 'pre';
        temp.style.position = 'absolute';
        temp.style.visibility = 'hidden';
        temp.textContent = currentLine;
        document.body.appendChild(temp);

        const charWidth = temp.offsetWidth / currentLine.length;
        const cursorX = rect.left + (currentLine.length * charWidth) + 10; // Add some padding
        const cursorY = rect.bottom + 5; // Position below the textarea

        document.body.removeChild(temp);

        return { x: cursorX, y: cursorY };
    };

    // Update local search query immediately, but debounce the actual search
    const handleSearchChange = (e) => {
        const query = e.target.value;
        setLocalSearchQuery(query);
        debouncedSetSearchQuery(query);

        // Add suggestion logic
        const match = query.match(/(\S+)$/); // Match the last word
        if (match) {
            const filterText = match[1].toLowerCase();
            let filtered = [];

            // Throttle logic
            if (filterText !== "") {
                clearTimeout(throttleRef.current); // Clear the existing timeout
                throttleRef.current = setTimeout(() => {
                    // Filter based on the text property of each object
                    filtered = mergedObjList.filter((tag) => {
                        if (!tag || !tag.text) return false;
                        return tag.text.toLowerCase().includes(filterText);
                    });







                    // Debug: Check if any tags contain the filter text
                    const debugMatches = mergedObjList.filter(tag => {
                        if (!tag || !tag.text) return false;
                        const contains = tag.text.toLowerCase().includes(filterText);
                        if (contains) {

                        }
                        return contains;
                    });


                    setFilteredTags(filtered);

                    if (filtered.length > 0) {
                        const { x, y } = getCursorCoordinates(e);


                        setCursorPosition({ x, y });
                        setShowPopup(true);
                    } else {

                        setShowPopup(false);
                    }
                }, 300); // 300ms delay for throttling
            }
        } else {
            setShowPopup(false);
        }
    };

    // Handle tag selection
    const handleSelectTag = (tag) => {
        const lastSpaceIndex = localSearchQuery.lastIndexOf(" ");
        const updatedText =
            (lastSpaceIndex === -1 ? "" : localSearchQuery.slice(0, lastSpaceIndex + 1)) +
            `${tag.text} `;
        setLocalSearchQuery(updatedText);
        setSearchQuery(updatedText);
        setShowPopup(false);
        setSelectedTagIndex(-1);

        // Focus back to textarea
        if (searchInputRef.current) {
            searchInputRef.current.focus();
        }
    };

    // Handle keyboard shortcuts
    const handleKeyDown = (e) => {
        // Handle suggestion navigation
        if (showPopup) {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setSelectedTagIndex((prev) =>
                    prev < filteredTags.length - 1 ? prev + 1 : 0
                );
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setSelectedTagIndex((prev) =>
                    prev > 0 ? prev - 1 : filteredTags.length - 1
                );
            } else if (e.key === "Enter") {
                e.preventDefault();
                if (selectedTagIndex >= 0) {
                    handleSelectTag(filteredTags[selectedTagIndex]);
                } else if (filteredTags.length > 0) {
                    handleSelectTag(filteredTags[0]);
                } else {
                    // Create note if no suggestions
                    if (localSearchQuery.trim() || pastedImage) {
                        handleCreateNote();
                    }
                }
            } else if (e.key === "Tab") {
                e.preventDefault();
                if (filteredTags.length > 0) {
                    handleSelectTag(filteredTags[0]);
                }
            } else if (e.key === "Escape") {
                setShowPopup(false);
            }
        } else {
            // Handle Escape key to remove focus from search bar and clear text
            if (e.key === "Escape") {
                e.preventDefault();
                setLocalSearchQuery('');
                setSearchQuery('');
                setShowPopup(false);
                searchInputRef.current?.blur();
                return;
            }

            // Handle down arrow to move to first note when search bar is focused
            if (e.key === "ArrowDown" && filteredNotes.length > 0) {
                e.preventDefault();
                // Remove focus from search bar
                searchInputRef.current?.blur();
                // Trigger focus to first note by dispatching a custom event
                const focusFirstNoteEvent = new CustomEvent('focusFirstNote');
                document.dispatchEvent(focusFirstNoteEvent);
                return;
            }

            // Check for Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux)
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                handleCreateNote();
            }
        }
    };

    // Cleanup debounced function on unmount
    useEffect(() => {
        return () => {
            debouncedSetSearchQuery.cancel();
        };
    }, [debouncedSetSearchQuery]);

    // Filter notes for display based on selected date and exclude states
    const filteredNotes = useMemo(() => {
        let filtered = allNotes.filter(note => {
            // Exclude event notes if the filter is enabled
            if (excludeEventNotes && note.content && note.content.includes('meta::event::')) {
                return false;
            }
            // Exclude backup notes if the filter is enabled
            if (excludeBackupNotes && note.content && note.content.includes('meta::notes_backup_date')) {
                return false;
            }
            // Exclude watch events if the filter is enabled
            if (excludeWatchEvents && note.content && note.content.includes('meta::watch')) {
                return false;
            }
            // Exclude bookmarks if the filter is enabled
            if (excludeBookmarks && note.content && (note.content.includes('meta::bookmark') || note.content.includes('meta::web_bookmark'))) {
                return false;
            }
            // Exclude expenses if the filter is enabled
            if (excludeExpenses && note.content && note.content.includes('meta::expense')) {
                return false;
            }
            // Exclude sensitive notes if the filter is enabled
            if (excludeSensitive && note.content && note.content.includes('meta::sensitive::')) {
                return false;
            }
            // Exclude tracker notes if the filter is enabled
            if (excludeTrackers && note.content && note.content.includes('meta::tracker')) {
                return false;
            }
            return (!searchQuery && isSameAsTodaysDate(note.created_datetime)) || searchInNote(note, searchQuery);
        });

        // Apply popular mode filtering when enabled and no search query
        if (popularMode && !searchQuery) {
            try {
                const clickCounts = JSON.parse(localStorage.getItem('noteClickCounts') || '{}');

                // In popular mode, consider all notes from allNotes, not just filtered ones
                let allNotesForPopular = allNotes.filter(note => {
                    // Apply the same exclusion filters
                    if (excludeEventNotes && note.content && note.content.includes('meta::event::')) {
                        return false;
                    }
                    if (excludeBackupNotes && note.content && note.content.includes('meta::notes_backup_date')) {
                        return false;
                    }
                    if (excludeWatchEvents && note.content && note.content.includes('meta::watch')) {
                        return false;
                    }
                    if (excludeBookmarks && note.content && (note.content.includes('meta::bookmark') || note.content.includes('meta::web_bookmark'))) {
                        return false;
                    }
                    if (excludeExpenses && note.content && note.content.includes('meta::expense')) {
                        return false;
                    }
                    if (excludeSensitive && note.content && note.content.includes('meta::sensitive::')) {
                        return false;
                    }
                    if (excludeTrackers && note.content && note.content.includes('meta::tracker')) {
                        return false;
                    }
                    return true;
                });

                // Get today's notes (regardless of click count)
                const todaysNotes = allNotesForPopular.filter(note =>
                    isSameAsTodaysDate(note.created_datetime)
                );

                // Get popular notes (click count > 0, sorted by click count)
                const popularNotes = allNotesForPopular
                    .map(note => ({
                        ...note,
                        clickCount: clickCounts[note.id] || 0
                    }))
                    .filter(note => note.clickCount > 0)
                    .sort((a, b) => b.clickCount - a.clickCount)
                    .slice(0, 50)
                    .map(note => {
                        // Remove the clickCount property we added for sorting
                        const { clickCount, ...noteWithoutClickCount } = note;
                        return noteWithoutClickCount;
                    });

                // Combine popular notes first, then today's notes, removing duplicates
                const combinedNotes = [...popularNotes];
                todaysNotes.forEach(todayNote => {
                    if (!combinedNotes.some(popularNote => popularNote.id === todayNote.id)) {
                        combinedNotes.push(todayNote);
                    }
                });

                filtered = combinedNotes;
            } catch (error) {
                console.error('Error applying popular mode filter:', error);
            }
        }

        setTotals({ totals: filtered.length });
        return filtered;
    }, [allNotes, searchQuery, excludeEventNotes, excludeBackupNotes, excludeWatchEvents, excludeBookmarks, excludeExpenses, excludeSensitive, excludeTrackers, popularMode]);

    const handleTagClick = (tag) => {
        setLocalSearchQuery(tag);
        setSearchQuery(tag);
    };

    const handleNoteUpdate = async (noteId, updatedContent) => {

        try {
            const response = await updateNoteById(noteId, updatedContent);

            setAllNotes(prevNotes => {
                const updatedNotes = prevNotes.map(note => note.id === noteId ? response : note);
                setTotals(updatedNotes.length);
                return updatedNotes;
            });

        } catch (error) {
            console.error('Error updating note:', error);
        }
    };

    const handleDelete = async (noteId) => {
        try {
            const noteToDelete = allNotes.find(note => note.id === noteId);
            if (noteToDelete) {
                await deleteNoteWithImages(noteId, noteToDelete.content);
            } else {
                await deleteNoteById(noteId);
            }
            setAllNotes(allNotes.filter(note => note.id !== noteId));
            setTotals(allNotes.length);
        } catch (error) {
            console.error('Error deleting note:', error);
        }
    };

    // Build suggestions from allNotes
    const mergedObjList = useMemo(() =>
        buildSuggestionsFromNotes(allNotes, objList),
        [allNotes, objList]
    );

    // Debug: Log mergedObjList
    useEffect(() => {



    }, [mergedObjList]);

    return (
        <div className="flex flex-col h-full">
            <div className="container mx-auto px-6 py-6 max-w-7xl">
                <div className="rounded-lg border bg-card text-card-foreground shadow-sm w-full p-6">
                    <div className="mt-4">
                        <div className="relative">
                            <textarea
                                ref={searchInputRef}
                                className="w-full p-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[40px] max-h-[120px] overflow-y-auto"
                                value={localSearchQuery}
                                onChange={handleSearchChange}
                                onKeyDown={handleKeyDown}
                                onPaste={handlePaste}
                                placeholder="Search notes... (Cmd+Enter to create note, ↓ to navigate, Shift+G to last note)"
                                rows={1}
                                style={{
                                    resize: 'none',
                                    overflow: 'hidden'
                                }}
                                onInput={(e) => {
                                    // Auto-resize the textarea
                                    e.target.style.height = 'auto';
                                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                                }}
                            />
                            {localSearchQuery && (
                                <button
                                    onClick={() => {
                                        setLocalSearchQuery('');
                                        setSearchQuery('');
                                        setShowPopup(false);

                                        // Clear image state too
                                        setPastedImage(null);
                                        setImagePreview(null);
                                        setIsUploadingImage(false);

                                        searchInputRef.current?.focus();
                                    }}
                                    className="absolute right-2 top-2 p-1 text-gray-500 hover:text-gray-700 focus:outline-none"
                                    aria-label="Clear search"
                                >
                                    <XMarkIcon className="h-5 w-5" />
                                </button>
                            )}
                        </div>

                        {/* Image Preview Section */}
                        {imagePreview && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex items-center gap-3">
                                    <div className="flex-shrink-0">
                                        <img
                                            src={imagePreview}
                                            alt="Preview"
                                            className="w-16 h-16 object-cover rounded border border-gray-300"
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="text-sm font-medium text-gray-700">Image Ready</h4>
                                                <p className="text-xs text-gray-500">
                                                    {isUploadingImage ? 'Uploading...' : 'Press Cmd+Enter to create note with image'}
                                                </p>
                                            </div>
                                            {!isUploadingImage && (
                                                <button
                                                    onClick={() => {
                                                        setPastedImage(null);
                                                        setImagePreview(null);
                                                    }}
                                                    className="flex items-center justify-center w-6 h-6 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors duration-150"
                                                    title="Remove image"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Suggestion popup */}
                        {showPopup && (
                            <div
                                className="absolute bg-white border-2 border-purple-500 rounded-lg shadow-lg p-2 z-[9999] max-h-40 overflow-y-auto no-scrollbar text-sm w-52"
                                style={{
                                    left: cursorPosition.x,
                                    top: cursorPosition.y,
                                    minHeight: '40px'
                                }}
                            >
                                {console.log('Rendering popup with', filteredTags.length, 'tags:', filteredTags)}
                                {filteredTags.length === 0 ? (
                                    <div className="p-2 text-gray-500">No matching tags</div>
                                ) : (
                                    filteredTags.map((tag, index) => {
                                        // Determine type indicator
                                        let typeIndicator = '';
                                        if (tag.type === 'person') {
                                            typeIndicator = ' (P)';
                                        } else if (tag.type === 'workstream') {
                                            typeIndicator = ' (W)';
                                        } else {
                                            typeIndicator = ' (T)'; // Default to tag
                                        }

                                        return (
                                            <div
                                                key={tag.id || tag.text}
                                                onClick={() => handleSelectTag(tag)}
                                                className={`p-2 cursor-pointer hover:bg-purple-100 ${selectedTagIndex === index ? "bg-purple-200" : ""
                                                    }`}
                                            >
                                                {tag.text}{typeIndicator}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )}

                        {/* <InfoPanel
                        totals={totals}
                    /> */}
                        <div className="flex items-center justify-between mt-4 mb-2">
                            <NoteFilters
                                setLines={() => { }}
                                setShowTodoSubButtons={() => { }}
                                setActivePriority={() => { }}
                                setSearchQuery={setSearchQuery}
                                searchQuery={searchQuery}
                                settings={settings}
                                allNotes={allNotes}
                                onExcludeEventsChange={setExcludeEvents}
                                onExcludeMeetingsChange={setExcludeMeetings}
                                onDeadlinePassedChange={setShowDeadlinePassedFilter}
                                onExcludeEventNotesChange={setExcludeEventNotes}
                                onExcludeBackupNotesChange={setExcludeBackupNotes}
                                onExcludeWatchEventsChange={setExcludeWatchEvents}
                                onExcludeBookmarksChange={setExcludeBookmarks}
                                onExcludeExpensesChange={setExcludeExpenses}
                                onExcludeSensitiveChange={setExcludeSensitive}
                                onExcludeTrackersChange={setExcludeTrackers}
                                resetFilters={resetFilters}
                            />
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setFocusMode(!focusMode)}
                                    className={`flex items-center gap-2 px-3 py-1 text-xs font-medium rounded transition-colors duration-150 ${focusMode
                                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    title={focusMode ? 'Exit focus mode' : 'Enter focus mode'}
                                >
                                    {focusMode ? (
                                        <>
                                            <EyeSlashIcon className="h-4 w-4" />
                                            Focus Mode
                                        </>
                                    ) : (
                                        <>
                                            <EyeIcon className="h-4 w-4" />
                                            Focus Mode
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => setPopularMode(!popularMode)}
                                    className={`flex items-center gap-2 px-3 py-1 text-xs font-medium rounded transition-colors duration-150 ${popularMode
                                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    title={popularMode ? 'Exit popular mode' : 'Enter popular mode'}
                                >
                                    {popularMode ? (
                                        <>
                                            <FireIcon className="h-4 w-4" />
                                            Popular Mode
                                        </>
                                    ) : (
                                        <>
                                            <FireIcon className="h-4 w-4" />
                                            Popular Mode
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                        <NotesList
                            objList={mergedObjList}
                            allNotes={filteredNotes}
                            fullNotesList={allNotes}
                            addNotes={addNote}
                            updateNoteCallback={handleNoteUpdate}
                            handleDelete={handleDelete}
                            updateTotals={setTotals}
                            objects={objects}
                            addObjects={addTag}
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            onWordClick={handleTagClick}
                            settings={settings}
                            focusMode={focusMode}
                            bulkDeleteMode={bulkDeleteMode}
                            setBulkDeleteMode={setBulkDeleteMode}
                            refreshTags={refreshTags}
                            onReturnToSearch={() => {

                                // Focus the search input
                                if (searchInputRef.current) {
                                    searchInputRef.current.focus();
                                    // Move cursor to end of text
                                    const length = searchInputRef.current.value.length;
                                    searchInputRef.current.setSelectionRange(length, length);
                                }
                                // Clear the focused note by dispatching a custom event
                                const clearFocusedNoteEvent = new CustomEvent('clearFocusedNote');
                                document.dispatchEvent(clearFocusedNoteEvent);

                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotesMainContainer;