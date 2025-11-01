import React, { useState, useEffect, useRef } from 'react';
import { getDateInDDMMYYYYFormatWithAgeInParentheses } from '../utils/DateUtils';
import { 
  ChevronRightIcon, 
  ChevronLeftIcon, 
  CalendarIcon, 
  EyeIcon, 
  EyeSlashIcon, 
  PencilIcon,
  XMarkIcon,
  DocumentTextIcon,
  FlagIcon,
  SparklesIcon,
  InformationCircleIcon,
  CodeBracketIcon,
  FunnelIcon,
  ClockIcon,
  PlusIcon,
  LinkIcon
} from '@heroicons/react/24/solid';
import EventAlerts from './EventAlerts';
import EditEventModal from './EditEventModal';
import EventsByAgeView from './EventsByAgeView';
import TimelineLinkModal from './TimelineLinkModal';

const CalendarView = ({ events, onAcknowledgeEvent, onEventUpdated, notes, onAddEvent, onDelete, selectedEventIndex, onEventSelect, showPastEvents: showPastEventsProp, onShowPastEventsChange, onTimelineUpdated }) => {
  const [showPastEventsInternal, setShowPastEventsInternal] = useState(false);
  // Use prop if provided, otherwise use internal state
  const showPastEvents = showPastEventsProp !== undefined ? showPastEventsProp : showPastEventsInternal;
  const setShowPastEvents = onShowPastEventsChange || setShowPastEventsInternal;
  const [showDetails, setShowDetails] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [rawNote, setRawNote] = useState(null);
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' or 'age'
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [selectedEventForTimeline, setSelectedEventForTimeline] = useState(null);
  const selectedEventRef = useRef(null);

  // Function to calculate age in years, months, and days
  const calculateAge = (date) => {
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

  // Function to get all occurrences of an event for the current year
  const getEventOccurrences = (event) => {
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

  // Helper function to get timeline info from event content
  const getTimelineInfo = (eventContent) => {
    const lines = eventContent.split('\n');
    const timelineLinkLine = lines.find(line => line.trim().startsWith('meta::linked_to_timeline::'));
    
    if (timelineLinkLine) {
      const timelineId = timelineLinkLine.replace('meta::linked_to_timeline::', '').trim();
      const timelineNote = notes.find(note => note.id === timelineId);
      
      if (timelineNote) {
        // Extract timeline title (first non-meta line)
        const timelineLines = timelineNote.content.split('\n');
        const firstLine = timelineLines.find(line => 
          line.trim() && !line.trim().startsWith('meta::') && line.trim() !== 'Closed'
        );
        return {
          id: timelineId,
          title: firstLine || 'Untitled Timeline'
        };
      }
    }
    return null;
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
      notes,
      customFields
    };
  };

  // Get all event occurrences for the current year
  const allOccurrences = events.flatMap(event => {
    const occurrences = getEventOccurrences(event);
    const eventDetails = getEventDetails(event.content);
    return occurrences.map(date => ({
      date,
      event: {
        ...event,
        tags: eventDetails.tags,
        customFields: eventDetails.customFields,
        notes: eventDetails.notes
      },
      originalEvent: event, // Store the original event
      isToday: date.toDateString() === new Date().toDateString(),
      isPast: date < new Date() && !(date.toDateString() === new Date().toDateString()),
      age: calculateAge(event.dateTime)
    }));
  });

  // Filter and sort occurrences
  const filteredOccurrences = allOccurrences.filter(occurrence => 
    showPastEvents || !occurrence.isPast
  );
  const sortedOccurrences = filteredOccurrences.sort((a, b) => a.date - b.date);

  // Group occurrences by month
  const groupedByMonth = sortedOccurrences.reduce((acc, occurrence) => {
    const month = occurrence.date.toLocaleString('default', { month: 'long' });
    if (!acc[month]) {
      acc[month] = [];
    }
    acc[month].push(occurrence);
    return acc;
  }, {});

  // Filter events based on current filters
  const filteredEvents = events;

  const handleEditEvent = (event) => {
    const originalNote = notes.find(n => n.id === event.id);
    if (originalNote) {
      setEditingEvent(originalNote);
      setShowEditEventModal(true);
    }
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    setEditingEvent(null);
    setShowEditEventModal(true);
  };

  const handleEventUpdated = (updatedEvent) => {
    onEventUpdated(editingEvent.id, updatedEvent);
    setEditingEvent(null);
  };

  const handleDelete = async (deletedId) => {
    onDelete(deletedId);
  };

  const handleToggleDeadline = async (event) => {
    const hasDeadline = event.content.includes('meta::event_deadline');
    let updatedContent;
    
    if (hasDeadline) {
      // Remove the deadline tag
      updatedContent = event.content.replace('\nmeta::event_deadline', '');
    } else {
      // Add the deadline tag
      updatedContent = event.content.trim() + '\nmeta::event_deadline';
    }
    
    // Update the event
    onEventUpdated(event.id,updatedContent);
  };

  const handleToggleHidden = async (event) => {
    const isHidden = event.content.includes('meta::event_hidden');
    const updatedContent = isHidden
      ? event.content.replace('\nmeta::event_hidden', '')
      : event.content.trim() + '\nmeta::event_hidden';
    
    await onEventUpdated(event.id, updatedContent);
  };

  const handleOpenTimelineModal = (event) => {
    setSelectedEventForTimeline(event);
    setShowTimelineModal(true);
  };

  const handleCloseTimelineModal = () => {
    setShowTimelineModal(false);
    setSelectedEventForTimeline(null);
  };

  // Auto-scroll to selected event
  useEffect(() => {
    if (selectedEventIndex >= 0 && selectedEventRef.current) {
      selectedEventRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    }
  }, [selectedEventIndex]);

  return (
    <div className="space-y-8">
      {/* Alerts Section */}
      <EventAlerts events={events} onAcknowledgeEvent={onAcknowledgeEvent} />

      <div className="flex justify-end gap-4">
        <button
          onClick={() => setViewMode(viewMode === 'calendar' ? 'age' : 'calendar')}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <ClockIcon className="w-4 h-4" />
          {viewMode === 'calendar' ? 'View by Age' : 'View Calendar'}
        </button>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <InformationCircleIcon className="w-4 h-4" />
          {showDetails ? 'Hide Details' : 'Show Details'}
        </button>
        <button
          onClick={() => setShowPastEvents(!showPastEvents)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {showPastEvents ? (
            <>
              <EyeSlashIcon className="w-4 h-4" />
              Hide Past Events
            </>
          ) : (
            <>
              <EyeIcon className="w-4 h-4" />
              Show Past Events
            </>
          )}
        </button>
      </div>

      {viewMode === 'calendar' ? (
        Object.entries(groupedByMonth).map(([month, occurrences]) => {
          const isCurrentMonth = month === new Date().toLocaleString('default', { month: 'long' });
          
          // Group occurrences by date
          const occurrencesByDate = occurrences.reduce((acc, occurrence) => {
            const dateKey = occurrence.date.toDateString();
            if (!acc[dateKey]) {
              acc[dateKey] = [];
            }
            acc[dateKey].push(occurrence);
            return acc;
          }, {});

          return (
            <div 
              key={month} 
              className="space-y-4"
            >
              <h2 className="text-xl font-semibold text-gray-900 sticky top-0 bg-white py-2 z-10">
                {month}
              </h2>
              <div className="space-y-4">
                {Object.entries(occurrencesByDate).map(([dateKey, dateOccurrences]) => {
                  const firstOccurrence = dateOccurrences[0];
                  const isToday = firstOccurrence.isToday;
                  const isPast = firstOccurrence.isPast;
                  const dayNumber = firstOccurrence.date.getDate();
                  const totalEvents = dateOccurrences.length;

                  return (
                    <div key={dateKey} className="relative pl-12 group">
                      {/* Bracket-like timeline */}
                      <div className="absolute left-0 top-0 bottom-0 flex flex-col items-center">
                        {/* Top horizontal line */}
                        <div className={`w-8 h-0.5 ${
                          isPast ? 'bg-gray-300' : 'bg-gray-200'
                        }`} />
                        
                        {/* Vertical line */}
                        <div className={`w-0.5 flex-grow ${
                          isPast ? 'bg-gray-300' : 'bg-gray-200'
                        }`} />
                        
                        {/* Bottom horizontal line */}
                        <div className={`w-8 h-0.5 ${
                          isPast ? 'bg-gray-300' : 'bg-gray-200'
                        }`} />
                        
                        {/* Date circle */}
                        <div className={`absolute top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full cursor-pointer transition-all duration-200 ${
                          isPast 
                            ? 'bg-gray-400 text-white group-hover:bg-gray-500' 
                            : isToday 
                              ? 'bg-indigo-400 text-white group-hover:bg-indigo-500'
                              : 'bg-gray-400 text-white group-hover:bg-gray-500'
                        }`}>
                          <span className="text-sm font-bold">
                            {dayNumber}
                          </span>
                        </div>
                      </div>

                      {/* Event cards */}
                      <div className="space-y-4">
                        {dateOccurrences.map((occurrence, index) => {
                          const eventIndex = sortedOccurrences.findIndex(o => 
                            o.event.id === occurrence.event.id && o.date.toISOString() === occurrence.date.toISOString()
                          );
                          const isSelected = eventIndex === selectedEventIndex;
                          
                          return (
                            <div
                              key={`${occurrence.event.id}-${occurrence.date.toISOString()}`}
                              ref={isSelected ? selectedEventRef : null}
                              className={`transition-all duration-200 ${
                                occurrence.isPast ? 'opacity-60 group-hover:opacity-100' : ''
                              }`}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                
                                if (onEventSelect) {
                                  onEventSelect(eventIndex, occurrence.originalEvent);
                                }
                              }}
                            >
                              <div className={`p-4 rounded-lg border transition-all duration-200 ${
                                isSelected
                                  ? 'ring-2 ring-blue-500 ring-offset-2 bg-blue-50 border-blue-300'
                                  : occurrence.isPast 
                                    ? 'bg-gray-50 border-gray-200 group-hover:bg-gray-100 group-hover:border-gray-300' 
                                    : occurrence.isToday 
                                      ? 'border-2 border-indigo-500 bg-indigo-50 shadow-md group-hover:bg-indigo-100'
                                      : 'bg-white border-gray-200 group-hover:bg-gray-50 group-hover:border-gray-300'
                              } shadow-sm flex`}>
                              {/* Days indicator */}
                              <div className={`flex flex-col items-center justify-center min-w-[80px] mr-4 rounded-l-lg ${
                                occurrence.isPast 
                                  ? 'bg-gray-200 text-gray-600' 
                                  : occurrence.isToday 
                                    ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'
                                    : 'bg-blue-500 text-white'
                              }`}>
                                {occurrence.isToday ? (
                                  <div className="flex flex-col items-center justify-center py-2">
                                    <SparklesIcon className="h-8 w-8 mb-1" />
                                    <div className="text-xs font-medium">TODAY</div>
                                  </div>
                                ) : (
                                  <>
                                    <div className="text-2xl font-bold">
                                      {occurrence.isPast 
                                        ? Math.ceil((new Date() - occurrence.date) / (1000 * 60 * 60 * 24))
                                        : Math.ceil((occurrence.date - new Date()) / (1000 * 60 * 60 * 24))
                                      }
                                    </div>
                                    <div className="text-xs font-medium">
                                      {occurrence.isPast ? 'DAYS AGO' : 'DAYS TO'}
                                    </div>
                                  </>
                                )}
                              </div>

                              <div className="flex-1 space-y-3">
                                {/* Event description and date row */}
                                <div className="flex items-start justify-between">
                                  <div className="space-y-1">
                                    <h3 className={`text-lg font-medium ${
                                      occurrence.isToday ? 'text-indigo-900' : 'text-gray-900'
                                    }`}>
                                      {occurrence.event.content.includes('meta::event_hidden') ? (
                                        <div className="flex items-center gap-2">
                                          <span>XXXXXXXXXXXX</span>
                                          <button
                                            onClick={() => handleToggleHidden(occurrence.event)}
                                            className="text-xs text-indigo-600 hover:text-indigo-700 underline"
                                          >
                                            Reveal
                                          </button>
                                        </div>
                                      ) : (
                                        occurrence.event.description
                                      )}
                                      {occurrence.isToday && (
                                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                                          Today
                                        </span>
                                      )}
                                      {occurrence.event.content.includes('meta::event_deadline') && (
                                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                          Deadline
                                        </span>
                                      )}
                                    </h3>
                                    {occurrence.event.notes && (
                                      <p className="text-xs text-gray-500 mt-1">
                                        {occurrence.event.notes}
                                      </p>
                                    )}
                                    <div className="flex flex-col gap-1">
                                      <div className="grid grid-cols-[120px_1fr] gap-x-2">
                                        <p className="text-sm text-gray-600">
                                          <span className="font-medium">Original date:</span>
                                        </p>
                                        <p className="text-sm text-gray-600">
                                          {new Date(occurrence.event.dateTime).toLocaleDateString('en-US', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                          })}
                                        </p>
                                        {showDetails && (
                                          <>
                                            <p className={`text-sm ${
                                              occurrence.isToday ? 'text-indigo-700' : 'text-gray-500'
                                            }`}>
                                              <span className="font-medium">Date:</span>
                                            </p>
                                            <p className={`text-sm ${
                                              occurrence.isToday ? 'text-indigo-700' : 'text-gray-500'
                                            }`}>
                                              {getDateInDDMMYYYYFormatWithAgeInParentheses(occurrence.date)}
                                            </p>
                                          </>
                                        )}
                                        {occurrence.event.recurrence !== 'none' && occurrence.age && (
                                          <>
                                            <p className={`text-sm ${
                                              occurrence.isToday ? 'text-indigo-700' : 'text-gray-600'
                                            }`}>
                                              <span className="font-medium">Age:</span>
                                            </p>
                                            <p className={`text-sm ${
                                              occurrence.isToday ? 'text-indigo-700' : 'text-gray-600'
                                            }`}>
                                              {occurrence.age}
                                            </p>
                                          </>
                                        )}
                                        {/* Display custom fields */}
                                        {Object.entries(occurrence.event.customFields || {}).map(([key, value]) => (
                                          <React.Fragment key={key}>
                                            <p className={`text-sm ${
                                              occurrence.isToday ? 'text-indigo-700' : 'text-gray-600'
                                            }`}>
                                              <span className="font-medium">{key}:</span>
                                            </p>
                                            <p className={`text-sm ${
                                              occurrence.isToday ? 'text-indigo-700' : 'text-gray-600'
                                            }`}>
                                              {value}
                                            </p>
                                          </React.Fragment>
                                        ))}
                                      </div>
                                      {/* Tags display */}
                                      {((occurrence.event.tags && occurrence.event.tags.length > 0) || getTimelineInfo(occurrence.event.content)) && (
                                        <div className="mt-2 flex flex-wrap gap-1">
                                          {occurrence.event.tags && occurrence.event.tags.map(tag => (
                                            <span
                                              key={tag}
                                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                occurrence.isToday 
                                                  ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                                                  : 'bg-gray-100 text-gray-600 border border-gray-200'
                                              }`}
                                            >
                                              {tag}
                                            </span>
                                          ))}
                                          {(() => {
                                            const timelineInfo = getTimelineInfo(occurrence.event.content);
                                            return timelineInfo && (
                                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                occurrence.isToday 
                                                  ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                                                  : 'bg-gray-100 text-gray-600 border border-gray-200'
                                              }`}>
                                                <LinkIcon className="h-3 w-3 mr-1" />
                                                Timeline: {timelineInfo.title}
                                              </span>
                                            );
                                          })()}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    {occurrence.event.recurrence !== 'none' && (
                                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                                        occurrence.isPast 
                                          ? 'bg-gray-100 text-gray-500' 
                                          : 'bg-indigo-100 text-indigo-700'
                                      }`}>
                                        {occurrence.event.recurrence.charAt(0).toUpperCase() + occurrence.event.recurrence.slice(1)}
                                      </span>
                                    )}
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => handleToggleHidden(occurrence.event)}
                                        className={`p-2 rounded-lg transition-colors ${
                                          occurrence.event.content.includes('meta::event_hidden')
                                            ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                        }`}
                                        title={occurrence.event.content.includes('meta::event_hidden') ? "Show event" : "Hide event"}
                                      >
                                        {occurrence.event.content.includes('meta::event_hidden') ? (
                                          <EyeSlashIcon className="h-5 w-5" />
                                        ) : (
                                          <EyeIcon className="h-5 w-5" />
                                        )}
                                      </button>
                                      <button
                                        onClick={() => handleToggleDeadline(occurrence.event)}
                                        className={`p-2 rounded-lg transition-colors ${
                                          occurrence.event.content.includes('meta::event_deadline')
                                            ? 'text-red-500 hover:text-red-600 hover:bg-red-50'
                                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                        }`}
                                        title={occurrence.event.content.includes('meta::event_deadline') ? "Remove deadline" : "Mark as deadline"}
                                      >
                                        <FlagIcon className="h-5 w-5" />
                                      </button>
                                      <button
                                        onClick={() => setRawNote(occurrence.event)}
                                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                        title="View raw note"
                                      >
                                        <CodeBracketIcon className="h-5 w-5" />
                                      </button>
                                      <button
                                        onClick={() => handleEditEvent(occurrence.event)}
                                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                        title="Edit event"
                                      >
                                        <PencilIcon className="h-5 w-5" />
                                      </button>
                                      <button
                                        onClick={() => handleOpenTimelineModal(occurrence.event)}
                                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                        title="Link to timeline"
                                      >
                                        <LinkIcon className="h-5 w-5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      ) : (
        <EventsByAgeView 
          events={filteredEvents}
          onEventUpdated={onEventUpdated}
          onDelete={onDelete}
          notes={notes}
        />
      )}

      {/* Edit Event Modal */}
      {showEditEventModal && (
        <EditEventModal
          isOpen={showEditEventModal}
          note={editingEvent}
          onSave={(content) => {
            if (editingEvent) {
              // Update existing event
              const note = notes.find(n => n.id === editingEvent.id);
              if (note) {
                // Preserve the original meta tags
                const originalLines = note.content.split('\n');
                const metaTags = originalLines.filter(line => 
                  line.startsWith('meta::') && 
                  !line.startsWith('meta::event::')
                );
                
                // Combine new content with preserved meta tags
                const updatedContent = content + '\n' + metaTags.join('\n');
                
                // Update the note
                const updatedNote = { ...note, content: updatedContent };
                onEventUpdated(editingEvent.id, updatedContent);
              }
            } else {
              // Add new event
              const newNote = {
                id: Date.now().toString(),
                content: content,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
              onAddEvent(newNote);
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
          onDelete={handleDelete}
          notes={notes}
        />
      )}

      {/* Raw Note Modal */}
      {rawNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Raw Note Content</h2>
              <button
                onClick={() => setRawNote(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded-lg">
              {rawNote.content}
            </pre>
          </div>
        </div>
      )}
      {/* Timeline Link Modal */}
      <TimelineLinkModal
        isOpen={showTimelineModal}
        onClose={handleCloseTimelineModal}
        event={selectedEventForTimeline}
        allNotes={notes}
        onEventUpdated={onEventUpdated}
        onTimelineUpdated={onTimelineUpdated}
      />
    </div>
  );
};

export default CalendarView;