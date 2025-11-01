import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getDateInDDMMYYYYFormatWithAgeInParentheses } from '../utils/DateUtils';
import { PencilIcon, TrashIcon, MagnifyingGlassIcon, XMarkIcon, ExclamationTriangleIcon, CalendarIcon, ListBulletIcon, TagIcon, PlusIcon, EyeIcon, EyeSlashIcon, ArrowsRightLeftIcon, FlagIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { updateNoteById, deleteNoteById, createNote } from '../utils/ApiUtils';
import EditEventModal from '../components/EditEventModal';
import CalendarView from '../components/CalendarView';
import CompareEventsModal from '../components/CompareEventsModal';
import BulkLoadExpenses from '../components/BulkLoadExpenses';

// Helper functions from CalendarView
const getEventOccurrencesForEdit = (event) => {
  const { dateTime, recurrence } = event;
  const eventDate = new Date(dateTime);
  const now = new Date();
  const currentYear = now.getFullYear();
  const occurrences = [];

  if (recurrence === 'none') {
    // For non-recurring events, only include if it's in the current year
    if (eventDate.getFullYear() === currentYear) {
      occurrences.push(eventDate);
    }
    return occurrences;
  }

  // Start from the original event date
  let occurrence = new Date(eventDate);
  
  // For recurring events, calculate all occurrences in the current year
  while (occurrence.getFullYear() <= currentYear) {
    if (occurrence.getFullYear() === currentYear) {
      occurrences.push(new Date(occurrence));
    }

    // Calculate next occurrence based on recurrence type
    if (recurrence === 'daily') {
      occurrence.setDate(occurrence.getDate() + 1);
    } else if (recurrence === 'weekly') {
      occurrence.setDate(occurrence.getDate() + 7);
    } else if (recurrence === 'monthly') {
      occurrence.setMonth(occurrence.getMonth() + 1);
    } else if (recurrence === 'yearly') {
      occurrence.setFullYear(occurrence.getFullYear() + 1);
    }
  }

  return occurrences;
};

const getEventDetailsForEdit = (content) => {
  const lines = content.split('\n');
  
  // Find the description
  const descriptionLine = lines.find(line => line.startsWith('event_description:'));
  const description = descriptionLine ? descriptionLine.replace('event_description:', '').trim() : '';
  
  // Find the event date
  const eventDateLine = lines.find(line => line.startsWith('event_date:'));
  const dateTime = eventDateLine ? eventDateLine.replace('event_date:', '').trim() : '';
  
  // Find recurring info
  const recurringLine = lines.find(line => line.startsWith('event_recurring_type:'));
  const recurrence = recurringLine ? recurringLine.replace('event_recurring_type:', '').trim() : 'none';
  
  // Find meta information
  const metaLine = lines.find(line => line.startsWith('meta::event::'));
  const metaDate = metaLine ? metaLine.replace('meta::event::', '').trim() : '';

  // Find tags
  const tagsLine = lines.find(line => line.startsWith('event_tags:'));
  const tags = tagsLine ? tagsLine.replace('event_tags:', '').trim().split(',').map(tag => tag.trim()) : [];

  // Find any line that starts with event_$: where $ is any character
  const customFields = {};
  lines.forEach(line => {
    if (line.startsWith('event_') && line.includes(':')) {
      const [key, value] = line.split(':');
      if (key !== 'event_description' && key !== 'event_date' && key !== 'event_notes' && key !== 'event_recurring_type' && key !== 'event_tags') {
        const fieldName = key.replace('event_', '');
        customFields[fieldName] = value.trim();
      }
    }
  });

  return {
    description,
    dateTime,
    recurrence,
    metaDate,
    tags,
    customFields
  };
};

const calculateAgeForEdit = (date) => {
  const today = new Date();
  const birthDate = new Date(date);
  
  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  let days = today.getDate() - birthDate.getDate();

  // Adjust for negative days
  if (days < 0) {
    months--;
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, birthDate.getDate());
    days = Math.floor((today - lastMonth) / (1000 * 60 * 60 * 24));
  }

  // Adjust for negative months
  if (months < 0) {
    years--;
    months += 12;
  }

  const parts = [];
  if (years > 0) parts.push(`${years} year${years !== 1 ? 's' : ''}`);
  if (months > 0) parts.push(`${months} month${months !== 1 ? 's' : ''}`);
  if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);

  return parts.join(', ');
};

// Function to extract event details from note content
const getEventDetails = (content) => {
  const lines = content.split('\n');

  // Find the description
  const descriptionLine = lines.find(line => line.startsWith('event_description:'));
  const description = descriptionLine ? descriptionLine.replace('event_description:', '').trim() : '';

  // Find the event date
  const eventDateLine = lines.find(line => line.startsWith('event_date:'));
  const dateTime = eventDateLine ? eventDateLine.replace('event_date:', '').trim() : '';

  // Find event notes
  const notesLine = lines.find(line => line.startsWith('event_notes:'));
  const notes = notesLine ? notesLine.replace('event_notes:', '').trim() : '';

  // Find recurring info
  const recurringLine = lines.find(line => line.startsWith('event_recurring_type:'));
  let recurrence = recurringLine ? recurringLine.replace('event_recurring_type:', '').trim() : 'none';
  // Find meta information
  const metaLine = lines.find(line => line.startsWith('meta::event::'));
  const metaDate = metaLine ? metaLine.replace('meta::event::', '').trim() : '';

  // Find tags
  const tagsLine = lines.find(line => line.startsWith('event_tags:'));
  const tags = tagsLine ? tagsLine.replace('event_tags:', '').trim().split(',').map(tag => tag.trim()) : [];

  // Find any line that starts with event_$: where $ is any character
  const customFields = {};
  lines.forEach(line => {
    if (line.startsWith('event_') && line.includes(':')) {
      const [key, value] = line.split(':');
      if (key !== 'event_description' && key !== 'event_date' && key !== 'event_notes' && key !== 'event_recurring_type' && key !== 'event_tags') {
        const fieldName = key.replace('event_', '');
        customFields[fieldName] = value.trim();
      }
    }
  });

  // Calculate next occurrence for recurring events
  let nextOccurrence = null;
  let lastOccurrence = null;
  if (recurrence === 'none') {
    recurrence = "yearly"
  }
  else if (recurrence !== 'none' && dateTime) {
    const eventDate = new Date(dateTime);
    const now = new Date();

    // Calculate last occurrence
    lastOccurrence = new Date(eventDate);
    if (recurrence === 'daily') {
      // For daily events, last occurrence is today or yesterday
      while (lastOccurrence > now) {
        lastOccurrence.setDate(lastOccurrence.getDate() - 1);
      }
    }
    else if (recurrence === 'weekly') {
      // For weekly events, last occurrence is this week or last week
      while (lastOccurrence > now) {
        lastOccurrence.setDate(lastOccurrence.getDate() - 7);
      }
    }
    else if (recurrence === 'monthly') {
      // For monthly events, last occurrence is this month or last month
      while (lastOccurrence > now) {
        lastOccurrence.setMonth(lastOccurrence.getMonth() - 1);
      }
    }
    else if (recurrence === 'yearly') {
      // For yearly events, last occurrence is this year or last year
      while (lastOccurrence > now) {
        lastOccurrence.setFullYear(lastOccurrence.getFullYear() - 1);
      }
    }

    // Calculate next occurrence
    if (recurrence === 'daily') {
      nextOccurrence = new Date(lastOccurrence);
      nextOccurrence.setDate(lastOccurrence.getDate() + 1);
      while (nextOccurrence <= now) {
        nextOccurrence.setDate(nextOccurrence.getDate() + 1);
      }
    }
    else if (recurrence === 'weekly') {
      nextOccurrence = new Date(lastOccurrence);
      nextOccurrence.setDate(lastOccurrence.getDate() + 7);
      while (nextOccurrence <= now) {
        nextOccurrence.setDate(nextOccurrence.getDate() + 7);
      }
    }
    else if (recurrence === 'monthly') {
      nextOccurrence = new Date(lastOccurrence);
      nextOccurrence.setMonth(lastOccurrence.getMonth() + 1);
      while (nextOccurrence <= now) {
        nextOccurrence.setMonth(nextOccurrence.getMonth() + 1);
      }
    }
    else if (recurrence === 'yearly') {
      nextOccurrence = new Date(lastOccurrence);
      nextOccurrence.setFullYear(lastOccurrence.getFullYear() + 1);
      while (nextOccurrence <= now) {
        nextOccurrence.setFullYear(nextOccurrence.getFullYear() + 1);
      }
    }
  }

  return { description, dateTime, recurrence, metaDate, nextOccurrence, lastOccurrence, tags, notes, customFields };
};

const EventsPage = ({ allNotes, setAllNotes }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const restoringUrlRef = useRef(false);
  
  console.log('[EventsPage] Component rendered:', {
    pathname: location.pathname,
    search: location.search,
    hash: location.hash,
    allNotesLength: allNotes?.length || 0,
    timestamp: new Date().toISOString()
  });
  
  // localStorage keys for persisting state
  const SEARCH_QUERY_STORAGE_KEY = 'eventsPage_searchQuery';
  const FILTER_STATE_STORAGE_KEY = 'eventsPage_filterState';
  
  // Helper function to load initial state from localStorage
  const loadInitialState = () => {
    try {
      // Load search query
      const savedQuery = localStorage.getItem(SEARCH_QUERY_STORAGE_KEY) || '';
      
      // Load filter state
      const savedState = localStorage.getItem(FILTER_STATE_STORAGE_KEY);
      let filterState = {};
      if (savedState) {
        filterState = JSON.parse(savedState);
      }
      
      return {
        searchQuery: savedQuery,
        selectedTags: filterState.selectedTags || [],
        selectedMonth: filterState.selectedMonth || '',
        selectedDay: filterState.selectedDay || '',
        selectedYear: filterState.selectedYear || '',
        showOnlyDeadlines: filterState.showOnlyDeadlines || false,
        showTodaysEventsOnly: filterState.showTodaysEventsOnly || false,
        excludePurchases: filterState.excludePurchases !== undefined ? filterState.excludePurchases : true,
        showPastEvents: filterState.showPastEvents || false
      };
    } catch (error) {
      console.error('Error loading initial state from localStorage:', error);
      return {
        searchQuery: '',
        selectedTags: [],
        selectedMonth: '',
        selectedDay: '',
        selectedYear: '',
        showOnlyDeadlines: false,
        showTodaysEventsOnly: false,
        excludePurchases: true,
        showPastEvents: false
      };
    }
  };
  
  // Check URL parameters for note filtering FIRST, before loading saved state
  // For HashRouter, query params are in location.hash
  const getInitialNoteId = () => {
    console.log('[EventsPage] getInitialNoteId called:', {
      search: location.search,
      hash: location.hash,
      pathname: location.pathname
    });
    
    // Try location.search first (BrowserRouter)
    if (location.search) {
      const searchParams = new URLSearchParams(location.search);
      const noteId = searchParams.get('note');
      console.log('[EventsPage] Found noteId in location.search:', noteId);
      if (noteId) return noteId;
    }
    // Try location.hash (HashRouter)
    if (location.hash) {
      console.log('[EventsPage] Checking location.hash:', location.hash);
      const hashParts = location.hash.split('?');
      console.log('[EventsPage] Hash parts:', hashParts);
      if (hashParts.length > 1) {
        const searchParams = new URLSearchParams(hashParts[1]);
        const noteId = searchParams.get('note');
        console.log('[EventsPage] Found noteId in location.hash:', noteId);
        if (noteId) return noteId;
      }
    }
    console.log('[EventsPage] No noteId found in URL');
    return null;
  };
  
  const initialNoteId = getInitialNoteId();
  const hasNoteIdParam = initialNoteId !== null;
  
  console.log('[EventsPage] Initial note ID check:', {
    initialNoteId,
    hasNoteIdParam,
    willSkipLocalStorage: hasNoteIdParam
  });
  
  // Only load saved state if there's no note ID parameter
  const initialState = hasNoteIdParam ? {
    searchQuery: '',
    selectedTags: [],
    selectedMonth: '',
    selectedDay: '',
    selectedYear: '',
    showOnlyDeadlines: false,
    showTodaysEventsOnly: false,
    excludePurchases: false,
    showPastEvents: false
  } : loadInitialState();
  
  const [searchQuery, setSearchQuery] = useState(initialState.searchQuery);
  const [filterByNoteId, setFilterByNoteId] = useState(() => {
    const noteId = getInitialNoteId();
    console.log('[EventsPage] Initializing filterByNoteId state:', noteId);
    return noteId;
  });
  
  console.log('[EventsPage] State initialized:', {
    searchQuery,
    filterByNoteId,
    selectedTags: initialState.selectedTags,
    initialState
  });
  const [selectedTags, setSelectedTags] = useState(initialState.selectedTags);
  const [selectedMonth, setSelectedMonth] = useState(initialState.selectedMonth);
  const [selectedDay, setSelectedDay] = useState(initialState.selectedDay);
  const [selectedYear, setSelectedYear] = useState(initialState.selectedYear);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [daily, setDaily] = useState(0);
  const [weekly, setWeekly] = useState(0);
  const [monthly, setMonthly] = useState(0);
  const [none, setNone] = useState(0);
  const [showOnlyDeadlines, setShowOnlyDeadlines] = useState(initialState.showOnlyDeadlines);
  const [excludePurchases, setExcludePurchases] = useState(initialState.excludePurchases);
  const [isBulkLoadOpen, setIsBulkLoadOpen] = useState(false);
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [pastEventsCount, setPastEventsCount] = useState(0);
  const [showTodaysEventsOnly, setShowTodaysEventsOnly] = useState(initialState.showTodaysEventsOnly);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchBuffer, setSearchBuffer] = useState('');
  const [selectedEventIndex, setSelectedEventIndex] = useState(-1);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showPastEvents, setShowPastEvents] = useState(initialState.showPastEvents);
  const shouldClearFiltersRef = useRef(false);
  
  // Store filter state to restore when search is cleared
  const savedFiltersRef = useRef(null);
  const isInitialMountRef = useRef(true);
  
  // Save search query to localStorage whenever it changes
  useEffect(() => {
    // Skip saving on initial mount
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }
    
    try {
      if (searchQuery.trim()) {
        localStorage.setItem(SEARCH_QUERY_STORAGE_KEY, searchQuery);
      } else {
        // Remove from localStorage if search is cleared
        localStorage.removeItem(SEARCH_QUERY_STORAGE_KEY);
      }
    } catch (error) {
      console.error('Error saving search query to localStorage:', error);
    }
  }, [searchQuery]);
  
  // Save filter state to localStorage whenever any filter changes (skip if filtering by note ID)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const noteIdParam = searchParams.get('note');
    if (noteIdParam) {
      // Don't save filters when filtering by note ID
      return;
    }
    // Skip saving on initial mount (since we initialized from localStorage)
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }
    
    try {
      const filterState = {
        selectedTags: [...selectedTags],
        selectedMonth,
        selectedDay,
        selectedYear,
        showOnlyDeadlines,
        showTodaysEventsOnly,
        excludePurchases,
        showPastEvents
      };
      localStorage.setItem(FILTER_STATE_STORAGE_KEY, JSON.stringify(filterState));
    } catch (error) {
      console.error('Error saving filter state to localStorage:', error);
    }
  }, [selectedTags, selectedMonth, selectedDay, selectedYear, showOnlyDeadlines, showTodaysEventsOnly, excludePurchases, showPastEvents, location.search]);
  
  // Helper function to save current filter state
  const saveFilterState = () => {
    savedFiltersRef.current = {
      selectedTags: [...selectedTags],
      selectedMonth,
      selectedDay,
      selectedYear,
      showOnlyDeadlines,
      showTodaysEventsOnly,
      excludePurchases,
      showPastEvents
    };
  };
  
  // Helper function to restore saved filter state
  const restoreFilterState = () => {
    if (savedFiltersRef.current) {
      setSelectedTags(savedFiltersRef.current.selectedTags);
      setSelectedMonth(savedFiltersRef.current.selectedMonth);
      setSelectedDay(savedFiltersRef.current.selectedDay);
      setSelectedYear(savedFiltersRef.current.selectedYear);
      setShowOnlyDeadlines(savedFiltersRef.current.showOnlyDeadlines);
      setShowTodaysEventsOnly(savedFiltersRef.current.showTodaysEventsOnly);
      setExcludePurchases(savedFiltersRef.current.excludePurchases);
      setShowPastEvents(savedFiltersRef.current.showPastEvents);
      savedFiltersRef.current = null; // Clear saved state after restoring
    }
  };
  
  // Helper function to clear all filters
  const clearAllFilters = () => {
    setSelectedTags([]);
    setSelectedMonth('');
    setSelectedDay('');
    setSelectedYear('');
    setShowOnlyDeadlines(false);
    setShowTodaysEventsOnly(false);
    setExcludePurchases(false);
    setShowPastEvents(true);
  };
  
  // Add keyboard navigation for 't' key to show today's events
  useEffect(() => {
    
    const handleKeyDown = (e) => {
      
      
      // Test if any key is being captured
      if (e.key === 'Enter') {
        
      }
      
      // Only handle keys when not in an input/textarea and no modifier keys
      if (!e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey &&
          e.target.tagName !== 'INPUT' && 
          e.target.tagName !== 'TEXTAREA' &&
          e.target.contentEditable !== 'true') {
        
        // Handle direct 'b' key press to filter birthdays (supersedes global handler)
        if (e.key === 'b' && !isSearchMode) {
          e.preventDefault();
          e.stopPropagation();
          
          setSelectedTags(['birthday']);
          setIsFocusMode(true);
          return;
        }
        
        if (e.key === 's' && !isSearchMode) {
          e.preventDefault();
          e.stopPropagation();
          
          setIsSearchMode(true);
          setSearchBuffer('');
        } else if (isSearchMode && e.key.length === 1) {
          
          e.preventDefault();
          e.stopPropagation();
          const newBuffer = searchBuffer + e.key;
          
          setSearchBuffer(newBuffer);
          
          // Handle specific search commands
          
          if (newBuffer === 'b') {
            // Show only events with birthday tag (single 'b' command)
            
            setSelectedTags(['birthday']);
            setIsSearchMode(false);
            setSearchBuffer('');
          } else if (newBuffer === 'w') {
            // Show only events with wedding tag (single 'w' command)
            
            setSelectedTags(['wedding']);
            setIsSearchMode(false);
            setSearchBuffer('');
          } else if (newBuffer === 'h') {
            // Show only events with holiday tag (single 'h' command)
            
            setSelectedTags(['holiday']);
            setIsSearchMode(false);
            setSearchBuffer('');
          } else if (newBuffer === 'tr') {
            // Show only events with travel tag (tr command)
            
            setSelectedTags(['travel']);
            setIsSearchMode(false);
            setSearchBuffer('');
          } else if (newBuffer === 'p') {
            // Show only events with purchase tag (single 'p' command)
            
            setSelectedTags(['purchase']);
            setIsSearchMode(false);
            setSearchBuffer('');
          } else if (newBuffer === 'sb') {
            // Show only events with birthday tag (double command)
            
            setSelectedTags(['birthday']);
            setIsSearchMode(false);
            setSearchBuffer('');
          } else if (newBuffer === 'sc') {
            // Clear all filters
            setSelectedTags([]);
            setSearchQuery('');
            setIsSearchMode(false);
            setSearchBuffer('');
          } else if (newBuffer === 'st') {
            // Show today's events
            setShowTodaysEventsOnly(true);
            setIsSearchMode(false);
            setSearchBuffer('');
          } else if (newBuffer === 'sd') {
            // Show deadlines only
            setShowOnlyDeadlines(true);
            setIsSearchMode(false);
            setSearchBuffer('');
          } else if (newBuffer === 'sa') {
            // Show all events (clear filters)
            setSelectedTags([]);
            setSearchQuery('');
            setShowTodaysEventsOnly(false);
            setShowOnlyDeadlines(false);
            setIsSearchMode(false);
            setSearchBuffer('');
          } else if (newBuffer === 'ws') {
            // Show only wedding events
            setSelectedTags(['wedding']);
            setIsSearchMode(false);
            setSearchBuffer('');
          }
        } else if (isSearchMode && e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          setIsSearchMode(false);
          setSearchBuffer('');
        } else if (e.key === 't') {
          e.preventDefault();
          e.stopPropagation();
          setShowTodaysEventsOnly(!showTodaysEventsOnly);
        } else if (e.key === 'f') {
          e.preventDefault();
          e.stopPropagation();
          setIsFocusMode(!isFocusMode);
        } else if (e.key === 'h') {
          e.preventDefault();
          e.stopPropagation();
          window.location.href = '/dashboard';
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          e.stopPropagation();
          setSelectedEventIndex(prev => {
            const newIndex = prev <= 0 ? calendarEvents.length - 1 : prev - 1;
            // Set the selected event when index changes
            if (newIndex >= 0 && newIndex < calendarEvents.length) {
              setSelectedEvent(calendarEvents[newIndex]);
            }
            return newIndex;
          });
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          e.stopPropagation();
          setSelectedEventIndex(prev => {
            const newIndex = prev >= calendarEvents.length - 1 ? 0 : prev + 1;
            // Set the selected event when index changes
            if (newIndex >= 0 && newIndex < calendarEvents.length) {
              setSelectedEvent(calendarEvents[newIndex]);
            }
            return newIndex;
          });
        } else if (e.key === 'Enter' && selectedEvent) {
          e.preventDefault();
          e.stopPropagation();
          
          handleEditEvent(selectedEvent);
        } else if (e.key === 'Enter') {
          
          
          
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
      }, [showTodaysEventsOnly, isFocusMode, isSearchMode, searchBuffer, calendarEvents, selectedEventIndex, selectedEvent]);

  // Auto-clear search mode after 3 seconds of inactivity
  useEffect(() => {
    if (isSearchMode) {
      const timer = setTimeout(() => {
        setIsSearchMode(false);
        setSearchBuffer('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isSearchMode, searchBuffer]);

  // Get all unique tags from events (sorted and in sentence case)
  const { uniqueTags, tagMap } = useMemo(() => {
    const tags = new Set();
    const tagMapInstance = new Map(); // Map sentence case to original tag
    
    allNotes
      .filter(note => note?.content && note.content.includes('meta::event::'))
      .forEach(note => {
        const { tags: eventTags } = getEventDetails(note.content);
        eventTags.forEach(tag => {
          // Convert to sentence case for display
          const sentenceCaseTag = tag.length === 0 ? tag : tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase();
          tags.add(sentenceCaseTag);
          // Map sentence case back to original (use first original encountered)
          if (!tagMapInstance.has(sentenceCaseTag)) {
            tagMapInstance.set(sentenceCaseTag, tag);
          }
        });
      });
    // Sort alphabetically (case-insensitive)
    const sortedTags = Array.from(tags).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    return { uniqueTags: sortedTags, tagMap: tagMapInstance };
  }, [allNotes]);

  // Get unique years from events
  const uniqueYears = useMemo(() => {
    const years = new Set();
    allNotes
      .filter(note => note?.content && note.content.includes('meta::event::'))
      .forEach(note => {
        const { dateTime } = getEventDetails(note.content);
        if (dateTime) {
          years.add(new Date(dateTime).getFullYear());
        }
      });
    return Array.from(years).sort((a, b) => b - a); // Sort years in descending order
  }, [allNotes]);

  // Update filterByNoteId when URL parameter changes (run FIRST to clear filters)
  useEffect(() => {
    console.log('[EventsPage] URL change useEffect triggered:', {
      search: location.search,
      hash: location.hash,
      pathname: location.pathname,
      windowHash: window.location.hash,
      windowSearch: window.location.search,
      currentFilterByNoteId: filterByNoteId,
      timestamp: new Date().toISOString()
    });
    
    // For HashRouter, query params might be in window.location.hash
    // Try location.search first, then window.location.hash, then location.hash
    let noteIdParam = null;
    
    // First check location.search (standard React Router)
    if (location.search) {
      const searchParams = new URLSearchParams(location.search);
      noteIdParam = searchParams.get('note');
      console.log('[EventsPage] NoteId from location.search in useEffect:', noteIdParam);
    }
    
    // If not found, check window.location.hash (HashRouter puts query in hash)
    if (!noteIdParam && window.location.hash) {
      const hashWithQuery = window.location.hash;
      console.log('[EventsPage] Checking window.location.hash in useEffect:', hashWithQuery);
      if (hashWithQuery.includes('?')) {
        const hashParts = hashWithQuery.split('?');
        console.log('[EventsPage] Hash parts from window.location:', hashParts);
        if (hashParts.length > 1) {
          const searchParams = new URLSearchParams(hashParts[1]);
          noteIdParam = searchParams.get('note');
          console.log('[EventsPage] NoteId from window.location.hash in useEffect:', noteIdParam);
        }
      }
    }
    
    // Also check location.hash (backup)
    if (!noteIdParam && location.hash) {
      console.log('[EventsPage] Checking location.hash in useEffect:', location.hash);
      const hashParts = location.hash.split('?');
      console.log('[EventsPage] Hash parts in useEffect:', hashParts);
      if (hashParts.length > 1) {
        const searchParams = new URLSearchParams(hashParts[1]);
        noteIdParam = searchParams.get('note');
        console.log('[EventsPage] NoteId from location.hash in useEffect:', noteIdParam);
      }
    }
    
    console.log('[EventsPage] Final noteIdParam in useEffect:', noteIdParam, 'current filterByNoteId:', filterByNoteId);
    
    if (noteIdParam) {
      console.log('[EventsPage] Clearing filters and setting filterByNoteId to:', noteIdParam);
      // Always clear other filters when filtering by note ID (even if filterByNoteId hasn't changed)
      // This ensures filters are cleared on initial load with note parameter
      setSearchQuery('');
      setSelectedTags([]);
      setSelectedMonth('');
      setSelectedDay('');
      setSelectedYear('');
      setShowOnlyDeadlines(false);
      setShowTodaysEventsOnly(false);
      setExcludePurchases(false);
      if (noteIdParam !== filterByNoteId) {
        console.log('[EventsPage] Updating filterByNoteId from', filterByNoteId, 'to', noteIdParam);
        setFilterByNoteId(noteIdParam);
      } else {
        console.log('[EventsPage] filterByNoteId already set, skipping update');
      }
    } else if (!noteIdParam && filterByNoteId) {
      console.log('[EventsPage] No noteIdParam in URL but filterByNoteId exists:', filterByNoteId);
      // Don't clear filterByNoteId if we just lost the URL param due to HashRouter normalization
      // Only clear if we're explicitly navigating away (pathname changes)
      if (location.pathname === '/events') {
        // Keep the filter active even if URL param is lost
        console.log('[EventsPage] Keeping filterByNoteId since we\'re still on /events');
        
        // Restore the query parameter in the URL if it was lost due to HashRouter normalization
        // Use a ref to prevent infinite loops
        const currentHash = window.location.hash;
        const expectedHash = `#/events?note=${filterByNoteId}`;
        if (currentHash !== expectedHash && !currentHash.includes(`note=${filterByNoteId}`) && !restoringUrlRef.current) {
          console.log('[EventsPage] Restoring query parameter in URL:', expectedHash, 'current:', currentHash);
          restoringUrlRef.current = true;
          // Use setTimeout to avoid infinite loop
          setTimeout(() => {
            if (window.location.hash !== expectedHash && !window.location.hash.includes(`note=${filterByNoteId}`)) {
              navigate(`/events?note=${filterByNoteId}`, { replace: true });
            }
            restoringUrlRef.current = false;
          }, 0);
        }
      } else {
        console.log('[EventsPage] Clearing filterByNoteId - navigating away from /events');
        setFilterByNoteId(null);
      }
    } else if (noteIdParam) {
      // Reset the ref when we successfully read the param from URL
      restoringUrlRef.current = false;
    }
  }, [location.search, location.hash, location.pathname, filterByNoteId, navigate]);
  
  useEffect(() => {
    console.log('[EventsPage] useEffect for getCalendarEvents triggered:', {
      allNotesLength: allNotes?.length || 0,
      searchQuery,
      selectedTags,
      filterByNoteId,
      locationSearch: location.search,
      locationHash: location.hash,
      locationPathname: location.pathname,
      timestamp: new Date().toISOString()
    });
    
    const events = getCalendarEvents();
    console.log('[EventsPage] getCalendarEvents returned', events.length, 'events');
    if (events.length > 0) {
      console.log('[EventsPage] First few events:', events.slice(0, 3).map(e => ({ id: e.id, description: e.description })));
    }
    
    setCalendarEvents(events);
    setTotal(events.length);
    
    // Reset selectedEventIndex when events change to prevent invalid index
    if (selectedEventIndex >= events.length) {
      setSelectedEventIndex(-1);
    }

    // Calculate past events count (skip if filtering by note ID)
    // Check both search and hash for note ID
    let noteIdFromUrl = null;
    if (location.search) {
      const searchParams = new URLSearchParams(location.search);
      noteIdFromUrl = searchParams.get('note');
    }
    if (!noteIdFromUrl && location.hash) {
      const hashParts = location.hash.split('?');
      if (hashParts.length > 1) {
        const searchParams = new URLSearchParams(hashParts[1]);
        noteIdFromUrl = searchParams.get('note');
      }
    }
    if (!noteIdFromUrl && !showOnlyDeadlines) {
      const pastEvents = allNotes
        .filter(note => note?.content && note.content.includes('meta::event::'))
        .filter(note => {
          const { dateTime, description, tags } = getEventDetails(note.content);
          if (!dateTime) return false;
          
          const eventDate = new Date(dateTime);
          const now = new Date();
          const isPast = eventDate < now;

          // Check if event matches current filters
          const matchesSearch = searchQuery === '' || description.toLowerCase().includes(searchQuery.toLowerCase());
          const matchesTags = selectedTags.length === 0 || 
            selectedTags.every(tag => tags.includes(tag));
          
          // Handle purchase filtering
          const isPurchase = tags.some(tag => tag.toLowerCase() === 'purchase');
          const matchesPurchaseFilter = excludePurchases ? !isPurchase : true;
          
          let matchesDate = true;
          if (selectedYear) {
            matchesDate = matchesDate && (eventDate.getFullYear() === parseInt(selectedYear));
          }
          if (selectedMonth) {
            matchesDate = matchesDate && (eventDate.getMonth() + 1 === parseInt(selectedMonth));
          }
          if (selectedDay) {
            matchesDate = matchesDate && (eventDate.getDate() === parseInt(selectedDay));
          }

          return isPast && matchesSearch && matchesTags && matchesDate && matchesPurchaseFilter;
        }).length;
      
      setPastEventsCount(pastEvents);
    } else {
      setPastEventsCount(0);
    }
  }, [allNotes, searchQuery, selectedTags, showOnlyDeadlines, selectedMonth, selectedDay, selectedYear, excludePurchases, filterByNoteId, location.search, location.hash]);

  useEffect(() => {
    console.log('[EventsPage] useEffect for getCalendarEvents triggered:', {
      allNotesLength: allNotes?.length || 0,
      searchQuery,
      selectedTags,
      filterByNoteId,
      locationSearch: location.search,
      locationHash: location.hash,
      locationPathname: location.pathname,
      timestamp: new Date().toISOString()
    });
    
    const calendarEvents = getCalendarEvents();
    console.log('[EventsPage] getCalendarEvents returned', calendarEvents.length, 'events');
    if (calendarEvents.length > 0) {
      console.log('[EventsPage] First few events:', calendarEvents.slice(0, 3).map(e => ({ id: e.id, description: e.description })));
    }
    
    setCalendarEvents(calendarEvents);
    setTotal(calendarEvents.length);
    
    // Reset selectedEventIndex when events change to prevent invalid index
    if (selectedEventIndex >= calendarEvents.length) {
      setSelectedEventIndex(-1);
    }

    // Calculate past events count (skip if filtering by note ID)
    // Check both search and hash for note ID
    let noteIdFromUrl = null;
    if (location.search) {
      const searchParams = new URLSearchParams(location.search);
      noteIdFromUrl = searchParams.get('note');
    }
    if (!noteIdFromUrl && location.hash) {
      const hashParts = location.hash.split('?');
      if (hashParts.length > 1) {
        const searchParams = new URLSearchParams(hashParts[1]);
        noteIdFromUrl = searchParams.get('note');
      }
    }
    if (!noteIdFromUrl && !showOnlyDeadlines) {
      const pastEvents = allNotes
        .filter(note => note?.content && note.content.includes('meta::event::'))
        .filter(note => {
          const { dateTime, description, tags } = getEventDetails(note.content);
          if (!dateTime) return false;
          
          const eventDate = new Date(dateTime);
          const now = new Date();
          const isPast = eventDate < now;

          // Check if event matches current filters
          const matchesSearch = searchQuery === '' || description.toLowerCase().includes(searchQuery.toLowerCase());
          const matchesTags = selectedTags.length === 0 || 
            selectedTags.every(tag => tags.includes(tag));
          
          // Handle purchase filtering
          const isPurchase = tags.some(tag => tag.toLowerCase() === 'purchase');
          const matchesPurchaseFilter = excludePurchases ? !isPurchase : true;
          
          let matchesDate = true;
          if (selectedYear) {
            matchesDate = matchesDate && (eventDate.getFullYear() === parseInt(selectedYear));
          }
          if (selectedMonth) {
            matchesDate = matchesDate && (eventDate.getMonth() + 1 === parseInt(selectedMonth));
          }
          if (selectedDay) {
            matchesDate = matchesDate && (eventDate.getDate() === parseInt(selectedDay));
          }

          return isPast && matchesSearch && matchesTags && matchesDate && matchesPurchaseFilter;
        }).length;
      
      setPastEventsCount(pastEvents);
    } else {
      setPastEventsCount(0);
    }
  }, [allNotes, searchQuery, selectedTags, showOnlyDeadlines, selectedMonth, selectedDay, selectedYear, excludePurchases, filterByNoteId, location.search, location.hash]);

  const getCalendarEvents = () => {
    console.log('[EventsPage] getCalendarEvents called:', {
      search: location.search,
      hash: location.hash,
      pathname: location.pathname,
      filterByNoteId,
      allNotesLength: allNotes?.length || 0
    });
    
    // Always check URL parameter directly first (most reliable)
    // For HashRouter, query params are in location.hash, not location.search
    let noteIdFromUrl = null;
    if (location.search) {
      const searchParams = new URLSearchParams(location.search);
      noteIdFromUrl = searchParams.get('note');
      console.log('[EventsPage] NoteId from location.search in getCalendarEvents:', noteIdFromUrl);
    }
    // Also check hash for HashRouter compatibility
    if (!noteIdFromUrl && location.hash) {
      console.log('[EventsPage] Checking location.hash in getCalendarEvents:', location.hash);
      const hashParts = location.hash.split('?');
      console.log('[EventsPage] Hash parts in getCalendarEvents:', hashParts);
      if (hashParts.length > 1) {
        const searchParams = new URLSearchParams(hashParts[1]);
        noteIdFromUrl = searchParams.get('note');
        console.log('[EventsPage] NoteId from location.hash in getCalendarEvents:', noteIdFromUrl);
      }
    }
    const activeFilterByNoteId = noteIdFromUrl || filterByNoteId;
    
    console.log('[EventsPage] Active filterByNoteId:', {
      noteIdFromUrl,
      filterByNoteId,
      activeFilterByNoteId
    });
    
    // If no notes loaded yet, return empty array
    if (!allNotes || allNotes.length === 0) {
      console.log('[EventsPage] No notes loaded yet, returning empty array');
      return [];
    }
    
    // Filter and group events
    let filteredNotes = allNotes.filter(note => note?.content && note.content.includes('meta::event::'));
    console.log('[EventsPage] Filtered event notes (before note ID filter):', filteredNotes.length);
    
    // If filtering by note ID, return early with just that note
    if (activeFilterByNoteId) {
      console.log('[EventsPage] Filtering by note ID:', activeFilterByNoteId);
      filteredNotes = filteredNotes.filter(note => {
        // Compare both as string and as-is to handle type mismatches
        const matches = String(note.id) === String(activeFilterByNoteId) || note.id === activeFilterByNoteId;
        if (matches) {
          console.log('[EventsPage] Found matching note:', {
            noteId: note.id,
            description: getEventDetails(note.content).description,
            noteIdType: typeof note.id,
            filterIdType: typeof activeFilterByNoteId
          });
        }
        return matches;
      });
      
      console.log('[EventsPage] After note ID filter:', filteredNotes.length, 'notes');
      
      // If no matching note found, return empty (don't show all events)
      if (filteredNotes.length === 0) {
        console.warn('[EventsPage] No matching note found for ID:', activeFilterByNoteId, {
          allEventNoteIds: allNotes
            .filter(note => note?.content && note.content.includes('meta::event::'))
            .slice(0, 10)
            .map(n => ({ id: n.id, type: typeof n.id }))
        });
        return [];
      }
      
      // Prepare events for calendar view (skip all other filters)
      const calendarEvents = filteredNotes.map(note => {
        const { description, dateTime, recurrence, metaDate, nextOccurrence, lastOccurrence, notes } = getEventDetails(note.content);
        return {
          id: note.id,
          description,
          dateTime,
          recurrence,
          metaDate,
          nextOccurrence,
          lastOccurrence,
          notes,
          content: note.content
        };
      });
      console.log('[EventsPage] Returning', calendarEvents.length, 'calendar events for note ID filter');
      return calendarEvents;
    }
    
    // Normal filtering logic when not filtering by note ID
    const filteredEvents = filteredNotes.filter(note => {
        const eventDetails = getEventDetails(note.content);
        const { description, tags, dateTime, recurrence } = eventDetails;
        const matchesSearch = searchQuery === '' || description.toLowerCase().includes(searchQuery.toLowerCase());
        
        // Check if any filter is active
        const hasActiveFilters = searchQuery || selectedTags.length > 0 || selectedYear || selectedMonth || selectedDay;
        
        // Only apply deadline filter if no filters are active
        const matchesDeadline = hasActiveFilters ? true : (!showOnlyDeadlines || note.content.includes('meta::event_deadline'));
        
        // Handle purchase filtering
        const isPurchase = tags.some(tag => tag.toLowerCase() === 'purchase');
        const matchesPurchaseFilter = excludePurchases ? !isPurchase : true;
        
        // Month, day, and year filtering
        let matchesDate = true;
        if (dateTime) {
          const eventDate = new Date(dateTime);
          
          // Filter for today's events when showTodaysEventsOnly is true
          if (showTodaysEventsOnly) {
            const today = new Date();
            const todayDay = today.getDate();
            const todayMonth = today.getMonth();
            const todayYear = today.getFullYear();
            
            // Check if it's a one-time event happening today
            const isOneTimeToday = eventDate.getDate() === todayDay &&
                                  eventDate.getMonth() === todayMonth &&
                                  eventDate.getFullYear() === todayYear;
            
            // Check if it's a recurring event with anniversary today
            let isAnniversaryToday = false;
            
            // For any recurring event (including yearly), check if today's date matches the original event date
            if (recurrence && recurrence !== 'none') {
              const originalEventDay = eventDate.getDate();
              const originalEventMonth = eventDate.getMonth();
              
              // Check if today matches the original event's day and month (anniversary)
              isAnniversaryToday = originalEventDay === todayDay && originalEventMonth === todayMonth;
            }
            
            // Show events that are either happening today OR have an anniversary today
            matchesDate = matchesDate && (isOneTimeToday || isAnniversaryToday);
            
            // Debug logging
            console.log('Filtering event:', {
              description,
              dateTime,
              recurrence,
              eventDate: eventDate.toDateString(),
              today: new Date().toDateString(),
              isOneTimeToday,
              isAnniversaryToday,
              showTodaysEventsOnly
            });
            
            if (isOneTimeToday || isAnniversaryToday) {
              console.log('Today\'s event found:', {
                description,
                dateTime,
                recurrence,
                isOneTimeToday,
                isAnniversaryToday,
                today: new Date().toDateString()
              });
            }
          } else {
            // Apply regular date filters
            if (selectedYear && selectedYear !== '') {
              matchesDate = matchesDate && (eventDate.getFullYear() === parseInt(selectedYear));
            }
            if (selectedMonth && selectedMonth !== '') {
              matchesDate = matchesDate && (eventDate.getMonth() + 1 === parseInt(selectedMonth));
            }
            if (selectedDay && selectedDay !== '') {
              matchesDate = matchesDate && (eventDate.getDate() === parseInt(selectedDay));
            }
          }
        }

        // If no tags are selected, show all events
        if (selectedTags.length === 0) {
          return matchesSearch && matchesDeadline && matchesDate && matchesPurchaseFilter;
        }
        // If tags are selected, show only events that have ALL selected tags
        const matchesTags = selectedTags.every(selectedTag => 
          tags.some(eventTag => eventTag.toLowerCase() === selectedTag.toLowerCase())
        );
        
        // Debug logging for tag filtering
        if (selectedTags.length > 0) {
          console.log('Tag filtering:', {
            description,
            selectedTags,
            eventTags: tags,
            matchesTags,
            hasAllTags: selectedTags.every(selectedTag => 
              tags.some(eventTag => eventTag.toLowerCase() === selectedTag.toLowerCase())
            ),
            eventId: note.id
          });
        }
        
        return matchesSearch && matchesTags && matchesDeadline && matchesDate && matchesPurchaseFilter;
      });

    // Calculate totals for different recurrence types
    const { total, daily, weekly, monthly, none } = filteredEvents.reduce(
      (acc, event) => {
        const { recurrence } = getEventDetails(event.content);
        acc.total++;
        acc[recurrence]++;
        return acc;
      },
      { total: 0, daily: 0, weekly: 0, monthly: 0, none: 0 }
    );
    setTotal(total);
    setDaily(daily);
    setWeekly(weekly);
    setMonthly(monthly);
    setNone(none);

    // Prepare events for calendar view
    const calendarEvents = filteredEvents.map(event => {
      const { description, dateTime, recurrence, metaDate, nextOccurrence, lastOccurrence, notes } = getEventDetails(event.content);
      return {
        id: event.id,
        description,
        dateTime,
        recurrence,
        metaDate,
        nextOccurrence,
        lastOccurrence,
        notes,
        content: event.content
      };
    });
    return calendarEvents;
  };

  const handleDelete = async (eventId) => {
    const deletingEvent = allNotes.find(note => note.id === eventId);
    if (!deletingEvent) return;
    try {
      await deleteNoteById(deletingEvent.id);
      await setAllNotes(allNotes.filter(note => note.id !== deletingEvent.id));
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const handleAcknowledgeEvent = async (eventId, year) => {
    const event = allNotes.find(note => note.id === eventId);
    if (!event) return;

    // Add the acknowledgment meta tag with correct format
    const metaTag = `meta::acknowledged::${year}`;

    // Check if the tag already exists
    if (event.content.includes(metaTag)) {
      return; // Already acknowledged
    }

    // Add the meta tag to the content
    const updatedContent = event.content.trim() + '\n' + metaTag;

    try {
      // Update the note with the new content
      const response = await updateNoteById(eventId, updatedContent);
      setAllNotes(allNotes.map(note =>
        note.id === eventId ? { ...note, content: response.content } : note
      ));
    } catch (error) {
      console.error('Error acknowledging event:', error);
    }
  };

  const handleTagClick = (displayTag) => {
    // Convert displayed tag back to original case for matching
    const originalTag = tagMap?.get(displayTag) || displayTag;
    setSelectedTags(prev => {
      // Check if original tag is already selected (case-insensitive check)
      const isSelected = prev.some(t => t.toLowerCase() === originalTag.toLowerCase());
      if (isSelected) {
        // Remove the tag if it's already selected (remove by original case)
        return prev.filter(t => t.toLowerCase() !== originalTag.toLowerCase());
      } else {
        // Add the original tag if it's not selected
        return [...prev, originalTag];
      }
    });
  };

  const handleEditEvent = (event) => {
    
    
    
    
    
    // Try to find the original note by ID
    let originalNote = allNotes.find(n => n.id === event.id);
    
    // If not found by ID, try to find by content matching
    if (!originalNote && event.content) {
      originalNote = allNotes.find(n => n.content === event.content);
    }
    
    // If still not found, try to find by description matching
    if (!originalNote && event.description) {
      originalNote = allNotes.find(n => {
        const lines = n.content.split('\n');
        const descriptionLine = lines.find(line => line.startsWith('event_description:'));
        const description = descriptionLine ? descriptionLine.replace('event_description:', '').trim() : '';
        return description === event.description;
      });
    }
    
    
    if (originalNote) {
      // Pass the original note directly to the modal
      setEditingEvent(originalNote);
      setShowEditEventModal(true);
    } else {
      
      
    }
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    setEditingEvent(null);
    setShowEditEventModal(true);
  };

  const handleAddEvent = async (content) => {
    try {
      const response = await createNote(content);
      
      setAllNotes(prevNotes => [...prevNotes, response]); // Add the entire response object
      return response;
    } catch (error) {
      console.error('Error adding event:', error);
      throw error;
    }
  };

  const handleBulkCreate = async (expenseList) => {
    try {
      for (const expense of expenseList) {
        // Convert dd/mm/yyyy to YYYY-MM-DDThh:mm format
        const [day, month, year] = expense.date.split('/');
        const eventDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T12:00`;
        const metaDate = new Date(year, month - 1, day).toISOString();
        
        let content = `event_description:${expense.description}
event_date:${eventDate}
event_tags:${expense.tag.join(',')}`;

        if (expense.notes) {
          content += `\nevent_notes:${expense.notes}`;
        }

        // Add value if present
        if (expense.value !== null && expense.value !== undefined && expense.value !== '') {
          content += `\nevent_$:${expense.value}`;
        }

        content += `\nmeta::event::${metaDate}`;
        if (expense.isDeadline) {
          content += '\nmeta::deadline\nmeta::event_deadline';
        }
        
        await handleAddEvent(content);
      }
    } catch (error) {
      console.error('Error bulk creating events:', error);
    }
  };

  const handleEventUpdated = (eventId, updatedContent) => {
    updateNoteById(eventId, updatedContent);
    setAllNotes(prevNotes => prevNotes.map(note => 
      note.id === eventId ? { ...note, content: updatedContent } : note
    ));
  };

  const handleTimelineUpdated = (timelineId, updatedContent) => {
    // Update the timeline note in allNotes to reflect the linked events
    setAllNotes(prevNotes => prevNotes.map(note => 
      note.id === timelineId ? { ...note, content: updatedContent } : note
    ));
    console.log('[EventsPage] Timeline note updated in allNotes:', timelineId);
  };

  // Helper function to check if any filters are active
  const hasActiveFilters = () => {
    return searchQuery || selectedTags.length > 0 || selectedYear || selectedMonth || selectedDay;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">
          Events {isFocusMode && <span className="text-sm font-normal text-gray-500">(Focus Mode)</span>}
          {isSearchMode && (
            <span className="text-sm font-normal text-blue-500 ml-2">
              (Search Mode: {searchBuffer})
            </span>
          )}
        </h1>
        {!isFocusMode && (
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsBulkLoadOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <ArrowUpTrayIcon className="h-5 w-5" />
              <span>Bulk Load</span>
            </button>
            <button
              onClick={() => setIsCompareModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <ArrowsRightLeftIcon className="h-5 w-5" />
              <span>Compare Events</span>
            </button>
            <button
              onClick={() => {
                setEditingEvent(null);
                setSelectedDate(null);
                setShowEditEventModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <PlusIcon className="h-5 w-5" />
              <span>Add Event</span>
            </button>
          </div>
        )}
      </div>

      {/* Search and Tag Filter */}
      {!isFocusMode && (
        <div className="flex flex-col space-y-4">
        <div className="flex flex-col space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onFocus={() => {
                  // When user focuses on search box with existing text, mark that filters should be cleared if they start typing
                  // This handles the case when search is already active and user wants to start new search
                  if (searchQuery.trim() !== '') {
                    shouldClearFiltersRef.current = true;
                  }
                }}
                onChange={(e) => {
                  const newValue = e.target.value;
                  const wasEmpty = searchQuery.trim() === '';
                  const nowHasText = newValue.trim() !== '';
                  const nowEmpty = newValue.trim() === '';
                  
                  // If search is being cleared (had text, now empty), restore saved filters
                  if (!wasEmpty && nowEmpty && savedFiltersRef.current) {
                    restoreFilterState();
                  }
                  
                  // Detect if this is a new search:
                  // 1. Was empty, now has text (starting a new search from empty)
                  // 2. Search was cleared (flag set) and user is typing again
                  if ((wasEmpty && nowHasText) || (shouldClearFiltersRef.current && nowHasText)) {
                    // Save current filter state before clearing
                    saveFilterState();
                    clearAllFilters();
                    shouldClearFiltersRef.current = false; // Reset flag after clearing
                  }
                  
                  setSearchQuery(newValue);
                }}
                className="pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-full"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    // Restore filters when clearing search
                    if (savedFiltersRef.current) {
                      restoreFilterState();
                    }
                    shouldClearFiltersRef.current = true; // Mark that filters should be cleared on next input
                    setSearchQuery('');
                  }}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowOnlyDeadlines(!showOnlyDeadlines)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 w-fit ${
                showOnlyDeadlines
                  ? 'bg-red-100 text-red-700 border border-red-200 hover:bg-red-200'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <FlagIcon className="h-5 w-5" />
              {showOnlyDeadlines ? 'Show All Events' : 'Show Deadlines Only'}
            </button>

            <button
              onClick={() => setShowTodaysEventsOnly(!showTodaysEventsOnly)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 w-fit ${
                showTodaysEventsOnly
                  ? 'bg-green-100 text-green-700 border border-green-200 hover:bg-green-200'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <CalendarIcon className="h-5 w-5" />
              {showTodaysEventsOnly ? 'Show All Events' : 'Show Today\'s Events'}
            </button>

            {/* Exclude Purchases Checkbox */}
            <label className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
              <input
                type="checkbox"
                checked={excludePurchases}
                onChange={(e) => setExcludePurchases(e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
              Exclude Purchases
            </label>

            {/* Year Filter */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <option value="">All Years</option>
              {uniqueYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            {/* Month Filter */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <option value="">All Months</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                <option key={month} value={month}>
                  {new Date(2000, month - 1).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>

            {/* Day Filter */}
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <option value="">All Days</option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Past Events Note */}
        {showOnlyDeadlines && pastEventsCount > 0 && hasActiveFilters() && (
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-md border border-gray-200">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
            <span>
              {pastEventsCount} past event{pastEventsCount !== 1 ? 's' : ''} match{pastEventsCount !== 1 ? '' : 'es'} your filter{pastEventsCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Active Filters Note */}
        {(searchQuery || selectedTags.length > 0 || showOnlyDeadlines || showTodaysEventsOnly || selectedMonth || selectedDay || selectedYear || excludePurchases) && (
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-md border border-gray-200">
            <ListBulletIcon className="h-5 w-5 text-gray-500" />
            <span className="font-medium">Filters Applied:</span>
            <div className="flex flex-wrap gap-2 flex-1">
              {searchQuery && (
                <span className="px-2 py-1 bg-white rounded border text-gray-700">
                  Search: "{searchQuery}"
                </span>
              )}
              {selectedTags.length > 0 && (
                <span className="px-2 py-1 bg-white rounded border text-gray-700">
                  Tags: {selectedTags.map(tag => {
                    // Convert to sentence case for display
                    return tag.length === 0 ? tag : tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase();
                  }).join(', ')}
                </span>
              )}
              {showOnlyDeadlines && (
                <span className="px-2 py-1 bg-white rounded border text-gray-700">
                  Deadlines Only
                </span>
              )}
              {showTodaysEventsOnly && (
                <span className="px-2 py-1 bg-white rounded border text-gray-700">
                  Today's Events Only
                </span>
              )}
              {selectedYear && (
                <span className="px-2 py-1 bg-white rounded border text-gray-700">
                  Year: {selectedYear}
                </span>
              )}
              {selectedMonth && (
                <span className="px-2 py-1 bg-white rounded border text-gray-700">
                  Month: {new Date(2000, selectedMonth - 1).toLocaleString('default', { month: 'long' })}
                </span>
              )}
              {selectedDay && (
                <span className="px-2 py-1 bg-white rounded border text-gray-700">
                  Day: {selectedDay}
                </span>
              )}
              {excludePurchases && (
                <span className="px-2 py-1 bg-white rounded border text-gray-700">
                  Excluding Purchases
                </span>
              )}
            </div>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedTags([]);
                setShowOnlyDeadlines(false);
                setShowTodaysEventsOnly(false);
                setSelectedMonth('');
                setSelectedDay('');
                setSelectedYear('');
                setExcludePurchases(true);
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200 flex items-center gap-2 whitespace-nowrap"
            >
              <XMarkIcon className="h-4 w-4" />
              Clear All Filters
            </button>
          </div>
        )}

        {/* Tag Pills */}
        <div className="flex flex-wrap gap-2 items-center">
          {uniqueTags.map(displayTag => {
            // Get original tag for matching
            const originalTag = tagMap?.get(displayTag) || displayTag;
            // Check if tag is selected (case-insensitive comparison)
            const isSelected = selectedTags.some(t => t.toLowerCase() === originalTag.toLowerCase());
            return (
              <button
                key={displayTag}
                onClick={() => handleTagClick(displayTag)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${isSelected
                    ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                  }`}
              >
                {displayTag}
              </button>
            );
          })}
        </div>
      </div>
      )}

      {!isFocusMode && (
        <div className="grid grid-cols-5 gap-4 bg-white rounded-xl border p-4 shadow-sm">
        <div className="flex flex-col items-center p-3 rounded-lg border transition-all duration-200">
          <div className="text-xs font-medium text-gray-500">Total</div>
          <div className="text-2xl font-bold text-gray-900">{total}</div>
        </div> 
        <div className="flex flex-col items-center p-3 rounded-lg border transition-all duration-200">
          <div className="text-xs font-medium text-indigo-600">Daily</div>
          <div className="text-2xl font-bold text-indigo-700">{daily}</div>
        </div>
        <div className="flex flex-col items-center p-3 rounded-lg border transition-all duration-200">
          <div className="text-xs font-medium text-indigo-600">Weekly</div>
          <div className="text-2xl font-bold text-indigo-700">{weekly}</div>
        </div>
        <div className="flex flex-col items-center p-3 rounded-lg border transition-all duration-200">
          <div className="text-xs font-medium text-indigo-600">Monthly</div>
          <div className="text-2xl font-bold text-indigo-700">{monthly}</div>
        </div>
        <div className="flex flex-col items-center p-3 rounded-lg border transition-all duration-200">
          <div className="text-xs font-medium text-gray-500">One-time</div>
          <div className="text-2xl font-bold text-gray-900">{none}</div>
        </div>
      </div>
      )}

      <div className="bg-white rounded-lg border p-6 shadow-sm">
        <CalendarView
          events={calendarEvents}
          onAcknowledgeEvent={handleAcknowledgeEvent}
          onEventUpdated={handleEventUpdated}
          onTimelineUpdated={handleTimelineUpdated}
          onDateClick={handleDateClick}
          notes={allNotes}
          onDelete={handleDelete}
          onAddEvent={handleAddEvent}
          selectedEventIndex={selectedEventIndex}
          onEventSelect={(index, event) => {
            
            setSelectedEventIndex(index);
            if (event) {
              setSelectedEvent(event);
            }
          }}
          showPastEvents={showPastEvents}
          onShowPastEventsChange={setShowPastEvents}
        />
      </div>

      {/* Add Event Modal */}
      <EditEventModal
        isOpen={showEditEventModal}
        note={editingEvent}
        onSave={(content) => {
          if (editingEvent) {
            handleEventUpdated(editingEvent.id, content);
          } else {
            handleAddEvent(content);
          }
          setShowEditEventModal(false);
          setEditingEvent(null);
          setSelectedDate(null);
        }}
        onCancel={() => {
          setShowEditEventModal(false);
          setEditingEvent(null);
          setSelectedDate(null);
        }}
        onSwitchToNormalEdit={() => {
          if (editingEvent && editingEvent.id) {
            navigate(`/notes?note=${editingEvent.id}`);
          }
          setShowEditEventModal(false);
          setEditingEvent(null);
          setSelectedDate(null);
        }}
        onDelete={(eventId) => {
          setAllNotes(allNotes.filter(note => note.id !== eventId));
          setShowEditEventModal(false);
          setEditingEvent(null);
          setSelectedDate(null);
        }}
        notes={allNotes}
      />

      {/* Compare Events Modal */}
      <CompareEventsModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        events={allNotes.filter(note => note?.content && note.content.includes('meta::event::'))}
      />

      {/* Add BulkLoadExpenses Modal */}
      <BulkLoadExpenses
        isOpen={isBulkLoadOpen}
        onClose={() => setIsBulkLoadOpen(false)}
        onBulkCreate={handleBulkCreate}
      />
    </div>
  );
};

export default EventsPage; 