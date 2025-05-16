import React, { useState, useEffect } from 'react';
import { updateNoteById } from '../utils/ApiUtils';
import { 
  FireIcon, 
  PlusIcon, 
  CheckIcon, 
  ArrowTrendingDownIcon, 
  PencilIcon, 
  CodeBracketIcon, 
  EyeIcon, 
  XMarkIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';
import NoteView from './NoteView';
import NoteEditor from './NoteEditor';
import { Alerts } from './Alerts';
import { addCadenceLineToNote } from '../utils/CadenceHelpUtils';
import { getAgeInStringFmt } from '../utils/DateUtils';
import moment from 'moment';
import { parseToMoment } from '../utils/DateUtils';

const CriticalTodosAlert = ({ notes, expanded: initialExpanded = true, setNotes }) => {
  const [showRawNote, setShowRawNote] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [showPriorityPopup, setShowPriorityPopup] = useState(false);
  const [noteToUpdate, setNoteToUpdate] = useState(null);
  const [expandedNotes, setExpandedNotes] = useState({});
  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [activeTab, setActiveTab] = useState('critical');

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

  const getTodosByPriority = (priority) => {
    return notes.filter(note => {
      // First check if it's a todo
      if (!note.content.includes('meta::todo::')) return false;
      // Exclude completed todos
      if (note.content.includes('meta::todo_completed')) return false;
      
      const content = note.content.toLowerCase();
      const lines = content.split('\n').map(line => line.trim());
      
      // First determine the note's priority
      let notePriority = 'low'; // default priority
      
      if (lines.some(line => line === 'meta::critical')) {
        notePriority = 'critical';
      } else if (lines.some(line => line === 'meta::high')) {
        notePriority = 'high';
      } else if (lines.some(line => line === 'meta::medium')) {
        notePriority = 'medium';
      } else{
        notePriority = 'low';
      }
      
      // Return true if the note's priority matches the requested priority
      return notePriority === priority;
    });
  };

  const todos = getTodosByPriority(activeTab);

  if (notes.length === 0) return null;

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
      await addCadenceLineToNote(note,{}, true);
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

  const getAgeInStringFmt = (dateStrOrDateObj) => {
    const momentObj = parseToMoment(dateStrOrDateObj);
    return momentObj ? momentObj.fromNow() : 'Invalid date';
  }

  const isOlderThanTwoDays = (dateStrOrDateObj) => {
    const momentObj = parseToMoment(dateStrOrDateObj);
    if (!momentObj) return false;
    const now = moment();
    return now.diff(momentObj, 'days') > 2;
  };

  return (
    <div className="w-1/2 pr-2">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden h-full">
        <div className="bg-red-50 px-6 py-4 border-b border-red-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <ClipboardDocumentListIcon className="h-6 w-6 text-red-500" />
              <h3 className="ml-3 text-base font-semibold text-red-800">
                To Do's
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

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex w-full">
            {[
              { 
                id: 'critical', 
                label: 'Critical', 
                bgColor: 'bg-red-700', 
                textColor: 'text-white',
                icon: <FireIcon className="h-5 w-5 mr-1" />
              },
              { 
                id: 'high', 
                label: 'High', 
                bgColor: 'bg-red-300', 
                textColor: 'text-red-900',
                icon: <ExclamationTriangleIcon className="h-5 w-5 mr-1" />
              },
              { 
                id: 'medium', 
                label: 'Medium', 
                bgColor: 'bg-yellow-300', 
                textColor: 'text-yellow-900',
                icon: <ClockIcon className="h-5 w-5 mr-1" />
              },
              { 
                id: 'low', 
                label: 'Low', 
                bgColor: 'bg-green-300', 
                textColor: 'text-green-900',
                icon: <ArrowDownIcon className="h-5 w-5 mr-1" />
              }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-4 py-2 text-sm font-medium transition-colors duration-150 flex items-center justify-center ${
                  activeTab === tab.id
                    ? `${tab.bgColor} ${tab.textColor}`
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="divide-y divide-gray-100">
          {todos.map((todo, index) => {
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
                    <div className="text-sm text-gray-500 mt-2 flex items-center">
                      <span>Open for: {getAgeInStringFmt(todo.created_datetime)}</span>
                      {isOlderThanTwoDays(todo.created_datetime) && (
                        <FireIcon className="h-4 w-4 text-red-500 burning-icon ml-2" />
                      )}
                    </div>
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

export default CriticalTodosAlert; 