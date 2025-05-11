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
  EyeIcon,
  PencilIcon,
  ChevronRightIcon,
  BellIcon,
  FireIcon
} from '@heroicons/react/24/outline';
import EventAlerts from './EventAlerts';
import { updateNoteById, loadNotes, loadTags, addNewNoteCommon, createNote, exportAllNotes } from '../utils/ApiUtils';
import { getAgeInStringFmt, getDateInDDMMYYYYFormat, getDiffInDays } from '../utils/DateUtils';
import { checkNeedsReview, getNoteCadence, formatTimeElapsed } from '../utils/watchlistUtils';
import NoteView from './NoteView';
import { generateTrackerQuestions, createTrackerAnswerNote } from '../utils/TrackerQuestionUtils';
import TrackerQuestionCard from './TrackerQuestionCard';
import MeetingManager from './MeetingManager.js';
import NoteEditor from './NoteEditor';
import AddEventModal from './AddEventModal';

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

const DeadlinePassedAlert = ({ notes, expanded: initialExpanded = true, setNotes }) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [expandedNotes, setExpandedNotes] = useState({});
  const [showRawNote, setShowRawNote] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [showNoteEditor, setShowNoteEditor] = useState(false);

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

  const handleViewRawNote = (note) => {
    setSelectedNote(note);
    setShowRawNote(true);
  };

  const handleEditNote = (note) => {
    setSelectedNote(note);
    setShowNoteEditor(true);
  };

  const handleMarkCompleted = async (note) => {
    try {
      // Remove todo, priority, and deadline tags
      const updatedContent = note.content
        .split('\n')
        .filter(line => {
          const trimmedLine = line.trim();
          return !trimmedLine.startsWith('meta::todo::') &&
                 !trimmedLine.startsWith('meta::priority::') &&
                 !trimmedLine.startsWith('meta::end_date::') &&
                 !trimmedLine.startsWith('meta::critical');
        })
        .join('\n')
        .trim();

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

  const getOverdueDays = (endDate) => {
    const now = new Date();
    const diffTime = Math.abs(now - endDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden">
      <div className="bg-rose-50 px-6 py-4 border-b border-rose-100 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <ExclamationCircleIcon className="h-6 w-6 text-rose-500" />
            <h3 className="ml-3 text-base font-semibold text-rose-800">
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
                <div className="flex flex-col">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                      <CalendarIcon className="h-4 w-4" />
                      <span className="text-xs text-gray-500">Deadline: {getDateInDDMMYYYYFormat(endDate)}</span>
                    </div>
                    <h4 className="text-base font-medium text-gray-900 mb-2">
                      {formatContent(todo.content)}
                    </h4>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1 text-rose-600 font-medium">
                        <ClockIcon className="h-4 w-4" />
                        <span>{overdueDays} {overdueDays === 1 ? 'day' : 'days'} overdue</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-4">
                    <button
                      onClick={() => handleMarkCompleted(todo)}
                      className="p-2 text-green-700 bg-green-50 rounded-lg hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-150"
                      title="Mark as Completed"
                    >
                      <CheckIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleEditNote(todo)}
                      className="p-2 text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
                      title="Edit Note"
                    >
                      <PencilIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleViewRawNote(todo)}
                      className="p-2 text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-150"
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

      {showRawNote && selectedNote && (
        <NoteView
          isOpen={showRawNote}
          content={selectedNote.content}
          onClose={() => setShowRawNote(false)}
        />
      )}

      {/* Note Editor Modal */}
      {showNoteEditor && selectedNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Edit Note</h2>
              <button
                onClick={() => setShowNoteEditor(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <NoteEditor
              note={selectedNote}
              onSave={async (updatedContent) => {
                try {
                  await updateNoteById(selectedNote.id, updatedContent);
                  // Update the notes list immediately after successful update
                  const updatedNotes = notes.map(n => 
                    n.id === selectedNote.id ? { ...n, content: updatedContent } : n
                  );
                  setNotes(updatedNotes);
                  setShowNoteEditor(false);
                  Alerts.success('Note updated successfully');
                } catch (error) {
                  console.error('Error updating note:', error);
                  Alerts.error('Failed to update note');
                }
              }}
              onCancel={() => setShowNoteEditor(false)}
              objList={[]}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const CriticalTodosAlert = ({ notes, expanded: initialExpanded = true, setNotes }) => {
  const [showRawNote, setShowRawNote] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [showPriorityPopup, setShowPriorityPopup] = useState(false);
  const [noteToUpdate, setNoteToUpdate] = useState(null);
  const [expandedNotes, setExpandedNotes] = useState({});
  const [showNoteEditor, setShowNoteEditor] = useState(false);

  // Add burning animation styles
  useEffect(() => {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      @keyframes burning {
        0% { 
          transform: scale(1) rotate(-3deg); 
          filter: drop-shadow(0 0 2px rgba(255, 0, 0, 0.5)) drop-shadow(0 0 4px rgba(255, 165, 0, 0.3));
          color: rgb(255, 0, 0);
        }
        10% { 
          transform: scale(1.1) rotate(2deg); 
          filter: drop-shadow(0 0 4px rgba(255, 0, 0, 0.7)) drop-shadow(0 0 8px rgba(255, 165, 0, 0.5));
          color: rgb(255, 69, 0);
        }
        20% { 
          transform: scale(0.95) rotate(-2deg); 
          filter: drop-shadow(0 0 3px rgba(255, 0, 0, 0.6)) drop-shadow(0 0 6px rgba(255, 165, 0, 0.4));
          color: rgb(255, 140, 0);
        }
        30% { 
          transform: scale(1.05) rotate(1deg); 
          filter: drop-shadow(0 0 5px rgba(255, 0, 0, 0.8)) drop-shadow(0 0 10px rgba(255, 165, 0, 0.6));
          color: rgb(255, 0, 0);
        }
        40% { 
          transform: scale(0.98) rotate(-1deg); 
          filter: drop-shadow(0 0 3px rgba(255, 0, 0, 0.6)) drop-shadow(0 0 6px rgba(255, 165, 0, 0.4));
          color: rgb(255, 69, 0);
        }
        50% { 
          transform: scale(1.1) rotate(2deg); 
          filter: drop-shadow(0 0 4px rgba(255, 0, 0, 0.7)) drop-shadow(0 0 8px rgba(255, 165, 0, 0.5));
          color: rgb(255, 140, 0);
        }
        60% { 
          transform: scale(0.95) rotate(-2deg); 
          filter: drop-shadow(0 0 3px rgba(255, 0, 0, 0.6)) drop-shadow(0 0 6px rgba(255, 165, 0, 0.4));
          color: rgb(255, 0, 0);
        }
        70% { 
          transform: scale(1.05) rotate(1deg); 
          filter: drop-shadow(0 0 5px rgba(255, 0, 0, 0.8)) drop-shadow(0 0 10px rgba(255, 165, 0, 0.6));
          color: rgb(255, 69, 0);
        }
        80% { 
          transform: scale(0.98) rotate(-1deg); 
          filter: drop-shadow(0 0 3px rgba(255, 0, 0, 0.6)) drop-shadow(0 0 6px rgba(255, 165, 0, 0.4));
          color: rgb(255, 140, 0);
        }
        90% { 
          transform: scale(1.1) rotate(2deg); 
          filter: drop-shadow(0 0 4px rgba(255, 0, 0, 0.7)) drop-shadow(0 0 8px rgba(255, 165, 0, 0.5));
          color: rgb(255, 0, 0);
        }
        100% { 
          transform: scale(1) rotate(-3deg); 
          filter: drop-shadow(0 0 2px rgba(255, 0, 0, 0.5)) drop-shadow(0 0 4px rgba(255, 165, 0, 0.3));
          color: rgb(255, 69, 0);
        }
      }
      .burning-icon {
        animation: burning 1.5s ease-in-out infinite;
        transform-origin: center;
        will-change: transform, filter, color;
      }
    `;
    document.head.appendChild(styleSheet);
    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  const criticalTodos = notes.filter(note => {
    if (!note.content.includes('meta::todo::')) return false;
    if (note.content.includes('meta::todo_completed')) return false;
    return note.content.includes('meta::critical');
  });

  if (criticalTodos.length === 0) return null;

  const handleViewRawNote = (note) => {
    setSelectedNote(note);
    setShowRawNote(true);
  };

  const handleEditNote = (note) => {
    setSelectedNote(note);
    setShowNoteEditor(true);
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
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urlMatch = line.match(urlRegex);
      if (!urlMatch) return line;

      const url = urlMatch[0];
      const markdownMatch = line.match(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/);
      
      // Always use "Link" as the text, regardless of markdown or plain URL
      return (
        <a
          href={markdownMatch ? markdownMatch[2] : url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 inline-flex items-center text-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1">
            <path fillRule="evenodd" d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3z" clipRule="evenodd" />
            <path fillRule="evenodd" d="M11.603 7.963a.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 105.656 5.656l3-3a4 4 0 00-.225-5.865z" clipRule="evenodd" />
          </svg>
          Link
        </a>
      );
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
        <div className="bg-red-50 px-6 py-4 border-b border-red-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FireIcon className="h-6 w-6 text-red-500 burning-icon" />
              <h3 className="ml-3 text-base font-semibold text-red-800">
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
            </div>
          </div>
        </div>
        <div className="divide-y divide-gray-100">
          {criticalTodos.map((todo, index) => {
            return (
              <div 
                key={todo.id} 
                className={`p-6 transition-colors duration-150 min-h-[160px] ${
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                } hover:bg-gray-100`}
              >
                <div className="flex flex-col h-full">
                  <div className="flex-1">
                    <h4 className="text-base font-medium text-gray-900 mb-2 break-words">
                      {formatContent(todo.content)}
                    </h4>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <button
                      onClick={() => handleMarkCompleted(todo)}
                      className="px-4 py-2 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-150"
                      title="Mark Completed"
                    >
                      <CheckIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleLowerPriority(todo)}
                      className="px-4 py-2 text-xs font-medium text-yellow-700 bg-yellow-50 rounded-lg hover:bg-yellow-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors duration-150"
                      title="Lower Priority"
                    >
                      <ArrowTrendingDownIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleEditNote(todo)}
                      className="px-4 py-2 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
                      title="Edit Note"
                    >
                      <PencilIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleViewRawNote(todo)}
                      className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-50 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-150"
                      title="View Raw Note"
                    >
                      <CodeBracketIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleAddToWatch(todo)}
                      className={`px-4 py-2 text-xs font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-150 ${
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
        </div>
      </div>

      {/* Priority Selection Popup */}
      {showPriorityPopup && noteToUpdate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">Select New Priority</h3>
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

      {showNoteEditor && selectedNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Edit Note</h2>
              <button
                onClick={() => setShowNoteEditor(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <NoteEditor
              note={selectedNote}
              onSave={(updatedContent) => {
                updateNoteById(selectedNote.id, updatedContent);
                // Update the notes list immediately after successful update
                const updatedNotes = notes.map(n => 
                  n.id === selectedNote.id ? { ...n, content: updatedContent } : n
                );
              
                setNotes(updatedNotes);
                setShowNoteEditor(false);
              }}
              onCancel={() => setShowNoteEditor(false)}
              objList={[]}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const ReviewOverdueAlert = ({ notes, expanded: initialExpanded = true, setNotes }) => {
  const [showAllNotes, setShowAllNotes] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState({});
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [showPriorityPopup, setShowPriorityPopup] = useState(false);
  const [noteToConvert, setNoteToConvert] = useState(null);

  const overdueNotes = notes.filter(note => {
    if (!note.content.includes('meta::watch')) return false;
    if (note.content.includes('meta::reminder')) return false;
    return checkNeedsReview(note.id);
  });

  if (overdueNotes.length === 0) return null;

  const toggleNoteExpand = (noteId) => {
    setExpandedNotes(prev => ({
      ...prev,
      [noteId]: !prev[noteId]
    }));
  };

  const handleEditNote = (note) => {
    setSelectedNote(note);
    setShowNoteEditor(true);
  };

  const handleUnfollow = async (note) => {
    try {
      // Remove the entire line containing meta::watch
      const updatedContent = note.content
        .split('\n')
        .filter(line => !line.trim().startsWith('meta::watch'))
        .join('\n')
        .trim();
      
      // Update the note
      await updateNoteById(note.id, updatedContent);
      
      // Update the notes list immediately
      const updatedNotes = notes.map(n => 
        n.id === note.id ? { ...n, content: updatedContent } : n
      );
      setNotes(updatedNotes);

      // Remove from localStorage
      const reviews = JSON.parse(localStorage.getItem('noteReviews') || '{}');
      delete reviews[note.id];
      localStorage.setItem('noteReviews', JSON.stringify(reviews));

      const cadences = JSON.parse(localStorage.getItem('noteReviewCadence') || '{}');
      delete cadences[note.id];
      localStorage.setItem('noteReviewCadence', JSON.stringify(cadences));

      Alerts.success('Note removed from watchlist');
    } catch (error) {
      console.error('Error unfollowing note:', error);
      Alerts.error('Failed to remove from watchlist');
    }
  };

  const handleSetCadence = async (note, hours) => {
    try {
      // Remove existing cadence tag if it exists
      let updatedContent = note.content
        .split('\n')
        .filter(line => !line.includes('meta::cadence::'))
        .join('\n');

      // Add new cadence tag
      updatedContent = `${updatedContent}\nmeta::cadence::${hours}h`;

      // Update the note
      await updateNoteById(note.id, updatedContent);
      
      // Update the notes list immediately
      const updatedNotes = notes.map(n => 
        n.id === note.id ? { ...n, content: updatedContent } : n
      );
      setNotes(updatedNotes);
      
      // Update the review time in localStorage
      const reviews = JSON.parse(localStorage.getItem('noteReviews') || '{}');
      reviews[note.id] = new Date().toISOString();
      localStorage.setItem('noteReviews', JSON.stringify(reviews));

      // Update the cadence in localStorage
      const cadences = JSON.parse(localStorage.getItem('noteReviewCadence') || '{}');
      cadences[note.id] = { hours, minutes: 0 };
      localStorage.setItem('noteReviewCadence', JSON.stringify(cadences));

      Alerts.success(`Review cadence set to ${hours} hours`);
    } catch (error) {
      console.error('Error setting cadence:', error);
      Alerts.error('Failed to set review cadence');
    }
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
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urlMatch = line.match(urlRegex);
      if (!urlMatch) return line;

      const url = urlMatch[0];
      const markdownMatch = line.match(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/);
      
      // Always use "Link" as the text, regardless of markdown or plain URL
      return (
        <a
          href={markdownMatch ? markdownMatch[2] : url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 inline-flex items-center text-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1">
            <path fillRule="evenodd" d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3z" clipRule="evenodd" />
            <path fillRule="evenodd" d="M11.603 7.963a.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 105.656 5.656l3-3a4 4 0 00-.225-5.865z" clipRule="evenodd" />
          </svg>
          Link
        </a>
      );
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

  const handleConvertToTodo = (note) => {
    setNoteToConvert(note);
    setShowPriorityPopup(true);
  };

  const handlePrioritySelect = async (priority) => {
    if (!noteToConvert) return;

    try {
      // Add todo tag and priority tag
      let updatedContent = `${noteToConvert.content}\nmeta::todo::`;
      
      // Add appropriate priority tag
      if (priority === 'critical') {
        updatedContent += '\nmeta::critical';
      } else {
        updatedContent += `\nmeta::${priority}`;
      }

      await updateNoteById(noteToConvert.id, updatedContent);
      
      // Update the notes list immediately
      const updatedNotes = notes.map(n => 
        n.id === noteToConvert.id ? { ...n, content: updatedContent } : n
      );
      setNotes(updatedNotes);
      
      Alerts.success(`Note converted to ${priority} priority todo`);
    } catch (error) {
      console.error('Error converting to todo:', error);
      Alerts.error('Failed to convert to todo');
    } finally {
      setShowPriorityPopup(false);
      setNoteToConvert(null);
    }
  };

  return (
    <div className="w-1/2 pl-2">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden h-full">
        <div className="bg-red-50 px-6 py-4 border-b border-red-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ClockIcon className="h-6 w-6 text-red-500" />
              <h3 className="ml-3 text-base font-semibold text-red-800">
                Review Overdue ({overdueNotes.length})
              </h3>
            </div>
          </div>
        </div>
        <div className="divide-y divide-gray-100">
          {overdueNotes.map((note, index) => {
            const reviews = JSON.parse(localStorage.getItem('noteReviews') || '{}');
            const reviewTime = reviews[note.id];
            const cadence = getNoteCadence(note.id);

            return (
              <div 
                key={note.id} 
                className={`p-6 transition-colors duration-150 min-h-[160px] ${
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                } hover:bg-gray-100`}
              >
                <div className="flex flex-col h-full">
                  <div className="flex-1">
                    <h4 className="text-base font-medium text-gray-900 mb-2 break-words">
                      {formatContent(note.content)}
                    </h4>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <ClockIcon className="h-4 w-4" />
                        <span className="text-xs text-gray-500">Last reviewed: {reviewTime ? formatTimeElapsed(reviewTime) : 'Never'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ClockIcon className="h-4 w-4" />
                        <span className="text-xs text-gray-500">Review cadence: {cadence.hours}h {cadence.minutes}m</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <button
                      onClick={() => handleEditNote(note)}
                      className="px-4 py-2 text-xs font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
                      title="Edit Note"
                    >
                      <PencilIcon className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleUnfollow(note)}
                      className="px-4 py-2 text-xs font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-150"
                      title="Remove from watchlist"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                    {!note.content.includes('meta::todo::') && (
                      <button
                        onClick={() => handleConvertToTodo(note)}
                        className="px-4 py-2 text-xs font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-150"
                        title="Convert to Todo"
                      >
                        <CheckIcon className="w-5 h-5" />
                      </button>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSetCadence(note, 2)}
                        className="px-3 py-2 text-sm font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
                        title="Set 2 hour cadence"
                      >
                        2h
                      </button>
                      <button
                        onClick={() => handleSetCadence(note, 6)}
                        className="px-3 py-2 text-sm font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
                        title="Set 6 hour cadence"
                      >
                        6h
                      </button>
                      <button
                        onClick={() => handleSetCadence(note, 12)}
                        className="px-3 py-2 text-sm font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
                        title="Set 12 hour cadence"
                      >
                        12h
                      </button>
                      <button
                        onClick={() => handleSetCadence(note, 24)}
                        className="px-3 py-2 text-sm font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
                        title="Set 24 hour cadence"
                      >
                        24h
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Priority Selection Popup */}
      {showPriorityPopup && noteToConvert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-gray-900">Select Priority</h3>
              <button
                onClick={() => setShowPriorityPopup(false)}
                className="text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-2">
              {['critical', 'high', 'medium', 'low'].map((priority) => (
                <button
                  key={priority}
                  onClick={() => handlePrioritySelect(priority)}
                  className={`w-full px-4 py-2 text-left text-sm font-medium rounded-lg transition-colors duration-150 ${
                    priority === 'critical' 
                      ? 'text-red-700 hover:bg-red-50' 
                      : priority === 'high'
                      ? 'text-orange-700 hover:bg-orange-50'
                      : priority === 'medium'
                      ? 'text-yellow-700 hover:bg-yellow-50'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Note Editor Modal */}
      {showNoteEditor && selectedNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800">Edit Note</h2>
              <button
                onClick={() => setShowNoteEditor(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <NoteEditor
              note={selectedNote}
              onSave={async (updatedContent) => {
                try {
                  await updateNoteById(selectedNote.id, updatedContent);
                  // Update the notes list immediately after successful update
                  const updatedNotes = notes.map(n => 
                    n.id === selectedNote.id ? { ...n, content: updatedContent } : n
                  );
                  setNotes(updatedNotes);
                  setShowNoteEditor(false);
                  Alerts.success('Note updated successfully');
                } catch (error) {
                  console.error('Error updating note:', error);
                  Alerts.error('Failed to update note');
                }
              }}
              onCancel={() => setShowNoteEditor(false)}
              objList={[]}
            />
          </div>
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
      <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
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
            <TrackerQuestionCard
              key={`${tracker.id}-${tracker.date}`}
              tracker={tracker}
              answers={answers}
              timeAnswers={timeAnswers}
              setAnswers={setAnswers}
              setTimeAnswers={setTimeAnswers}
              handleAnswer={handleAnswer}
              handleTimeAnswer={handleTimeAnswer}
            />
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
  const [showPopup, setShowPopup] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [revealedEvents, setRevealedEvents] = useState({});
  const [eventIndicators, setEventIndicators] = useState('');

  // Add the typewriter animation style
  useEffect(() => {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      @keyframes typewriter {
        0% {
          opacity: 0;
        }
        5% {
          opacity: 1;
        }
        95% {
          opacity: 1;
        }
        100% {
          opacity: 0;
        }
      }
      .typewriter-text {
        display: inline-block;
        font-weight: 600;
        color: rgb(239, 68, 68);
      }
      .typewriter-text span {
        display: inline-block;
        opacity: 0;
        animation: typewriter 3s infinite;
      }
      .typewriter-text span:nth-child(1) { animation-delay: 0s; }
      .typewriter-text span:nth-child(2) { animation-delay: 0.1s; }
      .typewriter-text span:nth-child(3) { animation-delay: 0.2s; }
      .typewriter-text span:nth-child(4) { animation-delay: 0.3s; }
      .typewriter-text span:nth-child(5) { animation-delay: 0.4s; }
      .typewriter-text span:nth-child(6) { animation-delay: 0.5s; }
      .typewriter-text span:nth-child(7) { animation-delay: 0.6s; }
      .typewriter-text span:nth-child(8) { animation-delay: 0.7s; }
      .typewriter-text span:nth-child(9) { animation-delay: 0.8s; }
      .typewriter-text span:nth-child(10) { animation-delay: 0.9s; }
      .typewriter-text span:nth-child(11) { animation-delay: 1s; }
      .typewriter-text span:nth-child(12) { animation-delay: 1.1s; }
      .typewriter-text span:nth-child(13) { animation-delay: 1.2s; }
      .typewriter-text span:nth-child(14) { animation-delay: 1.3s; }
      .typewriter-text span:nth-child(15) { animation-delay: 1.4s; }
      .typewriter-text span:nth-child(16) { animation-delay: 1.5s; }
      .typewriter-text span:nth-child(17) { animation-delay: 1.6s; }
      .typewriter-text span:nth-child(18) { animation-delay: 1.7s; }
      .typewriter-text span:nth-child(19) { animation-delay: 1.8s; }
      .typewriter-text span:nth-child(20) { animation-delay: 1.9s; }
    `;
    document.head.appendChild(styleSheet);
    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  useEffect(() => {
    const calculateUpcomingEvents = () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(today.getDate() + 7);
      sevenDaysFromNow.setHours(23, 59, 59, 999); // End of the day

      const eventNotes = notes.filter(note => note.content.includes('meta::event::'));
      const upcoming = [];
      let hasTodayEvent = false;
      let hasTomorrowEvent = false;
      let nextEventDays = null;

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

        const isHidden = note.content.includes('meta::event_hidden');

        try {
          // Calculate next occurrence if it's a recurring event
          const nextOccurrence = recurrenceType
            ? calculateNextOccurrence(baseEventDate, recurrenceType, [], note.content)
            : new Date(baseEventDate);

          // If there's no next occurrence or invalid date, don't include the event
          if (!nextOccurrence || !(nextOccurrence instanceof Date)) return;

          // Check if event is today or tomorrow
          const eventDate = new Date(nextOccurrence);
          eventDate.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);

          if (eventDate.getTime() === today.getTime()) {
            hasTodayEvent = true;
          } else if (eventDate.getTime() === tomorrow.getTime()) {
            hasTomorrowEvent = true;
          } else if (!nextEventDays || eventDate < new Date(nextEventDays.date)) {
            const diffTime = eventDate - today;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays > 0) { // Only consider future events
              nextEventDays = { date: eventDate, days: diffDays };
            }
          }

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
              baseEventDate,
              isHidden
            });
          }
        } catch (error) {
          console.error('Error processing event:', error);
        }
      });

      // Set event indicators with animation class for today/tomorrow events
      if (hasTodayEvent && hasTomorrowEvent) {
        setEventIndicators('(Events Today & Tomorrow)');
      } else if (hasTodayEvent) {
        setEventIndicators('(Event Today)');
      } else if (hasTomorrowEvent) {
        setEventIndicators('(Event Tomorrow)');
      } else if (nextEventDays) {
        setEventIndicators(`(Next Event in ${nextEventDays.days} days)`);
      } else {
        setEventIndicators('');
      }

      // Sort events by date
      upcoming.sort((a, b) => a.date - b.date);
      setUpcomingEvents(upcoming);
    };

    calculateUpcomingEvents();
  }, [notes]);

  const toggleEventVisibility = (eventId) => {
    setRevealedEvents(prev => ({
      ...prev,
      [eventId]: !prev[eventId]
    }));
  };

  const getDaysUntilEvent = (eventDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const event = new Date(eventDate);
    event.setHours(0, 0, 0, 0);
    const diffTime = event - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (upcomingEvents.length === 0) return null;

  const renderAnimatedText = (text) => {
    if (!text) return null;
    // Replace spaces with non-breaking spaces to ensure they're preserved in the animation
    const processedText = text.replace(/ /g, '\u00A0');
    return (
      <div className="typewriter-text">
        {processedText.split('').map((char, index) => (
          <span key={index}>{char}</span>
        ))}
      </div>
    );
  };

  return (
    <>
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors duration-150 h-[88px] flex items-center" onClick={() => setShowPopup(true)}>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center">
              <CalendarIcon className="h-6 w-6 text-blue-500" />
              <div className="ml-3">
                <h3 className="text-lg font-semibold text-blue-800">
                  Upcoming Events ({upcomingEvents.length})
                </h3>
                {eventIndicators && (
                  <div className="mt-1">
                    {eventIndicators.includes('Today') || eventIndicators.includes('Tomorrow') 
                      ? renderAnimatedText(eventIndicators)
                      : <span className="text-blue-600">{eventIndicators}</span>
                    }
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAddEventModal(true);
                }}
                className="px-3 py-1 text-blue-600 hover:text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors duration-150"
                title="Add Event"
              >
                <PlusIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
        {showPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800">Upcoming Events</h2>
                <button
                  onClick={() => setShowPopup(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <div className="space-y-4">
                {upcomingEvents.length === 0 ? (
                  <div className="p-4 text-gray-500">
                    No events scheduled for the next 7 days.
                  </div>
                ) : (
                  upcomingEvents.map((event) => {
                    const daysUntil = getDaysUntilEvent(event.date);
                    return (
                      <div 
                        key={event.id}
                        className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-150 flex"
                      >
                        <div className="flex flex-col items-center justify-center min-w-[80px] bg-blue-100 rounded-l-lg -m-4 mr-4">
                          <div className="text-3xl font-bold text-blue-700">
                            {daysUntil}
                          </div>
                          <div className="text-sm text-blue-600 font-medium">
                            {daysUntil === 1 ? 'day' : 'days'}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="text-lg font-medium text-gray-900">
                                  {event.isHidden && !revealedEvents[event.id] ? 'XXXXXXXXX' : event.description}
                                </h4>
                                {event.isHidden && (
                                  <button
                                    onClick={() => toggleEventVisibility(event.id)}
                                    className="text-blue-600 hover:text-blue-800 focus:outline-none"
                                    title={revealedEvents[event.id] ? "Hide description" : "Reveal description"}
                                  >
                                    <EyeIcon className="h-5 w-5" />
                                  </button>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                <ClockIcon className="h-4 w-4" />
                                <span>
                                  {event.date.toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true
                                  })}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                <CalendarIcon className="h-4 w-4" />
                                <span>
                                  {event.date.toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </span>
                                <span className="text-blue-600 font-medium">
                                  ({getAgeInStringFmt(event.date)})
                                </span>
                              </div>
                              {event.isRecurring && event.originalDate && (
                                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                  <ClockIcon className="h-4 w-4" />
                                  <span>
                                    Original date: {event.originalDate.toLocaleDateString('en-US', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    })} ({getAgeInStringFmt(event.originalDate)})
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
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {showAddEventModal && (
        <AddEventModal
          isOpen={showAddEventModal}
          onClose={() => setShowAddEventModal(false)}
          onAdd={(content) => {
            // Add the event meta tag
            const contentWithEvent = `${content}\nmeta::event::`;
            addNewNoteCommon(contentWithEvent);
            setShowAddEventModal(false);
          }}
          notes={notes}
          isAddDeadline={false}
        />
      )}
    </>
  );
};

const UpcomingDeadlinesAlert = ({ notes, expanded: initialExpanded = true, addNote }) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [showPopup, setShowPopup] = useState(false);
  const [deadlines, setDeadlines] = useState([]);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [revealedDeadlines, setRevealedDeadlines] = useState({});
  const [deadlineIndicators, setDeadlineIndicators] = useState('');

  // Add the typewriter animation style
  useEffect(() => {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      @keyframes typewriter {
        0% {
          opacity: 0;
        }
        5% {
          opacity: 1;
        }
        95% {
          opacity: 1;
        }
        100% {
          opacity: 0;
        }
      }
      .typewriter-text {
        display: inline-block;
        font-weight: 600;
        color: rgb(239, 68, 68);
      }
      .typewriter-text span {
        display: inline-block;
        opacity: 0;
        animation: typewriter 3s infinite;
      }
      .typewriter-text span:nth-child(1) { animation-delay: 0s; }
      .typewriter-text span:nth-child(2) { animation-delay: 0.1s; }
      .typewriter-text span:nth-child(3) { animation-delay: 0.2s; }
      .typewriter-text span:nth-child(4) { animation-delay: 0.3s; }
      .typewriter-text span:nth-child(5) { animation-delay: 0.4s; }
      .typewriter-text span:nth-child(6) { animation-delay: 0.5s; }
      .typewriter-text span:nth-child(7) { animation-delay: 0.6s; }
      .typewriter-text span:nth-child(8) { animation-delay: 0.7s; }
      .typewriter-text span:nth-child(9) { animation-delay: 0.8s; }
      .typewriter-text span:nth-child(10) { animation-delay: 0.9s; }
      .typewriter-text span:nth-child(11) { animation-delay: 1s; }
      .typewriter-text span:nth-child(12) { animation-delay: 1.1s; }
      .typewriter-text span:nth-child(13) { animation-delay: 1.2s; }
      .typewriter-text span:nth-child(14) { animation-delay: 1.3s; }
      .typewriter-text span:nth-child(15) { animation-delay: 1.4s; }
      .typewriter-text span:nth-child(16) { animation-delay: 1.5s; }
      .typewriter-text span:nth-child(17) { animation-delay: 1.6s; }
      .typewriter-text span:nth-child(18) { animation-delay: 1.7s; }
      .typewriter-text span:nth-child(19) { animation-delay: 1.8s; }
      .typewriter-text span:nth-child(20) { animation-delay: 1.9s; }
    `;
    document.head.appendChild(styleSheet);
    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  const renderAnimatedText = (text) => {
    if (!text) return null;
    // Replace spaces with non-breaking spaces to ensure they're preserved in the animation
    const processedText = text.replace(/ /g, '\u00A0');
    return (
      <div className="typewriter-text">
        {processedText.split('').map((char, index) => (
          <span key={index}>{char}</span>
        ))}
      </div>
    );
  };

  const getDaysUntilDeadline = (deadlineDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadline = new Date(deadlineDate);
    deadline.setHours(0, 0, 0, 0);
    const diffTime = deadline - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  useEffect(() => {
    const eventNotes = notes.filter(note => note.content.includes('meta::event_deadline'));
    const upcoming = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    let hasTodayDeadline = false;
    let hasTomorrowDeadline = false;
    let nextDeadlineDays = null;

    eventNotes.forEach(note => {
      const lines = note.content.split('\n');
      const description = lines[0].trim();
      const eventDateLine = lines.find(line => line.startsWith('event_date:'));
      const eventDate = eventDateLine ? eventDateLine.replace('event_date:', '').trim() : null;
      const isHidden = note.content.includes('meta::event_hidden');
      
      if (eventDate) {
        const deadlineDate = new Date(eventDate);
        deadlineDate.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Check if deadline is today or tomorrow
        if (deadlineDate.getTime() === today.getTime()) {
          hasTodayDeadline = true;
        } else if (deadlineDate.getTime() === tomorrow.getTime()) {
          hasTomorrowDeadline = true;
        } else if (!nextDeadlineDays || deadlineDate < new Date(nextDeadlineDays.date)) {
          const diffTime = Math.abs(deadlineDate - today);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          nextDeadlineDays = { date: deadlineDate, days: diffDays };
        }

        upcoming.push({
          id: note.id,
          date: new Date(eventDate),
          description: description.replace('event_description:', '').trim(),
          isHidden
        });
      }
    });

    // Set deadline indicators
    if (hasTodayDeadline && hasTomorrowDeadline) {
      setDeadlineIndicators('(Deadlines Today & Tomorrow)');
    } else if (hasTodayDeadline) {
      setDeadlineIndicators('(Deadline Today)');
    } else if (hasTomorrowDeadline) {
      setDeadlineIndicators('(Deadline Tomorrow)');
    } else if (nextDeadlineDays) {
      setDeadlineIndicators(`(Next Deadline in ${nextDeadlineDays.days} days)`);
    } else {
      setDeadlineIndicators('');
    }

    // Sort by date
    upcoming.sort((a, b) => a.date - b.date);
    setDeadlines(upcoming);
  }, [notes]);

  const toggleDeadlineVisibility = (deadlineId) => {
    setRevealedDeadlines(prev => ({
      ...prev,
      [deadlineId]: !prev[deadlineId]
    }));
  };

  if (deadlines.length === 0) return null;

  return (
    <>
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors duration-150 h-[88px] flex items-center" onClick={() => setShowPopup(true)}>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center">
              <ClockIcon className="h-6 w-6 text-blue-500" />
              <div className="ml-3">
                <h3 className="text-lg font-semibold text-blue-800">
                  Upcoming Deadlines ({deadlines.length})
                </h3>
                {deadlineIndicators && (
                  <div className="mt-1">
                    {deadlineIndicators.includes('Today') || deadlineIndicators.includes('Tomorrow') 
                      ? renderAnimatedText(deadlineIndicators)
                      : <span className="text-blue-600">{deadlineIndicators}</span>
                    }
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAddEventModal(true);
                }}
                className="px-3 py-1 text-blue-600 hover:text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors duration-150"
                title="Add Deadline"
              >
                <PlusIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
        {showPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800">Upcoming Deadlines</h2>
                <button
                  onClick={() => setShowPopup(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <div className="space-y-4">
                {deadlines.map((deadline) => {
                  const daysUntil = getDaysUntilDeadline(deadline.date);
                  return (
                    <div 
                      key={deadline.id}
                      className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-150 flex"
                    >
                      <div className="flex flex-col items-center justify-center min-w-[80px] bg-indigo-100 rounded-l-lg -m-4 mr-4">
                        <div className="text-3xl font-bold text-indigo-700">
                          {daysUntil}
                        </div>
                        <div className="text-sm text-indigo-600 font-medium">
                          {daysUntil === 1 ? 'day' : 'days'}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-lg font-medium text-gray-900">
                                {deadline.isHidden && !revealedDeadlines[deadline.id] ? 'XXXXXXXXX' : deadline.description}
                              </h4>
                              {deadline.isHidden && (
                                <button
                                  onClick={() => toggleDeadlineVisibility(deadline.id)}
                                  className="text-indigo-600 hover:text-indigo-800 focus:outline-none"
                                  title={revealedDeadlines[deadline.id] ? "Hide description" : "Reveal description"}
                                >
                                  <EyeIcon className="h-5 w-5" />
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                              <ClockIcon className="h-4 w-4" />
                              <span>
                                {deadline.date.toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                              <CalendarIcon className="h-4 w-4" />
                              <span>
                                {deadline.date.toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </span>
                              <span className="text-indigo-600 font-medium">
                                ({getAgeInStringFmt(deadline.date)})
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {showAddEventModal && (
        <AddEventModal
          isOpen={showAddEventModal}
          onClose={() => setShowAddEventModal(false)}
          onAdd={(content) => {
            // Add the deadline meta tag
            const contentWithDeadline = `${content}\nmeta::event_deadline`;
            addNote(contentWithDeadline);
            setShowAddEventModal(false);
          }}
          notes={notes}
          isAddDeadline={true}
        />
      )}
    </>
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
    if (note.content.includes('meta::reminder')) return false;
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
      <div className="bg-red-50 px-6 py-4 border-b border-red-100 cursor-pointer" onClick={handleTitleClick}>
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
            <button
              onClick={(e) => {
                e.stopPropagation();
                loadNotes('', new Date().toISOString().split('T')[0])
                  .then(data => {
                    if (data && data.notes) {
                      setNotes(data.notes);
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

const RemindersAlert = ({ notes, expanded: initialExpanded = true, setNotes }) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [showAllReminders, setShowAllReminders] = useState(false);
  const [expandedDetails, setExpandedDetails] = useState({});
  const [hoveredNote, setHoveredNote] = useState(null);
  const [showCustomTime, setShowCustomTime] = useState(null);
  const [customHours, setCustomHours] = useState('');
  const [customMinutes, setCustomMinutes] = useState('');

  // Add the vibrating animation style with more vigorous movement
  const bellVibrateStyle = {
    animation: 'vibrate 0.3s ease-in-out infinite',
    transformOrigin: 'top',
  };

  // Add the keyframes for the more vigorous vibrate animation
  useEffect(() => {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = `
      @keyframes vibrate {
        0% { transform: rotate(0deg); }
        20% { transform: rotate(-15deg); }
        40% { transform: rotate(12deg); }
        60% { transform: rotate(-9deg); }
        80% { transform: rotate(6deg); }
        100% { transform: rotate(0deg); }
      }
    `;
    document.head.appendChild(styleSheet);
    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  const reminders = notes.filter(note => {
    if (!note.content.includes('meta::reminder')) return false;
    if (!note.content.includes('meta::watch')) return false;
    return checkNeedsReview(note.id);
  });

  const displayedReminders = showAllReminders ? reminders : reminders.slice(0, 3);
  const hasMoreReminders = reminders.length > 3;

  const handleDismiss = async (note) => {
    try {
      // Update the review time in localStorage to reset the timer
      const reviews = JSON.parse(localStorage.getItem('noteReviews') || '{}');
      reviews[note.id] = new Date().toISOString();
      localStorage.setItem('noteReviews', JSON.stringify(reviews));
      
      // Update the notes list to trigger a re-render
      const updatedNotes = notes.map(n => n);
      setNotes(updatedNotes);

      Alerts.success('Reminder reset');
    } catch (error) {
      console.error('Error resetting reminder:', error);
      Alerts.error('Failed to reset reminder');
    }
  };

  const handleSetCadence = async (note, hours, minutes = 0) => {
    try {
      // Remove existing cadence tag if it exists
      let updatedContent = note.content
        .split('\n')
        .filter(line => !line.includes('meta::cadence::'))
        .join('\n');

      // Add new cadence tag
      updatedContent = `${updatedContent}\nmeta::cadence::${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;

      // Update the note
      await updateNoteById(note.id, updatedContent);
      
      // Update the notes list immediately
      const updatedNotes = notes.map(n => 
        n.id === note.id ? { ...n, content: updatedContent } : n
      );
      setNotes(updatedNotes);
      
      // Update the review time in localStorage
      const reviews = JSON.parse(localStorage.getItem('noteReviews') || '{}');
      reviews[note.id] = new Date().toISOString();
      localStorage.setItem('noteReviews', JSON.stringify(reviews));

      // Update the cadence in localStorage
      const cadences = JSON.parse(localStorage.getItem('noteReviewCadence') || '{}');
      cadences[note.id] = { hours, minutes };
      localStorage.setItem('noteReviewCadence', JSON.stringify(cadences));

      Alerts.success(`Reminder cadence set to ${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`);
      setShowCustomTime(null);
      setCustomHours('');
      setCustomMinutes('');
    } catch (error) {
      console.error('Error setting cadence:', error);
      Alerts.error('Failed to set reminder cadence');
    }
  };

  const handleCustomTimeSubmit = (note) => {
    const hours = parseInt(customHours) || 0;
    const minutes = parseInt(customMinutes) || 0;
    
    if (hours === 0 && minutes === 0) {
      Alerts.error('Please enter a valid time');
      return;
    }
    
    handleSetCadence(note, hours, minutes);
  };

  const toggleDetails = (noteId) => {
    setExpandedDetails(prev => ({
      ...prev,
      [noteId]: !prev[noteId]
    }));
  };

  const formatReminderContent = (content) => {
    const lines = content.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('meta::'));

    // If there's only one line and it's a URL
    if (lines.length === 1) {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urlMatch = lines[0].match(urlRegex);
      if (urlMatch) {
        const url = urlMatch[0];
        const markdownMatch = lines[0].match(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/);
        
        return (
          <div className="text-lg font-medium text-purple-900">
            <a
              href={markdownMatch ? markdownMatch[2] : url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 inline-flex items-center text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1">
                <path fillRule="evenodd" d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M11.603 7.963a.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 105.656 5.656l3-3a4 4 0 00-.225-5.865z" clipRule="evenodd" />
              </svg>
              Link
            </a>
          </div>
        );
      }
    }

    const firstLine = lines[0] || '';
    const secondLine = lines[1] || '';

    // Function to check if a line contains a URL
    const hasUrl = (line) => {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      return urlRegex.test(line);
    };

    // Function to format a URL line
    const formatUrlLine = (line) => {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urlMatch = line.match(urlRegex);
      if (!urlMatch) return line;

      const url = urlMatch[0];
      const markdownMatch = line.match(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/);
      
      return (
        <a
          href={markdownMatch ? markdownMatch[2] : url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 inline-flex items-center text-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 mr-1">
            <path fillRule="evenodd" d="M12.232 4.232a2.5 2.5 0 013.536 3.536l-1.225 1.224a.75.75 0 001.061 1.06l1.224-1.224a4 4 0 00-5.656-5.656l-3 3a4 4 0 00.225 5.865.75.75 0 00.977-1.138 2.5 2.5 0 01-.142-3.667l3-3z" clipRule="evenodd" />
            <path fillRule="evenodd" d="M11.603 7.963a.75.75 0 00-.977 1.138 2.5 2.5 0 01.142 3.667l-3 3a2.5 2.5 0 01-3.536-3.536l1.225-1.224a.75.75 0 00-1.061-1.06l-1.224 1.224a4 4 0 105.656 5.656l3-3a4 4 0 00-.225-5.865z" clipRule="evenodd" />
          </svg>
          Link
        </a>
      );
    };

    // If first line has URL
    if (hasUrl(firstLine)) {
      return (
        <div className="text-lg font-medium text-purple-900">
          {secondLine && <span className="mr-2">{secondLine}</span>}
          {formatUrlLine(firstLine)}
        </div>
      );
    }
    
    // If second line has URL
    if (hasUrl(secondLine)) {
      return (
        <div className="text-lg font-medium text-purple-900">
          <span className="mr-2">{firstLine}</span>
          {formatUrlLine(secondLine)}
        </div>
      );
    }

    // If no URL in first two lines, return first line
    return <div className="text-lg font-medium text-purple-900">{firstLine}</div>;
  };

  if (reminders.length === 0) return null;

  return (
    <div className="space-y-4 w-full">
      {displayedReminders.map((note, index) => {
        const reviews = JSON.parse(localStorage.getItem('noteReviews') || '{}');
        const reviewTime = reviews[note.id];
        const cadence = getNoteCadence(note.id);
        const isDetailsExpanded = expandedDetails[note.id];
        const isHovered = hoveredNote === note.id;
        const isCustomTimeOpen = showCustomTime === note.id;

        return (
          <div 
            key={note.id} 
            className="bg-white shadow-lg rounded-lg overflow-hidden hover:shadow-xl transition-all duration-200"
            onMouseEnter={() => setHoveredNote(note.id)}
            onMouseLeave={() => setHoveredNote(null)}
          >
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleDetails(note.id)}
                    className="text-purple-700 hover:text-purple-900 focus:outline-none"
                  >
                    {isDetailsExpanded ? (
                      <ChevronUpIcon className="h-5 w-5" />
                    ) : (
                      <ChevronDownIcon className="h-5 w-5" />
                    )}
                  </button>
                  <BellIcon className="h-5 w-5 text-purple-700" style={bellVibrateStyle} />
                  <div>
                    {formatReminderContent(note.content)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDismiss(note)}
                    className="px-3 py-1 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-150"
                    title="Dismiss"
                  >
                    <CheckIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
              {isDetailsExpanded && (
                <div className="mt-4 pl-8 space-y-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <ClockIcon className="h-4 w-4" />
                    <span>Last reviewed: {reviewTime ? formatTimeElapsed(reviewTime) : 'Never'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <ClockIcon className="h-4 w-4" />
                    <span>Review cadence: {cadence.hours}h {cadence.minutes}m</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleSetCadence(note, 1)}
                      className="px-3 py-1 text-sm font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
                    >
                      1h
                    </button>
                    <button
                      onClick={() => handleSetCadence(note, 2)}
                      className="px-3 py-1 text-sm font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
                    >
                      2h
                    </button>
                    <button
                      onClick={() => handleSetCadence(note, 4)}
                      className="px-3 py-1 text-sm font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
                    >
                      4h
                    </button>
                    <button
                      onClick={() => handleSetCadence(note, 6)}
                      className="px-3 py-1 text-sm font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
                    >
                      6h
                    </button>
                    <button
                      onClick={() => handleSetCadence(note, 12)}
                      className="px-3 py-1 text-sm font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
                    >
                      12h
                    </button>
                    <button
                      onClick={() => handleSetCadence(note, 24)}
                      className="px-3 py-1 text-sm font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
                    >
                      24h
                    </button>
                    <button
                      onClick={() => handleSetCadence(note, 72)}
                      className="px-3 py-1 text-sm font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
                    >
                      3d
                    </button>
                    <button
                      onClick={() => handleSetCadence(note, 168)}
                      className="px-3 py-1 text-sm font-medium text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
                    >
                      7d
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={customHours}
                      onChange={(e) => setCustomHours(e.target.value)}
                      placeholder="Hours"
                      className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      min="0"
                    />
                    <input
                      type="number"
                      value={customMinutes}
                      onChange={(e) => setCustomMinutes(e.target.value)}
                      placeholder="Minutes"
                      className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      min="0"
                      max="59"
                    />
                    <button
                      onClick={() => handleCustomTimeSubmit(note)}
                      className="px-3 py-1 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors duration-150"
                    >
                      Set Custom
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
      {hasMoreReminders && (
        <div className="flex justify-center">
          <button
            onClick={() => setShowAllReminders(!showAllReminders)}
            className="px-4 py-2 text-sm font-medium text-purple-600 hover:text-purple-800 focus:outline-none bg-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {showAllReminders ? 'Show Less' : `Show ${reminders.length - 3} More`}
          </button>
        </div>
      )}
    </div>
  );
};

const BackupAlert = ({ notes, expanded: initialExpanded = true }) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [isBackingUp, setIsBackingUp] = useState(false);

  const backupNotes = notes.filter(note => note.content.includes('meta::notes_backup_date::'));
  if (backupNotes.length === 0) return null;

  // Find the most recent backup date
  const lastBackupDate = backupNotes.reduce((latest, note) => {
    const backupDateMatch = note.content.match(/meta::notes_backup_date::([^T]+)T/);
    if (!backupDateMatch) return latest;
    console.log('backupDateMatch',backupDateMatch[1]);
    const backupDate = new Date(backupDateMatch[1]);
    return !latest || backupDate > latest ? backupDate : latest;
  }, null);

  if (!lastBackupDate) return null;

  const now = new Date();
  const diffDays = getDiffInDays(now, lastBackupDate);
  if (diffDays <= 1) return null;

  const startBackup = async () => {
    setIsBackingUp(true);
    try {
      await exportAllNotes();
    } catch (error) {
      console.error('Backup failed:', error);
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden">
      <div className="bg-red-50 px-6 py-4 border-b border-red-100 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <ExclamationCircleIcon className="h-6 w-6 text-red-500" />
            <h3 className="ml-3 text-base font-semibold text-red-800">
              Backup Overdue ({diffDays} days)
            </h3>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="text-red-600 hover:text-red-700 focus:outline-none"
            aria-label={isExpanded ? "Collapse backup alert" : "Expand backup alert"}
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
        <div className="p-6">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <CalendarIcon className="h-4 w-4" />
            <span>Last backup: {lastBackupDate.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-red-600 mb-4">
            <ExclamationCircleIcon className="h-4 w-4" />
            <span>Backup is overdue by {diffDays} days</span>
          </div>
          {isBackingUp ? (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <ArrowPathIcon className="h-4 w-4 animate-spin" />
              <span>Backing up...</span>
            </div>
          ) : (
            <button
              onClick={startBackup}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150"
            >
              Start Backup
            </button>
          )}
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
      <div className="space-y-4 w-full">
        <BackupAlert notes={notes} expanded={true} />
        <RemindersAlert notes={notes} expanded={true} setNotes={setNotes} />
        <div className="flex gap-4">
          <div className="w-1/2">
            <UpcomingDeadlinesAlert 
              notes={notes} 
              expanded={true} 
              addNote={addNewNoteCommon}
            />
          </div>
          <div className="w-1/2">
            <UpcomingEventsAlert notes={notes} expanded={false} />
          </div>
        </div>
        <MeetingManager 
          allNotes={notes}
          setNotes={setNotes}
          searchQuery=''
          currentDate=''
        />
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
            <ReviewOverdueAlert notes={notes} expanded={true} setNotes={setNotes} />
          </div>
          <DeadlinePassedAlert notes={notes} expanded={true} setNotes={setNotes} />
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