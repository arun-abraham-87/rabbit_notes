import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';

const UnacknowledgedMeetingsBanner = ({ meetings, onDismiss }) => {
  if (meetings.length === 0) return null;

  // Filter out meetings that have been acknowledged
  const unacknowledgedMeetings = meetings.filter(meeting => {
    // Extract all acknowledgment dates from meta tags
    const ackDates = meeting.content
      .split('\n')
      .filter(line => line.trim().startsWith('meta::meeting_acknowledge::'))
      .map(line => line.split('::')[2].trim());

    // Get the meeting date
    const meetingTime = meeting.content.split('\n').find(line => /^\d{4}-\d{2}-\d{2}/.test(line));
    const meetingDate = meetingTime ? meetingTime.split('T')[0] : null;

    // Meeting is unacknowledged if there's no matching acknowledgment date
    return meetingDate && !ackDates.includes(meetingDate);
  });

  if (unacknowledgedMeetings.length === 0) return null;

  return (
    <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-amber-800">
            Unacknowledged Past Meetings: {unacknowledgedMeetings.length}
          </h3>
          <div className="mt-2 text-sm text-amber-700">
            <ul className="list-disc pl-5 space-y-1">
              {unacknowledgedMeetings.map(meeting => {
                const meetingTime = meeting.content.split('\n').find(line => /^\d{4}-\d{2}-\d{2}/.test(line));
                const description = meeting.content.split('\n')[0];
                return (
                  <li key={meeting.id} className="flex items-center justify-between">
                    <span>
                      {description} ({new Date(meetingTime).toLocaleString()})
                    </span>
                    <button
                      onClick={() => onDismiss(meeting.id)}
                      className="ml-2 text-amber-600 hover:text-amber-800"
                    >
                      Acknowledge
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnacknowledgedMeetingsBanner; 