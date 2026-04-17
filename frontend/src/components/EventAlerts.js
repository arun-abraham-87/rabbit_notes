import React, { useState, useEffect } from 'react';
import { ExclamationCircleIcon, CheckCircleIcon, CalendarIcon, ClockIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { updateNoteById } from '../utils/ApiUtils';
import { getAgeInStringFmt } from '../utils/DateUtils';

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

  return { description, dateTime, recurrence };
};

const formatDateKey = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const EventAlerts = ({ events, onAcknowledgeEvent }) => {
  const [acknowledgedEvents, setAcknowledgedEvents] = useState(new Set());
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAcknowledgingAll, setIsAcknowledgingAll] = useState(false);

  // Reset acknowledged events when events prop changes
  useEffect(() => {
    setAcknowledgedEvents(new Set());
  }, [events]);

  // Function to check if a specific occurrence is acknowledged
  const isAcknowledged = (event, dateKey) => {
    const metaTag = `meta::acknowledged::${dateKey}`;
    return event.content.includes(metaTag) || acknowledgedEvents.has(`${event.id}-${dateKey}`);
  };

  // Function to check if an event needs acknowledgment
  const needsAcknowledgment = (event, occurrenceDate) => {
    const april2025 = new Date('2025-04-01');
    const now = new Date();
    const dateKey = formatDateKey(occurrenceDate);

    // Check if the occurrence is after April 1st, 2025 and on or before current date
    if (occurrenceDate >= april2025 && occurrenceDate <= now) {
      return !isAcknowledged(event, dateKey);
    }
    return false;
  };

  // Get all occurrences that need acknowledgment
  const getUnacknowledgedOccurrences = () => {
    return events.flatMap(event => {
      const { dateTime, recurrence } = getEventDetails(event.content);
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

  const handleAcknowledge = async (eventId, dateKey) => {
    try {
      const event = events.find(e => e.id === eventId);
      if (!event) return;

      const metaTag = `meta::acknowledged::${dateKey}`;
      if (event.content.includes(metaTag)) {
        return; // Already acknowledged
      }

      const updatedContent = event.content.trim() + `\n${metaTag}`;
      await updateNoteById(eventId, updatedContent);

      // Update local state to reflect acknowledgment
      setAcknowledgedEvents(prev => {
        const newSet = new Set(prev);
        newSet.add(`${eventId}-${dateKey}`);
        return newSet;
      });

      // Call the callback if provided
      if (onAcknowledgeEvent) {
        onAcknowledgeEvent(eventId, dateKey);
      }
    } catch (error) {
      console.error('Error in handleAcknowledge:', error);
    }
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

  const handleAcknowledgeAll = async () => {
    if (unacknowledgedOccurrences.length === 0) return;

    setIsAcknowledgingAll(true);
    try {
      // Group occurrences by event ID so we do one write per event,
      // but track each specific date so other occurrences are not affected.
      const updatesByEvent = new Map();
      const acknowledgedKeys = new Set();

      unacknowledgedOccurrences.forEach(occurrence => {
        const eventId = occurrence.event.id;
        const dateKey = formatDateKey(occurrence.date);
        const stateKey = `${eventId}-${dateKey}`;
        if (acknowledgedKeys.has(stateKey)) return;
        acknowledgedKeys.add(stateKey);

        if (!updatesByEvent.has(eventId)) {
          updatesByEvent.set(eventId, []);
        }
        updatesByEvent.get(eventId).push(dateKey);
      });

      // Process acknowledgments sequentially to avoid race conditions
      for (const [eventId, dateKeys] of updatesByEvent) {
        try {
          const currentEvent = events.find(e => e.id === eventId);
          if (!currentEvent) continue;

          let content = currentEvent.content.trim();
          let changed = false;
          for (const dateKey of dateKeys) {
            const metaTag = `meta::acknowledged::${dateKey}`;
            if (!content.includes(metaTag)) {
              content = `${content}\n${metaTag}`;
              changed = true;
            }
          }

          if (changed) {
            await updateNoteById(eventId, content);
          }

          if (onAcknowledgeEvent) {
            for (const dateKey of dateKeys) {
              onAcknowledgeEvent(eventId, dateKey);
            }
          }
        } catch (error) {
          console.error(`Error acknowledging event ${eventId}:`, error);
        }
      }

      // Update local state once with all acknowledgments
      setAcknowledgedEvents(prev => {
        const newSet = new Set(prev);
        acknowledgedKeys.forEach(key => newSet.add(key));
        return newSet;
      });
    } catch (error) {
      console.error('Error acknowledging all events:', error);
      alert('Failed to acknowledge all events. Please try again.');
    } finally {
      setIsAcknowledgingAll(false);
    }
  };

  if (unacknowledgedOccurrences.length === 0) return null;

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-6">
      <div className="bg-red-50 px-6 py-4 border-b border-red-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <ExclamationCircleIcon className="h-6 w-6 text-red-500" />
            <h3 className="ml-3 text-lg font-semibold text-red-800">
              Unacknowledged Events ({unacknowledgedOccurrences.length})
            </h3>
          </div>
          <div className="flex items-center gap-3">
            {unacknowledgedOccurrences.length > 0 && (
              <button
                onClick={handleAcknowledgeAll}
                disabled={isAcknowledgingAll}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAcknowledgingAll ? (
                  <>
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Acknowledging...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-5 h-5" />
                    Acknowledge All
                  </>
                )}
              </button>
            )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-red-600 hover:text-red-700 focus:outline-none"
            aria-label={isExpanded ? "Collapse events" : "Expand events"}
          >
            {isExpanded ? (
              <ChevronUpIcon className="h-5 w-5" />
            ) : (
              <ChevronDownIcon className="h-5 w-5" />
            )}
          </button>
          </div>
        </div>
      </div>
      {isExpanded && (
        <div className="divide-y divide-gray-100">
          {unacknowledgedOccurrences.map((occurrence, index) => {
            const { description, recurrence } = getEventDetails(occurrence.event.content);
            return (
              <div key={index} className="p-6 hover:bg-gray-50 transition-colors duration-150">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                      <CalendarIcon className="h-4 w-4" />
                      <span>{formatDate(occurrence.date)}</span>
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      {description}
                    </h4>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <ClockIcon className="h-4 w-4" />
                        <span>{getAgeInStringFmt(occurrence.date)}</span>
                      </div>
                      {recurrence !== 'none' && (
                        <span className="px-2 py-1 bg-red-50 text-red-600 rounded-full text-xs">
                          {recurrence}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleAcknowledge(occurrence.event.id, formatDateKey(occurrence.date))}
                    className="ml-4 flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-150"
                  >
                    <CheckCircleIcon className="w-5 h-5" />
                    Acknowledge
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EventAlerts; 