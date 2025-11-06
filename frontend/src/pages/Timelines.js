import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import moment from 'moment';
import { PlusIcon, XMarkIcon, ArrowTopRightOnSquareIcon, XCircleIcon, ArrowPathIcon, FlagIcon, LinkIcon, MagnifyingGlassIcon, ChevronRightIcon, PhotoIcon, PencilIcon } from '@heroicons/react/24/solid';
import { useNavigate, useLocation } from 'react-router-dom';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import EditEventModal from '../components/EditEventModal';
import { createNote } from '../utils/ApiUtils';
import { addNoteToIndex } from '../utils/SearchUtils';
import { updateNoteById, getNoteById, getTimelines, getTimelineById, getTimelineEvents, getMasterTimelineEvents } from '../utils/ApiUtils';

const Timelines = ({ notes, updateNote, addNote, setAllNotes }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Development-only logging helper
  const devLog = useCallback((...args) => {
    if (process.env.NODE_ENV === 'development') {
      //console.log(...args);
    }
  }, []);
  
  const devWarn = useCallback((...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(...args);
    }
  }, []);
  
  // Cache for parsed timeline data
  const parseTimelineCache = useRef(new Map());
  
  // localStorage keys
  const TIMELINE_COLLAPSE_STORAGE_KEY = 'timeline_collapse_states';
  const TIMELINE_MAIN_SEARCH_KEY = 'timeline_main_search';
  const TIMELINE_SEARCH_QUERIES_KEY = 'timeline_search_queries';
  const TIMELINE_SECTION_COLLAPSE_KEY = 'timeline_section_collapse_states';
  const TIMELINE_SEARCH_TITLES_ONLY_KEY = 'timeline_search_titles_only';

  // Load timeline collapse states from localStorage
  const loadCollapseStates = () => {
    try {
      const savedStates = localStorage.getItem(TIMELINE_COLLAPSE_STORAGE_KEY);
      if (savedStates) {
        const parsedStates = JSON.parse(savedStates);
        return new Set(parsedStates);
      }
    } catch (error) {
      console.error('Error loading timeline collapse states:', error);
    }
    return new Set();
  };

  // Load section collapse states from localStorage
  const loadSectionCollapseStates = () => {
    try {
      const savedStates = localStorage.getItem(TIMELINE_SECTION_COLLAPSE_KEY);
      if (savedStates) {
        const parsedStates = JSON.parse(savedStates);
        return new Set(parsedStates);
      }
    } catch (error) {
      console.error('Error loading section collapse states:', error);
    }
    return new Set();
  };

  // Load main search query from localStorage
  const loadMainSearchQuery = () => {
    try {
      const saved = localStorage.getItem(TIMELINE_MAIN_SEARCH_KEY);
      return saved || '';
    } catch (error) {
      console.error('Error loading main search query:', error);
      return '';
    }
  };

  // Load timeline search queries from localStorage
  const loadTimelineSearchQueries = () => {
    try {
      const saved = localStorage.getItem(TIMELINE_SEARCH_QUERIES_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading timeline search queries:', error);
    }
    return {};
  };

  // Load search titles only setting from localStorage
  const loadSearchTitlesOnly = () => {
    try {
      const saved = localStorage.getItem(TIMELINE_SEARCH_TITLES_ONLY_KEY);
      return saved === 'true';
    } catch (error) {
      console.error('Error loading search titles only setting:', error);
      return false;
    }
  };

  // Initialize state with saved collapse states
  const [timelineNotes, setTimelineNotes] = useState([]);
  const [loadingTimelines, setLoadingTimelines] = useState(true);
  const [timelineEventsCache, setTimelineEventsCache] = useState({}); // { timelineId: { events, timelineData } }
  const [showAddEventForm, setShowAddEventForm] = useState(null);
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [editingTimelineId, setEditingTimelineId] = useState(null);
  const [editingEventId, setEditingEventId] = useState(null);
  const [convertingEvent, setConvertingEvent] = useState(null); // { event, timelineId, timelineNote }
  const [newEventText, setNewEventText] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [searchQuery, setSearchQuery] = useState(() => loadMainSearchQuery());
  const [searchTitlesOnly, setSearchTitlesOnly] = useState(() => loadSearchTitlesOnly());
  const [showNewTimelineForm, setShowNewTimelineForm] = useState(false);
  const [newTimelineTitle, setNewTimelineTitle] = useState('');
  // Ref to store newly created event note for immediate refresh
  const newEventNoteRef = useRef(null);
  // State to store newly created event note - persists across renders
  const [pendingNewEventNote, setPendingNewEventNote] = useState(null);
  // Ref to track how many times we've seen the new event in notes prop
  const newEventSeenCountRef = useRef(0);
  // Initialize with saved states from localStorage
  // Use a function to ensure it loads on mount
  const [collapsedTimelines, setCollapsedTimelines] = useState(() => {
    const saved = loadCollapseStates();
    //console.log('[Timelines] Initial state from localStorage:', Array.from(saved));
    return saved;
  });
  const [selectedEvents, setSelectedEvents] = useState({}); // { timelineId: [event1, event2] }
  const [unlinkConfirmation, setUnlinkConfirmation] = useState({ isOpen: false, timelineId: null, eventId: null });
  const [deleteEventConfirmation, setDeleteEventConfirmation] = useState({ isOpen: false, timelineId: null, eventIndex: null, eventName: null });
  const [addLinkModal, setAddLinkModal] = useState({ isOpen: false, timelineId: null, eventIndex: null, currentLink: '' });
  const [linkEventModal, setLinkEventModal] = useState({ isOpen: false, timelineId: null, searchQuery: '', selectedEventId: null });
  const [timelineSearchQueries, setTimelineSearchQueries] = useState(() => loadTimelineSearchQueries()); // { timelineId: searchQuery }
  const [collapsedSections, setCollapsedSections] = useState(() => loadSectionCollapseStates()); // Set of collapsed section names: 'flagged', 'open', 'closed'
  const [showMasterTimelineModal, setShowMasterTimelineModal] = useState(false);
  const [masterTimelineModalSearchQuery, setMasterTimelineModalSearchQuery] = useState('');
  const [masterTimelineYear, setMasterTimelineYear] = useState(new Date().getFullYear());
  const [masterTimelineMonth, setMasterTimelineMonth] = useState('all');
  const [showTimelineDropdown, setShowTimelineDropdown] = useState(false);
  const [compareModal, setCompareModal] = useState({ isOpen: false, sourceEvent: null, sourceTimelineId: null, filterQuery: '' });
  const [focusOnNotesField, setFocusOnNotesField] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Save timeline collapse states to localStorage
  const saveCollapseStates = (collapsedSet) => {
    try {
      const statesArray = Array.from(collapsedSet);
      localStorage.setItem(TIMELINE_COLLAPSE_STORAGE_KEY, JSON.stringify(statesArray));
    } catch (error) {
      console.error('Error saving timeline collapse states:', error);
    }
  };

  // Save section collapse states to localStorage
  const saveSectionCollapseStates = (collapsedSet) => {
    try {
      const statesArray = Array.from(collapsedSet);
      localStorage.setItem(TIMELINE_SECTION_COLLAPSE_KEY, JSON.stringify(statesArray));
    } catch (error) {
      console.error('Error saving section collapse states:', error);
    }
  };

  // Restore collapse states and search queries when navigating to timelines page
  // This effect runs when navigating back to /timelines to restore saved states
  useEffect(() => {
    if (location.pathname === '/timelines') {
      const savedStates = loadCollapseStates();
      devLog('[Timelines] Pathname changed to /timelines, saved states:', Array.from(savedStates));
      // Always restore from localStorage when navigating to /timelines
      // This ensures the state is persisted across page navigation
      setCollapsedTimelines(savedStates);
      devLog('[Timelines] Restored collapse states from localStorage:', Array.from(savedStates));
      
      // Restore section collapse states
      const savedSectionStates = loadSectionCollapseStates();
      setCollapsedSections(savedSectionStates);
      devLog('[Timelines] Restored section collapse states from localStorage:', Array.from(savedSectionStates));
      
      // Restore search queries
      const savedMainSearch = loadMainSearchQuery();
      const savedTimelineSearches = loadTimelineSearchQueries();
      const savedSearchTitlesOnly = loadSearchTitlesOnly();
      setSearchQuery(savedMainSearch);
      setTimelineSearchQueries(savedTimelineSearches);
      setSearchTitlesOnly(savedSearchTitlesOnly);
      devLog('[Timelines] Restored search queries from localStorage:', { main: savedMainSearch, timeline: savedTimelineSearches, titlesOnly: savedSearchTitlesOnly });
    }
  }, [location.pathname]);

  // Load timelines from API
  useEffect(() => {
    const loadTimelines = async () => {
      try {
        setLoadingTimelines(true);
        const params = {
          search: searchQuery || undefined,
          searchTitlesOnly: searchTitlesOnly ? 'true' : undefined
        };
        const response = await getTimelines(params);
        setTimelineNotes(response.timelines || []);
      } catch (error) {
        console.error('Error loading timelines:', error);
      } finally {
        setLoadingTimelines(false);
      }
    };
    
    loadTimelines();
  }, [searchQuery, searchTitlesOnly]);

  // Load timeline events when a timeline is expanded
  const loadTimelineEvents = useCallback(async (timelineId) => {
    // Check if already cached
    if (timelineEventsCache[timelineId]) {
      return timelineEventsCache[timelineId];
    }
    
    try {
      // Fetch timeline details and events
      const [timelineData, eventsData] = await Promise.all([
        getTimelineById(timelineId),
        getTimelineEvents(timelineId, timelineSearchQueries[timelineId] || '')
      ]);
      
      // Convert dates to moment objects for compatibility
      const eventsWithMoments = eventsData.events.map(event => ({
        ...event,
        date: event.date ? moment(event.date) : null
      }));
      
      const cachedData = {
        timelineData,
        events: eventsWithMoments
      };
      
      setTimelineEventsCache(prev => ({
        ...prev,
        [timelineId]: cachedData
      }));
      
      return cachedData;
    } catch (error) {
      console.error(`Error loading timeline events for ${timelineId}:`, error);
      return null;
    }
  }, [timelineEventsCache, timelineSearchQueries]);

  // Clear cache when timeline search changes
  useEffect(() => {
    // Clear cache when search queries change
    setTimelineEventsCache({});
  }, [Object.keys(timelineSearchQueries).join(',')]);

  // Clear cache when a timeline is updated
  const refreshTimeline = useCallback(async (timelineId) => {
    // Remove from cache to force reload
    setTimelineEventsCache(prev => {
      const updated = { ...prev };
      delete updated[timelineId];
      return updated;
    });
    
    // Reload timeline list
    try {
      const params = {
        search: searchQuery || undefined,
        searchTitlesOnly: searchTitlesOnly ? 'true' : undefined
      };
      const response = await getTimelines(params);
      setTimelineNotes(response.timelines || []);
    } catch (error) {
      console.error('Error refreshing timelines:', error);
    }
  }, [searchQuery, searchTitlesOnly]);

  // Extract dollar values from text
  const extractDollarValues = (text) => {
    // Match various dollar formats: $123, $123.45, $1,234.56, etc.
    const dollarRegex = /\$[\d,]+(?:\.\d{2})?/g;
    const matches = text.match(dollarRegex);
    if (!matches) return [];
    
    return matches.map(match => {
      // Remove $ and commas, then parse as float
      const value = parseFloat(match.replace(/[$,]/g, ''));
      return isNaN(value) ? 0 : value;
    });
  };

  // Helper function to get notes array including any new event note from ref or state
  const getNotesWithNewEvent = useCallback(() => {
    // Check ref first (most up-to-date)
    const newEventNoteFromRef = newEventNoteRef.current;
    // Fall back to state if ref is cleared
    const newEventNote = newEventNoteFromRef || pendingNewEventNote;
    
    if (newEventNote && !notes.find(n => n.id === newEventNote.id)) {
      // Only log occasionally to avoid spam
      if (Math.random() < 0.01) {
        devLog('[Timelines] getNotesWithNewEvent: Including new event note:', newEventNote.id, 'from:', newEventNoteFromRef ? 'ref' : 'state');
      }
      return [...notes, newEventNote];
    }
    return notes;
  }, [notes, pendingNewEventNote]);

  // Highlight dollar values in text with green color
  const highlightDollarValues = (text) => {
    if (!text) return text;
    
    // Match various dollar formats: $123, $123.45, $1,234.56, etc.
    const dollarRegex = /\$[\d,]+(?:\.\d{2})?/g;
    
    return text.replace(dollarRegex, (match) => {
      return `<span class="text-emerald-600 font-semibold">${match}</span>`;
    });
  };

  // Truncate text to max length and add ellipsis
  const truncateText = (text, maxLength = 50) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Format event header: extract dollar amounts and align them after 55th character
  const formatEventHeaderWithAmount = (text) => {
    if (!text) {
      return { text: '', description: '', amount: '', hasAmount: false };
    }
    
    // Extract all dollar amounts from the text
    const dollarRegex = /\$[\d,]+(?:\.\d{2})?/g;
    const dollarMatches = text.match(dollarRegex) || [];
    
    if (dollarMatches.length === 0) {
      // No dollar amounts, just truncate normally
      const truncated = truncateText(text, 55);
      return { text: truncated, description: truncated, amount: '', hasAmount: false };
    }
    
    // Remove dollar amounts from the text for description
    let description = text;
    dollarMatches.forEach(match => {
      description = description.replace(match, '').trim();
    });
    // Clean up any extra spaces
    description = description.replace(/\s+/g, ' ').trim();
    
    // Truncate description to 55 characters
    const truncatedDescription = truncateText(description, 55);
    
    // Combine all dollar amounts (in case there are multiple)
    const totalAmount = dollarMatches.reduce((sum, match) => {
      const value = parseFloat(match.replace(/[$,]/g, ''));
      return sum + (isNaN(value) ? 0 : value);
    }, 0);
    
    // Format the total amount
    const formattedAmount = totalAmount > 0 ? `$${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '';
    
    // Calculate padding to align amounts at the same position (after 55th character)
    // Use monospace-friendly approach: calculate needed spaces
    const descriptionLength = truncatedDescription.length;
    const paddingNeeded = Math.max(0, 55 - descriptionLength);
    // Use non-breaking spaces for better alignment, or regular spaces
    const padding = ' '.repeat(paddingNeeded);
    
    return {
      text: truncatedDescription + padding + formattedAmount,
      description: truncatedDescription,
      amount: formattedAmount,
      hasAmount: formattedAmount !== ''
    };
  };

  // Handle event selection
  const handleEventClick = (timelineId, eventIndex) => {
    setSelectedEvents(prev => {
      const current = prev[timelineId] || [];
      
      // If already selected, deselect it
      if (current.includes(eventIndex)) {
        const filtered = current.filter(idx => idx !== eventIndex);
        return { ...prev, [timelineId]: filtered.length > 0 ? filtered : undefined };
      }
      
      // If already 2 selected, replace the first with the new one
      if (current.length >= 2) {
        return { ...prev, [timelineId]: [current[1], eventIndex] };
      }
      
      // Add to selection
      return { ...prev, [timelineId]: [...current, eventIndex] };
    });
  };

  // Check if an event is selected
  const isEventSelected = (timelineId, eventIndex) => {
    const selected = selectedEvents[timelineId] || [];
    return selected.includes(eventIndex);
  };

  // Calculate difference between two dates
  const calculateDateDifference = (date1, date2) => {
    const moment1 = moment(date1);
    const moment2 = moment(date2);
    
    const years = moment2.diff(moment1, 'years');
    const months = moment2.diff(moment1, 'months') % 12;
    const days = moment2.diff(moment1, 'days') % 30;
    
    const parts = [];
    if (years > 0) parts.push(`${years} year${years !== 1 ? 's' : ''}`);
    if (months > 0) parts.push(`${months} month${months !== 1 ? 's' : ''}`);
    if (days > 0 || parts.length === 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
    
    return parts.join(', ');
  };

  // Fuzzy search function for events
  const fuzzySearch = (text, query) => {
    if (!query || !query.trim()) return true;
    
    const normalizedText = text.toLowerCase().trim();
    const normalizedQuery = query.toLowerCase().trim();
    
    // Exact match
    if (normalizedText.includes(normalizedQuery)) return true;
    
    // Fuzzy match: check if all characters in query appear in order in text
    let textIndex = 0;
    for (let i = 0; i < normalizedQuery.length; i++) {
      const char = normalizedQuery[i];
      const foundIndex = normalizedText.indexOf(char, textIndex);
      if (foundIndex === -1) return false;
      textIndex = foundIndex + 1;
    }
    return true;
  };

  // Filter events based on search query
  const filterEventsBySearch = (events, searchQuery) => {
    if (!searchQuery || !searchQuery.trim()) return events;
    
    return events.filter(event => {
      if (!event.event) return false;
      const eventText = typeof event.event === 'string' ? event.event : String(event.event);
      return fuzzySearch(eventText, searchQuery);
    });
  };

  // Update search query for a timeline
  const handleTimelineSearchChange = (timelineId, query) => {
    setTimelineSearchQueries(prev => {
      const updated = {
        ...prev,
        [timelineId]: query
      };
      // Save to localStorage
      try {
        localStorage.setItem(TIMELINE_SEARCH_QUERIES_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error('Error saving timeline search queries:', error);
      }
      return updated;
    });
  };

  // Save main search query to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(TIMELINE_MAIN_SEARCH_KEY, searchQuery);
    } catch (error) {
      console.error('Error saving main search query:', error);
    }
  }, [searchQuery]);

  // Save search titles only setting to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(TIMELINE_SEARCH_TITLES_ONLY_KEY, searchTitlesOnly.toString());
    } catch (error) {
      console.error('Error saving search titles only setting:', error);
    }
  }, [searchTitlesOnly]);

  // Save timeline collapse states to localStorage whenever they change
  // This ensures collapse state is always tracked, even when there's no search query
  useEffect(() => {
    if (timelineNotes.length > 0) {
      try {
        saveCollapseStates(collapsedTimelines);
        devLog('[Timelines] Saved collapse states to localStorage:', Array.from(collapsedTimelines));
      } catch (error) {
        console.error('Error saving collapse states:', error);
      }
    }
  }, [collapsedTimelines, timelineNotes.length]);

  // Parse timeline data from note content (with caching)
  const parseTimelineData = useCallback((content, allNotes = []) => {
    if (!content || typeof content !== 'string') {
      return {
        timeline: '',
        events: [],
        isClosed: false,
        totalDollarAmount: 0
      };
    }
    
    // Create cache key based on content and note IDs
    const notesKey = allNotes.map(n => `${n.id}:${n.content?.substring(0, 50) || ''}`).join('|');
    const cacheKey = `${content}_${notesKey}`;
    
    // Check cache first
    if (parseTimelineCache.current.has(cacheKey)) {
      return parseTimelineCache.current.get(cacheKey);
    }
    
    const lines = content.split('\n');
    const timelineData = {
      timeline: '',
      events: [],
      isClosed: false,
      totalDollarAmount: 0
    };
    
    // Check if timeline is closed
    timelineData.isClosed = lines.some(line => line.trim() === 'Closed');
    
    // Get content lines (non-meta lines, excluding 'Closed')
    const contentLines = lines.filter(line => 
      !line.trim().startsWith('meta::') && line.trim() !== '' && line.trim() !== 'Closed'
    );
    
    // First line is the title
    if (contentLines.length > 0) {
      timelineData.timeline = contentLines[0].trim();
    }
    
    // Parse events from remaining content lines (skip first line which is title)
    contentLines.slice(1).forEach((line, index) => {
      const trimmedLine = line.trim();
      if (trimmedLine) {
        // Try to parse event:date:link format (link is optional)
        const eventMatch = trimmedLine.match(/^(.+?)\s*:\s*(.+)$/);
        if (eventMatch) {
          const [, event, rest] = eventMatch;
          
          // Check if there's a link after the date (format: date:link)
          const dateLinkMatch = rest.match(/^(.+?)\s*:\s*(.+)$/);
          let dateStr, link;
          
          if (dateLinkMatch) {
            // Format: event:date:link
            dateStr = dateLinkMatch[1].trim();
            link = dateLinkMatch[2].trim();
          } else {
            // Format: event:date
            dateStr = rest.trim();
            link = null;
          }
          
          // Extract dollar values from the event text
          const dollarValues = extractDollarValues(event);
          const eventDollarAmount = dollarValues.reduce((sum, value) => sum + value, 0);
          
          // Force DD/MM/YYYY parsing by manually splitting the date
          const dateParts = dateStr.split('/');
          let parsedDate;
          
          if (dateParts.length === 3) {
            // Assume DD/MM/YYYY format
            const day = parseInt(dateParts[0], 10);
            const month = parseInt(dateParts[1], 10) - 1; // moment.js months are 0-indexed
            const year = parseInt(dateParts[2], 10);
            parsedDate = moment([year, month, day]);
          } else {
            // Fallback to moment parsing
            parsedDate = moment(dateStr, 'DD/MM/YYYY', true);
            if (!parsedDate.isValid()) {
              parsedDate = moment(dateStr, ['DD-MM-YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'], true);
            }
          }
          if (parsedDate.isValid()) {
            timelineData.events.push({
              event: event.trim(),
              date: parsedDate,
              dateStr: dateStr.trim(),
              lineIndex: index + 1, // +1 because we skipped the title line
              dollarAmount: eventDollarAmount,
              link: link || null
            });
          } else {
            // If not a valid date, treat as event without date
            timelineData.events.push({
              event: trimmedLine,
              date: null,
              dateStr: '',
              lineIndex: index + 1,
              dollarAmount: eventDollarAmount,
              link: null
            });
          }
        } else {
          // If no colon found, treat as event without date
          const dollarValues = extractDollarValues(trimmedLine);
          const eventDollarAmount = dollarValues.reduce((sum, value) => sum + value, 0);
          
          timelineData.events.push({
            event: trimmedLine,
            date: null,
            dateStr: '',
            lineIndex: index + 1,
            dollarAmount: eventDollarAmount,
            link: null
          });
        }
      }
    });
    
    // Process linked events from meta::linked_from_events
    // Find ALL meta::linked_from_events:: lines and collect all event IDs
    const allLinkedEventIds = new Set();
    
    lines.forEach(line => {
      if (line.trim().startsWith('meta::linked_from_events::')) {
        const eventIdsString = line.replace('meta::linked_from_events::', '').trim();
        const eventIds = eventIdsString.split(',').map(id => id.trim()).filter(id => id);
        eventIds.forEach(id => allLinkedEventIds.add(id));
      }
    });
    
    // Process all linked event IDs
    if (allLinkedEventIds.size > 0 && allNotes.length > 0) {
      Array.from(allLinkedEventIds).forEach(eventId => {
        const linkedEventNote = allNotes.find(note => note.id === eventId);
        if (!linkedEventNote) {
          devWarn(`[Timelines] Linked event note not found: ${eventId}`, {
            eventId,
            allNotesLength: allNotes.length,
            allNotesIds: allNotes.map(n => n.id).slice(0, 10)
          });
          return;
        }
        if (!linkedEventNote.content) {
          devWarn(`[Timelines] Linked event note has no content: ${eventId}`);
          return;
        }
        const eventLines = linkedEventNote.content.split('\n');
        
        // Extract event description
        const descriptionLine = eventLines.find(line => line.startsWith('event_description:'));
        let description = descriptionLine ? descriptionLine.replace('event_description:', '').trim() : '';
        
        // Extract event date
        const dateLine = eventLines.find(line => line.startsWith('event_date:'));
        const eventDate = dateLine ? dateLine.replace('event_date:', '').trim() : '';
        
        // Extract event notes (can be multi-line)
        const notesLineIndex = eventLines.findIndex(line => line.startsWith('event_notes:'));
        let eventNotes = '';
        if (notesLineIndex !== -1) {
          const notesParts = [];
          // Get the content after 'event_notes:' on the first line
          const firstLine = eventLines[notesLineIndex];
          const firstLineContent = firstLine.replace('event_notes:', '').trim();
          if (firstLineContent) {
            notesParts.push(firstLineContent);
          }
          
          // Collect subsequent lines until we hit another field
          for (let i = notesLineIndex + 1; i < eventLines.length; i++) {
            const line = eventLines[i];
            // Stop if we hit another field (event_* or meta::)
            if (line.startsWith('event_') || line.startsWith('meta::')) {
              break;
            }
            // Add the line to notes (even if it's empty, preserve structure)
            notesParts.push(line);
          }
          
          // Join all lines, preserving newlines
          eventNotes = notesParts.join('\n').trim();
        }
        
        // Check if this is a purchase (has event_$: line)
        const priceLine = eventLines.find(line => line.trim().startsWith('event_$:'));
        if (priceLine) {
          const priceValue = priceLine.replace('event_$:', '').trim();
          // Append the price to the description header
          if (priceValue) {
            description = description ? `${description} $${priceValue}` : `$${priceValue}`;
          }
        }
        
        if (!description) {
          devWarn(`[Timelines] Linked event has no description: ${eventId}`, {
            eventId,
            contentPreview: linkedEventNote.content.substring(0, 200)
          });
        }
        if (!eventDate) {
          devWarn(`[Timelines] Linked event has no date: ${eventId}`, {
            eventId,
            contentPreview: linkedEventNote.content.substring(0, 200)
          });
        }
        
        if (description && eventDate) {
          // Parse the event date (ISO format)
          const parsedEventDate = moment(eventDate);
          
          if (!parsedEventDate.isValid()) {
            devWarn(`[Timelines] Linked event has invalid date: ${eventId}`, {
              eventId,
              eventDate,
              parsedDate: parsedEventDate
            });
            return;
          }
          
          // Extract dollar values from the event description
          const dollarValues = extractDollarValues(description);
          const eventDollarAmount = dollarValues.reduce((sum, value) => sum + value, 0);
          
          console.log(`[Timelines] Adding linked event to timeline: ${eventId}`, {
            eventId,
            description,
            eventDate,
            parsedDate: parsedEventDate.format('YYYY-MM-DD'),
            dollarAmount: eventDollarAmount,
            notes: eventNotes,
            hasNotes: !!eventNotes
          });
          
          timelineData.events.push({
            event: description,
            date: parsedEventDate,
            dateStr: parsedEventDate.format('DD/MM/YYYY'),
            lineIndex: -1, // Virtual event from linked note
            dollarAmount: eventDollarAmount,
            isLinkedEvent: true,
            linkedEventId: eventId,
            link: null, // Linked events don't have links in timeline format
            notes: eventNotes || null // Include notes if available
          });
        } else {
          devWarn(`[Timelines] Linked event missing required fields: ${eventId}`, {
            eventId,
            hasDescription: !!description,
            hasDate: !!eventDate,
            contentPreview: linkedEventNote.content.substring(0, 300)
          });
        }
      });
    }
    
    // Calculate total dollar amount
    timelineData.totalDollarAmount = timelineData.events.reduce((sum, event) => sum + (event.dollarAmount || 0), 0);
    
    // Cache the result
    parseTimelineCache.current.set(cacheKey, timelineData);
    
    // Limit cache size to prevent memory issues
    if (parseTimelineCache.current.size > 100) {
      const firstKey = parseTimelineCache.current.keys().next().value;
      parseTimelineCache.current.delete(firstKey);
    }
    
    return timelineData;
  }, [devLog, devWarn]);

  // Calculate time differences between events
  const calculateTimeDifferences = (events, isClosed = false, totalDollarAmount = 0) => {
    if (events.length === 0) return events;
    
    // Sort events by date first (events without dates go to the end)
    const sortedEvents = [...events].sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.diff(b.date);
    });
    
    let eventsWithDiffs = [...sortedEvents];
    
    // Add total dollar amount as last event if there are dollar values
    if (totalDollarAmount > 0) {
      const totalDollarEvent = {
        event: `Total: $${totalDollarAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        date: null,
        dateStr: '',
        lineIndex: -1, // Virtual event
        isVirtual: true,
        isTotal: true
      };
      eventsWithDiffs = [...eventsWithDiffs, totalDollarEvent];
    }
    
    if (!isClosed) {
      const today = moment();
      
      // Separate past and future events
      const pastEvents = sortedEvents.filter(e => e.date && e.date.isBefore(today));
      const futureEvents = sortedEvents.filter(e => e.date && e.date.isSameOrAfter(today));
      
      eventsWithDiffs = [...pastEvents];
      
      // Add "Today" as a virtual event marker
      const todayEvent = {
        event: 'Today',
        date: today,
        dateStr: today.format('DD/MM/YYYY'),
        lineIndex: -1, // Virtual event
        isVirtual: true,
        isToday: true
      };
      eventsWithDiffs.push(todayEvent);
      
      // Add future events after "Today"
      if (futureEvents.length > 0) {
        eventsWithDiffs = [...eventsWithDiffs, ...futureEvents];
      }
    } else {
      // For closed timelines, add total duration as final event
      if (sortedEvents.length > 0 && sortedEvents[0].date) {
        const startDate = sortedEvents[0].date;
        const lastEvent = sortedEvents[sortedEvents.length - 1];
        
        if (lastEvent.date) {
          const totalDuration = calculateDuration(startDate, lastEvent.date);
          const durationEvent = {
            event: `Total Duration: ${totalDuration}`,
            date: lastEvent.date,
            dateStr: lastEvent.dateStr,
            lineIndex: -1, // Virtual event
            isVirtual: true,
            isDuration: true
          };
          eventsWithDiffs = [...eventsWithDiffs, durationEvent];
        }
      }
    }
    
    const startDate = eventsWithDiffs[0].date;
    
    for (let i = 1; i < eventsWithDiffs.length; i++) {
      const currentEvent = eventsWithDiffs[i];
      const previousEvent = eventsWithDiffs[i - 1];
      
      if (currentEvent.date && previousEvent.date) {
        const daysDiff = currentEvent.date.diff(previousEvent.date, 'days');
        currentEvent.daysFromPrevious = daysDiff;
      }
      
      if (currentEvent.date && startDate) {
        const totalDays = currentEvent.date.diff(startDate, 'days');
        currentEvent.daysFromStart = totalDays;
      }
    }
    
    return eventsWithDiffs;
  };

  // Calculate duration in Years/Months/Days format
  const calculateDuration = (startDate, endDate) => {
    const years = endDate.diff(startDate, 'years');
    const months = endDate.diff(startDate.clone().add(years, 'years'), 'months');
    const days = endDate.diff(startDate.clone().add(years, 'years').add(months, 'months'), 'days');
    
    let duration = '';
    if (years > 0) duration += `${years} year${years !== 1 ? 's' : ''}`;
    if (months > 0) {
      if (duration) duration += ', ';
      duration += `${months} month${months !== 1 ? 's' : ''}`;
    }
    if (days > 0) {
      if (duration) duration += ', ';
      duration += `${days} day${days !== 1 ? 's' : ''}`;
    }
    
    return duration || '0 days';
  };

  // Calculate age from event date to today
  const calculateAge = (eventDate) => {
    if (!eventDate) return null;
    
    const today = moment();
    const isFuture = eventDate.isAfter(today);
    
    if (isFuture) {
      // For future events, show "in X time"
      const years = eventDate.diff(today, 'years');
      const months = eventDate.diff(today.clone().add(years, 'years'), 'months');
      const days = eventDate.diff(today.clone().add(years, 'years').add(months, 'months'), 'days');
      
      let age = '';
      if (years > 0) age += `${years} year${years !== 1 ? 's' : ''}`;
      if (months > 0) {
        if (age) age += ', ';
        age += `${months} month${months !== 1 ? 's' : ''}`;
      }
      if (days > 0) {
        if (age) age += ', ';
        age += `${days} day${days !== 1 ? 's' : ''}`;
      }
      
      return `in ${age || '0 days'}`;
    } else {
      // For past events, show age
      const years = today.diff(eventDate, 'years');
      const months = today.diff(eventDate.clone().add(years, 'years'), 'months');
      const days = today.diff(eventDate.clone().add(years, 'years').add(months, 'months'), 'days');
      
      const parts = [];
      if (years > 0) {
        parts.push(`${years} year${years !== 1 ? 's' : ''}`);
      }
      if (months > 0) {
        parts.push(`${months} month${months !== 1 ? 's' : ''}`);
      }
      if (days > 0 || parts.length === 0) {
        parts.push(`${days} day${days !== 1 ? 's' : ''}`);
      }
      
      return `${parts.join(' ')} old`;
    }
  };

  // Handle navigation to notes page filtered by note ID
  const handleViewNote = (noteId) => {
    navigate(`/notes?note=${noteId}`);
  };

  const handleCloseTimeline = async (noteId) => {
    try {
      const note = notes.find(n => n.id === noteId);
      if (!note) return;

      const lines = note.content.split('\n');
      const newContent = lines.concat('Closed').join('\n');
      
      await updateNote(noteId, newContent);
      
      // Refresh the timeline notes by re-parsing all notes
      const timelineNotes = notes
        .filter(note => note.content && note.content.includes('meta::timeline'))
        .map(note => {
          const timelineData = parseTimelineData(note.content, notes);
          return {
            ...note,
            ...timelineData,
            isFlagged: note.content.includes('meta::flagged_timeline'),
            isTracked: note.content.includes('meta::tracked')
          };
        });
      setTimelineNotes(timelineNotes);
    } catch (error) {
      console.error('Error closing timeline:', error);
    }
  };

  const handleReopenTimeline = async (noteId) => {
    try {
      const note = notes.find(n => n.id === noteId);
      if (!note) return;

      const lines = note.content.split('\n');
      const newContent = lines.filter(line => line.trim() !== 'Closed').join('\n');
      
      await updateNote(noteId, newContent);
      
      // Refresh the timeline notes by re-parsing all notes
      const timelineNotes = notes
        .filter(note => note.content && note.content.includes('meta::timeline'))
        .map(note => {
          const timelineData = parseTimelineData(note.content, notes);
          return {
            ...note,
            ...timelineData,
            isFlagged: note.content.includes('meta::flagged_timeline'),
            isTracked: note.content.includes('meta::tracked')
          };
        });
      setTimelineNotes(timelineNotes);
    } catch (error) {
      console.error('Error reopening timeline:', error);
    }
  };

  // Handle tracking a timeline
  const handleToggleTracked = async (noteId) => {
    try {
      const note = notes.find(n => n.id === noteId);
      if (!note) return;

      const hasTracked = note.content.includes('meta::tracked');
      let newContent;
      
      if (hasTracked) {
        // Remove tracked tag
        newContent = note.content.replace('\nmeta::tracked', '');
      } else {
        // Add tracked tag
        newContent = note.content.trim() + '\nmeta::tracked';
      }
      
      await updateNote(noteId, newContent);
      
      // Refresh the timeline notes by re-parsing all notes
      const timelineNotes = notes
        .filter(note => note.content && note.content.includes('meta::timeline'))
        .map(note => {
          const timelineData = parseTimelineData(note.content, notes);
          return {
            ...note,
            ...timelineData,
            isFlagged: note.content.includes('meta::flagged_timeline'),
            isTracked: note.content.includes('meta::tracked')
          };
        });
      setTimelineNotes(timelineNotes);
    } catch (error) {
      console.error('Error toggling tracked status:', error);
    }
  };

  const handleToggleFlagged = async (noteId) => {
    try {
      const note = notes.find(n => n.id === noteId);
      if (!note) return;

      const hasFlagged = note.content.includes('meta::flagged_timeline');
      let newContent;
      
      if (hasFlagged) {
        // Remove flagged tag - handle both standalone and with newline
        const lines = note.content.split('\n');
        const filteredLines = lines.filter(line => line.trim() !== 'meta::flagged_timeline');
        newContent = filteredLines.join('\n').trim();
      } else {
        // Add flagged tag
        newContent = note.content.trim() + '\nmeta::flagged_timeline';
      }
      
      await updateNote(noteId, newContent);
      
      // Refresh the timeline notes by updating the note content in the current notes
      // The parent component should refresh notes, but we update locally for immediate feedback
      const updatedNotes = notes.map(n => 
        n.id === noteId ? { ...n, content: newContent } : n
      );
      const filteredNotes = updatedNotes
        .filter(note => note.content && note.content.includes('meta::timeline'))
        .map(note => {
          const timelineData = parseTimelineData(note.content, updatedNotes);
          return {
            ...note,
            ...timelineData,
            isFlagged: note.content.includes('meta::flagged_timeline'),
            isTracked: note.content.includes('meta::tracked')
          };
        });
      setTimelineNotes(filteredNotes);
    } catch (error) {
      console.error('Error toggling flagged status:', error);
    }
  };

  // Handle unlinking an event from a timeline
  const handleUnlinkEvent = async (timelineNoteId, linkedEventId) => {
    try {
      // 1. Remove meta::linked_to_timeline::<timeline_id> from the event note
      const eventNote = notes.find(n => n.id === linkedEventId);
      let updatedEventContent = null;
      if (eventNote) {
        const eventLines = eventNote.content.split('\n');
        const filteredEventLines = eventLines.filter(line => 
          !line.trim().startsWith(`meta::linked_to_timeline::${timelineNoteId}`)
        );
        updatedEventContent = filteredEventLines.join('\n').trim();
        await updateNote(linkedEventId, updatedEventContent);
      }

      // 2. Remove the event ID from meta::linked_from_events:: in the timeline note
      // Each event should be on its own line, so remove the specific line
      const timelineNote = notes.find(n => n.id === timelineNoteId);
      let updatedTimelineContent = null;
      if (timelineNote) {
        const timelineLines = timelineNote.content.split('\n');
        
        // Process each line: remove the linked event ID, keep other event IDs as separate lines
        const processedLines = [];
        const remainingEventIds = new Set();
        
        timelineLines.forEach((line) => {
          if (line.trim().startsWith('meta::linked_from_events::')) {
            const eventIdsString = line.replace('meta::linked_from_events::', '').trim();
            const eventIds = eventIdsString.split(',').map(id => id.trim()).filter(id => id);
            
            // Filter out the event ID we're unlinking, and collect remaining IDs
            eventIds.forEach(id => {
              if (id !== linkedEventId) {
                remainingEventIds.add(id);
              }
            });
          } else {
            // Keep non-linked_from_events lines as-is
            processedLines.push(line);
          }
        });
        
        // Build the updated content
        updatedTimelineContent = processedLines.join('\n').trim();
        
        // Add remaining event IDs as separate lines (one per event)
        if (remainingEventIds.size > 0) {
          const linkedEventLines = Array.from(remainingEventIds).map(eventId => 
            `meta::linked_from_events::${eventId}`
          );
          updatedTimelineContent = updatedTimelineContent + '\n' + linkedEventLines.join('\n');
        }
        
        await updateNote(timelineNoteId, updatedTimelineContent);
      }

      // Update local notes array for immediate UI refresh
      const updatedNotes = notes.map(note => {
        if (note.id === linkedEventId && updatedEventContent) {
          return { ...note, content: updatedEventContent };
        }
        if (note.id === timelineNoteId && updatedTimelineContent) {
          return { ...note, content: updatedTimelineContent };
        }
        return note;
      });

      // Refresh the timeline notes
      const timelineNotes = updatedNotes
        .filter(note => note.content && note.content.includes('meta::timeline'))
        .map(note => {
          const timelineData = parseTimelineData(note.content, updatedNotes);
          return {
            ...note,
            ...timelineData,
            isFlagged: note.content.includes('meta::flagged_timeline'),
            isTracked: note.content.includes('meta::tracked')
          };
        });
      setTimelineNotes(timelineNotes);
    } catch (error) {
      console.error('Error unlinking event from timeline:', error);
      alert('Failed to unlink event from timeline. Please try again.');
    }
  };

  // Handle deleting an event from a timeline
  const handleDeleteEvent = async (timelineId, eventIndex) => {
    try {
      const notesToUse = getNotesWithNewEvent();
      // Get the full note with content from notes prop, not from timelineNotes API response
      const timelineNote = notesToUse.find(n => n.id === timelineId);
      if (!timelineNote || !timelineNote.content) {
        alert('Timeline not found');
        return;
      }

      // Get the cached events to find the event by index
      const cachedData = timelineEventsCache[timelineId];
      if (!cachedData || !cachedData.events) {
        alert('Timeline events not loaded');
        return;
      }

      const event = cachedData.events[eventIndex];
      if (!event) {
        alert('Event not found');
        return;
      }

      // Can't delete linked events (they have lineIndex === -1)
      if (event.lineIndex === -1) {
        alert('Cannot delete linked events. Please unlink the event first.');
        return;
      }
      
      // Can't delete virtual events
      if (event.isVirtual) {
        alert('Cannot delete virtual events');
        return;
      }

      const lines = timelineNote.content.split('\n');
      
      // Get content lines (non-meta lines, excluding 'Closed')
      const contentLines = lines.filter(line => 
        !line.trim().startsWith('meta::') && line.trim() !== '' && line.trim() !== 'Closed'
      );
      
      // Remove the event at lineIndex (lineIndex is 1-based, 1 = first event after title)
      // lineIndex 1 = contentLines[1], lineIndex 2 = contentLines[2], etc.
      const updatedContentLines = contentLines.filter((line, index) => {
        // Keep title (index 0) and all events except the one we're deleting
        return index === 0 || index !== event.lineIndex;
      });
      
      // Rebuild content with meta lines
      const metaLines = lines.filter(line => 
        line.trim().startsWith('meta::') || line.trim() === 'Closed'
      );
      
      const updatedContent = [...updatedContentLines, ...metaLines].join('\n');
      
      // Update the note
      if (updateNote) {
        await updateNote(timelineId, updatedContent);
      }

      // Clear cache for this timeline to force reload
      setTimelineEventsCache(prev => {
        const updated = { ...prev };
        delete updated[timelineId];
        return updated;
      });

      // Refresh timeline notes from API
      try {
        const params = {
          search: searchQuery || undefined,
          searchTitlesOnly: searchTitlesOnly ? 'true' : undefined
        };
        const response = await getTimelines(params);
        setTimelineNotes(response.timelines || []);
      } catch (error) {
        console.error('Error refreshing timelines:', error);
      }
      
      // Close confirmation modal
      setDeleteEventConfirmation({ isOpen: false, timelineId: null, eventIndex: null, eventName: null });
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event. Please try again.');
    }
  };

  // Handle creating a new timeline
  const handleCreateTimeline = async () => {
    if (!newTimelineTitle.trim()) {
      alert('Please enter a timeline title');
      return;
    }

    try {
      const timelineContent = `${newTimelineTitle.trim()}\nmeta::timeline::${newTimelineTitle.trim()}`;
      
      if (addNote) {
        await addNote(timelineContent);
      }

      // Reset form
      setNewTimelineTitle('');
      setShowNewTimelineForm(false);
    } catch (error) {
      console.error('Error creating timeline:', error);
      alert('Failed to create timeline. Please try again.');
    }
  };

  // Toggle timeline collapse state
  const toggleTimelineCollapse = (noteId) => {
    setCollapsedTimelines(prev => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      
      // Save the updated state to localStorage immediately
      saveCollapseStates(newSet);
      
      return newSet;
    });
  };

  // Toggle section collapse state
  const toggleSectionCollapse = (sectionName) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionName)) {
        newSet.delete(sectionName);
      } else {
        newSet.add(sectionName);
      }
      
      // Save the updated state to localStorage immediately
      saveSectionCollapseStates(newSet);
      
      return newSet;
    });
  };

  // Collapse all timelines
  const handleCollapseAll = () => {
    const allTimelineIds = new Set(timelineNotes.map(note => note.id));
    saveCollapseStates(allTimelineIds);
    setCollapsedTimelines(allTimelineIds);
  };

  // Expand all timelines
  const handleExpandAll = () => {
    const emptySet = new Set();
    saveCollapseStates(emptySet);
    setCollapsedTimelines(emptySet);
  };

  // Handle adding a new event via EditEventModal (like EventsPage)
  const handleAddEventFromTimeline = async (content) => {
    try {
      devLog('[Timelines] handleAddEventFromTimeline: Creating event with content:', content);
      const response = await createNote(content);
      devLog('[Timelines] handleAddEventFromTimeline response:', response);
      
      // Store the new event note in ref AND state for immediate use
      newEventNoteRef.current = response;
      setPendingNewEventNote(response);
      newEventSeenCountRef.current = 0; // Reset counter for new event
      devLog('[Timelines] Stored new event note in ref and state:', response.id, response);
      
      // Add the new event to notes via setAllNotes (which updates App's allNotes)
      if (setAllNotes) {
        setAllNotes(prevNotes => {
          const updated = [...prevNotes, response];
          devLog('[Timelines] setAllNotes: Updated notes array length:', updated.length);
          return updated;
        });
      }
      
      // Add to search index
      if (response && response.content) {
        addNoteToIndex(response);
      }
      
      return response; // Return the note object with id for timeline linking
    } catch (error) {
      console.error('Error adding event:', error);
      throw error;
    }
  };

  // Handle timeline updated callback (when event is linked to timeline)
  const handleTimelineUpdated = (timelineId, updatedContent) => {
    devLog('[Timelines] handleTimelineUpdated called:', { timelineId, updatedContentLength: updatedContent?.length });
    devLog('[Timelines] Current notes length:', notes.length);
    // Check both ref and state for the new event note
    const newEventNoteFromRef = newEventNoteRef.current;
    const newEventNoteFromState = pendingNewEventNote;
    const newEventNote = newEventNoteFromRef || newEventNoteFromState;
    devLog('[Timelines] New event note in ref:', newEventNoteFromRef?.id, 'in state:', newEventNoteFromState?.id);
    
    // Update the timeline note in the notes array
    if (updateNote) {
      updateNote(timelineId, updatedContent);
      devLog('[Timelines] Called updateNote for timeline:', timelineId);
    }
    
    // Use getNotesWithNewEvent() to get the latest notes including the new event
    // This ensures we have the most up-to-date notes array
    // IMPORTANT: Even if the ref was cleared, we need to check if the notes prop has the new event
    // If not, we need to restore the ref temporarily so parseTimelineData can find it
    let notesToUse = getNotesWithNewEvent();
    const newEventNoteId = newEventNote?.id;
    
    // If ref is cleared but notes prop doesn't have the new event yet, we need to restore it
    // This can happen if useEffect cleared the ref before handleTimelineUpdated ran
    if (!newEventNote && newEventNoteId && !notes.find(n => n.id === newEventNoteId)) {
      devLog('[Timelines] WARNING: Ref was cleared but notes prop does not have new event yet');
      // Try to get the new event from the result that was passed to onSave
      // But we don't have access to it here, so we'll need to work around this
      // For now, we'll trigger a re-render after a delay to ensure the notes prop is updated
    }
    
    devLog('[Timelines] Notes to use length (from getNotesWithNewEvent):', notesToUse.length, 'includes new event:', notesToUse.find(n => n.id === newEventNoteId) ? 'YES' : 'NO');
    
    // Update the timeline note in the notes array
    const updatedNotes = notesToUse.map(n => 
      n.id === timelineId ? { ...n, content: updatedContent } : n
    );
    
    devLog('[Timelines] Updated timeline note in array:', updatedNotes.find(n => n.id === timelineId)?.content?.substring(0, 100));
    
    // Update timelineNotes with PARSED timeline data merged with original note properties
    // This is critical - timelineNotes must contain both original note data AND parsed timeline data
    const filteredNotes = updatedNotes
      .filter(note => note.content && note.content.includes('meta::timeline'))
      .map(note => {
        const timelineData = parseTimelineData(note.content, updatedNotes);
        return {
          ...note,
          ...timelineData,
          isFlagged: note.content.includes('meta::flagged_timeline'),
          isTracked: note.content.includes('meta::tracked')
        };
      });
    
    devLog('[Timelines] Filtered timeline notes count:', filteredNotes.length);
    devLog('[Timelines] Setting timelineNotes with:', filteredNotes.map(n => ({ id: n.id, timeline: n.timeline })));
    
    setTimelineNotes(filteredNotes);
    
    // Force a re-render after a delay to ensure the new event is included
    // This is a workaround for the race condition where useEffect clears the ref too early
    setTimeout(() => {
      devLog('[Timelines] Delayed refresh: Checking if new event is now in notes prop');
      const delayedNotesToUse = getNotesWithNewEvent();
      const delayedUpdatedNotes = delayedNotesToUse
        .map(n => n.id === timelineId ? { ...n, content: updatedContent } : n);
      const delayedFilteredNotes = delayedUpdatedNotes
        .filter(note => note.content && note.content.includes('meta::timeline'))
        .map(note => {
          const timelineData = parseTimelineData(note.content, delayedUpdatedNotes);
          return {
            ...note,
            ...timelineData,
            isFlagged: note.content.includes('meta::flagged_timeline'),
            isTracked: note.content.includes('meta::tracked')
          };
        });
      
      devLog('[Timelines] Delayed refresh: Notes length:', delayedNotesToUse.length, 'includes new event:', delayedNotesToUse.find(n => n.id === newEventNoteId) ? 'YES' : 'NO');
      
      if (delayedNotesToUse.find(n => n.id === newEventNoteId)) {
        devLog('[Timelines] Delayed refresh: New event found, updating timelineNotes');
        setTimelineNotes(delayedFilteredNotes);
      }
    }, 300);
    
    // Don't clear the ref here - let the useEffect clear it once the notes prop is updated
    // The useEffect will check if the notes prop includes the new event and clear the ref accordingly
  };

  // Handle adding a new event (old method - keeping for backward compatibility, but won't be used)
  const handleAddEvent = async (noteId) => {
    if (!newEventText.trim() || !newEventDate) {
      alert('Please enter both event text and date');
      return;
    }

    try {
      const note = timelineNotes.find(n => n.id === noteId);
      if (!note) return;

      // Format the date as DD/MM/YYYY
      const formattedDate = moment(newEventDate).format('DD/MM/YYYY');
      const newEventLine = `${newEventText.trim()}: ${formattedDate}`;
      
      // Add the new event line before the meta tags
      const lines = note.content.split('\n');
      const metaLines = lines.filter(line => line.trim().startsWith('meta::'));
      const contentLines = lines.filter(line => !line.trim().startsWith('meta::'));
      
      const updatedContent = [
        ...contentLines,
        newEventLine,
        ...metaLines
      ].join('\n');

      // Update the note
      if (updateNote) {
        await updateNote(noteId, updatedContent);
      }

      // Ensure timeline stays open after adding event (remove from collapsed set)
      setCollapsedTimelines(prev => {
        const newSet = new Set(prev);
        newSet.delete(noteId);
        // Save to localStorage
        saveCollapseStates(newSet);
        return newSet;
      });

      // Reset form
      setNewEventText('');
      setNewEventDate('');
      setShowAddEventForm(null);
    } catch (error) {
      console.error('Error adding event:', error);
      alert('Failed to add event. Please try again.');
    }
  };

  // Handle adding/updating link for an event
  const handleAddLink = async (timelineId, eventIndex, link) => {
    try {
      const note = timelineNotes.find(n => n.id === timelineId);
      if (!note) return;

      const notesToUse = getNotesWithNewEvent();
      const timelineData = parseTimelineData(note.content, notesToUse);
      const event = timelineData.events[eventIndex];
      
      if (!event || event.lineIndex === -1) {
        // Can't add link to linked events or virtual events
        alert('Cannot add link to this type of event');
        return;
      }

      const lines = note.content.split('\n');
      const eventLineIndex = event.lineIndex;
      
      // Get the current event line
      let eventLine = lines[eventLineIndex];
      
      // Parse the current line to extract event and date
      const eventMatch = eventLine.match(/^(.+?)\s*:\s*(.+)$/);
      if (!eventMatch) {
        alert('Invalid event format');
        return;
      }

      const [, eventText, rest] = eventMatch;
      const dateLinkMatch = rest.match(/^(.+?)\s*:\s*(.+)$/);
      
      let formattedDate;
      if (dateLinkMatch) {
        // Already has a link, replace it
        formattedDate = dateLinkMatch[1].trim();
      } else {
        // No link yet, use the rest as date
        formattedDate = rest.trim();
      }

      // Build the new event line
      let newEventLine;
      if (link && link.trim()) {
        newEventLine = `${eventText.trim()}: ${formattedDate}: ${link.trim()}`;
      } else {
        // Remove link if empty
        newEventLine = `${eventText.trim()}: ${formattedDate}`;
      }

      // Update the line
      lines[eventLineIndex] = newEventLine;

      const updatedContent = lines.join('\n');

      // Update the note
      if (updateNote) {
        await updateNote(timelineId, updatedContent);
      }

      // Close modal
      setAddLinkModal({ isOpen: false, timelineId: null, eventIndex: null, currentLink: '' });
    } catch (error) {
      console.error('Error adding link:', error);
      alert('Failed to add link. Please try again.');
    }
  };

  // Filter and sort timeline notes (memoized for performance)
  const filteredAndSortedTimelineNotes = useMemo(() => {
    // Note: timelineNotes now come from API with simplified format (timeline, isClosed, isFlagged, etc.)
    // Search filtering is done on the server side, but we can apply additional client-side filtering here if needed
    
    return timelineNotes
      .filter(note => {
        if (!note || !note.timeline) return false;
        
        // Client-side search filtering (if not already done by server)
        if (!searchQuery.trim()) return true;
        
        const query = searchQuery.toLowerCase();
        
        // Search in timeline title
        if (note.timeline.toLowerCase().includes(query)) {
          return true;
        }
        
        // If "search only titles" is checked, don't search in events
        if (searchTitlesOnly) {
          return false;
        }
        
        // For event search, we'd need to check cached events
        // This is a simplified version - full event search should be done server-side
        return false;
      })
      .sort((a, b) => {
        const aName = a.timeline || 'Untitled Timeline';
        const bName = b.timeline || 'Untitled Timeline';
        return aName.localeCompare(bName);
      });
  }, [timelineNotes, searchQuery, searchTitlesOnly]);

  // Load timeline events when timelines are expanded
  useEffect(() => {
    // Get all visible timeline IDs (not collapsed)
    const visibleTimelineIds = filteredAndSortedTimelineNotes
      .filter(note => note && !collapsedTimelines.has(note.id))
      .map(note => note.id);
    
    // Load events for visible timelines that aren't cached yet
    visibleTimelineIds.forEach(timelineId => {
      if (!timelineEventsCache[timelineId]) {
        loadTimelineEvents(timelineId);
      }
    });
  }, [filteredAndSortedTimelineNotes, collapsedTimelines, timelineEventsCache, loadTimelineEvents]);

  // Track previous search query to detect when user actively clears search
  const prevSearchQueryRef = useRef(searchQuery);

  // Auto-expand timelines with matching events when searching
  useEffect(() => {
    // Only collapse all timelines when user actively clears search (not on initial load or when returning to page)
    // Check if search query changed from non-empty to empty
    const wasSearching = prevSearchQueryRef.current && prevSearchQueryRef.current.trim();
    const isSearchCleared = !searchQuery.trim() && wasSearching;
    
    // Update ref for next comparison
    prevSearchQueryRef.current = searchQuery;
    
    if (isSearchCleared) {
      // User actively cleared search - collapse all timelines
      if (timelineNotes.length > 0) {
        const allTimelineIds = new Set(timelineNotes.map(note => note.id));
        saveCollapseStates(allTimelineIds);
        setCollapsedTimelines(allTimelineIds);
      }
      return;
    }
    
    if (!searchQuery.trim()) {
      // No search query and user didn't just clear it - don't change collapse state
      // This preserves the saved collapse state from localStorage
      return;
    }

    if (timelineNotes.length > 0 && notes.length > 0) {
      const query = searchQuery.toLowerCase();
      const matchingTimelineIds = new Set();
      
      timelineNotes.forEach(note => {
        if (!note) return;
        
        // Check if timeline title matches
        if (note.timeline && note.timeline.toLowerCase().includes(query)) {
          matchingTimelineIds.add(note.id);
        }
        
        // Only check events if "search only titles" is not checked
        if (!searchTitlesOnly) {
          // Check cached events for matches
          const cachedData = timelineEventsCache[note.id];
          if (cachedData && cachedData.events) {
            const hasMatchingEvent = cachedData.events.some(event => {
              if (event.event && typeof event.event === 'string') {
                return event.event.toLowerCase().includes(query);
              }
              return false;
            });
            
            if (hasMatchingEvent) {
              matchingTimelineIds.add(note.id);
            }
          }
        }
      });
      
      // Expand matching timelines (remove from collapsed set)
      if (matchingTimelineIds.size > 0) {
        setCollapsedTimelines(prev => {
          const newSet = new Set(prev);
          matchingTimelineIds.forEach(id => {
            newSet.delete(id);
          });
          // Save to localStorage
          saveCollapseStates(newSet);
          return newSet;
        });
      }
    }
  }, [searchQuery, searchTitlesOnly, timelineNotes, timelineEventsCache]);

  const [activeTab, setActiveTab] = useState('all');
  const timelineRefs = useRef({});

  // Function to create master timeline with all events from current year
  const createMasterTimeline = useCallback(() => {
    const currentYear = new Date().getFullYear();
    const masterTimelineId = `master-timeline-${currentYear}`;
    
    // Collect all events from all timelines for the current year
    const allEvents = [];
    
    timelineNotes.forEach((note) => {
      const notesToUse = getNotesWithNewEvent();
      const timelineData = parseTimelineData(note.content, notesToUse);
      
      timelineData.events.forEach((event) => {
        if (event.date && event.date.year() === currentYear) {
          // Add source timeline info to event
          allEvents.push({
            ...event,
            sourceTimelineId: note.id,
            sourceTimelineName: timelineData.timeline || 'Untitled Timeline',
            isLinkedEvent: event.isLinkedEvent || false,
            linkedEventId: event.linkedEventId || null
          });
        }
      });
    });
    
    // Sort events by date
    allEvents.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.diff(b.date);
    });
    
    return {
      id: masterTimelineId,
      timeline: String(currentYear),
      events: allEvents,
      isClosed: false,
      totalDollarAmount: allEvents.reduce((sum, event) => sum + (event.dollarAmount || 0), 0),
      isMasterTimeline: true,
      content: '' // Master timeline doesn't have actual note content
    };
  }, [timelineNotes, getNotesWithNewEvent, parseTimelineData]);

  // Memoize master timeline for performance
  const masterTimeline = useMemo(() => {
    return createMasterTimeline();
  }, [createMasterTimeline]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showTimelineDropdown && !event.target.closest('.timeline-dropdown-container')) {
        setShowTimelineDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTimelineDropdown]);

  // Function to scroll to a timeline
  const scrollToTimeline = (timelineId) => {
    const timelineElement = timelineRefs.current[timelineId];
    if (timelineElement) {
      timelineElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Expand the timeline if it's collapsed
      if (collapsedTimelines.has(timelineId)) {
        toggleTimelineCollapse(timelineId);
      }
    }
  };

  // Function to scroll to top
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Show/hide scroll to top button based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      // Show button when scrolled down more than 300px
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Timelines</h1>
          <div className="flex gap-2">
              <button
                onClick={() => setShowMasterTimelineModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                title="View Master Timeline"
              >
                📅 Master Timeline
              </button>
              <button
                onClick={handleExpandAll}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
                title="Expand all timelines"
              >
              Expand All
              </button>
              <button
                onClick={handleCollapseAll}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
                title="Collapse all timelines"
              >
              Collapse All
              </button>
              <button
                onClick={() => setShowNewTimelineForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
              >
              <PlusIcon className="h-4 w-4" />
              New Timeline
              </button>
            </div>
          </div>
          
        {/* Tabs */}
        <div className="flex items-center gap-6 border-b border-gray-200 -mb-px">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'all'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            All Timelines
          </button>
          <button
            onClick={() => setActiveTab('flagged')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'flagged'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Flagged
          </button>
          <button
            onClick={() => setActiveTab('closed')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'closed'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Closed
          </button>
        </div>
      </div>


      <div className="px-6 py-6">
        {/* Search and Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
                <input
                  id="timeline-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchTitlesOnly ? "Search by timeline title..." : "Search by timeline title or events..."}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  title="Clear search"
                  >
                  <XMarkIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
            <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={searchTitlesOnly}
                    onChange={(e) => setSearchTitlesOnly(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span>Search only titles</span>
                </label>
              </div>

          {/* Filter Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Timeline Dropdown */}
            <div className="relative timeline-dropdown-container">
              <button 
                onClick={() => setShowTimelineDropdown(!showTimelineDropdown)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 border border-gray-200"
              >
                <PlusIcon className="h-3 w-3" />
                Timeline
                <ChevronRightIcon className={`h-3 w-3 transition-transform ${showTimelineDropdown ? 'rotate-90' : ''}`} />
              </button>
              
              {showTimelineDropdown && timelineNotes.length > 0 && (
                <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                  <div className="p-2">
                    {/* Master Timeline */}
                    {masterTimeline.events.length > 0 && (
                      <div className="mb-2 pb-2 border-b border-gray-200">
                        <div className="text-xs font-semibold text-purple-600 mb-1 px-2">Master Timeline</div>
                        <button
                          onClick={() => {
                            setShowMasterTimelineModal(true);
                            setShowTimelineDropdown(false);
                          }}
                          className="w-full text-left px-3 py-1.5 text-sm rounded hover:bg-purple-50 text-purple-700"
                        >
                          {masterTimeline.timeline} ({masterTimeline.events.length} events)
                        </button>
                      </div>
                    )}
                    
                    {/* Group timelines by status */}
                    {(() => {
                      const flaggedTimelines = [];
                      const openTimelines = [];
                      const closedTimelines = [];
                      
                      timelineNotes.forEach((note) => {
                          openTimelines.push(note);
                      });
                      
                      const sortByTimelineName = (a, b) => {
                        const aName = a.timeline || 'Untitled Timeline';
                        const bName = b.timeline || 'Untitled Timeline';
                        return aName.localeCompare(bName);
                      };
                      
                      flaggedTimelines.sort(sortByTimelineName);
                      openTimelines.sort(sortByTimelineName);
                      closedTimelines.sort(sortByTimelineName);
                      
                      return (
                        <>
                    
                          
                          {/* Open Timelines */}
                          {openTimelines.length > 0 && (
                            <div className="mb-2 pb-2 border-b border-gray-200">
                              <div className="text-xs font-semibold text-blue-600 mb-1 px-2">Open</div>
                              {openTimelines.map((note) => {
                                const timelineTitle = note.timeline || 'Untitled Timeline';
                                return (
                                  <button
                                    key={note.id}
                                    onClick={() => {
                                      scrollToTimeline(note.id);
                                      setShowTimelineDropdown(false);
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-sm rounded hover:bg-blue-50 text-blue-700"
                                  >
                                    {timelineTitle}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                         
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
            

          </div>
        </div>

        {timelineNotes.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="text-gray-500 text-lg mb-4">
              No timeline notes found
            </div>
            <p className="text-gray-400 mb-4">
              Add <code className="bg-gray-200 px-2 py-1 rounded">meta::timeline::[value]</code> to notes to see them here
            </p>
            <div className="text-sm text-gray-400">
              <p>Total notes: {notes ? notes.length : 0}</p>
              <p>Notes with meta::timeline: {timelineNotes.length}</p>
            </div>
          </div>
        ) : filteredAndSortedTimelineNotes.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="text-gray-500 text-lg mb-4">
              No timelines match your search
            </div>
            <p className="text-gray-400">
              Try adjusting your search terms or clear the search to see all timelines
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="space-y-6 p-6">
      
            
            {/* Open Timelines */}
            {(() => {
              const openTimelines = filteredAndSortedTimelineNotes.filter(note => {
        
                return true;
              });
              
              if (openTimelines.length > 0) {
                const isSectionCollapsed = collapsedSections.has('open');
                return (
                  <div className="space-y-4">
                    <h2 
                      onClick={() => toggleSectionCollapse('open')}
                      className="text-xl font-semibold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <span className="flex items-center gap-2">
                        <svg 
                          className={`w-5 h-5 text-indigo-600 transition-transform ${isSectionCollapsed ? '' : 'rotate-90'}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        Open Timelines <span className="font-normal text-slate-500">({openTimelines.length})</span>
                      </span>
                    </h2>
                    {!isSectionCollapsed && openTimelines.map((note) => {
                      if (!note) return null;
                      
                      // Get timeline data from cache or use simplified data from API
                      const cachedData = timelineEventsCache[note.id];
                      let timelineData;
                      let eventsWithDiffs;
                      
                      if (cachedData && cachedData.timelineData) {
                        // Use cached full timeline data
                        timelineData = {
                          timeline: cachedData.timelineData.timeline || note.timeline || 'Untitled Timeline',
                          events: cachedData.events || [],
                          isClosed: cachedData.timelineData.isClosed || note.isClosed || false,
                          totalDollarAmount: cachedData.timelineData.totalDollarAmount || 0
                        };
                        eventsWithDiffs = calculateTimeDifferences(timelineData.events, timelineData.isClosed, timelineData.totalDollarAmount);
                      } else {
                        // Use simplified data from API response
                        timelineData = {
                          timeline: note.timeline || 'Untitled Timeline',
                          events: [],
                          isClosed: note.isClosed || false,
                          totalDollarAmount: note.totalDollarAmount || 0
                        };
                        eventsWithDiffs = [];
                        // Trigger loading if not cached
                        if (!collapsedTimelines.has(note.id)) {
                          loadTimelineEvents(note.id);
                        }
                      }

              return (
                <div 
                  key={note.id}
                  ref={(el) => (timelineRefs.current[note.id] = el)}
                  className="bg-white rounded-xl shadow-md border-l-4 border-indigo-400 hover:shadow-lg transition-shadow"
                >
                  {/* Timeline Header */}
                  <div 
                    className="sticky top-0 z-40 bg-gradient-to-r from-indigo-50 to-blue-50 px-6 py-4 cursor-pointer hover:from-indigo-100 hover:to-blue-100 border-b border-indigo-200/50 transition-all rounded-t-xl shadow-sm"
                    onClick={() => toggleTimelineCollapse(note.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="text-indigo-600">
                          {collapsedTimelines.has(note.id) ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1">
                          <h2 className="text-xl font-semibold text-gray-900">
                            {timelineData.timeline || 'Untitled Timeline'}
                          </h2>
                          {(() => {
                            const eventsWithDates = timelineData.events
                              .filter(event => event.date)
                              .sort((a, b) => a.date.diff(b.date));
                            
                            if (eventsWithDates.length > 0) {
                              const startDate = eventsWithDates[0].date;
                              const lastEvent = eventsWithDates[eventsWithDates.length - 1];
                              const eventCount = timelineData.events.length;
                              
                              // Calculate duration for open timelines
                              let durationText = '';
                              if (lastEvent.date) {
                                const durationDays = lastEvent.date.diff(startDate, 'days');
                                const durationText_formatted = (() => {
                                  if (durationDays > 365) {
                                    const years = Math.floor(durationDays / 365);
                                    const remainingDays = durationDays % 365;
                                    const months = Math.floor(remainingDays / 30);
                                    const finalDays = remainingDays % 30;
                                    
                                    let result = '';
                                    if (years > 0) result += `${years} year${years !== 1 ? 's' : ''}`;
                                    if (months > 0) {
                                      if (result) result += ', ';
                                      result += `${months} month${months !== 1 ? 's' : ''}`;
                                    }
                                    if (finalDays > 0) {
                                      if (result) result += ', ';
                                      result += `${finalDays} day${finalDays !== 1 ? 's' : ''}`;
                                    }
                                    return result;
                                  } else if (durationDays > 30) {
                                    const months = Math.floor(durationDays / 30);
                                    const remainingDays = durationDays % 30;
                                    
                                    let result = '';
                                    if (months > 0) result += `${months} month${months !== 1 ? 's' : ''}`;
                                    if (remainingDays > 0) {
                                      if (result) result += ', ';
                                      result += `${remainingDays} day${remainingDays !== 1 ? 's' : ''}`;
                                    }
                                    return result;
                                  } else {
                                    return `${durationDays} day${durationDays !== 1 ? 's' : ''}`;
                                  }
                                })();
                                durationText = durationText_formatted;
                              }
                              
                              // Calculate total amount - use filtered events if search is active
                              const searchQuery = timelineSearchQueries[note.id] || '';
                              let totalAmount = null;
                              
                              if (searchQuery) {
                                // Filter events and calculate sum of filtered events (exclude virtual/total events)
                                const filteredEvents = filterEventsBySearch(eventsWithDiffs, searchQuery);
                                const filteredSum = filteredEvents
                                  .filter(event => !event.isVirtual && !event.isTotal)
                                  .reduce((sum, event) => sum + (event.dollarAmount || 0), 0);
                                if (filteredSum > 0) {
                                  totalAmount = `$${filteredSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                }
                              } else {
                                // Use total from all events
                                if (timelineData.totalDollarAmount && timelineData.totalDollarAmount > 0) {
                                  totalAmount = `$${timelineData.totalDollarAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                                }
                              }
                              
                              return (
                                <>
                                  <div className="text-sm font-normal text-gray-600 mt-1">
                                    {startDate.format('DD/MMM/YYYY')} - {lastEvent.date.format('DD/MMM/YYYY')} • {eventCount} events{durationText ? ` • ${durationText}` : ''}
                                  </div>
                                  {totalAmount && (
                                    <div className="text-sm font-semibold text-emerald-600 mt-1">
                                      {totalAmount}
                                    </div>
                                  )}
                                </>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {!timelineData.isClosed && (
                          <>
                          <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // Open timeline if it's collapsed
                                        if (collapsedTimelines.has(note.id)) {
                                          toggleTimelineCollapse(note.id);
                                        }
                                        setEditingTimelineId(note.id);
                                        setShowEditEventModal(true);
                                      }}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md transition-colors flex items-center space-x-1.5 border border-blue-200"
                            title="Add new event"
                          >
                            <PlusIcon className="h-4 w-4" />
                            <span className="text-sm font-medium">Add Event</span>
                          </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setLinkEventModal({ isOpen: true, timelineId: note.id, searchQuery: '', selectedEventId: null });
                              }}
                              className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-md transition-colors flex items-center space-x-1.5 border border-purple-200"
                              title="Link existing event"
                            >
                              <LinkIcon className="h-4 w-4" />
                              <span className="text-sm font-medium">Link Event</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                refreshTimeline(note.id);
                              }}
                              className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-md transition-colors flex items-center space-x-1.5 border border-green-200"
                              title="Refresh timeline"
                            >
                              <ArrowPathIcon className="h-4 w-4" />
                              <span className="text-sm font-medium">Refresh</span>
                            </button>
                          </>
                        )}
                
                        {timelineData.isClosed && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReopenTimeline(note.id);
                              }}
                              className="px-3 py-1.5 bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 text-emerald-700 rounded-lg transition-all flex items-center space-x-1.5 border border-emerald-200 shadow-sm hover:shadow-md"
                              title="Reopen timeline"
                            >
                              <ArrowPathIcon className="h-4 w-4" />
                              <span className="text-sm font-medium">Reopen</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                refreshTimeline(note.id);
                              }}
                              className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-md transition-colors flex items-center space-x-1.5 border border-green-200"
                              title="Refresh timeline"
                            >
                              <ArrowPathIcon className="h-4 w-4" />
                              <span className="text-sm font-medium">Refresh</span>
                            </button>
                          </>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFlagged(note.id);
                          }}
                          className={`px-3 py-1.5 rounded-md transition-colors flex items-center space-x-1.5 border ${
                            note.isFlagged
                              ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
                              : 'bg-gray-50 hover:bg-gray-100 text-gray-500 border-gray-300'
                          }`}
                          title={note.isFlagged ? 'Unflag timeline' : 'Flag timeline (needs attention)'}
                        >
                          <FlagIcon className="h-4 w-4" />
                          <span className="text-sm font-medium">Flag</span>
                        </button>
                        <label 
                          className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-md transition-colors cursor-pointer flex items-center space-x-1.5 border border-gray-300"
                          title={note.isTracked ? 'Untrack timeline' : 'Track timeline'}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleTracked(note.id);
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={note.isTracked || false}
                            onChange={() => {}}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                          />
                          <span className="text-sm font-medium">Track</span>
                        </label>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewNote(note.id);
                          }}
                          className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-md transition-colors flex items-center space-x-1.5 border border-gray-300"
                          title="View note in Notes page"
                        >
                          <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                          <span className="text-sm font-medium">View</span>
                        </button>
                      </div>
                            </div>
                          </div>
                          
                          {/* Timeline Search */}
                          {!collapsedTimelines.has(note.id) && (
                            <div className="px-6 py-3 bg-gray-50 border-b border-slate-200/50">
                              <div className="relative">
                                <input
                                  type="text"
                                  value={timelineSearchQueries[note.id] || ''}
                                  onChange={(e) => handleTimelineSearchChange(note.id, e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  placeholder="Search events in this timeline..."
                                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-400 bg-white text-sm"
                                />
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                  <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                  </svg>
                                </div>
                                {timelineSearchQueries[note.id] && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTimelineSearchChange(note.id, '');
                                    }}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                  >
                                    <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                          
                          {/* Timeline Events */}
                          {!collapsedTimelines.has(note.id) && (
                            <div className="p-6">
                              {eventsWithDiffs.length === 0 ? (
                                <div className="text-gray-500 italic">No events found in this timeline</div>
                              ) : (() => {
                                const searchQuery = timelineSearchQueries[note.id] || '';
                                const filteredEvents = filterEventsBySearch(eventsWithDiffs, searchQuery);
                                
                                if (filteredEvents.length === 0 && searchQuery) {
                                  return (
                                    <div className="text-center py-8 text-gray-500">
                                      <p>No events found matching "{searchQuery}"</p>
                                    </div>
                                  );
                                }
                                
                                return (
                                  <div className="space-y-4">
                                    {/* Preview marker at the beginning if new event should be first */}
                                    {(() => {
                                      if (!newEventDate || showAddEventForm !== note.id || filteredEvents.length === 0) {
                                        return null;
                                      }
                                      
                                      const newEventMoment = moment(newEventDate);
                                      const firstEvent = filteredEvents[0];
                                      
                                      // Show preview at start if new event is before first event
                                      const shouldShowAtStart = firstEvent && firstEvent.date && newEventMoment.isBefore(firstEvent.date);
                                      
                                      if (!shouldShowAtStart) {
                                        return null;
                                      }
                                      
                                      const showStartYearHeader = firstEvent.date && firstEvent.date.year() !== newEventMoment.year();
                                      
                                      return (
                                        <>
                                          {showStartYearHeader && (
                                            <div className="flex items-center space-x-4 mb-4">
                                              <div className="w-4 h-4"></div>
                                              <div className="flex-1">
                                                <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent border-b-2 border-indigo-300 pb-2">
                                                  {newEventMoment.year()}
                                                </h2>
                                              </div>
                                            </div>
                                          )}
                                          
                                          <div className="opacity-50 border border-blue-400 bg-blue-50 rounded-md p-4 border-dashed mb-4">
                                            <div className="flex items-start space-x-4">
                                              <div className="flex flex-col items-center">
                                                <div className="w-4 h-4 rounded-full border-2 bg-blue-400 border-blue-400 animate-pulse"></div>
                                                <div className="w-0.5 h-8 bg-gray-300 mt-2"></div>
                                              </div>
                                              <div className="flex-1">
                                                <div className="flex items-center space-x-3 mb-1">
                                                  <span className="text-sm text-gray-500 bg-blue-100 px-2 py-1 rounded font-medium">
                                                    {newEventMoment.format('DD/MMM/YYYY')}
                                                  </span>
                                                  <h3 className="text-lg font-semibold text-gray-900 italic">
                                                    {newEventText || 'New Event Preview'}
                                                  </h3>
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        </>
                                      );
                                    })()}
                                    
                                    {filteredEvents.map((event, index) => {
                                      // Find original index in eventsWithDiffs for proper year headers and selection
                                      const originalIndex = eventsWithDiffs.findIndex(e => e === event);
                                      const currentYear = event.date ? event.date.year() : null;
                                      const previousEvent = originalIndex > 0 ? eventsWithDiffs[originalIndex - 1] : null;
                                      const previousYear = previousEvent && previousEvent.date ? previousEvent.date.year() : null;
                                      const showYearHeader = currentYear && currentYear !== previousYear;
                                      
                                      // Check if we should insert preview marker here
                                      const shouldShowPreview = showAddEventForm === note.id && newEventDate;
                                      let showPreviewBefore = false;
                                      
                                      if (shouldShowPreview && event.date) {
                                        const newEventMoment = moment(newEventDate);
                                        const isAfterThis = newEventMoment.isAfter(event.date);
                                        const isBeforeNext = index === filteredEvents.length - 1 || 
                                          !filteredEvents[index + 1].date || 
                                          newEventMoment.isBefore(filteredEvents[index + 1].date);
                                        
                                        showPreviewBefore = isAfterThis && isBeforeNext;
                                      }

                                      const isSelected = isEventSelected(note.id, originalIndex);
                                      const isHighlighted = isSelected && selectedEvents[note.id] && selectedEvents[note.id].length === 2;
                                    
                                      return (
                                        <React.Fragment key={originalIndex}>
                                          {/* Preview Marker - show after this event if new event should be inserted here */}
                                          {showPreviewBefore && (() => {
                                            const newEventMoment = moment(newEventDate);
                                            
                                            // Check if we need a year header for the new event
                                            const showPreviewYearHeader = currentYear !== newEventMoment.year();
                                            
                                            return (
                                              <>
                                                {showPreviewYearHeader && (
                                                  <div className="flex items-center space-x-4 mb-4">
                                                    <div className="w-4 h-4"></div>
                                                    <div className="flex-1">
                                                      <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent border-b-2 border-indigo-300 pb-2">
                                                        {newEventMoment.year()}
                                                      </h2>
                                                    </div>
                                                  </div>
                                                )}
                                                
                                                <div className="opacity-50 border border-blue-400 bg-blue-50 rounded-md p-4 border-dashed mb-4">
                                                  <div className="flex items-start space-x-4">
                                                    <div className="flex flex-col items-center">
                                                      <div className="w-4 h-4 rounded-full border-2 bg-blue-400 border-blue-400 animate-pulse"></div>
                                                      <div className="w-0.5 h-8 bg-gray-300 mt-2"></div>
                                                    </div>
                                                    <div className="flex-1">
                                                      <div className="flex items-center space-x-3 mb-1">
                                                        <span className="text-sm text-gray-500 bg-blue-100 px-2 py-1 rounded font-medium">
                                                          {newEventMoment.format('DD/MMM/YYYY')}
                                                        </span>
                                                        <h3 className="text-lg font-semibold text-gray-900 italic">
                                                          {newEventText || 'New Event Preview'}
                                                        </h3>
                                                      </div>
                                                    </div>
                                                  </div>
                                                </div>
                                              </>
                                            );
                                          })()}
                              
                              {/* Year Header */}
                              {showYearHeader && (
                                <div className="flex items-center space-x-4 mb-4">
                                  <div className="w-4 h-4"></div> {/* Spacer to align with events */}
                                  <div className="flex-1">
                                    <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-700 to-indigo-700 bg-clip-text text-transparent border-b-2 border-slate-300 pb-2">
                                      {currentYear}
                                    </h2>
                                  </div>
                                </div>
                              )}

                              {/* Event */}
                              <div 
                                className={`flex items-start space-x-4 ${isSelected ? 'bg-blue-100 rounded-lg p-2 -ml-2' : ''} cursor-pointer`}
                                onClick={() => handleEventClick(note.id, index)}
                              >
                                {/* Timeline connector */}
                                <div className="flex flex-col items-center">
                                  <div className={`w-4 h-4 rounded-full border-2 ${
                                    event.isToday
                                      ? 'bg-emerald-500 border-emerald-600'
                                      : event.isTotal
                                      ? 'bg-green-600 border-green-600'
                                      : event.isDuration
                                        ? 'bg-orange-500 border-orange-500'
                                        : event.isLinkedEvent
                                          ? 'bg-indigo-500 border-indigo-500'
                                          : event.isVirtual
                                            ? 'bg-purple-500 border-purple-500'
                                            : index === 0 
                                              ? 'bg-green-500 border-green-500' 
                                              : 'bg-blue-500 border-blue-500'
                                  }`}></div>
                                  {index < eventsWithDiffs.length - 1 && (
                                    <div className="w-0.5 h-8 bg-gray-300 mt-2"></div>
                                  )}
                                </div>

                                {/* Event content */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-3 mb-1">
                                    {event.date && (
                                      <span                                     className={`text-sm px-2 py-1 rounded font-medium ${
                                        event.isToday 
                                          ? 'text-emerald-800 bg-emerald-100 border border-emerald-200' 
                                          : 'text-slate-600 bg-slate-100 border border-slate-200'
                                      }`}>
                                        {event.date.format('DD/MMM/YYYY (ddd)')}
                                      </span>
                                    )}
                                    <div className="flex items-center gap-2 flex-1">
                                      {event.link && !event.isLinkedEvent && !event.isTotal && !event.isDuration && !event.isVirtual ? (
                                        <a
                                          href={event.link}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          className="text-lg font-semibold hover:underline text-blue-600"
                                          title={event.link}
                                        >
                                          <h3 className={`inline ${
                                            event.isToday
                                              ? 'text-emerald-700 font-bold'
                                              : 'text-blue-600'
                                          }`}>
                                            {event.isTotal || event.isDuration ? (
                                              <span title={event.event.length > 50 ? event.event : undefined}>
                                                {truncateText(event.event)}
                                              </span>
                                            ) : (
                                              (() => {
                                                const formatted = formatEventHeaderWithAmount(event.event.charAt(0).toUpperCase() + event.event.slice(1));
                                                const displayText = formatted.hasAmount ? formatted.text : formatted.description;
                                                return (
                                                  <span 
                                                    title={event.event.length > 50 ? event.event : undefined}
                                                    dangerouslySetInnerHTML={{
                                                      __html: formatted.hasAmount 
                                                        ? highlightDollarValues(displayText)
                                                        : highlightDollarValues(truncateText(event.event.charAt(0).toUpperCase() + event.event.slice(1)))
                                                    }}
                                                  />
                                                );
                                              })()
                                            )}
                                          </h3>
                                        </a>
                                      ) : event.isLinkedEvent ? (
                                        <div className="flex items-center gap-2 flex-1">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              // console.log('[Timelines] Clicked linked event (open/closed section):', {
                                              //   linkedEventId: event.linkedEventId,
                                              //   event: event.event,
                                              //   fullEvent: event
                                              // });
                                              // For HashRouter, we need to use hash with query params
                                              const targetUrl = `/events?note=${event.linkedEventId}`;
                                              //console.log('[Timelines] Navigating to:', targetUrl);
                                              ////console.log('[Timelines] Current window location:', window.location.href);
                                              navigate(targetUrl, { replace: false });
                                              //console.log('[Timelines] After navigate, window location:', window.location.href);
                                            }}
                                            className="text-left hover:underline cursor-pointer flex-1"
                                          >
                                            <h3 className={`text-lg font-semibold ${
                                              event.isToday
                                                ? 'text-emerald-700 font-bold'
                                                : 'text-indigo-600 font-semibold'
                                            }`}>
                                              {event.isTotal || event.isDuration ? (
                                                <span title={event.event.length > 50 ? event.event : undefined}>
                                                  {truncateText(event.event)}
                                                </span>
                                              ) : (
                                                <span 
                                                  title={event.event.length > 50 ? event.event : undefined}
                                                  dangerouslySetInnerHTML={{
                                                    __html: highlightDollarValues(
                                                      truncateText(event.event.charAt(0).toUpperCase() + event.event.slice(1))
                                                    )
                                                  }}
                                                />
                                              )}
                                            </h3>
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const eventNote = notes.find(n => n.id === event.linkedEventId);
                                              if (eventNote) {
                                                setEditingEventId(event.linkedEventId);
                                                setEditingTimelineId(note.id);
                                                setShowEditEventModal(true);
                                              }
                                            }}
                                            className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors"
                                            title="Edit event"
                                          >
                                            <PencilIcon className="h-4 w-4" />
                                          </button>
                                          {event.date && (
                                            <a
                                              href={`https://photos.google.com/search/${event.date.format('YYYY-MM-DD')}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              onClick={(e) => e.stopPropagation()}
                                              className="text-purple-600 hover:text-purple-800 p-1 rounded transition-colors"
                                              title="View photos"
                                            >
                                              <PhotoIcon className="h-4 w-4" />
                                            </a>
                                          )}
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2">
                                          <h3 className={`text-lg font-semibold ${
                                            event.isToday
                                              ? 'text-emerald-700 font-bold'
                                              : event.isTotal
                                              ? 'text-green-700 font-bold'
                                              : event.isDuration
                                                ? 'text-orange-600 font-bold'
                                                : event.isVirtual 
                                                  ? 'text-purple-600' 
                                                  : 'text-gray-900'
                                          }`}>
                                            {event.isTotal || event.isDuration ? (
                                              <span title={event.event.length > 50 ? event.event : undefined}>
                                                {truncateText(event.event)}
                                              </span>
                                            ) : (
                                              (() => {
                                                const formatted = formatEventHeaderWithAmount(event.event.charAt(0).toUpperCase() + event.event.slice(1));
                                                const displayText = formatted.hasAmount ? formatted.text : formatted.description;
                                                return (
                                                  <span 
                                                    title={event.event.length > 50 ? event.event : undefined}
                                                    dangerouslySetInnerHTML={{
                                                      __html: formatted.hasAmount 
                                                        ? highlightDollarValues(displayText)
                                                        : highlightDollarValues(truncateText(event.event.charAt(0).toUpperCase() + event.event.slice(1)))
                                                    }}
                                                  />
                                                );
                                              })()
                                            )}
                                          </h3>
                                          {event.date && (
                                            <a
                                              href={`https://photos.google.com/search/${event.date.format('YYYY-MM-DD')}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              onClick={(e) => e.stopPropagation()}
                                              className="text-purple-600 hover:text-purple-800 p-1 rounded transition-colors"
                                              title="View photos"
                                            >
                                              <PhotoIcon className="h-4 w-4" />
                                            </a>
                                          )}
                                        </div>
                                      )}
                                      {!event.isTotal && !event.isDuration && !event.isVirtual && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (event.isLinkedEvent && event.linkedEventId) {
                                              // For linked events, open the event edit modal with focus on notes
                                              const linkedNote = notes.find(n => n.id === event.linkedEventId);
                                              if (linkedNote) {
                                                setFocusOnNotesField(true);
                                                setEditingEventId(event.linkedEventId);
                                                setShowEditEventModal(true);
                                              }
                                            } else {
                                              // For regular timeline events, use the add link modal
                                              const timelineData = parseTimelineData(note.content, notes);
                                              const eventToLink = timelineData.events[index];
                                              setAddLinkModal({ 
                                                isOpen: true, 
                                                timelineId: note.id, 
                                                eventIndex: index, 
                                                currentLink: eventToLink.link || '' 
                                              });
                                            }
                                          }}
                                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors ml-auto"
                                          title={event.link ? 'Edit link' : 'Add link'}
                                        >
                                          <LinkIcon className="h-3 w-3 mr-1" />
                                          {event.link ? 'Edit' : 'Add'} Link
                                        </button>
                                      )}
                                      {!event.isTotal && !event.isDuration && !event.isVirtual && event.date && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setCompareModal({
                                              isOpen: true,
                                              sourceEvent: event,
                                              sourceTimelineId: note.id,
                                              filterQuery: ''
                                            });
                                          }}
                                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors ml-2"
                                          title="Compare with other events"
                                        >
                                          Compare
                                        </button>
                                      )}
                                      {!event.isLinkedEvent && !event.isTotal && !event.isDuration && !event.isVirtual && event.date && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setConvertingEvent({
                                              event: event,
                                              timelineId: note.id,
                                              timelineNote: note
                                            });
                                            setEditingEventId(null);
                                            setEditingTimelineId(note.id);
                                            setShowEditEventModal(true);
                                          }}
                                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors ml-2"
                                          title="Convert to Event"
                                        >
                                          Convert to Event
                                        </button>
                                      )}
                                      {!event.isLinkedEvent && !event.isTotal && !event.isDuration && !event.isVirtual && event.date && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setDeleteEventConfirmation({ 
                                              isOpen: true, 
                                              timelineId: note.id, 
                                              eventIndex: index,
                                              eventName: event.event
                                            });
                                          }}
                                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors ml-2"
                                          title="Delete Event"
                                        >
                                          Delete
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Event Notes - Display if available */}
                                  {(() => {
                                    // Debug: Log event properties
                                    if (event.isLinkedEvent) {
                                      console.log('[Timelines Display] Linked event:', {
                                        event: event.event,
                                        hasNotes: !!event.notes,
                                        notes: event.notes,
                                        isVirtual: event.isVirtual,
                                        isTotal: event.isTotal,
                                        isDuration: event.isDuration
                                      });
                                    }
                                    
                                    if (event.notes && !event.isVirtual && !event.isTotal && !event.isDuration) {
                                      return (
                                        <div className="mt-2 mb-2">
                                          <div className="text-sm text-gray-700 bg-amber-50 border-l-4 border-amber-400 px-3 py-2 rounded">
                                            <div className="font-medium text-amber-800 text-xs mb-1">Notes:</div>
                                            <div className="whitespace-pre-wrap">
                                              {(() => {
                                                // Check if notes contain a URL
                                                const urlRegex = /(https?:\/\/[^\s]+)/g;
                                                const parts = event.notes.split(urlRegex);
                                                
                                                return parts.map((part, index) => {
                                                  // Check if this part is a URL
                                                  if (part.match(/^https?:\/\//)) {
                                                    return (
                                                      <a
                                                        key={index}
                                                        href={part}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-blue-600 hover:text-blue-800 underline break-all"
                                                      >
                                                        {part}
                                                      </a>
                                                    );
                                                  }
                                                  return <span key={index}>{part}</span>;
                                                });
                                              })()}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}
                                  
                                  {/* Second line with age and time differences */}
                                  {(!event.isVirtual || event.isToday) && !event.isTotal && !event.isDuration && (
                                    <div className="flex items-center space-x-2 mb-1">
                                      {event.date && (
                                        <span className="text-xs px-2 py-1 rounded font-medium text-blue-600 bg-blue-100">
                                          {calculateAge(event.date)}
                                        </span>
                                      )}
                                      {(() => {
                                        const today = moment();
                                        const isFuture = event.date && event.date.isAfter(today);
                                        
                                        if (isFuture && event.date) {
                                          const daysToEvent = event.date.diff(today, 'days');
                                          const days = daysToEvent;
                                          return (
                                            <span className="text-xs px-2 py-1 rounded font-medium text-blue-600 bg-blue-100">
                                              {(() => {
                                                if (days > 365) {
                                                  const years = Math.floor(days / 365);
                                                  const remainingDays = days % 365;
                                                  const months = Math.floor(remainingDays / 30);
                                                  const finalDays = remainingDays % 30;
                                                  
                                                  let result = '';
                                                  if (years > 0) result += `${years} year${years !== 1 ? 's' : ''}`;
                                                  if (months > 0) {
                                                    if (result) result += ', ';
                                                    result += `${months} month${months !== 1 ? 's' : ''}`;
                                                  }
                                                  if (finalDays > 0) {
                                                    if (result) result += ', ';
                                                    result += `${finalDays} day${finalDays !== 1 ? 's' : ''}`;
                                                  }
                                                  return result + ' to event';
                                                } else if (days > 30) {
                                                  const months = Math.floor(days / 30);
                                                  const remainingDays = days % 30;
                                                  
                                                  let result = '';
                                                  if (months > 0) result += `${months} month${months !== 1 ? 's' : ''}`;
                                                  if (remainingDays > 0) {
                                                    if (result) result += ', ';
                                                    result += `${remainingDays} day${remainingDays !== 1 ? 's' : ''}`;
                                                  }
                                                  return result + ' to event';
                                                } else {
                                                  return `${days} day${days !== 1 ? 's' : ''} to event`;
                                                }
                                              })()}
                                            </span>
                                          );
                                        }
                                        return null;
                                      })()}
                                      {event.daysFromPrevious !== undefined && event.date && !event.date.isAfter(moment()) && (
                                        <span className="text-xs px-2 py-1 rounded font-medium text-gray-600 bg-gray-100">
                                          {(() => {
                                            const days = event.daysFromPrevious;
                                            if (days > 365) {
                                              const years = Math.floor(days / 365);
                                              const remainingDays = days % 365;
                                              const months = Math.floor(remainingDays / 30);
                                              const finalDays = remainingDays % 30;
                                              
                                              let result = '';
                                              if (years > 0) result += `${years} year${years !== 1 ? 's' : ''}`;
                                              if (months > 0) {
                                                if (result) result += ', ';
                                                result += `${months} month${months !== 1 ? 's' : ''}`;
                                              }
                                              if (finalDays > 0) {
                                                if (result) result += ', ';
                                                result += `${finalDays} day${finalDays !== 1 ? 's' : ''}`;
                                              }
                                              return result + ' since last event';
                                            } else if (days > 30) {
                                              const months = Math.floor(days / 30);
                                              const remainingDays = days % 30;
                                              
                                              let result = '';
                                              if (months > 0) result += `${months} month${months !== 1 ? 's' : ''}`;
                                              if (remainingDays > 0) {
                                                if (result) result += ', ';
                                                result += `${remainingDays} day${remainingDays !== 1 ? 's' : ''}`;
                                              }
                                              return result + ' since last event';
                                            } else {
                                              return `${days} days since last event`;
                                            }
                                          })()}
                                        </span>
                                      )}
                                      {event.daysFromStart !== undefined && event.date && !event.date.isAfter(moment()) && (
                                        <span className="text-xs px-2 py-1 rounded font-medium text-green-600 bg-green-100">
                                          {(() => {
                                            const days = event.daysFromStart;
                                            if (days > 365) {
                                              const years = Math.floor(days / 365);
                                              const remainingDays = days % 365;
                                              const months = Math.floor(remainingDays / 30);
                                              const finalDays = remainingDays % 30;
                                              
                                              let result = '';
                                              if (years > 0) result += `${years} year${years !== 1 ? 's' : ''}`;
                                              if (months > 0) {
                                                if (result) result += ', ';
                                                result += `${months} month${months !== 1 ? 's' : ''}`;
                                              }
                                              if (finalDays > 0) {
                                                if (result) result += ', ';
                                                result += `${finalDays} day${finalDays !== 1 ? 's' : ''}`;
                                              }
                                              return result + ' since start';
                                            } else if (days > 30) {
                                              const months = Math.floor(days / 30);
                                              const remainingDays = days % 30;
                                              
                                              let result = '';
                                              if (months > 0) result += `${months} month${months !== 1 ? 's' : ''}`;
                                              if (remainingDays > 0) {
                                                if (result) result += ', ';
                                                result += `${remainingDays} day${remainingDays !== 1 ? 's' : ''}`;
                                              }
                                              return result + ' since start';
                                            } else {
                                              return `${days} days since start`;
                                            }
                                          })()}
                                        </span>
                                      )}
                                      {event.isLinkedEvent && (
                                        <>
                                          <span className="text-xs px-2 py-1 rounded font-medium text-gray-600 bg-gray-100">
                                            Linked
                                          </span>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setUnlinkConfirmation({ isOpen: true, timelineId: note.id, eventId: event.linkedEventId });
                                            }}
                                            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors"
                                            title="Unlink event from timeline"
                                          >
                                            <XMarkIcon className="h-3 w-3 mr-1" />
                                            Unlink
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* Event details - links and photos */}
                                  {(!event.isVirtual || event.isToday) && !event.isTotal && !event.isDuration && (
                                    <div className="ml-0 mt-2 space-y-1">
                                      {event.link && (
                                        <a 
                                          href={event.link} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          className="text-sm text-blue-600 hover:text-blue-800 block"
                                        >
                                          {event.link}
                                        </a>
                                      )}
                                    </div>
                                  )}
                                  
                                </div>
                              </div>
                            </React.Fragment>
                          );
                        })}
                        
                        {/* Date Difference Display - Show when 2 events are selected */}
                        {selectedEvents[note.id] && selectedEvents[note.id].length === 2 && (() => {
                          const [firstIndex, secondIndex] = selectedEvents[note.id];
                          const firstEvent = eventsWithDiffs[firstIndex];
                          const secondEvent = eventsWithDiffs[secondIndex];
                          
                          if (firstEvent && secondEvent && firstEvent.date && secondEvent.date) {
                            const diff = calculateDateDifference(firstEvent.date, secondEvent.date);
                            return (
                              <div className="mt-4 p-4 bg-purple-100 border-2 border-purple-500 rounded-lg">
                                <div className="text-center">
                                  <div className="text-sm text-purple-700 font-medium mb-2">Selected Events Difference</div>
                                  <div className="text-2xl font-bold text-purple-900">
                                    {diff}
                                  </div>
                                  <div className="text-xs text-purple-600 mt-1">
                                    Between: {firstEvent.event} and {secondEvent.event}
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                        
                        {/* Preview at end - if new event should be after last event */}
                        {(() => {
                          if (showAddEventForm !== note.id || !newEventDate || eventsWithDiffs.length === 0) {
                            return null;
                          }
                          
                          const newEventMoment = moment(newEventDate);
                          const lastEvent = eventsWithDiffs[eventsWithDiffs.length - 1];
                          const shouldShowAtEnd = lastEvent && 
                            lastEvent.date && 
                            newEventMoment.isAfter(lastEvent.date);
                          
                          if (!shouldShowAtEnd) {
                            return null;
                          }
                          
                          const showEndYearHeader = lastEvent.date && lastEvent.date.year() !== newEventMoment.year();
                          
                          return (
                            <>
                              {showEndYearHeader && (
                                <div className="flex items-center space-x-4 mb-4">
                                  <div className="w-4 h-4"></div>
                                  <div className="flex-1">
                                    <h2 className="text-2xl font-bold text-blue-800 border-b-2 border-blue-300 pb-2">
                                      {newEventMoment.year()}
                                    </h2>
                                      </div>
                                    </div>
                                  )}
                              
                              <div className="opacity-50 border border-blue-400 bg-blue-50 rounded-md p-4 border-dashed">
                                <div className="flex items-start space-x-4">
                                  <div className="flex flex-col items-center">
                                    <div className="w-4 h-4 rounded-full border-2 bg-blue-400 border-blue-400 animate-pulse"></div>
                                </div>
                                  <div className="flex-1">
                                    <div className="flex items-center space-x-3 mb-1">
                                      <span className="text-sm text-gray-500 bg-blue-100 px-2 py-1 rounded font-medium">
                                        {newEventMoment.format('DD/MMM/YYYY')}
                                      </span>
                                      <h3 className="text-lg font-semibold text-gray-900 italic">
                                        {newEventText || 'New Event Preview'}
                                      </h3>
                              </div>
                                  </div>
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }
  return null;
})()}
            
        
          </div>
          </div>
        )}

        {/* New Timeline Form Modal */}
        {showNewTimelineForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Start New Timeline</h3>
                <button
                  onClick={() => {
                    setShowNewTimelineForm(false);
                    setNewTimelineTitle('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timeline Title
                  </label>
                  <input
                    type="text"
                    value={newTimelineTitle}
                    onChange={(e) => setNewTimelineTitle(e.target.value)}
                    placeholder="e.g., Project Alpha, Vacation 2025"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    autoFocus
                  />
                </div>
                
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleCreateTimeline}
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-400 text-white rounded-md hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-400"
                  >
                    <PlusIcon className="h-4 w-4" />
                    <span>Create Timeline</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowNewTimelineForm(false);
                      setNewTimelineTitle('');
                    }}
                    className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Event Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={deleteEventConfirmation.isOpen}
          onClose={() => setDeleteEventConfirmation({ isOpen: false, timelineId: null, eventIndex: null, eventName: null })}
          onConfirm={() => {
            if (deleteEventConfirmation.timelineId !== null && deleteEventConfirmation.eventIndex !== null) {
              handleDeleteEvent(deleteEventConfirmation.timelineId, deleteEventConfirmation.eventIndex);
            }
          }}
          title="Delete Event"
          message={`Are you sure you want to delete "${deleteEventConfirmation.eventName || 'this event'}" from the timeline? This action cannot be undone.`}
          confirmButtonText="Delete"
        />

        {/* Unlink Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={unlinkConfirmation.isOpen}
          onClose={() => setUnlinkConfirmation({ isOpen: false, timelineId: null, eventId: null })}
          onConfirm={() => {
            if (unlinkConfirmation.timelineId && unlinkConfirmation.eventId) {
              handleUnlinkEvent(unlinkConfirmation.timelineId, unlinkConfirmation.eventId);
            }
            setUnlinkConfirmation({ isOpen: false, timelineId: null, eventId: null });
          }}
          title="Unlink Event"
          message="Are you sure you want to unlink this event from the timeline?"
          confirmButtonText="Unlink"
        />

        {/* Add Event Modal */}
        <EditEventModal
          isOpen={showEditEventModal}
          note={editingEventId ? notes.find(n => n.id === editingEventId) : (convertingEvent ? {
            id: null,
            content: `event_description: ${convertingEvent.event.event}\nevent_date: ${convertingEvent.event.date.format('YYYY-MM-DD')}${convertingEvent.event.dollarAmount && convertingEvent.event.dollarAmount > 0 ? `\nevent_$: ${convertingEvent.event.dollarAmount.toFixed(2)}` : ''}\nmeta::linked_to_timeline::${convertingEvent.timelineId}`
          } : null)}
          onSave={async (content) => {
            devLog('[Timelines] onSave called with content:', content.substring(0, 100));
            const timelineId = editingTimelineId; // Capture before reset
            const eventId = editingEventId; // Capture before reset
            const isConverting = !!convertingEvent; // Capture before reset
            devLog('[Timelines] Editing timeline ID:', timelineId, 'Event ID:', eventId, 'Is Converting:', isConverting);
            
            if (eventId) {
              // Editing existing event
              try {
                await updateNoteById(eventId, content);
                // Update the note in the notes array
                if (updateNote) {
                  updateNote(eventId, content);
                }
                devLog('[Timelines] Event updated:', eventId);
                setShowEditEventModal(false);
                setEditingEventId(null);
                setEditingTimelineId(null);
                setConvertingEvent(null);
              } catch (error) {
                console.error('[Timelines] Error updating event:', error);
                alert('Failed to update event. Please try again.');
              }
            } else {
              // Creating new event (either from Add Event or Convert to Event)
              // Ensure timeline link is added if converting
              let finalContent = content;
              if (isConverting && timelineId && !content.includes(`meta::linked_to_timeline::${timelineId}`)) {
                finalContent = content + `\nmeta::linked_to_timeline::${timelineId}`;
              }
              
              const result = await handleAddEventFromTimeline(finalContent);
              devLog('[Timelines] Event created, result:', result?.id);
              
              // If converting, also update the timeline note to link the event
              if (isConverting && timelineId && result?.id) {
                try {
                  const timelineNote = timelineNotes.find(n => n.id === timelineId);
                  if (timelineNote) {
                    const timelineContent = timelineNote.content;
                    const linkedEventsLine = timelineContent.split('\n').find(line => line.startsWith('meta::linked_from_events::'));
                    
                    let updatedContent = timelineContent;
                    if (linkedEventsLine) {
                      // Append to existing linked events
                      const existingIds = linkedEventsLine.replace('meta::linked_from_events::', '').trim().split(',').map(id => id.trim()).filter(id => id);
                      if (!existingIds.includes(result.id)) {
                        updatedContent = timelineContent.replace(
                          linkedEventsLine,
                          `${linkedEventsLine}, ${result.id}`
                        );
                      }
                    } else {
                      // Add new linked events line
                      updatedContent = timelineContent + `\nmeta::linked_from_events::${result.id}`;
                    }
                    
                    await updateNoteById(timelineId, updatedContent);
                    handleTimelineUpdated(timelineId, updatedContent);
                  }
                } catch (error) {
                  console.error('[Timelines] Error linking converted event to timeline:', error);
                }
              }
              
              setShowEditEventModal(false);
              devLog('[Timelines] Closed edit modal');
              
              // Ensure timeline stays open after adding event
              if (timelineId) {
                setCollapsedTimelines(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(timelineId);
                  saveCollapseStates(newSet);
                  devLog('[Timelines] Expanded timeline:', timelineId);
                  return newSet;
                });
              }
              
              setEditingTimelineId(null);
              setConvertingEvent(null);
              devLog('[Timelines] Reset editing timeline ID');
              
              // The handleTimelineUpdated callback will refresh timelineNotes
              // But we also refresh here as a fallback after a delay
              // Include the new event note in the notes array
              setTimeout(() => {
                devLog('[Timelines] setTimeout fallback refresh triggered');
                devLog('[Timelines] Result:', result);
                devLog('[Timelines] Current notes length:', notes.length);
                devLog('[Timelines] Notes includes result:', notes.find(n => n.id === result?.id) ? 'YES' : 'NO');
                
                const updatedNotes = result && !notes.find(n => n.id === result.id)
                  ? [...notes, result]
                  : notes;
                
                devLog('[Timelines] Updated notes length:', updatedNotes.length);
                
                const filteredNotes = updatedNotes
                  .filter(note => note.content && note.content.includes('meta::timeline'))
                  .map(note => {
                    const timelineData = parseTimelineData(note.content, updatedNotes);
                    return {
                      ...note,
                      ...timelineData,
                      isFlagged: note.content.includes('meta::flagged_timeline'),
                      isTracked: note.content.includes('meta::tracked')
                    };
                  });
                
                devLog('[Timelines] Filtered timeline notes count:', filteredNotes.length);
                setTimelineNotes(filteredNotes);
              }, 500);
              
              return result;
            }
          }}
          onTimelineUpdated={(timelineId, updatedContent) => {
            //console.log('[Timelines] onTimelineUpdated callback invoked:', { timelineId, updatedContentLength: updatedContent?.length });
            //console.log('[Timelines] Updated content preview:', updatedContent?.substring(0, 200));
            // Pass the new event note to handleTimelineUpdated
            // We need to get it from the onSave result, but we can't access it here
            // So we'll refresh in onSave instead
            handleTimelineUpdated(timelineId, updatedContent);
          }}
          onCancel={() => {
            setShowEditEventModal(false);
            setEditingEventId(null);
            setEditingTimelineId(null);
            setConvertingEvent(null);
            setFocusOnNotesField(false);
          }}
          onSwitchToNormalEdit={() => {
            setShowEditEventModal(false);
            setEditingTimelineId(null);
            setEditingEventId(null);
            setConvertingEvent(null);
            setFocusOnNotesField(false);
          }}
          onDelete={() => {
            // Delete not applicable for new events
          }}
          notes={notes}
          initialTimelineId={editingTimelineId}
          focusOnNotesField={focusOnNotesField}
        />

        {/* Master Timeline Modal */}
        {showMasterTimelineModal && (() => {
          // Dynamically calculate master timeline when modal opens
          const selectedYear = masterTimelineYear;
          const selectedMonth = masterTimelineMonth;
          const masterTimelineId = `master-timeline-${selectedYear}`;
          
          // Collect all events from all timelines for the selected year
          const allEvents = [];
          
          // Use the full notes array to get content
          const notesToUse = getNotesWithNewEvent();
          
          timelineNotes.forEach((note) => {
            // Find the full note with content
            const fullNote = notesToUse.find(n => n.id === note.id);
            if (!fullNote || !fullNote.content) return;
            
            const timelineData = parseTimelineData(fullNote.content, notesToUse);
            const timelineName = timelineData.timeline || note.timeline || 'Untitled Timeline';
            
            timelineData.events.forEach((event) => {
              if (event.date && event.date.year() === selectedYear) {
                // Apply month filter if not 'all'
                if (selectedMonth === 'all' || event.date.month() === parseInt(selectedMonth)) {
                  allEvents.push({
                    ...event,
                    sourceTimelineName: timelineName
                  });
                }
              }
            });
          });
          
          // Sort events by date
          allEvents.sort((a, b) => {
            if (!a.date && !b.date) return 0;
            if (!a.date) return 1;
            if (!b.date) return -1;
            return a.date.diff(b.date);
          });
          
          // Calculate total dollar amount
          const totalDollarAmount = allEvents.reduce((sum, event) => {
            return sum + (event.dollarAmount || 0);
          }, 0);
          
          const eventsWithDiffs = calculateTimeDifferences(allEvents, false, totalDollarAmount);
          const filteredEvents = filterEventsBySearch(eventsWithDiffs, masterTimelineModalSearchQuery);
          
          return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-5xl mx-4 max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Master Timeline - {selectedYear} ({allEvents.length} events)
                  </h3>
                  <button
                    onClick={() => {
                      setShowMasterTimelineModal(false);
                      setMasterTimelineModalSearchQuery('');
                      setMasterTimelineYear(new Date().getFullYear());
                      setMasterTimelineMonth('all');
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                
                {/* Year and Month Filters */}
                <div className="mb-4 flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setMasterTimelineYear(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-400 bg-white text-sm"
                    >
                      {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setMasterTimelineMonth(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-400 bg-white text-sm"
                    >
                      <option value="all">All Months</option>
                      <option value="0">January</option>
                      <option value="1">February</option>
                      <option value="2">March</option>
                      <option value="3">April</option>
                      <option value="4">May</option>
                      <option value="5">June</option>
                      <option value="6">July</option>
                      <option value="7">August</option>
                      <option value="8">September</option>
                      <option value="9">October</option>
                      <option value="10">November</option>
                      <option value="11">December</option>
                    </select>
                  </div>
                </div>
                
                {/* Search */}
                <div className="mb-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={masterTimelineModalSearchQuery}
                      onChange={(e) => setMasterTimelineModalSearchQuery(e.target.value)}
                      placeholder="Search events in master timeline..."
                      className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-400 bg-white text-sm"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    {masterTimelineModalSearchQuery && (
                      <button
                        onClick={() => setMasterTimelineModalSearchQuery('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Timeline Content */}
                <div className="flex-1 overflow-y-auto">
                  {filteredEvents.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      {masterTimelineModalSearchQuery ? (
                        <p>No events found matching "{masterTimelineModalSearchQuery}"</p>
                      ) : (
                        <p>No events found for {selectedMonth === 'all' ? selectedYear : `${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][parseInt(selectedMonth)]} ${selectedYear}`}</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredEvents.map((event, index) => {
                        const eventDate = event.date;
                        const previousEvent = index > 0 ? filteredEvents[index - 1] : null;
                        const previousEventDate = previousEvent && previousEvent.date ? previousEvent.date : null;
                        
                        // Check for month change
                        const currentMonth = eventDate ? eventDate.month() : null;
                        const currentYear = eventDate ? eventDate.year() : null;
                        const previousMonth = previousEventDate ? previousEventDate.month() : null;
                        const previousYear = previousEventDate ? previousEventDate.year() : null;
                        const showMonthHeader = currentMonth !== null && (currentMonth !== previousMonth || currentYear !== previousYear);
                        
                        return (
                          <React.Fragment key={`${event.event}-${index}`}>
                            {/* Month Header */}
                            {showMonthHeader && (
                              <div className="flex items-center space-x-4 mb-4">
                                <div className="w-4 h-4"></div>
                                <div className="flex-1">
                                  <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent border-b-2 border-purple-300 pb-2">
                                    {eventDate ? eventDate.format('MMMM YYYY') : ''}
                                  </h2>
                                </div>
                              </div>
                            )}
                            
                            {/* Event */}
                            <div className="flex items-start space-x-4">
                              {/* Timeline connector */}
                              <div className="flex flex-col items-center">
                                <div className={`w-4 h-4 rounded-full border-2 ${
                                  event.isToday
                                    ? 'bg-emerald-500 border-emerald-600'
                                    : event.isTotal
                                    ? 'bg-emerald-600 border-emerald-600'
                                    : event.isDuration
                                      ? 'bg-orange-500 border-orange-500'
                                      : event.isLinkedEvent
                                        ? 'bg-indigo-500 border-indigo-500'
                                        : event.isVirtual
                                          ? 'bg-purple-500 border-purple-500'
                                          : index === 0 
                                            ? 'bg-emerald-500 border-emerald-500' 
                                            : 'bg-blue-500 border-blue-500'
                                }`}></div>
                                {index < filteredEvents.length - 1 && (
                                  <div className="w-0.5 h-8 bg-gray-300 mt-2"></div>
                                )}
                              </div>
                              
                              {/* Event content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-3 mb-1">
                                  {eventDate && (
                                    <span className={`text-sm px-2 py-1 rounded font-medium ${
                                      event.isToday 
                                        ? 'text-emerald-800 bg-emerald-100 border border-emerald-200' 
                                        : 'text-slate-600 bg-slate-100 border border-slate-200'
                                    }`}>
                                      {eventDate.format('DD/MMM/YYYY (ddd)')}
                                    </span>
                                  )}
                                  <div className="flex items-center gap-2 flex-1">
                                    {event.isLinkedEvent ? (
                                      <div className="flex items-center gap-2 flex-1">
                                        <h3 className={`text-lg font-semibold flex-1 ${
                                          event.isToday
                                            ? 'text-emerald-700 font-bold'
                                            : event.isTotal
                                            ? 'text-emerald-700 font-bold'
                                            : event.isDuration
                                              ? 'text-orange-600 font-bold'
                                              : 'text-indigo-600 font-semibold'
                                        }`}>
                                          {(() => {
                                            const eventName = event.isTotal || event.isDuration ? (
                                              <span title={event.event.length > 50 ? event.event : undefined}>
                                                {truncateText(event.event)}
                                              </span>
                                            ) : (
                                              (() => {
                                                const formatted = formatEventHeaderWithAmount(event.event.charAt(0).toUpperCase() + event.event.slice(1));
                                                const displayText = formatted.hasAmount ? formatted.text : formatted.description;
                                                return (
                                                  <span 
                                                    title={event.event.length > 50 ? event.event : undefined}
                                                    dangerouslySetInnerHTML={{
                                                      __html: formatted.hasAmount 
                                                        ? highlightDollarValues(displayText)
                                                        : highlightDollarValues(truncateText(event.event.charAt(0).toUpperCase() + event.event.slice(1)))
                                                    }}
                                                  />
                                                );
                                              })()
                                            );
                                            
                                            if (event.sourceTimelineName) {
                                              return (
                                                <>
                                                  <span className="font-medium text-purple-600">{event.sourceTimelineName}</span>
                                                  <span className="text-gray-500 mx-1">-</span>
                                                  {eventName}
                                                </>
                                              );
                                            }
                                            
                                            return eventName;
                                          })()}
                                        </h3>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const eventNote = notes.find(n => n.id === event.linkedEventId);
                                            if (eventNote) {
                                              setEditingEventId(event.linkedEventId);
                                              setEditingTimelineId(null);
                                              setShowEditEventModal(true);
                                              setShowMasterTimelineModal(false);
                                            }
                                          }}
                                          className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline px-2 py-1 rounded transition-colors whitespace-nowrap"
                                          title="Edit event"
                                        >
                                          edit
                                        </button>
                                        {eventDate && (
                                          <a
                                            href={`https://photos.google.com/search/${eventDate.format('YYYY-MM-DD')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="text-purple-600 hover:text-purple-800 p-1 rounded transition-colors"
                                            title="View photos"
                                          >
                                            <PhotoIcon className="h-4 w-4" />
                                          </a>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2 flex-1">
                                        <h3 className={`text-lg font-semibold flex-1 ${
                                          event.isToday
                                            ? 'text-emerald-700 font-bold'
                                            : event.isTotal
                                            ? 'text-emerald-700 font-bold'
                                            : event.isDuration
                                              ? 'text-orange-600 font-bold'
                                              : event.isVirtual 
                                                ? 'text-violet-600' 
                                                : 'text-slate-800'
                                        }`}>
                                          {(() => {
                                            const eventName = event.isTotal || event.isDuration ? (
                                              <span title={event.event.length > 50 ? event.event : undefined}>
                                                {truncateText(event.event)}
                                              </span>
                                            ) : (
                                              (() => {
                                                const formatted = formatEventHeaderWithAmount(event.event.charAt(0).toUpperCase() + event.event.slice(1));
                                                const displayText = formatted.hasAmount ? formatted.text : formatted.description;
                                                return (
                                                  <span 
                                                    title={event.event.length > 50 ? event.event : undefined}
                                                    dangerouslySetInnerHTML={{
                                                      __html: formatted.hasAmount 
                                                        ? highlightDollarValues(displayText)
                                                        : highlightDollarValues(truncateText(event.event.charAt(0).toUpperCase() + event.event.slice(1)))
                                                    }}
                                                  />
                                                );
                                              })()
                                            );
                                            
                                            if (event.sourceTimelineName) {
                                              return (
                                                <>
                                                  <span className="font-medium text-purple-600">{event.sourceTimelineName}</span>
                                                  <span className="text-gray-500 mx-1">-</span>
                                                  {eventName}
                                                </>
                                              );
                                            }
                                            
                                            return eventName;
                                          })()}
                                        </h3>
                                        {eventDate && (
                                          <a
                                            href={`https://photos.google.com/search/${eventDate.format('YYYY-MM-DD')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="text-purple-600 hover:text-purple-800 p-1 rounded transition-colors"
                                            title="View photos"
                                          >
                                            <PhotoIcon className="h-4 w-4" />
                                          </a>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Second line with age and time differences */}
                                {(!event.isVirtual || event.isToday) && !event.isTotal && !event.isDuration && (
                                  <div className="flex items-center space-x-2 mb-1">
                                    {eventDate && (
                                      <span className="text-xs px-2 py-1 rounded font-medium text-gray-600 bg-gray-100">
                                        {calculateAge(eventDate)}
                                      </span>
                                    )}
                                    {(() => {
                                      const today = moment();
                                      const isFuture = eventDate && eventDate.isAfter(today);
                                      
                                      if (isFuture && eventDate) {
                                        const daysToEvent = eventDate.diff(today, 'days');
                                        return (
                                          <span className="text-xs px-2 py-1 rounded font-medium text-blue-600 bg-blue-100">
                                            {daysToEvent === 0 ? 'Today' : daysToEvent === 1 ? 'Tomorrow' : `In ${daysToEvent} days`}
                                          </span>
                                        );
                                      }
                                      
                                      if (event.timeDiff) {
                                        return (
                                          <span className="text-xs px-2 py-1 rounded font-medium text-slate-600 bg-slate-100">
                                            {event.timeDiff}
                                          </span>
                                        );
                                      }
                                      
                                      return null;
                                    })()}
                                  </div>
                                )}
                                
                                {/* Dollar amount */}
                                {(event.dollarAmount !== null && event.dollarAmount !== undefined && event.dollarAmount > 0) && (
                                  <div className="text-sm font-semibold text-emerald-600">
                                    ${event.dollarAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Link Event Modal */}
        {linkEventModal.isOpen && (() => {
          // Get all event notes (exclude timeline notes)
          const allEventNotes = notes.filter(note => 
            note.content && 
            note.content.includes('event_description:') && 
            !note.content.includes('meta::timeline')
          );

          // Parse events
          const parsedEvents = allEventNotes.map(note => {
            const lines = note.content.split('\n');
            const descriptionLine = lines.find(line => line.startsWith('event_description:'));
            const dateLine = lines.find(line => line.startsWith('event_date:'));
            const description = descriptionLine ? descriptionLine.replace('event_description:', '').trim() : '';
            const eventDate = dateLine ? dateLine.replace('event_date:', '').trim() : '';
            
            return {
              id: note.id,
              description,
              date: eventDate,
              content: note.content
            };
          });

          // Filter events based on search query
          const filteredEvents = linkEventModal.searchQuery.trim() === ''
            ? parsedEvents
            : parsedEvents.filter(event => {
                const query = linkEventModal.searchQuery.toLowerCase();
                return event.description.toLowerCase().includes(query) ||
                       (event.date && event.date.toLowerCase().includes(query));
              });

          return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Link Event to Timeline</h3>
                  <button
                    onClick={() => setLinkEventModal({ isOpen: false, timelineId: null, searchQuery: '', selectedEventId: null })}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="mb-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={linkEventModal.searchQuery}
                      onChange={(e) => setLinkEventModal({ ...linkEventModal, searchQuery: e.target.value, selectedEventId: null })}
                      placeholder="Search events..."
                      className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      autoFocus
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto mb-4 border border-gray-200 rounded-md">
                  {filteredEvents.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      {linkEventModal.searchQuery.trim() === '' 
                        ? 'No events found' 
                        : `No events found matching "${linkEventModal.searchQuery}"`}
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {filteredEvents.map((event) => (
                        <div
                          key={event.id}
                          onClick={() => setLinkEventModal({ ...linkEventModal, selectedEventId: event.id })}
                          className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                            linkEventModal.selectedEventId === event.id ? 'bg-purple-50 border-l-4 border-purple-500' : ''
                          }`}
                        >
                          <div className="font-medium text-gray-900">{event.description || 'Untitled Event'}</div>
                          {event.date && (
                            <div className="text-sm text-gray-500 mt-1">
                              {new Date(event.date).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => setLinkEventModal({ isOpen: false, timelineId: null, searchQuery: '', selectedEventId: null })}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!linkEventModal.selectedEventId || !linkEventModal.timelineId) {
                        alert('Please select an event to link');
                        return;
                      }

                      try {
                        const eventId = linkEventModal.selectedEventId;
                        const timelineId = linkEventModal.timelineId;

                        // Find the event note
                        const eventNote = notes.find(note => note.id === eventId);
                        if (!eventNote) {
                          alert('Event note not found. Please try again.');
                          return;
                        }

                        // Find the timeline note
                        const timelineNote = notes.find(note => note.id === timelineId);
                        if (!timelineNote) {
                          alert('Timeline note not found. Please try again.');
                          return;
                        }

                        // Check if already linked to avoid duplicates
                        const existingEventLink = `meta::linked_to_timeline::${timelineId}`;
                        if (eventNote.content.includes(existingEventLink)) {
                          alert('Event is already linked to this timeline');
                          setLinkEventModal({ isOpen: false, timelineId: null, searchQuery: '', selectedEventId: null });
                          return;
                        }

                        // 1. Add meta::linked_to_timeline::<timeline_id> to the event note
                        const updatedEventContent = eventNote.content.trim() + '\n' + existingEventLink;
                        const updatedEventResponse = await updateNoteById(eventId, updatedEventContent);
                        
                        // Notify parent component that event was updated
                        if (updateNote && updatedEventResponse) {
                          updateNote(eventId, updatedEventResponse.content || updatedEventContent);
                        }

                        // 2. Add meta::linked_from_events::<event_id> to the timeline note
                        // Fetch the latest timeline note from server to avoid stale data
                        let latestTimelineNote;
                        try {
                          latestTimelineNote = await getNoteById(timelineId);
                        } catch (fetchError) {
                          console.error('[Timelines] Error fetching latest timeline note:', fetchError);
                          latestTimelineNote = timelineNote;
                        }
                        
                        const latestTimelineContent = latestTimelineNote?.content || timelineNote.content;
                        const lines = latestTimelineContent.split('\n');
                        
                        // Process all lines: split comma-separated linked_from_events lines and collect unique event IDs
                        const otherLines = [];
                        const allLinkedEventIds = new Set();
                        
                        lines.forEach((line) => {
                          if (line.trim().startsWith('meta::linked_from_events::')) {
                            const eventIdsString = line.replace('meta::linked_from_events::', '').trim();
                            const eventIds = eventIdsString.split(',').map(id => id.trim()).filter(id => id);
                            eventIds.forEach(id => allLinkedEventIds.add(id));
                          } else {
                            otherLines.push(line);
                          }
                        });
                        
                        // Check if this event is already linked
                        if (allLinkedEventIds.has(eventId)) {
                          alert('Event is already linked to this timeline');
                          setLinkEventModal({ isOpen: false, timelineId: null, searchQuery: '', selectedEventId: null });
                          return;
                        }
                        
                        // Add the new event ID
                        allLinkedEventIds.add(eventId);
                        
                        // Build the updated content with each event ID on its own line
                        let updatedTimelineContent = otherLines.join('\n').trim();
                        if (allLinkedEventIds.size > 0) {
                          const linkedEventLines = Array.from(allLinkedEventIds).map(eventId => 
                            `meta::linked_from_events::${eventId}`
                          );
                          updatedTimelineContent = updatedTimelineContent + '\n' + linkedEventLines.join('\n');
                        }

                        const updatedTimelineResponse = await updateNoteById(timelineId, updatedTimelineContent);
                        
                        // Notify parent component that timeline was updated
                        if (handleTimelineUpdated && updatedTimelineResponse) {
                          handleTimelineUpdated(timelineId, updatedTimelineResponse.content || updatedTimelineContent);
                        }

                        // Update the notes array
                        if (updateNote && updatedTimelineResponse) {
                          updateNote(timelineId, updatedTimelineResponse.content || updatedTimelineContent);
                        }

                        //console.log('Successfully linked event to timeline');
                        setLinkEventModal({ isOpen: false, timelineId: null, searchQuery: '', selectedEventId: null });
                      } catch (error) {
                        console.error('[Timelines] Error linking event to timeline:', error);
                        alert(`Failed to link event to timeline: ${error.message || 'Unknown error'}. Please check the console for details.`);
                      }
                    }}
                    disabled={!linkEventModal.selectedEventId}
                    className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Link
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Add Link Modal */}
        {addLinkModal.isOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {addLinkModal.currentLink ? 'Edit Link' : 'Add Link'}
                </h3>
                <button
                  onClick={() => setAddLinkModal({ isOpen: false, timelineId: null, eventIndex: null, currentLink: '' })}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Link URL
                  </label>
                  <input
                    type="url"
                    value={addLinkModal.currentLink}
                    onChange={(e) => setAddLinkModal({ ...addLinkModal, currentLink: e.target.value })}
                    placeholder="https://example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    autoFocus
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setAddLinkModal({ isOpen: false, timelineId: null, eventIndex: null, currentLink: '' })}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (addLinkModal.timelineId !== null && addLinkModal.eventIndex !== null) {
                      handleAddLink(addLinkModal.timelineId, addLinkModal.eventIndex, addLinkModal.currentLink);
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center gap-2"
                >
                  <LinkIcon className="h-4 w-4" />
                  {addLinkModal.currentLink ? 'Update' : 'Add'} Link
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Compare Events Modal */}
        {compareModal.isOpen && compareModal.sourceEvent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Compare Events
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Comparing with: <span className="font-medium text-purple-600">{compareModal.sourceEvent.event}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    Date: {compareModal.sourceEvent.date.format('DD/MM/YYYY')}
                  </p>
                </div>
                <button
                  onClick={() => setCompareModal({ isOpen: false, sourceEvent: null, sourceTimelineId: null, filterQuery: '' })}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter Events
                </label>
                <input
                  type="text"
                  value={compareModal.filterQuery}
                  onChange={(e) => setCompareModal({ ...compareModal, filterQuery: e.target.value })}
                  placeholder="Search events..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                  autoFocus
                />
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {(() => {
                  // Collect all events from all timelines
                  const allEvents = [];
                  const notesToUse = getNotesWithNewEvent();
                  
                  // Use notes prop to get all timeline notes if timelineNotes is empty or doesn't have content
                  const timelinesSource = timelineNotes && timelineNotes.length > 0 && timelineNotes[0].content 
                    ? timelineNotes 
                    : notesToUse.filter(note => note.content && note.content.includes('meta::timeline'));
                  
                  console.log('[Compare Modal] Timelines source:', timelinesSource.length, 'timelines');
                  
                  timelinesSource.forEach((timeline) => {
                    if (!timeline || !timeline.content) {
                      console.log('[Compare Modal] Skipping timeline without content:', timeline?.id);
                      return;
                    }
                    
                    const timelineData = parseTimelineData(timeline.content, notesToUse);
                    console.log('[Compare Modal] Timeline:', timelineData.timeline, 'Events:', timelineData.events.length);
                    
                    timelineData.events.forEach((event) => {
                      if (event.date && !event.isVirtual && !event.isTotal && !event.isDuration) {
                        // Don't include the source event itself (compare by date and event text)
                        const isSameEvent = event.event === compareModal.sourceEvent.event && 
                                          event.date.isSame(compareModal.sourceEvent.date, 'day');
                        
                        if (!isSameEvent) {
                          allEvents.push({
                            ...event,
                            timelineId: timeline.id,
                            timelineName: timelineData.timeline || 'Untitled Timeline'
                          });
                        }
                      }
                    });
                  });

                  console.log('[Compare Modal] Total events collected:', allEvents.length);

                  // Filter events based on search query
                  const filteredEvents = compareModal.filterQuery
                    ? allEvents.filter(event => 
                        event.event.toLowerCase().includes(compareModal.filterQuery.toLowerCase()) ||
                        event.timelineName.toLowerCase().includes(compareModal.filterQuery.toLowerCase())
                      )
                    : allEvents;

                  console.log('[Compare Modal] Filtered events:', filteredEvents.length, 'Filter query:', compareModal.filterQuery);

                  // Sort by date
                  filteredEvents.sort((a, b) => a.date.diff(b.date));

                  if (filteredEvents.length === 0) {
                    return (
                      <div className="text-center py-8 text-gray-500">
                        <p className="mb-2">No events found</p>
                        <p className="text-xs">Total timelines: {timelinesSource.length}</p>
                        <p className="text-xs">Total events before filter: {allEvents.length}</p>
                      </div>
                    );
                  }

                  return filteredEvents.map((event, index) => {
                    // Calculate difference from source event
                    const daysDiff = event.date.diff(compareModal.sourceEvent.date, 'days');
                    const isBefore = daysDiff < 0;
                    const absDays = Math.abs(daysDiff);
                    
                    // Format the difference
                    let diffText = '';
                    if (absDays === 0) {
                      diffText = 'Same day';
                    } else if (absDays > 365) {
                      const years = Math.floor(absDays / 365);
                      const remainingDays = absDays % 365;
                      const months = Math.floor(remainingDays / 30);
                      const finalDays = remainingDays % 30;
                      
                      let parts = [];
                      if (years > 0) parts.push(`${years} year${years !== 1 ? 's' : ''}`);
                      if (months > 0) parts.push(`${months} month${months !== 1 ? 's' : ''}`);
                      if (finalDays > 0) parts.push(`${finalDays} day${finalDays !== 1 ? 's' : ''}`);
                      
                      diffText = parts.join(', ') + (isBefore ? ' before' : ' after');
                    } else if (absDays > 30) {
                      const months = Math.floor(absDays / 30);
                      const remainingDays = absDays % 30;
                      
                      let parts = [];
                      if (months > 0) parts.push(`${months} month${months !== 1 ? 's' : ''}`);
                      if (remainingDays > 0) parts.push(`${remainingDays} day${remainingDays !== 1 ? 's' : ''}`);
                      
                      diffText = parts.join(', ') + (isBefore ? ' before' : ' after');
                    } else {
                      diffText = `${absDays} day${absDays !== 1 ? 's' : ''} ${isBefore ? 'before' : 'after'}`;
                    }

                    return (
                      <div 
                        key={index}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{event.event}</h4>
                            <p className="text-sm text-gray-600 mt-1">
                              Timeline: {event.timelineName}
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                              Date: {event.date.format('DD/MM/YYYY')}
                            </p>
                          </div>
                          <div className={`text-right ml-4 ${isBefore ? 'text-blue-600' : 'text-green-600'}`}>
                            <div className="text-lg font-semibold">
                              {diffText}
                            </div>
                            <div className="text-xs mt-1">
                              {isBefore ? '← Before' : 'After →'}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              <div className="flex items-center justify-end gap-3 mt-6">
                <button
                  onClick={() => setCompareModal({ isOpen: false, sourceEvent: null, sourceTimelineId: null, filterQuery: '' })}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 p-4 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all duration-300 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          title="Scroll to top"
        >
          <svg 
            className="w-6 h-6" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M5 10l7-7m0 0l7 7m-7-7v18" 
            />
          </svg>
        </button>
      )}
    </div>
  );
};

export default Timelines;
