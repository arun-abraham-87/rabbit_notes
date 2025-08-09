import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
import { extractMetaTags } from '../utils/MetaTagUtils';
import TagPopup from './TagPopup';
import NoteActionPopup from './NoteActionPopup';
import NoteEditorModal from './NoteEditorModal';
import RawNoteModal from './RawNoteModal';
import LinkSelectionPopup from './LinkSelectionPopup';

// Regex to match dates in DD/MM/YYYY or DD Month YYYY format
export const clickableDateRegex = /(\b\d{2}\/\d{2}\/\d{4}\b|\b\d{2} [A-Za-z]+ \d{4}\b)/g;

const NotesList = ({
  objList,
  allNotes,
  fullNotesList = allNotes, // Add prop for full notes list (unfiltered)
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
  bulkDeleteMode = false,
  setBulkDeleteMode = () => {},
  refreshTags = () => {},
  onReturnToSearch = () => {},
}) => {
  // Debug logging for developer mode
  
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
  
  // Image handling state for NoteEditor
  const [pastedImageForEditor, setPastedImageForEditor] = useState(null);
  const [imagePreviewForEditor, setImagePreviewForEditor] = useState(null);

  // Upload image to server
  const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('image', file);

    try {
      const response = await fetch('http://localhost:5001/api/images', {
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
  const [linkPopupSourceNoteId, setLinkPopupSourceNoteId] = useState(null);
  const showLinkPopupRef = useRef(false);
  
  // Add state for link edit popup
  const [showLinkEditPopup, setShowLinkEditPopup] = useState(false);
  const [editingLink, setEditingLink] = useState(null); // {noteId, linkIndex, text, url}
  const [editLinkText, setEditLinkText] = useState('');
  const [editLinkUrl, setEditLinkUrl] = useState('');
  
  // Note navigation state
  const [focusedNoteIndex, setFocusedNoteIndex] = useState(-1);
  const focusedNoteIndexRef = useRef(focusedNoteIndex);
  const safeNotesRef = useRef(safeNotes);
  
  // Bulk delete state
  const [bulkDeleteNoteId, setBulkDeleteNoteId] = useState(null);
  
  // Multi-move state
  const [multiMoveNoteId, setMultiMoveNoteId] = useState(null);
  
  // Add state for note action popup
  const [showNoteActionPopup, setShowNoteActionPopup] = useState({ visible: false, noteId: null, links: [], selected: 0 });
  
  // Callback to set focused note index
  const handleSetFocusedNoteIndex = (index) => {
    
    setFocusedNoteIndex(index);
  };
  
  // Debug focused note changes
  useEffect(() => {
    
    if (focusedNoteIndex >= 0 && safeNotes[focusedNoteIndex]) {
      
    }
  }, [focusedNoteIndex, safeNotes]);
  
  // Keep refs in sync with state
  useEffect(() => {
    focusedNoteIndexRef.current = focusedNoteIndex;
  }, [focusedNoteIndex]);
  
  useEffect(() => {
    safeNotesRef.current = safeNotes;
  }, [safeNotes]);

  // Handle bulk delete mode toggle from keyboard
  useEffect(() => {
    const handleToggleBulkDeleteMode = () => {
      
      
      
      
      if (focusedNoteIndex >= 0 && safeNotes[focusedNoteIndex]) {
        const focusedNote = safeNotes[focusedNoteIndex];
        
        
        if (bulkDeleteMode && bulkDeleteNoteId === focusedNote.id) {
          // Exit bulk delete mode for this note
          
          setBulkDeleteMode(false);
          setBulkDeleteNoteId(null);
        } else {
          // Enter bulk delete mode for this note
          
          setBulkDeleteMode(true);
          setBulkDeleteNoteId(focusedNote.id);
        }
      } else {
        
      }
    };

    document.addEventListener('toggleBulkDeleteMode', handleToggleBulkDeleteMode);
    return () => {
      document.removeEventListener('toggleBulkDeleteMode', handleToggleBulkDeleteMode);
    };
  }, [focusedNoteIndex, safeNotes, bulkDeleteMode, bulkDeleteNoteId]);

  // Handle multi-move mode toggle from keyboard
  useEffect(() => {
    const handleToggleMultiMoveMode = () => {
      
      
      
      
      if (focusedNoteIndex >= 0 && safeNotes[focusedNoteIndex]) {
        const focusedNote = safeNotes[focusedNoteIndex];
        
        
        if (multiMoveNoteId === focusedNote.id) {
          // Exit multi-move mode for this note
          
          setMultiMoveNoteId(null);
        } else {
          // Enter multi-move mode for this note
          
          setMultiMoveNoteId(focusedNote.id);
        }
      } else {
        
      }
    };

    document.addEventListener('toggleMultiMoveMode', handleToggleMultiMoveMode);
    return () => {
      document.removeEventListener('toggleMultiMoveMode', handleToggleMultiMoveMode);
    };
  }, [focusedNoteIndex, safeNotes, multiMoveNoteId]);

  // Handle escape key to exit bulk delete mode
  useEffect(() => {
    const handleExitBulkDeleteMode = () => {
      if (bulkDeleteMode) {
        setBulkDeleteMode(false);
        setBulkDeleteNoteId(null);
      }
    };

    document.addEventListener('exitBulkDeleteMode', handleExitBulkDeleteMode);
    return () => {
      document.removeEventListener('exitBulkDeleteMode', handleExitBulkDeleteMode);
    };
  }, [bulkDeleteMode]);

  // Handle 't' key to open note editor in text mode
  useEffect(() => {
    
    const handleOpenNoteEditorTextMode = () => {
      
      
      
      
      if (focusedNoteIndex >= 0 && safeNotes[focusedNoteIndex]) {
        const focusedNote = safeNotes[focusedNoteIndex];
        
        
        // Open the note editor with the focused note and set text mode flag
        setPopupNoteText(focusedNote.id);
        // Set a flag to indicate this should open in text mode
        localStorage.setItem('openInTextMode', 'true');
      } else {
        
      }
    };

    document.addEventListener('openNoteEditorTextMode', handleOpenNoteEditorTextMode);
    return () => {
      
      document.removeEventListener('openNoteEditorTextMode', handleOpenNoteEditorTextMode);
    };
  }, [focusedNoteIndex, allNotes]);
  
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
  const scrollToNote = (id) => {
    // First, set search query to filter to this specific note
    const targetNote = fullNotesList.find(n => n.id === id);
    if (targetNote) {
      // Get the first line of the note as the search term
      const firstLine = targetNote.content.split('\n')[0]?.trim();
      if (firstLine) {
        setSearchQuery(firstLine);
      }
    }
    
    // Then scroll to the note
    document
      .querySelector(`#note-${id}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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
      // Ignore if NoteActionPopup is open
      if (showNoteActionPopup.visible) return;
      if (e.key === 'Escape') {
        // Exit multi-move mode if active
        if (multiMoveNoteId) {
          setMultiMoveNoteId(null);
          e.preventDefault();
          e.stopPropagation();
          return;
        }
        
        setRightClickText(null);
        setRightClickIndex(null);
        setRightClickNoteId(null);
        setPopupVisible(false); // Also dismiss the tag selection popup
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [multiMoveNoteId]);

  // Global event listener to block arrow keys when modals are open
  useEffect(() => {
    const handleGlobalArrowKeys = (e) => {
      // Only block arrow keys if we're in a modal but NOT in a note editor
      const isAnyModalOpen = showLinkPopupRef.current || showPastePopup || isModalOpen || isPopupVisible || linkPopupVisible || popupNoteText || rawNote || showNoteActionPopup.visible;
      const isInModal = document.activeElement?.closest('[data-modal="true"]') || document.querySelector('[data-modal="true"]')?.contains(document.activeElement);
      
      // Check if we're in a note editor
      const noteEditorContainer = document.querySelector('.note-editor-container');
      const isInNoteEditor = noteEditorContainer?.contains(document.activeElement);
      
      // Only block if we're in a modal but NOT in a note editor
      if ((isAnyModalOpen || isInModal) && !isInNoteEditor && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'j' || e.key === 'k')) {
        
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    };
    
    document.addEventListener('keydown', handleGlobalArrowKeys, true); // Use capture phase
    return () => {
      document.removeEventListener('keydown', handleGlobalArrowKeys, true);
    };
  }, [showLinkPopupRef, showPastePopup, isModalOpen, isPopupVisible, linkPopupVisible, popupNoteText, rawNote, showNoteActionPopup.visible]);

  // Handle keyboard navigation between notes
  useEffect(() => {
    const handleKeyDown = (e) => {
      
      
      // Check if any modal or popup is open and block arrow keys completely
      const isAnyModalOpen = showLinkPopupRef.current || showPastePopup || isModalOpen || isPopupVisible || linkPopupVisible || popupNoteText || rawNote || showNoteActionPopup.visible;
      const isInModal = document.activeElement?.closest('[data-modal="true"]') || document.querySelector('[data-modal="true"]')?.contains(document.activeElement);
      
      // Check if we're in a note editor specifically
      const noteEditorContainer = document.querySelector('.note-editor-container');
      const isInNoteEditor = noteEditorContainer?.contains(document.activeElement) || 
                            document.activeElement?.closest('.note-editor-container');
      
      if ((isAnyModalOpen || isInModal) && !isInNoteEditor) {
        // Block arrow keys when any modal is open BUT NOT when in note editor
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'j' || e.key === 'k') {
          
          e.preventDefault();
          e.stopPropagation();
          return;
        }
      }
      
      // If link popup is open, completely skip all keyboard handling
      if (showLinkPopupRef.current) {
        
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      
      // Additional check: if the event target is within the link popup, skip processing
      const linkPopupElement = document.querySelector('[data-link-popup]');
      if (linkPopupElement && linkPopupElement.contains(e.target)) {
        
        return;
      }
      
      // Check if any popup is open - if so, don't handle general keyboard shortcuts
      const isAnyPopupOpen = showLinkPopupRef.current || showPastePopup || isModalOpen || isPopupVisible || linkPopupVisible || popupNoteText || rawNote || showNoteActionPopup.visible;
      
      // Also check if note editor modal is open
      const noteEditorModal = document.querySelector('.note-editor-container[data-modal="true"]');
      const isNoteEditorOpen = noteEditorModal !== null;
      if (isAnyPopupOpen || isNoteEditorOpen) {
        
        // Allow number keys (1, 2, 0) to pass through to note editor for header formatting
        if (e.key === '1' || e.key === '2' || e.key === '0') {
          
          return; // Don't block, let it pass through
        }
        
        return;
      }
      
      // Skip all keyboard handling if the target is a textarea or input
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT' || e.target.contentEditable === 'true') {
        
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
            
            
            
            if (safeNotesRef.current.length === 0) return;
            
            // If no note is currently focused, start with the first note
            let currentIndex = focusedNoteIndexRef.current;
            if (currentIndex === -1) {
              currentIndex = 0;
            }
            
            let newIndex;
            if (e.key === 'ArrowUp') {
              
              // If we're on the first note, move focus back to search bar
              if (currentIndex === 0) {
                
                // Call the callback to return focus to search bar
                onReturnToSearch();
                return;
              } else {
                
                // Move to previous note (don't cycle to last)
                newIndex = currentIndex > 0 ? currentIndex - 1 : currentIndex;
              }
            } else {
              // Move to next note (don't cycle back to first)
              newIndex = currentIndex < safeNotesRef.current.length - 1 ? currentIndex + 1 : currentIndex;
            }
            
            
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
            
          }
        } else if (e.key === 'G') {
          
                } else if (e.key === 'Enter' && focusedNoteIndexRef.current >= 0) {
          const isAnyNoteInSuperEditMode = document.querySelector('[data-note-id].ring-purple-500');
          const isInlineEditorActive = document.querySelector('textarea[class*="border-gray-300"]:focus') ||
                             e.target.tagName === 'TEXTAREA';
          if (!isAnyNoteInSuperEditMode && !isInlineEditorActive) {
            e.preventDefault();
            e.stopPropagation();
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
              
              // Always show popup, even if there are no links
              setLinkPopupLinks(links);
              setSelectedLinkIndex(0);
              setLinkPopupSourceNoteId(focusedNote.id);
              setShowLinkPopup(true);
            }
          } else {
            
          }
        } else if (e.key === 'G' && e.shiftKey && safeNotesRef.current.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          
          
          
          // Move to the last note
          const lastNoteIndex = safeNotesRef.current.length - 1;
          
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
          // Check if user is typing in a textarea or input - if so, skip this handler
          if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT' || e.target.contentEditable === 'true') {
            return;
          }
          
          // Open the LinkNotesModal for the focused note
          const focusedNote = safeNotesRef.current[focusedNoteIndexRef.current];
          if (focusedNote) {
            setLinkingNoteId(focusedNote.id);
            setLinkSearchTerm('');
            setLinkPopupVisible(true);
            e.preventDefault();
            e.stopPropagation();
          }
        } else if (e.key === 'a' && focusedNoteIndexRef.current >= 0 && addingLineNoteId === null) {
          // Add a new line to the end of the focused note in inline edit mode
          const isAnyNoteInSuperEditMode = document.querySelector('[data-note-id].ring-purple-500');
          const isInlineEditorActive = document.querySelector('textarea[class*="border-gray-300"]:focus') ||
                             e.target.tagName === 'TEXTAREA';
          if (!isAnyNoteInSuperEditMode && !isInlineEditorActive) {
            e.preventDefault();
            e.stopPropagation();
            const focusedNote = safeNotesRef.current[focusedNoteIndexRef.current];
            if (focusedNote) {
              setAddingLineNoteId(focusedNote.id);
              setNewLineText('');
            }
          }
          return;
        } else if (e.key === 'e' && focusedNoteIndexRef.current >= 0) {
          // Open note edit popup for the focused note
          const focusedNote = safeNotesRef.current[focusedNoteIndexRef.current];
          if (focusedNote) {
            setPopupNoteText(focusedNote.id);
            e.preventDefault();
            e.stopPropagation();
          }
          return;
        } else if (e.key === '-' && focusedNoteIndexRef.current >= 0) {
          // Add 'meta::archived' tag to the focused note if not already present
          const focusedNote = safeNotesRef.current[focusedNoteIndexRef.current];
          if (focusedNote && !focusedNote.content.includes('meta::archived')) {
            const updatedContent = focusedNote.content.trim() + '\nmeta::archived';
            updateNoteCallback(focusedNote.id, updatedContent);
            e.preventDefault();
            e.stopPropagation();
          }
          return;
        } else if (e.key === 'c') {
          // Focus the search bar
          const searchInput = document.querySelector('input[type="search"]');
          if (searchInput) {
            searchInput.focus();
            e.preventDefault();
            e.stopPropagation();
          }
          return;
        }
      }
    };

    // Only add the event listener if we're on the notes page
    const isNotesPage = location.pathname === '/notes';
    
    if (isNotesPage) {
      
      document.addEventListener('keydown', handleKeyDown, true);
      return () => {
        
        document.removeEventListener('keydown', handleKeyDown, true);
      };
    }
  }, [safeNotes.length, location.pathname, addingLineNoteId]); // Only depend on safeNotes.length, not the entire array or focusedNoteIndex

  // Reset focused note when notes change
  useEffect(() => {
    setFocusedNoteIndex(-1);
  }, [safeNotes]);

  // Focus link popup when it opens
  useEffect(() => {
    if (showLinkPopup) {
      
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
      
      
      
      // Always prevent default and stop propagation for all events when popup is open
      e.preventDefault();
      e.stopPropagation();
      
      const totalOptions = linkPopupLinks.length + (linkPopupLinks.length > 0 ? 2 : 1); // +2 if links exist, +1 if no links (just 'Open Popup')
      if (e.key === 'ArrowUp') {
        setSelectedLinkIndex(prev => prev === 0 ? totalOptions - 1 : prev - 1);
      } else if (e.key === 'ArrowDown') {
        setSelectedLinkIndex(prev => prev === totalOptions - 1 ? 0 : prev + 1);
      } else if (e.key === 'Enter') {
        if (selectedLinkIndex === 0) {
          // Edit (note editor) - always first option
          if (linkPopupSourceNoteId && setPopupNoteText) {
            setPopupNoteText(linkPopupSourceNoteId);
          }
          setShowLinkPopup(false);
          setLinkPopupLinks([]);
          setSelectedLinkIndex(0);
        } else if (linkPopupLinks.length > 0 && selectedLinkIndex === 1) {
          // Open all links (only if links exist)
          linkPopupLinks.forEach(link => window.open(link.url, '_blank'));
          setShowLinkPopup(false);
          setLinkPopupLinks([]);
          setSelectedLinkIndex(0);
        } else if (linkPopupLinks[selectedLinkIndex - 2]) {
          // Individual links (adjusted index due to new options)
          window.open(linkPopupLinks[selectedLinkIndex - 2].url, '_blank');
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
      } else if (e.key === 'e' && selectedLinkIndex > 1 && linkPopupLinks[selectedLinkIndex - 2]) {
        setEditingLink({
          noteId: safeNotesRef.current[focusedNoteIndexRef.current]?.id,
          linkIndex: selectedLinkIndex - 2,
          text: linkPopupLinks[selectedLinkIndex - 2].text,
          url: linkPopupLinks[selectedLinkIndex - 2].url
        });
        setEditLinkText(linkPopupLinks[selectedLinkIndex - 2].text);
        setEditLinkUrl(linkPopupLinks[selectedLinkIndex - 2].url);
        setShowLinkEditPopup(true);
        setShowLinkPopup(false);
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
        
      }
    };

    const handleClearFocusedNote = () => {
      
      setFocusedNoteIndex(-1);
      
    };

    
    document.addEventListener('focusFirstNote', handleFocusFirstNote);
    document.addEventListener('clearFocusedNote', handleClearFocusedNote);
    return () => {
      
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

  // Save edited link function
  const saveEditedLink = () => {
    if (!editingLink) return;
    const { noteId, linkIndex } = editingLink;
    const note = allNotes.find(n => n.id === noteId);
    if (!note) return;
    // Replace the link in the note content
    let lines = note.content.split('\n');
    let linkCount = 0;
    const markdownRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
    const plainUrlRegex = /(https?:\/\/[^\s)]+)/g;
    lines = lines.map(line => {
      let replaced = false;
      // Replace markdown link
      line = line.replace(markdownRegex, (match, text, url) => {
        if (!replaced && linkCount === linkIndex) {
          replaced = true;
          linkCount++;
          return `[${editLinkText}](${editLinkUrl})`;
        }
        linkCount++;
        return match;
      });
      // Replace plain URL if not already replaced
      if (!replaced) {
        line = line.replace(plainUrlRegex, (url) => {
          if (!replaced && linkCount === linkIndex) {
            replaced = true;
            linkCount++;
            return `[${editLinkText}](${editLinkUrl})`;
          }
          linkCount++;
          return url;
        });
      }
      return line;
    });
    const newContent = lines.join('\n');
    updateNoteCallback(noteId, newContent);
    setShowLinkEditPopup(false);
    setEditingLink(null);
    // Reopen the link popup and restore selection
    setShowLinkPopup(true);
    setSelectedLinkIndex(linkIndex + 1);
  };

  const linkEditInputRef = useRef(null);

  useEffect(() => {
    if (showLinkEditPopup && linkEditInputRef.current) {
      linkEditInputRef.current.focus();
    }
  }, [showLinkEditPopup]);

  // Cmd+Enter handler for link edit popup
  useEffect(() => {
    if (!showLinkEditPopup) return;
    const handleCmdEnter = (e) => {
      // Ignore if NoteActionPopup is open
      if (showNoteActionPopup.visible) return;
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (showLinkEditPopup) saveEditedLink();
      }
    };
    document.addEventListener('keydown', handleCmdEnter);
    return () => document.removeEventListener('keydown', handleCmdEnter);
  }, [showLinkEditPopup, editLinkText, editLinkUrl, editingLink, showNoteActionPopup.visible]);

  // Add Vim navigation state
  const [vimNumberBuffer, setVimNumberBuffer] = useState('');
  const [vimGPressed, setVimGPressed] = useState(false);

  const handleVimKeyDown = useCallback((e) => {
    // Ignore if in input/textarea/contentEditable
    if (
      e.target.tagName === 'INPUT' ||
      e.target.tagName === 'TEXTAREA' ||
      e.target.isContentEditable
    ) {
      return;
    }
    // Ignore if popup/modal is open
    if (showLinkPopupRef.current || showPastePopup || isModalOpen || isPopupVisible || linkPopupVisible || popupNoteText || rawNote || showNoteActionPopup.visible) {
      return;
    }
    // Vim navigation logic
    if (/^[0-9]$/.test(e.key)) {
      setVimNumberBuffer((prev) => prev + e.key);
      return;
    }
    if (e.key === 'g' && !vimGPressed) {
      setVimGPressed(true);
      setTimeout(() => setVimGPressed(false), 400); // short window for double-g
      return;
    }
    if (e.key === 'g' && vimGPressed) {
      // gg: go to top
      setFocusedNoteIndex(0);
      focusedNoteIndexRef.current = 0;
      setVimGPressed(false);
      setVimNumberBuffer('');
      e.preventDefault();
      e.stopPropagation();
      // Scroll to the top note
      const focusedNote = safeNotesRef.current[0];
      if (focusedNote) {
        const noteElement = document.querySelector(`[data-note-id="${focusedNote.id}"]`);
        if (noteElement) {
          noteElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      return;
    }
    if (e.key === 'G') {
      // G: go to bottom
      const lastIdx = safeNotesRef.current.length - 1;
      setFocusedNoteIndex(lastIdx);
      focusedNoteIndexRef.current = lastIdx;
      setVimGPressed(false);
      setVimNumberBuffer('');
      e.preventDefault();
      e.stopPropagation();
      // Scroll to the bottom note
      const focusedNote = safeNotesRef.current[lastIdx];
      if (focusedNote) {
        const noteElement = document.querySelector(`[data-note-id="${focusedNote.id}"]`);
        if (noteElement) {
          noteElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      return;
    }
    if (e.key === 'j' && vimNumberBuffer) {
      // number + j: jump to xth note (1-based)
      const idx = Math.max(0, Math.min(safeNotesRef.current.length - 1, parseInt(vimNumberBuffer, 10) - 1));
      setFocusedNoteIndex(idx);
      focusedNoteIndexRef.current = idx;
      setVimNumberBuffer('');
      setVimGPressed(false);
      e.preventDefault();
      e.stopPropagation();
      // Scroll to the selected note
      const focusedNote = safeNotesRef.current[idx];
      if (focusedNote) {
        const noteElement = document.querySelector(`[data-note-id="${focusedNote.id}"]`);
        if (noteElement) {
          noteElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      return;
    }
    if (e.key === 'k' && vimNumberBuffer) {
      // number + k: jump back to xth note from bottom (1-based)
      const idx = Math.max(0, Math.min(safeNotesRef.current.length - 1, safeNotesRef.current.length - parseInt(vimNumberBuffer, 10)));
      setFocusedNoteIndex(idx);
      focusedNoteIndexRef.current = idx;
      setVimNumberBuffer('');
      setVimGPressed(false);
      e.preventDefault();
      e.stopPropagation();
      // Scroll to the selected note
      const focusedNote = safeNotesRef.current[idx];
      if (focusedNote) {
        const noteElement = document.querySelector(`[data-note-id="${focusedNote.id}"]`);
        if (noteElement) {
          noteElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      return;
    }
    // Reset buffer if any other key
    setVimNumberBuffer('');
    setVimGPressed(false);
  }, [showLinkPopupRef, showPastePopup, isModalOpen, isPopupVisible, linkPopupVisible, popupNoteText, rawNote, vimGPressed, vimNumberBuffer, safeNotes]);

  useEffect(() => {
  if (location.pathname !== '/notes') return;
  // Disable Vim keydown when NoteActionPopup is open
  if (showNoteActionPopup.visible) return;
  document.addEventListener('keydown', handleVimKeyDown, true);
  return () => document.removeEventListener('keydown', handleVimKeyDown, true);
}, [location.pathname, handleVimKeyDown, showNoteActionPopup.visible]);

  // Add Vim navigation state
  const [tagPopup, setTagPopup] = useState({ visible: false, noteId: null, tags: [], selected: 0 });

  // Tag popup key handling
  useEffect(() => {
    if (!tagPopup.visible) return;
    const handleTagPopupKey = (e) => {
      if (e.key === 'Escape') {
        setTagPopup({ visible: false, noteId: null, tags: [], selected: 0 });
        return;
      }
      if (e.key === 'ArrowDown') {
        setTagPopup(tp => ({ ...tp, selected: (tp.selected + 1) % tp.tags.length }));
        e.preventDefault();
      }
      if (e.key === 'ArrowUp') {
        setTagPopup(tp => ({ ...tp, selected: (tp.selected - 1 + tp.tags.length) % tp.tags.length }));
        e.preventDefault();
      }
      if (e.key === 'x' && tagPopup.tags.length > 0) {
        // Delete the selected tag
        const tag = tagPopup.tags[tagPopup.selected];
        if (tag) {
          // Remove tag from note
          const noteIdx = safeNotes.findIndex(n => n.id === tagPopup.noteId);
          if (noteIdx !== -1) {
            const note = safeNotes[noteIdx];
            let updatedContent = note.content;
            if (tag.type === 'other') {
              updatedContent = updatedContent.split('\n').filter(line => line.trim() !== tag.value).join('\n');
            } else {
              // Remove meta::tagType::value
              updatedContent = updatedContent.split('\n').filter(line => !line.trim().startsWith(`meta::${tag.type}::${tag.value}`)).join('\n');
            }
            updateNoteCallback(note.id, updatedContent);
            // Remove from popup list
            setTagPopup(tp => {
              const newTags = tp.tags.filter((_, i) => i !== tp.selected);
              return {
                ...tp,
                tags: newTags,
                selected: Math.max(0, tp.selected - (tp.selected === newTags.length ? 1 : 0))
              };
            });
          }
        }
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', handleTagPopupKey, true);
    return () => document.removeEventListener('keydown', handleTagPopupKey, true);
  }, [tagPopup, safeNotes, updateNoteCallback]);

  // Add this useEffect for global 'c' key search focus in /notes
  useEffect(() => {
    if (location.pathname !== '/notes') return;
    // Disable global 'c' key when NoteActionPopup is open
    if (showNoteActionPopup.visible) return;
    const handleGlobalC = (e) => {
      // Only trigger if not in input/textarea/contentEditable
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.isContentEditable
      ) {
        return;
      }
      if (e.key === 'c') {
        // Focus the main search textarea
        const searchTextarea = document.querySelector('textarea');
        if (searchTextarea) {
          searchTextarea.focus();
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };
    document.addEventListener('keydown', handleGlobalC, true);
    return () => document.removeEventListener('keydown', handleGlobalC, true);
  }, [location.pathname, showNoteActionPopup.visible]);







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
                    fullNotesList={fullNotesList}
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
                    bulkDeleteMode={bulkDeleteMode}
                    setBulkDeleteMode={setBulkDeleteMode}
                    bulkDeleteNoteId={bulkDeleteNoteId}
                    setBulkDeleteNoteId={setBulkDeleteNoteId}
                    multiMoveNoteId={multiMoveNoteId}
                    setSearchQuery={setSearchQuery}
                    focusedNoteIndex={focusedNoteIndex}
                    setFocusedNoteIndex={setFocusedNoteIndex}
                    noteIndex={index}
                    settings={settings}
                    addNote={addNotes}
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
                    fullNotesList={fullNotesList}
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
                    bulkDeleteMode={bulkDeleteMode}
                    setBulkDeleteMode={setBulkDeleteMode}
                    bulkDeleteNoteId={bulkDeleteNoteId}
                    setBulkDeleteNoteId={setBulkDeleteNoteId}
                    multiMoveNoteId={multiMoveNoteId}
                    setSearchQuery={setSearchQuery}
                    focusedNoteIndex={focusedNoteIndex}
                    setFocusedNoteIndex={setFocusedNoteIndex}
                    noteIndex={safeNotes.filter(note => note.pinned).length + index}
                    onSetFocusedNoteIndex={handleSetFocusedNoteIndex}
                    settings={settings}
                    addNote={addNotes}
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
                  fullNotesList={fullNotesList}
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
                  bulkDeleteMode={bulkDeleteMode}
                  setBulkDeleteMode={setBulkDeleteMode}
                  bulkDeleteNoteId={bulkDeleteNoteId}
                  setBulkDeleteNoteId={setBulkDeleteNoteId}
                  multiMoveNoteId={multiMoveNoteId}
                  setSearchQuery={setSearchQuery}
                  focusedNoteIndex={focusedNoteIndex}
                  setFocusedNoteIndex={setFocusedNoteIndex}
                  noteIndex={index}
                  onSetFocusedNoteIndex={handleSetFocusedNoteIndex}
                  settings={settings}
                  addNote={addNotes}
                />
              ))}
            </div>
          )}
        </>
      )}

      <ConfirmationModal isOpen={isModalOpen} onClose={closeModal} onConfirm={confirmDelete} />

      <TagSelectionPopup visible={isPopupVisible} position={popupPosition} selectedText={selectedText} onConvert={handleConvertToTag} onSearch={handleSearch} onCancel={handleCancelPopup} />

      {popupNoteText && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
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
              isModal={true}
              isAddMode={popupNoteText === 'new'}
              note={popupNoteText === 'new' ? null : allNotes.find(n => n.id === popupNoteText)}
              initialMode="edit"
              initialTextMode={localStorage.getItem('openInTextMode') === 'true'}
              onSave={async (updatedNote) => {
                try {
                  let finalNoteContent = updatedNote;
                  
                  // Handle image upload if image is pasted
                  if (pastedImageForEditor) {
                    console.log('📤 [NotesList] Uploading image on save...');
                    const response = await uploadImage(pastedImageForEditor);
                    const { imageId } = response;
                    
                    // Add only the meta tag (no markdown line)
                    const imageMetaTag = `meta::image::${imageId}`;
                    finalNoteContent = updatedNote + 
                      (updatedNote ? '\n' : '') + 
                      imageMetaTag;
                    
                    console.log('✅ [NotesList] Image uploaded and added to note');
                  }
                  
                  updateNoteCallback(popupNoteText, finalNoteContent);
                  setPopupNoteText(null);
                  
                  // Clear image state
                  setPastedImageForEditor(null);
                  setImagePreviewForEditor(null);
                  
                  // Clear the text mode flag
                  localStorage.removeItem('openInTextMode');
                  // Return focus to the original note after saving
                  setTimeout(() => {
                    const noteElement = document.querySelector(`[data-note-id="${popupNoteText}"]`);
                    if (noteElement) {
                      noteElement.focus();
                    }
                  }, 100);
                } catch (error) {
                  console.error('❌ [NotesList] Error saving note with image:', error);
                  alert('Failed to upload image. Please try again.');
                }
              }}
              addNote={async (content) => {
                try {
                  let finalNoteContent = content;
                  
                  // Handle image upload if image is pasted
                  if (pastedImageForEditor) {
                    console.log('📤 [NotesList] Uploading image on add note...');
                    const response = await uploadImage(pastedImageForEditor);
                    const { imageId } = response;
                    
                    // Add only the meta tag (no markdown line)
                    const imageMetaTag = `meta::image::${imageId}`;
                    finalNoteContent = content + 
                      (content ? '\n' : '') + 
                      imageMetaTag;
                    
                    console.log('✅ [NotesList] Image uploaded and added to new note');
                  }
                  
                  addNotes(finalNoteContent);
                  setPopupNoteText(null);
                  
                  // Clear image state
                  setPastedImageForEditor(null);
                  setImagePreviewForEditor(null);
                  
                  // Clear the text mode flag
                  localStorage.removeItem('openInTextMode');
                  // Return focus to the original note after adding
                  setTimeout(() => {
                    const noteElement = document.querySelector(`[data-note-id="${popupNoteText}"]`);
                    if (noteElement) {
                      noteElement.focus();
                    }
                  }, 100);
                } catch (error) {
                  console.error('❌ [NotesList] Error adding note with image:', error);
                  alert('Failed to upload image. Please try again.');
                }
              }}
              onCancel={() => {
                setPopupNoteText(null);
                
                // Clear image state
                setPastedImageForEditor(null);
                setImagePreviewForEditor(null);
                
                // Clear the text mode flag
                localStorage.removeItem('openInTextMode');
                // Return focus to the original note after canceling
                setTimeout(() => {
                  const noteElement = document.querySelector(`[data-note-id="${popupNoteText}"]`);
                  if (noteElement) {
                    noteElement.focus();
                  }
                }, 100);
              }}
              objList={objList}
              onImagePaste={(blob) => {
                console.log('🎯 [NotesList] Image pasted in NoteEditor - showing preview');
                setPastedImageForEditor(blob);
                setImagePreviewForEditor(URL.createObjectURL(blob));
              }}
            />
            
            {/* Image Preview Section */}
            {imagePreviewForEditor && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <img
                      src={imagePreviewForEditor}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">Image Ready to Upload</h4>
                        <p className="text-xs text-gray-500">
                          This image will be uploaded when you save the note.
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setPastedImageForEditor(null);
                          setImagePreviewForEditor(null);
                        }}
                        className="flex items-center gap-1 px-3 py-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors duration-150 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <RawNoteModal isOpen={!!rawNote} rawNote={rawNote} setRawNote={setRawNote} />

      <LinkSelectionPopup 
        showLinkPopup={showLinkPopup} 
        setShowLinkPopup={setShowLinkPopup} 
        linkPopupLinks={linkPopupLinks} 
        setLinkPopupLinks={setLinkPopupLinks} 
        selectedLinkIndex={selectedLinkIndex} 
        setSelectedLinkIndex={setSelectedLinkIndex}
        sourceNoteId={linkPopupSourceNoteId}
        setPopupNoteText={setPopupNoteText}
      />

        <LinkNotesModal
          visible={linkPopupVisible}
          notes={fullNotesList}
          linkingNoteId={linkingNoteId}
          searchTerm={linkSearchTerm}
          onSearchTermChange={setLinkSearchTerm}
          addNote={addNotes}
          onLink={async (fromId, toId) => {
            let source = fullNotesList.find(n => n.id === fromId);
            let target = fullNotesList.find(n => n.id === toId);
            
            // Fallback to allNotes if not found in fullNotesList
            if (!source) {
              source = allNotes.find(n => n.id === fromId);
            }
            if (!target) {
              target = allNotes.find(n => n.id === toId);
            }
            
            if (!source || !target) {
              console.error('Could not find source or target note for linking');
              return;
            }
            
            const addTag = (content, id) => {
              const lines = content.split('\n').map(l => l.trimEnd());
              const tag = `meta::link::${id}`;
              if (!lines.includes(tag)) lines.push(tag);
              return lines.join('\n');
            };
            
            try {
              await updateNoteCallback(fromId, addTag(source.content, toId));
              await updateNoteCallback(toId, addTag(target.content, fromId));
              setLinkPopupVisible(false);
              setLinkingNoteId(null);
              setLinkSearchTerm('');
            } catch (error) {
              console.error('Error updating notes:', error);
            }
          }}
          onCancel={() => {
            setLinkPopupVisible(false);
            setLinkingNoteId(null);
            setLinkSearchTerm('');
          }}
        />

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



      {/* Link edit popup UI */}
      {showLinkEditPopup && editingLink && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-semibold mb-4">Edit Link</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Link Text</label>
              <input
                type="text"
                className="w-full border px-3 py-2 rounded mb-2"
                value={editLinkText}
                onChange={e => setEditLinkText(e.target.value)}
                autoFocus
              />
              <label className="block text-sm font-medium mb-1">URL</label>
              <input
                type="text"
                className="w-full border px-3 py-2 rounded"
                value={editLinkUrl}
                onChange={e => setEditLinkUrl(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowLinkEditPopup(false)}
                className="px-4 py-2 rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
              >Cancel</button>
              <button
                onClick={() => saveEditedLink()}
                className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
              >Save</button>
            </div>
          </div>
        </div>
      )}

      <TagPopup
        visible={tagPopup.visible}
        tags={tagPopup.tags}
        selected={tagPopup.selected}
        onSelect={idx => setTagPopup(tp => ({ ...tp, selected: idx }))}
        onDelete={idx => {
          const tag = tagPopup.tags[idx];
          if (tag) {
            const noteIdx = safeNotes.findIndex(n => n.id === tagPopup.noteId);
            if (noteIdx !== -1) {
              const note = safeNotes[noteIdx];
              let updatedContent = note.content;
              if (tag.type === 'other') {
                updatedContent = updatedContent.split('\n').filter(line => line.trim() !== tag.value).join('\n');
              } else {
                updatedContent = updatedContent.split('\n').filter(line => !line.trim().startsWith(`meta::${tag.type}::${tag.value}`)).join('\n');
              }
              updateNoteCallback(note.id, updatedContent);
              setTagPopup(tp => {
                const newTags = tp.tags.filter((_, i) => i !== idx);
                return {
                  ...tp,
                  tags: newTags,
                  selected: Math.max(0, tp.selected - (tp.selected === newTags.length ? 1 : 0))
                };
              });
            }
          }
        }}
        onClose={() => setTagPopup({ visible: false, noteId: null, tags: [], selected: 0 })}
      />
      <NoteActionPopup
        visible={showNoteActionPopup.visible}
        selected={showNoteActionPopup.selected}
        onSelect={idx => setShowNoteActionPopup(p => ({ ...p, selected: idx }))}
        onEnter={selected => {
          if (selected === 0) {
            // Open Links
            if (showNoteActionPopup.links.length === 1) {
              window.open(showNoteActionPopup.links[0].url, '_blank');
            } else if (showNoteActionPopup.links.length > 1) {
              setLinkPopupLinks(showNoteActionPopup.links);
              setSelectedLinkIndex(0);
              setShowLinkPopup(true);
            }
            setShowNoteActionPopup({ visible: false, noteId: null, links: [], selected: 0 });
          } else if (selected === 1) {
            setShowNoteActionPopup({ visible: false, noteId: null, links: [], selected: 0 });
            setTimeout(() => {
              const noteElement = document.querySelector(`[data-note-id="${showNoteActionPopup.noteId}"]`);
              if (noteElement) {
                const superEditButton = noteElement.querySelector('button[title="Focus on first line in this note"]');
                if (superEditButton) superEditButton.click();
              }
            }, 0);
          }
        }}
        onClose={() => setShowNoteActionPopup({ visible: false, noteId: null, links: [], selected: 0 })}
      />
    </div>
  );
};

export default NotesList;