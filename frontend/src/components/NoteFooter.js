// frontend/src/components/NoteFooter.js
import React, { useState } from 'react';
import {
  XCircleIcon,
  CheckCircleIcon,
  PencilIcon,
  TrashIcon,
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
  const lines = note.content.split('\n');
  const toggleLineSelection = (lineNum) => {
    setSelectedPinLines(prev =>
      prev.includes(lineNum)
        ? prev.filter(l => l !== lineNum)
        : [...prev, lineNum]
    );
  };
  return (
    <div className="flex text-xs text-gray-700 px-4 pb-2 items-center">
      <div className="flex justify-between w-full items-center">
        {/* Created date */}
        <div className="flex-1">
          {showCreatedDate && <span>{formatDate(note.created_datetime)}</span>}
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-2" id="button_bar">
          {note.content.toLowerCase().includes('meta::todo') ? (
            <div className="flex items-center gap-2">
              {/* Priority buttons */}
              <div className="flex gap-1">
                <button
                  className="bg-green-100 text-green-800 px-2 py-1 text-xs rounded hover:bg-green-200"
                  onClick={() => {
                    const updated = note.content
                      .split('\n')
                      .filter(line =>
                        !line.trim().startsWith('meta::low') &&
                        !line.trim().startsWith('meta::medium') &&
                        !line.trim().startsWith('meta::high')
                      )
                      .join('\n')
                      .trim() + '\nmeta::low';
                    updateNote(note.id, updated);
                  }}
                >
                  Low
                </button>
                <button
                  className="bg-yellow-100 text-yellow-800 px-2 py-1 text-xs rounded hover:bg-yellow-200"
                  onClick={() => {
                    const updated = note.content
                      .split('\n')
                      .filter(line =>
                        !line.trim().startsWith('meta::low') &&
                        !line.trim().startsWith('meta::medium') &&
                        !line.trim().startsWith('meta::high')
                      )
                      .join('\n')
                      .trim() + '\nmeta::medium';
                    updateNote(note.id, updated);
                  }}
                >
                  Medium
                </button>
                <button
                  className="bg-red-100 text-red-800 px-2 py-1 text-xs rounded hover:bg-red-200"
                  onClick={() => {
                    const updated = note.content
                      .split('\n')
                      .filter(line =>
                        !line.trim().startsWith('meta::low') &&
                        !line.trim().startsWith('meta::medium') &&
                        !line.trim().startsWith('meta::high')
                      )
                      .join('\n')
                      .trim() + '\nmeta::high';
                    updateNote(note.id, updated);
                  }}
                >
                  High
                </button>
              </div>

              {/* Unmark as Todo */}
              <div className="group relative">
                <XCircleIcon
                  title="Unmark as Todo"
                  className="h-4 w-4 text-gray-500 cursor-pointer group-hover:scale-150 transition-transform duration-200 ease-in-out hover:text-gray-700"
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
                />
              </div>
            </div>
          ) : (
            /* Mark as Todo */
            <div className="group relative">
              <CheckCircleIcon
                title="Mark as Todo"
                className="h-4 w-4 text-gray-500 cursor-pointer group-hover:scale-150 transition-transform duration-200 ease-in-out hover:text-gray-700"
                onClick={() => {
                  const timestamp = new Date().toISOString();
                  const contentWithoutOldTodoMeta = note.content
                    .split('\n')
                    .filter(line => !line.trim().startsWith('meta::todo::'))
                    .join('\n')
                    .trim();
                  const newContent = `${contentWithoutOldTodoMeta}\nmeta::todo::${timestamp}\nmeta::low`;
                  updateNote(note.id, newContent);
                }}
              />
            </div>
          )}

          <div className="group relative">
            <PencilIcon
              className="h-4 w-4 text-gray-500 cursor-pointer group-hover:scale-150 transition-transform duration-200 ease-in-out hover:text-gray-700"
              onClick={() => setPopupNoteText(note.id)}
            />
          </div>

          {/* Delete */}
          <div className="group relative">
            <TrashIcon
              className="h-4 w-4 text-gray-500 cursor-pointer group-hover:scale-150 transition-transform duration-200 ease-in-out hover:text-gray-700"
              onClick={() => handleDelete(note.id)}
            />
          </div>

          <div className="relative">
            <select
              title="More actions"
              onChange={e => {
                const action = e.target.value;
                switch (action) {
                  case 'today': {
                    const ts = new Date().toISOString();
                    const without = note.content
                      .split('\n')
                      .filter(l => !l.trim().startsWith('meta::today::'))
                      .join('\n')
                      .trim();
                    updateNote(note.id, `${without}\nmeta::today::${ts}`);
                    break;
                  }
                  case 'watchlist':
                    updateNote(
                      note.id,
                      note.content.toLowerCase().includes('#watch')
                        ? note.content.replace(/#watch/gi, '').trim()
                        : `${note.content.trim()} #watch`
                    );
                    break;
                  case 'link':
                    setLinkingNoteId(note.id);
                    setLinkSearchTerm('');
                    setLinkPopupVisible(true);
                    break;
                  case 'bookmark': {
                    const ts = new Date().toISOString();
                    const without = note.content
                      .split('\n')
                      .filter(l => !l.trim().startsWith('meta::bookmark::'))
                      .join('\n')
                      .trim();
                    updateNote(note.id, `${without}\nmeta::bookmark::${ts}`);
                    break;
                  }
                  case 'abbreviation': {
                    const ts = new Date().toISOString();
                    const without = note.content
                      .split('\n')
                      .filter(l => !l.trim().startsWith('meta::abbreviation::'))
                      .join('\n')
                      .trim();
                    updateNote(note.id, `${without}\nmeta::abbreviation::${ts}`);
                    break;
                  }
                  case 'meeting': {
                    const ts = new Date().toISOString();
                    const without = note.content
                      .split('\n')
                      .filter(l => !l.trim().startsWith('meta::meeting::'))
                      .join('\n')
                      .trim();
                    updateNote(note.id, `${without}\nmeta::meeting::${ts}`);
                    break;
                  }
                  case 'event': {
                    const ts = new Date().toISOString();
                    const without = note.content
                      .split('\n')
                      .filter(l => !l.trim().startsWith('meta::event::'))
                      .join('\n')
                      .trim();
                    updateNote(note.id, `${without}\nmeta::event::${ts}`);
                    break;
                  }
                  case 'pin': {
                    setSelectedPinLines([]);
                    setShowPinPopup(true);
                    break;
                  }
                  case 'removeAllTags': {
                    const withoutMeta = note.content
                      .split('\n')
                      .filter(l => !l.trim().startsWith('meta::'))
                      .join('\n')
                      .trim();
                    updateNote(note.id, withoutMeta);
                    break;
                  }
                  default:
                    break;
                }
                e.target.value = '';
              }}
              className="text-xs border rounded px-2 py-1"
            >
              <option value="">More</option>
              <option value="today">Mark as Today</option>
              {note.content.toLowerCase().includes('#watch') ? (
                <option value="watchlist">Unmark Watchlist</option>
              ) : (
                <option value="watchlist">Add to Watchlist</option>
              )}
              <option value="link">Link Note</option>
              <option value="bookmark">Bookmark</option>
              <option value="abbreviation">Add Abbreviation</option>
              <option value="meeting">Mark as Meeting</option>
              <option value="event">Mark as Event</option>
              <option value="pin">Pin Note</option>
              <option value="removeAllTags">Remove All Tags</option>
            </select>
          </div>

          {/* Select Checkbox */}
          <input
            type="checkbox"
            checked={selectedNotes.includes(note.id)}
            onChange={() => toggleNoteSelection(note.id)}
            title="Select Note"
            className="accent-purple-600 w-4 h-4 rounded border-gray-300 focus:ring-purple-500"
          />
        </div>
        {/* Pin Popup */}
        {showPinPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded shadow-lg">
              <h3 className="mb-2 font-semibold">Select lines to pin for note {note.id}</h3>
              <div className="grid grid-cols-5 gap-2 mb-4">
                {lines.map((_, idx) => {
                  const lineNum = idx + 1;
                  const isSelected = selectedPinLines.includes(lineNum);
                  return (
                    <button
                      key={lineNum}
                      onClick={() => toggleLineSelection(lineNum)}
                      className={`px-2 py-1 border rounded ${isSelected ? 'bg-blue-200 border-blue-500' : 'bg-gray-100'}`}
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
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                  Pin
                </button>
                <button
                  onClick={() => setShowPinPopup(false)}
                  className="px-4 py-2 bg-gray-300 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div></div>
  );
};

export default NoteFooter;