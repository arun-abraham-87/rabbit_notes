import React, { useState } from 'react';
import { 
  XMarkIcon, 
  CheckCircleIcon, 
  ExclamationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  CalendarIcon,
  CodeBracketIcon
} from '@heroicons/react/24/outline';
import { getAgeInStringFmt, getDateInDDMMYYYYFormat } from '../utils/DateUtils';
import NoteView from './NoteView';

const UnacknowledgedMeetingsAlert = ({ notes, expanded: initialExpanded = true, onDismiss }) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [showRawNote, setShowRawNote] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);

  const unacknowledgedMeetings = notes.filter(note => 
    note.content.includes('meta::meeting::') && 
    !note.content.includes('meta::acknowledged::') &&
    !note.content.includes('meta::meeting_acknowledge::')
  );

  if (unacknowledgedMeetings.length === 0) return null;

  const handleViewRawNote = (note) => {
    setSelectedNote(note);
    setShowRawNote(true);
  };

  return (
    <>
      <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-6">
        <div className="bg-red-50 px-6 py-4 border-b border-red-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ExclamationCircleIcon className="h-6 w-6 text-red-500" />
              <h3 className="ml-3 text-base font-semibold text-red-800">
                Past Meetings ({unacknowledgedMeetings.length})
              </h3>
            </div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-red-600 hover:text-red-700 focus:outline-none"
              aria-label={isExpanded ? "Collapse meetings" : "Expand meetings"}
            >
              {isExpanded ? (
                <ChevronUpIcon className="h-5 w-5" />
              ) : (
                <ChevronDownIcon className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
        {isExpanded && (
          <div className="divide-y divide-gray-100">
            {unacknowledgedMeetings.map((meeting) => {
              const lines = meeting.content.split('\n');
              const meetingTimeStr = lines.find(line => /^\d{4}-\d{2}-\d{2}/.test(line));
              const meetingTime = meetingTimeStr ? new Date(meetingTimeStr) : null;
              const description = lines[0];

              return (
                <div key={meeting.id} className="p-6 hover:bg-gray-50 transition-colors duration-150">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                        <CalendarIcon className="h-4 w-4" />
                        <span>{meetingTime ? getDateInDDMMYYYYFormat(meetingTime) : 'No date'}</span>
                      </div>
                      <h4 className="text-base font-medium text-gray-900 mb-2">
                        {description}
                      </h4>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <ClockIcon className="h-4 w-4" />
                          <span>{meetingTime ? getAgeInStringFmt(meetingTime) : '0 days ago'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => onDismiss(meeting.id)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-150"
                      >
                        <CheckCircleIcon className="w-5 h-5" />
                        Acknowledge
                      </button>
                      <button
                        onClick={() => handleViewRawNote(meeting)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-150"
                        title="View Raw Note"
                      >
                        <CodeBracketIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showRawNote && selectedNote && (
        <NoteView
          isOpen={showRawNote}
          content={selectedNote.content}
          onClose={() => setShowRawNote(false)}
        />
      )}
    </>
  );
};

export default UnacknowledgedMeetingsAlert; 