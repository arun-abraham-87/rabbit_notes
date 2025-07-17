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

const AddBookmarkModal = ({ isOpen, onClose, onSave }) => {
  const [customText, setCustomText] = useState('');
  const [url, setUrl] = useState('');

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
            Add Bookmark
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
              Add Bookmark
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

const LeftPanel = ({ notes, setNotes, selectedNote, setSelectedNote, searchQuery, settings, setSettings }) => {
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
    return list;
  }, [notes, pinUpdateTrigger]);

  const handlePinBookmark = async (bookmark) => {
    try {
      // Find the note containing this bookmark
      const note = notes.find(n => n.id === bookmark.noteId);
      if (!note) return;

      // Split content into lines
      const lines = note.content.split('\n');
      
      // Check if already pinned
      const isCurrentlyPinned = lines.some(line => line.trim().startsWith('meta::bookmark_pinned'));
      
      let updatedLines;
      if (isCurrentlyPinned) {
        // Remove the pinned tag
        updatedLines = lines.filter(line => !line.trim().startsWith('meta::bookmark_pinned'));
      } else {
        // Add the pinned tag
        updatedLines = [...lines, 'meta::bookmark_pinned'];
      }
      
      // Join lines back together
      const updatedContent = updatedLines.join('\n');
      
      // Update the note
      await updateNoteById(note.id, updatedContent);
      
      // Update the notes state immediately using functional update
      setNotes(prevNotes => {
        const updatedNotes = prevNotes.map(n => 
          n.id === note.id ? { ...n, content: updatedContent } : n
        );
        //console.log('Notes updated, new content for note', note.id, ':', updatedContent);
        return updatedNotes;
      });
      
      // Force a re-render by updating the trigger
      setPinUpdateTrigger(prev => prev + 1);
      
      //console.log('Pin status updated:', !isCurrentlyPinned, 'for bookmark:', bookmark.url);
      
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
                <span>Bookmarks</span>
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
                    return (
                      <div
                        key={url}
                        onContextMenu={e => handleLinkContextMenu(e, url)}
                        className={`flex items-center mb-1.5 pl-3 p-2 rounded-lg ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-indigo-50 transition-colors`}
                      >
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-gray-700 hover:text-indigo-600 truncate text-sm"
                        >
                          {displayText}
                        </a>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePinBookmark({ url, label, noteId: bookmarkedUrls.find(b => b.url === url)?.noteId });
                          }}
                          className={`ml-2 p-1 rounded hover:bg-indigo-100 transition-colors ${
                            isPinned ? 'text-indigo-600' : 'text-gray-400 hover:text-indigo-600'
                          }`}
                          title={isPinned ? 'Unpin bookmark' : 'Pin bookmark'}
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
    </>
  );
};

export default LeftPanel;