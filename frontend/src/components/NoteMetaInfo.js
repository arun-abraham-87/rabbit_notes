import React from 'react';
import { updateNoteById as updateNote } from '../utils/ApiUtils';
import { getAgeInStringFmt } from '../utils/DateUtils';

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
    todoAgeNotice = `Open for: ${getAgeInStringFmt(todoDate)}`;
  }
  if (parsedEndDate) {
    const now = new Date();
    const diffMs = parsedEndDate - now;
    if (diffMs > 0) {
      endDateNotice = `Deadline in ${getAgeInStringFmt(parsedEndDate)}`;
    } else {
      endDateNotice = `Deadline passed ${getAgeInStringFmt(parsedEndDate)} ago`;
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

  // Helper functions to check note type
  const isMeetingNote = (note) => note.content.includes('meta::meeting::');
  const isEventNote = (note) => note.content.includes('meta::event::');
  const isRegularNote = (note) => !isMeetingNote(note) && !isEventNote(note);

  // Only show date editing options for regular notes
  const showDateOptions = isRegularNote(note);

  return (
    <div className="flex flex-col gap-3 mb-3">
      {/* Todo and Deadline Info */}
      {(todoAgeNotice || endDateNotice) && !isMeeting && !isEvent && (
        <div className="flex items-center gap-3 flex-wrap">
          {todoAgeNotice && (
            <button
              className="text-gray-700 text-xs tracking-wide font-medium px-3 py-1.5 rounded-lg flex items-center gap-2 bg-gray-50/80 hover:bg-gray-100/80 transition-colors duration-200 border border-gray-200/80"
              onClick={() => removeTag('todo')}
              title="Remove todo notice"
            >
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
                {endDateNotice}
              </span>
            </div>
          )}

          {!parsedEndDate && !isMeeting && !isEvent && (
            <button
              onClick={() => setShowEndDatePickerForNoteId(note.id)}
              className="text-gray-700 text-xs tracking-wide font-medium px-3 py-1.5 rounded-lg flex items-center gap-2 bg-gray-50/80 hover:bg-gray-100/80 transition-colors duration-200 border border-gray-200/80"
            >
              Set Deadline
            </button>
          )}
        </div>
      )}
    </div>
  );
}