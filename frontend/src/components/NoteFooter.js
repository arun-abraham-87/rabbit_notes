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
  ChevronDownIcon
} from '@heroicons/react/24/solid';
import { formatDate } from '../utils/DateUtils';

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
  const moreActionsRef = useRef(null);
  const pinPopupRef = useRef(null);
  const lines = note.content.split('\n');

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
    };

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        setShowMoreActions(false);
        setShowPinPopup(false);
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
    <div className="flex flex-col text-xs text-gray-700 px-4 pb-2">
      {/* Main actions row */}
      <div className="flex items-center justify-between border-t pt-2 mt-2">
        {/* Left side: Created date */}
        <div className="flex items-center space-x-2">
          {showCreatedDate && (
            <div className="flex items-center">
              <ClockIcon className="h-3.5 w-3.5 text-gray-500 mr-1" />
              <span>{formatDate(note.created_datetime)}</span>
            </div>
          )}
        </div>

        {/* Right side: Primary actions */}
        <div className="flex items-center space-x-3">
          {/* Todo actions */}
          {isTodo ? (
            <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => handleTodoAction('low')}
                className="px-2 py-1 text-xs rounded hover:bg-green-100 text-green-700"
                title="Set Low Priority"
              >
                L
              </button>
              <button
                onClick={() => handleTodoAction('medium')}
                className="px-2 py-1 text-xs rounded hover:bg-yellow-100 text-yellow-700"
                title="Set Medium Priority"
              >
                M
              </button>
              <button
                onClick={() => handleTodoAction('high')}
                className="px-2 py-1 text-xs rounded hover:bg-red-100 text-red-700"
                title="Set High Priority"
              >
                H
              </button>
              <div className="w-px h-4 bg-gray-300 mx-1" />
              <button
                onClick={() => {
                  const updatedContent = note.content
                    .split('\n')
                    .filter(line =>
                      !line.trim().startsWith('meta::todo::') &&
                      !line.trim().startsWith('meta::low') &&
                      !line.trim().startsWith('meta::medium') &&
                      !line.trim().startsWith('meta::high')
                    )
                    .join('\n')
                    .trim();
                  updateNote(note.id, updatedContent);
                }}
                title="Unmark as Todo"
              >
                <XCircleIcon className="h-4 w-4 text-gray-500 hover:text-gray-700" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleTodoAction('low')}
              title="Mark as Todo"
              className="p-1 hover:bg-gray-100 rounded"
            >
              <CheckCircleIcon className="h-4 w-4 text-gray-500 hover:text-gray-700" />
            </button>
          )}

          {/* Quick actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPopupNoteText(note.id)}
              title="Edit Note"
              className="p-1 hover:bg-gray-100 rounded"
            >
              <PencilIcon className="h-4 w-4 text-gray-500 hover:text-gray-700" />
            </button>
            
            <button
              onClick={() => handleDelete(note.id)}
              title="Delete Note"
              className="p-1 hover:bg-gray-100 rounded"
            >
              <TrashIcon className="h-4 w-4 text-gray-500 hover:text-gray-700" />
            </button>

            <div className="relative">
              <button
                onClick={() => setShowMoreActions(!showMoreActions)}
                title="More Actions"
                className="p-1 hover:bg-gray-100 rounded flex items-center"
              >
                <ChevronDownIcon className="h-4 w-4 text-gray-500 hover:text-gray-700" />
              </button>

              {/* More actions dropdown */}
              {showMoreActions && (
                <div 
                  ref={moreActionsRef}
                  className="absolute right-0 bottom-full mb-1 bg-white border rounded-lg shadow-lg py-1 min-w-[160px] z-50"
                >
                  <div className="px-2 py-1 text-xs text-gray-500 font-medium border-b">Actions</div>
                  
                  {/* Time-based actions */}
                  <button
                    onClick={() => handleAction('today')}
                    className="flex items-center w-full px-3 py-1.5 text-left hover:bg-gray-50"
                  >
                    <CalendarIcon className="h-3.5 w-3.5 mr-2 text-blue-500" />
                    <span>Mark as Today</span>
                  </button>
                  
                  <button
                    onClick={() => handleAction('meeting')}
                    className="flex items-center w-full px-3 py-1.5 text-left hover:bg-gray-50"
                  >
                    <ClockIcon className="h-3.5 w-3.5 mr-2 text-purple-500" />
                    <span>Mark as Meeting</span>
                  </button>
                  
                  <button
                    onClick={() => handleAction('event')}
                    className="flex items-center w-full px-3 py-1.5 text-left hover:bg-gray-50"
                  >
                    <FlagIcon className="h-3.5 w-3.5 mr-2 text-green-500" />
                    <span>Mark as Event</span>
                  </button>

                  <div className="border-t my-1" />

                  {/* Organization actions */}
                  <button
                    onClick={() => handleAction('bookmark')}
                    className="flex items-center w-full px-3 py-1.5 text-left hover:bg-gray-50"
                  >
                    <BookmarkIcon className="h-3.5 w-3.5 mr-2 text-yellow-500" />
                    <span>Bookmark</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setLinkingNoteId(note.id);
                      setLinkSearchTerm('');
                      setLinkPopupVisible(true);
                      setShowMoreActions(false);
                    }}
                    className="flex items-center w-full px-3 py-1.5 text-left hover:bg-gray-50"
                  >
                    <LinkIcon className="h-3.5 w-3.5 mr-2 text-blue-500" />
                    <span>Link Note</span>
                  </button>

                  <button
                    onClick={() => {
                      updateNote(
                        note.id,
                        note.content.toLowerCase().includes('#watch')
                          ? note.content.replace(/#watch/gi, '').trim()
                          : `${note.content.trim()} #watch`
                      );
                      setShowMoreActions(false);
                    }}
                    className="flex items-center w-full px-3 py-1.5 text-left hover:bg-gray-50"
                  >
                    <EyeIcon className="h-3.5 w-3.5 mr-2 text-indigo-500" />
                    <span>{isWatched ? 'Unmark Watchlist' : 'Add to Watchlist'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedPinLines([]);
                      setShowPinPopup(true);
                      setShowMoreActions(false);
                    }}
                    className="flex items-center w-full px-3 py-1.5 text-left hover:bg-gray-50"
                  >
                    <TagIcon className="h-3.5 w-3.5 mr-2 text-orange-500" />
                    <span>Pin Note</span>
                  </button>

                  <div className="border-t my-1" />

                  {/* Danger zone */}
                  <button
                    onClick={() => {
                      const withoutMeta = note.content
                        .split('\n')
                        .filter(l => !l.trim().startsWith('meta::'))
                        .join('\n')
                        .trim();
                      updateNote(note.id, withoutMeta);
                      setShowMoreActions(false);
                    }}
                    className="flex items-center w-full px-3 py-1.5 text-left hover:bg-red-50 text-red-600"
                  >
                    <XCircleIcon className="h-3.5 w-3.5 mr-2" />
                    <span>Remove All Tags</span>
                  </button>
                </div>
              )}
            </div>

            {/* Selection checkbox */}
            <input
              type="checkbox"
              checked={selectedNotes.includes(note.id)}
              onChange={() => toggleNoteSelection(note.id)}
              title="Select Note"
              className="ml-2 accent-purple-600 w-4 h-4 rounded border-gray-300 focus:ring-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Pin Popup */}
      {showPinPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div ref={pinPopupRef} className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-sm font-semibold mb-3">Select lines to pin</h3>
            <div className="grid grid-cols-5 gap-2 mb-4 max-h-[200px] overflow-y-auto">
              {lines.map((line, idx) => {
                const lineNum = idx + 1;
                const isSelected = selectedPinLines.includes(lineNum);
                return (
                  <button
                    key={lineNum}
                    onClick={() => toggleLineSelection(lineNum)}
                    className={`px-2 py-1.5 text-xs border rounded transition-colors
                      ${isSelected 
                        ? 'bg-blue-100 border-blue-400 text-blue-700' 
                        : 'bg-gray-50 hover:bg-gray-100 border-gray-200'
                      }`}
                    title={line}
                  >
                    {lineNum}
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  const without = note.content
                    .split('\n')
                    .filter(l => !l.trim().startsWith('meta::pin::'))
                    .join('\n')
                    .trim();
                  updateNote(
                    note.id,
                    `${without}\nmeta::pin::${selectedPinLines.sort((a, b) => a - b).join(',')}`
                  );
                  setShowPinPopup(false);
                }}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Pin Selected Lines
              </button>
              <button
                onClick={() => setShowPinPopup(false)}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NoteFooter;