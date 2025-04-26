import React from "react";
import { parseNoteContent } from '../utils/TextUtils';
import { getAge, getDayOfWeek } from '../utils/DateUtils';

function NotesListByDate({ notes, searchQuery }) {
  const groupNotesByDate = (notes) => {
    const parseDateTime = (dateTimeString) => {
      const [datePart, timePart] = dateTimeString.split(", ");
      const [day, month, year] = datePart.split("/").map(Number);
      const isoDate = new Date(year, month - 1, day).toISOString().split("T")[0];
      return { date: isoDate, time: timePart.toLowerCase() };
    };

    const groupedNotes = notes.reduce((acc, note) => {
      const { date, time } = parseDateTime(note.created_datetime);
      const noteWithTime = { ...note, time };

      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(noteWithTime);
      return acc;
    }, {});

    Object.keys(groupedNotes).forEach((date) => {
      groupedNotes[date].sort((a, b) =>
        new Date(`1970-01-01T${b.time}`) - new Date(`1970-01-01T${a.time}`)
      );
    });

    return Object.keys(groupedNotes)
      .sort((a, b) => new Date(b) - new Date(a))
      .reduce((acc, date) => {
        acc[date] = groupedNotes[date];
        return acc;
      }, {});
  };

  const groupedNotes = groupNotesByDate(notes);

  return (
    <div className="space-y-6">
      {Object.keys(groupedNotes).map((date, index) => (
        <div
          key={date}
          className="flex flex-col md:flex-row gap-6 p-6 rounded-2xl border border-gray-200/80 bg-white shadow-sm hover:shadow-md transition-all duration-300"
        >
          {/* Date Card */}
          <div className="flex md:flex-col items-center md:items-stretch gap-4 md:gap-2 p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-100/80 shadow-sm min-w-[200px]">
            <div className="flex flex-col items-center text-center">
              <div className="text-lg font-medium text-gray-900">
                {new Date(date).toLocaleDateString('en-AU', { day: 'numeric', month: 'long' })}
              </div>
              <div className="text-sm font-medium text-gray-900">
                {new Date(date).toLocaleDateString('en-AU', { year: 'numeric' })}
              </div>
              <div className="text-sm font-medium text-indigo-600 mt-1">
                {getDayOfWeek(new Date(date))}
              </div>
            </div>
            <div className="text-sm text-gray-600 bg-white/50 px-3 py-1.5 rounded-lg border border-gray-100/80 text-center w-full">
              {getAge(new Date(date))}
            </div>
          </div>

          {/* Notes Container */}
          <div className="flex-1 space-y-4">
            {groupedNotes[date].map((note, noteIndex) => {
              const contentLines = note.content.split('\n');
              const nonMetaLines = contentLines.filter(line => !line.startsWith('meta::'));
              
              return (
                <div
                  key={noteIndex}
                  className="group flex items-start gap-4 p-4 rounded-xl bg-gradient-to-br from-gray-50/50 to-white border border-gray-100/80 hover:shadow-sm transition-all duration-200"
                >
                  {/* Time */}
                  <div className="flex flex-col items-center">
                    <div className="text-xs font-medium text-indigo-600 bg-indigo-50/80 px-3 py-1.5 rounded-lg border border-indigo-100/80">
                      {note.time}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="text-sm text-gray-800 whitespace-pre-wrap space-y-2">
                      {nonMetaLines.map((line, idx) => {
                        if (line.startsWith('###')) {
                          return (
                            <h1 key={idx} className="text-lg font-bold text-gray-900 pb-1">
                              {line.replace(/^###/, '').replace(/#+$/, '').trim()}
                            </h1>
                          );
                        } else if (line.startsWith('##')) {
                          return (
                            <h2 key={idx} className="text-base font-semibold text-gray-800 pb-1">
                              {line.replace(/^##(?!#)/, '').replace(/#+$/, '').trim()}
                            </h2>
                          );
                        } else if (line.startsWith('#') && !line.startsWith('##')) {
                          return null;
                        }

                        const markdownMatch = line.match(/\[([^\]]+)\]\((https?:\/\/[^\s]+)\)/);
                        if (markdownMatch) {
                          const [_, label, url] = markdownMatch;
                          return (
                            <div key={idx} className="py-0.5">
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 hover:text-indigo-700 hover:underline transition-colors duration-200"
                              >
                                {label}
                              </a>
                            </div>
                          );
                        }

                        const urlMatch = line.match(/(.*)\s(https?:\/\/[^\s]+)/);
                        if (urlMatch) {
                          const [_, label, url] = urlMatch;
                          return (
                            <div key={idx} className="py-0.5">
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 hover:text-indigo-700 hover:underline transition-colors duration-200"
                              >
                                {label || url}
                              </a>
                            </div>
                          );
                        }

                        return (
                          <div key={idx} className="py-0.5 leading-relaxed">
                            {parseNoteContent({ content: line, searchTerm: searchQuery })}
                          </div>
                        );
                      })}
                    </div>

                    {/* Meta Tags */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {contentLines
                        .filter(line => line.startsWith('meta::'))
                        .map((tag, idx) => {
                          const [_, type, value] = tag.split('::');
                          return (
                            <span
                              key={idx}
                              className="text-xs font-medium px-2.5 py-1 rounded-lg bg-gray-100/80 text-gray-700 border border-gray-200/80"
                            >
                              {type}
                            </span>
                          );
                        })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default NotesListByDate;
