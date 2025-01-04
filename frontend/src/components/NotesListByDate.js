import React from "react";
import { processContent } from '../utils/TextUtils';
import { getAge, getDayOfWeek } from '../utils/DateUtils';

function NotesListByDate({ notes, searchQuery }) {
  const groupNotesByDate = (notes) => {
    const parseDateTime = (dateTimeString) => {
      const [date, timePart] = dateTimeString.split(", ");
      const time = timePart.toLowerCase();
      return { date, time };
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
          className={`flex justify-content p-4 mb-6 rounded-lg border bg-card text-card-foreground shadow-sm relative group transition-shadow duration-200 items-center `}
        >
          <div className="p-6 flex flex-col min-w-64 flex-col self-start">
            <div className="flex self-start">
              <div className="text-sm">{date}</div>
              <div className="text-xs text-gray-700 p-1">
                {getDayOfWeek(date)}
              </div>
            </div>
            <div className="text-xs text-gray-700 p-1">{getAge(date)}</div>
          </div>
          <div className="flex-1 OneDayNoteContainer">
            {groupedNotes[date].map((note, noteIndex) => (
              <div
                key={noteIndex}
                className={`p-6 flex ${noteIndex % 2 === 0 ? "bg-gray-100" : "bg-white"
                  }`}
              >
                <div className="text-xs text-gray-700 p-1">{note.time}</div>
                <div className="pl-6">
                  <pre>{processContent(note.content, searchQuery)}</pre>
                </div>
              </div>
            ))}

          </div>
        </div>
      ))}
    </div>
  );
}

export default NotesListByDate;
