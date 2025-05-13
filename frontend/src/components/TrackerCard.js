import React from 'react';

function getDayOffsets(centerDate) {
  // Returns array of 7 dates: [-3, -2, -1, 0, +1, +2, +3]
  const days = [];
  for (let i = -3; i <= 3; i++) {
    const d = new Date(centerDate);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

export default function TrackerCard({ tracker, onToggleDay }) {
  const today = new Date();
  const days = getDayOffsets(today);

  return (
    <div className="bg-white rounded-xl shadow p-4 flex flex-col items-center">
      <div className="font-semibold mb-2">{tracker.title}</div>
      <div className="flex gap-2">
        {days.map((date, idx) => {
          const dateStr = date.toISOString().slice(0, 10);
          const isToday = idx === 3;
          const done = tracker.completions?.[dateStr];
          return (
            <button
              key={dateStr}
              onClick={() => onToggleDay(tracker.id, dateStr)}
              className={`w-8 h-8 rounded-full border flex items-center justify-center text-sm
                ${isToday ? 'border-blue-500 bg-blue-100' : 'border-gray-300'}
                ${done ? 'bg-green-300' : ''}
              `}
              title={date.toLocaleDateString()}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
} 