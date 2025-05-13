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

function getLastSevenMonths() {
  const months = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push(d);
  }
  return months;
}

function getLastSevenYears() {
  const years = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    years.push(today.getFullYear() - i);
  }
  return years;
}

function getLastSevenSelectedWeekdays(selectedDays) {
  // selectedDays: array of weekday names or numbers (0=Sun, 1=Mon, ...)
  // Return last 7 dates that match selectedDays
  const days = [];
  const today = new Date();
  let count = 0;
  let d = new Date(today);
  while (count < 7) {
    const weekday = d.getDay();
    if (selectedDays.includes(weekday) || selectedDays.includes(getWeekdayName(weekday))) {
      days.unshift(new Date(d));
      count++;
    }
    d.setDate(d.getDate() - 1);
  }
  return days;
}

function getWeekdayName(idx) {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][idx];
}

function getMonthShortName(idx) {
  return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][idx];
}

function getMonthStats(completions, month, year, upToDay = null) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const endDay = upToDay || daysInMonth;
  let x = 0, y = 0;
  for (let day = 1; day <= endDay; day++) {
    const date = new Date(year, month, day);
    const dateStr = date.toISOString().slice(0, 10);
    if (completions?.[dateStr]) x++;
    y++;
  }
  return { x, y };
}

function formatMonthDateString(date) {
  // Always returns YYYY-MM-01 for the given JS Date object
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
}

export default function TrackerCard({ tracker, onToggleDay }) {
  // Determine cadence
  const cadence = tracker.cadence ? tracker.cadence.toLowerCase() : 'daily';
  let buttons = [];
  let buttonType = 'day'; // 'day', 'month', 'year'

  if (cadence === 'monthly') {
    buttons = getLastSevenMonths();
    buttonType = 'month';
  } else if (cadence === 'yearly') {
    buttons = getLastSevenYears();
    buttonType = 'year';
  } else if (cadence === 'weekly' && tracker.days && tracker.days.length > 0) {
    // tracker.days can be ['Mon', 'Wed'] or [1,3]
    let selectedDays = tracker.days.map(d => {
      if (typeof d === 'string') {
        // Try to convert to weekday index
        const idx = ['sun','mon','tue','wed','thu','fri','sat'].indexOf(d.toLowerCase().slice(0,3));
        return idx >= 0 ? idx : d;
      }
      return d;
    });
    buttons = getLastSevenSelectedWeekdays(selectedDays);
    buttonType = 'day';
  } else {
    buttons = getLastSevenDays();
    buttonType = 'day';
  }

  const [showValueModal, setShowValueModal] = useState(false);
  const [showYesNoModal, setShowYesNoModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [value, setValue] = useState('');
  const [showStats, setShowStats] = useState(false);

  const handleDateClick = (date, dateStr) => {
    const type = tracker.type.toLowerCase();
    if (type === 'value') {
      setSelectedDate(dateStr);
      setShowValueModal(true);
    } else if (type === 'yes,no' || type === 'yesno' || type === 'yes/no') {
      setSelectedDate(dateStr);
      setShowYesNoModal(true);
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

  const handleYesNo = (answer) => {
    onToggleDay(tracker.id, selectedDate, answer);
    setShowYesNoModal(false);
    setSelectedDate(null);
  };

  // Month stats
  const now = new Date();
  const currentMonthStats = getMonthStats(
    tracker.completions,
    now.getMonth(),
    now.getFullYear(),
    now.getDate()
  );
  const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const prevMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const prevMonthDays = new Date(prevMonthYear, prevMonth + 1, 0).getDate();
  const prevMonthStats = getMonthStats(
    tracker.completions,
    prevMonth,
    prevMonthYear,
    prevMonthDays
  );

  return (
    <div className="bg-white rounded-xl shadow p-4 flex flex-col items-center">
      <div className="font-semibold mb-2">{tracker.title}</div>
      <div className="flex gap-2 justify-center items-center">
        {buttons.map((item, idx) => {
          let dateStr, label, isToday = false, done = false, monthLabel = '';
          if (buttonType === 'day') {
            dateStr = item.toISOString().slice(0, 10);
            label = item.getDate();
            isToday = (item.toDateString() === now.toDateString());
            done = tracker.completions && tracker.completions[dateStr];
            // Show month label for daily/weekly/custom
            monthLabel = item.toLocaleString('default', { month: 'short', year: 'numeric' });
          } else if (buttonType === 'month') {
            dateStr = formatMonthDateString(item);
            label = getMonthShortName(item.getMonth());
            isToday = (item.getMonth() === now.getMonth() && item.getFullYear() === now.getFullYear());
            done = tracker.completions && Object.keys(tracker.completions).some(d => d.startsWith(dateStr.slice(0,7)));
            monthLabel = '';
          } else if (buttonType === 'year') {
            dateStr = item + '-01-01';
            label = item;
            isToday = (item === now.getFullYear());
            done = tracker.completions && Object.keys(tracker.completions).some(d => d.startsWith(item.toString()));
            monthLabel = '';
          }
          return (
            <div key={dateStr} className="flex flex-col items-center w-10">
              <button
                onClick={() => handleDateClick(item, dateStr)}
                className={`w-8 h-8 rounded-full border flex items-center justify-center text-sm
                  ${isToday ? 'border-blue-500 bg-blue-100' : 'border-gray-300'}
                  ${done ? 'bg-green-300' : ''}
                `}
                title={buttonType === 'day' ? item.toLocaleDateString() : (buttonType === 'month' ? item.toLocaleString('default', { month: 'long', year: 'numeric' }) : label)}
              >
                {label}
              </button>
              {monthLabel && (
                <span className="text-[10px] text-gray-400 mt-0.5 text-center w-full">{monthLabel}</span>
              )}
            </div>
          );
        })}
      </div>
      <button
        className="mt-2 text-xs text-blue-600 hover:underline focus:outline-none"
        onClick={() => setShowStats(s => !s)}
        aria-expanded={showStats}
      >
        {showStats ? 'Hide Stats' : 'Show Stats'}
      </button>
      {showStats && (
        <div className="mt-2 text-xs text-gray-600 text-center">
          <div>Month: {currentMonthStats.x} / {currentMonthStats.y}</div>
          <div>Prev: {prevMonthStats.x} / {prevMonthStats.y}</div>
        </div>
      )}
      {showValueModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-2">{tracker.title}</h2>
            {tracker.definition && (
              <div className="mb-2 text-sm text-gray-700">{tracker.definition}</div>
            )}
            {tracker.question && (
              <div className="mb-4 text-sm text-gray-700 font-medium">{tracker.question}</div>
            )}
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
      {showYesNoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-xs w-full flex flex-col items-center">
            <h2 className="text-lg font-semibold mb-4">{tracker.title}</h2>
            {tracker.question && (
              <div className="mb-4 text-sm text-gray-700 font-medium">{tracker.question}</div>
            )}
            <div className="flex gap-4">
              <button
                onClick={() => handleYesNo('yes')}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Yes
              </button>
              <button
                onClick={() => handleYesNo('no')}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                No
              </button>
            </div>
            <button
              onClick={() => setShowYesNoModal(false)}
              className="mt-4 text-xs text-gray-500 hover:underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 