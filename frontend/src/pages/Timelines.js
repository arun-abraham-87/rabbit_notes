import React, { useState, useEffect } from 'react';
import moment from 'moment';
import { PlusIcon, XMarkIcon, ArrowTopRightOnSquareIcon, XCircleIcon, ArrowPathIcon, FlagIcon, LinkIcon } from '@heroicons/react/24/solid';
import { useNavigate, useLocation } from 'react-router-dom';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

const Timelines = ({ notes, updateNote, addNote }) => {
  const navigate = useNavigate();
  const location = useLocation();
  // localStorage key for timeline collapse states
  const TIMELINE_COLLAPSE_STORAGE_KEY = 'timeline_collapse_states';

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

  // Initialize state with saved collapse states
  const [timelineNotes, setTimelineNotes] = useState([]);
  const [showAddEventForm, setShowAddEventForm] = useState(null);
  const [newEventText, setNewEventText] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewTimelineForm, setShowNewTimelineForm] = useState(false);
  const [newTimelineTitle, setNewTimelineTitle] = useState('');
  const [collapsedTimelines, setCollapsedTimelines] = useState(() => loadCollapseStates());
  const [selectedEvents, setSelectedEvents] = useState({}); // { timelineId: [event1, event2] }
  const [unlinkConfirmation, setUnlinkConfirmation] = useState({ isOpen: false, timelineId: null, eventId: null });
  const [addLinkModal, setAddLinkModal] = useState({ isOpen: false, timelineId: null, eventIndex: null, currentLink: '' });

  // Save timeline collapse states to localStorage
  const saveCollapseStates = (collapsedSet) => {
    try {
      const statesArray = Array.from(collapsedSet);
      localStorage.setItem(TIMELINE_COLLAPSE_STORAGE_KEY, JSON.stringify(statesArray));
    } catch (error) {
      console.error('Error saving timeline collapse states:', error);
    }
  };

  // Restore collapse states when navigating to timelines page
  useEffect(() => {
    if (location.pathname === '/timelines') {
      const savedStates = loadCollapseStates();
      setCollapsedTimelines(savedStates);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (notes && notes.length > 0) {
      // Filter notes that contain meta::timeline tag
      const filteredNotes = notes.filter(note => 
        note.content && note.content.includes('meta::timeline')
      );
      // Always update timelineNotes to ensure it reflects the latest notes
      // This is important when notes are updated (e.g., when events are linked)
      setTimelineNotes(filteredNotes);
      
      // When notes change, update collapse states to remove deleted timelines
      const savedStates = loadCollapseStates();
      const currentNoteIds = filteredNotes.map(note => note.id);
      
      // Merge saved states with current timelines
      // Keep saved states for existing timelines, default new timelines to expanded (not in collapsed set)
      const mergedStates = new Set();
      
      // Add saved states for timelines that still exist
      savedStates.forEach(noteId => {
        if (currentNoteIds.includes(noteId)) {
          mergedStates.add(noteId);
        }
      });
      
      // Update collapse states to remove references to deleted timelines
      // Only update if there are actual changes to avoid unnecessary re-renders
      setCollapsedTimelines(prev => {
        const prevArray = Array.from(prev).sort();
        const mergedArray = Array.from(mergedStates).sort();
        
        // Check if they're different
        if (prevArray.length !== mergedArray.length) {
          return mergedStates;
        }
        
        const hasChanges = prevArray.some((id, index) => id !== mergedArray[index]);
        return hasChanges ? mergedStates : prev;
      });
    } else if (notes && notes.length === 0) {
      // Handle empty notes array
      setTimelineNotes([]);
    }
  }, [notes]);

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

  // Check if event is selected
  const isEventSelected = (timelineId, eventIndex) => {
    return selectedEvents[timelineId]?.includes(eventIndex) || false;
  };

  // Parse timeline data from note content
  const parseTimelineData = (content, allNotes = []) => {
    if (!content || typeof content !== 'string') {
      return {
        timeline: '',
        events: [],
        isClosed: false,
        totalDollarAmount: 0
      };
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
        if (linkedEventNote && linkedEventNote.content) {
          const eventLines = linkedEventNote.content.split('\n');
          
          // Extract event description
          const descriptionLine = eventLines.find(line => line.startsWith('event_description:'));
          let description = descriptionLine ? descriptionLine.replace('event_description:', '').trim() : '';
          
          // Extract event date
          const dateLine = eventLines.find(line => line.startsWith('event_date:'));
          const eventDate = dateLine ? dateLine.replace('event_date:', '').trim() : '';
          
          // Check if this is a purchase (has event_$: line)
          const priceLine = eventLines.find(line => line.trim().startsWith('event_$:'));
          if (priceLine) {
            const priceValue = priceLine.replace('event_$:', '').trim();
            // Append the price to the description header
            if (priceValue) {
              description = description ? `${description} $${priceValue}` : `$${priceValue}`;
            }
          }
          
          if (description && eventDate) {
            // Parse the event date (ISO format)
            const parsedEventDate = moment(eventDate);
            
            if (parsedEventDate.isValid()) {
              // Extract dollar values from the event description
              const dollarValues = extractDollarValues(description);
              const eventDollarAmount = dollarValues.reduce((sum, value) => sum + value, 0);
              
              timelineData.events.push({
                event: description,
                date: parsedEventDate,
                dateStr: parsedEventDate.format('DD/MM/YYYY'),
                lineIndex: -1, // Virtual event from linked note
                dollarAmount: eventDollarAmount,
                isLinkedEvent: true,
                linkedEventId: eventId,
                link: null // Linked events don't have links in timeline format
              });
            }
          }
        }
      });
    }
    
    // Calculate total dollar amount
    timelineData.totalDollarAmount = timelineData.events.reduce((sum, event) => sum + (event.dollarAmount || 0), 0);
    
    return timelineData;
  };

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
        .map(note => parseTimelineData(note.content, notes));
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
        .map(note => parseTimelineData(note.content, notes));
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
        .map(note => parseTimelineData(note.content, notes));
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
      const filteredNotes = updatedNotes.filter(note => 
        note.content && note.content.includes('meta::timeline')
      );
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
        .map(note => parseTimelineData(note.content, updatedNotes));
      setTimelineNotes(timelineNotes);
    } catch (error) {
      console.error('Error unlinking event from timeline:', error);
      alert('Failed to unlink event from timeline. Please try again.');
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

  // Handle adding a new event
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

      const timelineData = parseTimelineData(note.content, notes);
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

  // Filter and sort timeline notes
  const filteredAndSortedTimelineNotes = timelineNotes
    .filter(note => {
      // Safety check: ensure note has valid content
      if (!note || !note.content) return false;
      if (!searchQuery.trim()) return true;
      
      const timelineData = parseTimelineData(note.content, notes);
      const query = searchQuery.toLowerCase();
      
      // Search in timeline title
      if (timelineData.timeline.toLowerCase().includes(query)) {
        return true;
      }
      
      // Search in events (both regular and linked events)
      const hasMatchingEvent = timelineData.events.some(event => {
        if (event.event && typeof event.event === 'string') {
          return event.event.toLowerCase().includes(query);
        }
        return false;
      });
      
      return hasMatchingEvent;
    })
    .sort((a, b) => {
      const aData = parseTimelineData(a.content, notes);
      const bData = parseTimelineData(b.content, notes);
      
      if (!aData.timeline && !bData.timeline) return 0;
      if (!aData.timeline) return 1;
      if (!bData.timeline) return -1;
      
      return aData.timeline.localeCompare(bData.timeline);
    });

  // Auto-expand timelines with matching events when searching
  useEffect(() => {
    if (!searchQuery.trim()) {
      // When search is cleared, collapse all timelines
      if (timelineNotes.length > 0) {
        const allTimelineIds = new Set(timelineNotes.map(note => note.id));
        saveCollapseStates(allTimelineIds);
        setCollapsedTimelines(allTimelineIds);
      }
      return;
    }

    if (timelineNotes.length > 0 && notes.length > 0) {
      const query = searchQuery.toLowerCase();
      const matchingTimelineIds = new Set();
      
      timelineNotes.forEach(note => {
        if (!note || !note.content) return;
        
        const timelineData = parseTimelineData(note.content, notes);
        
        // Check if timeline title matches
        if (timelineData.timeline.toLowerCase().includes(query)) {
          matchingTimelineIds.add(note.id);
        }
        
        // Check if any event matches
        const hasMatchingEvent = timelineData.events.some(event => {
          if (event.event && typeof event.event === 'string') {
            return event.event.toLowerCase().includes(query);
          }
          return false;
        });
        
        if (hasMatchingEvent) {
          matchingTimelineIds.add(note.id);
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
  }, [searchQuery, timelineNotes, notes]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Timelines
          </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExpandAll}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all shadow-sm hover:shadow-md"
                title="Expand all timelines"
              >
                <span>Expand All</span>
              </button>
              <button
                onClick={handleCollapseAll}
                className="flex items-center space-x-2 px-4 py-2 bg-slate-500 text-white rounded-lg hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 transition-all shadow-sm hover:shadow-md"
                title="Collapse all timelines"
              >
                <span>Collapse All</span>
              </button>
              <button
                onClick={() => setShowNewTimelineForm(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:from-emerald-600 hover:to-teal-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition-all shadow-sm hover:shadow-md"
              >
                <PlusIcon className="h-5 w-5" />
                <span>New Timeline</span>
              </button>
            </div>
          </div>
          
          {/* Search Box */}
          <div className="flex flex-col gap-4">
            <div className="flex-1 max-w-md">
              <label htmlFor="timeline-search" className="block text-sm font-medium text-slate-700 mb-2">
                Search Timelines
              </label>
              <div className="relative">
                <input
                  id="timeline-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by timeline title or events..."
                  className="w-full px-4 py-2 pl-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 bg-white shadow-sm transition-all"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {timelineNotes.length === 0 ? (
          <div className="text-center py-12">
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
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg mb-4">
              No timelines match your search
            </div>
            <p className="text-gray-400">
              Try adjusting your search terms or clear the search to see all timelines
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Flagged Timelines */}
            {(() => {
              const flaggedTimelines = filteredAndSortedTimelineNotes.filter(note => {
                if (!note || !note.content) return false;
                return note.content.includes('meta::flagged_timeline');
              });
              
              if (flaggedTimelines.length > 0) {
                return (
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
                      <span className="text-2xl">🚩</span>
                      Flagged Timelines <span className="font-normal text-slate-500">({flaggedTimelines.length})</span>
                    </h2>
                    {flaggedTimelines.map((note) => {
                      if (!note || !note.content) return null;
                      const timelineData = parseTimelineData(note.content, notes);
                      const eventsWithDiffs = calculateTimeDifferences(timelineData.events, timelineData.isClosed, timelineData.totalDollarAmount);

                      return (
                        <div key={note.id} className="bg-white rounded-xl shadow-md border-l-4 border-rose-400 overflow-hidden hover:shadow-lg transition-shadow">
                          {/* Timeline Header */}
                          <div 
                            className="bg-gradient-to-r from-rose-50 to-pink-50 px-6 py-4 cursor-pointer hover:from-rose-100 hover:to-pink-100 border-b border-rose-200/50 transition-all"
                            onClick={() => toggleTimelineCollapse(note.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="text-rose-600">
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
                                      
                                      // Show total amount if it exists
                                      const totalAmount = timelineData.totalDollarAmount && timelineData.totalDollarAmount > 0
                                        ? `$${timelineData.totalDollarAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                        : null;
                                      
                                      return (
                                        <>
                                          <div className="text-sm font-normal text-gray-600 mt-1">
                                            {startDate.format('DD/MMM/YYYY')} - {lastEvent.date.format('DD/MMM/YYYY')} | {eventCount} events{durationText ? ` | ${durationText}` : ''}
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
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Open timeline if it's collapsed
                                      if (collapsedTimelines.has(note.id)) {
                                        toggleTimelineCollapse(note.id);
                                      }
                                      setShowAddEventForm(note.id);
                                    }}
                                    className="px-2 py-1 bg-gradient-to-r from-indigo-50 to-blue-50 hover:from-indigo-100 hover:to-blue-100 text-indigo-700 rounded-md transition-all flex items-center space-x-1 border border-indigo-200 shadow-sm hover:shadow"
                                    title="Add new event"
                                  >
                                    <PlusIcon className="h-3 w-3" />
                                    <span className="text-xs font-medium">Add Event</span>
                                  </button>
                                )}
                                {!timelineData.isClosed && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCloseTimeline(note.id);
                                    }}
                                    className="px-2 py-1 bg-gradient-to-r from-rose-50 to-pink-50 hover:from-rose-100 hover:to-pink-100 text-rose-700 rounded-md transition-all flex items-center space-x-1 border border-rose-200 shadow-sm hover:shadow"
                                    title="Close timeline"
                                  >
                                    <XCircleIcon className="h-3 w-3" />
                                    <span className="text-xs font-medium">Close</span>
                                  </button>
                                )}
                                {timelineData.isClosed && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleReopenTimeline(note.id);
                                    }}
                                    className="px-2 py-1 bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 text-emerald-700 rounded-md transition-all flex items-center space-x-1 border border-emerald-200 shadow-sm hover:shadow"
                                    title="Reopen timeline"
                                  >
                                    <ArrowPathIcon className="h-3 w-3" />
                                    <span className="text-xs font-medium">Reopen</span>
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleFlagged(note.id);
                                  }}
                                  className={`px-2 py-1 rounded-md transition-all flex items-center space-x-1 border shadow-sm hover:shadow ${
                                    note.content.includes('meta::flagged_timeline')
                                      ? 'bg-gradient-to-r from-rose-50 to-pink-50 hover:from-rose-100 hover:to-pink-100 text-rose-700 border-rose-200'
                                      : 'bg-slate-50 hover:bg-slate-100 text-slate-500 border-slate-300'
                                  }`}
                                  title={note.content.includes('meta::flagged_timeline') ? 'Unflag timeline' : 'Flag timeline (needs attention)'}
                                >
                                  <FlagIcon className="h-3 w-3" />
                                  <span className="text-xs font-medium">Flag</span>
                                </button>
                                <label 
                                  className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md transition-all cursor-pointer flex items-center space-x-1 border border-slate-300 shadow-sm hover:shadow"
                                  title={note.content.includes('meta::tracked') ? 'Untrack timeline' : 'Track timeline'}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleTracked(note.id);
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={note.content.includes('meta::tracked')}
                                    onChange={() => {}}
                                    className="h-3 w-3 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
                                  />
                                  <span className="text-xs font-medium">Track</span>
                                </label>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewNote(note.id);
                                  }}
                                  className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-md transition-all flex items-center space-x-1 border border-slate-300 shadow-sm hover:shadow"
                                  title="View note in Notes page"
                                >
                                  <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                                  <span className="text-xs font-medium">View</span>
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Timeline Events */}
                          {!collapsedTimelines.has(note.id) && (
                            <div className="p-6">
                              {/* Add Event Form */}
                              {showAddEventForm === note.id && (
                                <div className="mb-6 pb-6 border-b border-slate-200">
                                  <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-4 rounded-lg border border-indigo-200 shadow-sm">
                                    <h4 className="text-sm font-medium text-slate-700 mb-3">Add New Event</h4>
                                    <div className="space-y-3">
                                      <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                          Event Description
                                        </label>
                                        <input
                                          type="text"
                                          value={newEventText}
                                          onChange={(e) => setNewEventText(e.target.value)}
                                          placeholder="e.g., Project milestone reached"
                                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 bg-white shadow-sm transition-all"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                          Date
                                        </label>
                                        <input
                                          type="date"
                                          value={newEventDate}
                                          onChange={(e) => setNewEventDate(e.target.value)}
                                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400 bg-white shadow-sm transition-all"
                                        />
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <button
                                          onClick={() => handleAddEvent(note.id)}
                                          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-sm hover:shadow-md"
                                        >
                                          Add Event
                                        </button>
                                        <button
                                          onClick={() => setShowAddEventForm(null)}
                                          className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-all shadow-sm hover:shadow-md"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {eventsWithDiffs.length === 0 ? (
                                <div className="text-gray-500 italic">No events found in this timeline</div>
                              ) : (
                                <div className="space-y-4">
                                  {/* Preview marker at the beginning if new event should be first */}
                                  {(() => {
                                    if (!newEventDate || showAddEventForm !== note.id || eventsWithDiffs.length === 0) {
                                      return null;
                                    }
                                    
                                    const newEventMoment = moment(newEventDate);
                                    const firstEvent = eventsWithDiffs[0];
                                    
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
                                  
                                  {eventsWithDiffs.map((event, index) => {
                                    const currentYear = event.date ? event.date.year() : null;
                                    const previousYear = index > 0 && eventsWithDiffs[index - 1].date 
                                      ? eventsWithDiffs[index - 1].date.year() 
                                      : null;
                                    const showYearHeader = currentYear && currentYear !== previousYear;
                                    
                                    // Check if we should insert preview marker here
                                    const shouldShowPreview = showAddEventForm === note.id && newEventDate;
                                    let showPreviewBefore = false;
                                    
                                    if (shouldShowPreview && event.date) {
                                      const newEventMoment = moment(newEventDate);
                                      const isAfterThis = newEventMoment.isAfter(event.date);
                                      const isBeforeNext = index === eventsWithDiffs.length - 1 || 
                                        !eventsWithDiffs[index + 1].date || 
                                        newEventMoment.isBefore(eventsWithDiffs[index + 1].date);
                                      
                                      showPreviewBefore = isAfterThis && isBeforeNext;
                                    }

                                    const isSelected = isEventSelected(note.id, index);
                                    const isHighlighted = isSelected && selectedEvents[note.id] && selectedEvents[note.id].length === 2;
                                    
                                    return (
                                      <React.Fragment key={index}>
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
                                                  {event.date.format('DD/MMM/YYYY')}
                                                </span>
                                              )}
                                              <div className="flex items-center gap-2">
                                                <h3 className={`text-lg font-semibold ${
                                                  event.isToday
                                                    ? 'text-emerald-700 font-bold'
                                                    : event.isTotal
                                                    ? 'text-emerald-700 font-bold'
                                                    : event.isDuration
                                                      ? 'text-orange-600 font-bold'
                                                      : event.isLinkedEvent
                                                        ? 'text-indigo-600 font-semibold'
                                                        : event.isVirtual 
                                                          ? 'text-violet-600' 
                                                          : 'text-slate-800'
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
                                                {event.isLinkedEvent && (
                                                  <div className="inline-flex items-center gap-2">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 border border-indigo-200">
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
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                            
                                            {/* Second line with age and time differences */}
                                            {(!event.isVirtual || event.isToday) && !event.isTotal && !event.isDuration && (
                                              <div className="flex items-center space-x-2 mb-1">
                                                {event.date && (
                                                  <span className="text-xs px-2 py-1 rounded font-medium text-gray-600 bg-gray-100">
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
                                                      <span className="text-xs px-2 py-1 rounded font-medium text-gray-600 bg-gray-100">
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
                                                  <span className="text-xs px-2 py-1 rounded font-medium text-gray-600 bg-gray-100">
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
                                              <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent border-b-2 border-indigo-300 pb-2">
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
                              )}
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
            
            {/* Open Timelines */}
            {(() => {
              const openTimelines = filteredAndSortedTimelineNotes.filter(note => {
                if (!note || !note.content) return false;
                // Exclude flagged timelines (they appear in Flagged section)
                if (note.content.includes('meta::flagged_timeline')) return false;
                const timelineData = parseTimelineData(note.content, notes);
                return !timelineData.isClosed;
              });
              
              if (openTimelines.length > 0) {
                return (
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
                      Open Timelines <span className="font-normal text-slate-500">({openTimelines.length})</span>
                    </h2>
                    {openTimelines.map((note) => {
              if (!note || !note.content) return null;
              const timelineData = parseTimelineData(note.content, notes);
              const eventsWithDiffs = calculateTimeDifferences(timelineData.events, timelineData.isClosed, timelineData.totalDollarAmount);

              return (
                <div key={note.id} className="bg-white rounded-xl shadow-md border-l-4 border-indigo-400 overflow-hidden hover:shadow-lg transition-shadow">
                  {/* Timeline Header */}
                  <div 
                    className="bg-gradient-to-r from-indigo-50 to-blue-50 px-6 py-4 cursor-pointer hover:from-indigo-100 hover:to-blue-100 border-b border-indigo-200/50 transition-all"
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
                              
                              // Show total amount if it exists
                              const totalAmount = timelineData.totalDollarAmount && timelineData.totalDollarAmount > 0
                                ? `$${timelineData.totalDollarAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                : null;
                              
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
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Open timeline if it's collapsed
                              if (collapsedTimelines.has(note.id)) {
                                toggleTimelineCollapse(note.id);
                              }
                              setShowAddEventForm(note.id);
                            }}
                            className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md transition-colors flex items-center space-x-1.5 border border-blue-200"
                            title="Add new event"
                          >
                            <PlusIcon className="h-4 w-4" />
                            <span className="text-sm font-medium">Add Event</span>
                          </button>
                        )}
                        {!timelineData.isClosed && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCloseTimeline(note.id);
                            }}
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-md transition-colors flex items-center space-x-1.5 border border-red-200"
                            title="Close timeline"
                          >
                            <XCircleIcon className="h-4 w-4" />
                            <span className="text-sm font-medium">Close</span>
                          </button>
                        )}
                        {timelineData.isClosed && (
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
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFlagged(note.id);
                          }}
                          className={`px-3 py-1.5 rounded-md transition-colors flex items-center space-x-1.5 border ${
                            note.content.includes('meta::flagged_timeline')
                              ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
                              : 'bg-gray-50 hover:bg-gray-100 text-gray-500 border-gray-300'
                          }`}
                          title={note.content.includes('meta::flagged_timeline') ? 'Unflag timeline' : 'Flag timeline (needs attention)'}
                        >
                          <FlagIcon className="h-4 w-4" />
                          <span className="text-sm font-medium">Flag</span>
                        </button>
                        <label 
                          className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-md transition-colors cursor-pointer flex items-center space-x-1.5 border border-gray-300"
                          title={note.content.includes('meta::tracked') ? 'Untrack timeline' : 'Track timeline'}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleTracked(note.id);
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={note.content.includes('meta::tracked')}
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

                  {/* Timeline Events */}
                  {!collapsedTimelines.has(note.id) && (
                    <div className="p-6">
                    {/* Add Event Form */}
                    {showAddEventForm === note.id && (
                      <div className="mb-6 pb-6 border-b border-gray-200">
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <h4 className="text-sm font-medium text-gray-700 mb-3">Add New Event</h4>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Event Description
                              </label>
                              <input
                                type="text"
                                value={newEventText}
                                onChange={(e) => setNewEventText(e.target.value)}
                                placeholder="e.g., Project milestone reached"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Date
                              </label>
                              <input
                                type="date"
                                value={newEventDate}
                                onChange={(e) => setNewEventDate(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleAddEvent(note.id)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                              >
                                Add Event
                              </button>
                              <button
                                onClick={() => setShowAddEventForm(null)}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {eventsWithDiffs.length === 0 ? (
                      <div className="text-gray-500 italic">No events found in this timeline</div>
                    ) : (
                      <div className="space-y-4">
                        {/* Preview marker at the beginning if new event should be first */}
                        {(() => {
                          if (!newEventDate || showAddEventForm !== note.id || eventsWithDiffs.length === 0) {
                            return null;
                          }
                          
                          const newEventMoment = moment(newEventDate);
                          const firstEvent = eventsWithDiffs[0];
                          
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
                                    <h2 className="text-2xl font-bold text-blue-800 border-b-2 border-blue-300 pb-2">
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
                        
                        {eventsWithDiffs.map((event, index) => {
                          const currentYear = event.date ? event.date.year() : null;
                          const previousYear = index > 0 && eventsWithDiffs[index - 1].date 
                            ? eventsWithDiffs[index - 1].date.year() 
                            : null;
                          const showYearHeader = currentYear && currentYear !== previousYear;
                          
                          // Check if we should insert preview marker here
                          const shouldShowPreview = showAddEventForm === note.id && newEventDate;
                          let showPreviewBefore = false;
                          
                          if (shouldShowPreview && event.date) {
                            const newEventMoment = moment(newEventDate);
                            const isAfterThis = newEventMoment.isAfter(event.date);
                            const isBeforeNext = index === eventsWithDiffs.length - 1 || 
                              !eventsWithDiffs[index + 1].date || 
                              newEventMoment.isBefore(eventsWithDiffs[index + 1].date);
                            
                            showPreviewBefore = isAfterThis && isBeforeNext;
                          }

                          const isSelected = isEventSelected(note.id, index);
                          const isHighlighted = isSelected && selectedEvents[note.id] && selectedEvents[note.id].length === 2;
                          
                          return (
                            <React.Fragment key={index}>
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
                                          <h2 className="text-2xl font-bold text-blue-800 border-b-2 border-blue-300 pb-2">
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
                                        {event.date.format('DD/MMM/YYYY')}
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
                                        </a>
                                      ) : (
                                        <h3 className={`text-lg font-semibold ${
                                          event.isToday
                                            ? 'text-emerald-700 font-bold'
                                            : event.isTotal
                                            ? 'text-green-700 font-bold'
                                            : event.isDuration
                                              ? 'text-orange-600 font-bold'
                                              : event.isLinkedEvent
                                                ? 'text-indigo-600 font-semibold'
                                                : event.isVirtual 
                                                  ? 'text-purple-600' 
                                                  : 'text-gray-900'
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
                                      )}
                                      {event.isLinkedEvent && (
                                        <div className="inline-flex items-center gap-2">
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 border border-indigo-200">
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
                                        </div>
                                      )}
                                      {!event.isLinkedEvent && !event.isTotal && !event.isDuration && !event.isVirtual && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            const timelineData = parseTimelineData(note.content, notes);
                                            const eventToLink = timelineData.events[index];
                                            setAddLinkModal({ 
                                              isOpen: true, 
                                              timelineId: note.id, 
                                              eventIndex: index, 
                                              currentLink: eventToLink.link || '' 
                                            });
                                          }}
                                          className="inline-flex items-center px-2 py-1 rounded text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors ml-auto"
                                          title={event.link ? 'Edit link' : 'Add link'}
                                        >
                                          <LinkIcon className="h-3 w-3 mr-1" />
                                          {event.link ? 'Edit' : 'Add'} Link
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  
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
                    )}
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
            
            {/* Closed Timelines */}
            {(() => {
              const closedTimelines = filteredAndSortedTimelineNotes.filter(note => {
                if (!note || !note.content) return false;
                // Exclude flagged timelines (they appear in Flagged section)
                if (note.content.includes('meta::flagged_timeline')) return false;
                const timelineData = parseTimelineData(note.content, notes);
                return timelineData.isClosed;
              });
              
              if (closedTimelines.length > 0) {
                return (
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold bg-gradient-to-r from-slate-600 to-gray-600 bg-clip-text text-transparent">
                      Closed Timelines <span className="font-normal text-slate-400">({closedTimelines.length})</span>
                    </h2>
                    {closedTimelines.map((note) => {
                      if (!note || !note.content) return null;
                      const timelineData = parseTimelineData(note.content, notes);
                      const eventsWithDiffs = calculateTimeDifferences(timelineData.events, timelineData.isClosed, timelineData.totalDollarAmount);

                      return (
                        <div key={note.id} className="bg-white rounded-xl shadow-md border-l-4 border-slate-300 overflow-hidden opacity-80 hover:opacity-100 hover:shadow-lg transition-all">
                          {/* Timeline Header */}
                          <div 
                            className="bg-gradient-to-r from-slate-50 to-gray-50 px-6 py-4 cursor-pointer hover:from-slate-100 hover:to-gray-100 border-b border-slate-200/50 transition-all"
                            onClick={() => toggleTimelineCollapse(note.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="text-slate-500">
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
                                  <h2 className="text-xl font-semibold text-gray-600">
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
                                      
                                      // Calculate duration for closed timelines
                                      let durationText = '';
                                      if (timelineData.isClosed && lastEvent.date) {
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
                                      
                                      // Show total amount if it exists
                                      const totalAmount = timelineData.totalDollarAmount && timelineData.totalDollarAmount > 0
                                        ? `$${timelineData.totalDollarAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                        : null;
                                      
                                      return (
                                        <>
                                          <div className="text-sm font-normal text-gray-500 mt-1">
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
                                {timelineData.isClosed && (
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
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleFlagged(note.id);
                                  }}
                                  className={`px-3 py-1.5 rounded-md transition-colors flex items-center space-x-1.5 border ${
                                    note.content.includes('meta::flagged_timeline')
                                      ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
                                      : 'bg-gray-50 hover:bg-gray-100 text-gray-500 border-gray-300'
                                  }`}
                                  title={note.content.includes('meta::flagged_timeline') ? 'Unflag timeline' : 'Flag timeline (needs attention)'}
                                >
                                  <FlagIcon className="h-4 w-4" />
                                  <span className="text-sm font-medium">Flag</span>
                                </button>
                                <label 
                                  className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-md transition-colors cursor-pointer flex items-center space-x-1.5 border border-gray-300"
                                  title={note.content.includes('meta::tracked') ? 'Untrack timeline' : 'Track timeline'}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleTracked(note.id);
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={note.content.includes('meta::tracked')}
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

                          {/* Timeline Events */}
                          {!collapsedTimelines.has(note.id) && (
                            <div className="p-6">
                              {eventsWithDiffs.length === 0 ? (
                                <div className="text-gray-500 italic">No events found in this timeline</div>
                              ) : (
                                <div className="space-y-4">
                                  {eventsWithDiffs.map((event, index) => {
                                    const currentYear = event.date ? event.date.year() : null;
                                    const previousYear = index > 0 && eventsWithDiffs[index - 1].date 
                                      ? eventsWithDiffs[index - 1].date.year() 
                                      : null;
                                    const showYearHeader = currentYear && currentYear !== previousYear;

                                    return (
                                      <div key={index}>
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
                                                  {event.date.format('DD/MMM/YYYY')}
                                                </span>
                                              )}
                                              <div className="flex items-center gap-2">
                                                <h3 className={`text-lg font-semibold ${
                                                  event.isToday
                                                    ? 'text-emerald-700 font-bold'
                                                    : event.isTotal
                                                      ? 'text-green-700 font-bold'
                                                      : event.isDuration
                                                        ? 'text-orange-600 font-bold'
                                                        : event.isLinkedEvent
                                                          ? 'text-indigo-600 font-semibold'
                                                          : event.isVirtual 
                                                            ? 'text-purple-600' 
                                                            : 'text-gray-900'
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
                                                {event.isLinkedEvent && (
                                                  <div className="inline-flex items-center gap-2">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 border border-indigo-200">
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
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                            
                                            {/* Second line with age and time differences for closed timelines */}
                                            {(!event.isVirtual || event.isToday) && !event.isTotal && !event.isDuration && (
                                              <div className="flex items-center space-x-2 mb-1">
                                                {event.date && (
                                                  <span className="text-xs px-2 py-1 rounded font-medium text-gray-600 bg-gray-100">
                                                    {calculateAge(event.date)}
                                                  </span>
                                                )}
                                                {event.daysFromPrevious !== undefined && (
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
                                                {event.daysFromStart !== undefined && (
                                                  <span className="text-xs px-2 py-1 rounded font-medium text-gray-600 bg-gray-100">
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
                                              </div>
                                            )}
                                          </div>
                                        </div>
                </div>
              );
            })}
                                </div>
                              )}
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
      </div>
    </div>
  );
};

export default Timelines;
