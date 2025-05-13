import React, { useState } from 'react';

function getLastSevenDays() {
  const days = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  return days;
}

export default function TrackerCard({ tracker, onToggleDay }) {
  const days = getLastSevenDays();
  const [showValueModal, setShowValueModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [value, setValue] = useState('');

  const handleDateClick = (date, dateStr) => {
    if (tracker.type.toLowerCase() === 'value') {
      setSelectedDate(dateStr);
      setShowValueModal(true);
    } else {
      onToggleDay(tracker.id, dateStr);
    }
  };

  const handleValueSubmit = () => {
    if (value) {
      onToggleDay(tracker.id, selectedDate, value);
      setShowValueModal(false);
      setValue('');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow p-4 flex flex-col items-center">
      <div className="font-semibold mb-2">{tracker.title}</div>
      <div className="flex gap-2">
        {days.map((date, idx) => {
          const dateStr = date.toISOString().slice(0, 10);
          const isToday = idx === 6;
          const done = tracker.completions?.[dateStr];
          return (
            <button
              key={dateStr}
              onClick={() => handleDateClick(date, dateStr)}
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
      {showValueModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Enter Value</h2>
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              placeholder="Enter value"
            />
            <div className="flex justify-end gap-4 mt-4">
              <button
                onClick={() => setShowValueModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleValueSubmit}
                className="px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 rounded-lg transition-colors"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 