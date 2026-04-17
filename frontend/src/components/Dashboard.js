import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertsProvider, TodayEventsBar, BackupAlert } from './Alerts.js';
import RemindersAlert from './RemindersAlert.js';
import ReviewOverdueAlert from './ReviewOverdueAlert.js';
import { loadAllNotes, createNote, updateNoteById, deleteNoteById } from '../utils/ApiUtils.js';
import { ChevronDownIcon, ChevronUpIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon, XMarkIcon, ArrowPathIcon, ArrowTrendingUpIcon, CurrencyDollarIcon, SunIcon, CloudIcon } from '@heroicons/react/24/solid';
import TimeZoneDisplay from './TimeZoneDisplay.js';
import TimezonePopup from './TimezonePopup.js';
import BookmarkedLinks from './BookmarkedLinks.js';
import EventManager from './EventManager.js';
import FlaggedReviewDues from './FlaggedReviewDues.js';
import StockPrice from './Stocks.js';
import ExchangeRates from './ExchangeRates.js';
import Weather from './Weather.js';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

import EditEventModal from './EditEventModal.js';
import WatchedTrackers from './WatchedTrackers.js';

import TrackedInfoCards from './TrackedInfoCards.js';
import Countdown from './Countdown.js';
import CustomCalendar from './CustomCalendar.js';
import { useLeftPanel } from '../contexts/LeftPanelContext.js';
import { useNoteEditor } from '../contexts/NoteEditorContext.js';

const AddOptionsPopup = ({ isOpen, onClose, onAddEvent, onAddDeadline, onAddHoliday }) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        onAddEvent();
        onClose();
      } else if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        onAddDeadline();
        onClose();
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        onAddHoliday();
        onClose();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onAddEvent, onAddDeadline, onAddHoliday, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-96 max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Add New</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-3">
          <button
            onClick={() => {
              onAddEvent();
              onClose();
            }}
            className="w-full flex items-center justify-between p-4 text-left bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Add Event</h4>
                <p className="text-sm text-gray-600">Create a new event</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">E</span>
            </div>
          </button>

          <button
            onClick={() => {
              onAddDeadline();
              onClose();
            }}
            className="w-full flex items-center justify-between p-4 text-left bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Add Deadline</h4>
                <p className="text-sm text-gray-600">Set a new deadline</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">D</span>
            </div>
          </button>

          <button
            onClick={() => {
              onAddHoliday();
              onClose();
            }}
            className="w-full flex items-center justify-between p-4 text-left bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Add Holiday</h4>
                <p className="text-sm text-gray-600">Create a holiday entry</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">H</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

const AlertsHelpPopup = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">Alerts & Reminders Wiki</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <h4 className="font-bold text-gray-900 mb-2">Quick Access</h4>
            <ul className="list-disc pl-5 text-gray-700 space-y-1 text-sm">
              <li>Press <kbd className="bg-gray-100 border border-gray-300 rounded px-1.5 font-mono">r</kbd> to open the Reminders Only view.</li>
              <li>Press <kbd className="bg-gray-100 border border-gray-300 rounded px-1.5 font-mono">w</kbd> to open the Reviews Overdue Only view.</li>
              <li>Press <kbd className="bg-gray-100 border border-gray-300 rounded px-1.5 font-mono">Escape</kbd> to return to the normal dashboard view.</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 mb-2">Navigation</h4>
            <ul className="list-disc pl-5 text-gray-700 space-y-1 text-sm">
              <li>Use <kbd className="bg-gray-100 border border-gray-300 rounded px-1.5 font-mono">&uarr;</kbd> and <kbd className="bg-gray-100 border border-gray-300 rounded px-1.5 font-mono">&darr;</kbd> arrows to navigate through the reminders list.</li>
              <li>Press <kbd className="bg-gray-100 border border-gray-300 rounded px-1.5 font-mono">Enter</kbd> or <kbd className="bg-gray-100 border border-gray-300 rounded px-1.5 font-mono">l</kbd> to open links within the currently focused reminder.</li>
              <li>Press <kbd className="bg-gray-100 border border-gray-300 rounded px-1.5 font-mono">s</kbd> to snooze or dismiss the focused reminder.</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 mb-2">Advanced (Vim-style) Navigation</h4>
            <ul className="list-disc pl-5 text-gray-700 space-y-1 text-sm">
              <li>Press <kbd className="bg-gray-100 border border-gray-300 rounded px-1.5 font-mono">gg</kbd> to jump to the first reminder.</li>
              <li>Press <kbd className="bg-gray-100 border border-gray-300 rounded px-1.5 font-mono">G</kbd> to jump to the last reminder.</li>
              <li>Type a number followed by <kbd className="bg-gray-100 border border-gray-300 rounded px-1.5 font-mono">j</kbd> or <kbd className="bg-gray-100 border border-gray-300 rounded px-1.5 font-mono">k</kbd> to jump forward or backward (e.g., <kbd className="bg-gray-100 border border-gray-300 rounded px-1.5 font-mono">4j</kbd> jumps down 4 items).</li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 mb-2">Cadence & Grouping</h4>
            <ul className="list-disc pl-5 text-gray-700 space-y-1 text-sm">
              <li>Press <kbd className="bg-gray-100 border border-gray-300 rounded px-1.5 font-mono">&rarr;</kbd> (Right Arrow) to open the cadence selector for the focused reminder.</li>
              <li>Press <kbd className="bg-gray-100 border border-gray-300 rounded px-1.5 font-mono">&larr;</kbd> (Left Arrow) to close the cadence selector.</li>
              <li>Use the buttons at the top of the Reminders list to group them by Color, Title, or Cadence.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

const Dashboard = ({ notes, setNotes, setActivePage }) => {
  const { isPinned, togglePinned } = useLeftPanel();
  const { openEditor } = useNoteEditor();
  const location = useLocation();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(new Date());
  const [timezones, setTimezones] = useState([]);
  const [showTimezones, setShowTimezones] = useState(true);
  const [selectedTimezones, setSelectedTimezones] = useState([]);
  const [eventScrollPosition, setEventScrollPosition] = useState(0);
  const [notesScrollPosition, setNotesScrollPosition] = useState(0);
  const [eventsHasOverflow, setEventsHasOverflow] = useState(false);
  const [notesHasOverflow, setNotesHasOverflow] = useState(false);
  const [eventNotesHasOverflow, setEventNotesHasOverflow] = useState(false);
  const [showRemindersOnly, setShowRemindersOnly] = useState(false);
  const [showReviewsOverdueOnly, setShowReviewsOverdueOnly] = useState(false);
  const [showTimezonePopup, setShowTimezonePopup] = useState(false);
  const [showAddOptionsPopup, setShowAddOptionsPopup] = useState(false);
  const [showAlertsHelpPopup, setShowAlertsHelpPopup] = useState(false);
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [isAddingDeadline, setIsAddingDeadline] = useState(false);
  const [isAddingHoliday, setIsAddingHoliday] = useState(false);
  const [activeFilters, setActiveFilters] = useState(() => {
    try {
      const saved = localStorage.getItem('defaultEventFilters');
      return saved ? JSON.parse(saved) : ['deadline'];
    } catch { return ['deadline']; }
  });
  const [eventTextFilter, setEventTextFilter] = useState(''); // Text filter for events
  const eventSearchInputRef = useRef(null); // <-- Add ref for search input
  const [lastLoginTime, setLastLoginTime] = useState(null);
  const [activePopup, setActivePopup] = useState(null); // Track which popup is active: 'stock', 'exchange', 'weather', or null
  const [showFontSelector, setShowFontSelector] = useState(false);
  const [selectedFont, setSelectedFont] = useState(() => localStorage.getItem('appFont') || 'System Default');
  const fontSelectorRef = useRef(null);

  // Refs for scroll containers
  const eventsScrollRef = useRef(null);
  const notesScrollRef = useRef(null);
  const eventNotesScrollRef = useRef(null);
  const reviewOverdueSearchInputRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Apply selected font globally
  useEffect(() => {
    if (selectedFont === 'System Default') {
      document.documentElement.style.fontFamily = '';
    } else {
      document.documentElement.style.fontFamily = `"${selectedFont}", sans-serif`;
    }
    localStorage.setItem('appFont', selectedFont);
  }, [selectedFont]);

  // Close font selector on outside click
  useEffect(() => {
    if (!showFontSelector) return;
    const handleClick = (e) => {
      if (fontSelectorRef.current && !fontSelectorRef.current.contains(e.target)) {
        setShowFontSelector(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showFontSelector]);

  const availableFonts = [
    'System Default',
    'Arial',
    'Helvetica',
    'Verdana',
    'Tahoma',
    'Trebuchet MS',
    'Georgia',
    'Times New Roman',
    'Garamond',
    'Courier New',
    'Monaco',
    'Menlo',
    'Consolas',
    'SF Pro Display',
    'SF Mono',
    'Inter',
    'Roboto',
    'Open Sans',
    'Lato',
    'Montserrat',
    'Raleway',
    'Poppins',
    'Nunito',
    'Quicksand',
    'Comic Sans MS',
    'Impact',
    'Lucida Console',
    'Palatino Linotype',
    'Book Antiqua',
    'Segoe UI',
  ];

  // Load selected timezones from localStorage on component mount
  useEffect(() => {
    const savedTimezones = localStorage.getItem('selectedTimezones');
    if (savedTimezones) {
      setSelectedTimezones(JSON.parse(savedTimezones));
    }
  }, []);

  // Track last login time
  useEffect(() => {
    // Get previous login time from localStorage
    const previousLogin = localStorage.getItem('dashboardLastLogin');
    if (previousLogin) {
      try {
        const loginDate = new Date(previousLogin);
        setLastLoginTime(loginDate);
      } catch (error) {
        console.error('Error parsing last login time:', error);
      }
    }

    // Update current login time
    const currentLoginTime = new Date().toISOString();
    localStorage.setItem('dashboardLastLogin', currentLoginTime);
  }, []); // Run only once on mount

  const formattedTime = time.toLocaleTimeString(undefined, {
    hour12: true,
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });

  const formattedDate = time.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Function to format timezone time in compact form
  const formatTimezoneTime = (timeZone) => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour12: true,
        hour: '2-digit',
        minute: '2-digit',
      }).format(time);
    } catch (error) {
      return '--:--';
    }
  };

  // Get compact timezone display
  // Smooth scroll function with easing
  const smoothScroll = (element, targetScrollLeft, duration = 600) => {
    const startScrollLeft = element.scrollLeft;
    const distance = targetScrollLeft - startScrollLeft;
    const startTime = performance.now();

    const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

    const animateScroll = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutQuart(progress);

      element.scrollLeft = startScrollLeft + (distance * easedProgress);

      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      }
    };

    requestAnimationFrame(animateScroll);
  };

  // Horizontal scroll functions for events
  const scrollEventsLeft = () => {
    if (eventsScrollRef.current) {
      const currentScroll = eventsScrollRef.current.scrollLeft;
      const targetScroll = Math.max(0, currentScroll - 300);
      smoothScroll(eventsScrollRef.current, targetScroll);
    }
  };

  const scrollEventsRight = () => {
    if (eventsScrollRef.current) {
      const currentScroll = eventsScrollRef.current.scrollLeft;
      const maxScroll = eventsScrollRef.current.scrollWidth - eventsScrollRef.current.clientWidth;
      const targetScroll = Math.min(maxScroll, currentScroll + 300);
      smoothScroll(eventsScrollRef.current, targetScroll);
    }
  };

  // Horizontal scroll functions for notes
  const scrollNotesLeft = () => {
    if (notesScrollRef.current) {
      const currentScroll = notesScrollRef.current.scrollLeft;
      const targetScroll = Math.max(0, currentScroll - 300);
      smoothScroll(notesScrollRef.current, targetScroll);
    }
  };

  const scrollNotesRight = () => {
    if (notesScrollRef.current) {
      const currentScroll = notesScrollRef.current.scrollLeft;
      const maxScroll = notesScrollRef.current.scrollWidth - notesScrollRef.current.clientWidth;
      const targetScroll = Math.min(maxScroll, currentScroll + 300);
      smoothScroll(notesScrollRef.current, targetScroll);
    }
  };

  // Horizontal scroll functions for event notes
  const scrollEventNotesLeft = () => {
    if (eventNotesScrollRef.current) {
      const currentScroll = eventNotesScrollRef.current.scrollLeft;
      const targetScroll = Math.max(0, currentScroll - 300);
      smoothScroll(eventNotesScrollRef.current, targetScroll);
    }
  };

  const scrollEventNotesRight = () => {
    if (eventNotesScrollRef.current) {
      const currentScroll = eventNotesScrollRef.current.scrollLeft;
      const maxScroll = eventNotesScrollRef.current.scrollWidth - eventNotesScrollRef.current.clientWidth;
      const targetScroll = Math.min(maxScroll, currentScroll + 300);
      smoothScroll(eventNotesScrollRef.current, targetScroll);
    }
  };

  // Check for overflow in containers
  const checkOverflow = () => {
    if (eventsScrollRef.current) {
      const hasOverflow = eventsScrollRef.current.scrollWidth > eventsScrollRef.current.clientWidth;
      setEventsHasOverflow(hasOverflow);
    }
    if (notesScrollRef.current) {
      const hasOverflow = notesScrollRef.current.scrollWidth > notesScrollRef.current.clientWidth;
      setNotesHasOverflow(hasOverflow);
    }
    if (eventNotesScrollRef.current) {
      const hasOverflow = eventNotesScrollRef.current.scrollWidth > eventNotesScrollRef.current.clientWidth;
      setEventNotesHasOverflow(hasOverflow);
    }
  };

  // Check overflow when component mounts and when events/notes change
  useEffect(() => {
    checkOverflow();
    // Add a small delay to ensure content is rendered
    const timer = setTimeout(checkOverflow, 100);
    return () => clearTimeout(timer);
  }, [events, notes]);

  // Add keyboard shortcut for 'c' key to open note editor without watch option
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle keys when not in an input/textarea and no modifier keys
      if (!e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey &&
        e.target.tagName !== 'INPUT' &&
        e.target.tagName !== 'TEXTAREA' &&
        e.target.contentEditable !== 'true') {

        if (e.key === 'c') {
          e.preventDefault();
          e.stopPropagation();
          openEditor('add', '', null, []); // No meta tags, so watch option is not selected
        } else if (e.key === 'r') {
          e.preventDefault();
          e.stopPropagation();
          setShowRemindersOnly(true);
          setShowReviewsOverdueOnly(false);
        } else if (e.key === 'w') {
          e.preventDefault();
          e.stopPropagation();
          setShowReviewsOverdueOnly(true);
          setShowRemindersOnly(false);
        } else if (e.key === 't') {
          e.preventDefault();
          e.stopPropagation();
          setShowTimezonePopup(true);
        } else if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          e.stopPropagation();
          setShowAddOptionsPopup(true);
        } else if (e.key === 'Escape' && (showRemindersOnly || showReviewsOverdueOnly)) {
          e.preventDefault();
          e.stopPropagation();
          setShowRemindersOnly(false);
          setShowReviewsOverdueOnly(false);
        }
      }
    };

    // Only add the event listener if we're on the dashboard page
    const isDashboardPage = location.pathname === '/' || location.pathname === '/dashboard';

    if (isDashboardPage) {

      document.addEventListener('keydown', handleKeyDown);
      return () => {

        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [openEditor, showRemindersOnly, showReviewsOverdueOnly, setActivePage, location.pathname, togglePinned]);

  useEffect(() => {
    if (showReviewsOverdueOnly && eventSearchInputRef.current) {
      eventSearchInputRef.current.focus();
    }
  }, [showReviewsOverdueOnly]);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (showReviewsOverdueOnly && e.key === 'w' && reviewOverdueSearchInputRef.current) {
        reviewOverdueSearchInputRef.current.focus();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [showReviewsOverdueOnly]);

  const getCompactTimezones = () => {
    const timezonesToShow = selectedTimezones.length > 0 ? selectedTimezones : [
      'Australia/Sydney',
      'Asia/Kolkata',
      'America/New_York',
      'Europe/London'
    ];

    // Get base timezone from localStorage, default to AEST if not set
    const baseTimezone = localStorage.getItem('baseTimezone') || 'Australia/Sydney';

    const flagMap = {
      'Australia/Sydney': '🇦🇺',
      'Asia/Kolkata': '🇮🇳',
      'America/New_York': '🇺🇸',
      'America/Los_Angeles': '🇺🇸',
      'Europe/London': '🇬🇧',
      'Europe/Paris': '🇫🇷',
      'Asia/Tokyo': '🇯🇵',
      'Asia/Singapore': '🇸🇬',
      'Asia/Hong_Kong': '🇭🇰',
      'Asia/Shanghai': '🇨🇳',
      'Europe/Moscow': '🇷🇺',
      'Africa/Johannesburg': '🇿🇦',
      'America/Sao_Paulo': '🇧🇷',
      'Pacific/Auckland': '🇳🇿',
    };

    // Helper function to format date as YYYY-MM-DD in a given timezone
    const formatYMD = (date, tz) =>
      new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(date);

    // Helper function to get time difference from base timezone
    const getTimeDiffHours = (targetZone) => {
      const baseDate = new Date(new Date().toLocaleString('en-US', { timeZone: baseTimezone }));
      const targetDate = new Date(new Date().toLocaleString('en-US', { timeZone: targetZone }));
      return Math.round((baseDate - targetDate) / 3600000);
    };

    // Helper function to get time-based description
    const getTimeDescription = (hour) => {
      if (hour >= 0 && hour < 6) return 'pre-dawn';
      if (hour >= 6 && hour < 8) return 'early morning';
      if (hour >= 8 && hour < 10) return 'mid-morning';
      if (hour >= 10 && hour < 12) return 'late morning';
      if (hour >= 12 && hour < 14) return 'early afternoon';
      if (hour >= 14 && hour < 16) return 'mid-afternoon';
      if (hour >= 16 && hour < 18) return 'early evening';
      if (hour >= 18 && hour < 20) return 'evening';
      if (hour >= 20 && hour < 21) return 'late evening';
      if (hour >= 21 && hour < 24) return 'night';
      return 'night';
    };

    const timezoneData = timezonesToShow.map(timeZone => {
      const label = timeZone.split('/').pop().replace('_', ' ');
      const flag = flagMap[timeZone] || '';
      const time = formatTimezoneTime(timeZone);

      // Determine if this zone's date is before/after base timezone date
      const zoneYMD = formatYMD(new Date(), timeZone);
      const baseYMD = formatYMD(new Date(), baseTimezone);
      const isPreviousDay = zoneYMD < baseYMD;
      const isNextDay = zoneYMD > baseYMD;

      // Calculate relative day text
      let relativeDayText = 'today';
      if (isPreviousDay) {
        relativeDayText = 'yesterday';
      } else if (isNextDay) {
        relativeDayText = 'tomorrow';
      }

      // Get hour in the timezone for time description
      const timeInZone = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour12: false,
        hour: 'numeric',
      }).format(new Date());
      const hourNum = parseInt(timeInZone, 10);

      // Get time-based description and combine with day
      const timeDescription = getTimeDescription(hourNum);
      const enhancedRelativeDayText = `${relativeDayText} ${timeDescription}`;

      // Calculate time difference from base timezone
      const timeDiffHours = getTimeDiffHours(timeZone);

      return { label, flag, time, timeZone, timeDiffHours, relativeDayText: enhancedRelativeDayText };
    });

    // Sort by absolute distance from base timezone (nearest to farthest)
    return timezoneData.sort((a, b) => Math.abs(a.timeDiffHours) - Math.abs(b.timeDiffHours));
  };

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const response = await loadAllNotes();
        if (response && response.notes) {
          setNotes(response.notes);

          // Extract events from notes
          const eventNotes = response.notes.filter(note => note && note.content && note.content.includes('meta::event::'));
          setEvents(eventNotes);
        }
      } catch (error) {
        console.error('Error loading notes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, [setNotes]);

  if (loading) {
    return (
      <div className="p-4 w-full">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  // Handler functions for add options
  const handleAddEvent = () => {
    // Open EditEventModal for adding new event
    setEditingEvent(null);
    setIsAddingDeadline(false);
    setIsAddingHoliday(false);
    setShowEditEventModal(true);
  };

  const handleAddDeadline = () => {
    // Open EditEventModal for adding new deadline
    setEditingEvent(null);
    setIsAddingDeadline(true);
    setIsAddingHoliday(false);
    setShowEditEventModal(true);
  };

  const handleAddHoliday = () => {
    // Open EditEventModal for adding new holiday
    setEditingEvent(null);
    setIsAddingDeadline(false);
    setIsAddingHoliday(true);
    setShowEditEventModal(true);
  };

  // Get base timezone for display
  const baseTimezone = localStorage.getItem('baseTimezone') || 'Australia/Sydney';
  const baseTimezoneLabel = baseTimezone.split('/').pop().replace('_', ' ');
  const baseTimezoneFlag = {
    'Australia/Sydney': '🇦🇺',
    'Asia/Kolkata': '🇮🇳',
    'America/New_York': '🇺🇸',
    'America/Los_Angeles': '🇺🇸',
    'Europe/London': '🇬🇧',
    'Europe/Paris': '🇫🇷',
    'Asia/Tokyo': '🇯🇵',
    'Asia/Singapore': '🇸🇬',
    'Asia/Hong_Kong': '🇭🇰',
    'Asia/Shanghai': '🇨🇳',
    'Europe/Moscow': '🇷🇺',
    'Africa/Johannesburg': '🇿🇦',
    'America/Sao_Paulo': '🇧🇷',
    'Pacific/Auckland': '🇳🇿',
  }[baseTimezone] || '🌐';

  return (
    <div className="container mx-auto px-4 pb-8">
      {/* Show only reminders when showRemindersOnly is true */}
      {showRemindersOnly ? (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Reminders Only</h2>
            <div className="text-sm text-gray-500">Press Escape to return to normal view • Use ↑↓ arrows to navigate, Enter/L to open link, M to dismiss • Vim: gg/G for first/last, number+j/k to jump (e.g. 4j, 3k)</div>
          </div>
          <RemindersAlert
            allNotes={notes}
            expanded={true}
            setNotes={setNotes}
            isRemindersOnlyMode={true}
          />
        </div>
      ) : showReviewsOverdueOnly ? (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Reviews Overdue Only</h2>
            <div className="text-sm text-gray-500">Press Escape to return to normal view • Use ↑↓ arrows to navigate, Enter to unfollow</div>
          </div>
          <ReviewOverdueAlert
            notes={notes}
            expanded={true}
            setNotes={setNotes}
            isReviewsOverdueOnlyMode={true}
            searchInputRef={reviewOverdueSearchInputRef}
          />
        </div>
      ) : (
        <>
          {/* Bookmarked Links - Topmost Item */}
          {!isPinned && (
            <div className="mb-4">
              <BookmarkedLinks
                key={`bookmarks-${notes.length}-${notes.reduce((acc, note) => acc + (note && note.content && note.content.includes('meta::bookmark_pinned') ? 1 : 0), 0)}`}
                notes={notes}
                setNotes={setNotes}
              />
            </div>
          )}

          {/* Backup Alert */}
          <div className="mb-4">
            <BackupAlert notes={notes} />
          </div>


          {/* First Row: Date and Timezone Display (Full Width) */}
          <div className={`mb-4 ${isPinned ? 'pt-8' : ''}`}>
            <div className="flex flex-col items-center">
              {/* First Row: Date and Current Time */}
              <div className="flex items-center gap-6 mb-4">
                <div className="relative group/date">
                  <h1 className="text-3xl font-bold cursor-pointer">{formattedDate}</h1>

                  {/* Calendar dropdown popup - appears on hover */}
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-[1100px] bg-white rounded-lg shadow-xl border border-gray-200 z-50 opacity-0 invisible group-hover/date:opacity-100 group-hover/date:visible transition-all duration-200 max-h-[80vh] overflow-y-auto">
                    <CustomCalendar allNotes={notes} />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-base font-medium">{formattedTime}</div>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <span>{baseTimezoneFlag}</span>
                    <span>{baseTimezoneLabel}</span>
                  </div>
                  {/* Font Selector */}
                  <div className="relative" ref={fontSelectorRef}>
                    <button
                      onClick={() => setShowFontSelector(!showFontSelector)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      title="Change font"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="4 7 4 4 20 4 20 7" />
                        <line x1="9" y1="20" x2="15" y2="20" />
                        <line x1="12" y1="4" x2="12" y2="20" />
                      </svg>
                    </button>
                    {showFontSelector && (
                      <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-72 overflow-y-auto">
                        <div className="p-2 border-b border-gray-100">
                          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Font</div>
                        </div>
                        {availableFonts.map((font) => (
                          <button
                            key={font}
                            onClick={() => { setSelectedFont(font); setShowFontSelector(false); }}
                            className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 transition-colors ${selectedFont === font ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}
                            style={{ fontFamily: font === 'System Default' ? 'inherit' : `"${font}", sans-serif` }}
                          >
                            {font}
                            {selectedFont === font && <span className="float-right text-blue-500">&#10003;</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Timezone Cards Display */}
              {showTimezones && (
                <div className="mb-6 w-full">
                  <TimeZoneDisplay selectedTimezones={selectedTimezones} />
                </div>
              )}

              {/* Stock Information, Exchange Rates, and Weather - Button Row */}
              {showTimezones && (() => {
                let stockPrice = null;
                let stockSymbol = '';
                let stockShares = parseInt(localStorage.getItem('stockShares') || '100', 10);
                try {
                  const c = localStorage.getItem('stockPriceData');
                  if (c) { const d = JSON.parse(c); stockPrice = d.price; stockSymbol = d.symbol || ''; }
                } catch (e) { }

                // Compute market status
                const getMarketInfo = () => {
                  const now = new Date();
                  const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
                  const day = etTime.getDay();
                  const hour = etTime.getHours();
                  const minute = etTime.getMinutes();
                  const currentMin = hour * 60 + minute;
                  const openMin = 9 * 60;
                  const closeMin = 16 * 60;
                  if (day === 0 || day === 6) {
                    const daysUntil = day === 0 ? 1 : 2;
                    const minsUntil = daysUntil * 24 * 60 - currentMin + openMin;
                    const h = Math.floor(minsUntil / 60);
                    const m = minsUntil % 60;
                    return { open: false, label: 'Closed', countdown: `Opens in ${daysUntil}d ${h % 24}h ${m}m` };
                  }
                  if (currentMin >= openMin && currentMin < closeMin) {
                    return { open: true, label: 'Open' };
                  }
                  let minsUntil = currentMin < openMin ? openMin - currentMin : (24 * 60 - currentMin) + openMin;
                  if (currentMin >= closeMin) {
                    // Check if tomorrow is weekend
                    if (day === 5) { minsUntil += 2 * 24 * 60; }
                  }
                  const h = Math.floor(minsUntil / 60);
                  const m = minsUntil % 60;
                  return { open: false, label: 'Closed', countdown: `Opens in ${h}h ${m}m` };
                };
                const marketInfo = getMarketInfo();

                let usdToInr = null, audToInr = null;
                try {
                  const c = localStorage.getItem('exchangeRatesData');
                  if (c) ({ usdToInr, audToInr } = JSON.parse(c));
                } catch (e) { }

                let weather = null;
                try {
                  const c = localStorage.getItem('weatherData');
                  if (c) weather = JSON.parse(c);
                } catch (e) { }

                const weatherCondition = weather
                  ? ((weather.rain > 0 || weather.precipitation > 0) ? 'Showers' : weather.temperature > 25 ? 'Sunny' : 'Partly Cloudy')
                  : null;
                const isSunny = weatherCondition === 'Sunny';

                return (
                  <div className="mb-6 w-full">
                    <div className="bg-gray-100 p-2 sm:p-3 rounded-lg">
                      <div className="flex gap-1.5 sm:gap-2 items-stretch">
                        {/* Stock Information */}
                        <div
                          className="relative group flex-1 flex"
                          onMouseEnter={() => setActivePopup('stock')}
                          onMouseLeave={() => { if (activePopup === 'stock') setActivePopup(null); }}
                        >
                          <div className="w-full px-4 py-3 bg-white rounded-lg shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 flex items-start cursor-pointer">
                            <div className="text-left min-w-0 flex-1">
                              <div className="text-[10px] uppercase tracking-wide font-medium text-gray-500">
                                {stockSymbol ? <span className="font-bold text-gray-800">{stockSymbol}</span> : 'Stock'} <span className={`${marketInfo.open ? 'text-green-600' : 'text-red-500'}`}>({marketInfo.label}{!marketInfo.open && marketInfo.countdown ? ` - ${marketInfo.countdown}` : ''})</span>
                              </div>
                              <div className="text-base font-semibold text-gray-900 leading-tight truncate">
                                {stockPrice != null ? `$${stockPrice.toFixed(2)}` : '—'}
                              </div>
                              {stockPrice != null && (() => {
                                const totalUsd = stockShares * stockPrice;
                                let audStr = '';
                                if (usdToInr && audToInr) {
                                  const usdToAud = audToInr / usdToInr;
                                  const totalAud = totalUsd / usdToAud;
                                  audStr = ` (A$${totalAud.toLocaleString('en-AU', { maximumFractionDigits: 0 })})`;
                                }
                                return (
                                  <div className="text-[10px] text-gray-500">
                                    Assets: <span className="font-medium text-gray-700">${totalUsd.toLocaleString('en-US', { maximumFractionDigits: 0 })}{audStr}</span>
                                  </div>
                                );
                              })()}
                            </div>
                            <button
                              onClick={(e) => { e.stopPropagation(); document.dispatchEvent(new CustomEvent('refreshStockPrice')); }}
                              className="p-1 text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0"
                              title="Refresh stock price"
                            >
                              <ArrowPathIcon className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className={`absolute left-0 top-full mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50 transition-all duration-200 ${activePopup === 'stock' ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
                            <StockPrice forceExpanded={true} />
                          </div>
                        </div>

                        {/* Exchange Rates */}
                        <div
                          className="relative group flex-1 flex"
                          onMouseEnter={() => setActivePopup('exchange')}
                          onMouseLeave={() => { if (activePopup === 'exchange') setActivePopup(null); }}
                        >
                          <button className="w-full px-4 py-3 bg-white rounded-lg shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 flex items-start">
                            <div className="text-left min-w-0 flex-1">
                              <div className="text-[10px] uppercase tracking-wide font-medium text-gray-500">Exchange Rates</div>
                              <div className="flex items-baseline gap-3 leading-tight">
                                <div className="text-sm font-semibold text-gray-900">
                                  ₹{usdToInr != null ? usdToInr.toFixed(2) : '—'}
                                  <span className="text-[10px] font-normal text-gray-500 ml-1">USD</span>
                                </div>
                                <div className="text-sm font-semibold text-gray-900">
                                  ₹{audToInr != null ? audToInr.toFixed(2) : '—'}
                                  <span className="text-[10px] font-normal text-gray-500 ml-1">AUD</span>
                                </div>
                              </div>
                            </div>
                          </button>
                          <div className={`absolute left-0 top-full mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50 transition-all duration-200 ${activePopup === 'exchange' ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
                            <ExchangeRates forceExpanded={true} />
                          </div>
                        </div>

                        {/* Weather */}
                        <div
                          className="relative group flex-1 flex"
                          onMouseEnter={() => setActivePopup('weather')}
                          onMouseLeave={() => { if (activePopup === 'weather') setActivePopup(null); }}
                        >
                          <button className="w-full px-4 py-3 bg-white rounded-lg shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 flex items-start">
                            <div className="text-left min-w-0 flex-1">
                              <div className="text-[10px] uppercase tracking-wide font-medium text-gray-500">Weather</div>
                              {weather ? (
                                <div className="flex items-baseline gap-2 leading-tight">
                                  <div className="text-base font-semibold text-gray-900">{weather.temperature?.toFixed(1)}°</div>
                                  <div className="text-[11px] text-gray-500">feels {weather.apparentTemperature?.toFixed(1)}°</div>
                                  <div className="text-[11px] text-gray-500 ml-auto">↑{weather.todayMax?.toFixed(0)}° ↓{weather.todayMin?.toFixed(0)}°</div>
                                </div>
                              ) : (
                                <div className="text-base font-semibold text-gray-900 leading-tight">—</div>
                              )}
                            </div>
                          </button>
                          <div className={`absolute right-0 top-full mt-2 w-[1100px] bg-transparent z-50 transition-all duration-200 ${activePopup === 'weather' ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
                            <Weather forceExpanded={true} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Today Events Bar - Moved from AlertsProvider */}
              <div className="mb-6 w-full">
                <TodayEventsBar events={events} />
              </div>
            </div>
          </div>

          {/* Flagged Review Dues Section */}
          <FlaggedReviewDues notes={notes} setNotes={setNotes} setActivePage={setActivePage} sectionHeader={true} />

          {/* Events Section */}
          <div className="mb-1 mt-2 border-b border-gray-200 pb-1">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Events</h2>
          </div>
          <div className="mb-4">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-4">
                <div className="flex flex-wrap gap-1 items-center">
                  {/* Filter chips */}
                  {[
                    { f: 'all',      label: 'All',      active: 'bg-blue-500 text-white' },
                    { f: 'deadline', label: 'Deadline',  active: 'bg-red-500 text-white' },
                    { f: 'holiday',  label: 'Holiday',   active: 'bg-blue-500 text-white' },
                    { f: 'others',   label: 'Others',    active: 'bg-gray-600 text-white' },
                  ].map(({ f, label, active }) => {
                    const isActive = activeFilters.includes(f);
                    return (
                      <button
                        key={f}
                        onClick={() => {
                          if (f === 'all') {
                            setActiveFilters(['all']);
                          } else {
                            setActiveFilters(prev => {
                              const without = prev.filter(x => x !== 'all' && x !== f);
                              return prev.includes(f) ? (without.length ? without : ['all']) : [...without, f];
                            });
                          }
                        }}
                        className={`px-2 py-1 text-xs rounded transition-colors ${isActive ? active : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                {/* Tags Filter Section */}
                <div className="flex flex-wrap gap-1 items-center border-l border-gray-300 pl-4">
                  {[
                    { f: 'birthday', label: '🎂 Birthday', active: 'bg-blue-500 text-white' },
                    { f: 'wedding',  label: '💍 Wedding',  active: 'bg-blue-500 text-white' },
                    { f: 'death',    label: '🕊️ Death',    active: 'bg-gray-600 text-white' },
                  ].map(({ f, label, active }) => {
                    const isActive = activeFilters.includes(f);
                    return (
                      <button
                        key={f}
                        onClick={() => {
                          setActiveFilters(prev => {
                            const without = prev.filter(x => x !== 'all' && x !== f);
                            return prev.includes(f) ? (without.length ? without : ['all']) : [...without, f];
                          });
                        }}
                        className={`px-2 py-1 text-xs rounded transition-colors ${isActive ? active : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                      >
                        {label}
                      </button>
                    );
                  })}

                  {/* Set as Default button */}
                  <button
                    onClick={() => {
                      localStorage.setItem('defaultEventFilters', JSON.stringify(activeFilters));
                    }}
                    className="px-2 py-1 text-xs text-blue-600 border border-blue-200 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                    title="Save current selection as default"
                  >
                    Set Default
                  </button>

                  {/* Text Filter Input with Clear Button */}
                  <div className="relative">
                    <input
                      ref={eventSearchInputRef}
                      type="text"
                      placeholder="Filter events..."
                      value={eventTextFilter}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        setEventTextFilter(newValue);
                        if (newValue.trim() !== '' && !activeFilters.includes('all')) {
                          setActiveFilters(['all']);
                        }
                      }}
                      className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 pr-6"
                      style={{ width: '120px' }}
                    />
                    {eventTextFilter && (
                      <button
                        onClick={() => setEventTextFilter('')}
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Clear filter"
                      >
                        <XMarkIcon className="h-3 w-3" />
                      </button>
                    )}
                  </div>

                  {/* Reset Button */}
                  <button
                    onClick={() => { setActiveFilters(['deadline']); setEventTextFilter(''); }}
                    className="px-2 py-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    title="Reset filters"
                  >
                    <ArrowPathIcon className="h-3 w-3" />
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    // This will trigger the add event functionality
                    // We need to pass this through to EventManager
                    const event = new CustomEvent('addEvent');
                    document.dispatchEvent(event);
                  }}
                  className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Note
                </button>
                <button
                  onClick={() => {
                    setEditingEvent(null); // Set to null for new event
                    setShowEditEventModal(true);
                  }}
                  className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <PlusIcon className="h-4 w-4" />
                  Add Event
                </button>
              </div>
            </div>
            {/* Event Notes Row */}
            <div className="relative group/events mb-2 overflow-visible">
              {/* Left Arrow - outside frame on hover */}
              {eventNotesHasOverflow && (
                <button
                  onClick={scrollEventNotesLeft}
                  className="absolute -left-10 top-1/2 -translate-y-1/2 z-10 bg-white hover:bg-gray-100 text-gray-600 hover:text-gray-800 p-2 rounded-full shadow-md transition-all opacity-0 group-hover/events:opacity-100"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
              )}

              {/* Event Notes Container */}
              <div
                ref={eventNotesScrollRef}
                className="overflow-x-auto"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
                onScroll={(e) => {
                  // Prevent manual scrolling, only allow programmatic scrolling
                  e.preventDefault();
                }}
              >
                <div className="inline-flex gap-4 pb-1" style={{ minWidth: 'max-content' }}>
                  <EventManager
                    type="eventNotes"
                    notes={notes}
                    setActivePage={setActivePage}
                    setNotes={setNotes}
                    eventFilter={activeFilters}
                    eventTextFilter={eventTextFilter}
                    onEditEvent={(note) => {
                      setEditingEvent(note);
                      setShowEditEventModal(true);
                    }}
                    onDeleteNote={async (noteId) => {
                      console.log('[Dashboard EventManager] onDeleteNote called with:', noteId);
                      try {
                        await deleteNoteById(noteId);
                        console.log('[Dashboard EventManager] Backend delete successful');
                        setNotes(prevNotes => {
                          const updated = prevNotes.filter(n => n.id !== noteId);
                          console.log('[Dashboard EventManager] State updated, remaining notes:', updated.length);
                          return updated;
                        });
                      } catch (error) {
                        console.error('[Dashboard EventManager] Error:', error);
                        alert('Failed to delete: ' + error.message);
                      }
                    }}
                  />
                </div>
              </div>

              {/* Right Arrow - overlay on hover */}
              {eventNotesHasOverflow && (
                <button
                  onClick={scrollEventNotesRight}
                  className="absolute -right-10 top-1/2 -translate-y-1/2 z-10 bg-white hover:bg-gray-100 text-gray-600 hover:text-gray-800 p-2 rounded-full shadow-md transition-all opacity-0 group-hover/events:opacity-100"
                >
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
              )}
            </div>


            {/* Upcoming Alerts Row */}

            {/* Notes Row */}
            <div className="relative group/notes mb-2 overflow-visible">
              {/* Left Arrow - outside frame on hover */}
              {notesHasOverflow && (
                <button
                  onClick={scrollNotesLeft}
                  className="absolute -left-10 top-1/2 -translate-y-1/2 z-10 bg-white hover:bg-gray-100 text-gray-600 hover:text-gray-800 p-2 rounded-full shadow-md transition-all opacity-0 group-hover/notes:opacity-100"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
              )}

              {/* Notes Container */}
              <div
                ref={notesScrollRef}
                className="overflow-x-auto"
                style={{
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
              >
                <div className="inline-flex gap-4 pb-1" style={{ minWidth: 'max-content' }}>
                  <EventManager
                    type="notes"
                    notes={notes}
                    setActivePage={setActivePage}
                    onDeleteNote={async (noteId) => {
                      try {
                        await deleteNoteById(noteId);
                        setNotes(prevNotes => prevNotes.filter(n => n.id !== noteId));
                      } catch (error) {
                        console.error('Error deleting:', error);
                        alert('Failed to delete: ' + error.message);
                      }
                    }}
                  />
                </div>
              </div>

              {/* Right Arrow - overlay on hover */}
              {notesHasOverflow && (
                <button
                  onClick={scrollNotesRight}
                  className="absolute -right-10 top-1/2 -translate-y-1/2 z-10 bg-white hover:bg-gray-100 text-gray-600 hover:text-gray-800 p-2 rounded-full shadow-md transition-all opacity-0 group-hover/notes:opacity-100"
                >
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>



          {/* Alerts & Reminders Section */}
          <div className="mb-1 mt-2 border-b border-gray-200 pb-1 flex items-center gap-2">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Alerts & Reminders</h2>
            <button 
              onClick={() => setShowAlertsHelpPopup(true)}
              className="text-gray-400 hover:text-blue-500 transition-colors"
              title="Alerts & Reminders Wiki"
            >
              <InformationCircleIcon className="h-5 w-5" />
            </button>
          </div>
          <div className="mb-4">
            <AlertsProvider
              notes={notes}
              events={events}
              setNotes={setNotes}
            >
            </AlertsProvider>
          </div>

          {/* Watched Trackers Section */}
          <div className="mb-4">
            <WatchedTrackers notes={notes} setNotes={setNotes} />
          </div>

          {/* Tracked Info Cards */}
          <div className="mb-4">
            <TrackedInfoCards notes={notes} setNotes={setNotes} />
          </div>
        </>
      )}

      {/* Timezone Popup */}
      <TimezonePopup
        isOpen={showTimezonePopup}
        onClose={() => setShowTimezonePopup(false)}
      />

      {/* Add Options Popup */}
      <AddOptionsPopup
        isOpen={showAddOptionsPopup}
        onClose={() => setShowAddOptionsPopup(false)}
        onAddEvent={handleAddEvent}
        onAddDeadline={handleAddDeadline}
        onAddHoliday={handleAddHoliday}
      />

      {/* Alerts Help Popup */}
      <AlertsHelpPopup
        isOpen={showAlertsHelpPopup}
        onClose={() => setShowAlertsHelpPopup(false)}
      />

      {/* Edit Event Modal */}
      {showEditEventModal && (
        <EditEventModal
          isOpen={showEditEventModal}
          note={editingEvent}
          onSave={async (content) => {
            if (editingEvent) {
              // Update existing event
              const note = notes.find(n => n.id === editingEvent.id);
              if (note) {
                try {
                  // Update the note in the backend
                  const response = await updateNoteById(editingEvent.id, content);

                  // Update the note in the local state
                  const updatedNote = {
                    ...note,
                    content: response && response.content ? response.content : content
                  };
                  setNotes(notes.map(n => n.id === note.id ? updatedNote : n));
                } catch (error) {
                  console.error('Error updating note:', error);
                  // Still update local state even if backend fails
                  const updatedNote = { ...note, content: content };
                  setNotes(notes.map(n => n.id === note.id ? updatedNote : n));
                }
              }
            } else {
              // Add new event
              try {
                const newNote = await createNote(content);
                setNotes([...notes, newNote]);
              } catch (error) {
                console.error('Error creating note:', error);
                // Still add to local state even if backend fails
                const fallbackNote = {
                  id: Date.now().toString(),
                  content: content,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                };
                setNotes([...notes, fallbackNote]);
              }
            }
            setShowEditEventModal(false);
            setEditingEvent(null);
            setIsAddingDeadline(false);
            setIsAddingHoliday(false);
          }}
          onCancel={() => {
            setShowEditEventModal(false);
            setEditingEvent(null);
            setIsAddingDeadline(false);
            setIsAddingHoliday(false);
          }}
          onSwitchToNormalEdit={() => {
            setShowEditEventModal(false);
            setEditingEvent(null);
            setIsAddingDeadline(false);
            setIsAddingHoliday(false);
          }}
          onDelete={async (noteId) => {
            console.log('[Dashboard] onDelete called with noteId:', noteId);
            try {
              // Delete from backend
              console.log('[Dashboard] Calling deleteNoteById...');
              await deleteNoteById(noteId);
              console.log('[Dashboard] Backend delete successful');

              // Update notes state by filtering out the deleted note
              setNotes(prevNotes => {
                console.log('[Dashboard] Updating notes state');
                const updatedNotes = prevNotes.filter(n => n.id !== noteId);
                // Also update events state since events are derived from notes
                const eventNotes = updatedNotes.filter(note => note && note.content && note.content.includes('meta::event::'));
                console.log('[Dashboard] New events count:', eventNotes.length);
                setEvents(eventNotes);
                return updatedNotes;
              });
            } catch (error) {
              console.error('[Dashboard] Error deleting event:', error);
              alert('Failed to delete event: ' + error.message);
            }
            console.log('[Dashboard] Closing modal');
            setShowEditEventModal(false);
            setEditingEvent(null);
            setIsAddingDeadline(false);
            setIsAddingHoliday(false);
          }}
          notes={notes}
          isAddDeadline={isAddingDeadline}
          prePopulatedTags={isAddingHoliday ? "holiday" : ""}
        />
      )}
    </div>
  );
};

export default Dashboard; 