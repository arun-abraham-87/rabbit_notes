import React, { useState, useEffect } from 'react';
import { ExclamationCircleIcon, CheckCircleIcon, CalendarIcon, ClockIcon } from '@heroicons/react/24/outline';
import { updateNoteById } from '../utils/ApiUtils';

const EventAlerts = ({ events, onEventsUpdate }) => {
  const [acknowledgedEvents, setAcknowledgedEvents] = useState(new Set());

  // Reset acknowledged events when events prop changes
  useEffect(() => {
    setAcknowledgedEvents(new Set());
  }, [events]);

  // Function to check if an event is acknowledged for a specific year
  const isAcknowledged = (event, year) => {
    const metaTag = `meta::acknowledged::${year}`;
    return event.content.includes(metaTag) || acknowledgedEvents.has(`${event.id}-${year}`);
  };

  // Function to check if an event needs acknowledgment
  const needsAcknowledgment = (event, occurrenceDate) => {
    const april2025 = new Date('2025-04-01');
    const now = new Date();
    const year = occurrenceDate.getFullYear();

    // Check if the occurrence is after April 1st, 2025 and on or before current date
    if (occurrenceDate >= april2025 && occurrenceDate <= now) {
      // If it's today's date, always needs acknowledgment
      if (occurrenceDate.toDateString() === now.toDateString()) {
        return true;
      }
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

  const handleAcknowledge = async (eventId, year) => {
    try {
      const event = events.find(e => e.id === eventId);
      if (!event) return;

      const metaTag = `meta::acknowledged::${year}`;
      if (event.content.includes(metaTag)) {
        return; // Already acknowledged
      }

      const updatedContent = event.content.trim() + `\n${metaTag}`;
      const response = await updateNoteById(eventId, { content: updatedContent });

      if (response.success) {
        setAcknowledgedEvents(prev => {
          const newSet = new Set(prev);
          newSet.add(`${eventId}-${year}`);
          return newSet;
        });
        if (onEventsUpdate) {
          onEventsUpdate();
        }
      } else {
        console.error('Failed to update event:', response.error);
      }
    } catch (error) {
      console.error('Error acknowledging event:', error);
    }
  };

  const getEventAge = (date) => {
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const unacknowledgedOccurrences = getUnacknowledgedOccurrences();

  if (unacknowledgedOccurrences.length === 0) return null;

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-6">
      <div className="bg-red-50 px-6 py-4 border-b border-red-100">
        <div className="flex items-center">
          <ExclamationCircleIcon className="h-6 w-6 text-red-500" />
          <h3 className="ml-3 text-lg font-semibold text-red-800">
            Unacknowledged Events
          </h3>
        </div>
      </div>
      <div className="divide-y divide-gray-100">
        {unacknowledgedOccurrences.map((occurrence, index) => (
          <div key={index} className="p-6 hover:bg-gray-50 transition-colors duration-150">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <CalendarIcon className="h-4 w-4" />
                  <span>{formatDate(occurrence.date)}</span>
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">
                  {occurrence.event.description}
                </h4>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <ClockIcon className="h-4 w-4" />
                    <span>{getEventAge(occurrence.date)} days ago</span>
                  </div>
                  {occurrence.event.recurrence !== 'none' && (
                    <span className="px-2 py-1 bg-red-50 text-red-600 rounded-full text-xs">
                      {occurrence.event.recurrence}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => handleAcknowledge(occurrence.event.id, occurrence.date.getFullYear())}
                className="ml-4 flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-150"
              >
                <CheckCircleIcon className="w-5 h-5" />
                Acknowledge
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventAlerts; 