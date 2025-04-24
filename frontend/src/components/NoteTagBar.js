import React from 'react';
import { extractMetaTags } from '../utils/DateUtils';

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

  const TagButton = ({ label, details = '', onRemove }) => (
    <button 
      className="bg-gray-300 text-gray-800 text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1 hover:bg-gray-400"
      title={details ? `${label}: ${details}` : label}
    >
      {label}
      <span
        onClick={onRemove}
        className="ml-1 text-purple-600 hover:text-purple-900 cursor-pointer"
        title="Remove tag"
      >
        ×
      </span>
    </button>
  );

  return (
    <div className="flex flex-wrap gap-2 px-4 pb-2">
      {/* Priority Tags */}
      {metaTags.priority.map((priority) => (
        <TagButton
          key={priority}
          label={priority}
          onRemove={() => removeTag(priority)}
        />
      ))}

      {/* Todo Tags */}
      {metaTags.todo.map((todoDate, index) => (
        <TagButton
          key={`todo-${index}`}
          label="todo"
          details={todoDate}
          onRemove={() => removeTag('todo', todoDate)}
        />
      ))}

      {/* Abbreviation Tag */}
      {metaTags.abbreviations.length > 0 && (
        <TagButton
          label="abbreviation"
          onRemove={() => removeTag('abbreviation')}
        />
      )}

      {/* Bookmark Tag */}
      {metaTags.bookmarks.length > 0 && (
        <TagButton
          label="bookmark"
          onRemove={() => removeTag('bookmark')}
        />
      )}

      {/* Event Tags */}
      {metaTags.events.map((eventDate, index) => (
        <TagButton
          key={`event-${index}`}
          label="event"
          details={eventDate}
          onRemove={() => removeTag('event', eventDate)}
        />
      ))}

      {/* Meeting Tags */}
      {metaTags.meetings.map((meetingDate, index) => (
        <TagButton
          key={`meeting-${index}`}
          label="meeting"
          details={meetingDate}
          onRemove={() => removeTag('meeting', meetingDate)}
        />
      ))}

      {/* Date Tags */}
      {metaTags.dates.map((date, index) => (
        <TagButton
          key={`date-${index}`}
          label="due"
          details={date}
          onRemove={() => removeTag('end_date', date)}
        />
      ))}

      {/* Other Meta Tags */}
      {metaTags.other.map((tag, index) => {
        const parts = tag.split('::');
        return (
          <TagButton
            key={`other-${index}`}
            label={parts[1]}
            details={parts.slice(2).join('::')}
            onRemove={() => removeTag(parts[1], parts.slice(2).join(':'))}
          />
        );
      })}

      {/* Duplicate URL Indicators */}
      {duplicateUrlNoteIds.has(note.id) && (
        <span className="bg-gray-300 text-gray-800 text-xs font-semibold px-3 py-1 rounded-full hover:bg-gray-400">
          Duplicate URL
        </span>
      )}

      {/* Duplicate Within Note Indicators */}
      {duplicateWithinNoteIds.has(note.id) && (
        <>
          <span className="bg-gray-300 text-gray-800 text-xs font-semibold px-3 py-1 rounded-full hover:bg-gray-400">
            Duplicate Url In Note
          </span>
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
            className="ml-2 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
          >
            Remove Duplicates
          </button>
        </>
      )}
    </div>
  );
}