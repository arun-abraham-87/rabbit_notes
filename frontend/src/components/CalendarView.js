import React, { useState } from 'react';
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
  FlagIcon
} from '@heroicons/react/24/solid';
import EventAlerts from './EventAlerts';
import EditEventModal from './EditEventModal';
import AddEventModal from './AddEventModal';

const CalendarView = ({ events, onAcknowledgeEvent, onEventUpdated, notes,onAddEvent,onDelete }) => {
  const [showPastEvents, setShowPastEvents] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [rawNote, setRawNote] = useState(null);
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);

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

  // Get all event occurrences for the current year
  const allOccurrences = events.flatMap(event => {
    const occurrences = getEventOccurrences(event);
    return occurrences.map(date => ({
      date,
      event: event,
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

  const handleEditEvent = (event) => {
    setEditingEvent(event);
  };

  const handleEventUpdated = (updatedEvent) => {
    onEventUpdated(editingEvent.id, updatedEvent);
    setEditingEvent(null);
  };

  const handleDelete = async (deletedId) => {
    onDelete(deletedId);
  };

  const handleAddEvent = (newEvent) => {
    // Implementation of adding a new event
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

  // Function to extract event details from note content
  const getEventDetails = (content) => {
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

    // Calculate next occurrence for recurring events
    let nextOccurrence = null;

    return {
      description,
      dateTime,
      recurrence,
      metaDate,
      tags
    };
  };

  return (
    <div className="space-y-8">
      {/* Alerts Section */}
      <EventAlerts events={events} onAcknowledgeEvent={onAcknowledgeEvent} />

      <div className="flex justify-end">
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

      {Object.entries(groupedByMonth).map(([month, occurrences]) => {
        const isCurrentMonth = month === new Date().toLocaleString('default', { month: 'long' });
        return (
          <div 
            key={month} 
            className="space-y-4"
          >
            <h2 className="text-xl font-semibold text-gray-900 sticky top-0 bg-white py-2 z-10">
              {month}
            </h2>
            <div className="space-y-4">
              {occurrences.map((occurrence, index) => (
                <div
                  key={`${occurrence.event.id}-${occurrence.date.toISOString()}`}
                  className={`relative pl-8 ${
                    occurrence.isPast ? 'opacity-60' : ''
                  }`}
                >
                  {/* Timeline line */}
                  <div className={`absolute left-3 top-0 bottom-0 w-0.5 ${
                    occurrence.isPast ? 'bg-gray-300' : 'bg-gray-200'
                  }`} />
                  
                  {/* Timeline dot */}
                  <div className={`absolute left-2.5 top-4 w-3 h-3 rounded-full ${
                    occurrence.isPast ? 'bg-gray-400' : occurrence.isToday ? 'bg-indigo-400' : 'bg-gray-400'
                  }`} />

                  <div className={`ml-4 p-4 rounded-lg border ${
                    occurrence.isPast 
                      ? 'bg-gray-50 border-gray-200' 
                      : occurrence.isToday 
                        ? 'border-2 border-indigo-500 bg-indigo-50 shadow-md'
                        : 'bg-white border-gray-200'
                  } shadow-sm`}>
                    <div className="space-y-3">
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
                          <div className="flex flex-col gap-1">
                            <p className={`text-sm ${
                              occurrence.isToday ? 'text-indigo-700' : 'text-gray-500'
                            }`}>
                              {getDateInDDMMYYYYFormatWithAgeInParentheses(occurrence.date)}
                            </p>
                            <div className="flex items-center gap-2">
                              {occurrence.isPast && (
                                <span className="text-xs text-gray-400">
                                  {Math.ceil((new Date() - occurrence.date) / (1000 * 60 * 60 * 24))} days ago
                                </span>
                              )}
                              {!occurrence.isPast && !occurrence.isToday && (
                                <span className="text-xs text-indigo-600">
                                  {Math.ceil((occurrence.date - new Date()) / (1000 * 60 * 60 * 24))} days to event
                                </span>
                              )}
                              {occurrence.isToday && (
                                <span className="text-xs font-medium text-indigo-600">Today</span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                              Original date: {new Date(occurrence.event.dateTime).toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                            {/* Tags display */}
                            {occurrence.event.tags && occurrence.event.tags.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {occurrence.event.tags.map(tag => (
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
                              <DocumentTextIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleEditEvent(occurrence.event)}
                              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Edit event"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Age information - only show for recurring events */}
                      {occurrence.event.recurrence !== 'none' && occurrence.age && (
                        <div className={`text-sm font-medium ${
                          occurrence.isPast ? 'text-gray-400' : 'text-indigo-600'
                        }`}>
                          Age: {occurrence.age}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Edit Event Modal */}
      {editingEvent && (
        <EditEventModal
          note={editingEvent}
          onSave={handleEventUpdated}
          onCancel={() => setEditingEvent(null)}
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

      {/* Add Event Modal */}
      {isAddEventModalOpen && (
        <AddEventModal
          isOpen={isAddEventModalOpen}
          onClose={() => setIsAddEventModalOpen(false)}
          onSave={onAddEvent}
          notes={notes}
        />
      )}
    </div>
  );
};

export default CalendarView;