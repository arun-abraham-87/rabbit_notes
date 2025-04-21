// src/components/NoteMetaInfo.js
import React from 'react';
import {
  CheckCircleIcon,
  CalendarIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/solid';

/**
 * Displays todo / deadline information for a note card.
 *
 * Props
 * -----
 * note                          – the full note object (must include `id` and `content`)
 * todoAgeNotice                 – string like “Open for: 2 d 3 h”   ('' if none)
 * parsedEndDate                 – Date | null  (explicit meta::end_date::…)
 * endDateNotice                 – string like “Deadline in 5 days” or “Deadline passed 3 d ago”
 * isDeadlinePassed              – boolean  (true if Date < now)
 * updateNote                    – (noteId, newContent) ⇒ void
 * setShowEndDatePickerForNoteId – (noteId) ⇒ void
 */
const NoteMetaInfo = ({
  note,
  todoAgeNotice,
  parsedEndDate,
  endDateNotice,
  isDeadlinePassed,
  updateNote,
  setShowEndDatePickerForNoteId,
}) => {
  // Nothing to show? bail out early
  if (!(note.content.includes('meta::todo') || endDateNotice)) return null;

  /* helpers to strip metadata lines */
  const stripLines = (predicate) =>
    note.content
      .split('\n')
      .filter((line) => !predicate(line.trim()))
      .join('\n')
      .trim();

  return (
    <div className="flex items-center gap-2 mb-2">
      {/* todo badge */}
      <CheckCircleIcon className="h-6 w-6 text-green-600" title="Todo" />

      {/* “open for …” label */}
      {todoAgeNotice && (
        <button
          className="text-gray-800 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1 hover:bg-gray-400"
          onClick={() =>
            updateNote(
              note.id,
              stripLines((l) => l.startsWith('meta::todo'))
            )
          }
          title="Remove todo notice"
        >
          {todoAgeNotice}
        </button>
      )}

      {/* explicit deadline date string */}
      {parsedEndDate && (
        <>
          <span className="text-xs text-gray-700 font-semibold mr-1">
            Deadline&nbsp;Date:
          </span>
          <span
            className="text-xs text-gray-500 cursor-pointer"
            onClick={() => setShowEndDatePickerForNoteId(note.id)}
          >
            {parsedEndDate.toLocaleDateString()}
          </span>
          <CalendarIcon
            className="h-5 w-5 text-gray-600 cursor-pointer hover:text-gray-800"
            onClick={() => setShowEndDatePickerForNoteId(note.id)}
            title="Edit end date"
          />
        </>
      )}

      {/* relative deadline notice (in / passed) */}
      {endDateNotice && (
        <button
          className="text-gray-800 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1 hover:bg-gray-400"
          onClick={() =>
            updateNote(
              note.id,
              stripLines((l) => l.startsWith('meta::end_date::'))
            )
          }
          title="Remove end date"
        >
          {isDeadlinePassed && (
            <ExclamationCircleIcon
              className="h-4 w-4 text-red-600"
              title="Deadline passed"
            />
          )}
          <span>{endDateNotice}</span>
          <span
            className={`${
              isDeadlinePassed
                ? 'text-red-600 hover:text-red-800'
                : 'text-blue-600 hover:text-blue-900'
            } ml-1 cursor-pointer`}
          >
            ×
          </span>
        </button>
      )}

      {/* shortcut when no explicit deadline exists */}
      {!parsedEndDate && (
        <button
          className="text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1 bg-gray-100 text-gray-800 hover:bg-gray-200"
          onClick={() => setShowEndDatePickerForNoteId(note.id)}
          title="Set end date"
        >
          No&nbsp;Deadline
          <CalendarIcon
            className="h-4 w-4 text-gray-600 ml-1"
            title="Pick date"
          />
        </button>
      )}
    </div>
  );
};

export default NoteMetaInfo;