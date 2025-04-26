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
  EllipsisHorizontalIcon,
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
  const [showMoreActions, setShowMoreActions] = useState(false);
  const [showRawNote, setShowRawNote] = useState(false);
  const moreActionsRef = useRef(null);
  const pinPopupRef = useRef(null);
  const rawNotePopupRef = useRef(null);
  const lines = note.content.split('\n');
  const isMergeMode = selectedNotes.length > 0;

  useEffect(() => {
    const handleClickOutside = (event) => {
      // Handle More Actions dropdown
      if (moreActionsRef.current && !moreActionsRef.current.contains(event.target)) {
        setShowMoreActions(false);
      }
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
        setShowMoreActions(false);
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
    const without = note.content
      .split('\n')
      .filter(l => !l.trim().startsWith(`meta::${action}::`))
      .join('\n')
      .trim();
    updateNote(note.id, `${without}\nmeta::${action}::${ts}`);
  };

  const handleTodoAction = (priority) => {
    const timestamp = new Date().toISOString();
    const contentWithoutOldTodoMeta = note.content
      .split('\n')
      .filter(line => 
        !line.trim().startsWith('meta::todo::') &&
        !line.trim().startsWith('meta::low') &&
        !line.trim().startsWith('meta::medium') &&
        !line.trim().startsWith('meta::high')
      )
      .join('\n')
      .trim();
    const newContent = `${contentWithoutOldTodoMeta}\nmeta::todo::${timestamp}\nmeta::${priority}`;
    updateNote(note.id, newContent);
  };

  const isTodo = note.content.toLowerCase().includes('meta::todo');
  const isWatched = note.content.toLowerCase().includes('#watch');

  return (
    <div className="flex items-center justify-between px-4 py-2 text-xs text-gray-500">
      <div className="flex items-center space-x-2">
        {/* Left side - only created date */}
        {showCreatedDate && (
          <span className="text-gray-400">
            Created: {formatDate(note.created_datetime)}
          </span>
        )}
      </div>

      <div className="flex items-center space-x-2">
        {/* Right side icons */}
        <button
          onClick={() => setShowEndDatePickerForNoteId(note.id)}
          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <CalendarIcon className="h-4 w-4" />
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
          <LinkIcon className="h-4 w-4" />
        </button>

        <button
          onClick={() => toggleNoteSelection(note.id)}
          className={`p-1 hover:bg-gray-100 rounded-full transition-colors ${
            selectedNotes.includes(note.id) ? 'bg-gray-100' : ''
          }`}
          title={selectedNotes.length === 0 ? 'Start Merge' : 'Select for Merge'}
        >
          <DocumentTextIcon className="h-4 w-4" />
        </button>

        <button
          onClick={() => setPopupNoteText(note.id)}
          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <PencilIcon className="h-4 w-4" />
        </button>

        <button
          onClick={() => handleDelete(note.id)}
          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <TrashIcon className="h-4 w-4" />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowMoreActions(!showMoreActions)}
            ref={moreActionsRef}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <EllipsisHorizontalIcon className="h-4 w-4" />
          </button>

          {showMoreActions && (
            <div
              ref={moreActionsRef}
              className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10"
            >
              {/* Organization actions */}
              <button
                onClick={() => handleAction('bookmark')}
                className="flex items-center w-full px-3 py-1.5 text-left hover:bg-gray-50"
              >
                <BookmarkIcon className="h-3.5 w-3.5 mr-2 text-yellow-500" />
                <span>Bookmark</span>
              </button>
              
              <button
                onClick={() => handleAction('abbreviation')}
                className="flex items-center w-full px-3 py-1.5 text-left hover:bg-gray-50"
              >
                <TagIcon className="h-3.5 w-3.5 mr-2 text-purple-500" />
                <span>Mark as Abbreviation</span>
              </button>

              <button
                onClick={() => handleAction('watch')}
                className="flex items-center w-full px-3 py-1.5 text-left hover:bg-gray-50"
              >
                <EyeIcon className="h-3.5 w-3.5 mr-2 text-green-500" />
                <span>Watch</span>
              </button>

              {/* Todo actions */}
              <div className="border-t border-gray-100 my-1"></div>
              <button
                onClick={() => handleTodoAction('low')}
                className="flex items-center w-full px-3 py-1.5 text-left hover:bg-gray-50"
              >
                <FlagIcon className="h-3.5 w-3.5 mr-2 text-blue-400" />
                <span>Low Priority Todo</span>
              </button>

              <button
                onClick={() => handleTodoAction('medium')}
                className="flex items-center w-full px-3 py-1.5 text-left hover:bg-gray-50"
              >
                <FlagIcon className="h-3.5 w-3.5 mr-2 text-yellow-500" />
                <span>Medium Priority Todo</span>
              </button>

              <button
                onClick={() => handleTodoAction('high')}
                className="flex items-center w-full px-3 py-1.5 text-left hover:bg-gray-50"
              >
                <FlagIcon className="h-3.5 w-3.5 mr-2 text-red-500" />
                <span>High Priority Todo</span>
              </button>

              {/* View actions */}
              <div className="border-t border-gray-100 my-1"></div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(note.content);
                  toast.success('Note content copied to clipboard!');
                }}
                className="flex items-center w-full px-3 py-1.5 text-left hover:bg-gray-50"
              >
                <ClipboardIcon className="h-3.5 w-3.5 mr-2 text-gray-500" />
                <span>Copy to Clipboard</span>
              </button>

              <button
                onClick={() => setShowRawNote(!showRawNote)}
                className="flex items-center w-full px-3 py-1.5 text-left hover:bg-gray-50"
              >
                <DocumentTextIcon className="h-3.5 w-3.5 mr-2 text-gray-500" />
                <span>View Raw Note</span>
              </button>

              <button
                onClick={() => setShowPinPopup(!showPinPopup)}
                className="flex items-center w-full px-3 py-1.5 text-left hover:bg-gray-50"
              >
                <ChevronDownIcon className="h-3.5 w-3.5 mr-2 text-gray-500" />
                <span>Pin Lines</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {showRawNote && (
        <div
          ref={rawNotePopupRef}
          className="absolute right-0 mt-1 w-96 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-10"
        >
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