import React, { useState, useEffect, useRef } from 'react';
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
  DocumentTextIcon,
  ArrowPathIcon,
  CheckIcon,
  CodeBracketIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  PlusIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import EventAlerts from './EventAlerts';
import { updateNoteById, loadNotes, loadTags, addNewNoteCommon, createNote } from '../utils/ApiUtils';
import { getAge } from '../utils/DateUtils';
import { checkNeedsReview, getNoteCadence, formatTimeElapsed } from '../utils/watchlistUtils';
import NoteView from './NoteView';
import { generateTrackerQuestions, createTrackerAnswerNote } from '../utils/TrackerQuestionUtils';

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
  const [expandedNotes, setExpandedNotes] = useState({});

  const passedDeadlineTodos = notes.filter(note => {
    if (!note.content.includes('meta::todo::')) return false;
    if (note.content.includes('meta::todo_completed')) return false;
    
    const endDateMatch = note.content.match(/meta::end_date::(\d{4}-\d{2}-\d{2})/);
    if (!endDateMatch) return false;
    
    const endDate = new Date(endDateMatch[1]);
    const now = new Date();
    return endDate < now;
  });

  if (passedDeadlineTodos.length === 0) return null;

  const toggleNoteExpand = (noteId) => {
    setExpandedNotes(prev => ({
      ...prev,
      [noteId]: !prev[noteId]
    }));
  };

  const formatUrlLine = (line) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const urlMatch = line.match(urlRegex);
    if (!urlMatch) return line;

    const url = urlMatch[0];
    const markdownMatch = line.match(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/);
    
    if (markdownMatch) {
      const customText = markdownMatch[1];
      const markdownUrl = markdownMatch[2];
      return (
        <a
          href={markdownUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline hover:text-blue-800"
        >
          {customText}
        </a>
      );
    } else {
      const hostname = url.replace(/^https?:\/\//, '').split('/')[0];
      return (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline hover:text-blue-800"
        >
          {hostname}
        </a>
      );
    }
  };

  const formatContent = (content) => {
    const lines = content.split('\n').filter(line => !line.trim().startsWith('meta::'));
    const firstLine = lines[0]?.trim() || '';
    const secondLine = lines[1]?.trim() || '';
    const remainingLines = lines.slice(2);

    // Check if first line is a URL
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const firstLineUrlMatch = firstLine.match(urlRegex);
    const secondLineUrlMatch = secondLine.match(urlRegex);

    // If first line is URL
    if (firstLineUrlMatch) {
      return (
        <>
          <div>{formatUrlLine(firstLine)}</div>
          {secondLine && <div className="mt-1 text-gray-600">{secondLine}</div>}
          {remainingLines.length > 0 && (
            <>
              {expandedNotes[content] ? (
                <div className="mt-2 text-gray-600">
                  {remainingLines.map((line, index) => (
                    <div key={index}>{line}</div>
                  ))}
                </div>
              ) : null}
              <button
                onClick={() => toggleNoteExpand(content)}
                className="mt-1 text-sm text-blue-600 hover:text-blue-800"
              >
                {expandedNotes[content] ? 'Show less' : 'Show more'}
              </button>
            </>
          )}
        </>
      );
    }

    // If second line is URL
    if (secondLineUrlMatch) {
      return (
        <>
          <div>{firstLine}</div>
          <div className="mt-1 text-gray-600">{formatUrlLine(secondLine)}</div>
          {remainingLines.length > 0 && (
            <>
              {expandedNotes[content] ? (
                <div className="mt-2 text-gray-600">
                  {remainingLines.map((line, index) => (
                    <div key={index}>{line}</div>
                  ))}
                </div>
              ) : null}
              <button
                onClick={() => toggleNoteExpand(content)}
                className="mt-1 text-sm text-blue-600 hover:text-blue-800"
              >
                {expandedNotes[content] ? 'Show less' : 'Show more'}
              </button>
            </>
          )}
        </>
      );
    }

    // For regular content
    if (lines.length > 1) {
      return (
        <>
          <div>{firstLine}</div>
          {expandedNotes[content] ? (
            <div className="mt-2 text-gray-600">
              {lines.slice(1).map((line, index) => (
                <div key={index}>{line}</div>
              ))}
            </div>
          ) : null}
          <button
            onClick={() => toggleNoteExpand(content)}
            className="mt-1 text-sm text-blue-600 hover:text-blue-800"
          >
            {expandedNotes[content] ? 'Show less' : 'Show more'}
          </button>
        </>
      );
    }

    // If only one line
    return firstLine;
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getOverdueDays = (endDate) => {
    const now = new Date();
    const diffTime = Math.abs(now - endDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
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
              Deadline Missed ({passedDeadlineTodos.length})
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
          {passedDeadlineTodos.map((todo, index) => {
            const endDateMatch = todo.content.match(/meta::end_date::(\d{4}-\d{2}-\d{2})/);
            const endDate = new Date(endDateMatch[1]);
            const overdueDays = getOverdueDays(endDate);

            return (
              <div 
                key={todo.id} 
                className={`p-6 transition-colors duration-150 ${
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                } hover:bg-gray-100`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                      <CalendarIcon className="h-4 w-4" />
                      <span>Deadline: {formatDate(endDate)}</span>
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">
                      {formatContent(todo.content)}
                    </h4>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1 text-rose-600 font-medium">
                        <ClockIcon className="h-4 w-4" />
                        <span>{overdueDays} {overdueDays === 1 ? 'day' : 'days'} overdue</span>
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

const CriticalTodosAlert = ({ notes, expanded: initialExpanded = true, setNotes }) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [showRawNote, setShowRawNote] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [showPriorityPopup, setShowPriorityPopup] = useState(false);
  const [noteToUpdate, setNoteToUpdate] = useState(null);
  const [expandedNotes, setExpandedNotes] = useState({});
  const [showAllTodos, setShowAllTodos] = useState(false);

  const criticalTodos = notes.filter(note => {
    if (!note.content.includes('meta::todo::')) return false;
    if (note.content.includes('meta::todo_completed')) return false;
    return note.content.includes('meta::critical');
  });

  if (criticalTodos.length === 0) return null;

  const displayedTodos = showAllTodos ? criticalTodos : criticalTodos.slice(0, 3);
  const hasMoreTodos = criticalTodos.length > 3;

  const handleViewRawNote = (note) => {
    setSelectedNote(note);
    setShowRawNote(true);
  };

  const handleMarkCompleted = async (note) => {
    try {
      const updatedContent = `${note.content}\nmeta::todo_completed`;
      await updateNoteById(note.id, updatedContent);
      // Update the notes list immediately after successful update
      const updatedNotes = notes.map(n => 
        n.id === note.id ? { ...n, content: updatedContent } : n
      );
      setNotes(updatedNotes);
      Alerts.success('Todo marked as completed');
    } catch (error) {
      console.error('Error marking todo as completed:', error);
      Alerts.error('Failed to mark todo as completed');
    }
  };

  const handleLowerPriority = (note) => {
    setNoteToUpdate(note);
    setShowPriorityPopup(true);
  };

  const handlePrioritySelect = async (priority) => {
    if (!noteToUpdate) return;

    try {
      // Remove existing priority tags and critical tag
      let updatedContent = noteToUpdate.content
        .split('\n')
        .filter(line => !line.includes('meta::priority::') && !line.includes('meta::critical'))
        .join('\n');

      // Add new priority tag
      updatedContent = `${updatedContent}\nmeta::priority::${priority}`;

      // If priority is not high, remove critical tag
      if (priority !== 'high') {
        updatedContent = updatedContent.replace('meta::critical', '');
      }

      await updateNoteById(noteToUpdate.id, updatedContent);
      
      // Update the notes list immediately after successful update
      const updatedNotes = notes.map(n => 
        n.id === noteToUpdate.id ? { ...n, content: updatedContent } : n
      );
      setNotes(updatedNotes);
      
      Alerts.success(`Priority updated to ${priority}`);
    } catch (error) {
      console.error('Error updating priority:', error);
      Alerts.error('Failed to update priority');
    } finally {
      setShowPriorityPopup(false);
      setNoteToUpdate(null);
    }
  };

  const toggleNoteExpand = (noteId) => {
    setExpandedNotes(prev => ({
      ...prev,
      [noteId]: !prev[noteId]
    }));
  };

  const formatContent = (content) => {
    // Split content into lines, trim each line, and filter out empty lines
    const lines = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => !line.trim().startsWith('meta::'))
      .filter(line => line.length > 0);

    const firstLine = lines[0] || '';
    const secondLine = lines[1] || '';
    const remainingLines = lines.slice(2).filter(line => line.length > 0);

    // Check if first line is a URL
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const firstLineUrlMatch = firstLine.match(urlRegex);
    const secondLineUrlMatch = secondLine.match(urlRegex);
    
    // Function to format a URL line
    const formatUrlLine = (line) => {
      const urlMatch = line.match(urlRegex);
      if (!urlMatch) return line;

      const url = urlMatch[0];
      const markdownMatch = line.match(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/);
      
      if (markdownMatch) {
        const customText = markdownMatch[1];
        const markdownUrl = markdownMatch[2];
        return (
          <a
            href={markdownUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline hover:text-blue-800"
          >
            {customText}
          </a>
        );
      } else {
        const hostname = url.replace(/^https?:\/\//, '').split('/')[0];
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline hover:text-blue-800"
          >
            {hostname}
          </a>
        );
      }
    };

    // If first line is URL
    if (firstLineUrlMatch) {
      return (
        <>
          <div>{formatUrlLine(firstLine)}</div>
          {secondLine && <div className="mt-1 text-gray-600">{secondLine}</div>}
          {remainingLines.length > 0 && (
            <>
              {expandedNotes[content] ? (
                <div className="mt-2 text-gray-600">
                  {remainingLines.map((line, index) => (
                    <div key={index}>{line}</div>
                  ))}
                </div>
              ) : null}
              <button
                onClick={() => toggleNoteExpand(content)}
                className="mt-1 text-sm text-blue-600 hover:text-blue-800"
              >
                {expandedNotes[content] ? 'Show less' : 'Show more'}
              </button>
            </>
          )}
        </>
      );
    }

    // If second line is URL
    if (secondLineUrlMatch) {
      return (
        <>
          <div>{firstLine}</div>
          <div className="mt-1 text-gray-600">{formatUrlLine(secondLine)}</div>
          {remainingLines.length > 0 && (
            <>
              {expandedNotes[content] ? (
                <div className="mt-2 text-gray-600">
                  {remainingLines.map((line, index) => (
                    <div key={index}>{line}</div>
                  ))}
                </div>
              ) : null}
              <button
                onClick={() => toggleNoteExpand(content)}
                className="mt-1 text-sm text-blue-600 hover:text-blue-800"
              >
                {expandedNotes[content] ? 'Show less' : 'Show more'}
              </button>
            </>
          )}
        </>
      );
    }

    // For regular content
    if (lines.length > 1) {
      return (
        <>
          <div>{firstLine}</div>
          {expandedNotes[content] ? (
            <div className="mt-2 text-gray-600">
              {lines.slice(1).map((line, index) => (
                <div key={index}>{line}</div>
              ))}
            </div>
          ) : null}
          {lines.length > 2 && (
            <button
              onClick={() => toggleNoteExpand(content)}
              className="mt-1 text-sm text-blue-600 hover:text-blue-800"
            >
              {expandedNotes[content] ? 'Show less' : 'Show more'}
            </button>
          )}
        </>
      );
    }

    // If only one line
    return firstLine;
  };

  const handleAddToWatch = async (note) => {
    try {
      // Check if the note already has the watch tag
      if (note.content.includes('meta::watch')) {
        Alerts.info('Note is already being watched');
        return;
      }

      const updatedContent = `${note.content}\nmeta::watch`;
      await updateNoteById(note.id, updatedContent);
      // Update the notes list immediately after successful update
      const updatedNotes = notes.map(n => 
        n.id === note.id ? { ...n, content: updatedContent } : n
      );
      setNotes(updatedNotes);
      Alerts.success('Added to watch list');
    } catch (error) {
      console.error('Error adding to watch:', error);
      Alerts.error('Failed to add to watch list');
    }
  };

  return (
    <div className="w-1/2 pr-2">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden h-full">
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
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = 'http://localhost:3000/#/todos';
                }}
                className="text-red-600 hover:text-red-700 focus:outline-none"
                aria-label="Add new todo"
              >
                <PlusIcon className="h-5 w-5" />
              </button>
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
        </div>
        {isExpanded && (
          <div className="divide-y divide-gray-100">
            {displayedTodos.map((todo, index) => {
              return (
                <div 
                  key={todo.id} 
                  className={`p-6 transition-colors duration-150 ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  } hover:bg-gray-100`}
                >
                  <div className="flex flex-col">
                    <div className="flex-1">
                      <h4 className="text-lg font-medium text-gray-900 mb-2 break-words">
                        {formatContent(todo.content)}
                      </h4>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4">
                      <button
                        onClick={() => handleMarkCompleted(todo)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-150"
                        title="Mark Completed"
                      >
                        <CheckIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleLowerPriority(todo)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-yellow-700 bg-yellow-50 rounded-lg hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors duration-150"
                        title="Lower Priority"
                      >
                        <ArrowTrendingDownIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleViewRawNote(todo)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-150"
                        title="View Raw Note"
                      >
                        <CodeBracketIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleAddToWatch(todo)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-150 ${
                          todo.content.includes('meta::watch')
                            ? 'text-purple-700 bg-purple-50 hover:bg-purple-100 focus:ring-purple-500'
                            : 'text-blue-700 bg-blue-50 hover:bg-blue-100 focus:ring-blue-500'
                        }`}
                        title={todo.content.includes('meta::watch') ? 'Already Watching' : 'Add to Watch List'}
                      >
                        <EyeIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {hasMoreTodos && (
              <div className="p-4 bg-white">
                <button
                  onClick={() => setShowAllTodos(!showAllTodos)}
                  className="w-full py-2 text-sm font-medium text-blue-600 hover:text-blue-800 focus:outline-none"
                >
                  {showAllTodos ? 'Show Less' : `Show ${criticalTodos.length - 3} More`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Priority Selection Popup */}
      {showPriorityPopup && noteToUpdate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Select New Priority</h3>
              <button
                onClick={() => setShowPriorityPopup(false)}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-2">
              {['high', 'medium', 'low'].map((priority) => (
                <button
                  key={priority}
                  onClick={() => handlePrioritySelect(priority)}
                  className="w-full px-4 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-150"
                >
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showRawNote && selectedNote && (
        <NoteView
          isOpen={showRawNote}
          content={selectedNote.content}
          onClose={() => setShowRawNote(false)}
        />
      )}
    </div>
  );
};

const ReviewOverdueAlert = ({ notes, expanded: initialExpanded = true }) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [showAllNotes, setShowAllNotes] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState({});

  const overdueNotes = notes.filter(note => {
    if (!note.content.includes('meta::watch')) return false;
    return checkNeedsReview(note.id);
  });

  if (overdueNotes.length === 0) return null;

  const displayedNotes = showAllNotes ? overdueNotes : overdueNotes.slice(0, 3);
  const hasMoreNotes = overdueNotes.length > 3;

  const toggleNoteExpand = (noteId) => {
    setExpandedNotes(prev => ({
      ...prev,
      [noteId]: !prev[noteId]
    }));
  };

  const formatContent = (content) => {
    // Split content into lines, trim each line, and filter out empty lines
    const lines = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => !line.trim().startsWith('meta::'))
      .filter(line => line.length > 0);

    const firstLine = lines[0] || '';
    const secondLine = lines[1] || '';
    const remainingLines = lines.slice(2).filter(line => line.length > 0);

    // Check if first line is a URL
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const firstLineUrlMatch = firstLine.match(urlRegex);
    const secondLineUrlMatch = secondLine.match(urlRegex);
    
    // Function to format a URL line
    const formatUrlLine = (line) => {
      const urlMatch = line.match(urlRegex);
      if (!urlMatch) return line;

      const url = urlMatch[0];
      const markdownMatch = line.match(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/);
      
      if (markdownMatch) {
        const customText = markdownMatch[1];
        const markdownUrl = markdownMatch[2];
        return (
          <a
            href={markdownUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline hover:text-blue-800"
          >
            {customText}
          </a>
        );
      } else {
        const hostname = url.replace(/^https?:\/\//, '').split('/')[0];
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline hover:text-blue-800"
          >
            {hostname}
          </a>
        );
      }
    };

    // If first line is URL
    if (firstLineUrlMatch) {
      return (
        <>
          <div>{formatUrlLine(firstLine)}</div>
          {secondLine && <div className="mt-1 text-gray-600">{secondLine}</div>}
          {remainingLines.length > 0 && (
            <>
              {expandedNotes[content] ? (
                <div className="mt-2 text-gray-600">
                  {remainingLines.map((line, index) => (
                    <div key={index}>{line}</div>
                  ))}
                </div>
              ) : null}
              <button
                onClick={() => toggleNoteExpand(content)}
                className="mt-1 text-sm text-blue-600 hover:text-blue-800"
              >
                {expandedNotes[content] ? 'Show less' : 'Show more'}
              </button>
            </>
          )}
        </>
      );
    }

    // If second line is URL
    if (secondLineUrlMatch) {
      return (
        <>
          <div>{firstLine}</div>
          <div className="mt-1 text-gray-600">{formatUrlLine(secondLine)}</div>
          {remainingLines.length > 0 && (
            <>
              {expandedNotes[content] ? (
                <div className="mt-2 text-gray-600">
                  {remainingLines.map((line, index) => (
                    <div key={index}>{line}</div>
                  ))}
                </div>
              ) : null}
              <button
                onClick={() => toggleNoteExpand(content)}
                className="mt-1 text-sm text-blue-600 hover:text-blue-800"
              >
                {expandedNotes[content] ? 'Show less' : 'Show more'}
              </button>
            </>
          )}
        </>
      );
    }

    // For regular content
    if (lines.length > 1) {
      return (
        <>
          <div>{firstLine}</div>
          {expandedNotes[content] ? (
            <div className="mt-2 text-gray-600">
              {lines.slice(1).map((line, index) => (
                <div key={index}>{line}</div>
              ))}
            </div>
          ) : null}
          {lines.length > 2 && (
            <button
              onClick={() => toggleNoteExpand(content)}
              className="mt-1 text-sm text-blue-600 hover:text-blue-800"
            >
              {expandedNotes[content] ? 'Show less' : 'Show more'}
            </button>
          )}
        </>
      );
    }

    // If only one line
    return firstLine;
  };

  return (
    <div className="w-1/2 pl-2">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden h-full">
        <div 
          className="bg-amber-50 px-6 py-4 border-b border-amber-100 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ClockIcon className="h-6 w-6 text-amber-500" />
              <h3 className="ml-3 text-lg font-semibold text-amber-800">
                Review Overdue ({overdueNotes.length})
              </h3>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className="text-amber-600 hover:text-amber-700 focus:outline-none"
              aria-label={isExpanded ? "Collapse reviews" : "Expand reviews"}
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
            {displayedNotes.map((note, index) => {
              const reviews = JSON.parse(localStorage.getItem('noteReviews') || '{}');
              const reviewTime = reviews[note.id];
              const cadence = getNoteCadence(note.id);

              return (
                <div 
                  key={note.id} 
                  className={`p-6 transition-colors duration-150 ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  } hover:bg-gray-100`}
                >
                  <div className="flex flex-col">
                    <div className="flex-1">
                      <h4 className="text-lg font-medium text-gray-900 mb-2 break-words">
                        {formatContent(note.content)}
                      </h4>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <ClockIcon className="h-4 w-4" />
                          <span>Last reviewed: {reviewTime ? formatTimeElapsed(reviewTime) : 'Never'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <ClockIcon className="h-4 w-4" />
                          <span>Review cadence: {cadence.hours}h {cadence.minutes}m</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4">
                      <button
                        onClick={() => window.location.href = '/#/watch'}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
                      >
                        <ArrowPathIcon className="w-5 h-5" />
                        Review Now
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {hasMoreNotes && (
              <div className="p-4 bg-white">
                <button
                  onClick={() => setShowAllNotes(!showAllNotes)}
                  className="w-full py-2 text-sm font-medium text-blue-600 hover:text-blue-800 focus:outline-none"
                >
                  {showAllNotes ? 'Show Less' : `Show ${overdueNotes.length - 3} More`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

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

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
                        <span>{meetingTime ? formatDate(meetingTime) : 'No date'}</span>
                      </div>
                      <h4 className="text-lg font-medium text-gray-900 mb-2">
                        {description}
                      </h4>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <ClockIcon className="h-4 w-4" />
                          <span>{meetingTime ? getAge(meetingTime) : '0 days ago'}</span>
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

const TrackerQuestionsAlert = ({ notes, expanded: initialExpanded = true }) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [trackerQuestions, setTrackerQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [timeAnswers, setTimeAnswers] = useState({});

  useEffect(() => {
      setTrackerQuestions(generateTrackerQuestions(notes));
  }, [notes]);

  const handleAnswer = async (trackerId, answer, date) => {
    try {
      if (!answer) {
        toast.error('Please enter a value before submitting');
        return;
      }

      const tracker = trackerQuestions.find(q => q.id === trackerId);
      if (!tracker) {
        console.error('Tracker not found:', trackerId);
        return;
      }

      const response = await createTrackerAnswerNote(trackerId, answer, date || tracker.date);
      
      if (response && response.id) {
        setAnswers(prev => ({ ...prev, [trackerId]: { value: answer, date: date || tracker.date } }));
        //need to se tot notes as well

        // Update the questions list to remove the answered one
        setTrackerQuestions(prev => 
          prev.filter(q => !(q.id === trackerId && q.date === (date || tracker.date)))
        );

        toast.success('Answer recorded successfully');
      } else {
        throw new Error('Failed to create answer note');
      }
    } catch (error) {
      console.error('Error recording answer:', error);
      toast.error('Failed to record answer: ' + error.message);
    }
  };

  const handleTimeAnswer = async (trackerId, time, date) => {
    try {
      const tracker = trackerQuestions.find(q => q.id === trackerId);
      if (!tracker) {
        console.error('Tracker not found:', trackerId);
        return;
      }

      const response = await createTrackerAnswerNote(trackerId, time, date || tracker.date);
      
      if (response && response.id) {
        setTimeAnswers(prev => ({ ...prev, [trackerId]: { time, date: date || tracker.date } }));
        
        // Update the questions list to remove the answered one
        setTrackerQuestions(prev => 
          prev.filter(q => !(q.id === trackerId && q.date === (date || tracker.date)))
        );

        toast.success('Time recorded successfully');
      } else {
        throw new Error('Failed to create time answer note');
      }
    } catch (error) {
      console.error('Error recording time:', error);
      toast.error('Failed to record time: ' + error.message);
    }
  };

  if (!trackerQuestions || trackerQuestions.length === 0) return null;

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden w-full">
      <div 
        className="bg-blue-50 px-6 py-4 border-b border-blue-100 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <DocumentTextIcon className="h-6 w-6 text-blue-500" />
            <h3 className="ml-3 text-lg font-semibold text-blue-800">
              Tracker Questions ({trackerQuestions.length})
            </h3>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="text-blue-600 hover:text-blue-700 focus:outline-none"
            aria-label={isExpanded ? "Collapse questions" : "Expand questions"}
          >
            {isExpanded ? (
              <ChevronUpIcon className="h-5 w-5" />
            ) : (
              <ChevronDownIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
      {isExpanded && trackerQuestions && (
        <div className="divide-y divide-gray-100">
          {trackerQuestions.map((tracker) => (
            <div key={`${tracker.id}-${tracker.date}`} className="p-6 hover:bg-gray-50 transition-colors duration-150">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                      <CalendarIcon className="h-4 w-4" />
                      <span>{tracker.formattedDate}</span>
                    </div>
                    <h5 className="text-md font-medium text-gray-900 mb-2">
                      {tracker.title}
                    </h5>
                    <p className="text-gray-600 mb-4">{tracker.question}</p>
                  </div>
                  <div className="flex flex-col gap-2 relative z-10">
                    {tracker.type?.toLowerCase() === 'value_time' ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <input
                            type="date"
                            value={timeAnswers[tracker.id]?.date || tracker.date}
                            onChange={(e) => {
                              e.stopPropagation();
                              setTimeAnswers(prev => ({ ...prev, [tracker.id]: { ...prev[tracker.id], date: e.target.value } }));
                            }}
                            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="time"
                            value={timeAnswers[tracker.id]?.time || ''}
                            onChange={(e) => {
                              e.stopPropagation();
                              setTimeAnswers(prev => ({ ...prev, [tracker.id]: { ...prev[tracker.id], time: e.target.value } }));
                            }}
                            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleTimeAnswer(tracker.id, timeAnswers[tracker.id]?.time, timeAnswers[tracker.id]?.date);
                            }}
                            className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200"
                          >
                            <CheckIcon className="h-5 w-5" />
                          </button>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTimeAnswer(tracker.id, 'Not Known', timeAnswers[tracker.id]?.date);
                          }}
                          className="w-full px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200"
                        >
                          Not Known
                        </button>
                      </div>
                    ) : tracker.type?.toLowerCase() === 'value' ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <input
                            type="date"
                            value={answers[tracker.id]?.date || tracker.date}
                            onChange={(e) => {
                              e.stopPropagation();
                              setAnswers(prev => ({ ...prev, [tracker.id]: { ...prev[tracker.id], date: e.target.value } }));
                            }}
                            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={answers[tracker.id]?.value || ''}
                            onChange={(e) => {
                              e.stopPropagation();
                              setAnswers(prev => ({ ...prev, [tracker.id]: { ...prev[tracker.id], value: e.target.value } }));
                            }}
                            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Enter value"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAnswer(tracker.id, answers[tracker.id]?.value, answers[tracker.id]?.date);
                            }}
                            className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200"
                          >
                            <CheckIcon className="h-5 w-5" />
                          </button>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAnswer(tracker.id, 'Not Known', answers[tracker.id]?.date);
                          }}
                          className="w-full px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200"
                        >
                          Not Known
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAnswer(tracker.id, 'Yes', answers[tracker.id]?.date);
                          }}
                          className={`px-4 py-2 rounded-lg ${
                            answers[tracker.id] === 'Yes'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                        >
                          Yes
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAnswer(tracker.id, 'No', answers[tracker.id]?.date);
                          }}
                          className={`px-4 py-2 rounded-lg ${
                            answers[tracker.id] === 'No'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                          }`}
                        >
                          No
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const formatDateString = (date) => {
  // If date is already a string in YYYY-MM-DD format, return it
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  // Convert to Date object if it's a string
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Ensure we have a valid Date object
  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    console.error('Invalid date:', date);
    return '';
  }

  return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
};

const calculateNextOccurrence = (meetingTime, recurrenceType, selectedDays = [], content = '') => {
  // Ensure meetingTime is a Date object
  const meetingDateObj = meetingTime instanceof Date ? meetingTime : new Date(meetingTime);
  const now = new Date();
  const meetingDate = formatDateString(meetingDateObj);
  const todayStr = formatDateString(now);

  // Extract all acknowledgment dates from meta tags and normalize to YYYY-MM-DD format
  const ackDates = content
    .split('\n')
    .filter(line => line.trim().startsWith('meta::meeting_acknowledge::'))
    .map(line => {
      const dateStr = line.split('::')[2].trim();
      return formatDateString(dateStr);
    });

  // For daily recurrence
  if (recurrenceType.trim() === 'daily') {
    // If today's meeting hasn't been acknowledged, return it
    if (meetingDate === todayStr && !ackDates.includes(todayStr)) {
      return meetingDateObj;
    }

    // Start from tomorrow's date
    let currentDate = new Date(now);
    currentDate.setDate(currentDate.getDate() + 1);
    currentDate.setHours(meetingDateObj.getHours());
    currentDate.setMinutes(meetingDateObj.getMinutes());
    currentDate.setSeconds(meetingDateObj.getSeconds());

    // Find the next unacknowledged date
    while (true) {
      const currentDateStr = formatDateString(currentDate);
      if (!ackDates.includes(currentDateStr)) {
        return currentDate;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  // For other recurrence types
  const nextDate = new Date(meetingDateObj);

  switch (recurrenceType) {
    case 'weekly':
      while (formatDateString(nextDate) <= todayStr || ackDates.includes(formatDateString(nextDate))) {
        nextDate.setDate(nextDate.getDate() + 7);
      }
      break;
    case 'monthly':
      while (formatDateString(nextDate) <= todayStr || ackDates.includes(formatDateString(nextDate))) {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }
      break;
    case 'yearly':
      while (formatDateString(nextDate) <= todayStr || ackDates.includes(formatDateString(nextDate))) {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      }
      break;
    case 'custom':
      if (selectedDays.length === 0) return null;

      const currentDay = now.getDay();
      const meetingDay = meetingDateObj.getDay();

      let nextDay = null;
      let minDiff = Infinity;

      selectedDays.forEach(day => {
        const dayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(day);
        if (dayIndex === -1) return;

        let diff = dayIndex - currentDay;
        if (diff <= 0) diff += 7;

        if (diff < minDiff) {
          minDiff = diff;
          nextDay = dayIndex;
        }
      });

      if (nextDay === null) return null;

      nextDate.setDate(now.getDate() + minDiff);
      nextDate.setHours(meetingDateObj.getHours());
      nextDate.setMinutes(meetingDateObj.getMinutes());

      while (ackDates.includes(formatDateString(nextDate))) {
        nextDate.setDate(nextDate.getDate() + 7);
      }
      break;
    default:
      return null;
  }

  return nextDate;
};

const UpcomingEventsAlert = ({ notes, expanded: initialExpanded = true }) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [upcomingEvents, setUpcomingEvents] = useState([]);

  useEffect(() => {
    const calculateUpcomingEvents = () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(today.getDate() + 7);
      sevenDaysFromNow.setHours(23, 59, 59, 999); // End of the day

      const eventNotes = notes.filter(note => note.content.includes('meta::event::'));
      const upcoming = [];

      eventNotes.forEach(note => {
        const lines = note.content.split('\n');
        const description = lines[0].trim();
        const eventDateLine = lines.find(line => line.startsWith('event_date:'));
        const baseEventDate = eventDateLine ? eventDateLine.replace('event_date:', '').trim() : null;
        if (!baseEventDate) return;

        const recurringLine = lines.find(line => line.startsWith('event_recurring_type:'));
        const recurrenceType = recurringLine ? recurringLine.replace('event_recurring_type:', '').trim() : null;

        const locationLine = lines.find(line => line.startsWith('event_location:'));
        const location = locationLine ? locationLine.replace('event_location:', '').trim() : null;

        try {
          // Calculate next occurrence if it's a recurring event
          const nextOccurrence = recurrenceType
            ? calculateNextOccurrence(baseEventDate, recurrenceType, [], note.content)
            : new Date(baseEventDate);

          // If there's no next occurrence or invalid date, don't include the event
          if (!nextOccurrence || !(nextOccurrence instanceof Date)) return;

          // Only include events within the next 7 days
          if (nextOccurrence >= today && nextOccurrence <= sevenDaysFromNow) {
            upcoming.push({
              id: note.id,
              date: nextOccurrence,
              originalDate: new Date(baseEventDate),
              description: description.replace('event_description:', '').trim(),
              location,
              isRecurring: !!recurrenceType,
              recurrenceType,
              baseEventDate
            });
          }
        } catch (error) {
          console.error('Error processing event:', error);
        }
      });

      // Sort events by date
      upcoming.sort((a, b) => a.date - b.date);
      setUpcomingEvents(upcoming);
    };

    calculateUpcomingEvents();
  }, [notes]);

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden w-full">
      <div 
        className="bg-blue-50 px-6 py-4 border-b border-blue-100 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <CalendarIcon className="h-6 w-6 text-blue-500" />
            <h3 className="ml-3 text-lg font-semibold text-blue-800">
              Upcoming Events ({upcomingEvents.length})
            </h3>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="text-blue-600 hover:text-blue-700 focus:outline-none"
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
      {isExpanded && (
        <div className="divide-y divide-gray-100">
          {upcomingEvents.length === 0 ? (
            <div className="p-6 text-gray-500">
              No events scheduled for the next 7 days.
            </div>
          ) : (
            upcomingEvents.map((event, index) => (
              <div key={index} className="p-6 hover:bg-gray-50 transition-colors duration-150">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                      <CalendarIcon className="h-4 w-4" />
                      <span>
                        {event.date.toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                    <h4 className="text-lg font-medium text-gray-900">
                      {event.description}
                    </h4>
                    {event.isRecurring && event.originalDate && (
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                        <ClockIcon className="h-4 w-4" />
                        <span>
                          Original date: {event.originalDate.toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })} ({getAge(event.originalDate)})
                        </span>
                      </div>
                    )}
                    {event.location && (
                      <div className="flex items-center gap-1.5 text-sm text-gray-600 mt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                        </svg>
                        <span>{event.location}</span>
                      </div>
                    )}
                    {event.isRecurring && (
                      <div className="flex items-center gap-1.5 text-sm text-gray-600 mt-1">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                        </svg>
                        <span>{event.recurrenceType.charAt(0).toUpperCase() + event.recurrenceType.slice(1)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const AlertsContainer = ({ children, notes, events, expanded: initialExpanded = true, setNotes }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [autoRefreshCountdown, setAutoRefreshCountdown] = useState(10);
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(true);
  const autoRefreshIntervalRef = useRef(null);

  // Calculate overdue notes
  const overdueNotes = notes.filter(note => {
    if (!note.content.includes('meta::watch')) return false;
    return checkNeedsReview(note.id);
  });

  // Auto refresh effect
  useEffect(() => {
    if (isAutoRefreshEnabled) {
      autoRefreshIntervalRef.current = setInterval(() => {
        setAutoRefreshCountdown(prev => {
          if (prev <= 1) {
            loadNotes('', new Date().toISOString().split('T')[0])
              .then(data => {
                if (data && data.notes) {
                  setNotes(data.notes);
                }
              })
              .catch(error => {
                console.error('Error refreshing alerts:', error);
              });
            return 10;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setAutoRefreshCountdown(10);
    }

    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
    };
  }, [isAutoRefreshEnabled, setNotes]);

  const criticalTodos = notes.filter(note => {
    if (!note.content.includes('meta::todo::')) return false;
    if (note.content.includes('meta::todo_completed')) return false;
    return note.content.includes('meta::critical');
  });

  const passedDeadlineTodos = notes.filter(note => {
    if (!note.content.includes('meta::todo::')) return false;
    if (note.content.includes('meta::todo_completed')) return false;
    
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
    !note.content.includes('meta::acknowledged::') &&
    !note.content.includes('meta::meeting_acknowledge::')
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
                     unacknowledgedMeetings.length +
                     overdueNotes.length;

  const handleTitleClick = () => {
    setIsExpanded(!isExpanded);
  };

  const handleCriticalTodosClick = (e) => {
    e.stopPropagation();
    window.location.href = '/#/todos';
  };

  const handleDeadlineMissedClick = (e) => {
    e.stopPropagation();
    window.location.href = '/#/todos';
  };

  const handleReviewOverdueClick = (e) => {
    e.stopPropagation();
    window.location.href = '/#/watch';
  };

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-6 w-full">
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
                  Past Events: {unacknowledgedEvents.length}
                </span>
              )}
              {criticalTodos.length > 0 && (
                <span 
                  onClick={handleCriticalTodosClick}
                  className="px-2 py-1 bg-red-100 text-red-800 rounded-md text-sm font-medium cursor-pointer hover:bg-red-200 transition-colors duration-150"
                >
                  Critical Todos: {criticalTodos.length}
                </span>
              )}
              {passedDeadlineTodos.length > 0 && (
                <span 
                  onClick={handleDeadlineMissedClick}
                  className="px-2 py-1 bg-red-100 text-red-800 rounded-md text-sm font-medium cursor-pointer hover:bg-red-200 transition-colors duration-150"
                >
                  Deadline Missed: {passedDeadlineTodos.length}
                </span>
              )}
              {unacknowledgedMeetings.length > 0 && (
                <span className="px-2 py-1 bg-red-100 text-red-800 rounded-md text-sm font-medium">
                  Past Meetings: {unacknowledgedMeetings.length}
                </span>
              )}
              {overdueNotes.length > 0 && (
                <span 
                  onClick={handleReviewOverdueClick}
                  className="px-2 py-1 bg-amber-100 text-amber-800 rounded-md text-sm font-medium cursor-pointer hover:bg-amber-200 transition-colors duration-150"
                >
                  Review Overdue: {overdueNotes.length}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">({autoRefreshCountdown}s)</span>
              <input
                type="checkbox"
                checked={isAutoRefreshEnabled}
                onChange={(e) => {
                  e.stopPropagation();
                  setIsAutoRefreshEnabled(e.target.checked);
                }}
                className="form-checkbox h-4 w-4 text-indigo-600"
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  loadNotes('', new Date().toISOString().split('T')[0])
                    .then(data => {
                      if (data && data.notes) {
                        setNotes(data.notes);
                        setAutoRefreshCountdown(10);
                      }
                    })
                    .catch(error => {
                      console.error('Error refreshing alerts:', error);
                    });
                }}
                className="text-gray-600 hover:text-gray-800 focus:outline-none transition-transform duration-200 hover:scale-110 active:scale-95"
                title="Refresh alerts"
              >
                <ArrowPathIcon className="h-5 w-5" />
              </button>
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
      </div>
      {isExpanded && (
        <div className="divide-y divide-gray-100 p-4 space-y-4">
          {children}
        </div>
      )}
    </div>
  );
};

const AlertsProvider = ({ children, notes, expanded = true, events, setNotes }) => {
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
      <div className="space-y-6 w-full">
        <UpcomingEventsAlert notes={notes} expanded={false} />
        <TrackerQuestionsAlert notes={notes} expanded={false} />
        <AlertsContainer 
          expanded={true}
          notes={notes} 
          events={events}
          setNotes={setNotes}
        >
          <EventAlerts 
            events={events}
            expanded={true}
          />
          <div className="flex gap-4">
            <CriticalTodosAlert notes={notes} expanded={true} setNotes={setNotes} />
            <ReviewOverdueAlert notes={notes} expanded={true} />
          </div>
          <DeadlinePassedAlert notes={notes} expanded={true} />
          <UnacknowledgedMeetingsAlert 
            notes={notes} 
            expanded={true}
            onDismiss={handleDismissUnacknowledgedMeeting}
          />
        </AlertsContainer>
      </div>
      {children}
    </>
  );
};

export { Alerts, AlertsProvider }; 