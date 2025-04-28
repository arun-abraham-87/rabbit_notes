import React, { useState } from 'react';
import { formatDate } from '../utils/DateUtils';
import { PencilIcon, TrashIcon, MagnifyingGlassIcon, XMarkIcon, ExclamationTriangleIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { updateNoteById, deleteNoteById } from '../utils/ApiUtils';
import EditEventModal from '../components/EditEventModal';

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

  // Calculate next occurrence for recurring events
  let nextOccurrence = null;
  let lastOccurrence = null;
  if (recurrence !== 'none' && dateTime) {
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

  return { description, dateTime, recurrence, metaDate, nextOccurrence, lastOccurrence };
};

const EventsPage = ({ notes, onUpdate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingEvent, setEditingEvent] = useState(null);
  const [deletingEvent, setDeletingEvent] = useState(null);
  const [showUpcoming, setShowUpcoming] = useState(false);
  const [editForm, setEditForm] = useState({
    description: '',
    dateTime: '',
    recurrence: 'none',
    days: []
  });

  // Function to check if an event is upcoming
  const isEventUpcoming = (event) => {
    const { dateTime, recurrence } = getEventDetails(event.content);
    const eventDate = new Date(dateTime);
    const now = new Date();

    // Helper function to compare times
    const isTimeLaterToday = (eventTime, currentTime) => {
      return (eventTime.getHours() > currentTime.getHours()) || 
             (eventTime.getHours() === currentTime.getHours() && 
              eventTime.getMinutes() > currentTime.getMinutes());
    };

    // Helper function to get next occurrence date
    const getNextOccurrence = (baseDate, daysToAdd) => {
      const nextDate = new Date(baseDate);
      nextDate.setDate(nextDate.getDate() + daysToAdd);
      return nextDate;
    };

    // If the event is in the future, it's upcoming
    if (eventDate > now) return true;

    // For recurring events, calculate the next occurrence
    if (recurrence !== 'none') {
      switch (recurrence) {
        case 'daily':
          // For daily events, check if the event time is later today
          const todayEvent = new Date();
          todayEvent.setHours(eventDate.getHours(), eventDate.getMinutes(), 0, 0);
          return isTimeLaterToday(todayEvent, now);

        case 'weekly':
          const eventDay = eventDate.getDay();
          const currentDay = now.getDay();
          
          // If today is the event day, check if the time is later today
          if (eventDay === currentDay) {
            return isTimeLaterToday(eventDate, now);
          }

          // Calculate days until next occurrence
          const daysUntilNext = (eventDay - currentDay + 7) % 7;
          if (daysUntilNext === 0) return false; // Already passed this week
          
          // Check if next occurrence is within 7 days
          const nextWeeklyDate = getNextOccurrence(now, daysUntilNext);
          return (nextWeeklyDate - now) <= (7 * 24 * 60 * 60 * 1000);

        case 'monthly':
          const currentDate = now.getDate();
          const eventDateOfMonth = eventDate.getDate();
          
          // If today is the event date, check if the time is later today
          if (eventDateOfMonth === currentDate) {
            return isTimeLaterToday(eventDate, now);
          }

          // If the event date is later this month
          if (eventDateOfMonth > currentDate) {
            return true;
          }

          // Calculate next month's occurrence
          const nextMonth = new Date(now);
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          nextMonth.setDate(eventDateOfMonth);
          
          // Check if next month's occurrence is within 7 days
          return (nextMonth - now) <= (7 * 24 * 60 * 60 * 1000);

        default:
          return false;
      }
    }

    return false;
  };

  // Filter and group events
  const events = notes
    .filter(note => note.content.includes('meta::event::'))
    .filter(note => {
      const { description } = getEventDetails(note.content);
      return description.toLowerCase().includes(searchQuery.toLowerCase());
    });

  // Group events into upcoming and past when the filter is active
  const groupedEvents = showUpcoming
    ? events.reduce((acc, event) => {
        if (isEventUpcoming(event)) {
          acc.upcoming.push(event);
        } else {
          acc.past.push(event);
        }
        return acc;
      }, { upcoming: [], past: [] })
    : { all: events };

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

  const handleEdit = (event) => {
    setEditingEvent(event);
  };

  const handleDelete = async (eventId) => {
    const eventToDelete = notes.find(note => note.id === eventId);
    setDeletingEvent(eventToDelete);
  };

  const confirmDelete = async () => {
    if (!deletingEvent) return;

    try {
      await deleteNoteById(deletingEvent.id);
      // Update the notes list by removing the deleted event
      const updatedNotes = notes.filter(note => note.id !== deletingEvent.id);
      // Call the onUpdate prop directly
      onUpdate(updatedNotes);
      setDeletingEvent(null);
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const handleSave = async (updatedNote) => {
    try {
      await updateNoteById(updatedNote.id, updatedNote.content);
      // Update the notes list by updating the edited event
      const updatedNotes = notes.map(note => 
        note.id === updatedNote.id ? { ...note, content: updatedNote.content } : note
      );
      onUpdate(updatedNotes);
      setEditingEvent(null);
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Events</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowUpcoming(!showUpcoming)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-200 ${
              showUpcoming
                ? 'bg-indigo-100 text-indigo-700'
                : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <CalendarIcon className="h-4 w-4" />
            {showUpcoming ? 'Show All Events' : 'Show Upcoming Events'}
          </button>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-200"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Totals Bar */}
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

      <div className="grid gap-4">
        {showUpcoming ? (
          <>
            {groupedEvents.upcoming.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-indigo-700 flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Upcoming Events
                </h2>
                {groupedEvents.upcoming.map((event) => {
                  const { description, dateTime, recurrence, metaDate, nextOccurrence, lastOccurrence } = getEventDetails(event.content);
                  const eventDate = new Date(dateTime);
                  
                  return (
                    <div key={event.id} className="bg-white rounded-lg border p-4 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{description}</h3>
                          <p className="text-sm text-gray-500">
                            {formatDate(eventDate)}
                          </p>
                          {recurrence !== 'none' && (
                            <div className="mt-1 space-y-1">
                              {lastOccurrence && (
                                <p className="text-xs text-gray-600">
                                  Last occurrence: {formatDate(lastOccurrence)}
                                </p>
                              )}
                              {nextOccurrence && (
                                <p className="text-xs text-indigo-600">
                                  Next occurrence: {formatDate(nextOccurrence)}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            {recurrence !== 'none' && (
                              <span className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
                                {recurrence.charAt(0).toUpperCase() + recurrence.slice(1)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEdit(event)}
                              className="p-1 text-gray-500 hover:text-indigo-600"
                              title="Edit event"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(event.id)}
                              className="p-1 text-gray-500 hover:text-red-600"
                              title="Delete event"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {groupedEvents.past.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-500 flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Past Events
                </h2>
                {groupedEvents.past.map((event) => {
                  const { description, dateTime, recurrence, metaDate, nextOccurrence, lastOccurrence } = getEventDetails(event.content);
                  const eventDate = new Date(dateTime);
                  
                  return (
                    <div key={event.id} className="bg-white rounded-lg border p-4 shadow-sm opacity-75">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{description}</h3>
                          <p className="text-sm text-gray-500">
                            {formatDate(eventDate)}
                          </p>
                          {recurrence !== 'none' && (
                            <div className="mt-1 space-y-1">
                              {lastOccurrence && (
                                <p className="text-xs text-gray-600">
                                  Last occurrence: {formatDate(lastOccurrence)}
                                </p>
                              )}
                              {nextOccurrence && (
                                <p className="text-xs text-indigo-600">
                                  Next occurrence: {formatDate(nextOccurrence)}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            {recurrence !== 'none' && (
                              <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                                {recurrence.charAt(0).toUpperCase() + recurrence.slice(1)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEdit(event)}
                              className="p-1 text-gray-500 hover:text-indigo-600"
                              title="Edit event"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(event.id)}
                              className="p-1 text-gray-500 hover:text-red-600"
                              title="Delete event"
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          groupedEvents.all.map((event) => {
            const { description, dateTime, recurrence, metaDate, nextOccurrence, lastOccurrence } = getEventDetails(event.content);
            const eventDate = new Date(dateTime);
            
            return (
              <div key={event.id} className="bg-white rounded-lg border p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{description}</h3>
                    <p className="text-sm text-gray-500">
                      {formatDate(eventDate)}
                    </p>
                    {recurrence !== 'none' && (
                      <div className="mt-1 space-y-1">
                        {lastOccurrence && (
                          <p className="text-xs text-gray-600">
                            Last occurrence: {formatDate(lastOccurrence)}
                          </p>
                        )}
                        {nextOccurrence && (
                          <p className="text-xs text-indigo-600">
                            Next occurrence: {formatDate(nextOccurrence)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {recurrence !== 'none' && (
                        <span className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
                          {recurrence.charAt(0).toUpperCase() + recurrence.slice(1)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(event)}
                        className="p-1 text-gray-500 hover:text-indigo-600"
                        title="Edit event"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(event.id)}
                        className="p-1 text-gray-500 hover:text-red-600"
                        title="Delete event"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {events.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No events found</p>
          </div>
        )}
      </div>

      {/* Edit Event Modal */}
      {editingEvent && (
        <EditEventModal
          note={editingEvent}
          onSave={handleSave}
          onCancel={() => setEditingEvent(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
              <h2 className="text-xl font-semibold text-gray-900">Delete Event</h2>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this event? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeletingEvent(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsPage; 