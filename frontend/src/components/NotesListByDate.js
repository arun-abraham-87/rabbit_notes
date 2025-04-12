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
          className="flex p-5 mb-5 rounded-xl border border-gray-200 bg-white shadow hover:shadow-md transition-shadow duration-200 items-start"
        >
          <div className="p-6 flex flex-col min-w-64 bg-gray-50 border rounded-lg text-sm text-gray-800">
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
                className="p-4 flex items-start gap-4 border-b last:border-none bg-gray-50 hover:bg-gray-100 transition"
              >
                <div className="text-xs text-purple-600 font-medium min-w-[50px]">{note.time}</div>
                <div className="pl-6">
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap">{processContent(note.content, searchQuery)}</pre>
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
