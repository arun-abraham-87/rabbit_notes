import React, { useEffect, useRef } from 'react';
import { formatDate } from '../utils/DateUtils';

const CalendarView = ({ events }) => {
  const todayRef = useRef(null);

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
      isToday: date.toDateString() === new Date().toDateString()
    }));
  });

  // Sort occurrences by date
  const sortedOccurrences = allOccurrences.sort((a, b) => a.date - b.date);

  // Group occurrences by month
  const groupedByMonth = sortedOccurrences.reduce((acc, occurrence) => {
    const month = occurrence.date.toLocaleString('default', { month: 'long' });
    if (!acc[month]) {
      acc[month] = [];
    }
    acc[month].push(occurrence);
    return acc;
  }, {});

  // Scroll to today's events when component mounts
  useEffect(() => {
    if (todayRef.current) {
      todayRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  return (
    <div className="space-y-8">
      {Object.entries(groupedByMonth).map(([month, occurrences]) => (
        <div key={month} className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 sticky top-0 bg-white py-2 z-10">
            {month}
          </h2>
          <div className="space-y-4">
            {occurrences.map((occurrence, index) => (
              <div
                key={`${occurrence.event.id}-${occurrence.date.toISOString()}`}
                ref={occurrence.isToday ? todayRef : null}
                className={`relative pl-8 pb-4 ${
                  occurrence.isToday ? 'bg-indigo-50 rounded-lg p-4' : ''
                }`}
              >
                {/* Timeline line */}
                <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200" />
                
                {/* Timeline dot */}
                <div className={`absolute left-2.5 top-2 w-3 h-3 rounded-full ${
                  occurrence.isToday ? 'bg-indigo-600' : 'bg-gray-400'
                }`} />

                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-900">
                    {occurrence.event.description}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDate(occurrence.date)}
                  </p>
                  {occurrence.event.recurrence !== 'none' && (
                    <span className="inline-block px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
                      {occurrence.event.recurrence.charAt(0).toUpperCase() + occurrence.event.recurrence.slice(1)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default CalendarView; 