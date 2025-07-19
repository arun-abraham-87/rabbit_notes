// src/components/LeftPanel.js
import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronDoubleUpIcon,
  ChevronDoubleDownIcon,
  Cog6ToothIcon,
  XMarkIcon,
  PencilSquareIcon,
  EyeIcon,
  PlusIcon
} from '@heroicons/react/24/solid';
import NoteEditor from './NoteEditor';
import EditMeetingModal from './EditMeetingModal';
import EditEventModal from './EditEventModal';
import { updateNoteById, getSettings, updateSettings, addNewNoteCommon, loadAllNotes, loadNotes } from '../utils/ApiUtils';
import { toast } from 'react-toastify';
import { formatAndAgeDate, getAge, getDateInDDMMYYYYFormat } from '../utils/DateUtils';
import moment from 'moment';
import Settings from './Settings';
import { useLeftPanel } from '../contexts/LeftPanelContext';

// Common timezones with their offsets and locations
const timeZones = [
  { label: 'AEST (Sydney, +10:00)', value: 'Australia/Sydney' },
  { label: 'AEDT (Sydney, +11:00)', value: 'Australia/Sydney' },
  { label: 'IST (Mumbai, +5:30)', value: 'Asia/Kolkata' },
  { label: 'EST (New York, -5:00)', value: 'America/New_York' },
  { label: 'EDT (New York, -4:00)', value: 'America/New_York' },
  { label: 'PST (Los Angeles, -8:00)', value: 'America/Los_Angeles' },
  { label: 'PDT (Los Angeles, -7:00)', value: 'America/Los_Angeles' },
  { label: 'GMT (London, +0:00)', value: 'Europe/London' },
  { label: 'BST (London, +1:00)', value: 'Europe/London' },
  { label: 'CET (Paris, +1:00)', value: 'Europe/Paris' },
  { label: 'CEST (Paris, +2:00)', value: 'Europe/Paris' },
  { label: 'JST (Tokyo, +9:00)', value: 'Asia/Tokyo' },
  { label: 'SGT (Singapore, +8:00)', value: 'Asia/Singapore' },
  { label: 'HKT (Hong Kong, +8:00)', value: 'Asia/Hong_Kong' },
  { label: 'CST (Beijing, +8:00)', value: 'Asia/Shanghai' },
  { label: 'MSK (Moscow, +3:00)', value: 'Europe/Moscow' },
  { label: 'SAST (Johannesburg, +2:00)', value: 'Africa/Johannesburg' },
  { label: 'BRT (São Paulo, -3:00)', value: 'America/Sao_Paulo' },
  { label: 'BRST (São Paulo, -2:00)', value: 'America/Sao_Paulo' },
  { label: 'NZST (Auckland, +12:00)', value: 'Pacific/Auckland' },
  { label: 'NZDT (Auckland, +13:00)', value: 'Pacific/Auckland' },
];

const AddBookmarkModal = ({ isOpen, onClose, onSave, initialCustomText = '', initialUrl = '', isEditMode = false }) => {
  const [customText, setCustomText] = useState(initialCustomText);
  const [url, setUrl] = useState(initialUrl);

  // Reset form when modal opens/closes or when switching between add/edit modes
  useEffect(() => {
    if (isOpen) {
      setCustomText(initialCustomText);
      setUrl(initialUrl);
    }
  }, [isOpen, initialCustomText, initialUrl]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (url.trim()) {
      onSave(customText.trim(), url.trim());
      onClose();
    }
  };

  const handleClose = () => {
    setCustomText('');
    setUrl('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-96 max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {isEditMode ? 'Edit Bookmark' : 'Add Bookmark'}
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label htmlFor="customText" className="block text-sm font-medium text-gray-700 mb-2">
              Custom Text (optional)
            </label>
            <input
              type="text"
              id="customText"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Enter custom text for the link"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
              URL
            </label>
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter URL"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {isEditMode ? 'Update Bookmark' : 'Add Bookmark'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const removeBookmarkFromNotes = (url, notes, setNotes) => {
  if (!window.confirm('Remove this bookmark from Quick links?')) return;
  const newNotes = notes.map(note => {
    if (
      note.content.includes(url) &&
      note.content.split('\n').some(line => line.trim().startsWith('meta::bookmark'))
    ) {
      const updatedContent = note.content
        .split('\n')
        .filter(line => !line.trim().startsWith('meta::bookmark'))
        .join('\n')
        .trim();
      updateNoteById(note.id, updatedContent);
      return { ...note, content: updatedContent };
    }
    return note;
  });
  if (typeof setNotes === 'function') {
    setNotes(newNotes);
  }
};

const updateNote = (id, updatedContent) => {
  updateNoteById(id, updatedContent);
};

const defaultSettings = {
  theme: 'light',
  sortBy: 'date',
  autoCollapse: false,
  showDates: true,
  showCreatedDate: false,
  searchQuery: '',
  totals: {
    total: 0,
    todos: 0,
    meetings: 0,
    events: 0
  },
  navigation: {
    showWatchPage: true,
    showTagsPage: true,
    showTodosPage: true,
    showJournalsPage: true,
    showEventsPage: true,
    showPeoplePage: true,
    showNewsPage: true,
    showExpensePage: true,
    showMetroPage: true,
    showCalendarPage: true
  }
};

const formatDateString = (date) => {
  // If date is already a string in YYYY-MM-DD format, return it
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  // Convert to Date object if it's a string
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Ensure we have a valid Date object
  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    console.error('Invalid date:', date);
    return '';
  }

  return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
};

const calculateNextOccurrence = (meetingTime, recurrenceType, selectedDays = [], content = '') => {
  ////console.log('finding occurence');
  ////console.log(recurrenceType);
  // Ensure meetingTime is a Date object
  const meetingDateObj = meetingTime instanceof Date ? meetingTime : new Date(meetingTime);
  const now = new Date();
  const meetingDate = formatDateString(meetingDateObj);
  const todayStr = formatDateString(now);

  // Extract all acknowledgment dates from meta tags and normalize to YYYY-MM-DD format
  const ackDates = content
    .split('\n')
    .filter(line => line.trim().startsWith('meta::meeting_acknowledge::'))
    .map(line => {
      const dateStr = line.split('::')[2].trim();
      return formatDateString(dateStr);
    });

  // For daily recurrence
  if (recurrenceType.trim() === 'daily') {
    // If today's meeting hasn't been acknowledged, return it
    if (meetingDate === todayStr && !ackDates.includes(todayStr)) {
      return meetingDateObj;
    }

    // Start from tomorrow's date
    let currentDate = new Date(now);
    currentDate.setDate(currentDate.getDate() + 1);
    currentDate.setHours(meetingDateObj.getHours());
    currentDate.setMinutes(meetingDateObj.getMinutes());
    currentDate.setSeconds(meetingDateObj.getSeconds());

    // Find the next unacknowledged date
    while (true) {
      const currentDateStr = formatDateString(currentDate);
      if (!ackDates.includes(currentDateStr)) {
        return currentDate;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  // For other recurrence types
  const nextDate = new Date(meetingDateObj);

  switch (recurrenceType) {
    case 'weekly':
      while (formatDateString(nextDate) <= todayStr || ackDates.includes(formatDateString(nextDate))) {
        nextDate.setDate(nextDate.getDate() + 7);
      }
      break;
    case 'monthly':
      while (formatDateString(nextDate) <= todayStr || ackDates.includes(formatDateString(nextDate))) {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }
      break;
    case 'yearly':
      while (formatDateString(nextDate) <= todayStr || ackDates.includes(formatDateString(nextDate))) {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      }
      break;
    case 'custom':
      if (selectedDays.length === 0) return null;

      const currentDay = now.getDay();
      const meetingDay = meetingDateObj.getDay();

      let nextDay = null;
      let minDiff = Infinity;

      selectedDays.forEach(day => {
        const dayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(day);
        if (dayIndex === -1) return;

        let diff = dayIndex - currentDay;
        if (diff <= 0) diff += 7;

        if (diff < minDiff) {
          minDiff = diff;
          nextDay = dayIndex;
        }
      });
      ////console.log(recurrenceType);
      ////console.log('Next day:', nextDay);
      if (nextDay === null) return null;

      nextDate.setDate(now.getDate() + minDiff);
      nextDate.setHours(meetingDateObj.getHours());
      nextDate.setMinutes(meetingDateObj.getMinutes());

      while (ackDates.includes(formatDateString(nextDate))) {
        nextDate.setDate(nextDate.getDate() + 7);
      }
      break;
    default:
      return null;
  }

  return nextDate;
};

const LeftPanel = ({ notes, setNotes, selectedNote, setSelectedNote, searchQuery, settings, setSettings, setActivePage }) => {
  const { isPinned, isHovered, isVisible, togglePinned, setHovered } = useLeftPanel();
  const [now, setNow] = useState(Date.now());
  const [activeSection, setActiveSection] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [unsavedSettings, setUnsavedSettings] = useState(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedTimezones, setSelectedTimezones] = useState([]);
  const [lockedSections, setLockedSections] = useState(() => {
    const saved = localStorage.getItem('lockedSections');
    return saved ? JSON.parse(saved) : {
      quickLinks: false,
      bookmarks: false
    };
  });
  const [hoveredNote, setHoveredNote] = useState(null);
  const [hoverPosition, setHoverPosition] = useState({ x: 0, y: 0 });
  const [hoverTimeout, setHoverTimeout] = useState(null);
  const popupRef = useRef(null);
  const [showQuickNote, setShowQuickNote] = useState(false);
  const [quickNoteText, setQuickNoteText] = useState('');
  const quickNoteInputRef = useRef(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [totals, setTotals] = useState(defaultSettings.totals);
  const [showAddBookmarkModal, setShowAddBookmarkModal] = useState(false);
  const [pinUpdateTrigger, setPinUpdateTrigger] = useState(0);
  const [showBookmarkLimitPopup, setShowBookmarkLimitPopup] = useState(false);
  const [showBookmarkContextMenu, setShowBookmarkContextMenu] = useState(false);
  const [bookmarkContextMenuPos, setBookmarkContextMenuPos] = useState({ x: 0, y: 0 });
  const [selectedBookmark, setSelectedBookmark] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [bookmarkToDelete, setBookmarkToDelete] = useState(null);
  // Add state for editing bookmark
  const [showEditBookmarkModal, setShowEditBookmarkModal] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState(null);
  // Add state for keyboard navigation
  const [focusedBookmarkIndex, setFocusedBookmarkIndex] = useState(-1);

  useEffect(() => {
    localStorage.setItem('lockedSections', JSON.stringify(lockedSections));
  }, [lockedSections]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load saved timezones on component mount
  useEffect(() => {
    const savedTimezones = localStorage.getItem('selectedTimezones');
    if (savedTimezones) {
      setSelectedTimezones(JSON.parse(savedTimezones));
    }
  }, []);

  // Update unsavedSettings when settings prop changes
  useEffect(() => {
    setUnsavedSettings(settings);
  }, [settings]);

  const handleTimezoneChange = (index, value) => {
    const newTimezones = [...selectedTimezones];
    newTimezones[index] = value;
    setSelectedTimezones(newTimezones);
  };

  const addTimezone = () => {
    if (selectedTimezones.length < 6) {
      setSelectedTimezones([...selectedTimezones, '']);
    }
  };

  const removeTimezone = (index) => {
    const newTimezones = selectedTimezones.filter((_, i) => i !== index);
    setSelectedTimezones(newTimezones);
  };

  const handleSettingChange = (key, value) => {
    setUnsavedSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // Save timezones to localStorage
      localStorage.setItem('selectedTimezones', JSON.stringify(selectedTimezones));

      // Save other settings
      await updateSettings(unsavedSettings);
      setSettings(unsavedSettings);
      setShowSettings(false);
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Context-menu & modal for Quick Links
  const [showLinkMenu, setShowLinkMenu] = useState(false);
  const [linkMenuPos, setLinkMenuPos] = useState({ x: 0, y: 0 });
  const [linkMenuUrl, setLinkMenuUrl] = useState(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [contextMenuNote, setContextMenuNote] = useState(null);

  const handleLinkContextMenu = (e, url) => {
    e.preventDefault();
    setLinkMenuPos({ x: e.clientX, y: e.clientY });
    setLinkMenuUrl(url);
    setShowLinkMenu(true);
  };
  useEffect(() => {
    const hideMenu = () => setShowLinkMenu(false);
    window.addEventListener('click', hideMenu);
    return () => window.removeEventListener('click', hideMenu);
  }, []);

  const uniqueUrls = useMemo(() => {
    const seen = new Set();
    const list = [];
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s)]+)/g;
    notes.forEach(note => {
      if (note?.content && note.content.split('\n').some(line => line.trim().startsWith('meta::quick_links'))) {
        linkRegex.lastIndex = 0;
        let match;
        while ((match = linkRegex.exec(note.content)) !== null) {
          const url = match[2] || match[3];
          const label = match[1] || null;
          const key = `${url}|${label}`;
          if (!seen.has(key)) {
            seen.add(key);
            list.push({ url, label });
          }
        }
      }
    });
    return list;
  }, [notes]);

  const bookmarkedUrls = useMemo(() => {
    //console.log('LeftPanel: Recalculating bookmarkedUrls, notes count:', notes.length, 'pinUpdateTrigger:', pinUpdateTrigger);
    const seen = new Set();
    const list = [];
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s)]+)/g;
    notes.forEach(note => {
      if (note?.content && note.content.split('\n').some(line => line.trim().startsWith('meta::bookmark'))) {
        // Check if note has hidden tags
        const hasHiddenTag = note.content.split('\n').some(line => 
          line.trim() === 'meta::bookmark_hidden' || line.trim() === 'meta::bookmarks_hidden'
        );
        
        // Skip notes with hidden tags
        if (hasHiddenTag) {
          return;
        }
        
        linkRegex.lastIndex = 0;
        let match;
        while ((match = linkRegex.exec(note.content)) !== null) {
          const url = match[2] || match[3];
          const label = match[1] || null;
          const key = `${url}|${label}`;
          if (!seen.has(key)) {
            seen.add(key);
            const isPinned = note.content.split('\n').some(line => line.trim().startsWith('meta::bookmark_pinned'));
            //console.log('LeftPanel: Bookmark', url, 'isPinned:', isPinned, 'noteId:', note.id);
            list.push({ url, label, noteId: note.id, isPinned });
          }
        }
      }
    });
    //console.log('LeftPanel: Final list has', list.length, 'bookmarks');
    // Sort bookmarks: pinned first, then unpinned
    return list.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0; // Keep original order within each group
    });
  }, [notes, pinUpdateTrigger]);

  // Keyboard navigation for bookmarks in left panel
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle keys when left panel is visible and not in an input/textarea
      if (isVisible && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey &&
          e.target.tagName !== 'INPUT' && 
          e.target.tagName !== 'TEXTAREA' &&
          e.target.contentEditable !== 'true') {
        
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          e.stopPropagation();
          setFocusedBookmarkIndex(prev => 
            prev > 0 ? prev - 1 : bookmarkedUrls.length - 1
          );
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          e.stopPropagation();
          setFocusedBookmarkIndex(prev => 
            prev < bookmarkedUrls.length - 1 ? prev + 1 : 0
          );
        } else if (e.key === 'Enter' && focusedBookmarkIndex >= 0) {
          e.preventDefault();
          e.stopPropagation();
          // Open the focused bookmark
          const focusedBookmark = bookmarkedUrls[focusedBookmarkIndex];
          if (focusedBookmark) {
            window.open(focusedBookmark.url, '_blank');
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          // Close the sidebar (unpin if pinned, hide if hovered)
          if (isPinned) {
            togglePinned(); // Unpin the sidebar
          } else {
            setHovered(false); // Hide if just hovered
          }
          // Reset focus
          setFocusedBookmarkIndex(-1);
        } else if (/^[1-9]$/.test(e.key)) {
          // Handle number keys 1-9
          e.preventDefault();
          e.stopPropagation();
          const bookmarkNumber = parseInt(e.key);
          const bookmarkIndex = bookmarkNumber - 1; // Convert to 0-based index
          
          if (bookmarkIndex < bookmarkedUrls.length) {
            // Navigate to the bookmark with that number
            const targetBookmark = bookmarkedUrls[bookmarkIndex];
            if (targetBookmark) {
              window.open(targetBookmark.url, '_blank');
            }
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [bookmarkedUrls, focusedBookmarkIndex, isVisible]);

  // Listen for global toggle left panel event
  React.useEffect(() => {
    const handleToggleLeftPanel = () => {
      if (isPinned) {
        togglePinned(); // Unpin the sidebar
      } else {
        setHovered(!isHovered); // Toggle hover state
      }
    };

    document.addEventListener('toggleLeftPanel', handleToggleLeftPanel);
    return () => document.removeEventListener('toggleLeftPanel', handleToggleLeftPanel);
  }, [isPinned, isHovered, togglePinned, setHovered]);

  const handlePinBookmark = async (bookmark) => {
    try {
      // Find the note containing this bookmark
      const note = notes.find(n => n.id === bookmark.noteId);
      if (!note) return;

      // Split content into lines
      const lines = note.content.split('\n');
      
      // Check if already pinned
      const isCurrentlyPinned = lines.some(line => line.trim().startsWith('meta::bookmark_pinned'));
      
      // If unpinning, allow it
      if (isCurrentlyPinned) {
        // Remove the pinned tag
        const updatedLines = lines.filter(line => !line.trim().startsWith('meta::bookmark_pinned'));
        const updatedContent = updatedLines.join('\n');
        
        // Update the note
        await updateNoteById(note.id, updatedContent);
        
        // Update the notes state immediately using functional update
        setNotes(prevNotes => {
          const updatedNotes = prevNotes.map(n => 
            n.id === note.id ? { ...n, content: updatedContent } : n
          );
          return updatedNotes;
        });
        
        // Force a re-render by updating the trigger
        setPinUpdateTrigger(prev => prev + 1);
        return;
      }
      
      // If pinning, check the limit first
      const pinnedBookmarksCount = bookmarkedUrls.filter(b => b.isPinned).length;
      if (pinnedBookmarksCount >= 7) {
        setShowBookmarkLimitPopup(true);
        // Hide the popup after 3 seconds
        setTimeout(() => setShowBookmarkLimitPopup(false), 3000);
        return;
      }
      
      // Add the pinned tag
      const updatedLines = [...lines, 'meta::bookmark_pinned'];
      const updatedContent = updatedLines.join('\n');
      
      // Update the note
      await updateNoteById(note.id, updatedContent);
      
      // Update the notes state immediately using functional update
      setNotes(prevNotes => {
        const updatedNotes = prevNotes.map(n => 
          n.id === note.id ? { ...n, content: updatedContent } : n
        );
        return updatedNotes;
      });
      
      // Force a re-render by updating the trigger
      setPinUpdateTrigger(prev => prev + 1);
      
    } catch (error) {
      console.error('Error updating bookmark pin status:', error);
    }
  };

  const handleViewHover = (e, note, section) => {
    // Only show popup if section is locked
    if (!lockedSections[section]) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const popupWidth = 300; // Fixed width for the popup
    const viewportWidth = window.innerWidth;

    // Calculate position to prevent overflow
    let x = rect.left;
    let y = rect.top - 40; // Position above the title

    // Adjust horizontal position if popup would overflow right edge
    if (x + popupWidth > viewportWidth) {
      x = viewportWidth - popupWidth - 10;
    }

    setHoverPosition({ x, y });

    // Clear any existing timeout
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }

    // Set a small delay before showing the popup
    const timeout = setTimeout(() => {
      setHoveredNote(note);
    }, 100);
    setHoverTimeout(timeout);
  };

  const handleViewLeave = (e) => {
    // Check if the mouse is moving to the popup
    if (popupRef.current && popupRef.current.contains(e.relatedTarget)) {
      return;
    }

    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }
    setHoveredNote(null);
  };

  const handleAddBookmark = async (customText, url) => {
    try {
      // Create a new note with the bookmark
      const bookmarkContent = customText 
        ? `[${customText}](${url})\nmeta::bookmark`
        : `${url}\nmeta::bookmark`;
      
      const newNote = await addNewNoteCommon(bookmarkContent);
      
      // Add the new note to the notes state
      setNotes([...notes, newNote]);
      
    } catch (error) {
      console.error('Error adding bookmark:', error);
    }
  };

  const handleBookmarkContextMenu = (e, bookmark) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Calculate position to prevent overflow
    const menuWidth = 200;
    const menuHeight = 80;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    let x = e.clientX;
    let y = e.clientY;
    
    // Adjust horizontal position if menu would overflow right edge
    if (x + menuWidth > viewportWidth) {
      x = viewportWidth - menuWidth - 10;
    }
    
    // Adjust vertical position if menu would overflow bottom edge
    if (y + menuHeight > viewportHeight) {
      y = viewportHeight - menuHeight - 10;
    }
    
    setBookmarkContextMenuPos({ x, y });
    setSelectedBookmark(bookmark);
    setShowBookmarkContextMenu(true);
  };

  useEffect(() => {
    const hideBookmarkMenu = () => setShowBookmarkContextMenu(false);
    window.addEventListener('click', hideBookmarkMenu);
    return () => window.removeEventListener('click', hideBookmarkMenu);
  }, []);

  const handleViewNote = (bookmark) => {
    if (bookmark && bookmark.noteId) {
      // Navigate to notes page with the specific note using id: prefix
      const searchQuery = `id:${bookmark.noteId}`;
      // Use the same approach as SearchModalContext to navigate with state
      setActivePage('notes');
      // Set the search query in localStorage to be picked up by the notes page
      localStorage.setItem('tempSearchQuery', searchQuery);
      setShowBookmarkContextMenu(false);
    }
  };

  const handleDeleteBookmark = async (bookmark) => {
    // Show confirmation dialog first
    setBookmarkToDelete(bookmark);
    setShowDeleteConfirmation(true);
    setShowBookmarkContextMenu(false);
  };

  const confirmDeleteBookmark = async () => {
    if (!bookmarkToDelete) return;
    
    try {
      // Find the note containing this bookmark
      const note = notes.find(n => n.id === bookmarkToDelete.noteId);
      if (!note) return;

      // Split content into lines
      const lines = note.content.split('\n');
      
      // Remove the meta::bookmark tag and meta::bookmark_pinned tag
      const updatedLines = lines.filter(line => 
        !line.trim().startsWith('meta::bookmark')
      );
      
      // Join lines back together
      const updatedContent = updatedLines.join('\n');
      
      // Update the note
      await updateNoteById(note.id, updatedContent);
      
      // Update the notes state immediately using functional update
      setNotes(prevNotes => {
        const updatedNotes = prevNotes.map(n => 
          n.id === note.id ? { ...n, content: updatedContent } : n
        );
        return updatedNotes;
      });
      
      // Force a re-render by updating the trigger
      setPinUpdateTrigger(prev => prev + 1);
      
      setShowDeleteConfirmation(false);
      setBookmarkToDelete(null);
      
    } catch (error) {
      console.error('Error deleting bookmark:', error);
    }
  };

  const handleConvertQuickLinksToBookmarks = async () => {
    if (!uniqueUrls.length) return;
    try {
      // 1. Add bookmarks for each quick link if not already a bookmark
      for (const { url, label } of uniqueUrls) {
        // Check if already a bookmark
        const alreadyBookmarked = notes.some(note =>
          note.content.includes(url) &&
          note.content.split('\n').some(line => line.trim().startsWith('meta::bookmark'))
        );
        if (!alreadyBookmarked) {
          const bookmarkContent = label
            ? `[${label}](${url})\nmeta::bookmark`
            : `${url}\nmeta::bookmark`;
          await addNewNoteCommon(bookmarkContent);
        }
      }
      // 2. Remove meta::quick_links from quick link notes
      const updatedNotes = await Promise.all(notes.map(async note => {
        if (note.content.split('\n').some(line => line.trim().startsWith('meta::quick_links'))) {
          const updatedContent = note.content
            .split('\n')
            .filter(line => !line.trim().startsWith('meta::quick_links'))
            .join('\n');
          await updateNoteById(note.id, updatedContent);
          return { ...note, content: updatedContent };
        }
        return note;
      }));
      setNotes(updatedNotes);
      if (window.toast) window.toast.success('All quick links converted to bookmarks!');
      else alert('All quick links converted to bookmarks!');
    } catch (err) {
      if (window.toast) window.toast.error('Error converting quick links.');
      else alert('Error converting quick links.');
    }
  };

  // Handler to open edit modal
  const handleEditBookmark = (bookmark) => {
    setEditingBookmark(bookmark);
    setShowEditBookmarkModal(true);
    setShowBookmarkContextMenu(false);
  };

  // Handler to save edited bookmark
  const handleSaveEditedBookmark = async (customText, url) => {
    if (!editingBookmark) return;
    const note = notes.find(n => n.id === editingBookmark.noteId);
    if (!note) return;
    // Replace the bookmark line
    const lines = note.content.split('\n');
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s)]+)/g;
    const updatedLines = lines.map(line => {
      linkRegex.lastIndex = 0;
      let match;
      while ((match = linkRegex.exec(line)) !== null) {
        const urlMatch = match[2] || match[3];
        const labelMatch = match[1] || null;
        if (urlMatch === editingBookmark.url && labelMatch === editingBookmark.label) {
          return customText ? `[${customText}](${url})` : url;
        }
      }
      return line;
    });
    const updatedContent = updatedLines.join('\n');
    await updateNoteById(note.id, updatedContent);
    setNotes(notes.map(n => n.id === note.id ? { ...n, content: updatedContent } : n));
    setShowEditBookmarkModal(false);
    setEditingBookmark(null);
  };

  return (
    <>
      {/* Hover Popup */}
      {hoveredNote && (
        <div
          ref={popupRef}
          className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 p-3 w-[300px]"
          style={{
            left: hoverPosition.x,
            top: hoverPosition.y,
            transition: 'opacity 0.2s ease-in-out'
          }}
          onMouseLeave={handleViewLeave}
        >
          <div className="text-sm font-medium text-gray-900 break-words">
            {hoveredNote.content.split('\n')[0]}
          </div>
        </div>
      )}

      {/* Small visible panel */}
      {!isPinned && (
        <div 
          className="fixed left-0 top-0 h-full w-2 bg-indigo-600 hover:bg-indigo-700 transition-colors z-40 cursor-pointer"
          onMouseEnter={() => setHovered(true)}
          style={{ pointerEvents: 'auto' }}
        />
      )}

      {/* Main sliding panel */}
      <div 
        className={`fixed left-0 top-0 h-full bg-slate-50 shadow-lg transition-all duration-300 ease-in-out z-30 ${
          isVisible ? 'w-80 opacity-100' : 'w-0 opacity-0'
        }`}
        onMouseLeave={() => !isPinned && setHovered(false)}
        style={{ pointerEvents: isVisible ? 'auto' : 'none' }}
      >
        <div className={`w-80 h-full p-3 flex flex-col overflow-hidden transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}>
          {/* Pin/unpin sidebar button */}
          <div className="flex justify-end mb-2">
            <button
              onClick={togglePinned}
              className="p-1 rounded hover:bg-indigo-100"
              title={isPinned ? 'Unpin sidebar' : 'Pin sidebar open'}
            >
              {isPinned ? (
                <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 19V5h12v14" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 5v14h12V5" />
                </svg>
              )}
            </button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto overflow-x-hidden">
            {/* custom right‑click menu */}
            {showLinkMenu && (
              <ul
                className="absolute bg-white border rounded shadow"
                style={{ top: linkMenuPos.y, left: linkMenuPos.x, zIndex: 1000 }}
              >
                <li
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  onClick={() => {
                    setShowNoteModal(true);
                    setShowLinkMenu(false);
                  }}
                >
                  View Original Note
                </li>
              </ul>
            )}

            {/* Quick Links Section */}
            <div
              className="bg-white p-3 rounded-lg shadow-sm mb-3 max-w-full"
              onMouseEnter={() => setActiveSection('quickLinks')}
              onMouseLeave={() => !lockedSections.quickLinks && setActiveSection(null)}
            >
              <h2 className="font-semibold text-gray-800 mb-2 flex justify-between items-center cursor-pointer p-1.5 hover:bg-indigo-50 rounded-lg text-base">
                <span className="truncate flex-1">Quick Links</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleConvertQuickLinksToBookmarks}
                    className="p-1 rounded hover:bg-green-100"
                    title="Convert all Quick Links to Bookmarks"
                  >
                    <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLockedSections(prev => ({ ...prev, quickLinks: !prev.quickLinks }));
                    }}
                    className="p-1 rounded hover:bg-indigo-100"
                    title={lockedSections.quickLinks ? "Unlock section" : "Lock section open"}
                  >
                    {lockedSections.quickLinks ? (
                      <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                  {activeSection === 'quickLinks' || lockedSections.quickLinks ?
                    <ChevronDoubleUpIcon className="h-4 w-4 text-indigo-600 flex-shrink-0" /> :
                    <ChevronDoubleDownIcon className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                  }
                </div>
              </h2>
              {(activeSection === 'quickLinks' || lockedSections.quickLinks) && (
                <div className="space-y-1.5 w-full">
                  {uniqueUrls.length === 0 ? (
                    <p className="text-gray-500 text-sm">No Quick Links</p>
                  ) : (
                    uniqueUrls.map(({ url, label }, idx) => {
                      let displayText = label || (() => {
                        try { return new URL(url).hostname.replace(/^www\./, ''); }
                        catch { return url; }
                      })();
                      return (
                        <div
                          key={url}
                          onContextMenu={e => handleLinkContextMenu(e, url)}
                          className={`flex items-center pl-3 p-2 rounded-lg ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-indigo-50 transition-colors w-full`}
                        >
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 text-gray-700 hover:text-indigo-600 truncate text-sm min-w-0"
                          >
                            {displayText}
                          </a>
                          <button
                            onClick={() => removeBookmarkFromNotes(url, notes, setNotes)}
                            className="ml-2 text-gray-400 hover:text-red-500 focus:outline-none flex-shrink-0"
                          >
                            &times;
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Bookmarks Section */}
            <div
              className="bg-white p-3 rounded-lg shadow-sm mb-3"
              onMouseEnter={() => setActiveSection('bookmarks')}
              onMouseLeave={() => !lockedSections.bookmarks && setActiveSection(null)}
            >
              <h2 className="font-semibold text-gray-800 mb-2 flex justify-between items-center cursor-pointer p-1.5 hover:bg-indigo-50 rounded-lg text-base">
                <span className="flex items-center gap-2">
                  Bookmarks
                  <span className="text-xs text-gray-500 font-normal">
                    ({bookmarkedUrls.filter(b => b.isPinned).length}/7 pinned)
                  </span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAddBookmarkModal(true);
                    }}
                    className="p-1 rounded hover:bg-indigo-100"
                    title="Add bookmark"
                  >
                    <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLockedSections(prev => ({ ...prev, bookmarks: !prev.bookmarks }));
                    }}
                    className="p-1 rounded hover:bg-indigo-100"
                    title={lockedSections.bookmarks ? "Unlock section" : "Lock section open"}
                  >
                    {lockedSections.bookmarks ? (
                      <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                  {activeSection === 'bookmarks' || lockedSections.bookmarks ?
                    <ChevronDoubleUpIcon className="h-4 w-4 text-indigo-600" /> :
                    <ChevronDoubleDownIcon className="h-4 w-4 text-indigo-600" />
                  }
                </div>
              </h2>
              {(activeSection === 'bookmarks' || lockedSections.bookmarks) && (
                bookmarkedUrls.length === 0 ? (
                  <p className="text-gray-500 text-sm">No Bookmarks</p>
                ) : (
                  bookmarkedUrls.map(({ url, label, isPinned }, idx) => {
                    let displayText = label || (() => {
                      try { return new URL(url).hostname.replace(/^www\./, ''); }
                      catch { return url; }
                    })();
                    const isFocused = idx === focusedBookmarkIndex;
                    return (
                      <div
                        key={url}
                        onContextMenu={e => handleBookmarkContextMenu(e, { url, label, isPinned, noteId: bookmarkedUrls.find(b => b.url === url)?.noteId })}
                        className={`flex items-center mb-1.5 pl-3 p-2 rounded-lg ${
                          isFocused ? 'bg-indigo-100 border border-indigo-300' : 
                          idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                        } hover:bg-indigo-50 transition-colors`}
                      >
                        <span className={`mr-2 text-xs font-medium ${
                          isFocused ? 'text-indigo-700' : 'text-gray-500'
                        }`}>
                          {idx + 1}.
                        </span>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex-1 truncate text-sm ${
                            isFocused ? 'text-indigo-800 font-medium' : 'text-gray-700 hover:text-indigo-600'
                          }`}
                        >
                          {displayText}
                        </a>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePinBookmark({ url, label, noteId: bookmarkedUrls.find(b => b.url === url)?.noteId });
                          }}
                          className={`ml-2 p-1 rounded transition-colors ${
                            isPinned 
                              ? 'text-indigo-600 hover:bg-indigo-100' 
                              : bookmarkedUrls.filter(b => b.isPinned).length >= 7
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-100'
                          }`}
                          title={
                            isPinned 
                              ? 'Unpin bookmark' 
                              : bookmarkedUrls.filter(b => b.isPinned).length >= 7
                                ? 'Maximum pinned bookmarks reached (7)'
                                : 'Pin bookmark'
                          }
                          disabled={!isPinned && bookmarkedUrls.filter(b => b.isPinned).length >= 7}
                        >
                          <svg className="h-4 w-4" fill={isPinned ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                          </svg>
                        </button>
                      </div>
                    );
                  })
                )
              )}
            </div>
          </div>

          {/* Settings button at bottom */}
          <div className="mt-3 pt-3 border-t border-gray-200 w-full">
            <button
              onClick={() => setShowSettings(true)}
              className="w-full flex items-center justify-center p-2.5 bg-white hover:bg-indigo-50 rounded-lg text-gray-700 hover:text-indigo-600 transition-colors duration-150 shadow-sm"
              title="Settings"
            >
              <Cog6ToothIcon className="h-5 w-5 mr-2 flex-shrink-0" />
              <span className="text-sm font-medium truncate">Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* NoteEditor modal */}
      {showNoteModal && linkMenuUrl && (() => {
        const note = notes.find(n => n.content.includes(linkMenuUrl));
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-4 overflow-auto w-auto h-auto max-w-[90vw] max-h-[90vh]">
              <button
                onClick={() => setShowNoteModal(false)}
                className="mb-4 text-sm text-gray-600 hover:text-gray-900"
              >
                Close
              </button>
              {note ? <NoteEditor note={note} onSave={(updatedNote) => {
                updateNote(updatedNote.id, updatedNote.content);
              }} /> : <p className="text-red-500">Original note not found.</p>}
            </div>
          </div>
        );
      })()}

      {/* Settings Modal */}
      {showSettings && (
        <Settings onClose={() => setShowSettings(false)} />
      )}

      {/* Add Bookmark Modal */}
      <AddBookmarkModal
        isOpen={showAddBookmarkModal}
        onClose={() => setShowAddBookmarkModal(false)}
        onSave={handleAddBookmark}
      />

             {/* Bookmark Limit Popup */}
       {showBookmarkLimitPopup && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
           <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4">
             <div className="text-center">
               <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                 <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                 </svg>
               </div>
               <h3 className="text-lg font-medium text-gray-900 mb-2">Bookmark Limit Reached</h3>
               <p className="text-sm text-gray-600 mb-4">
                 You can only pin a maximum of 7 bookmarks at a time. 
                 Please unpin some bookmarks to add more.
               </p>
               <button
                 onClick={() => setShowBookmarkLimitPopup(false)}
                 className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
               >
                 Got it
               </button>
             </div>
           </div>
         </div>
       )}

       {/* Delete Bookmark Confirmation */}
       {showDeleteConfirmation && (
         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
           <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4">
             <div className="text-center">
               <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                 <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                 </svg>
               </div>
               <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Bookmark</h3>
               <p className="text-sm text-gray-600 mb-4">
                 Are you sure you want to delete this bookmark? This action cannot be undone.
               </p>
               <div className="flex gap-3">
                 <button
                   onClick={() => {
                     setShowDeleteConfirmation(false);
                     setBookmarkToDelete(null);
                   }}
                   className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors"
                 >
                   Cancel
                 </button>
                 <button
                   onClick={confirmDeleteBookmark}
                   className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                 >
                   Delete
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}

      {isContextMenuOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg p-4 overflow-auto w-auto h-auto max-w-[90vw] max-h-[90vh]">
            <button
              onClick={() => setIsContextMenuOpen(false)}
              className="mb-4 text-sm text-gray-600 hover:text-gray-900"
            >
              Close
            </button>
            {contextMenuNote && <NoteEditor note={contextMenuNote} onSave={(updatedNote) => {
              updateNote(updatedNote.id, updatedNote.content);
            }} />}
          </div>
        </div>
      )}

             {/* Bookmark Context Menu */}
       {showBookmarkContextMenu && (
         <div
           className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-2 w-[200px]"
           style={{
             left: bookmarkContextMenuPos.x,
             top: bookmarkContextMenuPos.y,
             transition: 'opacity 0.2s ease-in-out'
           }}
         >
           <ul className="space-y-1">
             <li
               className="px-4 py-2 hover:bg-indigo-50 cursor-pointer flex items-center gap-2 text-gray-700 hover:text-indigo-600 transition-colors"
               onClick={() => handleViewNote(selectedBookmark)}
               title={`View note ${selectedBookmark?.noteId}`}
             >
               <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
               </svg>
               View Note
             </li>
             <li
               className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
               onClick={() => handleEditBookmark(selectedBookmark)}
             >
               <div className="flex items-center gap-2">
                 <PencilSquareIcon className="h-4 w-4" />
                 Edit
               </div>
             </li>
             <li
               className="px-4 py-2 hover:bg-red-50 cursor-pointer flex items-center gap-2 text-gray-700 hover:text-red-600 transition-colors"
               onClick={() => handleDeleteBookmark(selectedBookmark)}
               title="Delete this bookmark"
             >
               <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
               </svg>
               Delete Bookmark
             </li>
             <li
               className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-700 hover:text-gray-900 transition-colors"
               onClick={() => setShowBookmarkContextMenu(false)}
             >
               Cancel
             </li>
           </ul>
         </div>
       )}

      {/* Edit Bookmark Modal */}
      {showEditBookmarkModal && editingBookmark && (
        <AddBookmarkModal
          isOpen={showEditBookmarkModal}
          onClose={() => setShowEditBookmarkModal(false)}
          onSave={handleSaveEditedBookmark}
          initialCustomText={editingBookmark.label || ''}
          initialUrl={editingBookmark.url || ''}
          isEditMode={true}
        />
      )}
    </>
  );
};

export default LeftPanel;