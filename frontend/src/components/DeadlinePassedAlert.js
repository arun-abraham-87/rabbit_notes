import React, { useState } from 'react';
import { updateNoteById } from '../utils/ApiUtils';
import { ExclamationCircleIcon, ChevronUpIcon, ChevronDownIcon, CalendarIcon, ClockIcon, CheckIcon, PencilIcon, CodeBracketIcon, XMarkIcon } from '@heroicons/react/24/solid';
import NoteView from './NoteView';
import NoteEditor from './NoteEditor';
import { Alerts } from './Alerts';

function getDateInDDMMYYYYFormat(date) {
  if (!date) return '';
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

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

export default DeadlinePassedAlert; 