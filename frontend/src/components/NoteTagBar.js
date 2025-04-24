import React from 'react';
import { extractMetaTags } from '../utils/DateUtils';
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
        return <CheckCircleIcon className="h-3.5 w-3.5" />;
      case 'event':
        return <CalendarIcon className="h-3.5 w-3.5" />;
      case 'meeting':
        return <BriefcaseIcon className="h-3.5 w-3.5" />;
      case 'bookmark':
        return <BookmarkIcon className="h-3.5 w-3.5" />;
      case 'high':
        return <ExclamationCircleIcon className="h-3.5 w-3.5 text-red-500" />;
      case 'medium':
        return <ExclamationCircleIcon className="h-3.5 w-3.5 text-yellow-500" />;
      case 'low':
        return <ExclamationCircleIcon className="h-3.5 w-3.5 text-green-500" />;
      default:
        // Don't show hashtag icon for meeting-related tags
        if (type.includes('meeting')) {
          return null;
        }
        return <HashtagIcon className="h-3.5 w-3.5" />;
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
    // Extract the display text from the type (show only the last part after ::)
    const displayText = type.includes('::') ? type.split('::').pop() : type;
    const icon = getTagIcon(type);
    
    return (
      <div 
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-colors ${getTagColor(type)}`}
        title={details ? `${type}: ${details}` : type}
      >
        {icon && (
          <button
            onClick={onRemove}
            className="p-0.5 rounded-full hover:bg-gray-200/50 transition-colors"
            title={`Remove ${displayText} tag`}
          >
            {icon}
          </button>
        )}
        <span>{displayText}</span>
        <button
          onClick={onRemove}
          className="ml-1 p-0.5 rounded-full hover:bg-gray-200/50 transition-colors"
          title="Remove tag"
        >
          <XMarkIcon className="h-3 w-3" />
        </button>
      </div>
    );
  };

  return (
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
        <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-200 text-xs font-medium">
          Duplicate URL
        </div>
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
  );
}