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

  useEffect(() => {
    if (notes) {
      // Filter notes that contain meta::timeline tag
      const filteredNotes = notes.filter(note => 
        note.content && note.content.includes('meta::timeline')
      );
      setTimelineNotes(filteredNotes);
    }
  }, [notes]);

  // Parse timeline data from note content
  const parseTimelineData = (content) => {
    const lines = content.split('\n');
    const timelineData = {
      timeline: '',
      events: [],
      isClosed: false
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
              lineIndex: index + 1 // +1 because we skipped the title line
            });
          } else {
            // If not a valid date, treat as event without date
            timelineData.events.push({
              event: trimmedLine,
              date: null,
              dateStr: '',
              lineIndex: index + 1
            });
          }
        } else {
          // If no colon found, treat as event without date
          timelineData.events.push({
            event: trimmedLine,
            date: null,
            dateStr: '',
            lineIndex: index + 1
          });
        }
      }
    });
    
    return timelineData;
  };

  // Calculate time differences between events
  const calculateTimeDifferences = (events, isClosed = false) => {
    if (events.length === 0) return events;
    
    // Sort events by date first (events without dates go to the end)
    const sortedEvents = [...events].sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return a.date.diff(b.date);
    });
    
    let eventsWithDiffs = [...sortedEvents];
    
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
      eventsWithDiffs = [...sortedEvents, todayEvent];
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
          eventsWithDiffs = [...sortedEvents, durationEvent];
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            Timelines
          </h1>
          
          {/* Search Box and New Timeline Button */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
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
            
            {/* New Timeline Button */}
            <div>
              <button
                onClick={() => setShowNewTimelineForm(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-green-400 text-white rounded-lg hover:bg-green-500 focus:outline-none focus:ring-2 focus:ring-green-400 transition-colors"
              >
                <PlusIcon className="h-5 w-5" />
                <span>Start New Timeline</span>
              </button>
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
          <div className="space-y-8">
            {filteredAndSortedTimelineNotes.map((note) => {
              const timelineData = parseTimelineData(note.content);
              const eventsWithDiffs = calculateTimeDifferences(timelineData.events, timelineData.isClosed);

              return (
                <div key={note.id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                  {/* Timeline Header */}
                  <div className="bg-gradient-to-r from-blue-400 to-blue-500 text-white px-6 py-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-semibold text-blue-50">
                        {timelineData.timeline || 'Untitled Timeline'}
                        {(() => {
                          const eventsWithDates = timelineData.events.filter(event => event.date);
                          if (eventsWithDates.length > 0) {
                            const startDate = eventsWithDates[0].date;
                            const lastEvent = eventsWithDates[eventsWithDates.length - 1];
                            const eventCount = timelineData.events.length;
                            
                            return (
                              <span className="text-lg font-normal text-blue-100 ml-2">
                                ({startDate.format('DD/MMM/YYYY')} - {lastEvent.date.format('DD/MMM/YYYY')}) ({eventCount} events)
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </h2>
                      <div className="flex items-center space-x-2">
                        {!timelineData.isClosed && (
                          <button
                            onClick={() => setShowAddEventForm(note.id)}
                            className="p-2 bg-white bg-opacity-15 hover:bg-opacity-25 rounded-lg transition-colors"
                            title="Add new event"
                          >
                            <PlusIcon className="h-5 w-5" />
                          </button>
                        )}
                        {!timelineData.isClosed && (
                          <button
                            onClick={() => handleCloseTimeline(note.id)}
                            className="p-2 bg-white bg-opacity-15 hover:bg-opacity-25 rounded-lg transition-colors"
                            title="Close timeline"
                          >
                            <XCircleIcon className="h-5 w-5" />
                          </button>
                        )}
                        {timelineData.isClosed && (
                          <button
                            onClick={() => handleReopenTimeline(note.id)}
                            className="p-2 bg-white bg-opacity-15 hover:bg-opacity-25 rounded-lg transition-colors"
                            title="Reopen timeline"
                          >
                            <ArrowPathIcon className="h-5 w-5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleViewNote(note.id)}
                          className="p-2 bg-white bg-opacity-15 hover:bg-opacity-25 rounded-lg transition-colors"
                          title="View note in Notes page"
                        >
                          <ArrowTopRightOnSquareIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Timeline Events */}
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
                                    event.isDuration
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
                                      event.isDuration
                                        ? 'text-orange-600 font-bold'
                                        : event.isVirtual 
                                          ? 'text-purple-600' 
                                          : 'text-gray-900'
                                    }`}>
                                      {event.isDuration 
                                        ? event.event 
                                        : event.event.charAt(0).toUpperCase() + event.event.slice(1)
                                      }
                                      {!event.isDuration && event.daysFromPrevious !== undefined && (
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
                                  {!event.isDuration && event.daysFromStart !== undefined && (
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

                    {/* Add Event Form */}
                    {showAddEventForm === note.id && (
                      <div className="mt-6 pt-4 border-t border-gray-200">
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
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
                                className="flex items-center space-x-2 px-4 py-2 bg-blue-400 text-white rounded-md hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400"
                              >
                                <PlusIcon className="h-4 w-4" />
                                <span>Add Event</span>
                              </button>
                              <button
                                onClick={() => {
                                  setShowAddEventForm(null);
                                  setNewEventText('');
                                  setNewEventDate('');
                                }}
                                className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
                              >
                                <XMarkIcon className="h-4 w-4" />
                                <span>Cancel</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
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
