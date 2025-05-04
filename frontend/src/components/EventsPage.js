import React from 'react';
import { formatDate } from '../utils/DateUtils';
import CalendarView from './CalendarView';

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
      <CalendarView 
        events={events} 
        onAcknowledgeEvent={() => {}} 
        onEventUpdated={() => {}} 
        notes={notes}
      />
    </div>
  );
};

export default EventsPage; 