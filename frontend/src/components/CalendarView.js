import React, { useEffect, useRef, useState } from 'react';
import { formatDate } from '../utils/DateUtils';
import { ChevronRightIcon, ChevronLeftIcon, CalendarIcon, EyeIcon, EyeSlashIcon, ExclamationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/solid';

const CalendarView = ({ events, onAcknowledgeEvent }) => {
  const todayRef = useRef(null);
  const [showPastEvents, setShowPastEvents] = useState(false);
  const currentMonthRef = useRef(null);

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

  // Scroll to today's events when component mounts
  useEffect(() => {
    if (todayRef.current) {
      todayRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  // Scroll to current month when component mounts or when button is clicked
  useEffect(() => {
    if (currentMonthRef.current) {
      currentMonthRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showPastEvents]); // Re-run when showPastEvents changes to ensure proper scrolling

  // Function to check if an event is acknowledged for a specific year
  const isAcknowledged = (event, year) => {
    const metaTag = `meta::acknowledged:${year}`;
    return event.meta && event.meta.includes(metaTag);
  };

  // Function to check if an event needs acknowledgment
  const needsAcknowledgment = (event, occurrenceDate) => {
    const april2025 = new Date('2025-04-01');
    const now = new Date();
    const year = occurrenceDate.getFullYear();

    // Check if the occurrence is after April 1st, 2025 and before current date
    if (occurrenceDate >= april2025 && occurrenceDate < now) {
      return !isAcknowledged(event, year);
    }
    return false;
  };

  // Get all occurrences that need acknowledgment
  const getUnacknowledgedOccurrences = () => {
    return allOccurrences.filter(occurrence => 
      needsAcknowledgment(occurrence.event, occurrence.date)
    );
  };

  return (
    <div className="space-y-8">
      {/* Alerts Section */}
      {getUnacknowledgedOccurrences().length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-md mb-6">
          <div className="flex items-center">
            <ExclamationCircleIcon className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Unacknowledged Events
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <ul className="list-disc pl-5 space-y-1">
                  {getUnacknowledgedOccurrences().map((occurrence, index) => (
                    <li key={index} className="flex items-center justify-between">
                      <span>
                        {occurrence.event.description} on {occurrence.date.toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                      <button
                        onClick={() => onAcknowledgeEvent(occurrence.event.id, occurrence.date.getFullYear())}
                        className="ml-4 flex items-center gap-1 px-2 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 rounded-full hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                      >
                        <CheckCircleIcon className="w-4 h-4" />
                        Acknowledge
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          onClick={() => {
            if (currentMonthRef.current) {
              currentMonthRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <CalendarIcon className="w-4 h-4" />
          Scroll to This Month
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

      {Object.entries(groupedByMonth).map(([month, occurrences]) => {
        const isCurrentMonth = month === new Date().toLocaleString('default', { month: 'long' });
        return (
          <div 
            key={month} 
            ref={isCurrentMonth ? currentMonthRef : null}
            className="space-y-4"
          >
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
                    occurrence.isPast ? 'bg-gray-400' : occurrence.isToday ? 'bg-indigo-400' : 'bg-gray-400'
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
                          <div className="flex flex-col gap-1">
                            <p className={`text-sm ${
                              occurrence.isPast ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              {occurrence.date.toLocaleDateString('en-US', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
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
                          </div>
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
    </div>
  );
};

export default CalendarView;