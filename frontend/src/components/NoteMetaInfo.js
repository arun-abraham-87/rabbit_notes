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
  const isTodo = lines.some((l) => l.trim().startsWith('meta::todo'));
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

  const removeTag = async (tag) => {
    let updatedContent;
    switch (tag) {
      case 'abbreviation':
        updatedContent = stripLines(l => l.startsWith('meta::abbreviation'));
        break;
      case 'bookmark':
        updatedContent = stripLines(l => l.startsWith('meta::bookmark'));
        break;
      case 'quick_links':
        updatedContent = stripLines(l => l.startsWith('meta::quick_links'));
        break;
      case 'pin':
        updatedContent = stripLines(l => l.startsWith('meta::pin'));
        break;
      case 'event':
        updatedContent = stripLines(l => l.startsWith('meta::event'));
        break;
      case 'meeting':
        updatedContent = stripLines(l => l.startsWith('meta::meeting'));
        break;
      case 'todo':
        updatedContent = stripLines(l => l.startsWith('meta::todo') || l.startsWith('meta::end_date::'));
        break;
      case 'watch':
        updatedContent = note.content.replace(/#watch\b/gi, '').trim();
        break;
      case 'work':
        updatedContent = note.content.replace(/#work\b/gi, '').trim();
        break;
      case 'study':
        updatedContent = note.content.replace(/#study\b/gi, '').trim();
        break;
      case 'research':
        updatedContent = note.content.replace(/#research\b/gi, '').trim();
        break;
      case 'idea':
        updatedContent = note.content.replace(/#idea\b/gi, '').trim();
        break;
      case 'important':
        updatedContent = note.content.replace(/#important\b/gi, '').trim();
        break;
      case 'document':
        updatedContent = note.content.replace(/#document\b/gi, '').trim();
        break;
      default:
        return;
    }

    try {
      // First update the note in the database
      await updateNote(note.id, updatedContent);
      
      // Then update the UI by calling the callback with the updated content
      if (updateNoteCallback) {
        await updateNoteCallback(note.id, updatedContent);
      }
    } catch (error) {
      console.error('Error updating note:', error);
    }
  };

  const MetaIcon = ({ icon: Icon, title, type, color }) => (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        removeTag(type);
      }}
      className="group relative rounded-lg p-1.5 transition-all duration-200 hover:bg-gray-100/80 hover:shadow-sm active:scale-95"
      title={`Remove ${title}`}
    >
      <Icon className={`h-4.5 w-4.5 ${color} transition-all duration-200 group-hover:scale-105`} />
      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 transform opacity-0 transition-opacity group-hover:opacity-100">
        <span className="text-[10px] font-medium text-gray-500">{title}</span>
      </span>
    </button>
  );

  // Check if any tags or metadata are present
  const hasAnyTags = 
    isAbbreviation || 
    isBookmark || 
    isQuickLinks || 
    isPinned || 
    isEvent || 
    isMeeting || 
    isWatch || 
    isWork || 
    isStudy || 
    isResearch || 
    isIdea || 
    isImportant || 
    isDocument ||
    isTodo ||
    endDateNotice;

  // Don't render anything if no tags are present
  if (!hasAnyTags) return null;

  return (
    <div className="flex flex-col gap-3 mb-3">
      {/* Meta Icons Section */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 p-1 bg-gray-50/50 rounded-xl border border-gray-100/80">
          {isAbbreviation && (
            <MetaIcon
              icon={AdjustmentsVerticalIcon}
              title="Abbreviation"
              type="abbreviation"
              color="text-purple-500"
            />
          )}
          {isBookmark && (
            <MetaIcon
              icon={BookmarkIcon}
              title="Bookmark"
              type="bookmark"
              color="text-indigo-500"
            />
          )}
          {isQuickLinks && (
            <MetaIcon
              icon={LinkIcon}
              title="Quick Links"
              type="quick_links"
              color="text-blue-500"
            />
          )}
          {isPinned && (
            <MetaIcon
              icon={MapPinIcon}
              title="Pinned"
              type="pin"
              color="text-amber-500"
            />
          )}
          {isEvent && !isMeeting && (
            <MetaIcon
              icon={CalendarDaysIcon}
              title="Event"
              type="event"
              color="text-pink-500"
            />
          )}
          {isMeeting && (
            <MetaIcon
              icon={ClockIcon}
              title="Meeting"
              type="meeting"
              color="text-sky-500"
            />
          )}
          {isTodo && (
            <MetaIcon
              icon={CheckCircleIcon}
              title="Todo"
              type="todo"
              color="text-emerald-500"
            />
          )}
          {isWatch && (
            <MetaIcon
              icon={EyeIcon}
              title="Watch"
              type="watch"
              color="text-teal-500"
            />
          )}
          {isWork && (
            <MetaIcon
              icon={BriefcaseIcon}
              title="Work"
              type="work"
              color="text-slate-600"
            />
          )}
          {isStudy && (
            <MetaIcon
              icon={AcademicCapIcon}
              title="Study"
              type="study"
              color="text-green-500"
            />
          )}
          {isResearch && (
            <MetaIcon
              icon={BeakerIcon}
              title="Research"
              type="research"
              color="text-violet-500"
            />
          )}
          {isIdea && (
            <MetaIcon
              icon={LightBulbIcon}
              title="Idea"
              type="idea"
              color="text-amber-500"
            />
          )}
          {isImportant && (
            <MetaIcon
              icon={StarIcon}
              title="Important"
              type="important"
              color="text-rose-500"
            />
          )}
          {isDocument && (
            <MetaIcon
              icon={DocumentTextIcon}
              title="Document"
              type="document"
              color="text-slate-600"
            />
          )}
        </div>
      </div>

      {/* Todo and Deadline Info */}
      {(todoAgeNotice || endDateNotice) && (
        <div className="flex items-center gap-3 flex-wrap">
          {todoAgeNotice && (
            <button
              className="text-gray-700 text-xs tracking-wide font-medium px-3 py-1.5 rounded-lg flex items-center gap-2 bg-gray-50/80 hover:bg-gray-100/80 transition-colors duration-200 border border-gray-200/80"
              onClick={() => removeTag('todo')}
              title="Remove todo notice"
            >
              <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
              {todoAgeNotice}
            </button>
          )}

          {parsedEndDate && (
            <div className="flex items-center gap-2 bg-gray-50/80 px-3 py-1.5 rounded-lg border border-gray-200/80">
              <span className="text-xs tracking-wide text-gray-600 font-medium">
                Deadline:
              </span>
              <span
                className="text-xs tracking-wide text-gray-700 font-medium cursor-pointer hover:text-gray-900 transition-colors duration-200"
                onClick={() => setShowEndDatePickerForNoteId(note.id)}
              >
                {parsedEndDate.toLocaleDateString()}
              </span>
              <CalendarIcon
                className="h-4 w-4 text-gray-500 cursor-pointer hover:text-gray-700 transition-colors duration-200"
                onClick={() => setShowEndDatePickerForNoteId(note.id)}
                title="Edit end date"
              />
            </div>
          )}

          {endDateNotice && (
            <button
              className={`text-xs tracking-wide font-medium px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors duration-200 border ${
                isDeadlinePassed
                  ? 'bg-red-50/80 text-red-700 border-red-200/80 hover:bg-red-100/80'
                  : 'bg-blue-50/80 text-blue-700 border-blue-200/80 hover:bg-blue-100/80'
              }`}
              onClick={() => removeTag('todo')}
              title="Remove todo and deadline"
            >
              {isDeadlinePassed ? (
                <ExclamationCircleIcon className="h-4 w-4 text-red-500" />
              ) : (
                <CalendarIcon className="h-4 w-4 text-blue-500" />
              )}
              <span>{endDateNotice}</span>
            </button>
          )}

          {!parsedEndDate && isTodo && (
            <button
              className="text-xs tracking-wide font-medium px-3 py-1.5 rounded-lg flex items-center gap-2 bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100/80 transition-colors duration-200 border border-emerald-200/80"
              onClick={() => setShowEndDatePickerForNoteId(note.id)}
              title="Set deadline"
            >
              Set Deadline
              <CalendarIcon className="h-4 w-4 text-emerald-500" />
            </button>
          )}
        </div>
      )}

      {/* Meeting and Event Inputs */}
      {(isMeeting || isEvent) && (
        <div className="flex items-center gap-4 flex-wrap">
          {isMeeting && (
            <div className="flex items-center gap-3 bg-sky-50/80 px-4 py-2 rounded-xl border border-sky-200/80">
              <label className="text-sm font-medium text-sky-700">Meeting Time:</label>
              <input
                type="datetime-local"
                value={formatDateForInput(getSecondLineDate())}
                onChange={(e) => updateMeetingDate(e.target.value)}
                className="border border-sky-200 rounded-lg p-1.5 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
          )}
          {isEvent && (
            <div className="flex items-center gap-3 bg-pink-50/80 px-4 py-2 rounded-xl border border-pink-200/80">
              <label className="text-sm font-medium text-pink-700">Event Date:</label>
              <input
                type="date"
                value={formatDateOnly(getSecondLineDate())}
                onChange={(e) => updateEventDate(e.target.value)}
                className="border border-pink-200 rounded-lg p-1.5 text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-pink-500/20"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}