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
  ClockIcon,
  LinkIcon,
  MapPinIcon,
  EyeIcon,
  BriefcaseIcon,
  AcademicCapIcon,
  BeakerIcon,
  LightBulbIcon,
  StarIcon,
  DocumentTextIcon
} from '@heroicons/react/24/solid';

/**
 * NoteTitle - renders todo/deadline info plus meeting/event inputs based on note metadata
 */
export default function NoteTitle({
  note,
  setShowEndDatePickerForNoteId,
  urlToNotesMap,
  updateNoteCallback
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

  // Extract meeting and event dates
  const meetingMatch = note.content.match(/meta::meeting::([^\n]+)/);
  const eventMatch = note.content.match(/meta::event::([^\n]+)/);
  
  // Get the date from the second line if it exists, otherwise use current date
  const getSecondLineDate = () => {
    const secondLine = lines[1]?.trim();
    if (!secondLine) return new Date();
    
    try {
      const date = new Date(secondLine);
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return new Date();
      }
      return date;
    } catch (e) {
      return new Date();
    }
  };

  // Format dates for input fields
  const formatDateForInput = (date) => {
    try {
      if (!date || isNaN(date.getTime())) {
        date = new Date();
      }
      return date.toISOString().split('.')[0]; // Format: YYYY-MM-DDTHH:mm
    } catch (e) {
      const now = new Date();
      return now.toISOString().split('.')[0];
    }
  };

  const formatDateOnly = (date) => {
    try {
      if (!date || isNaN(date.getTime())) {
        date = new Date();
      }
      return date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
    } catch (e) {
      const now = new Date();
      return now.toISOString().split('T')[0];
    }
  };

  // Detect meta tags
  const isMeeting = lines.some((l) => l.trim().startsWith('meta::meeting'));
  const isEvent = lines.some((l) => l.trim().startsWith('meta::event'));
  const isPinned = lines.some((l) => l.trim().startsWith('meta::pin'));
  const isAbbreviation = lines.some((l) => l.trim().startsWith('meta::abbreviation'));
  const isBookmark = lines.some((l) => l.trim().startsWith('meta::bookmark'));
  const isQuickLinks = lines.some((l) => l.trim().startsWith('meta::quick_links'));
  const isWatch = lines.some((l) => l.trim().toLowerCase().includes('#watch'));
  const isWork = lines.some((l) => l.trim().toLowerCase().includes('#work'));
  const isStudy = lines.some((l) => l.trim().toLowerCase().includes('#study'));
  const isResearch = lines.some((l) => l.trim().toLowerCase().includes('#research'));
  const isIdea = lines.some((l) => l.trim().toLowerCase().includes('#idea'));
  const isImportant = lines.some((l) => l.trim().toLowerCase().includes('#important'));
  const isDocument = lines.some((l) => l.trim().toLowerCase().includes('#document'));

  // Update meeting date in note
  const updateMeetingDate = (dateTimeStr) => {
    const newDate = new Date(dateTimeStr);
    const dateISOString = newDate.toISOString();
    let updatedContent;

    // Split content into lines and handle the update
    const contentLines = note.content.split('\n');
    
    // If first line doesn't have meta::meeting tag, add it
    if (!contentLines[0]?.trim().startsWith('meta::meeting')) {
      contentLines.unshift('meta::meeting::');
    }
    
    // Update or insert the date as second line
    if (contentLines.length === 1) {
      contentLines.push(dateISOString);
    } else {
      contentLines[1] = dateISOString;
    }
    
    // Keep any remaining content after the date line
    updatedContent = contentLines.join('\n');
    
    // Update the note and refresh the UI
    updateNote(note.id, updatedContent);
    if (updateNoteCallback) {
      updateNoteCallback(notes => 
        notes.map(n => n.id === note.id ? { ...n, content: updatedContent } : n)
      );
    }
  };

  // Update event date in note
  const updateEventDate = (dateStr) => {
    const newDate = new Date(dateStr);
    newDate.setHours(12, 0, 0, 0); // Set to noon
    const dateISOString = newDate.toISOString();
    let updatedContent;

    // Split content into lines and handle the update
    const contentLines = note.content.split('\n');
    
    // If first line doesn't have meta::event tag, add it
    if (!contentLines[0]?.trim().startsWith('meta::event')) {
      contentLines.unshift('meta::event::');
    }
    
    // Update or insert the date as second line
    if (contentLines.length === 1) {
      contentLines.push(dateISOString);
    } else {
      contentLines[1] = dateISOString;
    }
    
    // Keep any remaining content after the date line
    updatedContent = contentLines.join('\n');
    
    // Update the note and refresh the UI
    updateNote(note.id, updatedContent);
    if (updateNoteCallback) {
      updateNoteCallback(notes => 
        notes.map(n => n.id === note.id ? { ...n, content: updatedContent } : n)
      );
    }
  };

  return (
    <div className="flex items-center flex-wrap gap-2 mb-2">
      <div className="flex items-center gap-2">
        {isAbbreviation && (
          <AdjustmentsVerticalIcon className="h-5 w-5 text-purple-600" title="Abbreviation" />
        )}
        {isBookmark && (
          <BookmarkIcon className="h-5 w-5 text-indigo-600" title="Bookmark" />
        )}
        {isQuickLinks && (
          <LinkIcon className="h-5 w-5 text-blue-600" title="Quick Links" />
        )}
        {isPinned && (
          <MapPinIcon className="h-5 w-5 text-yellow-600" title="Pinned" />
        )}
        {isEvent && !isMeeting && (
          <CalendarDaysIcon className="h-5 w-5 text-pink-600" title="Event" />
        )}
        {isMeeting && (
          <ClockIcon className="h-5 w-5 text-blue-600" title="Meeting" />
        )}
        {isWatch && (
          <EyeIcon className="h-5 w-5 text-teal-600" title="Watch" />
        )}
        {isWork && (
          <BriefcaseIcon className="h-5 w-5 text-gray-600" title="Work" />
        )}
        {isStudy && (
          <AcademicCapIcon className="h-5 w-5 text-green-600" title="Study" />
        )}
        {isResearch && (
          <BeakerIcon className="h-5 w-5 text-violet-600" title="Research" />
        )}
        {isIdea && (
          <LightBulbIcon className="h-5 w-5 text-amber-600" title="Idea" />
        )}
        {isImportant && (
          <StarIcon className="h-5 w-5 text-red-600" title="Important" />
        )}
        {isDocument && (
          <DocumentTextIcon className="h-5 w-5 text-slate-600" title="Document" />
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
            value={formatDateForInput(getSecondLineDate())}
            onChange={(e) => updateMeetingDate(e.target.value)}
            className="border border-gray-300 rounded p-1 text-sm"
          />
        </div>
      )}
      {isEvent && (
        <div className="flex items-center gap-2 px-4 py-2">
          <label className="text-sm font-medium">Event Date:</label>
          <input
            type="date"
            value={formatDateOnly(getSecondLineDate())}
            onChange={(e) => updateEventDate(e.target.value)}
            className="border border-gray-300 rounded p-1 text-sm"
          />
        </div>
      )}
    </div>
  );
}