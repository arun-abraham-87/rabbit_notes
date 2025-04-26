// frontend/src/components/NoteFooter.js
import React, { useState, useEffect, useRef } from 'react';
import {
  XCircleIcon,
  CheckCircleIcon,
  PencilIcon,
  TrashIcon,
  TagIcon,
  CalendarIcon,
  BookmarkIcon,
  LinkIcon,
  EyeIcon,
  ClockIcon,
  FlagIcon,
  ChevronDownIcon,
  DocumentTextIcon,
  ClipboardIcon,
  ArrowsPointingInIcon,
  CodeBracketIcon,
} from '@heroicons/react/24/solid';
import { formatDate } from '../utils/DateUtils';
import { toast } from 'react-toastify';

const NoteFooter = ({
  note,
  showCreatedDate,
  setShowEndDatePickerForNoteId,
  handleDelete,
  setPopupNoteText,
  setLinkingNoteId,
  setLinkSearchTerm,
  setLinkPopupVisible,
  selectedNotes,
  toggleNoteSelection,
  updateNote,
}) => {
  const [showPinPopup, setShowPinPopup] = useState(false);
  const [selectedPinLines, setSelectedPinLines] = useState([]);
  const [showRawNote, setShowRawNote] = useState(false);
  const pinPopupRef = useRef(null);
  const rawNotePopupRef = useRef(null);
  const lines = note.content.split('\n');
  const isMergeMode = selectedNotes.length > 0;

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Handle Pin popup
      if (pinPopupRef.current && !pinPopupRef.current.contains(event.target)) {
        setShowPinPopup(false);
      }
      // Handle Raw Note popup
      if (rawNotePopupRef.current && !rawNotePopupRef.current.contains(event.target)) {
        setShowRawNote(false);
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        setShowPinPopup(false);
        setShowRawNote(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, []);

  const toggleLineSelection = (lineNum) => {
    setSelectedPinLines(prev =>
      prev.includes(lineNum)
        ? prev.filter(l => l !== lineNum)
        : [...prev, lineNum]
    );
  };

  const handleAction = (action) => {
    const ts = new Date().toISOString();
    const lines = note.content.split('\n');
    const hasAction = lines.some(l => l.trim().startsWith(`meta::${action}::`));

    if (hasAction) {
      // Remove the action if it exists
      const without = lines
        .filter(l => !l.trim().startsWith(`meta::${action}::`))
        .join('\n')
        .trim();
      updateNote(note.id, without);
      toast.success(`Removed ${action} tag`);
    } else {
      // Add the action if it doesn't exist
      const without = lines
        .filter(l => !l.trim().startsWith(`meta::${action}::`))
        .join('\n')
        .trim();
      updateNote(note.id, `${without}\nmeta::${action}::${ts}`);
      toast.success(`Added ${action} tag`);
    }
  };

  const handleTodoAction = (priority = null) => {
    const timestamp = new Date().toISOString();
    const lines = note.content.split('\n');
    const isTodo = lines.some(l => l.trim().startsWith('meta::todo::'));
    const currentPriority = priority ? 
      lines.some(l => l.trim().startsWith(`meta::${priority}`)) : false;

    // Filter out all todo-related meta tags
    const contentWithoutTodoMeta = lines
      .filter(line => 
        !line.trim().startsWith('meta::todo::') &&
        !line.trim().startsWith('meta::low') &&
        !line.trim().startsWith('meta::medium') &&
        !line.trim().startsWith('meta::high')
      )
      .join('\n')
      .trim();

    if (!priority) {
      // Toggling todo status
      if (isTodo) {
        // Remove todo status
        updateNote(note.id, contentWithoutTodoMeta);
        toast.success('Removed todo status');
      } else {
        // Add todo status
        updateNote(note.id, `${contentWithoutTodoMeta}\nmeta::todo::${timestamp}`);
        toast.success('Marked as todo');
      }
    } else {
      if (!isTodo) {
        // If not a todo yet, make it a todo with the selected priority
        updateNote(note.id, `${contentWithoutTodoMeta}\nmeta::todo::${timestamp}\nmeta::${priority}`);
        toast.success(`Marked as todo with ${priority} priority`);
      } else if (currentPriority) {
        // If already has this priority, remove only the priority
        updateNote(note.id, `${contentWithoutTodoMeta}\nmeta::todo::${timestamp}`);
        toast.success(`Removed ${priority} priority`);
      } else {
        // Change to new priority
        updateNote(note.id, `${contentWithoutTodoMeta}\nmeta::todo::${timestamp}\nmeta::${priority}`);
        toast.success(`Changed to ${priority} priority`);
      }
    }
  };

  const isTodo = note.content.toLowerCase().includes('meta::todo::');
  const currentPriority = isTodo ? 
    note.content.toLowerCase().includes('meta::low') ? 'low' :
    note.content.toLowerCase().includes('meta::medium') ? 'medium' :
    note.content.toLowerCase().includes('meta::high') ? 'high' : null : null;

  return (
    <div className="flex items-center justify-between px-4 py-2 text-xs text-gray-500">
      <div className="flex items-center space-x-2">
        {/* Left side - Created date */}
        {showCreatedDate && (
          <span className="text-gray-400">
            Created: {formatDate(note.created_datetime)}
          </span>
        )}
      </div>

      <div className="flex items-center">
        {/* Todo Group */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => handleTodoAction()}
            className={`p-1 hover:bg-gray-100 rounded-full transition-colors ${
              isTodo ? 'bg-blue-100' : ''
            }`}
            title={isTodo ? 'Remove Todo Status' : 'Mark as Todo'}
          >
            <ClockIcon className={`h-4 w-4 ${isTodo ? 'text-blue-500' : 'text-gray-500'}`} />
          </button>

          {isTodo && (
            <>
              <button
                onClick={() => handleTodoAction('low')}
                className={`p-1 hover:bg-gray-100 rounded-full transition-colors ${
                  currentPriority === 'low' ? 'bg-blue-100' : ''
                }`}
                title="Low Priority"
              >
                <FlagIcon className={`h-4 w-4 ${currentPriority === 'low' ? 'text-blue-500' : 'text-blue-400'}`} />
              </button>

              <button
                onClick={() => handleTodoAction('medium')}
                className={`p-1 hover:bg-gray-100 rounded-full transition-colors ${
                  currentPriority === 'medium' ? 'bg-yellow-100' : ''
                }`}
                title="Medium Priority"
              >
                <FlagIcon className={`h-4 w-4 ${currentPriority === 'medium' ? 'text-yellow-500' : 'text-yellow-400'}`} />
              </button>

              <button
                onClick={() => handleTodoAction('high')}
                className={`p-1 hover:bg-gray-100 rounded-full transition-colors ${
                  currentPriority === 'high' ? 'bg-red-100' : ''
                }`}
                title="High Priority"
              >
                <FlagIcon className={`h-4 w-4 ${currentPriority === 'high' ? 'text-red-500' : 'text-red-400'}`} />
              </button>
            </>
          )}
        </div>

        {/* Separator */}
        <div className="h-4 w-px bg-gray-200 mx-2"></div>

        {/* Organization Group */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => handleAction('bookmark')}
            className={`p-1 hover:bg-gray-100 rounded-full transition-colors ${
              note.content.includes('meta::bookmark::') ? 'bg-yellow-100' : ''
            }`}
            title="Bookmark"
          >
            <BookmarkIcon className="h-4 w-4 text-yellow-500" />
          </button>

          <button
            onClick={() => handleAction('abbreviation')}
            className={`p-1 hover:bg-gray-100 rounded-full transition-colors ${
              note.content.includes('meta::abbreviation::') ? 'bg-purple-100' : ''
            }`}
            title="Mark as Abbreviation"
          >
            <TagIcon className="h-4 w-4 text-purple-500" />
          </button>

          <button
            onClick={() => handleAction('watch')}
            className={`p-1 hover:bg-gray-100 rounded-full transition-colors ${
              note.content.includes('meta::watch::') ? 'bg-green-100' : ''
            }`}
            title="Watch"
          >
            <EyeIcon className="h-4 w-4 text-green-500" />
          </button>
        </div>

        {/* Separator */}
        <div className="h-4 w-px bg-gray-200 mx-2"></div>

        {/* Date and Link Group */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setShowEndDatePickerForNoteId(note.id)}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            title="Set End Date"
          >
            <CalendarIcon className="h-4 w-4 text-gray-500" />
          </button>

          <button
            onClick={() => {
              setLinkingNoteId(note.id);
              setLinkSearchTerm('');
              setLinkPopupVisible(true);
            }}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            title="Link Note"
          >
            <LinkIcon className="h-4 w-4 text-gray-500" />
          </button>

          <button
            onClick={() => toggleNoteSelection(note.id)}
            className={`p-1 hover:bg-gray-100 rounded-full transition-colors ${
              selectedNotes.includes(note.id) ? 'bg-blue-100' : ''
            }`}
            title={selectedNotes.length === 0 ? 'Start Merge' : selectedNotes.includes(note.id) ? 'Unselect for Merge' : 'Select for Merge'}
          >
            <ArrowsPointingInIcon className={`h-4 w-4 ${selectedNotes.includes(note.id) ? 'text-blue-500' : 'text-gray-500'}`} />
          </button>
        </div>

        {/* Separator */}
        <div className="h-4 w-px bg-gray-200 mx-2"></div>

        {/* View and Copy Group */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => {
              navigator.clipboard.writeText(note.content);
              toast.success('Note content copied to clipboard!');
            }}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            title="Copy to Clipboard"
          >
            <ClipboardIcon className="h-4 w-4 text-gray-500" />
          </button>

          <button
            onClick={() => setShowRawNote(!showRawNote)}
            className={`p-1 hover:bg-gray-100 rounded-full transition-colors ${
              showRawNote ? 'bg-gray-100' : ''
            }`}
            title="View Raw Note"
          >
            <CodeBracketIcon className="h-4 w-4 text-gray-500" />
          </button>

          <button
            onClick={() => setShowPinPopup(!showPinPopup)}
            className={`p-1 hover:bg-gray-100 rounded-full transition-colors ${
              showPinPopup ? 'bg-gray-100' : ''
            }`}
            title="Pin Lines"
          >
            <ChevronDownIcon className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        {/* Separator */}
        <div className="h-4 w-px bg-gray-200 mx-2"></div>

        {/* Edit/Delete Group */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setPopupNoteText(note.id)}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            title="Edit Note"
          >
            <PencilIcon className="h-4 w-4 text-gray-500" />
          </button>

          <button
            onClick={() => handleDelete(note.id)}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            title="Delete Note"
          >
            <TrashIcon className="h-4 w-4 text-red-500" />
          </button>
        </div>
      </div>

      {showRawNote && (
        <div
          ref={rawNotePopupRef}
          className="absolute right-0 mt-1 w-96 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-10"
        >
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Raw Note Content</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(note.content);
                toast.success('Raw note content copied to clipboard!');
              }}
              className="flex items-center text-xs px-2 py-1 text-gray-600 hover:bg-gray-100 rounded transition-colors"
            >
              <ClipboardIcon className="h-3.5 w-3.5 mr-1" />
              Copy
            </button>
          </div>
          <pre className="whitespace-pre-wrap text-xs">{note.content}</pre>
        </div>
      )}

      {showPinPopup && (
        <div
          ref={pinPopupRef}
          className="absolute right-0 mt-1 w-96 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-10"
        >
          <div className="space-y-2">
            {lines.map((line, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedPinLines.includes(index)}
                  onChange={() => toggleLineSelection(index)}
                  className="rounded text-blue-500"
                />
                <span className="text-xs">{line}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NoteFooter;