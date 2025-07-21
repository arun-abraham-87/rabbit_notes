import React, { useState, useMemo, useEffect } from 'react';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [daily, setDaily] = useState(0);
  const [weekly, setWeekly] = useState(0);
  const [monthly, setMonthly] = useState(0);
  const [none, setNone] = useState(0);
  const [showOnlyDeadlines, setShowOnlyDeadlines] = useState(false);
  const [excludePurchases, setExcludePurchases] = useState(true);
  const [isBulkLoadOpen, setIsBulkLoadOpen] = useState(false);
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [pastEventsCount, setPastEventsCount] = useState(0);
  const [showTodaysEventsOnly, setShowTodaysEventsOnly] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchBuffer, setSearchBuffer] = useState('');
  const [selectedEventIndex, setSelectedEventIndex] = useState(-1);
  const [selectedEvent, setSelectedEvent] = useState(null);
  
  // Add keyboard navigation for 't' key to show today's events
  useEffect(() => {
    console.log('Setting up keyboard handler for EventsPage');
    const handleKeyDown = (e) => {
      console.log('EventsPage: Key pressed:', e.key, 'isSearchMode:', isSearchMode, 'target:', e.target.tagName);
      
      // Test if any key is being captured
      if (e.key === 'Enter') {
        console.log('EventsPage: ENTER KEY DETECTED!');
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
          console.log('Direct b key pressed - filtering birthdays and entering focus mode');
          setSelectedTags(['birthday']);
          setIsFocusMode(true);
          return;
        }
        
        if (e.key === 's' && !isSearchMode) {
          e.preventDefault();
          e.stopPropagation();
          console.log('Entering search mode');
          setIsSearchMode(true);
          setSearchBuffer('');
        } else if (isSearchMode && e.key.length === 1) {
          console.log('Search mode active, key pressed:', e.key, 'buffer:', searchBuffer);
          e.preventDefault();
          e.stopPropagation();
          const newBuffer = searchBuffer + e.key;
          console.log('New buffer will be:', newBuffer);
          setSearchBuffer(newBuffer);
          
          // Handle specific search commands
          console.log('Checking commands for buffer:', newBuffer);
          if (newBuffer === 'b') {
            // Show only events with birthday tag (single 'b' command)
            console.log('Setting birthday filter with single b command');
            setSelectedTags(['birthday']);
            setIsSearchMode(false);
            setSearchBuffer('');
          } else if (newBuffer === 'w') {
            // Show only events with wedding tag (single 'w' command)
            console.log('Setting wedding filter with single w command');
            setSelectedTags(['wedding']);
            setIsSearchMode(false);
            setSearchBuffer('');
          } else if (newBuffer === 'h') {
            // Show only events with holiday tag (single 'h' command)
            console.log('Setting holiday filter with single h command');
            setSelectedTags(['holiday']);
            setIsSearchMode(false);
            setSearchBuffer('');
          } else if (newBuffer === 'tr') {
            // Show only events with travel tag (tr command)
            console.log('Setting travel filter with tr command');
            setSelectedTags(['travel']);
            setIsSearchMode(false);
            setSearchBuffer('');
          } else if (newBuffer === 'p') {
            // Show only events with purchase tag (single 'p' command)
            console.log('Setting purchase filter with single p command');
            setSelectedTags(['purchase']);
            setIsSearchMode(false);
            setSearchBuffer('');
          } else if (newBuffer === 'sb') {
            // Show only events with birthday tag (double command)
            console.log('Setting birthday filter with sb command');
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
          console.log('Enter key pressed - opening selected event:', selectedEvent);
          handleEditEvent(selectedEvent);
        } else if (e.key === 'Enter') {
          console.log('Enter pressed but no selected event');
          console.log('selectedEvent:', selectedEvent);
          console.log('selectedEventIndex:', selectedEventIndex);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      console.log('Cleaning up keyboard handler for EventsPage');
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

  // Get all unique tags from events
  const uniqueTags = useMemo(() => {
    const tags = new Set();
    allNotes
      .filter(note => note?.content && note.content.includes('meta::event::'))
      .forEach(note => {
        const { tags: eventTags } = getEventDetails(note.content);
        eventTags.forEach(tag => tags.add(tag));
      });
    const sortedTags = Array.from(tags).sort();
    console.log('Available unique tags:', sortedTags);
    console.log('Available unique tags (lowercase):', sortedTags.map(tag => tag.toLowerCase()));
    return sortedTags;
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

  useEffect(() => {
    const events = getCalendarEvents();
    setCalendarEvents(events);
    setTotal(events.length);
    
    // Reset selectedEventIndex when events change to prevent invalid index
    if (selectedEventIndex >= events.length) {
      setSelectedEventIndex(-1);
    }

    // Calculate past events count
    if (!showOnlyDeadlines) {
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
  }, [allNotes, searchQuery, selectedTags, showOnlyDeadlines, selectedMonth, selectedDay, selectedYear, excludePurchases]);

  const getCalendarEvents = () => {
    // Filter and group events
    const events = allNotes
      .filter(note => note?.content && note.content.includes('meta::event::'))
      .filter(note => {
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
    const { total, daily, weekly, monthly, none } = events.reduce(
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
    const calendarEvents = events.map(event => {
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

  const handleTagClick = (tag) => {
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        // Remove the tag if it's already selected
        return prev.filter(t => t !== tag);
      } else {
        // Add the tag if it's not selected
        return [...prev, tag];
      }
    });
  };

  const handleEditEvent = (event) => {
    console.log('handleEditEvent called with event:', event);
    console.log('Event ID:', event.id);
    console.log('Event content:', event.content);
    console.log('All notes IDs:', allNotes.map(n => n.id));
    
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
    
    console.log('Found original note:', originalNote);
    if (originalNote) {
      // Pass the original note directly to the modal
      setEditingEvent(originalNote);
      setShowEditEventModal(true);
    } else {
      console.log('No original note found for event id:', event.id);
      console.log('Available notes:', allNotes);
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
      console.log('API Response:', response);
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
    setAllNotes(allNotes.map(note => 
      note.id === eventId ? { ...note, content: updatedContent } : note
    ));
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
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-full"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
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
                  Tags: {selectedTags.join(', ')}
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
          {uniqueTags.map(tag => (
            <button
              key={tag}
              onClick={() => handleTagClick(tag)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${selectedTags.includes(tag)
                  ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                }`}
            >
              {tag}
            </button>
          ))}
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
          onDateClick={handleDateClick}
          notes={allNotes}
          onDelete={handleDelete}
          onAddEvent={handleAddEvent}
          selectedEventIndex={selectedEventIndex}
          onEventSelect={(index, event) => {
            console.log('Event selected at index:', index, 'event:', event);
            setSelectedEventIndex(index);
            if (event) {
              setSelectedEvent(event);
            }
          }}
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