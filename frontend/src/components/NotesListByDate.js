import React from "react";
import { processContent } from '../utils/TextUtils';
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
    <div>
      {Object.keys(groupedNotes).map((date, index) => (
        <div
          key={date}
          className="flex p-5 mb-5 rounded-xl border border-gray-200 bg-white shadow hover:shadow-md transition-shadow duration-200 items-start"
        >
          <div className="p-6 flex flex-col min-w-64 bg-gray-50 border rounded-lg text-sm text-gray-800 items-center text-center justify-center">
            <div className="flex flex-col items-center text-center">
            <div className="text-sm font-semibold">{new Date(date).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
            <div className="text-xs text-gray-700">
              {getDayOfWeek(new Date(date))}
            </div>
          </div>
            <div className="text-xs text-gray-700 p-1">{getAge(new Date(date))}</div>
          </div>
          <div className="flex-1 OneDayNoteContainer">
            {groupedNotes[date].map((note, noteIndex) => {
              const contentLines = note.content.split('\n');
              return (
                <div
                  key={noteIndex}
                  className="p-4 flex items-start gap-4 border-b last:border-none bg-gray-50 hover:bg-gray-100 transition"
                >
                  <div className="text-xs text-purple-600 font-medium min-w-[50px]">{note.time}</div>
                  <div className="pl-6">
                    <div className="text-sm text-gray-800 whitespace-pre-wrap space-y-1">
                      {contentLines
                        .filter(line => !line.startsWith('meta::'))
                        .map((line, idx) => {
                          if (line.startsWith('###')) {
                            return <h1 key={idx} className="text-lg font-bold text-gray-900">{line.replace(/^###/, '').replace(/#+$/, '').trim()}</h1>;
                          } else if (line.startsWith('##')) {
                            return <h2 key={idx} className="text-base font-semibold text-gray-800">{line.replace(/^##(?!#)/, '').replace(/#+$/, '').trim()}</h2>;
                          } else if (line.startsWith('#') && !line.startsWith('##')) {
                            return null;
                          }
                          const markdownMatch = line.match(/\[([^\]]+)\]\((https?:\/\/[^\s]+)\)/);
                          if (markdownMatch) {
                            const [_, label, url] = markdownMatch;
                            return (
                              <div key={idx}>
                                <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                  {label}
                                </a>
                              </div>
                            );
                          }
                          const urlMatch = line.match(/(.*)\s(https?:\/\/[^\s]+)/);
                          if (urlMatch) {
                            const [_, label, url] = urlMatch;
                            return (
                              <div key={idx}>
                                <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                  {label || url}
                                </a>
                              </div>
                            );
                          }
                          return <div key={idx}>{processContent(line, searchQuery)}</div>;
                        })}
                    </div>
                    <div className="flex flex-wrap gap-1 mb-1">
                      {contentLines.filter(line => line.startsWith('meta::')).map((tag, idx) => (
                        <span key={idx} className="text-sm bg-gray-200 text-gray-800 px-2 py-0.5 rounded-full">{tag.split('::')[1]}</span>
                      ))}
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
