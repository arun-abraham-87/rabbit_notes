import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Alerts } from './Alerts';


import ConfirmationModal from './ConfirmationModal';
import { updateNoteById, deleteNoteById, addNewNoteCommon, loadNotes } from '../utils/ApiUtils';
import { findDuplicatedUrls } from '../utils/genUtils';

import RightClickMenu from './RightClickMenu';
import EndDatePickerModal from './EndDatePickerModal';
import LinkNotesModal from './LinkNotesModal';
import TagSelectionPopup from './TagSelectionPopup';
import EditMeetingModal from './EditMeetingModal';
import EditEventModal from './EditEventModal';
import NoteCard from './NoteCard';
import {
  XMarkIcon,
} from '@heroicons/react/24/solid';
import NoteEditor from './NoteEditor';
import { getDummyCadenceLine } from '../utils/CadenceHelpUtils';
import { getDateInDDMMYYYYFormatWithAgeInParentheses } from '../utils/DateUtils';
import { 
  ChevronRightIcon, 
  ChevronLeftIcon, 
  CalendarIcon, 
  EyeIcon, 
  EyeSlashIcon, 
  PencilIcon,
  DocumentTextIcon,
  FlagIcon,
  SparklesIcon,
  InformationCircleIcon,
  CodeBracketIcon,
  FunnelIcon,
  ClockIcon,
  PlusIcon
} from '@heroicons/react/24/solid';
import EventAlerts from './EventAlerts';
import EventsByAgeView from './EventsByAgeView';

// Regex to match dates in DD/MM/YYYY or DD Month YYYY format
export const clickableDateRegex = /(\b\d{2}\/\d{2}\/\d{4}\b|\b\d{2} [A-Za-z]+ \d{4}\b)/g;

const NotesList = ({
  objList,
  allNotes,
  addNotes,
  updateNoteCallback,
  updateTotals,
  handleDelete,
  objects,
  addObjects,
  searchQuery,
  setSearchQuery,
  onWordClick,
  settings,
  activePage = 'notes',
  focusMode = false,
  refreshTags = () => {},
  onReturnToSearch = () => {},
}) => {
  const location = useLocation();
  const [isModalOpen, setModalOpen] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState(null);
  const [selectedText, setSelectedText] = useState('');
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [isPopupVisible, setPopupVisible] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState([]);
  const [popupNoteText, setPopupNoteText] = useState(null);
  const [linkingNoteId, setLinkingNoteId] = useState(null);
  const [linkSearchTerm, setLinkSearchTerm] = useState('');
  const [linkPopupVisible, setLinkPopupVisible] = useState(false);
  const [showPastePopup, setShowPastePopup] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [newNoteText, setNewNoteText] = useState('');
  const popupTimeoutRef = useRef(null);
  const safeNotes = allNotes || [];
  const [showEndDatePickerForNoteId, setShowEndDatePickerForNoteId] = useState(null);
  const [editingInlineDate, setEditingInlineDate] = useState({
    noteId: null,
    lineIndex: null,
    originalDate: ''
  });
  const [rightClickText, setRightClickText] = useState(null);
  const [rightClickPos, setRightClickPos] = useState({ x: 0, y: 0 });
  const [rightClickNoteId, setRightClickNoteId] = useState(null);
  const [rightClickIndex, setRightClickIndex] = useState(null);
  const [editingLine, setEditingLine] = useState({ noteId: null, lineIndex: null });
  const [editedLineContent, setEditedLineContent] = useState('');
  const [addingLineNoteId, setAddingLineNoteId] = useState(null);
  const [newLineText, setNewLineText] = useState('');
  const newLineInputRef = useRef(null);
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [showAddMeetingModal, setShowAddMeetingModal] = useState(false);
  const [editingMeetingNote, setEditingMeetingNote] = useState(null);
  const [editingEventNote, setEditingEventNote] = useState(null);
  const [showingNormalEventEditor, setShowingNormalEventEditor] = useState(false);
  const [showRefreshMenu, setShowRefreshMenu] = useState(false);
  const notesListRef = useRef(null);
  const textareaRef = useRef(null);
  const refreshButtonRef = useRef(null);
  const [showAddPeopleModal, setShowAddPeopleModal] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState(null);
  const [isWatchSelected, setIsWatchSelected] = useState(false);
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' or 'age'
  const [rawNote, setRawNote] = useState(null);
  
  // Link popup state
  const [showLinkPopup, setShowLinkPopup] = useState(false);
  const [linkPopupLinks, setLinkPopupLinks] = useState([]);
  const [selectedLinkIndex, setSelectedLinkIndex] = useState(0);
  const showLinkPopupRef = useRef(false);
  
  // Note navigation state
  const [focusedNoteIndex, setFocusedNoteIndex] = useState(-1);
  const focusedNoteIndexRef = useRef(focusedNoteIndex);
  const safeNotesRef = useRef(safeNotes);
  
  // Callback to set focused note index
  const handleSetFocusedNoteIndex = (index) => {
    console.log('handleSetFocusedNoteIndex called', index);
    setFocusedNoteIndex(index);
  };
  
  // Keep refs in sync with state
  useEffect(() => {
    focusedNoteIndexRef.current = focusedNoteIndex;
  }, [focusedNoteIndex]);
  
  useEffect(() => {
    safeNotesRef.current = safeNotes;
  }, [safeNotes]);
  
  useEffect(() => {
    showLinkPopupRef.current = showLinkPopup;
  }, [showLinkPopup]);

  const openModal = () => setModalOpen(true);
  const closeModal = () => setModalOpen(false);

  const confirmDelete = () => {
    handleDelete(deletingNoteId);
    closeModal();
  };

  // Scroll smoothly to another note card by id
  const scrollToNote = (id) =>
    document
      .querySelector(`#note-${id}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const handleModalDelete = (noteId) => {
    setDeletingNoteId(noteId);
    openModal();
  };


  const handleEndDateSelect = (noteId, date) => {
    const updatedNotes = allNotes.map(note => {
      if (note.id === noteId) {
        const contentWithoutOldEndDate = note.content
          .split('\n')
          .filter(line => !line.trim().startsWith('meta::end_date::'))
          .join('\n')
          .trim();
        const newContent = `${contentWithoutOldEndDate}\nmeta::end_date::${new Date(date).toISOString()}`;
        updateNoteById(noteId, newContent);
        return { ...note, content: newContent };
      }
      return note;
    });
    updateNoteCallback(updatedNotes);
    setShowEndDatePickerForNoteId(null);
  };

  const handleInlineDateSelect = (noteId, lineIndex, dateValue) => {
    const [year, month, day] = dateValue.split('-');
    const dateStr = `${day}/${month}/${year}`;
    const noteToUpdate = allNotes.find(n => n.id === noteId);
    const lines = noteToUpdate.content.split('\n');
    lines[lineIndex] = lines[lineIndex].replace(editingInlineDate.originalDate, dateStr);
    updateNoteCallback(noteId, lines.join('\n'));
    setEditingInlineDate({ noteId: null, lineIndex: null, originalDate: '' });
  };

  const deleteNote = async (id) => {
    deleteNoteById(id);
    updateNoteCallback(
      allNotes.filter((note) => note.id !== id) // Filter out the deleted note from the list
    );
    updateTotals(allNotes.length);
    setDeletingNoteId(0);
    
  };

  const handleTextSelection = (e) => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;

      // Check if the selection is within our component
      if (!notesListRef.current?.contains(container)) {
        return;
      }

      const rect = range.getBoundingClientRect();
      setSelectedText(selection.toString().trim());

      // Calculate position relative to the viewport
      const viewportX = rect.left;
      const viewportY = rect.top;

      // Add scroll offset to get the absolute position
      const x = viewportX + window.scrollX;
      const y = viewportY + window.scrollY;

      // Position the popup above the selected text with some offset
      setPopupPosition({
        x: x,
        y: y - 40, // Position slightly above the text
      });

      if (popupTimeoutRef.current) {
        clearTimeout(popupTimeoutRef.current);
      }

      // Show popup immediately on selection
      setPopupVisible(true);
    } else {
      setPopupVisible(false);
    }
  };

  const handleConvertToTag = () => {
    addObjects(selectedText, refreshTags);
    setPopupVisible(false);
    Alerts.success('Tag created successfully');
  };

  const handleSearch = () => {
    if (setSearchQuery) {
      setSearchQuery(selectedText);
      setPopupVisible(false);
      // Find and focus the search input
      const searchInput = document.querySelector('input[type="search"]');
      if (searchInput) {
        searchInput.value = selectedText;
        searchInput.focus();
      }
    }
  };

  const handleCancelPopup = () => {
    setPopupVisible(false);
  };

  const toggleNoteSelection = (id) => {
    setSelectedNotes((prev) =>
      prev.includes(id) ? prev.filter((nid) => nid !== id) : [...prev, id]
    );
  };

  const handleMergeNotes = async () => {
    try {
      const notesToMerge = allNotes.filter(note => selectedNotes.includes(note.id));
      if (notesToMerge.length === 0) return;
      const mergedContent = notesToMerge.map(note => note.content).join('\n\n');
      const allTags = notesToMerge.flatMap(note => note.tags || []);
      const uniqueTags = [...new Set(allTags)];
      for (const note of notesToMerge) {
        await deleteNoteById(note.id);
      }
      await addNotes(mergedContent, uniqueTags);
      setSelectedNotes([]);
    } catch (error) {
      console.error("Error while merging notes:", error);
    }
  };

  const {
    duplicateUrlNoteIds,
    duplicateWithinNoteIds,
    urlShareSpaceNoteIds,
    urlToNotesMap,
    duplicatedUrlColors,
  } = findDuplicatedUrls(safeNotes);

  useEffect(() => {
    const notesListElement = notesListRef.current;
    if (notesListElement) {
      notesListElement.addEventListener('mouseup', handleTextSelection);
      return () => {
        notesListElement.removeEventListener('mouseup', handleTextSelection);
        if (popupTimeoutRef.current) {
          clearTimeout(popupTimeoutRef.current);
        }
      };
    }
  }, []);

  useEffect(() => {
    if (rightClickText === null) {
      setRightClickIndex(null);
      setRightClickNoteId(null);
    }
  }, [rightClickText]);

  // Show ephemeral popup when copying from right-click menu
  useEffect(() => {
    if (rightClickText === 'copied') {
      setShowCopyToast(true);
      const timer = setTimeout(() => {
        setShowCopyToast(false);
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      setShowCopyToast(false);
    }
  }, [rightClickText]);

  useEffect(() => {
    if (!showCopyToast) {
      setRightClickText(null);
    }
  }, [showCopyToast]);

  useEffect(() => {
    const handleClickOutside = () => {
      setRightClickText(null);
      setRightClickIndex(null);
      setRightClickNoteId(null);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setRightClickText(null);
        setRightClickIndex(null);
        setRightClickNoteId(null);
        setPopupVisible(false); // Also dismiss the tag selection popup
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // Handle keyboard navigation between notes
  useEffect(() => {
    const handleKeyDown = (e) => {
      console.log(`Key event: key=${e.key}, shiftKey=${e.shiftKey}, metaKey=${e.metaKey}, ctrlKey=${e.ctrlKey}, altKey=${e.altKey}, target=${e.target.tagName}`);
      
      // If link popup is open, completely skip all keyboard handling
      if (showLinkPopupRef.current) {
        console.log('Link popup is open, skipping main keyboard handler');
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      
      // Additional check: if the event target is within the link popup, skip processing
      const linkPopupElement = document.querySelector('[data-link-popup]');
      if (linkPopupElement && linkPopupElement.contains(e.target)) {
        console.log('Event target is within link popup, skipping main keyboard handler');
        return;
      }
      
      // Check if any popup is open - if so, don't handle general keyboard shortcuts
      const isAnyPopupOpen = showLinkPopupRef.current || showPastePopup || isModalOpen || isPopupVisible || linkPopupVisible || popupNoteText || rawNote;
      if (isAnyPopupOpen) {
        console.log('Popup is open, skipping general keyboard handling');
        return;
      }
      
      // Skip all keyboard handling if the target is a textarea or input
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT' || e.target.contentEditable === 'true') {
        console.log('Target is textarea/input, skipping main keyboard handler');
        return;
      }
      
      // Only handle keys when not in an input/textarea and no modifier keys (except Shift+G and Shift+~)
      if (!e.metaKey && !e.ctrlKey && !e.altKey && 
          e.target.tagName !== 'INPUT' && 
          e.target.tagName !== 'TEXTAREA' &&
          e.target.contentEditable !== 'true' &&
          !(e.shiftKey && e.key !== 'G' && e.key !== '~') &&
          !e.target.closest('textarea')) {
        
        // Check if any note is in super edit mode - look for the specific purple ring class
        const isAnyNoteInSuperEditMode = document.querySelector('[data-note-id].ring-purple-500');
        
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          // Only handle note navigation if no note is in super edit mode
          if (!isAnyNoteInSuperEditMode) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log(`Arrow key pressed: ${e.key}, focusedNoteIndex: ${focusedNoteIndexRef.current}, safeNotes.length: ${safeNotesRef.current.length}`);
            
            if (safeNotesRef.current.length === 0) return;
            
            // If no note is currently focused, start with the first note
            let currentIndex = focusedNoteIndexRef.current;
            if (currentIndex === -1) {
              currentIndex = 0;
            }
            
            let newIndex;
            if (e.key === 'ArrowUp') {
              console.log(`Up arrow pressed, currentIndex: ${currentIndex}, checking if === 0`);
              // If we're on the first note, move focus back to search bar
              if (currentIndex === 0) {
                console.log('Up arrow pressed on first note, calling onReturnToSearch callback');
                // Call the callback to return focus to search bar
                onReturnToSearch();
                return;
              } else {
                console.log(`Not on first note (currentIndex: ${currentIndex}), moving to previous note`);
                // Move to previous note (don't cycle to last)
                newIndex = currentIndex > 0 ? currentIndex - 1 : currentIndex;
              }
            } else {
              // Move to next note (don't cycle back to first)
              newIndex = currentIndex < safeNotesRef.current.length - 1 ? currentIndex + 1 : currentIndex;
            }
            
            console.log(`Navigating from ${currentIndex} to ${newIndex}, key: ${e.key}`);
            setFocusedNoteIndex(newIndex);
            
            // Scroll to the focused note
            const focusedNote = safeNotesRef.current[newIndex];
            if (focusedNote) {
              const noteElement = document.querySelector(`[data-note-id="${focusedNote.id}"]`);
              if (noteElement) {
                noteElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }
          } else {
            console.log('Super edit mode is active, ignoring arrow key navigation');
          }
        } else if (e.key === 'G') {
          console.log(`G key pressed - key: ${e.key}, shiftKey: ${e.shiftKey}, safeNotes.length: ${safeNotesRef.current.length}`);
        } else if (e.key === 'Enter' && focusedNoteIndexRef.current >= 0) {
          // Check if any note is in super edit mode - if so, don't handle Enter
          const isAnyNoteInSuperEditMode = document.querySelector('[data-note-id].ring-purple-500');
          // Also check if there's an active inline editor or if the target is a textarea
          const isInlineEditorActive = document.querySelector('textarea[class*="border-gray-300"]:focus') || 
                             e.target.tagName === 'TEXTAREA';
          if (!isAnyNoteInSuperEditMode && !isInlineEditorActive) {
            e.preventDefault();
            e.stopPropagation();
            // Open link(s) instead of super edit mode
            const focusedNote = safeNotesRef.current[focusedNoteIndexRef.current];
            if (focusedNote) {
              // Regex to match both markdown-style links [text](url) and plain URLs
              const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
              const plainUrlRegex = /(https?:\/\/[^\s)]+)/g;
              const links = [];
              let match;
              // Extract markdown-style links first
              while ((match = markdownLinkRegex.exec(focusedNote.content)) !== null) {
                links.push({ url: match[2], text: match[1] });
              }
              // Extract plain URLs (excluding those already found in markdown links)
              const markdownUrls = links.map(link => link.url);
              while ((match = plainUrlRegex.exec(focusedNote.content)) !== null) {
                if (!markdownUrls.includes(match[1])) {
                  links.push({ url: match[1], text: match[1] });
                }
              }
              if (links.length === 1) {
                window.open(links[0].url, '_blank');
              } else if (links.length > 1) {
                setLinkPopupLinks(links);
                setSelectedLinkIndex(0);
                setShowLinkPopup(true);
              } else {
                // No links, optionally do nothing or show a toast
              }
            }
          } else {
            console.log('Enter pressed but super edit mode is active or inline editor is active, ignoring note navigation');
          }
        } else if (e.key === 'G' && e.shiftKey && safeNotesRef.current.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          
          console.log(`Shift+G detected - key: ${e.key}, shiftKey: ${e.shiftKey}, safeNotes.length: ${safeNotesRef.current.length}, focusedNoteIndex: ${focusedNoteIndexRef.current}`);
          
          // Move to the last note
          const lastNoteIndex = safeNotesRef.current.length - 1;
          console.log(`Shift+G pressed, moving to last note (index: ${lastNoteIndex})`);
          setFocusedNoteIndex(lastNoteIndex);
          
          // Scroll to the last note
          const lastNote = safeNotesRef.current[lastNoteIndex];
          if (lastNote) {
            const noteElement = document.querySelector(`[data-note-id="${lastNote.id}"]`);
            if (noteElement) {
              noteElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
        } else if (e.key === 'l' && focusedNoteIndexRef.current >= 0) {
          // Open the single link in the focused note if exactly one URL is present
          const focusedNote = safeNotesRef.current[focusedNoteIndexRef.current];
          if (focusedNote) {
            // Regex to match both markdown-style links [text](url) and plain URLs
            const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
            const plainUrlRegex = /(https?:\/\/[^\s)]+)/g;
            
            const links = [];
            
            // Extract markdown-style links first
            let match;
            while ((match = markdownLinkRegex.exec(focusedNote.content)) !== null) {
              links.push({
                url: match[2],
                text: match[1]
              });
            }
            
            // Extract plain URLs (excluding those already found in markdown links)
            const markdownUrls = links.map(link => link.url);
            while ((match = plainUrlRegex.exec(focusedNote.content)) !== null) {
              if (!markdownUrls.includes(match[1])) {
                links.push({
                  url: match[1],
                  text: match[1] // Use URL as text for plain URLs
                });
              }
            }
            
            if (links.length === 1) {
              window.open(links[0].url, '_blank');
            } else if (links.length > 1) {
              // Show popup with multiple links
              setLinkPopupLinks(links);
              setSelectedLinkIndex(0);
              setShowLinkPopup(true);
            } else {
              console.log('No URLs found in note');
            }
          }
        } else if (e.key === 'a' && focusedNoteIndexRef.current >= 0) {
          // Open ALL links in the focused note
          const focusedNote = safeNotesRef.current[focusedNoteIndexRef.current];
          if (focusedNote) {
            // Regex to match both markdown-style links [text](url) and plain URLs
            const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
            const plainUrlRegex = /(https?:\/\/[^\s)]+)/g;
            
            const links = [];
            
            // Extract markdown-style links first
            let match;
            while ((match = markdownLinkRegex.exec(focusedNote.content)) !== null) {
              links.push({
                url: match[2],
                text: match[1]
              });
            }
            
            // Extract plain URLs (excluding those already found in markdown links)
            const markdownUrls = links.map(link => link.url);
            while ((match = plainUrlRegex.exec(focusedNote.content)) !== null) {
              if (!markdownUrls.includes(match[1])) {
                links.push({
                  url: match[1],
                  text: match[1] // Use URL as text for plain URLs
                });
              }
            }
            
            if (links.length > 0) {
              // Open all links in new tabs
              links.forEach(link => {
                window.open(link.url, '_blank');
              });
              console.log(`Opened ${links.length} links from note`);
            } else {
              console.log('No URLs found in note');
            }
          }
        } else if (e.key === 'c') {
          // Focus the search bar
          e.preventDefault();
          e.stopPropagation();
          console.log('C key pressed - focusing search bar');
          onReturnToSearch();
        } else if (e.key === 'x' && focusedNoteIndexRef.current >= 0) {
          // Check if any note is in super edit mode - if so, don't handle note deletion
          const isAnyNoteInSuperEditMode = document.querySelector('[data-note-id].ring-purple-500');
          
          if (!isAnyNoteInSuperEditMode) {
            // Delete the focused note with confirmation
            e.preventDefault();
            e.stopPropagation();
            console.log('X key pressed - deleting focused note');
            const focusedNote = safeNotesRef.current[focusedNoteIndexRef.current];
            if (focusedNote) {
              handleModalDelete(focusedNote.id);
            }
          } else {
            console.log('X key pressed but super edit mode is active, ignoring note deletion');
          }
        } else if (e.key === 'e' && focusedNoteIndexRef.current >= 0) {
          const focusedNote = safeNotesRef.current[focusedNoteIndexRef.current];
          if (focusedNote) {
            const noteElement = document.querySelector(`[data-note-id="${focusedNote.id}"]`);
            if (noteElement) {
              const superEditButton = noteElement.querySelector('button[title="Focus on first line in this note"]');
              if (superEditButton) {
                superEditButton.click();
              }
            }
          }
        }
      }
    };

    // Only add the event listener if we're on the notes page
    const isNotesPage = location.pathname === '/notes';
    
    if (isNotesPage) {
      console.log('NotesList: Setting up keyboard navigation listener');
      document.addEventListener('keydown', handleKeyDown, true);
      return () => {
        console.log('NotesList: Cleaning up keyboard navigation listener');
        document.removeEventListener('keydown', handleKeyDown, true);
      };
    }
  }, [safeNotes.length, location.pathname]); // Only depend on safeNotes.length, not the entire array or focusedNoteIndex

  // Reset focused note when notes change
  useEffect(() => {
    setFocusedNoteIndex(-1);
  }, [safeNotes]);

  // Focus link popup when it opens
  useEffect(() => {
    if (showLinkPopup) {
      console.log('Link popup opened, focusing on navigation');
      // Focus the popup container to ensure keyboard events are captured
      const popupElement = document.querySelector('[data-link-popup]');
      if (popupElement) {
        popupElement.focus();
      }
    }
  }, [showLinkPopup]);

  // Add separate keyboard event listener for link popup
  useEffect(() => {
    const handleLinkPopupKeyDown = (e) => {
      // Only handle events when popup is actually open
      if (!showLinkPopupRef.current) return;
      
      console.log('Link popup keyboard event:', e.key, 'selectedLinkIndex:', selectedLinkIndex, 'linkPopupLinks.length:', linkPopupLinks.length);
      
      // Always prevent default and stop propagation for all events when popup is open
      e.preventDefault();
      e.stopPropagation();
      
      const totalOptions = linkPopupLinks.length + 1; // +1 for 'Open all links'
      if (e.key === 'ArrowUp') {
        setSelectedLinkIndex(prev => prev === 0 ? totalOptions - 1 : prev - 1);
      } else if (e.key === 'ArrowDown') {
        setSelectedLinkIndex(prev => prev === totalOptions - 1 ? 0 : prev + 1);
      } else if (e.key === 'Enter') {
        if (selectedLinkIndex === 0) {
          linkPopupLinks.forEach(link => window.open(link.url, '_blank'));
          setShowLinkPopup(false);
          setLinkPopupLinks([]);
          setSelectedLinkIndex(0);
        } else if (linkPopupLinks[selectedLinkIndex - 1]) {
          window.open(linkPopupLinks[selectedLinkIndex - 1].url, '_blank');
          setShowLinkPopup(false);
          setLinkPopupLinks([]);
          setSelectedLinkIndex(0);
        }
      } else if (e.key === 'a') {
        // Open all links in the popup
        linkPopupLinks.forEach(link => {
          window.open(link.url, '_blank');
        });
        setShowLinkPopup(false);
        setLinkPopupLinks([]);
        setSelectedLinkIndex(0);
      } else if (e.key === 'Escape') {
        setShowLinkPopup(false);
        setLinkPopupLinks([]);
        setSelectedLinkIndex(0);
      }
      // For any other key, just prevent default to avoid background navigation
    };

    // Always add the event listener, but only handle events when popup is open
    document.addEventListener('keydown', handleLinkPopupKeyDown, true);
    
    return () => {
      document.removeEventListener('keydown', handleLinkPopupKeyDown, true);
    };
  }, [selectedLinkIndex, linkPopupLinks]);

  // Listen for focus first note event from search bar
  useEffect(() => {
    const handleFocusFirstNote = () => {
      if (safeNotes.length > 0) {
        setFocusedNoteIndex(0);
        // Scroll to the first note
        const firstNote = safeNotes[0];
        if (firstNote) {
          const noteElement = document.querySelector(`[data-note-id="${firstNote.id}"]`);
          if (noteElement) {
            noteElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
        // Add a visual indicator that note navigation is active
        console.log('Note navigation activated - use arrow keys to navigate between notes');
      }
    };

    const handleClearFocusedNote = () => {
      console.log('Clear focused note event received, current focusedNoteIndex:', focusedNoteIndex);
      setFocusedNoteIndex(-1);
      console.log('Note focus cleared - returning to search');
    };

    console.log('Setting up note navigation event listeners');
    document.addEventListener('focusFirstNote', handleFocusFirstNote);
    document.addEventListener('clearFocusedNote', handleClearFocusedNote);
    return () => {
      console.log('Cleaning up note navigation event listeners');
      document.removeEventListener('focusFirstNote', handleFocusFirstNote);
      document.removeEventListener('clearFocusedNote', handleClearFocusedNote);
    };
  }, [safeNotes]);

  // Helper function to check if a note is a meeting note
  const isMeetingNote = (note) => {
    return note.content.includes('meta::meeting::');
  };

  // Helper function to check if a note is an event note
  const isEventNote = (note) => {
    return note.content.includes('meta::event::');
  };


  // Handle Cmd+Enter to save note
  useEffect(() => {
    const handleKeyDown = (e) => {
      // If link popup is open, don't handle any keyboard events
      if (showLinkPopupRef.current) {
        return;
      }
      
      if (showPastePopup && (e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handlePasteSubmit();
      }
      // Add Escape key handler
      if (showPastePopup && e.key === 'Escape') {
        e.preventDefault();
        setShowPastePopup(false);
        setPasteText('');
        setNewNoteText('');
        setSelectedPriority(null);
        setIsWatchSelected(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPastePopup, newNoteText, pasteText, showLinkPopup]);

  const handlePasteSubmit = async () => {
    try {
      // Get current date in YYYY-MM-DD format
      const now = new Date();
      const year = now.getFullYear();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      const noteDate = `${year}-${month}-${day}`;

      // Format datetime for meta tags (dd/mm/yyyy, hh:mm am/pm)
      const hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'pm' : 'am';
      const formattedHours = hours % 12 || 12;
      const formattedDateTime = `${day}/${month}/${year}, ${formattedHours}:${minutes} ${ampm}`;

      // Get the first line from clipboard content
      const firstClipboardLine = pasteText.split('\n')[0].trim();

      // Create the note with textbox content and first line from clipboard
      let noteContent = `${newNoteText.trim()}\n${firstClipboardLine}`;

      // Add comments for selections
      let comments = [];
      if (selectedPriority) {
        comments.push(`Marked as todo - priority ${selectedPriority}`);
      }
      if (isWatchSelected) {
        comments.push('Added to watch list');
      }
      if (comments.length > 0) {
        noteContent += '\n\n' + comments.join(', ');
      }

      // Add todo meta tag if priority is selected
      if (selectedPriority) {
        noteContent += `\nmeta::todo::${formattedDateTime}`;
        noteContent += `\nmeta::${selectedPriority}`;
      }

      // Add watch meta tag if watch is selected
      if (isWatchSelected) {
        noteContent += `\nmeta::watch::${formattedDateTime}`;
        noteContent += `\n${getDummyCadenceLine()}`;
      }

      // Add review pending tag
      noteContent += '\nmeta::review_pending';

      const newNote = await addNewNoteCommon(noteContent, [], noteDate);

      // Refresh the notes list with the current search query and date
      const data = await loadNotes(searchQuery, noteDate);
      updateNoteCallback(data.notes || []);
      updateTotals(data.totals || 0);

      setShowPastePopup(false);
      setPasteText('');
      setNewNoteText('');
      setSelectedPriority(null);
      setIsWatchSelected(false);
      Alerts.success('Note created successfully');
    } catch (error) {
      console.error('Error creating note:', error);
      Alerts.error('Failed to create note');
    }
  };

  const handleContextMenu = (e, note) => {
    e.preventDefault();
    setRightClickNoteId(note.id);
    setRightClickPos({ x: e.clientX, y: e.clientY });
  };

  return (
    <div ref={notesListRef} className="relative">
      <div className="mb-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
        </div>
      </div>

      {showCopyToast && (
        <div className="fixed bottom-4 right-4 bg-black text-white text-sm px-3 py-1 rounded shadow-lg z-50">
          Copied to clipboard
        </div>
      )}
      {selectedNotes.length > 1 && (
        <div className="mb-4">
          <button
            onClick={handleMergeNotes}
            className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:from-purple-600 hover:to-indigo-700"
          >
            Merge Selected Notes
          </button>
        </div>
      )}

      {/* Only show pinned section when on notes page */}
      {activePage === 'notes' ? (
        <>
          {safeNotes.filter(note => note.pinned).length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Pinned Notes</h2>
              <div className="grid grid-cols-1 gap-4">
                {safeNotes.filter(note => note.pinned).map((note, index) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    searchQuery={searchQuery}
                    duplicatedUrlColors={duplicatedUrlColors}
                    editingLine={editingLine}
                    setEditingLine={setEditingLine}
                    editedLineContent={editedLineContent}
                    setEditedLineContent={setEditedLineContent}
                    rightClickNoteId={rightClickNoteId}
                    rightClickIndex={rightClickIndex}
                    setRightClickNoteId={setRightClickNoteId}
                    setRightClickIndex={setRightClickIndex}
                    setRightClickPos={setRightClickPos}
                    editingInlineDate={editingInlineDate}
                    setEditingInlineDate={setEditingInlineDate}
                    handleInlineDateSelect={handleInlineDateSelect}
                    popupNoteText={popupNoteText}
                    setPopupNoteText={setPopupNoteText}
                    objList={objList}
                    addingLineNoteId={addingLineNoteId}
                    setAddingLineNoteId={setAddingLineNoteId}
                    newLineText={newLineText}
                    setNewLineText={setNewLineText}
                    newLineInputRef={newLineInputRef}
                    updateNote={updateNoteCallback}
                    urlToNotesMap={urlToNotesMap}
                    updateNoteCallback={updateNoteCallback}
                    showCreatedDate={settings.showCreatedDate || false}
                    setShowEndDatePickerForNoteId={setShowEndDatePickerForNoteId}
                    handleDelete={handleModalDelete}
                    setLinkingNoteId={setLinkingNoteId}
                    setLinkSearchTerm={setLinkSearchTerm}
                    setLinkPopupVisible={setLinkPopupVisible}
                    selectedNotes={selectedNotes}
                    toggleNoteSelection={toggleNoteSelection}
                    allNotes={allNotes}
                    onNavigate={scrollToNote}
                    onContextMenu={handleContextMenu}
                    isMeetingNote={isMeetingNote}
                    isEventNote={isEventNote}
                    setEditingMeetingNote={setEditingMeetingNote}
                    setEditingEventNote={setEditingEventNote}
                    duplicateUrlNoteIds={duplicateUrlNoteIds}
                    duplicateWithinNoteIds={duplicateWithinNoteIds}
                    urlShareSpaceNoteIds={urlShareSpaceNoteIds}
                    focusMode={focusMode}
                    setSearchQuery={setSearchQuery}
                    focusedNoteIndex={focusedNoteIndex}
                    noteIndex={index}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Regular notes section */}
          <div className="space-y-4">
            {safeNotes.filter(note => !note.pinned).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? (
                  <p>No matching notes found for "{searchQuery}"</p>
                ) : (
                  <p>No notes found</p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {safeNotes.filter(note => !note.pinned).map((note, index) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    searchQuery={searchQuery}
                    duplicatedUrlColors={duplicatedUrlColors}
                    editingLine={editingLine}
                    setEditingLine={setEditingLine}
                    editedLineContent={editedLineContent}
                    setEditedLineContent={setEditedLineContent}
                    rightClickNoteId={rightClickNoteId}
                    rightClickIndex={rightClickIndex}
                    setRightClickNoteId={setRightClickNoteId}
                    setRightClickIndex={setRightClickIndex}
                    setRightClickPos={setRightClickPos}
                    editingInlineDate={editingInlineDate}
                    setEditingInlineDate={setEditingInlineDate}
                    handleInlineDateSelect={handleInlineDateSelect}
                    popupNoteText={popupNoteText}
                    setPopupNoteText={setPopupNoteText}
                    objList={objList}
                    addingLineNoteId={addingLineNoteId}
                    setAddingLineNoteId={setAddingLineNoteId}
                    newLineText={newLineText}
                    setNewLineText={setNewLineText}
                    newLineInputRef={newLineInputRef}
                    updateNote={updateNoteCallback}
                    urlToNotesMap={urlToNotesMap}
                    updateNoteCallback={updateNoteCallback}
                    showCreatedDate={settings.showCreatedDate || false}
                    setShowEndDatePickerForNoteId={setShowEndDatePickerForNoteId}
                    handleDelete={handleModalDelete}
                    setLinkingNoteId={setLinkingNoteId}
                    setLinkSearchTerm={setLinkSearchTerm}
                    setLinkPopupVisible={setLinkPopupVisible}
                    selectedNotes={selectedNotes}
                    toggleNoteSelection={toggleNoteSelection}
                    allNotes={allNotes}
                    onNavigate={scrollToNote}
                    onContextMenu={handleContextMenu}
                    isMeetingNote={isMeetingNote}
                    isEventNote={isEventNote}
                    setEditingMeetingNote={setEditingMeetingNote}
                    setEditingEventNote={setEditingEventNote}
                    duplicateUrlNoteIds={duplicateUrlNoteIds}
                    duplicateWithinNoteIds={duplicateWithinNoteIds}
                    urlShareSpaceNoteIds={urlShareSpaceNoteIds}
                                      focusMode={focusMode}
                  setSearchQuery={setSearchQuery}
                  focusedNoteIndex={focusedNoteIndex}
                  noteIndex={safeNotes.filter(note => note.pinned).length + index}
                  onSetFocusedNoteIndex={handleSetFocusedNoteIndex}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        // When not on notes page, render all notes without pinned/unpinned sections
        <>
          {safeNotes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchQuery ? (
                <p>No matching notes found for "{searchQuery}"</p>
              ) : (
                <p>No notes found</p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {safeNotes.map((note, index) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  searchQuery={searchQuery}
                  duplicatedUrlColors={duplicatedUrlColors}
                  editingLine={editingLine}
                  setEditingLine={setEditingLine}
                  editedLineContent={editedLineContent}
                  setEditedLineContent={setEditedLineContent}
                  rightClickNoteId={rightClickNoteId}
                  rightClickIndex={rightClickIndex}
                  setRightClickNoteId={setRightClickNoteId}
                  setRightClickIndex={setRightClickIndex}
                  setRightClickPos={setRightClickPos}
                  editingInlineDate={editingInlineDate}
                  setEditingInlineDate={setEditingInlineDate}
                  handleInlineDateSelect={handleInlineDateSelect}
                  popupNoteText={popupNoteText}
                  setPopupNoteText={setPopupNoteText}
                  objList={objList}
                  addingLineNoteId={addingLineNoteId}
                  setAddingLineNoteId={setAddingLineNoteId}
                  newLineText={newLineText}
                  setNewLineText={setNewLineText}
                  newLineInputRef={newLineInputRef}
                  updateNote={updateNoteCallback}
                  urlToNotesMap={urlToNotesMap}
                  updateNoteCallback={updateNoteCallback}
                  showCreatedDate={settings.showCreatedDate || false}
                  setShowEndDatePickerForNoteId={setShowEndDatePickerForNoteId}
                  handleDelete={handleModalDelete}
                  setLinkingNoteId={setLinkingNoteId}
                  setLinkSearchTerm={setLinkSearchTerm}
                  setLinkPopupVisible={setLinkPopupVisible}
                  selectedNotes={selectedNotes}
                  toggleNoteSelection={toggleNoteSelection}
                  allNotes={allNotes}
                  onNavigate={scrollToNote}
                  onContextMenu={handleContextMenu}
                  isMeetingNote={isMeetingNote}
                  isEventNote={isEventNote}
                  setEditingMeetingNote={setEditingMeetingNote}
                  setEditingEventNote={setEditingEventNote}
                  duplicateUrlNoteIds={duplicateUrlNoteIds}
                  duplicateWithinNoteIds={duplicateWithinNoteIds}
                  urlShareSpaceNoteIds={urlShareSpaceNoteIds}
                  focusMode={focusMode}
                  setSearchQuery={setSearchQuery}
                  focusedNoteIndex={focusedNoteIndex}
                  noteIndex={index}
                  onSetFocusedNoteIndex={handleSetFocusedNoteIndex}
                />
              ))}
            </div>
          )}
        </>
      )}

      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onConfirm={confirmDelete}
      />

      {isPopupVisible && (
        <TagSelectionPopup
          visible={isPopupVisible}
          position={popupPosition}
          selectedText={selectedText}
          onConvert={handleConvertToTag}
          onSearch={handleSearch}
          onCancel={handleCancelPopup}
        />
      )}

      {linkPopupVisible && (
        <LinkNotesModal
          visible={linkPopupVisible}
          notes={allNotes}
          linkingNoteId={linkingNoteId}
          searchTerm={linkSearchTerm}
          onSearchTermChange={setLinkSearchTerm}
          onLink={(fromId, toId) => {
            const source = allNotes.find(n => n.id === fromId) || allNotes.find(n => n.id === fromId);
            const target = allNotes.find(n => n.id === toId) || allNotes.find(n => n.id === toId);
            const addTag = (content, id) => {
              const lines = content.split('\n').map(l => l.trimEnd());
              const tag = `meta::link::${id}`;
              if (!lines.includes(tag)) lines.push(tag);
              return lines.join('\n');
            };
            updateNoteCallback(fromId, addTag(source.content, toId));
            updateNoteCallback(toId, addTag(target.content, fromId));
            setLinkPopupVisible(false);
            setLinkingNoteId(null);
            setLinkSearchTerm('');
          }}
          onCancel={() => {
            setLinkPopupVisible(false);
            setLinkingNoteId(null);
            setLinkSearchTerm('');
          }}
        />
      )}

      {showEndDatePickerForNoteId && (
        <EndDatePickerModal
          noteId={showEndDatePickerForNoteId}
          onSelect={handleEndDateSelect}
          onCancel={() => setShowEndDatePickerForNoteId(null)}
        />
      )}

      {rightClickNoteId !== null && rightClickIndex !== null && (
        <RightClickMenu
          noteId={rightClickNoteId}
          lineIndex={rightClickIndex}
          pos={rightClickPos}
          notes={allNotes}
          updateNote={updateNoteCallback}
          setRightClickText={setRightClickText}
          setEditedLineContent={setEditedLineContent}
          setEditingLine={setEditingLine}
          setShowCopyToast={setShowCopyToast}
        />
      )}

      {popupNoteText && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-lg max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Edit Note</h2>
              <button
                onClick={() => setPopupNoteText(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <NoteEditor
              isAddMode={false}
              note={allNotes.find(n => n.id === popupNoteText)}
              onSave={(updatedNote) => {
                updateNoteCallback(popupNoteText, updatedNote);
                setPopupNoteText(null);
              }}
              onCancel={() => setPopupNoteText(null)}
              objList={objList}
            />
          </div>
        </div>
      )}

      {rawNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Raw Note Content</h2>
              <button
                onClick={() => setRawNote(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded-lg">
              {rawNote.content}
            </pre>
          </div>
        </div>
      )}

      {/* Link Selection Popup */}
      {showLinkPopup && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          data-link-popup
          tabIndex={0}
        >
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-800">Select Link to Open</h2>
              <button
                onClick={() => {
                  setShowLinkPopup(false);
                  setLinkPopupLinks([]);
                  setSelectedLinkIndex(0);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {/* Open all links option */}
              <div
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedLinkIndex === 0
                    ? 'bg-blue-100 border-blue-300 text-blue-800'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
                onClick={() => {
                  linkPopupLinks.forEach(link => window.open(link.url, '_blank'));
                  setShowLinkPopup(false);
                  setLinkPopupLinks([]);
                  setSelectedLinkIndex(0);
                }}
              >
                <div className="text-sm font-medium truncate">Open all links</div>
                <div className="text-xs text-gray-500 mt-1">
                  {selectedLinkIndex === 0 ? 'Press Enter to open all' : 'Click or use arrow keys'}
                </div>
              </div>
              {/* Individual links */}
              {linkPopupLinks.map((link, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedLinkIndex === index + 1
                      ? 'bg-blue-100 border-blue-300 text-blue-800'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                  onClick={() => {
                    window.open(link.url, '_blank');
                    setShowLinkPopup(false);
                    setLinkPopupLinks([]);
                    setSelectedLinkIndex(0);
                  }}
                >
                  <div className="text-sm font-medium truncate">{link.text || link.url}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {selectedLinkIndex === index + 1 ? 'Press Enter to open' : 'Click or use arrow keys'}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <p>Use ↑↓ arrows to navigate, Enter to open, 'a' to open all, Esc to cancel</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotesList;