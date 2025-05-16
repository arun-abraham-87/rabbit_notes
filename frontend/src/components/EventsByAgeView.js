import React, { useState } from 'react';
import { getDateInDDMMYYYYFormatWithAgeInParentheses } from '../utils/DateUtils';
import { 
  PencilIcon,
  EyeIcon,
  EyeSlashIcon,
  FlagIcon,
  CodeBracketIcon,
  XMarkIcon
} from '@heroicons/react/24/solid';

const EventsByAgeView = ({ events, onEventUpdated, onDelete }) => {
  const [rawNote, setRawNote] = useState(null);

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

    return {
      description,
      dateTime,
      recurrence,
      metaDate,
      tags
    };
  };

  // Process and sort events by age
  const processedEvents = events.map(event => {
    const details = getEventDetails(event.content);
    const age = calculateAge(details.dateTime);
    const ageInDays = Math.floor((new Date() - new Date(details.dateTime)) / (1000 * 60 * 60 * 24));
    
    return {
      ...event,
      ...details,
      age,
      ageInDays
    };
  }).sort((a, b) => b.ageInDays - a.ageInDays);

  const handleToggleDeadline = async (event) => {
    const hasDeadline = event.content.includes('meta::event_deadline');
    let updatedContent;
    
    if (hasDeadline) {
      updatedContent = event.content.replace('\nmeta::event_deadline', '');
    } else {
      updatedContent = event.content.trim() + '\nmeta::event_deadline';
    }
    
    onEventUpdated(event.id, updatedContent);
  };

  const handleToggleHidden = async (event) => {
    const isHidden = event.content.includes('meta::event_hidden');
    const updatedContent = isHidden
      ? event.content.replace('\nmeta::event_hidden', '')
      : event.content.trim() + '\nmeta::event_hidden';
    
    await onEventUpdated(event.id, updatedContent);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Events by Age</h2>
        <div className="space-y-4">
          {processedEvents.map((event) => (
            <div
              key={event.id}
              className="p-4 rounded-lg border bg-white hover:bg-gray-50 transition-all duration-200"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-medium text-gray-900">
                      {event.content.includes('meta::event_hidden') ? (
                        <div className="flex items-center gap-2">
                          <span>XXXXXXXXXXXX</span>
                          <button
                            onClick={() => handleToggleHidden(event)}
                            className="text-xs text-indigo-600 hover:text-indigo-700 underline"
                          >
                            Reveal
                          </button>
                        </div>
                      ) : (
                        event.description
                      )}
                    </h3>
                    {event.content.includes('meta::event_deadline') && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Deadline
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-[120px_1fr] gap-x-2 text-sm">
                    <p className="text-gray-600">
                      <span className="font-medium">Age:</span>
                    </p>
                    <p className="text-gray-900 font-semibold">
                      {event.age}
                    </p>
                    
                    <p className="text-gray-600">
                      <span className="font-medium">Original date:</span>
                    </p>
                    <p className="text-gray-600">
                      {new Date(event.dateTime).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>

                    {event.recurrence !== 'none' && (
                      <>
                        <p className="text-gray-600">
                          <span className="font-medium">Recurrence:</span>
                        </p>
                        <p className="text-gray-600">
                          {event.recurrence.charAt(0).toUpperCase() + event.recurrence.slice(1)}
                        </p>
                      </>
                    )}
                  </div>

                  {event.tags && event.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {event.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleHidden(event)}
                    className={`p-2 rounded-lg transition-colors ${
                      event.content.includes('meta::event_hidden')
                        ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                    title={event.content.includes('meta::event_hidden') ? "Show event" : "Hide event"}
                  >
                    {event.content.includes('meta::event_hidden') ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleToggleDeadline(event)}
                    className={`p-2 rounded-lg transition-colors ${
                      event.content.includes('meta::event_deadline')
                        ? 'text-red-500 hover:text-red-600 hover:bg-red-50'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                    title={event.content.includes('meta::event_deadline') ? "Remove deadline" : "Mark as deadline"}
                  >
                    <FlagIcon className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setRawNote(event)}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    title="View raw note"
                  >
                    <CodeBracketIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

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
    </div>
  );
};

export default EventsByAgeView; 