// frontend/src/components/NoteFooter.js
import React from 'react';
import {
  XCircleIcon,
  CheckCircleIcon,
  SunIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  LinkIcon,
  BookmarkIcon,
  HashtagIcon,
  PhoneIcon,
  CalendarDaysIcon,
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
}) => (
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
                const newContent = `${contentWithoutOldTodoMeta}\nmeta::todo::${timestamp}`;
                updateNote(note.id, newContent);
              }}
            />
          </div>
        )}

        <div className="group relative">
          <SunIcon
            title="Mark as Today"
            className="h-4 w-4 text-gray-500 cursor-pointer group-hover:scale-150 transition-transform duration-200 ease-in-out hover:text-gray-700"
            onClick={() => {
              const timestamp = new Date().toISOString();
              const contentWithoutOldTodayMeta = note.content
                .split('\n')
                .filter(line => !line.trim().startsWith('meta::today::'))
                .join('\n')
                .trim();
              const newContent = `${contentWithoutOldTodayMeta}\nmeta::today::${timestamp}`;
              updateNote(note.id, newContent);
            }}
          />
        </div>

        {/* Toggle Watchlist */}
        <div className="group relative">
          <EyeIcon
            title={note.content.toLowerCase().includes('#watch') ? 'Unmark from Watchlist' : 'Add to Watchlist'}
            className="h-4 w-4 text-gray-500 cursor-pointer group-hover:scale-150 transition-transform duration-200 ease-in-out hover:text-gray-700"
            onClick={() => {
              if (note.content.toLowerCase().includes('#watch')) {
                const updated = note.content.replace(/#watch/gi, '').trim();
                updateNote(note.id, updated);
              } else {
                updateNote(note.id, `${note.content.trim()} #watch`);
              }
            }}
          />
        </div>

        {/* Edit */}
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

        {/* Set End Date */}
        {note.content.toLowerCase().includes('meta::todo') && (
          <div className="group relative">
            <button
              title="Set End Date"
              onClick={() => setShowEndDatePickerForNoteId(note.id)}
              className="text-gray-600 hover:text-blue-700 text-base"
            >
              📅
            </button>
          </div>
        )}

        {/* Link Notes */}
        <div className="group relative">
          <LinkIcon
            title="Link Note"
            className="h-4 w-4 text-gray-500 cursor-pointer group-hover:scale-150 transition-transform duration-200 ease-in-out hover:text-gray-700"
            onClick={() => {
              setLinkingNoteId(note.id);
              setLinkSearchTerm('');
              setLinkPopupVisible(true);
            }}
          />
        </div>

        {/* Bookmark */}
        <div className="group relative">
          <BookmarkIcon
            title="Bookmark"
            className="h-4 w-4 text-gray-500 cursor-pointer group-hover:scale-150 transition-transform duration-200 ease-in-out hover:text-gray-700"
            onClick={() => {
              const timestamp = new Date().toISOString();
              const contentWithoutOldBookmarkMeta = note.content
                .split('\n')
                .filter(line => !line.trim().startsWith('meta::bookmark::'))
                .join('\n')
                .trim();
              const newContent = `${contentWithoutOldBookmarkMeta}\nmeta::bookmark::${timestamp}`;
              updateNote(note.id, newContent);
            }}
          />
        </div>

        {/* Add Abbreviation */}
        <div className="group relative">
          <HashtagIcon
            title="Add Abbreviation"
            className="h-4 w-4 text-gray-500 cursor-pointer group-hover:scale-150 transition-transform duration-200 ease-in-out hover:text-gray-700"
            onClick={() => {
              const timestamp = new Date().toISOString();
              const contentWithoutOldAbbreviationMeta = note.content
                .split('\n')
                .filter(line => !line.trim().startsWith('meta::abbreviation::'))
                .join('\n')
                .trim();
              const newContent = `${contentWithoutOldAbbreviationMeta}\nmeta::abbreviation::${timestamp}`;
              updateNote(note.id, newContent);
            }}
          />
        </div>

        {/* Mark as Meeting */}
        <div className="group relative">
          <PhoneIcon
            title="Mark as Meeting"
            className="h-4 w-4 text-gray-500 cursor-pointer group-hover:scale-150 transition-transform duration-200 ease-in-out hover:text-gray-700"
            onClick={() => {
              const timestamp = new Date().toISOString();
              const contentWithoutOldMeetingMeta = note.content
                .split('\n')
                .filter(line => !line.trim().startsWith('meta::meeting::'))
                .join('\n')
                .trim();
              const newContent = `${contentWithoutOldMeetingMeta}\nmeta::meeting::${timestamp}`;
              updateNote(note.id, newContent);
            }}
          />
        </div>

        {/* Mark as Event */}
        <div className="group relative">
          <CalendarDaysIcon
            title="Mark as Event"
            className="h-4 w-4 text-gray-500 cursor-pointer group-hover:scale-150 transition-transform duration-200 ease-in-out hover:text-gray-700"
            onClick={() => {
              const timestamp = new Date().toISOString();
              const contentWithoutOldEventMeta = note.content
                .split('\n')
                .filter(line => !line.trim().startsWith('meta::event::'))
                .join('\n')
                .trim();
              const newContent = `${contentWithoutOldEventMeta}\nmeta::event::${timestamp}`;
              updateNote(note.id, newContent);
            }}
          />
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
    </div>
  </div>
);

export default NoteFooter;