import React, { useEffect, useRef } from 'react';
import { formatDate } from '../utils/DateUtils';

const CalendarView = ({ events }) => {
  const todayRef = useRef(null);

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
                  occurrence.isPast ? 'bg-gray-400' : 'bg-indigo-400'
                }`} />

                <div className={`ml-4 p-4 rounded-lg border ${
                  occurrence.isPast 
                    ? 'bg-gray-50 border-gray-200' 
                    : occurrence.isToday 
                      ? 'bg-indigo-50 border-indigo-200' 
                      : 'bg-white border-gray-200'
                } shadow-sm`}>
                  <div className="space-y-3">
                    {/* Event description and date row */}
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className={`text-base font-medium ${
                          occurrence.isPast ? 'text-gray-500' : 'text-gray-900'
                        }`}>
                          {occurrence.event.description}
                        </p>
                        <p className={`text-sm ${
                          occurrence.isPast ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {formatDate(occurrence.date)}
                        </p>
                      </div>
                      {occurrence.event.recurrence !== 'none' && (
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                          occurrence.isPast 
                            ? 'bg-gray-100 text-gray-500' 
                            : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {occurrence.event.recurrence.charAt(0).toUpperCase() + occurrence.event.recurrence.slice(1)}
                        </span>
                      )}
                    </div>

                    {/* Age information */}
                    <div className={`text-sm font-medium ${
                      occurrence.isPast ? 'text-gray-400' : 'text-indigo-600'
                    }`}>
                      {occurrence.age}
                    </div>
                  </div>
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