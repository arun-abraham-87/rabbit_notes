import React, { useState } from 'react';
import { updateNoteById, deleteNoteById } from '../utils/ApiUtils';
import { ChartBarIcon, CalendarIcon, ArrowPathIcon, PencilIcon, ClockIcon, ClipboardIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import { Line } from 'react-chartjs-2';
import moment from 'moment';

function getLastSevenDays() {
  const days = [];
  const today = moment();
  for (let i = 6; i >= 0; i--) {
    days.push(moment(today).subtract(i, 'days'));
  }
  return days;
}

function getLastSevenMonths() {
  const months = [];
  const today = moment();
  for (let i = 6; i >= 0; i--) {
    months.push(moment(today).subtract(i, 'months').startOf('month'));
  }
  return months;
}

function getLastThreeYears() {
  const years = [];
  const today = moment();
  for (let i = 2; i >= 0; i--) {
    years.push(today.year() - i);
  }
  return years;
}

function getLastSevenSelectedWeekdays(selectedDays) {
  const days = [];
  const today = moment();
  let d = moment(today).startOf('day');
  let safety = 0;
  while (days.length < 7 && safety < 366) {
    if (selectedDays.includes(d.day())) {
      days.unshift(moment(d));
    }
    d.subtract(1, 'days');
    safety++;
  }
  return days;
}

function getWeekdayName(idx) {
  return moment().day(idx).format('ddd');
}

function getMonthShortName(idx) {
  return moment().month(idx).format('MMM');
}

function getMonthStats(completions, month, year, upToDay = null) {
  const daysInMonth = moment([year, month]).daysInMonth();
  const endDay = upToDay || daysInMonth;
  let x = 0, y = 0;
  for (let day = 1; day <= endDay; day++) {
    const date = moment([year, month, day]);
    const dateStr = date.format('YYYY-MM-DD');
    if (completions?.[dateStr]) x++;
    y++;
  }
  return { x, y };
}

function formatMonthDateString(date) {
  return moment(date).format('YYYY-MM-01');
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
    const now = moment();
    return moment(now).startOf('month');
  });
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showLastValuesModal, setShowLastValuesModal] = useState(false);
  const [dateOffset, setDateOffset] = useState(0);
  const [copied, setCopied] = useState(false);

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
  const now = moment();
  const currentMonthStats = getMonthStats(
    tracker.completions,
    now.month(),
    now.year(),
    now.date()
  );
  const prevMonth = now.month() === 0 ? 11 : now.month() - 1;
  const prevMonthYear = now.month() === 0 ? now.year() - 1 : now.year();
  const prevMonthDays = moment([prevMonthYear, prevMonth + 1, 0]).daysInMonth();
  const prevMonthStats = getMonthStats(
    tracker.completions,
    prevMonth,
    prevMonthYear,
    prevMonthDays
  );

  // Helper to get all dates in a given month
  function getAllDatesInMonth(monthDate) {
    const dates = [];
    const daysInMonth = moment(monthDate).daysInMonth();
    for (let day = 1; day <= daysInMonth; day++) {
      dates.push(moment(monthDate).date(day));
    }
    return dates;
  }

  // Helper to get the correct 7 buttons based on cadence and offset
  function getButtonsWithOffset() {
    if (buttonType === 'day') {
      if (cadence === 'weekly' && tracker.days && tracker.days.length > 0) {
        let selectedDays = tracker.days.map(d => {
          if (typeof d === 'string') {
            const idx = ['sun','mon','tue','wed','thu','fri','sat'].indexOf(d.toLowerCase().slice(0,3));
            return idx >= 0 ? idx : d;
          }
          return d;
        }).filter(d => typeof d === 'number' && d >= 0 && d <= 6);
        
        const all = [];
        const today = moment();
        let d = moment(today).startOf('day');
        let safety = 0;
        while (all.length < 35 && safety < 366) {
          if (selectedDays.includes(d.day())) {
            all.unshift(moment(d));
          }
          d.subtract(1, 'days');
          safety++;
        }
        
        const start = all.length - 7 - dateOffset * 7;
        const end = all.length - dateOffset * 7;
        return all.slice(Math.max(0, start), Math.max(0, end));
      } else {
        const days = [];
        const today = moment();
        for (let i = 6 + dateOffset * 7; i >= 0 + dateOffset * 7; i--) {
          days.push(moment(today).subtract(i, 'days'));
        }
        return days;
      }
    } else if (buttonType === 'month') {
      const months = [];
      const today = moment();
      for (let i = 6 + dateOffset * 7; i >= 0 + dateOffset * 7; i--) {
        months.push(moment(today).subtract(i, 'months').startOf('month'));
      }
      return months;
    } else if (buttonType === 'year') {
      const years = [];
      const today = moment();
      for (let i = 2 + dateOffset * 3; i >= 0 + dateOffset * 3; i--) {
        years.push(today.year() - i);
      }
      return years;
    }
    return [];
  }

  // --- Cadence-aware current streak calculation ---
  function getCadenceStreak(tracker, answers) {
    if (!answers || answers.length === 0) return 0;
    
    // For yes/no type trackers, create a map of dates to their answers
    const isYesNoType = tracker.type && tracker.type.toLowerCase().includes('yes');
    const answerMap = new Map();
    answers.forEach(a => {
      const dateStr = moment(a.date).format('YYYY-MM-DD');
      answerMap.set(dateStr, a.answer?.toLowerCase() || a.value);
    });
    
    const cadence = tracker.cadence ? tracker.cadence.toLowerCase() : 'daily';
    let streak = 0;
    
    if (cadence === 'weekly' && tracker.days && tracker.days.length > 0) {
      let selectedDays = tracker.days.map(d => {
        if (typeof d === 'string') {
          const idx = ['sun','mon','tue','wed','thu','fri','sat'].indexOf(d.toLowerCase().slice(0,3));
          return idx >= 0 ? idx : d;
        }
        return d;
      }).filter(d => typeof d === 'number' && d >= 0 && d <= 6);
      
      const relevantDates = [];
      const today = moment().subtract(1, 'days');
      let d = moment(today).startOf('day');
      let safety = 0;
      while (relevantDates.length < 100 && safety < 366) {
        if (selectedDays.includes(d.day())) {
          relevantDates.unshift(moment(d));
        }
        d.subtract(1, 'days');
        safety++;
      }
      
      for (let i = relevantDates.length - 1; i >= 0; i--) {
        const dateStr = relevantDates[i].format('YYYY-MM-DD');
        const answer = answerMap.get(dateStr);
        if (isYesNoType) {
          if (answer === 'yes') {
            streak++;
          } else {
            break;
          }
        } else if (answer !== undefined) {
          streak++;
        } else {
          break;
        }
      }
      return streak;
    } else if (cadence === 'monthly') {
      const months = [];
      const today = moment().subtract(1, 'days');
      for (let i = 0; i < 24; i++) {
        months.unshift(moment(today).subtract(i, 'months').startOf('month'));
      }
      for (let i = months.length - 1; i >= 0; i--) {
        const monthStr = months[i].format('YYYY-MM');
        const monthAnswers = Array.from(answerMap.entries())
          .filter(([date]) => date.startsWith(monthStr))
          .map(([, answer]) => answer);
        
        if (isYesNoType) {
          if (monthAnswers.includes('yes')) {
            streak++;
          } else {
            break;
          }
        } else if (monthAnswers.length > 0) {
          streak++;
        } else {
          break;
        }
      }
      return streak;
    } else if (cadence === 'yearly') {
      const years = [];
      const today = moment().subtract(1, 'days');
      for (let i = 0; i < 10; i++) {
        years.unshift(today.year() - i);
      }
      for (let i = years.length - 1; i >= 0; i--) {
        const yearStr = years[i].toString();
        const yearAnswers = Array.from(answerMap.entries())
          .filter(([date]) => date.startsWith(yearStr))
          .map(([, answer]) => answer);
        
        if (isYesNoType) {
          if (yearAnswers.includes('yes')) {
            streak++;
          } else {
            break;
          }
        } else if (yearAnswers.length > 0) {
          streak++;
        } else {
          break;
        }
      }
      return streak;
    } else {
      // Daily: consecutive calendar days
      let d = moment().subtract(1, 'days').startOf('day');
      while (true) {
        const dateStr = d.format('YYYY-MM-DD');
        const answer = answerMap.get(dateStr);
        
        if (isYesNoType) {
          if (answer === 'yes') {
            streak++;
          } else {
            break;
          }
        } else if (answer !== undefined) {
          streak++;
        } else {
          break;
        }
        
        d.subtract(1, 'days');
      }
      return streak;
    }
  }
  const currentStreak = getCadenceStreak(tracker, answers);

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(tracker.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

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
            dateStr = item.format('YYYY-MM-DD');
            label = item.date();
            isToday = (item.format('YYYY-MM-DD') === now.format('YYYY-MM-DD'));
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
              weekdayLabel = item.format('ddd');
            } else {
              weekdayLabel = item.format('ddd');
            }
            monthLabel = item.format('MMM YYYY');
          } else if (buttonType === 'month') {
            dateStr = formatMonthDateString(item);
            label = getMonthShortName(item.month());
            isToday = (item.month() === now.month() && item.year() === now.year());
            done = false;
            monthLabel = '';
            weekdayLabel = '';
          } else if (buttonType === 'year') {
            dateStr = item + '-01-01';
            label = item;
            isToday = (item === now.year());
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
                title={buttonType === 'day' ? item.format('MMM D, YYYY') : (buttonType === 'month' ? item.format('MMMM YYYY') : label)}
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
                onClick={() => setMonthlyModalMonth(prev => prev.subtract(1, 'months').startOf('month'))}
                aria-label="Previous Month"
              >
                <span className="text-xl">&#8592;</span>
              </button>
              <h2 className="text-lg font-semibold text-center">
                Monthly Check-ins: {monthlyModalMonth.format('MMMM YYYY')}
              </h2>
              <button
                className="p-2 rounded-full hover:bg-gray-200"
                onClick={() => setMonthlyModalMonth(prev => prev.add(1, 'months').startOf('month'))}
                aria-label="Next Month"
              >
                <span className="text-xl">&#8594;</span>
              </button>
            </div>
            <div className="flex flex-wrap gap-2 justify-center bg-blue-50 p-4 rounded-lg">
              {getAllDatesInMonth(monthlyModalMonth).map(dateObj => {
                const dateStr = dateObj.format('YYYY-MM-DD');
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
                    <span className="text-[10px] text-gray-400 mb-0.5 text-center w-full">{dateObj.format('ddd')}</span>
                    <div
                      className={`w-8 h-8 rounded-full border flex items-center justify-center text-sm ${color} border-gray-300`}
                      title={dateObj.format('MMM D, YYYY')}
                    >
                      {dateObj.date()}
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
      <div className="mt-4 pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <span>ID:</span>
          <code className="font-mono bg-gray-50 px-1 py-0.5 rounded">{tracker.id}</code>
        </div>
        <button
          onClick={handleCopyToClipboard}
          className="flex items-center gap-1 hover:text-gray-700 transition-colors"
          title="Copy ID to clipboard"
        >
          {copied ? (
            <>
              <ClipboardDocumentCheckIcon className="h-4 w-4 text-green-500" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <ClipboardIcon className="h-4 w-4" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// --- EnhancedStats component ---
function EnhancedStats({ answers, tracker }) {
  if (!answers || answers.length === 0) {
    return <div className="text-gray-400 italic text-center">No check-ins yet.</div>;
  }

  // Normalize and deduplicate dates
  const dateSet = new Set(answers.map(a => moment(a.date).format('YYYY-MM-DD')));
  const sortedDates = Array.from(dateSet).sort();

  // Longest streak calculation (robust)
  let longest = 0, current = 0;
  let prev = null;
  sortedDates.forEach(dateStr => {
    if (!prev) {
      current = 1;
    } else {
      const prevDate = moment(prev);
      const currDate = moment(dateStr);
      const diff = currDate.diff(prevDate, 'days');
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