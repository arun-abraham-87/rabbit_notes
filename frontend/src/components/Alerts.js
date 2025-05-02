import React, { useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
  XMarkIcon, 
  CheckCircleIcon, 
  ExclamationCircleIcon, 
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  CalendarIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import EventAlerts from './EventAlerts';
import UnacknowledgedMeetingsBanner from './UnacknowledgedMeetingsBanner';
import { updateNoteById } from '../utils/ApiUtils';

const Alerts = {
  success: (message) => {
    toast(
      <div className="flex items-center">
        <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
        <span>{message}</span>
      </div>,
      {
        className: 'bg-green-50 text-green-800',
        progressClassName: 'bg-green-500',
        icon: false,
      }
    );
  },

  error: (message) => {
    toast(
      <div className="flex items-center">
        <XMarkIcon className="h-5 w-5 text-red-500 mr-2" />
        <span>{message}</span>
      </div>,
      {
        className: 'bg-red-50 text-red-800',
        progressClassName: 'bg-red-500',
        icon: false,
      }
    );
  },

  warning: (message) => {
    toast(
      <div className="flex items-center">
        <ExclamationCircleIcon className="h-5 w-5 text-yellow-500 mr-2" />
        <span>{message}</span>
      </div>,
      {
        className: 'bg-yellow-50 text-yellow-800',
        progressClassName: 'bg-yellow-500',
        icon: false,
      }
    );
  },

  info: (message) => {
    toast(
      <div className="flex items-center">
        <InformationCircleIcon className="h-5 w-5 text-blue-500 mr-2" />
        <span>{message}</span>
      </div>,
      {
        className: 'bg-blue-50 text-blue-800',
        progressClassName: 'bg-blue-500',
        icon: false,
      }
    );
  },
};

const DeadlinePassedAlert = ({ notes, expanded: initialExpanded = true }) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  const passedDeadlineTodos = notes.filter(note => {
    if (!note.content.includes('meta::todo::')) return false;
    
    const endDateMatch = note.content.match(/meta::end_date::(\d{4}-\d{2}-\d{2})/);
    if (!endDateMatch) return false;
    
    const endDate = new Date(endDateMatch[1]);
    const now = new Date();
    return endDate < now;
  });

  if (passedDeadlineTodos.length === 0) return null;

  const getTodoAge = (endDate) => {
    const now = new Date();
    const diffTime = Math.abs(now - endDate);
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

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden">
      <div 
        className="bg-rose-50 px-6 py-4 border-b border-rose-100 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <ExclamationCircleIcon className="h-6 w-6 text-rose-500" />
            <h3 className="ml-3 text-lg font-semibold text-rose-800">
              Deadline Passed ({passedDeadlineTodos.length})
            </h3>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="text-rose-600 hover:text-rose-700 focus:outline-none"
            aria-label={isExpanded ? "Collapse todos" : "Expand todos"}
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
          {passedDeadlineTodos.map((todo) => {
            const endDateMatch = todo.content.match(/meta::end_date::(\d{4}-\d{2}-\d{2})/);
            const endDate = new Date(endDateMatch[1]);
            const content = todo.content.split('\n').filter(line => !line.trim().startsWith('meta::'))[0];

            return (
              <div key={todo.id} className="p-6 hover:bg-gray-50 transition-colors duration-150">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                      <ClockIcon className="h-4 w-4" />
                      <span>{formatDate(endDate)}</span>
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      {content}
                    </h4>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <ClockIcon className="h-4 w-4" />
                        <span>{getTodoAge(endDate)} days overdue</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const CriticalTodosAlert = ({ notes, expanded: initialExpanded = true }) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  const criticalTodos = notes.filter(note => {
    if (!note.content.includes('meta::todo::')) return false;
    return note.content.includes('meta::critical');
  });

  if (criticalTodos.length === 0) return null;

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden">
      <div 
        className="bg-red-50 px-6 py-4 border-b border-red-100 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <ExclamationCircleIcon className="h-6 w-6 text-red-500" />
            <h3 className="ml-3 text-lg font-semibold text-red-800">
              Critical Todos ({criticalTodos.length})
            </h3>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="text-red-600 hover:text-red-700 focus:outline-none"
            aria-label={isExpanded ? "Collapse todos" : "Expand todos"}
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
          {criticalTodos.map((todo) => {
            const content = todo.content.split('\n').filter(line => !line.trim().startsWith('meta::'))[0];

            return (
              <div key={todo.id} className="p-6 hover:bg-gray-50 transition-colors duration-150">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-lg font-medium text-gray-900">
                      {content}
                    </h4>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const UnacknowledgedMeetingsAlert = ({ notes, expanded: initialExpanded = true, onDismiss }) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [showRawNote, setShowRawNote] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);

  const unacknowledgedMeetings = notes.filter(note => 
    note.content.includes('meta::meeting::') && 
    !note.content.includes('meta::acknowledged::')
  );

  if (unacknowledgedMeetings.length === 0) return null;

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getMeetingAge = (date) => {
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

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
              <h3 className="ml-3 text-lg font-semibold text-red-800">
                Unacknowledged Meetings ({unacknowledgedMeetings.length})
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
                        <span>{meetingTime ? formatDate(meetingTime) : 'No date'}</span>
                      </div>
                      <h4 className="text-lg font-medium text-gray-900 mb-2">
                        {description}
                      </h4>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <ClockIcon className="h-4 w-4" />
                          <span>{meetingTime ? getMeetingAge(meetingTime) : 0} days ago</span>
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
                      >
                        <DocumentTextIcon className="w-5 h-5" />
                        View Raw Note
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Raw Note Popup */}
      {showRawNote && selectedNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Raw Note Content</h3>
              <button
                onClick={() => setShowRawNote(false)}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-4 overflow-auto">
              <pre className="whitespace-pre-wrap font-mono text-sm text-gray-700">
                {selectedNote.content}
              </pre>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const AlertsContainer = ({ children, notes, events, expanded: initialExpanded = false, setNotes }) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  const criticalTodos = notes.filter(note => {
    if (!note.content.includes('meta::todo::')) return false;
    return note.content.includes('meta::critical');
  });

  const passedDeadlineTodos = notes.filter(note => {
    if (!note.content.includes('meta::todo::')) return false;
    
    const endDateMatch = note.content.match(/meta::end_date::(\d{4}-\d{2}-\d{2})/);
    if (!endDateMatch) return false;
    
    const endDate = new Date(endDateMatch[1]);
    const now = new Date();
    return endDate < now;
  });

  const getUnacknowledgedOccurrences = () => {
    return events.flatMap(event => {
      if (!event || !event.dateTime) return [];
      
      const { dateTime, recurrence } = event;
      const eventDate = new Date(dateTime);
      const now = new Date();
      const currentYear = now.getFullYear();
      const occurrences = [];

      if (recurrence === 'none') {
        if (eventDate.getFullYear() === currentYear) {
          occurrences.push({ date: eventDate, event });
        }
      } else {
        let occurrence = new Date(eventDate);
        while (occurrence.getFullYear() <= currentYear) {
          if (occurrence.getFullYear() === currentYear) {
            occurrences.push({ date: new Date(occurrence), event });
          }

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
    }).filter(occurrence => {
      const april2025 = new Date('2025-04-01');
      const now = new Date();
      const year = occurrence.date.getFullYear();
      const metaTag = `meta::acknowledged::${year}`;
      
      return occurrence.date >= april2025 && 
             occurrence.date <= now && 
             !occurrence.event.content.includes(metaTag);
    });
  };

  const unacknowledgedEvents = getUnacknowledgedOccurrences();
  const unacknowledgedMeetings = notes.filter(note => 
    note.content.includes('meta::meeting::') && 
    !note.content.includes('meta::acknowledged::')
  );

  const handleDismissUnacknowledgedMeeting = async (noteId) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    
    // Add the acknowledged tag with timestamp
    const ackLine = `meta::meeting_acknowledge::${new Date().toISOString()}`;
    const updatedContent = `${note.content}\n${ackLine}`;
    
    try {
      await updateNoteById(noteId, updatedContent);
      // Update the notes state to reflect the change
      setNotes(notes.map(n => n.id === noteId ? { ...n, content: updatedContent } : n));
    } catch (error) {
      console.error('Error acknowledging meeting:', error);
    }
  };

  const totalAlerts = unacknowledgedEvents.length + 
                     criticalTodos.length + 
                     passedDeadlineTodos.length + 
                     unacknowledgedMeetings.length;

  const handleTitleClick = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-6 mx-4">
      <div 
        className="bg-red-50 px-6 py-4 border-b border-red-100 cursor-pointer"
        onClick={handleTitleClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-ping"></div>
              </div>
              <ExclamationCircleIcon className="h-6 w-6 text-red-500 relative" />
            </div>
            <h3 className="text-lg font-semibold text-red-800">
              Alerts ({totalAlerts})
            </h3>
            <div className="flex gap-2">
              {unacknowledgedEvents.length > 0 && (
                <span className="px-2 py-1 bg-red-100 text-red-800 rounded-md text-sm font-medium">
                  Events: {unacknowledgedEvents.length}
                </span>
              )}
              {criticalTodos.length > 0 && (
                <span className="px-2 py-1 bg-red-100 text-red-800 rounded-md text-sm font-medium">
                  Critical: {criticalTodos.length}
                </span>
              )}
              {passedDeadlineTodos.length > 0 && (
                <span className="px-2 py-1 bg-red-100 text-red-800 rounded-md text-sm font-medium">
                  Deadline: {passedDeadlineTodos.length}
                </span>
              )}
              {unacknowledgedMeetings.length > 0 && (
                <span className="px-2 py-1 bg-red-100 text-red-800 rounded-md text-sm font-medium">
                  Meetings: {unacknowledgedMeetings.length}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleTitleClick();
            }}
            className="text-red-600 hover:text-red-700 focus:outline-none"
            aria-label={isExpanded ? "Collapse alerts" : "Expand alerts"}
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
        <div className="divide-y divide-gray-100 p-4 space-y-4">
          {children}
          <UnacknowledgedMeetingsAlert 
            notes={notes} 
            expanded={isExpanded}
            onDismiss={handleDismissUnacknowledgedMeeting}
          />
        </div>
      )}
    </div>
  );
};

const AlertsProvider = ({ children, notes, expanded = false, events, setNotes }) => {
  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      <AlertsContainer 
        expanded={expanded} 
        notes={notes} 
        events={events}
        setNotes={setNotes}
      >
        <EventAlerts 
          events={events}
          expanded={expanded}
        />
        <CriticalTodosAlert notes={notes} expanded={expanded} />
        <DeadlinePassedAlert notes={notes} expanded={expanded} />
      </AlertsContainer>
      {children}
    </>
  );
};

export { Alerts, AlertsProvider }; 