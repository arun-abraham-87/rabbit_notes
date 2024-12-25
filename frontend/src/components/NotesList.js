import React from 'react';
import moment from 'moment';

const NotesList = ({ notes }) => {



  const formatDate = (dateString) => {
    // Parse the date and get the relative time
    const noteDate = moment(dateString, "DD/MM/YYYY, h:mm:ss a");

    // Return the formatted date with relative time
    return `${dateString} (${noteDate.fromNow()})`;
  };




  const processContent = (content) => {
    if (typeof content !== 'string') {
      return content; // Return content as is if it's not a string
    }

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    let isFirstTextSegment = true;

    return content.split(urlRegex).map((part, index) => {
      if (urlRegex.test(part)) {
        try {
          const url = new URL(part);
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-800"
            >
              {url.hostname}
            </a>
          );
        } catch {
          return part; // If URL parsing fails, return the original part
        }
      } else if (isFirstTextSegment && typeof part === 'string') {
        isFirstTextSegment = false;
        return part.charAt(0).toUpperCase() + part.slice(1); // Capitalize first text segment
      }
      return part; // Return subsequent non-URL parts as-is
    });
  };



  return (
    <div>
      {notes.map((note) => (
        <div
          key={note.id}
          className="mb-6 rounded-lg border bg-card text-card-foreground shadow-sm relative group transition-shadow duration-200"
        >
          <div className="p-4">
            <div className="prose prose-sm dark:prose-invert">
              <p>{processContent(note.content)}</p>
            </div>
            <div className="tags">{note.tags.join(', ')}</div>
            <div className="text-sm text-muted-foreground mt-2">
              {formatDate(note.created_datetime)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotesList;
