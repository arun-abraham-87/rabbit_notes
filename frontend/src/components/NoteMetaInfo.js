import React from 'react';
import { updateNoteById as updateNote } from '../utils/ApiUtils';
import { getDateAgeInYearsMonthsDays } from '../utils/DateUtils';
import {
  CheckCircleIcon,
  CalendarIcon,
  ExclamationCircleIcon,
  AdjustmentsVerticalIcon,
  BookmarkIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/solid';

/**
 * NoteTitle - renders todo/deadline info plus meeting/event inputs based on note metadata
 */
export default function NoteTitle({
  note,
  setShowEndDatePickerForNoteId,
  urlToNotesMap
}) {
  const lines = note.content.split('\n');

  const urlPattern = /https?:\/\/[^\s]+/g;
  const urls = note.content.match(urlPattern) || [];
  urls.forEach((url) => {
    if (!urlToNotesMap[url]) urlToNotesMap[url] = [];
    urlToNotesMap[url].push(note.id);
  });
  const endDateMatch = note.content.match(/meta::end_date::([^\n]+)/);
  const parsedEndDate = endDateMatch ? new Date(endDateMatch[1]) : null;
  let endDateNotice = '';
  const isDeadlinePassed = parsedEndDate && parsedEndDate < new Date();
  const todoDateMatch = note.content.match(/meta::todo::([^\n]+)/);
  let todoAgeNotice = '';
  if (todoDateMatch) {
    const todoDate = new Date(todoDateMatch[1]);
    todoAgeNotice = `Open for: ${getDateAgeInYearsMonthsDays(todoDate, true)}`;
  }
  if (parsedEndDate) {
    const now = new Date();
    const diffMs = parsedEndDate - now;
    if (diffMs > 0) {
      endDateNotice = `Deadline in ${getDateAgeInYearsMonthsDays(parsedEndDate, false)}`;
    } else {
      endDateNotice = `Deadline passed ${getDateAgeInYearsMonthsDays(parsedEndDate, true)} ago`;
    }
  }

  // Helper to strip metadata lines matching predicate
  const stripLines = (predicate) =>
    lines.filter((l) => !predicate(l.trim())).join('\n').trim();

  // Detect meeting or event meta
  const isMeeting = lines.some((l) => l.trim().startsWith('meta::meeting'));
  const isEvent = lines.some((l) => l.trim().startsWith('meta::event'));
  const isPinned = lines.some((l) => l.trim().startsWith('meta::pin'));
  const isAbbreviation = lines.some((l) => l.trim().startsWith('meta::abbreviation'));
  const isBookmark = lines.some((l) => l.trim().startsWith('meta::bookmark'));

  return (
    <div className="flex items-center flex-wrap gap-2 mb-2">
      <div className="flex items-center gap-2">
        {isAbbreviation && (
          <AdjustmentsVerticalIcon className="h-5 w-5 text-purple-600" title="Abbreviation" />
        )}
        {isBookmark && (
          <BookmarkIcon className="h-5 w-5 text-indigo-600" title="Bookmark" />
        )}
        {isEvent && !isMeeting && (
          <CalendarDaysIcon className="h-5 w-5 text-pink-600" title="Event" />
        )}
      </div>
      {(note.content.includes('meta::todo') || endDateNotice) && (
        <div className="flex items-center gap-2">
          <CheckCircleIcon className="h-6 w-6 text-green-600" title="Todo" />

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

          {parsedEndDate && (
            <>
              <span className="text-xs text-gray-700 font-semibold mr-1">
                Deadline Date:
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
                className={`${isDeadlinePassed
                    ? 'text-red-600 hover:text-red-800'
                    : 'text-blue-600 hover:text-blue-900'
                  } ml-1 cursor-pointer`}
              >
                ×
              </span>
            </button>
          )}

          {!parsedEndDate && (
            <button
              className="text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1 bg-gray-100 text-gray-800 hover:bg-gray-200"
              onClick={() => setShowEndDatePickerForNoteId(note.id)}
              title="Set end date"
            >
              No Deadline
              <CalendarIcon
                className="h-4 w-4 text-gray-600 ml-1"
                title="Pick date"
              />
            </button>
          )}
        </div>
      )}
      {isMeeting && (
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-blue-600" title="Meeting" />
        </div>
      )}
      {isMeeting && (
        <div className="flex items-center gap-2 px-4 py-2">
          <label className="text-sm font-medium">Meeting Time:</label>
          <input
            type="datetime-local"
            value={(() => {
              const rawTime = lines[1] || '';
              const [datePart, timePart] = rawTime.split('T');
              return rawTime ? `${datePart}T${timePart?.slice(0, 5)}` : '';
            })()}
            onChange={(e) => {
              lines[1] = e.target.value;
              updateNote(note.id, lines.join("\n"));
            }}
            className="border border-gray-300 rounded p-1 text-sm"
          />
        </div>
      )}
      {isEvent && (
        <div className="flex items-center gap-2 px-4 py-2">
          <label className="text-sm font-medium">Event Date:</label>
          <input
            type="date"
            value={(() => lines[1]?.split('T')[0] || '')()}
            onChange={(e) => {
              lines[1] = `${e.target.value}T12:00`;
              updateNote(note.id, lines.join("\n"));
            }}
            className="border border-gray-300 rounded p-1 text-sm"
          />
        </div>
      )}
    </div>
  );
}