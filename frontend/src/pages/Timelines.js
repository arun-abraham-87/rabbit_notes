import React, { useState, useEffect } from 'react';
import moment from 'moment';
import { PlusIcon, XMarkIcon } from '@heroicons/react/24/solid';

const Timelines = ({ notes, updateNote, addNote }) => {
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
      events: []
    };
    
    // Get content lines (non-meta lines)
    const contentLines = lines.filter(line => 
      !line.trim().startsWith('meta::') && line.trim() !== ''
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
          const parsedDate = moment(dateStr, ['DD/MM/YYYY', 'DD-MM-YYYY', 'YYYY-MM-DD', 'MM/DD/YYYY'], true);
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
  const calculateTimeDifferences = (events) => {
    if (events.length < 2) return events;
    
    const eventsWithDiffs = [...events];
    const startDate = events[0].date;
    
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
                className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
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
              const eventsWithDiffs = calculateTimeDifferences(timelineData.events);

              return (
                <div key={note.id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                  {/* Timeline Header */}
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-4">
                    <h2 className="text-2xl font-bold">
                      {timelineData.timeline || 'Untitled Timeline'}
                    </h2>
                    <p className="text-blue-100 text-sm mt-1">
                      Note ID: {note.id}
                    </p>
                  </div>

                  {/* Timeline Events */}
                  <div className="p-6">
                    {eventsWithDiffs.length === 0 ? (
                      <div className="text-gray-500 italic">No events found in this timeline</div>
                    ) : (
                      <div className="space-y-4">
                        {eventsWithDiffs.map((event, index) => (
                          <div key={index} className="flex items-start space-x-4">
                            {/* Timeline connector */}
                            <div className="flex flex-col items-center">
                              <div className={`w-4 h-4 rounded-full border-2 ${
                                index === 0 
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
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {event.event}
                                </h3>
                                {event.date && (
                                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                    {event.date.format('DD/MMM/YYYY')}
                                  </span>
                                )}
                              </div>
                              
                              {/* Time differences */}
                              <div className="text-sm text-gray-600 space-y-1">
                                {event.daysFromStart !== undefined && (
                                  <div className="flex items-center space-x-2">
                                    <span className="text-green-600 font-medium">
                                      {event.daysFromStart} days since start
                                    </span>
                                  </div>
                                )}
                                {event.daysFromPrevious !== undefined && (
                                  <div className="flex items-center space-x-2">
                                    <span className="text-orange-600 font-medium">
                                      {event.daysFromPrevious} days since last event
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Event Button */}
                    <div className="mt-6 pt-4 border-t border-gray-200">
                      {showAddEventForm === note.id ? (
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
                                className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                      ) : (
                        <button
                          onClick={() => setShowAddEventForm(note.id)}
                          className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
                        >
                          <PlusIcon className="h-4 w-4" />
                          <span>Add Event</span>
                        </button>
                      )}
                    </div>
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
                    className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
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
