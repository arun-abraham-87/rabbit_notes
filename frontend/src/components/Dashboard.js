import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertsProvider } from './Alerts.js';
import RemindersAlert from './RemindersAlert.js';
import ReviewOverdueAlert from './ReviewOverdueAlert.js';
import { loadAllNotes, createNote, updateNoteById } from '../utils/ApiUtils.js';
import { ChevronDownIcon, ChevronUpIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon } from '@heroicons/react/24/solid';
import TimeZoneDisplay from './TimeZoneDisplay.js';
import TimezonePopup from './TimezonePopup.js';
import BookmarkedLinks from './BookmarkedLinks.js';
import EventManager from './EventManager.js';

import EditEventModal from './EditEventModal.js';
import Countdown from './Countdown.js';
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

const Dashboard = ({notes, setNotes, setActivePage}) => {
  const { isPinned, togglePinned } = useLeftPanel();
  const { openEditor } = useNoteEditor();
  const location = useLocation();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(new Date());
  const [timezones, setTimezones] = useState([]);
  const [showTimezones, setShowTimezones] = useState(true);
  const [selectedTimezones, setSelectedTimezones] = useState([]);
  const [isEventManagerCollapsed, setIsEventManagerCollapsed] = useState(false);
  const [eventScrollPosition, setEventScrollPosition] = useState(0);
  const [notesScrollPosition, setNotesScrollPosition] = useState(0);
  const [eventsHasOverflow, setEventsHasOverflow] = useState(false);
  const [notesHasOverflow, setNotesHasOverflow] = useState(false);
  const [eventNotesHasOverflow, setEventNotesHasOverflow] = useState(false);
  const [showRemindersOnly, setShowRemindersOnly] = useState(false);
  const [showReviewsOverdueOnly, setShowReviewsOverdueOnly] = useState(false);
  const [showTimezonePopup, setShowTimezonePopup] = useState(false);
  const [showAddOptionsPopup, setShowAddOptionsPopup] = useState(false);
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [isAddingDeadline, setIsAddingDeadline] = useState(false);
  const [isAddingHoliday, setIsAddingHoliday] = useState(false);
  const [eventFilter, setEventFilter] = useState('deadline'); // 'all', 'deadline', 'holiday'
  
  // Refs for scroll containers
  const eventsScrollRef = useRef(null);
  const notesScrollRef = useRef(null);
  const eventNotesScrollRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load selected timezones from localStorage on component mount
  useEffect(() => {
    const savedTimezones = localStorage.getItem('selectedTimezones');
    if (savedTimezones) {
      setSelectedTimezones(JSON.parse(savedTimezones));
    }
  }, []);

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

  // Calculate fun facts and countdowns
  const getFunFacts = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();
    
    // End of year
    const endOfYear = new Date(currentYear, 11, 31);
    const daysToEndOfYear = Math.ceil((endOfYear - now) / (1000 * 60 * 60 * 24));
    const weeksToEndOfYear = Math.ceil(daysToEndOfYear / 7);
    const monthsToEndOfYear = 12 - currentMonth - 1; // -1 because we're in current month
    
    // End of month
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const daysToEndOfMonth = endOfMonth.getDate() - currentDay;
    
    // End of week (Sunday)
    const daysToSunday = 7 - now.getDay();
    const daysToEndOfWeek = daysToSunday === 7 ? 0 : daysToSunday;
    
    // Progress through year
    const startOfYear = new Date(currentYear, 0, 1);
    const daysSinceStartOfYear = Math.ceil((now - startOfYear) / (1000 * 60 * 60 * 24));
    const totalDaysInYear = new Date(currentYear, 11, 31).getDate() + 
                           new Date(currentYear, 11, 0).getDate() * 11; // Approximate
    const yearProgress = Math.round((daysSinceStartOfYear / totalDaysInYear) * 100);
    
    return {
      daysToEndOfYear,
      weeksToEndOfYear,
      monthsToEndOfYear,
      daysToEndOfMonth,
      daysToEndOfWeek,
      yearProgress
    };
  };

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
      console.log('Dashboard: Setting up keyboard event listener');
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        console.log('Dashboard: Cleaning up keyboard event listener');
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [openEditor, showRemindersOnly, showReviewsOverdueOnly, setActivePage, location.pathname, togglePinned]);

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
          />
        </div>
      ) : (
        <>
          {/* Bookmarked Links - Topmost Item */}
          {!isPinned && (
            <div className="mb-8">
              <BookmarkedLinks 
                key={`bookmarks-${notes.length}-${notes.reduce((acc, note) => acc + (note && note.content && note.content.includes('meta::bookmark_pinned') ? 1 : 0), 0)}`}
                notes={notes} 
                setNotes={setNotes} 
              />
            </div>
          )}

          {/* First Row: Date and Timezone Display (Full Width) */}
          <div className={`mb-8 ${isPinned ? 'pt-8' : ''}`}>
            <div className="flex flex-col items-center">
              {/* First Row: Date and Current Time */}
              <div className="flex items-center gap-6 mb-4">
                <h1 className="text-3xl font-bold">{formattedDate}</h1>
                <div className="flex items-center gap-4">
                  <div className="text-base font-medium">{formattedTime}</div>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <span>{baseTimezoneFlag}</span>
                    <span>{baseTimezoneLabel}</span>
                  </div>
                </div>
              </div>
              
              {/* Fun Facts Line */}
              <div className="text-sm text-gray-600 mb-4 text-center">
                {(() => {
                  const facts = getFunFacts();
                  const factItems = [];
                  
                  // End of year countdown (days/weeks/months)
                  if (facts.daysToEndOfYear > 0) {
                    let yearCountdown = `${facts.daysToEndOfYear} days`;
                    if (facts.weeksToEndOfYear > 0) {
                      yearCountdown += ` / ${facts.weeksToEndOfYear} weeks`;
                    }
                    if (facts.monthsToEndOfYear > 0) {
                      yearCountdown += ` / ${facts.monthsToEndOfYear} months`;
                    }
                    factItems.push(`${yearCountdown} to end of year`);
                  }
                  
                  // End of month countdown
                  if (facts.daysToEndOfMonth > 0) {
                    factItems.push(`${facts.daysToEndOfMonth} days to end of month`);
                  }
                  
                  // End of week countdown
                  if (facts.daysToEndOfWeek > 0) {
                    factItems.push(`${facts.daysToEndOfWeek} days to end of week`);
                  }
                  
                  // Year progress
                  factItems.push(`${facts.yearProgress}% through the year`);
                  
                  return factItems.join(' • ');
                })()}
              </div>
              
              {/* Timezone Cards Display */}
              {showTimezones && (
                <div className="mb-6">
                  <TimeZoneDisplay selectedTimezones={selectedTimezones} />
                </div>
              )}
            </div>
          </div>

          {/* Second Row: Event Manager Cards */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsEventManagerCollapsed(!isEventManagerCollapsed)}
                  className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  {isEventManagerCollapsed ? (
                    <>
                      <ChevronDownIcon className="h-4 w-4" />
                      Show Events
                    </>
                  ) : (
                    <>
                      <ChevronUpIcon className="h-4 w-4" />
                      Hide Events
                    </>
                  )}
                </button>
                
                {!isEventManagerCollapsed && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEventFilter('all')}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        eventFilter === 'all' 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setEventFilter('deadline')}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        eventFilter === 'deadline' 
                          ? 'bg-red-500 text-white' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Deadline
                    </button>
                    <button
                      onClick={() => setEventFilter('holiday')}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        eventFilter === 'holiday' 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Holiday
                    </button>
                  </div>
                )}
              </div>
              
              {!isEventManagerCollapsed && (
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
              )}
            </div>
            {!isEventManagerCollapsed && (
              <>
                {/* Event Notes Row */}
                <div className="flex items-center gap-2 mb-6">
                  {/* Left Arrow */}
                  <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
                    {eventNotesHasOverflow && (
                      <button
                        onClick={scrollEventNotesLeft}
                        className="bg-white/80 hover:bg-white text-gray-600 hover:text-gray-800 p-2 rounded-full shadow-md transition-all"
                      >
                        <ChevronLeftIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                  
                  {/* Event Notes Container */}
                  <div 
                    ref={eventNotesScrollRef}
                    className="flex-1 overflow-x-auto"
                    style={{ 
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none'
                    }}
                    onScroll={(e) => {
                      // Prevent manual scrolling, only allow programmatic scrolling
                      e.preventDefault();
                    }}
                  >
                    <div className="inline-flex gap-4 pb-4 px-4" style={{ minWidth: 'max-content' }}>
                      <EventManager 
                        type="eventNotes" 
                        notes={notes} 
                        setActivePage={setActivePage}
                        eventFilter={eventFilter}
                        onEditEvent={(note) => {
                          setEditingEvent(note);
                          setShowEditEventModal(true);
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* Right Arrow */}
                  <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
                    {eventNotesHasOverflow && (
                      <button
                        onClick={scrollEventNotesRight}
                        className="bg-white/80 hover:bg-white text-gray-600 hover:text-gray-800 p-2 rounded-full shadow-md transition-all"
                      >
                        <ChevronRightIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Notes Row */}
                <div className="flex items-center gap-2 mb-6">
                  {/* Left Arrow */}
                  <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
                    {notesHasOverflow && (
                      <button
                        onClick={scrollNotesLeft}
                        className="bg-white/80 hover:bg-white text-gray-600 hover:text-gray-800 p-2 rounded-full shadow-md transition-all"
                      >
                        <ChevronLeftIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                  
                  {/* Notes Container */}
                  <div 
                    ref={notesScrollRef}
                    className="flex-1 overflow-x-auto"
                    style={{ 
                      scrollbarWidth: 'none',
                      msOverflowStyle: 'none'
                    }}
                  >
                    <div className="inline-flex gap-4 pb-4 px-4" style={{ minWidth: 'max-content' }}>
                      <EventManager type="notes" notes={notes} setActivePage={setActivePage} />
                    </div>
                  </div>
                  
                  {/* Right Arrow */}
                  <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
                    {notesHasOverflow && (
                      <button
                        onClick={scrollNotesRight}
                        className="bg-white/80 hover:bg-white text-gray-600 hover:text-gray-800 p-2 rounded-full shadow-md transition-all"
                      >
                        <ChevronRightIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>


              </>
            )}
          </div>



          {/* Alerts Section */}
          <div className="mb-8">
            <AlertsProvider 
              notes={notes} 
              events={events}
              setNotes={setNotes}
            >
              {/* Additional dashboard content can be added here */}
            </AlertsProvider>
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
            // Remove the note from local state
            setNotes(notes.filter(n => n.id !== noteId));
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