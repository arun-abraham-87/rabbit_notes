import React from 'react';
import { formatDate } from '../utils/DateUtils';

const EventsPage = ({ notes }) => {
  // Filter notes to only show events
  const events = notes.filter(note => note.content.includes('meta::event::'));

  // Function to extract event details from note content
  const getEventDetails = (content) => {
    const lines = content.split('\n');
    const description = lines[0];
    const dateTime = lines[1];
    const recurrenceMatch = content.match(/meta::event_recurrence::([^:]+)(?::(.+))?/);
    const recurrence = recurrenceMatch ? recurrenceMatch[1] : 'none';
    const days = recurrenceMatch && recurrenceMatch[2] ? recurrenceMatch[2].split(',') : [];

    return { description, dateTime, recurrence, days };
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Events</h1>
      </div>

      <div className="grid gap-4">
        {events.map((event) => {
          const { description, dateTime, recurrence, days } = getEventDetails(event.content);
          const eventDate = new Date(dateTime);
          
          return (
            <div key={event.id} className="bg-white rounded-lg border p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{description}</h3>
                  <p className="text-sm text-gray-500">
                    {formatDate(eventDate)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {recurrence !== 'none' && (
                    <span className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
                      {recurrence.charAt(0).toUpperCase() + recurrence.slice(1)}
                    </span>
                  )}
                  {days.length > 0 && (
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                      {days.join(', ')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {events.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No events found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventsPage; 