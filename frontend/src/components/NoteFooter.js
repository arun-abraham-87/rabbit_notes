// frontend/src/components/NoteFooter.js
import React, { useState, useEffect, useRef } from 'react';
import {
  XCircleIcon,
  CheckCircleIcon,
  PencilIcon,
  TrashIcon,
  TagIcon,
  BookmarkIcon,
  LinkIcon,
  EyeIcon,
  ClockIcon,
  FlagIcon,
  ChevronDownIcon,
  ClipboardIcon,
  ArrowsPointingInIcon,
  CodeBracketIcon,
} from '@heroicons/react/24/solid';
import { formatDate } from '../utils/DateUtils';
import { toast } from 'react-toastify';

const NoteFooter = ({
  note,
  showCreatedDate,
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

  const handlePinLines = () => {
    if (selectedPinLines.length === 0) {
      toast.error('Please select at least one line to pin');
      return;
    }

    const timestamp = new Date().toISOString();
    const lines = note.content.split('\n');
    
    // Remove any existing pin metadata
    const contentWithoutPinMeta = lines
      .filter(line => !line.trim().startsWith('meta::pin::'))
      .join('\n');

    // Convert 0-based indices to 1-based line numbers
    const lineNumbers = selectedPinLines.map(index => index + 1);

    // Create pin metadata with 1-based line numbers
    const pinMeta = `meta::pin::${lineNumbers.join(',')}`; 

    // Combine content with new pin metadata
    const newContent = `${contentWithoutPinMeta}\n${pinMeta}`;
    
    updateNote(note.id, newContent);
    setSelectedPinLines([]);
    setShowPinPopup(false);
    toast.success('Lines marked for pinning');
  };

  // Add this function to check if a line is pinned (using 1-based line numbers)
  const isPinned = (index) => {
    const pinMetaLine = note.content
      .split('\n')
      .find(line => line.trim().startsWith('meta::pin::'));
    
    if (!pinMetaLine) return false;
    
    const pinnedLineNumbers = pinMetaLine
      .replace('meta::pin::', '')
      .split(',')
      .map(num => parseInt(num.trim()));
    
    // Convert 0-based index to 1-based line number for comparison
    return pinnedLineNumbers.includes(index + 1);
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

      <div className="flex items-center bg-gray-50 rounded-lg">
        {/* Todo Group */}
        <div className="flex items-center space-x-1 px-2 py-1">
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
        <div className="h-6 w-px bg-gray-200 mx-px"></div>

        {/* Organization Group */}
        <div className="flex items-center space-x-1 px-2 py-1 bg-white">
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
        <div className="h-6 w-px bg-gray-200 mx-px"></div>

        {/* Link Group */}
        <div className="flex items-center space-x-1 px-2 py-1 bg-gray-50">
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
        <div className="h-6 w-px bg-gray-200 mx-px"></div>

        {/* View and Copy Group */}
        <div className="flex items-center space-x-1 px-2 py-1 bg-white">
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
        <div className="h-6 w-px bg-gray-200 mx-px"></div>

        {/* Edit/Delete Group */}
        <div className="flex items-center space-x-1 px-2 py-1 bg-gray-50">
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
          className="absolute right-0 mt-1 w-96 max-h-[400px] bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-10 overflow-hidden"
        >
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium text-gray-700">Select lines to pin to top</span>
              <button
                onClick={handlePinLines}
                className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
              >
                Pin Selected
              </button>
            </div>
            <div className="space-y-2 overflow-y-auto max-h-[300px] pr-2">
              {lines.map((line, index) => (
                <div 
                  key={index} 
                  className={`flex items-start space-x-2 py-1 ${
                    isPinned(index) ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start space-x-2 min-w-[40px]">
                    <input
                      type="checkbox"
                      checked={selectedPinLines.includes(index)}
                      onChange={() => toggleLineSelection(index)}
                      className="mt-1 rounded text-blue-500"
                    />
                    <span className="text-xs text-gray-400 select-none">
                      {index + 1}
                    </span>
                  </div>
                  <span className="text-xs text-gray-700 break-words whitespace-pre-wrap flex-1">
                    {line || <em className="text-gray-400">Empty line</em>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoteFooter;