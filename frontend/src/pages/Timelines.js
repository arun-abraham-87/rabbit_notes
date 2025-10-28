import React, { useState, useEffect } from 'react';
import moment from 'moment';
import { PlusIcon, XMarkIcon, ArrowTopRightOnSquareIcon, XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/solid';
import { useNavigate } from 'react-router-dom';

const Timelines = ({ notes, updateNote, addNote }) => {
  const navigate = useNavigate();
  const [timelineNotes, setTimelineNotes] = useState([]);
  const [showAddEventForm, setShowAddEventForm] = useState(null);
  const [newEventText, setNewEventText] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewTimelineForm, setShowNewTimelineForm] = useState(false);
  const [newTimelineTitle, setNewTimelineTitle] = useState('');
  const [collapsedTimelines, setCollapsedTimelines] = useState(new Set());

  useEffect(() => {
    if (notes) {
      // Filter notes that contain meta::timeline tag
      const filteredNotes = notes.filter(note => 
        note.content && note.content.includes('meta::timeline')
      );
      setTimelineNotes(filteredNotes);
      
      // Set all timelines as collapsed by default
      const noteIds = filteredNotes.map(note => note.id);
      setCollapsedTimelines(new Set(noteIds));
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
      return `<span class="text-green-600 font-semibold">${match}</span>`;
    });
  };

  // Parse timeline data from note content
  const parseTimelineData = (content) => {
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
        // Try to parse event:date format
        const eventMatch = trimmedLine.match(/^(.+?)\s*:\s*(.+)$/);
        if (eventMatch) {
          const [, event, dateStr] = eventMatch;
          
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
              dollarAmount: eventDollarAmount
            });
          } else {
            // If not a valid date, treat as event without date
            timelineData.events.push({
              event: trimmedLine,
              date: null,
              dateStr: '',
              lineIndex: index + 1,
              dollarAmount: eventDollarAmount
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
            dollarAmount: eventDollarAmount
          });
        }
      }
    });
    
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
      // Add "Today" as a virtual event at the end for open timelines
      const today = moment();
      const todayEvent = {
        event: 'Today',
        date: today,
        dateStr: today.format('DD/MM/YYYY'),
        lineIndex: -1, // Virtual event
        isVirtual: true
      };
      eventsWithDiffs = [...eventsWithDiffs, todayEvent];
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
        .map(note => parseTimelineData(note.content));
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
        .map(note => parseTimelineData(note.content));
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
        .map(note => parseTimelineData(note.content));
      setTimelineNotes(timelineNotes);
    } catch (error) {
      console.error('Error toggling tracked status:', error);
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
      return newSet;
    });
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

      // Reset form
      setNewEventText('');
      setNewEventDate('');
      setShowAddEventForm(null);
    } catch (error) {
      console.error('Error adding event:', error);
      alert('Failed to add event. Please try again.');
    }
  };

  // Filter and sort timeline notes
  const filteredAndSortedTimelineNotes = timelineNotes
    .filter(note => {
      // Safety check: ensure note has valid content
      if (!note || !note.content) return false;
      if (!searchQuery.trim()) return true;
      const timelineData = parseTimelineData(note.content);
      return timelineData.timeline.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      const aData = parseTimelineData(a.content);
      const bData = parseTimelineData(b.content);
      
      if (!aData.timeline && !bData.timeline) return 0;
      if (!aData.timeline) return 1;
      if (!bData.timeline) return -1;
      
      return aData.timeline.localeCompare(bData.timeline);
    });

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">
              Timelines
            </h1>
            <button
              onClick={() => setShowNewTimelineForm(true)}
              className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              <span>New Timeline</span>
            </button>
          </div>
          
          {/* Search Box */}
          <div className="flex flex-col gap-4">
            <div className="flex-1 max-w-md">
              <label htmlFor="timeline-search" className="block text-sm font-medium text-gray-700 mb-2">
                Search Timelines
              </label>
              <div className="relative">
                <input
                  id="timeline-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by timeline title..."
                  className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
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
            {/* Open Timelines */}
            {(() => {
              const openTimelines = filteredAndSortedTimelineNotes.filter(note => {
                if (!note || !note.content) return false;
                const timelineData = parseTimelineData(note.content);
                return !timelineData.isClosed;
              });
              
              if (openTimelines.length > 0) {
                return (
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-gray-700">
                      Open Timelines <span className="font-normal text-gray-500">({openTimelines.length})</span>
                    </h2>
                    {openTimelines.map((note) => {
              if (!note || !note.content) return null;
              const timelineData = parseTimelineData(note.content);
              const eventsWithDiffs = calculateTimeDifferences(timelineData.events, timelineData.isClosed, timelineData.totalDollarAmount);

              return (
                <div key={note.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  {/* Timeline Header */}
                  <div 
                    className="bg-gray-50 px-6 py-4 cursor-pointer hover:bg-gray-100 border-b border-gray-200 transition-colors"
                    onClick={() => toggleTimelineCollapse(note.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="text-gray-600">
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
                        <h2 className="text-xl font-semibold text-gray-900">
                          {timelineData.timeline || 'Untitled Timeline'}
                          {(() => {
                            const eventsWithDates = timelineData.events.filter(event => event.date);
                            if (eventsWithDates.length > 0) {
                              const startDate = eventsWithDates[0].date;
                              const lastEvent = eventsWithDates[eventsWithDates.length - 1];
                              const eventCount = timelineData.events.length;
                              
                              return (
                                <span className="text-base font-normal text-gray-600 ml-2">
                                  ({startDate.format('DD/MMM/YYYY')} - {lastEvent.date.format('DD/MMM/YYYY')}) ({eventCount} events)
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </h2>
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
                            className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-md transition-colors flex items-center space-x-1.5 border border-green-200"
                            title="Reopen timeline"
                          >
                            <ArrowPathIcon className="h-4 w-4" />
                            <span className="text-sm font-medium">Reopen</span>
                          </button>
                        )}
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
                                    <h2 className="text-2xl font-bold text-gray-800 border-b-2 border-gray-300 pb-2">
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
                                    event.isTotal
                                      ? 'bg-green-600 border-green-600'
                                      : event.isDuration
                                        ? 'bg-orange-500 border-orange-500'
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
                                      <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded font-medium">
                                        {event.date.format('DD/MMM/YYYY')}
                                      </span>
                                    )}
                                    <h3 className={`text-lg font-semibold ${
                                      event.isTotal
                                        ? 'text-green-700 font-bold'
                                        : event.isDuration
                                          ? 'text-orange-600 font-bold'
                                          : event.isVirtual 
                                            ? 'text-purple-600' 
                                            : 'text-gray-900'
                                    }`}>
                                      {event.isTotal || event.isDuration ? (
                                        event.event
                                      ) : (
                                        <span 
                                          dangerouslySetInnerHTML={{
                                            __html: highlightDollarValues(
                                              event.event.charAt(0).toUpperCase() + event.event.slice(1)
                                            )
                                          }}
                                        />
                                      )}
                                      {!event.isDuration && !event.isTotal && event.daysFromPrevious !== undefined && (
                                        <span className="text-black font-normal text-sm ml-2">
                                          ({(() => {
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
                                          })()})
                                        </span>
                                      )}
                                    </h3>
                                  </div>
                                  
                                  {/* Time differences - only show days since start */}
                                  {!event.isDuration && !event.isTotal && event.daysFromStart !== undefined && (
                                    <div className="text-sm text-gray-600">
                                      <div className="flex items-center space-x-2">
                                        <span className="text-green-600 font-medium">
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
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </React.Fragment>
                          );
                        })}
                        
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
                const timelineData = parseTimelineData(note.content);
                return timelineData.isClosed;
              });
              
              if (closedTimelines.length > 0) {
                return (
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-gray-700">
                      Closed Timelines <span className="font-normal text-gray-500">({closedTimelines.length})</span>
                    </h2>
                    {closedTimelines.map((note) => {
                      if (!note || !note.content) return null;
                      const timelineData = parseTimelineData(note.content);
                      const eventsWithDiffs = calculateTimeDifferences(timelineData.events, timelineData.isClosed, timelineData.totalDollarAmount);

                      return (
                        <div key={note.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden opacity-75">
                          {/* Timeline Header */}
                          <div 
                            className="bg-gray-50 px-6 py-4 cursor-pointer hover:bg-gray-100 border-b border-gray-200 transition-colors"
                            onClick={() => toggleTimelineCollapse(note.id)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="text-gray-500">
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
                                <h2 className="text-xl font-semibold text-gray-600">
                                  {timelineData.timeline || 'Untitled Timeline'}
                                  {(() => {
                                    const eventsWithDates = timelineData.events.filter(event => event.date);
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
                                        durationText = ` • ${durationText_formatted}`;
                                      }
                                      
                                      return (
                                        <span className="text-base font-normal text-gray-500 ml-2">
                                          ({startDate.format('DD/MMM/YYYY')} - {lastEvent.date.format('DD/MMM/YYYY')}) ({eventCount} events{durationText})
                                        </span>
                                      );
                                    }
                                    return null;
                                  })()}
                                </h2>
                              </div>
                              <div className="flex items-center space-x-2">
                                {timelineData.isClosed && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleReopenTimeline(note.id);
                                    }}
                                    className="px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-md transition-colors flex items-center space-x-1.5 border border-green-200"
                                    title="Reopen timeline"
                                  >
                                    <ArrowPathIcon className="h-4 w-4" />
                                    <span className="text-sm font-medium">Reopen</span>
                                  </button>
                                )}
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
                                              <h2 className="text-2xl font-bold text-gray-800 border-b-2 border-gray-300 pb-2">
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
                                              event.isTotal
                                                ? 'bg-green-600 border-green-600'
                                                : event.isDuration
                                                  ? 'bg-orange-500 border-orange-500'
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
                                                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded font-medium">
                                                  {event.date.format('DD/MMM/YYYY')}
                                                </span>
                                              )}
                                              <h3 className={`text-lg font-semibold ${
                                                event.isTotal
                                                  ? 'text-green-700 font-bold'
                                                  : event.isDuration
                                                    ? 'text-orange-600 font-bold'
                                                    : event.isVirtual 
                                                      ? 'text-purple-600' 
                                                      : 'text-gray-900'
                                              }`}>
                                                {event.isTotal || event.isDuration ? (
                                                  event.event
                                                ) : (
                                                  <span 
                                                    dangerouslySetInnerHTML={{
                                                      __html: highlightDollarValues(
                                                        event.event.charAt(0).toUpperCase() + event.event.slice(1)
                                                      )
                                                    }}
                                                  />
                                                )}
                                                {!event.isDuration && !event.isTotal && event.daysFromPrevious !== undefined && (
                                                  <span className="text-black font-normal text-sm ml-2">
                                                    ({(() => {
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
                                                    })()})
                                                  </span>
                                                )}
                                              </h3>
                                            </div>
                                            
                                            {/* Time differences - only show days since start */}
                                            {!event.isDuration && !event.isTotal && event.daysFromStart !== undefined && (
                                              <div className="text-sm text-gray-600">
                                                <div className="flex items-center space-x-2">
                                                  <span className="text-green-600 font-medium">
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
                                                </div>
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
      </div>
    </div>
  );
};

export default Timelines;
