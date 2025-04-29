import React from 'react';
import { ExclamationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/solid';

const EventAlerts = ({ events, onAcknowledgeEvent }) => {
  // Function to check if an event is acknowledged for a specific year
  const isAcknowledged = (event, year) => {
    const metaTag = `meta::acknowledged::${year}`;
    return event.content.includes(metaTag);
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
    return events.flatMap(event => {
      const { dateTime, recurrence } = event;
      const eventDate = new Date(dateTime);
      const now = new Date();
      const currentYear = now.getFullYear();
      const occurrences = [];

      if (recurrence === 'none') {
        // For non-recurring events, only include if it's in the current year
        if (eventDate.getFullYear() === currentYear) {
          occurrences.push({ date: eventDate, event });
        }
      } else {
        // For recurring events, calculate all occurrences in the current year
        let occurrence = new Date(eventDate);
        while (occurrence.getFullYear() <= currentYear) {
          if (occurrence.getFullYear() === currentYear) {
            occurrences.push({ date: new Date(occurrence), event });
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
      }

      return occurrences;
    }).filter(occurrence => needsAcknowledgment(occurrence.event, occurrence.date));
  };

  const unacknowledgedOccurrences = getUnacknowledgedOccurrences();

  if (unacknowledgedOccurrences.length === 0) return null;

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-md mb-6">
      <div className="flex items-center">
        <ExclamationCircleIcon className="h-5 w-5 text-yellow-400" />
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-800">
            Unacknowledged Events
          </h3>
          <div className="mt-2 text-sm text-yellow-700">
            <ul className="list-disc pl-5 space-y-1">
              {unacknowledgedOccurrences.map((occurrence, index) => (
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
  );
};

export default EventAlerts; 