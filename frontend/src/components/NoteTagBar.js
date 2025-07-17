import React from 'react';
import { extractMetaTags } from '../utils/MetaTagUtils';
import {
  XMarkIcon,
  ClockIcon,
  CheckCircleIcon,
  CalendarIcon,
  BookmarkIcon,
  FlagIcon,
  BriefcaseIcon,
  ExclamationCircleIcon,
  HashtagIcon
} from '@heroicons/react/24/solid';

export default function NoteTagBar({
  note,
  updateNote,
  duplicateUrlNoteIds,
  duplicateWithinNoteIds,
  urlShareSpaceNoteIds,
  focusMode = false,
  onNavigate,
  allNotes,
  setSearchQuery
}) {
  const metaTags = extractMetaTags(note.content);

  const removeTag = (tagType, value = '') => {
    const prefix = `meta::${tagType}`;
    const updatedContent = note.content
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        if (value) {
          return !trimmed.startsWith(`${prefix}::${value}`);
        }
        return !trimmed.startsWith(prefix);
      })
      .join('\n')
      .trim();
    updateNote(note.id, updatedContent);
  };

  const getTagIcon = (type) => {
    const baseType = type.split('::')[1] || type;
    switch (baseType) {
      case 'todo':
        return <CheckCircleIcon className="h-3 w-3" />;
      case 'event':
        return <CalendarIcon className="h-3 w-3" />;
      case 'meeting':
        return <BriefcaseIcon className="h-3 w-3" />;
      case 'bookmark':
        return <BookmarkIcon className="h-3 w-3" />;
      case 'high':
        return <ExclamationCircleIcon className="h-3 w-3 text-red-500" />;
      case 'medium':
        return <ExclamationCircleIcon className="h-3 w-3 text-yellow-500" />;
      case 'low':
        return <ExclamationCircleIcon className="h-3 w-3 text-green-500" />;
      default:
        // Don't show hashtag icon for meeting-related tags or abbreviation
        if (type.includes('meeting') || type === 'abbreviation') {
          return null;
        }
        return <HashtagIcon className="h-3 w-3" />;
    }
  };

  const handleDuplicateUrlClick = () => {
    if (!allNotes) return;
    // Find the URLs in this note
    const urlPattern = /https?:\/\/[^\s]+/g;
    const urls = note.content.match(urlPattern) || [];
    if (urls.length === 0) return;
    // Just use the first URL
    const urlSearchTerm = urls[0];
    if (typeof setSearchQuery === 'function') {
      setSearchQuery(urlSearchTerm);
    } else if (onNavigate) {
      onNavigate('notes', { searchQuery: urlSearchTerm });
    }
  };

  const getTagColor = (type) => {
    switch (type) {
      case 'todo':
        return 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100';
      case 'event':
        return 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100';
      case 'meeting':
        return 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100';
      case 'bookmark':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100';
      case 'high':
        return 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100';
      case 'medium':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100';
      case 'low':
        return 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100';
    }
  };

  const TagPill = ({ type, details = '', onRemove }) => {
    // Extract the display text from the type and capitalize it
    const displayText = type.includes('::') ? type.split('::').pop() : type;
    const capitalizedText = displayText.charAt(0).toUpperCase() + displayText.slice(1).toLowerCase();
    const icon = getTagIcon(type);
    
    return (
      <div 
        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border text-[10px] font-normal transition-colors ${getTagColor(type)}`}
        title={details ? `${type}: ${details}` : type}
      >
        {icon && (
          <button
            onClick={onRemove}
            className="p-0.5 rounded-full hover:bg-gray-200/50 transition-colors"
            title={`Remove ${capitalizedText} tag`}
          >
            {icon}
          </button>
        )}
        <span>{capitalizedText}</span>
        <button
          onClick={onRemove}
          className="ml-0.5 p-0.5 rounded-full hover:bg-gray-200/50 transition-colors"
          title="Remove tag"
        >
          <XMarkIcon className="h-2 w-2" />
        </button>
      </div>
    );
  };

  return (
    <>
      {!focusMode && (
        <div className="flex flex-wrap gap-2 px-4 pb-2">
          {/* Todo Tags with Priority */}
          {metaTags.todo.map((todoDate, index) => (
            <React.Fragment key={`todo-group-${index}`}>
              <TagPill
                key={`todo-${index}`}
                type="todo"
                details={todoDate}
                onRemove={() => removeTag('todo', todoDate)}
              />
              {metaTags.priority.map((priority) => (
                <TagPill
                  key={`${priority}-${index}`}
                  type={priority}
                  onRemove={() => removeTag(priority)}
                />
              ))}
            </React.Fragment>
          ))}

          {/* Abbreviation Tag */}
          {metaTags.abbreviations.length > 0 && (
            <TagPill
              type="abbreviation"
              onRemove={() => removeTag('abbreviation')}
            />
          )}

          {/* Bookmark Tag */}
          {metaTags.bookmarks.length > 0 && (
            <TagPill
              type="bookmark"
              onRemove={() => removeTag('bookmark')}
            />
          )}

          {/* Event Tags */}
          {metaTags.events.map((eventDate, index) => (
            <TagPill
              key={`event-${index}`}
              type="event"
              details={eventDate}
              onRemove={() => removeTag('event', eventDate)}
            />
          ))}

          {/* Meeting Tags */}
          {metaTags.meetings.map((meetingDate, index) => (
            <TagPill
              key={`meeting-${index}`}
              type="meeting"
              details={meetingDate}
              onRemove={() => removeTag('meeting', meetingDate)}
            />
          ))}

          {/* Date Tags */}
          {metaTags.dates.map((date, index) => (
            <TagPill
              key={`date-${index}`}
              type="due"
              details={date}
              onRemove={() => removeTag('end_date', date)}
            />
          ))}

          {/* Other Meta Tags */}
          {metaTags.other.map((tag, index) => {
            const parts = tag.split('::');
            return (
              <TagPill
                key={`other-${index}`}
                type={parts[1]}
                details={parts.slice(2).join('::')}
                onRemove={() => removeTag(parts[1], parts.slice(2).join(':'))}
              />
            );
          })}

          {/* Duplicate URL Indicators */}
          {duplicateUrlNoteIds.has(note.id) && (
            <button
              onClick={handleDuplicateUrlClick}
              className="inline-flex items-center px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200 text-xs font-medium hover:bg-orange-100 transition-colors cursor-pointer"
              title="Click to view all notes with duplicate URLs"
            >
              Duplicate URL
            </button>
          )}

          {/* Duplicate Within Note Indicators */}
          {duplicateWithinNoteIds.has(note.id) && (
            <>
              <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 text-xs font-medium">
                Duplicate URL In Note
              </div>
              <button
                onClick={() => {
                  const seen = new Set();
                  const cleanedContent = note.content.replace(/https?:\/\/[^\s)]+/g, url => {
                    if (seen.has(url)) return '';
                    seen.add(url);
                    return url;
                  });
                  updateNote(note.id, cleanedContent);
                }}
                className="inline-flex items-center px-2.5 py-1 rounded-full bg-red-600 text-white text-xs font-medium hover:bg-red-700 transition-colors"
              >
                Remove Duplicates
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}