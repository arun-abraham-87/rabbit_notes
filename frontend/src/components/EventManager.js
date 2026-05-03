import React, { useState, useEffect, useRef } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, PhotoIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { getAgeInStringFmt } from '../utils/DateUtils';
import { useNavigate } from 'react-router-dom';
import moment from 'moment';
import { updateEventPin, updateNoteById } from '../utils/ApiUtils';
import { getEventDetails } from '../utils/EventUtils';
import { parseTimerMeta, removeTimerMetaLines, withOneTimeTimerDueDate } from '../utils/TimerUtils';

import { DocumentTextIcon } from '@heroicons/react/24/solid';

// Helper function to parse and make links clickable
const parseLinks = (text) => {
  if (!text) return text;

  // Regex patterns for different link formats
  const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  const plainUrlRegex = /(https?:\/\/[^\s]+)/g;

  // First, replace markdown links
  let processedText = text.replace(markdownLinkRegex, (match, label, url) => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">${label}</a>`;
  });

  // Then, replace plain URLs
  processedText = processedText.replace(plainUrlRegex, (match) => {
    // Skip if this URL is already part of a markdown link
    if (processedText.includes(`href="${match}"`)) {
      return match;
    }

    const hostname = match.replace(/^https?:\/\//, '').split('/')[0];
    return `<a href="${match}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">${hostname}</a>`;
  });

  return processedText;
};

// Returns true if the note matches the active filter selection.
// eventFilter may be a string (legacy) or an array of filter names.
// 'others' means: show events that are NOT tagged deadline or holiday.
const matchesEventFilter = (note, eventFilter) => {
  const filters = Array.isArray(eventFilter) ? eventFilter : [eventFilter];
  if (filters.includes('all')) return true;
  const lines = note.content.split('\n');
  const tagsLine = lines.find(l => l.startsWith('event_tags:'));
  const tags = tagsLine ? tagsLine.replace('event_tags:', '').trim().split(',').map(t => t.trim().toLowerCase()) : [];
  return filters.some(f => {
    if (f === 'others') return !tags.includes('deadline') && !tags.includes('holiday');
    return tags.includes(f.toLowerCase());
  });
};

const isEventPinned = (note) => Boolean(note?.content?.split('\n').some(line => line.trim().startsWith('meta::event_pinned')));

const parseUniqueEventTags = (content = '') => {
  const tagsLine = content.split('\n').find(line => line.startsWith('event_tags:'));
  if (!tagsLine) return [];

  const seen = new Set();
  return tagsLine
    .replace('event_tags:', '')
    .trim()
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => {
      if (!tag) return false;
      const normalized = tag.toLowerCase();
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
};

const EventManager = ({ selectedDate, onClose, type = 'all', notes, setNotes, setActivePage, onEditEvent, eventFilter = 'all', eventTextFilter = '', onDeleteNote }) => {
  const navigate = useNavigate();

  const [events, setEvents] = useState(() => {
    try {
      const stored = localStorage.getItem('tempEvents');
      if (stored && stored !== '[]') {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.error('Error loading initial events:', error);
    }
    return [];
  });

  const [displayMode, setDisplayMode] = useState(() => {
    try {
      const stored = localStorage.getItem('eventDisplayMode');
      return stored || 'days';
    } catch (error) {
      console.error('Error loading display mode:', error);
      return 'days';
    }
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [pendingDeleteNoteId, setPendingDeleteNoteId] = useState(null);
  const modalRef = useRef(null);

  // Refs for event card elements (for scroll-to-card)
  const eventCardRefs = useRef({});

  // Format date to YYYY-MM-DD without timezone conversion
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [eventForm, setEventForm] = useState({
    name: '',
    date: selectedDate ? formatDate(selectedDate) : '',
    endDate: '',
    type: 'event', // Add type field with default value 'event'
    bgColor: '#ffffff' // Default background color
  });

  // Helper function to calculate next occurrence for recurring events
  const calculateNextOccurrence = (originalDate, isDeadline = false, isTemporary = false) => {
    if (!originalDate) return null;

    // For deadline and temporary events, don't calculate an anniversary.
    if (isDeadline || isTemporary) {
      return new Date(originalDate);
    }

    const eventDate = new Date(originalDate);
    const now = new Date();
    const currentYear = now.getFullYear();

    // Create a new date with current year
    const nextOccurrence = new Date(eventDate);
    nextOccurrence.setFullYear(currentYear);

    // If the date has already passed this year, use next year
    if (nextOccurrence < now) {
      nextOccurrence.setFullYear(currentYear + 1);
    }

    return nextOccurrence;
  };

  // Get event notes
  const getEventNotes = () => {
    if (!notes) return [];

    const now = new Date();
    now.setHours(0, 0, 0, 0); // Zero out time for accurate comparison

    // Load stored background colors for event notes
    let storedColors = {};
    try {
      const stored = localStorage.getItem('eventNoteColors');
      if (stored) {
        storedColors = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading event note colors:', error);
    }

    return notes
      .filter(note => {
        if (!note?.content) return false;

        // Only include notes with meta::event
        if (!note.content.includes('meta::event')) return false;

        // Exclude notes with "purchase" tag
        const content = note.content.toLowerCase();
        if (content.includes('purchase')) return false;

        // Exclude notes with "life_info", "recurring_payment", or "non_recurring" tags
        const lines = note.content.split('\n');
        const tagsLine = lines.find(line => line.startsWith('event_tags:'));
        if (tagsLine) {
          const tags = tagsLine.replace('event_tags:', '').trim().split(',').map(tag => tag.trim());
          if (tags.some(tag => {
            const lowerTag = tag.toLowerCase();
            return lowerTag === 'life_info' || lowerTag === 'recurring_payment' || lowerTag === 'non_recurring';
          })) return false;
        }

        // Apply filter based on eventFilter (supports string or array)
        return matchesEventFilter(note, eventFilter);
      })
      .filter(note => {
        // Apply text filter if provided
        if (eventTextFilter && eventTextFilter.trim() !== '') {
          const searchTerm = eventTextFilter.toLowerCase();
          const description = note.content.toLowerCase();
          const lines = note.content.split('\n');
          const descriptionLine = lines.find(line => line.startsWith('event_description:'));
          const eventDescription = descriptionLine ? descriptionLine.replace('event_description:', '').trim().toLowerCase() : '';

          // Search in the full content and event description
          return description.includes(searchTerm) || eventDescription.includes(searchTerm);
        }
        return true;
      })
      .map(note => {
        const details = getEventDetails(note.content);

        // Set default background color based on whether it's a deadline
        let defaultColor = '#ffffff'; // white
        if (details.isDeadline) {
          defaultColor = '#f3e8ff'; // purple for deadlines
        }

        return {
          ...note,
          ...details,
          bgColor: storedColors[note.id] || defaultColor // Load stored color or use default
        };
      })
      .filter(event => {
        if (!event.dateTime) return false; // Only include events with valid dates

        // Calculate next occurrence for recurring events
        const nextOccurrence = calculateNextOccurrence(event.dateTime, event.isDeadline, event.isTemporary);
        if (!nextOccurrence) return false;

        // Calculate days until event using the next occurrence
        nextOccurrence.setHours(0, 0, 0, 0);
        const daysUntilEvent = Math.ceil((nextOccurrence - now) / (1000 * 60 * 60 * 24));

        // Only show events with 0 or positive days until event
        return daysUntilEvent >= 0;
      })
      .map(event => {
        // Calculate next occurrence and add it to the event object
        const nextOccurrence = calculateNextOccurrence(event.dateTime, event.isDeadline, event.isTemporary);
        return {
          ...event,
          nextOccurrence: nextOccurrence
        };
      })
      .sort((a, b) => {
        const daysA = Math.ceil((a.nextOccurrence - now) / (1000 * 60 * 60 * 24));
        const daysB = Math.ceil((b.nextOccurrence - now) / (1000 * 60 * 60 * 24));

        // Sort by days until event (ascending) - no special treatment for pinned events
        return daysA - daysB;
      });
  };

  // Helper function to parse timeline notes
  const parseTimelineData = (content) => {
    const lines = content.split('\n');
    const timelineData = {
      title: '',
      firstDate: null,
      isClosed: false,
      totalDollarAmount: 0,
      linkedEventIds: []
    };

    // Check if timeline is closed
    timelineData.isClosed = lines.some(line => line.trim() === 'Closed');

    // Get content lines (non-meta lines, excluding 'Closed')
    const contentLines = lines.filter(line =>
      !line.trim().startsWith('meta::') && line.trim() !== '' && line.trim() !== 'Closed'
    );

    // First line is the title
    if (contentLines.length > 0) {
      timelineData.title = contentLines[0].trim();
    }

    // Calculate total dollar amount from all events
    let totalAmount = 0;
    let firstDateSet = false;

    // Parse events from remaining content lines (skip first line which is title)
    for (let i = 1; i < contentLines.length; i++) {
      const line = contentLines[i].trim();
      // Try to parse event:date format
      const eventMatch = line.match(/^(.+?)\s*:\s*(.+)$/);
      if (eventMatch) {
        const eventText = eventMatch[1].trim();

        // Extract dollar values from event text
        const dollarRegex = /\$[\d,]+(?:\.\d{2})?/g;
        const matches = eventText.match(dollarRegex);
        if (matches) {
          matches.forEach(match => {
            const value = parseFloat(match.replace(/[$,]/g, ''));
            if (!isNaN(value)) {
              totalAmount += value;
            }
          });
        }

        // Get first date (keep the break behavior but only set firstDate once)
        if (!firstDateSet) {
          const dateStr = eventMatch[2].trim();
          // Parse DD/MM/YYYY format
          const dateParts = dateStr.split('/');
          if (dateParts.length === 3) {
            const day = parseInt(dateParts[0], 10);
            const month = parseInt(dateParts[1], 10) - 1;
            const year = parseInt(dateParts[2], 10);
            const parsedDate = new Date(year, month, day);
            if (!isNaN(parsedDate.getTime())) {
              timelineData.firstDate = parsedDate;
              firstDateSet = true; // Mark as set but continue parsing for dollar amounts
            }
          }
        }
      }
    }

    // Extract linked event IDs
    timelineData.linkedEventIds = lines
      .filter(line => line.trim().startsWith('meta::linked_from_events::'))
      .map(line => line.replace('meta::linked_from_events::', '').trim());

    timelineData.totalDollarAmount = totalAmount;
    return timelineData;
  };

  // Helper function to calculate timeline display text
  const calculateTimelineDisplayText = (daysSince) => {
    let timeUnit, displayText;

    switch (displayMode) {
      case 'weeks':
        const weeks = Math.floor(daysSince / 7);
        const remainingDays = daysSince % 7;
        timeUnit = 'weeks';
        displayText = weeks > 0 ? `${weeks} week${weeks !== 1 ? 's' : ''}${remainingDays > 0 ? ` ${remainingDays} day${remainingDays !== 1 ? 's' : ''}` : ''}` : `${remainingDays} day${remainingDays !== 1 ? 's' : ''}`;
        break;
      case 'months':
        const months = Math.floor(daysSince / 30.44);
        const remainingDaysInMonth = Math.floor(daysSince % 30.44);
        timeUnit = 'months';
        displayText = months > 0 ? `${months} month${months !== 1 ? 's' : ''}${remainingDaysInMonth > 0 ? ` ${remainingDaysInMonth} day${remainingDaysInMonth !== 1 ? 's' : ''}` : ''}` : `${remainingDaysInMonth} day${remainingDaysInMonth !== 1 ? 's' : ''}`;
        break;
      case 'years':
        const years = Math.floor(daysSince / 365.25);
        const remainingDaysInYear = Math.floor(daysSince % 365.25);
        const monthsInYear = Math.floor(remainingDaysInYear / 30.44);
        timeUnit = 'years';
        if (years > 0) {
          displayText = `${years} year${years !== 1 ? 's' : ''}${monthsInYear > 0 ? ` ${monthsInYear} month${monthsInYear !== 1 ? 's' : ''}` : ''}`;
        } else {
          displayText = monthsInYear > 0 ? `${monthsInYear} month${monthsInYear !== 1 ? 's' : ''}` : `${remainingDaysInYear} day${remainingDaysInYear !== 1 ? 's' : ''}`;
        }
        break;
      default:
        timeUnit = 'days';
        displayText = `${daysSince} day${daysSince !== 1 ? 's' : ''}`;
    }

    return { timeUnit, displayText };
  };

  // Helper function to get timeline notes
  const getTimelineNotes = () => {
    if (!notes) return [];

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    return notes
      .filter(note => {
        if (!note?.content) return false;
        return note.content.includes('meta::timeline::');
      })
      .filter(note => {
        // Only include tracked timelines
        return note.content.includes('meta::tracked');
      })
      .map(note => {
        const timelineData = parseTimelineData(note.content);
        return {
          id: note.id,
          title: timelineData.title,
          firstDate: timelineData.firstDate,
          linkedEventIds: timelineData.linkedEventIds,
          isClosed: timelineData.isClosed,
          totalDollarAmount: timelineData.totalDollarAmount,
          content: note.content
        };
      })
      .map(timeline => {
        // Find earliest date from linked events
        let earliestDate = timeline.firstDate;

        if (timeline.linkedEventIds && timeline.linkedEventIds.length > 0) {
          timeline.linkedEventIds.forEach(linkedId => {
            const linkedNote = notes.find(n => n.id.toString() === linkedId.toString());
            if (linkedNote && linkedNote.content) {
              const eventDateMatch = linkedNote.content.match(/event_date:(.+)/);
              if (eventDateMatch) {
                const linkedDateStr = eventDateMatch[1].trim();
                const linkedDate = new Date(linkedDateStr);
                if (!isNaN(linkedDate.getTime())) {
                  if (!earliestDate || linkedDate < earliestDate) {
                    earliestDate = linkedDate;
                  }
                }
              }
            }
          });
        }

        return {
          ...timeline,
          firstDate: earliestDate
        };
      })
      .filter(note => {
        // Only include non-closed timelines with valid dates
        return !note.isClosed && note.firstDate && note.firstDate <= now;
      })
      .map(note => {
        // Calculate days since start
        const daysSince = Math.floor((now - note.firstDate) / (1000 * 60 * 60 * 24));
        return {
          ...note,
          daysSince: daysSince
        };
      })
      .sort((a, b) => b.daysSince - a.daysSince); // Sort by most recent first
  };

  // Helper function to get pinned events only (doesn't limit to top 10)
  const getPinnedEventNotes = () => {
    if (!notes) return [];

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Load stored background colors for event notes
    let storedColors = {};
    try {
      const stored = localStorage.getItem('eventNoteColors');
      if (stored) {
        storedColors = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading event note colors:', error);
    }

    return notes
      .filter(note => {
        if (!note?.content) return false;
        if (!note.content.includes('meta::event')) return false;
        return isEventPinned(note);
      })
      .filter(note => {
        const content = note.content.toLowerCase();
        if (content.includes('purchase')) return false;

        // Apply filter based on eventFilter
        if (eventFilter === 'all') {
          return true;
        } else if (eventFilter === 'deadline') {
          const lines = note.content.split('\n');
          const tagsLine = lines.find(line => line.startsWith('event_tags:'));
          if (tagsLine) {
            const tags = tagsLine.replace('event_tags:', '').trim().split(',').map(tag => tag.trim());
            return tags.some(tag => tag.toLowerCase() === 'deadline');
          }
          return false;
        } else if (eventFilter === 'holiday') {
          const lines = note.content.split('\n');
          const tagsLine = lines.find(line => line.startsWith('event_tags:'));
          if (tagsLine) {
            const tags = tagsLine.replace('event_tags:', '').trim().split(',').map(tag => tag.trim());
            return tags.some(tag => tag.toLowerCase() === 'holiday');
          }
          return false;
        }
        return true;
      })
      .filter(note => {
        if (eventTextFilter && eventTextFilter.trim() !== '') {
          const searchTerm = eventTextFilter.toLowerCase();
          const description = note.content.toLowerCase();
          const lines = note.content.split('\n');
          const descriptionLine = lines.find(line => line.startsWith('event_description:'));
          const eventDescription = descriptionLine ? descriptionLine.replace('event_description:', '').trim().toLowerCase() : '';

          return description.includes(searchTerm) || eventDescription.includes(searchTerm);
        }
        return true;
      })
      .map(note => {
        const details = getEventDetails(note.content);
        let defaultColor = '#ffffff';
        if (details.isDeadline) {
          defaultColor = '#f3e8ff';
        }
        return {
          ...note,
          ...details,
          bgColor: storedColors[note.id] || defaultColor
        };
      })
      .filter(event => {
        if (!event.dateTime) return false;
        const nextOccurrence = calculateNextOccurrence(event.dateTime, event.isDeadline, event.isTemporary);
        if (!nextOccurrence) return false;
        nextOccurrence.setHours(0, 0, 0, 0);
        const daysUntilEvent = Math.ceil((nextOccurrence - now) / (1000 * 60 * 60 * 24));
        return daysUntilEvent >= 0;
      })
      .map(event => {
        const nextOccurrence = calculateNextOccurrence(event.dateTime, event.isDeadline, event.isTemporary);
        return {
          ...event,
          nextOccurrence: nextOccurrence
        };
      })
      .sort((a, b) => {
        const daysA = Math.ceil((a.nextOccurrence - now) / (1000 * 60 * 60 * 24));
        const daysB = Math.ceil((b.nextOccurrence - now) / (1000 * 60 * 60 * 24));
        return daysA - daysB;
      });
  };

  // Update eventForm when selectedDate changes
  useEffect(() => {
    if (selectedDate) {
      setEventForm(prev => ({
        ...prev,
        date: formatDate(selectedDate)
      }));
    }
  }, [selectedDate]);

  useEffect(() => {
    if (!notes || !setNotes) return;

    let storedPinnedEvents = [];
    try {
      storedPinnedEvents = JSON.parse(localStorage.getItem('pinnedEvents') || '[]');
    } catch (error) {
      console.error('Error reading old pinned events:', error);
      localStorage.removeItem('pinnedEvents');
      return;
    }

    if (!Array.isArray(storedPinnedEvents) || storedPinnedEvents.length === 0) return;

    const notesToMigrate = notes.filter(note => storedPinnedEvents.includes(note.id) && !isEventPinned(note));
    if (notesToMigrate.length === 0) {
      localStorage.removeItem('pinnedEvents');
      return;
    }

    Promise.all(notesToMigrate.map(note => updateEventPin(note.id, true)))
      .then(updatedNotes => {
        setNotes(prevNotes => prevNotes.map(note => updatedNotes.find(updated => updated.id === note.id) || note));
        localStorage.removeItem('pinnedEvents');
      })
      .catch(error => {
        console.error('Error migrating pinned events to backend:', error);
      });
  }, [notes, setNotes]);

  // Save events to localStorage when changed
  useEffect(() => {
    if (events.length > 0) {
      try {
        localStorage.setItem('tempEvents', JSON.stringify(events));
      } catch (error) {
        console.error('Error saving events to localStorage:', error);
      }
    }
  }, [events]);

  // Listen for add event from Dashboard
  useEffect(() => {
    const handleAddEvent = () => {
      setEventForm({
        name: '',
        date: selectedDate ? formatDate(selectedDate) : formatDate(new Date()),
        endDate: '',
        type: 'note',
        bgColor: '#ffffff'
      });
      setIsEditMode(false);
      setIsModalOpen(true);
    };

    document.addEventListener('addEvent', handleAddEvent);
    return () => {
      document.removeEventListener('addEvent', handleAddEvent);
    };
  }, [selectedDate]);

  // Debug modal state changes
  useEffect(() => {

  }, [isModalOpen, isEditMode]);

  const handleEventInput = (e) => {
    const { name, value } = e.target;
    setEventForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEventSubmit = (e) => {
    e.preventDefault();



    // Validation logic - allow empty content for notes
    if (eventForm.type === 'event') {
      if (!eventForm.name || !eventForm.date) {

        return;
      }
    }
    // For notes, allow empty content - just proceed with submission



    if (isEditMode && eventForm.id) {
      // Update existing event/note
      setEvents(prev => prev.map(ev => ev.id === eventForm.id ? { ...eventForm } : ev));
    } else {
      // Add new event/note
      const newEvent = {
        id: Date.now(),
        ...eventForm
      };
      setEvents(prev => [...prev, newEvent]);
    }

    // Save to localStorage
    try {
      const updatedEvents = isEditMode
        ? events.map(ev => ev.id === eventForm.id ? { ...eventForm } : ev)
        : [...events, { id: Date.now(), ...eventForm }];
      localStorage.setItem('tempEvents', JSON.stringify(updatedEvents));
    } catch (error) {
      console.error('Error saving events to localStorage:', error);
    }



    // Reset form and close modal - use a more direct approach
    setEventForm({ name: '', date: '', endDate: '', type: 'note', bgColor: '#ffffff' });
    setIsEditMode(false);

    // Force immediate close
    setIsModalOpen(false);

    // Double-check after a brief delay
    setTimeout(() => {

      if (isModalOpen) {

        setIsModalOpen(false);
      }
    }, 50);
  };

  const handleEditEvent = (event) => {
    setEventForm(event);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleDeleteEvent = (id) => {
    const updatedEvents = events.filter(event => event.id !== id);
    setEvents(updatedEvents);
    localStorage.setItem('tempEvents', JSON.stringify(updatedEvents));
  };

  const handleDeleteNote = (noteId) => {
    setPendingDeleteNoteId(noteId);
  };

  const confirmDelete = () => {
    // Handle deleting notes
    if (pendingDeleteNoteId && onDeleteNote) {
      onDeleteNote(pendingDeleteNoteId);
      setPendingDeleteNoteId(null);
    }
  };

  const cancelDelete = () => {
    setPendingDeleteNoteId(null);
  };

  const toggleDisplayMode = () => {
    const modes = ['days', 'weeks', 'months', 'years'];
    const currentIndex = modes.indexOf(displayMode);
    const newIndex = (currentIndex + 1) % modes.length;
    const newMode = modes[newIndex];
    setDisplayMode(newMode);
    try {
      localStorage.setItem('eventDisplayMode', newMode);
    } catch (error) {
      console.error('Error saving display mode:', error);
    }
  };

  const handleCloseModal = () => {
    setEventForm({ name: '', date: '', endDate: '', type: 'note', bgColor: '#ffffff' });
    setIsModalOpen(false);
    setIsEditMode(false);
    if (onClose) {
      onClose();
    }
  };

  const handleColorChange = (eventId, newColor) => {
    // Handle color changes for local events
    setEvents(prev => prev.map(ev =>
      ev.id === eventId ? { ...ev, bgColor: newColor } : ev
    ));

    // Handle color changes for event notes (from notes array)
    // Store the color preference in localStorage
    try {
      const storedColors = localStorage.getItem('eventNoteColors') || '{}';
      const colorMap = JSON.parse(storedColors);
      colorMap[eventId] = newColor;
      localStorage.setItem('eventNoteColors', JSON.stringify(colorMap));
    } catch (error) {
      console.error('Error saving event note color:', error);
    }
  };

  // Scroll to an event card in the events panel
  const scrollToEventCard = (eventId) => {
    const el = eventCardRefs.current[eventId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  };

  // Function to handle pinning/unpinning event notes
  const handlePinEvent = async (eventId) => {
    if (!notes || !setNotes) return;

    const note = notes.find(n => n.id === eventId);
    if (!note) return;

    const nextPinned = !isEventPinned(note);

    try {
      const updatedNote = await updateEventPin(eventId, nextPinned);
      setNotes(prevNotes => prevNotes.map(n => n.id === eventId ? updatedNote : n));
    } catch (error) {
      console.error('Error updating pinned event:', error);
      alert('Failed to update pinned event. Please try again.');
    }
  };

  // Toggle a tag (e.g. 'deadline', 'holiday') on an event note
  const handleToggleTag = async (note, tag) => {
    if (!notes || !setNotes) return;
    const rawNote = notes.find(n => n.id === note.id);
    if (!rawNote) return;

    const lines = rawNote.content.split('\n');
    const tagsLineIdx = lines.findIndex(l => l.startsWith('event_tags:'));
    let currentTags = [];
    if (tagsLineIdx !== -1) {
      currentTags = parseUniqueEventTags(rawNote.content);
    }

    const hasTag = currentTags.some(t => t.toLowerCase() === tag.toLowerCase());
    const updatedTags = hasTag
      ? currentTags.filter(t => t.toLowerCase() !== tag.toLowerCase())
      : [...currentTags, tag];

    let updatedLines;
    if (tagsLineIdx !== -1) {
      updatedLines = [...lines];
      if (updatedTags.length > 0) {
        updatedLines[tagsLineIdx] = `event_tags:${updatedTags.join(',')}`;
      } else {
        updatedLines.splice(tagsLineIdx, 1);
      }
    } else {
      updatedLines = [...lines, `event_tags:${updatedTags.join(',')}`];
    }

    const updatedContent = updatedLines.join('\n');
    await updateNoteById(rawNote.id, updatedContent);
    setNotes(prev => prev.map(n => n.id === rawNote.id ? { ...n, content: updatedContent } : n));
  };

  const handleToggleTimeIt = async (note, dueDate) => {
    if (!notes || !setNotes) return;
    const rawNote = notes.find(n => n.id === note.id);
    if (!rawNote) return;

    const hasTimer = !!parseTimerMeta(rawNote.content);
    const updatedContent = hasTimer
      ? removeTimerMetaLines(rawNote.content).trim()
      : withOneTimeTimerDueDate(rawNote.content, dueDate);

    await updateNoteById(rawNote.id, updatedContent);
    setNotes(prev => prev.map(n => n.id === rawNote.id ? { ...n, content: updatedContent } : n));
  };

  const colorOptions = [
    '#ffffff', // white
    '#fef9c3', // yellow
    '#d1fae5', // green
    '#e0e7ff', // blue
    '#fee2e2', // red
    '#f3e8ff', // purple (for deadlines)
    '#ff6b6b', // reddish
    '#f1f5f9'  // gray
  ];

  // Helper function to calculate accurate months and remaining days
  const calculateAccurateMonths = (startDate, endDate) => {
    let months = 0;
    let tempDate = new Date(startDate);

    // Count full months
    while (tempDate < endDate) {
      tempDate.setMonth(tempDate.getMonth() + 1);
      if (tempDate <= endDate) {
        months++;
      }
    }

    // Calculate remaining days
    const lastMonthDate = new Date(startDate);
    lastMonthDate.setMonth(lastMonthDate.getMonth() + months);
    const remainingDays = Math.ceil((endDate - lastMonthDate) / (1000 * 60 * 60 * 24));

    return { months, remainingDays };
  };

  // Helper function to get month display text
  const getMonthDisplayText = (startDate, endDate) => {
    const { months, remainingDays } = calculateAccurateMonths(startDate, endDate);
    return {
      months,
      remainingDays,
      displayText: months > 0 ? `${months} month${months !== 1 ? 's' : ''}${remainingDays > 0 ? ` ${remainingDays} day${remainingDays !== 1 ? 's' : ''}` : ''}` : `${remainingDays} day${remainingDays !== 1 ? 's' : ''}`
    };
  };

  // Helper function to calculate display text based on mode
  const calculateDisplayText = (totalDays, displayMode, startDate, endDate) => {
    let timeLeft, timeUnit, displayText;

    switch (displayMode) {
      case 'weeks':
        const weeks = Math.floor(totalDays / 7);
        const remainingDays = totalDays % 7;
        timeLeft = weeks;
        timeUnit = 'weeks';
        displayText = weeks > 0 ? `${weeks} week${weeks !== 1 ? 's' : ''}${remainingDays > 0 ? ` ${remainingDays} day${remainingDays !== 1 ? 's' : ''}` : ''}` : `${remainingDays} day${remainingDays !== 1 ? 's' : ''}`;
        break;
      case 'months':
        const monthResult = getMonthDisplayText(startDate, endDate);
        timeLeft = monthResult.months;
        timeUnit = 'months';
        displayText = monthResult.displayText;
        break;
      case 'years':
        const years = Math.floor(totalDays / 365.25);
        const remainingDaysInYear = Math.floor(totalDays % 365.25);
        const monthsInYear = Math.floor(remainingDaysInYear / 30.44);
        timeLeft = years;
        timeUnit = 'years';
        if (years > 0) {
          displayText = `${years} year${years !== 1 ? 's' : ''}${monthsInYear > 0 ? ` ${monthsInYear} month${monthsInYear !== 1 ? 's' : ''}` : ''}`;
        } else {
          displayText = monthsInYear > 0 ? `${monthsInYear} month${monthsInYear !== 1 ? 's' : ''}` : `${remainingDaysInYear} day${remainingDaysInYear !== 1 ? 's' : ''}`;
        }
        break;
      default:
        timeLeft = totalDays;
        timeUnit = 'days';
        displayText = `${totalDays} day${totalDays !== 1 ? 's' : ''}`;
    }

    return { timeLeft, timeUnit, displayText };
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Pinned Events and Tracked Events - Small Tiles */}
      {(type === 'all' || type === 'eventNotes') && (() => {
        const pinnedEventNotes = getPinnedEventNotes();
        
        const trackedEventNotes = (notes || [])
          .filter(note => note?.content && note.content.split('\n').some(l => l.trim() === 'meta::event_tracked'))
          .map(note => {
            const lines = note.content.split('\n');
            const get = prefix => lines.find(l => l.startsWith(prefix))?.slice(prefix.length).trim() || '';
            const title = get('event_description:');
            const dateStr = get('event_date:').split('T')[0];
            const date = dateStr ? new Date(dateStr) : null;
            return { id: note.id, description: title, nextOccurrence: date, originalNote: note };
          })
          .filter(e => e.description)
          .sort((a, b) => (b.nextOccurrence || 0) - (a.nextOccurrence || 0));

        if (pinnedEventNotes.length === 0 && trackedEventNotes.length === 0) return null;

        return (
          <div className="flex flex-row gap-2 flex-wrap">
            {pinnedEventNotes.map(note => {
              const eventDate = note.nextOccurrence ? new Date(note.nextOccurrence) : new Date(note.dateTime);
              const now = new Date();
              now.setHours(0, 0, 0, 0);
              eventDate.setHours(0, 0, 0, 0);
              const totalDays = Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24));

              // Format the event date
              const formattedDate = eventDate.toLocaleDateString(undefined, {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              });

              return (
                <div
                  key={`pinned-${note.id}`}
                  className="group bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex-shrink-0 shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2.5"
                  style={{ minWidth: '120px' }}
                  title={`Click to scroll to ${note.description}`}
                  onClick={() => scrollToEventCard(note.id)}
                >
                  <div className="text-red-500 flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path d="M16 2H8a1 1 0 0 0-1 1v3.28a2 2 0 0 0-.6 1.42L6 12a1 1 0 0 0 1 1h4v8l1 1 1-1v-8h4a1 1 0 0 0 1-1l-.4-4.3a2 2 0 0 0-.6-1.42V3a1 1 0 0 0-1-1z"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-medium text-gray-500">
                      {totalDays} {totalDays === 1 ? 'day' : 'days'} to {formattedDate}
                    </div>
                    {note.isTemporary ? (
                      <div className="text-3xl font-black leading-none text-amber-700" title={note.description}>
                        T
                      </div>
                    ) : (
                      <div className="text-sm font-bold text-gray-900 truncate">
                        {note.description}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePinEvent(note.id); }}
                    className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                    title="Unpin Event"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
            
            {trackedEventNotes.map(note => {
              const eventDate = note.nextOccurrence ? new Date(note.nextOccurrence) : new Date();
              const now = new Date();
              now.setHours(0, 0, 0, 0);
              eventDate.setHours(0, 0, 0, 0);
              const daysDiff = Math.floor((now - eventDate) / (1000 * 60 * 60 * 24));
              const absDays = Math.abs(daysDiff);
              const isPast = daysDiff > 0;
              
              const formattedDate = eventDate.toLocaleDateString(undefined, {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              });

              return (
                <div
                  key={`tracked-${note.id}`}
                  className="group bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex-shrink-0 shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-2.5"
                  style={{ minWidth: '120px' }}
                  title={`Click to scroll to ${note.description}`}
                  onClick={() => scrollToEventCard(note.id)}
                >
                  <div className="text-blue-500 flex-shrink-0" title="Tracked Event">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path fillRule="evenodd" d="M2.25 13.5a8.25 8.25 0 0 1 8.25-8.25.75.75 0 0 1 .75.75v6.75H18a.75.75 0 0 1 .75.75 8.25 8.25 0 0 1-16.5 0Z" clipRule="evenodd" />
                      <path fillRule="evenodd" d="M12.75 3a.75.75 0 0 1 .75-.75 8.25 8.25 0 0 1 8.25 8.25.75.75 0 0 1-.75.75h-7.5a.75.75 0 0 1-.75-.75V3Z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-medium text-gray-500">
                      {absDays} {absDays === 1 ? 'day' : 'days'} {isPast ? 'since' : 'until'} {formattedDate}
                    </div>
                    <div className="text-sm font-bold text-gray-900 truncate">
                      {note.description}
                    </div>
                  </div>
                  <button
                    onClick={async (e) => { 
                      e.stopPropagation(); 
                      const updatedContent = note.originalNote.content.split('\n').filter(l => l.trim() !== 'meta::event_tracked').join('\n');
                      await updateNoteById(note.id, updatedContent);
                      if (setNotes) setNotes(prev => prev.map(n => n.id === note.id ? { ...n, content: updatedContent } : n));
                    }}
                    className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                    title="Untrack Event"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        );
      })()}

      <div className="flex flex-row gap-3 items-stretch">
        {/* Events */}
        {(type === 'all' || type === 'events') && (() => {
          const eventItems = events.filter(ev => ev.type === 'event');
          const sortedEvents = eventItems.sort((a, b) => {
            const dateA = new Date(a.date + 'T00:00');
            const dateB = new Date(b.date + 'T00:00');
            const now = new Date();
            const daysA = Math.ceil((dateA - now) / (1000 * 60 * 60 * 24));
            const daysB = Math.ceil((dateB - now) / (1000 * 60 * 60 * 24));
            return Math.abs(daysA) - Math.abs(daysB);
          });

          return sortedEvents.map(ev => {
            const eventDate = new Date(ev.date + 'T' + (ev.start || '00:00'));
            const now = new Date();
            // Zero out time for accurate day diff
            now.setHours(0, 0, 0, 0);
            eventDate.setHours(0, 0, 0, 0);
            const totalDays = Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24));
            const age = getAgeInStringFmt(eventDate);

            let timeLeft, timeUnit, displayText;
            switch (displayMode) {
              case 'weeks':
                const weeks = Math.floor(totalDays / 7);
                const remainingDays = totalDays % 7;
                timeLeft = weeks;
                timeUnit = 'weeks';
                displayText = weeks > 0 ? `${weeks} week${weeks !== 1 ? 's' : ''}${remainingDays > 0 ? ` ${remainingDays} day${remainingDays !== 1 ? 's' : ''}` : ''}` : `${remainingDays} day${remainingDays !== 1 ? 's' : ''}`;
                break;
              case 'months':
                const months = Math.floor(totalDays / 30.44);
                const remainingDaysInMonth = Math.floor(totalDays % 30.44);
                timeLeft = months;
                timeUnit = 'months';
                displayText = months > 0 ? `${months} month${months !== 1 ? 's' : ''}${remainingDaysInMonth > 0 ? ` ${remainingDaysInMonth} day${remainingDaysInMonth !== 1 ? 's' : ''}` : ''}` : `${remainingDaysInMonth} day${remainingDaysInMonth !== 1 ? 's' : ''}`;
                break;
              case 'years':
                const years = Math.floor(totalDays / 365.25);
                const remainingDaysInYear = Math.floor(totalDays % 365.25);
                const monthsInYear = Math.floor(remainingDaysInYear / 30.44);
                timeLeft = years;
                timeUnit = 'years';
                if (years > 0) {
                  displayText = `${years} year${years !== 1 ? 's' : ''}${monthsInYear > 0 ? ` ${monthsInYear} month${monthsInYear !== 1 ? 's' : ''}` : ''}`;
                } else {
                  displayText = monthsInYear > 0 ? `${monthsInYear} month${monthsInYear !== 1 ? 's' : ''}` : `${remainingDaysInYear} day${remainingDaysInYear !== 1 ? 's' : ''}`;
                }
                break;
              default:
                timeLeft = totalDays;
                timeUnit = 'days';
                displayText = `${totalDays} day${totalDays !== 1 ? 's' : ''}`;
            }

            return (
              <div
                key={ev.id}
                className="group flex flex-col items-start bg-gray-50 border border-gray-200 rounded-lg shadow-md px-4 py-3 min-w-[220px] max-w-xs h-40 cursor-pointer hover:shadow-lg transition-shadow"
                style={{ backgroundColor: ev.bgColor || '#ffffff' }}
                onClick={toggleDisplayMode}
                title={`Click to cycle through days, weeks, months, years (currently showing ${timeUnit})`}
              >
                <div className="text-2xl font-bold text-gray-600">{displayText}</div>
                <div className="text-sm text-gray-500">until</div>
                <div
                  className="font-medium text-gray-900 w-full break-words leading-relaxed"
                  style={{ wordBreak: 'break-word', lineHeight: '1.6' }}
                  dangerouslySetInnerHTML={{ __html: parseLinks(ev.name) }}
                />
                <div className="text-sm text-gray-500">on {new Date(ev.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</div>
                {ev.endDate && (
                  <div className="text-xs text-gray-500 mt-1">to {new Date(ev.endDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                )}
                <div className="flex gap-2 mt-2 self-end opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Color Options */}
                  <div className="flex gap-1 mr-2">
                    {colorOptions.map(color => (
                      <button
                        key={color}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleColorChange(ev.id, color);
                        }}
                        className={`w-5 h-5 rounded-full border-2 transition-all hover:scale-110 ${ev.bgColor === color ? 'border-gray-700' : 'border-gray-300'}`}
                        style={{ backgroundColor: color }}
                        title={`Set color to ${color}`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditEvent(ev);
                    }}
                    className="text-blue-500 hover:text-blue-700 p-1"
                    title="Edit"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteEvent(ev.id);
                    }}
                    className="text-red-500 hover:text-red-700 p-1"
                    title="Delete"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          });
        })()}

        {/* Note Cards */}
        {(type === 'all' || type === 'notes') && (() => {
          const noteItems = events.filter(ev => ev.type === 'note');

          return noteItems.map(ev => {
            const [header, ...bodyLines] = (ev.name || '').split('\n');
            return (
              <div key={ev.id} className="group flex flex-col items-start border border-gray-200 rounded-lg shadow-md px-4 py-3 min-w-[220px] max-w-xs h-40" style={{ backgroundColor: ev.bgColor || '#ffffff' }}>
                <div
                  className="font-bold text-gray-900 w-full break-words"
                  style={{ wordBreak: 'break-word' }}
                  dangerouslySetInnerHTML={{ __html: parseLinks(header) }}
                />
                {bodyLines.length > 0 && (
                  <div
                    className="text-sm text-gray-700 w-full break-words whitespace-pre-line mt-1"
                    style={{ wordBreak: 'break-word' }}
                    dangerouslySetInnerHTML={{ __html: parseLinks(bodyLines.join('\n')) }}
                  />
                )}
                <div className="flex gap-2 mt-2 self-end opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Color Options */}
                  <div className="flex gap-1 mr-2">
                    {colorOptions.map(color => (
                      <button
                        key={color}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleColorChange(ev.id, color);
                        }}
                        className={`w-5 h-5 rounded-full border-2 transition-all hover:scale-110 ${ev.bgColor === color ? 'border-gray-700' : 'border-gray-300'}`}
                        style={{ backgroundColor: color }}
                        title={`Set color to ${color}`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditEvent(ev);
                    }}
                    className="text-blue-500 hover:text-blue-700 p-1"
                    title="Edit"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteEvent(ev.id);
                    }}
                    className="text-red-500 hover:text-red-700 p-1"
                    title="Delete"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          });
        })()}

        {/* Event Notes */}
        {(type === 'all' || type === 'eventNotes') && (() => {
          const eventNotes = getEventNotes();

          return eventNotes.map(note => {
            // Use the calculated next occurrence instead of the original date
            const eventDate = note.nextOccurrence ? new Date(note.nextOccurrence) : new Date(note.dateTime);
            const now = new Date();
            // Zero out time for accurate day diff
            now.setHours(0, 0, 0, 0);
            eventDate.setHours(0, 0, 0, 0);
            const totalDays = Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24));

            const { timeLeft, timeUnit, displayText } = calculateDisplayText(totalDays, displayMode, now, eventDate);

            // Check if this is a recurring event (original date year is different from current year)
            const originalDate = new Date(note.dateTime);
            const isRecurring = originalDate.getFullYear() !== new Date().getFullYear();

            // Check if event is today
            const isToday = totalDays === 0;

            // Don't show anniversary for deadline events
            const shouldShowAnniversary = isRecurring && !note.isDeadline && !note.isTemporary;
            const isTimed = !!parseTimerMeta(note.content);
            const anniversaryAgeInYears = new Date().getFullYear() - originalDate.getFullYear();
            const anniversaryAgeText = `${anniversaryAgeInYears} year${anniversaryAgeInYears !== 1 ? 's' : ''}`;
            const anniversaryLabel = `${anniversaryAgeInYears} year anniversary`;

            return (
              <div
                key={note.id}
                ref={(el) => { eventCardRefs.current[note.id] = el; }}
                className={`group flex flex-col items-start bg-gray-50 border border-gray-200 rounded-lg shadow-md py-3 pr-4 ${note.isTemporary ? 'pl-12' : 'pl-4'} min-w-[220px] max-w-xs min-h-[10rem] cursor-pointer hover:shadow-lg transition-shadow relative`}
                style={{ backgroundColor: isToday ? '#dcfce7' : (note.bgColor || '#ffffff') }}
                onClick={toggleDisplayMode}
                title={`Click to cycle through days, weeks, months, years (currently showing ${timeUnit})`}
              >
                {note.isTemporary && (
                  <div
                    className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-md bg-amber-100 text-lg font-black leading-none text-amber-700 ring-1 ring-amber-300"
                    title="Temporary event"
                    aria-label="Temporary event"
                  >
                    T
                  </div>
                )}
                {isToday && (
                  <div className="flex items-center gap-2 mb-1">
                    <div className="text-green-600">🎉</div>
                    <div className="text-green-800 font-bold text-lg">
                      {shouldShowAnniversary ? 'Anniversary Today!' : 'TODAY!'}
                    </div>
                  </div>
                )}
                <div className={`flex items-baseline gap-1 ${isToday ? 'text-green-800' : (note.bgColor === '#f3e8ff' ? 'text-purple-800' : 'text-gray-600')}`}>
                  <span className="text-2xl font-bold">{isToday ? '' : displayText}</span>
                  {!isToday && <span className="text-xs font-medium">to event</span>}
                </div>
                <div className={`text-sm ${isToday ? 'text-green-700' : (note.bgColor === '#f3e8ff' ? 'text-purple-600' : 'text-gray-500')}`}>
                  {isToday ? '' : (shouldShowAnniversary ? anniversaryLabel : 'until')}
                </div>
                <div
                  className={`font-medium w-full truncate flex-shrink-0 ${note.bgColor === '#f3e8ff' ? 'text-purple-900' : 'text-gray-900'}`}
                  title={note.description}
                  dangerouslySetInnerHTML={{ __html: parseLinks(note.description) }}
                />
                {note.notes && (
                  <div
                    className={`text-xs mt-1 w-full truncate ${note.bgColor === '#f3e8ff' ? 'text-purple-700' : 'text-gray-600'}`}
                    title={note.notes}
                    dangerouslySetInnerHTML={{ __html: parseLinks(note.notes) }}
                  />
                )}

                {/* Tags */}
	                  {(() => {
                  const tags = parseUniqueEventTags(note.content);
                  return tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-2 w-full">
                      {tags.map((tag, tagIndex) => (
                        <span
                          key={`${note.id}-event-tag-${tag.toLowerCase()}-${tagIndex}`}
                          className="inline-block px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full cursor-pointer hover:bg-indigo-200 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Filter by this tag
                            // You can implement tag filter logic here
                          }}
                          title={`Filter by ${tag}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : null;
                })()}

                <div className={`text-sm ${note.bgColor === '#f3e8ff' ? 'text-purple-600' : 'text-gray-500'}`}>
                  {shouldShowAnniversary ? (
                    (() => {
                      return `Original date: ${originalDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} (${anniversaryAgeText})`;
                    })()
                  ) : (
                    `on ${eventDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}`
                  )}
                </div>

                {/* Top-right corner: pin/unpin only */}
                <div className="absolute top-2 right-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePinEvent(note.id); }}
                    className={`p-1 rounded-full transition-colors ${isEventPinned(note) ? 'text-red-500 hover:text-red-600 bg-red-50' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
                    title={isEventPinned(note) ? 'Unpin Event' : 'Pin Event'}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                      <path d="M16 2H8a1 1 0 0 0-1 1v3.28a2 2 0 0 0-.6 1.42L6 12a1 1 0 0 0 1 1h4v8l1 1 1-1v-8h4a1 1 0 0 0 1-1l-.4-4.3a2 2 0 0 0-.6-1.42V3a1 1 0 0 0-1-1z"/>
                    </svg>
                  </button>
                </div>
                <div className="flex flex-wrap gap-1 mt-2 self-end opacity-0 group-hover:opacity-100 transition-opacity max-w-full">
                  {/* Deadline/Holiday tag toggle */}
                  {(() => {
                    const isDeadline = note.tags?.some(t => t.toLowerCase() === 'deadline');
                    const isHoliday  = note.tags?.some(t => t.toLowerCase() === 'holiday');
                    if (isDeadline) return null;
                    if (isHoliday) {
                      return (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleTag(note, 'holiday'); }}
                          className="flex items-center gap-0.5 px-1.5 py-0.5 text-xs rounded-full bg-emerald-500 text-white shadow-sm hover:bg-emerald-600 transition-colors"
                          title="Remove Holiday tag"
                        >
                          <span>✓</span><span>Holiday</span>
                        </button>
                      );
                    }
                    return (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleTag(note, 'deadline'); }}
                        className="flex items-center gap-0.5 px-1.5 py-0.5 text-xs rounded-full border border-dashed border-red-300 text-red-400 bg-white/80 hover:bg-red-50 hover:border-red-400 transition-colors"
                        title="Mark as Deadline"
                      >
                        <span>+</span><span>Deadline</span>
                      </button>
                    );
	                  })()}
	                  <button
	                    onClick={(e) => { e.stopPropagation(); handleToggleTimeIt(note, eventDate); }}
	                    className={`flex items-center gap-0.5 px-1.5 py-0.5 text-xs rounded-full transition-colors ${
	                      isTimed
	                        ? 'bg-amber-500 text-white shadow-sm hover:bg-amber-600'
	                        : 'border border-dashed border-amber-300 text-amber-600 bg-white/80 hover:bg-amber-50 hover:border-amber-400'
	                    }`}
	                    title={isTimed ? 'Remove timer reminder' : 'Show this in timer reminders'}
	                  >
	                    <span>{isTimed ? '✓' : '+'}</span><span>Time it</span>
	                  </button>
	                  {/* Color Options */}
                  <div className="flex gap-0.5 flex-wrap">
                    {colorOptions.map(color => (
                      <button
                        key={color}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleColorChange(note.id, color);
                        }}
                        className={`w-4 h-4 rounded-full border-2 transition-all hover:scale-110 flex-shrink-0 ${(note.bgColor || '#ffffff') === color ? 'border-gray-700' : 'border-gray-300'}`}
                        style={{ backgroundColor: color }}
                        title={`Set color to ${color}`}
                      />
                    ))}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onEditEvent) {
                        onEditEvent(note);
                      }
                    }}
                    className="text-blue-500 hover:text-blue-700 p-1 flex-shrink-0"
                    title="Edit Event"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  {originalDate && (
                    <a
                      href={`https://photos.google.com/search/${moment(originalDate).format('YYYY-MM-DD')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-purple-500 hover:text-purple-700 p-1 transition-colors flex-shrink-0"
                      title="View photos"
                    >
                      <PhotoIcon className="h-4 w-4" />
                    </a>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteNote(note.id);
                    }}
                    className="text-red-500 hover:text-red-700 p-1 flex-shrink-0"
                    title="Delete Event"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          });
        })()}
      </div>

      {/* Timeline Tiles */}
      {(type === 'all' || type === 'eventNotes') && (() => {
        const timelineNotes = getTimelineNotes();
        if (timelineNotes.length === 0) return null;

        return (
          <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Ongoing Timelines</h3>
          <div className="flex flex-row gap-2 flex-wrap">
            {timelineNotes.map(timeline => {
              const { timeUnit, displayText } = calculateTimelineDisplayText(timeline.daysSince);

              return (
                <div
                  key={`timeline-${timeline.id}`}
                  className="group border-2 border-blue-400 bg-blue-50 rounded-lg px-3 py-2 flex-shrink-0 hover:shadow-md transition-shadow relative cursor-pointer"
                  style={{ minWidth: '120px' }}
                  title={timeline.title}
                  onClick={toggleDisplayMode}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/notes', { state: { searchQuery: `id:${timeline.id}` } });
                    }}
                    className="absolute top-1 right-1 p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors"
                    title="View note"
                  >
                    <DocumentTextIcon className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/timelines?filter=${encodeURIComponent(timeline.title)}`);
                    }}
                    className="absolute top-1 right-7 p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors"
                    title="View in Timelines"
                  >
                    <MagnifyingGlassIcon className="h-3 w-3" />
                  </button>
                  <div className="text-xs font-medium text-gray-700 truncate pr-14">
                    {timeline.title}
                  </div>
                  <div className="text-xs font-semibold text-gray-900 mt-1">
                    {timeline.firstDate.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </div>
                  <div className="text-xs text-gray-600 mt-1" title={`Click to cycle through days, weeks, months, years (currently showing ${timeUnit})`}>
                    {displayText} since start
                  </div>
                  {
                    timeline.totalDollarAmount > 0 && (
                      <div className="text-xs text-green-600 font-semibold mt-1">
                        ${timeline.totalDollarAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    )
                  }
                </div>
              );
            })}
          </div>
          </div>
        );
      })()}

      {/* Event Modal */}
      {
        isModalOpen && (
          <div ref={modalRef} className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
              <h2 className="text-lg font-semibold mb-4">{isEditMode ? 'Edit Event' : 'Add Note'}</h2>
              <form onSubmit={handleEventSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      className={`px-3 py-1 rounded-md border ${eventForm.type === 'event' ? 'bg-gray-700 text-white border-gray-700' : 'bg-white text-gray-700 border-gray-300'}`}
                      onClick={() => setEventForm(prev => ({ ...prev, type: 'event' }))}
                    >
                      Event
                    </button>
                    <button
                      type="button"
                      className={`px-3 py-1 rounded-md border ${eventForm.type === 'note' ? 'bg-gray-700 text-white border-gray-700' : 'bg-white text-gray-700 border-gray-300'}`}
                      onClick={() => setEventForm(prev => ({ ...prev, type: 'note' }))}
                    >
                      Note Card
                    </button>
                  </div>
                </div>
                {eventForm.type === 'note' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Note Content</label>
                    <textarea
                      name="name"
                      value={eventForm.name}
                      onChange={handleEventInput}
                      className="mt-1 block w-full border border-gray-300 rounded-md p-2 min-h-[80px]"
                      placeholder="Enter note content..."
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Event Name</label>
                      <input
                        type="text"
                        name="name"
                        value={eventForm.name}
                        onChange={handleEventInput}
                        className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Event Date</label>
                      <input
                        type="date"
                        name="date"
                        value={eventForm.date}
                        onChange={handleEventInput}
                        className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Event End Date (optional)</label>
                      <input
                        type="date"
                        name="endDate"
                        value={eventForm.endDate}
                        onChange={handleEventInput}
                        className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                      />
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Background Color</label>
                  <div className="flex gap-2 mb-2">
                    {colorOptions.map(color => (
                      <button
                        key={color}
                        type="button"
                        className={`w-7 h-7 rounded-full border-2 ${eventForm.bgColor === color ? 'border-gray-700' : 'border-gray-200'}`}
                        style={{ backgroundColor: color }}
                        onClick={() => setEventForm(prev => ({ ...prev, bgColor: color }))}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 bg-gray-200 rounded-md text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  >
                    {isEditMode ? 'Save Changes' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Delete Confirmation Modal */}
      {
        pendingDeleteNoteId && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-xs shadow-lg flex flex-col items-center">
              <div className="text-lg font-semibold mb-4 text-center">
                Are you sure you want to delete this note?
              </div>
              <div className="flex gap-4 mt-2">
                <button
                  onClick={cancelDelete}
                  className="px-4 py-2 bg-gray-200 rounded-md text-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default EventManager; 
