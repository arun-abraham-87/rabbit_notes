import React, { useState } from 'react';
import { updateNoteById, deleteNoteById } from '../utils/ApiUtils';
import { ChartBarIcon, CalendarIcon, ArrowPathIcon, PencilIcon, ClockIcon } from '@heroicons/react/24/outline';
import { Line } from 'react-chartjs-2';

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

function getLastThreeYears() {
  const years = [];
  const today = new Date();
  for (let i = 2; i >= 0; i--) {
    years.push(today.getFullYear() - i);
  }
  return years;
}

function getLastSevenSelectedWeekdays(selectedDays) {
  // selectedDays: array of weekday indices (0=Sun, 1=Mon, ...)
  // Return last 7 dates that match selectedDays, oldest first (leftmost is oldest)
  const days = [];
  const today = new Date();
  let d = new Date(today.getFullYear(), today.getMonth(), today.getDate()); // always midnight local
  let safety = 0;
  while (days.length < 7 && safety < 366) { // never go back more than 1 year
    if (selectedDays.includes(d.getDay())) {
      days.unshift(new Date(d.getFullYear(), d.getMonth(), d.getDate())); // clone, push oldest to front
    }
    d.setDate(d.getDate() - 1);
    safety++;
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

export default function TrackerCard({ tracker, onToggleDay, answers = [], onEdit, isFocusMode }) {
  // Determine cadence
  const cadence = tracker.cadence ? tracker.cadence.toLowerCase() : 'daily';
  let buttons = [];
  let buttonType = 'day'; // 'day', 'month', 'year'

  if (cadence === 'monthly') {
    buttons = getLastSevenMonths();
    buttonType = 'month';
  } else if (cadence === 'yearly') {
    buttons = getLastThreeYears();
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
    }).filter(d => typeof d === 'number' && d >= 0 && d <= 6);
    buttons = getLastSevenSelectedWeekdays(selectedDays);
    buttonType = 'day';
  } else {
    buttons = getLastSevenDays();
    buttonType = 'day';
  }

  // Helper to find answer note for a date
  function getAnswerForDate(dateStr) {
    return answers.find(ans => ans.date === dateStr);
  }

  const [showValueModal, setShowValueModal] = useState(false);
  const [showYesNoModal, setShowYesNoModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [value, setValue] = useState('');
  const [showStats, setShowStats] = useState(false);
  const [existingAnswer, setExistingAnswer] = useState(null);
  const [showLastValues, setShowLastValues] = useState(false);
  const [showMonthlyModal, setShowMonthlyModal] = useState(false);
  const [monthlyModalMonth, setMonthlyModalMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showLastValuesModal, setShowLastValuesModal] = useState(false);
  const [dateOffset, setDateOffset] = useState(0);

  const handleDateClick = (date, dateStr) => {
    const type = tracker.type.toLowerCase();
    const answer = getAnswerForDate(dateStr);
    setExistingAnswer(answer);
    if (type === 'value') {
      setSelectedDate(dateStr);
      setValue(answer ? answer.value : '');
      setShowValueModal(true);
    } else if (type === 'yes,no' || type === 'yesno' || type === 'yes/no') {
      setSelectedDate(dateStr);
      setShowYesNoModal(true);
    } else {
      onToggleDay(tracker.id, dateStr);
    }
  };

  const handleValueSubmit = async () => {
    if (!value) return;
    if (existingAnswer && existingAnswer.id) {
      // Update existing note
      await updateNoteById(existingAnswer.id, value);
    } else {
      onToggleDay(tracker.id, selectedDate, value);
    }
    setShowValueModal(false);
    setValue('');
    setExistingAnswer(null);
  };

  const handleCancelValueModal = () => {
    setShowValueModal(false);
    setValue('');
    setExistingAnswer(null);
  };

  const handleYesNo = async (answer) => {
    if (existingAnswer && existingAnswer.id) {
      // Update existing note
      await updateNoteById(existingAnswer.id, answer);
    } else {
      onToggleDay(tracker.id, selectedDate, answer);
    }
    setShowYesNoModal(false);
    setSelectedDate(null);
    setExistingAnswer(null);
  };

  const handleCancelYesNoModal = () => {
    setShowYesNoModal(false);
    setSelectedDate(null);
    setExistingAnswer(null);
  };

  const handleRemoveAcknowledgement = async () => {
    if (existingAnswer && existingAnswer.id) {
      await deleteNoteById(existingAnswer.id);
      // Refresh UI by toggling the day (removes completion)
      onToggleDay(tracker.id, selectedDate, null);
    }
    setShowValueModal(false);
    setShowYesNoModal(false);
    setValue('');
    setExistingAnswer(null);
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

  // Helper to get all dates in a given month
  function getAllDatesInMonth(monthDate) {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const dates = [];
    for (let day = 1; day <= daysInMonth; day++) {
      dates.push(new Date(year, month, day));
    }
    return dates;
  }

  // Helper to get the correct 7 buttons based on cadence and offset
  function getButtonsWithOffset() {
    if (buttonType === 'day') {
      if (cadence === 'weekly' && tracker.days && tracker.days.length > 0) {
        // Custom weekly: precompute last 35 selected weekdays
        let selectedDays = tracker.days.map(d => {
          if (typeof d === 'string') {
            const idx = ['sun','mon','tue','wed','thu','fri','sat'].indexOf(d.toLowerCase().slice(0,3));
            return idx >= 0 ? idx : d;
          }
          return d;
        }).filter(d => typeof d === 'number' && d >= 0 && d <= 6);
        // Get last 35 occurrences
        const all = [];
        const today = new Date();
        let d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        let safety = 0;
        while (all.length < 35 && safety < 366) {
          if (selectedDays.includes(d.getDay())) {
            all.unshift(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
          }
          d.setDate(d.getDate() - 1);
          safety++;
        }
        // Use offset to select window of 7
        const start = all.length - 7 - dateOffset * 7;
        const end = all.length - dateOffset * 7;
        return all.slice(Math.max(0, start), Math.max(0, end));
      } else {
        // Daily or default
        const days = [];
        const today = new Date();
        for (let i = 6 + dateOffset * 7; i >= 0 + dateOffset * 7; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          days.push(d);
        }
        return days;
      }
    } else if (buttonType === 'month') {
      const months = [];
      const today = new Date();
      for (let i = 6 + dateOffset * 7; i >= 0 + dateOffset * 7; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        months.push(d);
      }
      return months;
    } else if (buttonType === 'year') {
      const years = [];
      const today = new Date();
      for (let i = 2 + dateOffset * 3; i >= 0 + dateOffset * 3; i--) {
        years.push(today.getFullYear() - i);
      }
      return years;
    }
    return [];
  }

  // --- Robust current streak calculation ---
  function getCurrentStreak(answers) {
    if (!answers || answers.length === 0) return 0;
    // Normalize to local YYYY-MM-DD
    const dateSet = new Set(answers.map(a => {
      const d = new Date(a.date);
      d.setHours(0,0,0,0);
      return d.toISOString().slice(0,10);
    }));
    let streak = 0;
    let d = new Date();
    d.setHours(0,0,0,0);
    // If today is not checked in, streak is 0
    if (!dateSet.has(d.toISOString().slice(0,10))) return 0;
    while (dateSet.has(d.toISOString().slice(0,10))) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }
  const currentStreak = getCurrentStreak(answers);

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">{tracker.title}</h3>
            {currentStreak > 1 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 ml-1" title="Current streak">
                🔥 {currentStreak}-day streak
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600">{tracker.question}</p>
        </div>
        {!isFocusMode && (
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(tracker)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              title="Edit tracker"
            >
              <PencilIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setShowStatsModal(true)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              title="Show stats"
            >
              <ChartBarIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setShowMonthlyModal(true)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              title="Show monthly check-ins"
            >
              <CalendarIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setShowLastValuesModal(true)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              title="Show last 7 values"
            >
              <ClockIcon className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
      <div className="flex gap-2 justify-center items-center">
        {/* Left chevron for previous 7 */}
        <button
          className="p-1 rounded-full hover:bg-gray-200 focus:outline-none"
          onClick={() => setDateOffset(offset => Math.max(0, offset + 1))}
          aria-label="Show previous 7"
        >
          <span className="text-xl">&#8592;</span>
        </button>
        {getButtonsWithOffset().map((item, idx) => {
          let dateStr, label, isToday = false, done = false, monthLabel = '', weekdayLabel = '';
          if (buttonType === 'day') {
            dateStr = item.toISOString().slice(0, 10);
            label = item.getDate();
            isToday = (item.toDateString() === now.toDateString());
            // Find answer for this date
            const answerObj = answers.find(ans => ans.date === dateStr);
            if (tracker.type && tracker.type.toLowerCase().includes('yes')) {
              // Yes/No tracker
              if (answerObj && typeof answerObj.answer === 'string' && answerObj.answer.toLowerCase() === 'yes') {
                done = 'green';
              } else if (answerObj && typeof answerObj.answer === 'string' && answerObj.answer.toLowerCase() === 'no') {
                done = 'red';
              } else {
                done = false;
              }
            } else if (tracker.type && tracker.type.toLowerCase() === 'value') {
              // Value tracker
              done = answerObj ? 'green' : false;
            } else {
              // Other types
              done = answerObj ? 'green' : false;
            }
            // For weekly cadence, always show weekday label above
            if (cadence === 'weekly') {
              weekdayLabel = item.toLocaleString('default', { weekday: 'short' });
            } else {
              weekdayLabel = item.toLocaleString('default', { weekday: 'short' });
            }
            monthLabel = item.toLocaleString('default', { month: 'short', year: 'numeric' });
          } else if (buttonType === 'month') {
            dateStr = formatMonthDateString(item);
            label = getMonthShortName(item.getMonth());
            isToday = (item.getMonth() === now.getMonth() && item.getFullYear() === now.getFullYear());
            done = false;
            monthLabel = '';
            weekdayLabel = '';
          } else if (buttonType === 'year') {
            dateStr = item + '-01-01';
            label = item;
            isToday = (item === now.getFullYear());
            done = false;
            monthLabel = '';
            weekdayLabel = '';
          }
          return (
            <div key={dateStr} className={`flex flex-col items-center w-10${buttonType === 'year' ? ' mx-1' : ''}`}>
              {weekdayLabel && (
                <span className="text-[10px] text-gray-400 mb-0.5 text-center w-full">{weekdayLabel}</span>
              )}
              <button
                onClick={() => handleDateClick(item, dateStr)}
                className={`w-8 h-8 border flex items-center justify-center text-sm rounded-full
                  ${isToday ? 'border-blue-500 bg-blue-100' : 'border-gray-300'}
                  ${done === 'green' ? 'bg-green-300' : ''}
                  ${done === 'red' ? 'bg-red-300' : ''}
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
        {/* Refresh icon to reset to default if offset > 0 */}
        {dateOffset > 0 && (
          <button
            className="p-1 rounded-full hover:bg-gray-200 focus:outline-none"
            onClick={() => setDateOffset(0)}
            aria-label="Reset to current"
          >
            <ArrowPathIcon className="h-5 w-5 text-gray-500" />
          </button>
        )}
      </div>
      {/* Monthly Check-ins Modal */}
      {showMonthlyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full shadow-lg relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={() => setShowMonthlyModal(false)}
              aria-label="Close"
            >
              &times;
            </button>
            <div className="flex items-center justify-center mb-4 gap-4">
              <button
                className="p-2 rounded-full hover:bg-gray-200"
                onClick={() => setMonthlyModalMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
                aria-label="Previous Month"
              >
                <span className="text-xl">&#8592;</span>
              </button>
              <h2 className="text-lg font-semibold text-center">
                Monthly Check-ins: {monthlyModalMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h2>
              <button
                className="p-2 rounded-full hover:bg-gray-200"
                onClick={() => setMonthlyModalMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
                aria-label="Next Month"
              >
                <span className="text-xl">&#8594;</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-2 justify-center bg-blue-50 p-4 rounded-lg">
              {getAllDatesInMonth(monthlyModalMonth).map(dateObj => {
                const dateStr = dateObj.toISOString().slice(0, 10);
                const answerObj = answers.find(ans => ans.date === dateStr);
                let color = '';
                if (tracker.type && tracker.type.toLowerCase().includes('yes')) {
                  if (answerObj && typeof answerObj.answer === 'string' && answerObj.answer.toLowerCase() === 'yes') {
                    color = 'bg-green-300';
                  } else if (answerObj && typeof answerObj.answer === 'string' && answerObj.answer.toLowerCase() === 'no') {
                    color = 'bg-red-300';
                  }
                } else if (tracker.type && tracker.type.toLowerCase() === 'value') {
                  color = answerObj ? 'bg-green-300' : '';
                } else {
                  color = answerObj ? 'bg-green-300' : '';
                }
                return (
                  <div key={dateStr} className={`flex flex-col items-center w-10`}>
                    <span className="text-[10px] text-gray-400 mb-0.5 text-center w-full">{dateObj.toLocaleString('default', { weekday: 'short' })}</span>
                    <div
                      className={`w-8 h-8 rounded-full border flex items-center justify-center text-sm ${color} border-gray-300`}
                      title={dateObj.toLocaleDateString()}
                    >
                      {dateObj.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {/* Stats Modal */}
      {showStatsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-lg relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={() => setShowStatsModal(false)}
              aria-label="Close"
            >
              &times;
            </button>
            <h2 className="text-lg font-semibold mb-4 text-center">Stats</h2>
            <EnhancedStats answers={answers} tracker={tracker} />
          </div>
        </div>
      )}
      {/* Last 7 Values Modal */}
      {showLastValuesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-lg relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={() => setShowLastValuesModal(false)}
              aria-label="Close"
            >
              &times;
            </button>
            <h2 className="text-lg font-semibold mb-4 text-center">Last 7 Values</h2>
            <div className="mt-2 text-xs text-gray-600 text-center w-full">
              {(answers || [])
                .filter(ans => ans.value !== undefined || ans.answer !== undefined)
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 7)
                .map(ans => (
                  <div key={ans.id || ans.date} className="flex justify-between px-2 py-1 border-b last:border-b-0">
                    <span className="text-[11px] text-gray-500">{new Date(ans.date).toLocaleDateString()}</span>
                    <span className="font-mono text-[13px] text-gray-800">
                      {ans.value !== undefined ? ans.value : (ans.answer !== undefined ? (ans.answer === 'yes' ? 'Yes' : ans.answer === 'no' ? 'No' : ans.answer) : '')}
                    </span>
                  </div>
                ))}
              {(!answers || answers.filter(ans => ans.value !== undefined || ans.answer !== undefined).length === 0) && (
                <div className="text-gray-400 italic">No values entered yet.</div>
              )}
            </div>
          </div>
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
              {existingAnswer && (
                <button
                  onClick={handleRemoveAcknowledgement}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Remove Acknowledgement
                </button>
              )}
              <button
                onClick={handleCancelValueModal}
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
                className={`px-4 py-2 rounded-lg transition-colors
                  ${existingAnswer && existingAnswer.answer === 'yes'
                    ? 'bg-green-500 text-white'
                    : (!existingAnswer ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-300 text-gray-500')}
                `}
              >
                Yes
              </button>
              <button
                onClick={() => handleYesNo('no')}
                className={`px-4 py-2 rounded-lg transition-colors
                  ${existingAnswer && existingAnswer.answer === 'no'
                    ? 'bg-red-500 text-white'
                    : (!existingAnswer ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-gray-300 text-gray-500')}
                `}
              >
                No
              </button>
            </div>
            {existingAnswer && (
              <button
                onClick={handleRemoveAcknowledgement}
                className="mt-4 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Remove Acknowledgement
              </button>
            )}
            <button
              onClick={handleCancelYesNoModal}
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

// --- EnhancedStats component ---
function EnhancedStats({ answers, tracker }) {
  if (!answers || answers.length === 0) {
    return <div className="text-gray-400 italic text-center">No check-ins yet.</div>;
  }

  // Normalize and deduplicate dates
  const dateSet = new Set(answers.map(a => {
    const d = new Date(a.date);
    d.setHours(0,0,0,0);
    return d.toISOString().slice(0,10);
  }));
  const sortedDates = Array.from(dateSet).sort();

  // Longest streak calculation (robust)
  let longest = 0, current = 0;
  let prev = null;
  sortedDates.forEach(dateStr => {
    if (!prev) {
      current = 1;
    } else {
      const prevDate = new Date(prev);
      const currDate = new Date(dateStr);
      const diff = (currDate - prevDate) / (1000*60*60*24);
      if (diff === 1) {
        current++;
      } else {
        current = 1;
      }
    }
    if (current > longest) longest = current;
    prev = dateStr;
  });

  // Sort answers by date ascending
  const sorted = [...answers].sort((a, b) => new Date(a.date) - new Date(b.date));
  const firstDate = sorted[0]?.date;
  const lastDate = sorted[sorted.length - 1]?.date;
  const total = sorted.length;

  // Yes/No breakdown
  let yes = 0, no = 0, valueCount = 0;
  sorted.forEach(ans => {
    if (typeof ans.answer === 'string') {
      if (ans.answer.toLowerCase() === 'yes') yes++;
      else if (ans.answer.toLowerCase() === 'no') no++;
      else valueCount++;
    } else if (ans.value !== undefined) {
      valueCount++;
    }
  });

  // Completion rate (for daily trackers)
  let completionRate = null;
  if (tracker.cadence && tracker.cadence.toLowerCase() === 'daily' && firstDate) {
    const daysBetween = Math.max(1, Math.ceil((new Date(lastDate) - new Date(firstDate)) / (1000*60*60*24)) + 1);
    completionRate = (total / daysBetween) * 100;
  }

  // Prepare chart data (show last 30 check-ins)
  const chartData = {
    labels: sorted.slice(-30).map(a => new Date(a.date).toLocaleDateString()),
    datasets: [
      {
        label: tracker.type && tracker.type.toLowerCase().includes('yes') ? 'Yes' : 'Value',
        data: sorted.slice(-30).map(a => {
          if (typeof a.answer === 'string') {
            if (a.answer.toLowerCase() === 'yes') return 1;
            if (a.answer.toLowerCase() === 'no') return 0;
            return parseFloat(a.answer) || 0;
          }
          if (a.value !== undefined) return parseFloat(a.value) || 0;
          return 0;
        }),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        tension: 0.2,
        fill: true,
        pointRadius: 2,
      },
    ],
  };
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function(context) {
            if (tracker.type && tracker.type.toLowerCase().includes('yes')) {
              return context.parsed.y === 1 ? 'Yes' : 'No';
            }
            return context.parsed.y;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: tracker.type && tracker.type.toLowerCase().includes('yes') ? 1 : undefined,
          callback: function(value) {
            if (tracker.type && tracker.type.toLowerCase().includes('yes')) {
              return value === 1 ? 'Yes' : 'No';
            }
            return value;
          }
        },
        max: tracker.type && tracker.type.toLowerCase().includes('yes') ? 1 : undefined,
      }
    }
  };

  return (
    <div>
      <div className="mb-4">
        <Line data={chartData} options={chartOptions} height={120} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm mb-2">
        <div><span className="font-semibold">Total Check-ins:</span> {total}</div>
        {tracker.type && tracker.type.toLowerCase().includes('yes') && (
          <>
            <div><span className="font-semibold">Yes:</span> {yes}</div>
            <div><span className="font-semibold">No:</span> {no}</div>
          </>
        )}
        <div><span className="font-semibold">First Check-in:</span> {firstDate && new Date(firstDate).toLocaleDateString()}</div>
        <div><span className="font-semibold">Last Check-in:</span> {lastDate && new Date(lastDate).toLocaleDateString()}</div>
        <div><span className="font-semibold">Current Streak:</span> {longest}</div>
        <div><span className="font-semibold">Longest Streak:</span> {longest}</div>
        {completionRate !== null && (
          <div className="col-span-2"><span className="font-semibold">Completion Rate:</span> {completionRate.toFixed(1)}%</div>
        )}
      </div>
    </div>
  );
} 