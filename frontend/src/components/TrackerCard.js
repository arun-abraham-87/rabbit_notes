import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateNoteById, deleteNoteById } from '../utils/ApiUtils';
import { ChartBarIcon, CalendarIcon, ArrowPathIcon, PencilIcon, ClockIcon, ClipboardIcon, ClipboardDocumentCheckIcon, PlusIcon } from '@heroicons/react/24/outline';
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

export default function TrackerCard({ tracker, onToggleDay, answers = [], onEdit, isFocusMode, isDevMode }) {
  const navigate = useNavigate();
  
  // Debug: Log answers received
  React.useEffect(() => {
    console.log('[TrackerCard] Answers received', {
      trackerId: tracker.id,
      trackerTitle: tracker.title,
      answersCount: answers.length,
      sampleAnswer: answers[0],
      answersByDate: answers.map(a => ({ date: a.date, answer: a.answer, hasAnswer: !!a.answer }))
    });
  }, [tracker.id, answers.length]);
  
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
  const [yesNoFilter, setYesNoFilter] = useState('both'); // 'yes', 'no', 'both'
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const [customDate, setCustomDate] = useState(moment().format('YYYY-MM-DD'));
  const [customValue, setCustomValue] = useState('');
  const [customExistingAnswer, setCustomExistingAnswer] = useState(null);
  // State for monthly modal pending changes (date -> answer value: 'yes', 'no', string value, or null for remove)
  const [monthlyModalPendingChanges, setMonthlyModalPendingChanges] = useState({});
  // State for value input popup in monthly modal
  const [monthlyModalValueInput, setMonthlyModalValueInput] = useState({
    show: false,
    dateStr: null,
    value: '',
    dateObj: null
  });

  const handleDateClick = (date, dateStr) => {
    console.log('[TrackerCard.handleDateClick] START', { 
      trackerId: tracker.id, 
      dateStr, 
      timestamp: new Date().toISOString() 
    });

    const type = tracker.type.toLowerCase();
    const answer = getAnswerForDate(dateStr);
    
    console.log('[TrackerCard.handleDateClick] Answer found', { 
      trackerId: tracker.id, 
      dateStr, 
      hasAnswer: !!answer,
      answerValue: answer?.answer,
      answerType: answer?.type
    });

    setExistingAnswer(answer);
    
    if (type === 'value') {
      setSelectedDate(dateStr);
      setValue(answer ? answer.value : '');
      setShowValueModal(true);
    } else if (type === 'yes,no' || type === 'yesno' || type === 'yes/no') {
      // Cycle through yes -> no -> not selected (null) -> yes
      const currentAnswer = answer && answer.answer ? answer.answer.toLowerCase() : null;
      let newAnswer = null;
      
      if (currentAnswer === null || currentAnswer === '') {
        // No answer -> yes
        newAnswer = 'yes';
      } else if (currentAnswer === 'yes') {
        // Yes -> no
        newAnswer = 'no';
      } else if (currentAnswer === 'no') {
        // No -> remove (null)
        newAnswer = null;
      }
      
      console.log('[TrackerCard.handleDateClick] Cycling yes/no', { 
        trackerId: tracker.id, 
        dateStr,
        currentAnswer,
        newAnswer
      });
      
      // If removing (null), delete the note if it exists
      if (newAnswer === null && answer && answer.id) {
        deleteNoteById(answer.id).then(() => {
          console.log('[TrackerCard.handleDateClick] Removed answer', { dateStr, noteId: answer.id });
          onToggleDay(tracker.id, dateStr, null);
        }).catch(error => {
          console.error('[TrackerCard.handleDateClick] ERROR removing answer', { dateStr, error });
        });
      } else {
        // Update or create answer - let handleToggleDay handle the backend operations
        // Just pass the value to onToggleDay, which will handle both create and update
        console.log('[TrackerCard.handleDateClick] Creating/updating answer via onToggleDay', { dateStr, newAnswer, hasExistingAnswer: !!answer });
        // Call onToggleDay which will handle the backend operation and state update
        onToggleDay(tracker.id, dateStr, newAnswer).catch(error => {
          console.error('[TrackerCard.handleDateClick] ERROR in onToggleDay', { dateStr, error });
        });
      }
    } else {
      onToggleDay(tracker.id, dateStr);
    }

    console.log('[TrackerCard.handleDateClick] END', { 
      trackerId: tracker.id, 
      dateStr 
    });
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
    console.log('[TrackerCard.handleYesNo] START', { 
      trackerId: tracker.id, 
      selectedDate, 
      answer,
      hasExistingAnswer: !!existingAnswer,
      existingAnswerId: existingAnswer?.id,
      existingAnswerValue: existingAnswer?.answer,
      timestamp: new Date().toISOString()
    });

    // Check if we're toggling (clicking the same answer) or switching
    const isToggle = existingAnswer && existingAnswer.answer && 
                     existingAnswer.answer.toLowerCase() === answer.toLowerCase();
    
    console.log('[TrackerCard.handleYesNo] Is toggle?', { 
      isToggle, 
      existingAnswerValue: existingAnswer?.answer,
      newAnswer: answer
    });

    if (existingAnswer && existingAnswer.id) {
      // Update existing note - this works for both toggling and switching
      console.log('[TrackerCard.handleYesNo] Updating existing note', { 
        noteId: existingAnswer.id, 
        newAnswer: answer 
      });
      try {
        await updateNoteById(existingAnswer.id, answer);
        console.log('[TrackerCard.handleYesNo] Note updated successfully', { 
          noteId: existingAnswer.id 
        });
        
        // Update the UI state by calling onToggleDay
        // handleToggleDay now checks for existing answers and updates them
        onToggleDay(tracker.id, selectedDate, answer);
      } catch (error) {
        console.error('[TrackerCard.handleYesNo] ERROR updating note', { 
          noteId: existingAnswer.id, 
          error 
        });
      }
    } else {
      // Create new answer
      console.log('[TrackerCard.handleYesNo] Creating new answer', { 
        trackerId: tracker.id, 
        selectedDate, 
        answer 
      });
      onToggleDay(tracker.id, selectedDate, answer);
    }
    
    setShowYesNoModal(false);
    setSelectedDate(null);
    setExistingAnswer(null);
    
    console.log('[TrackerCard.handleYesNo] END', { 
      trackerId: tracker.id, 
      selectedDate, 
      answer 
    });
  };

  const handleCancelYesNoModal = () => {
    setShowYesNoModal(false);
    setSelectedDate(null);
    setExistingAnswer(null);
  };

  const handleCustomDateSubmit = async () => {
    const type = tracker.type ? tracker.type.toLowerCase() : '';
    const isYesNoTracker = type === 'yes,no' || type === 'yesno' || type === 'yes/no';
    const isValueTracker = type === 'value';
    
    let answer;
    if (isValueTracker) {
      if (!customValue.trim()) {
        alert('Please enter a value');
        return;
      }
      answer = customValue.trim();
    } else if (isYesNoTracker) {
      if (!customValue || (customValue !== 'yes' && customValue !== 'no')) {
        alert('Please select Yes or No');
        return;
      }
      answer = customValue;
    } else {
      answer = 'yes'; // Default for other trackers
    }
    
    // Check if there's already an answer for this date
    const existingAnswer = customExistingAnswer || getAnswerForDate(customDate);
    
    if (existingAnswer && existingAnswer.id) {
      // Update existing note
      await updateNoteById(existingAnswer.id, answer);
    } else {
      // Create new answer
      onToggleDay(tracker.id, customDate, answer);
    }
    
    setShowCustomDateModal(false);
    setCustomValue('');
    setCustomDate(moment().format('YYYY-MM-DD'));
    setCustomExistingAnswer(null);
  };

  const handleCancelCustomDateModal = () => {
    setShowCustomDateModal(false);
    setCustomValue('');
    setCustomDate(moment().format('YYYY-MM-DD'));
    setCustomExistingAnswer(null);
  };

  const handleRemoveCustomDateAnswer = async () => {
    console.log('[TrackerCard.handleRemoveCustomDateAnswer] START', { 
      trackerId: tracker.id, 
      customDate, 
      customExistingAnswer,
      timestamp: new Date().toISOString()
    });

    if (customExistingAnswer && customExistingAnswer.id) {
      console.log('[TrackerCard.handleRemoveCustomDateAnswer] Deleting note', { 
        noteId: customExistingAnswer.id,
        date: customExistingAnswer.date,
        answer: customExistingAnswer.answer
      });

      try {
        await deleteNoteById(customExistingAnswer.id);
        console.log('[TrackerCard.handleRemoveCustomDateAnswer] Note deleted successfully', { 
          noteId: customExistingAnswer.id 
        });
      } catch (error) {
        console.error('[TrackerCard.handleRemoveCustomDateAnswer] ERROR deleting note', { 
          noteId: customExistingAnswer.id, 
          error 
        });
      }

      // Refresh UI
      console.log('[TrackerCard.handleRemoveCustomDateAnswer] Calling onToggleDay with null', { 
        trackerId: tracker.id, 
        customDate 
      });
      onToggleDay(tracker.id, customDate, null);
      console.log('[TrackerCard.handleRemoveCustomDateAnswer] onToggleDay called', { 
        trackerId: tracker.id, 
        customDate 
      });
      
      setCustomExistingAnswer(null);
      setCustomValue('');
    } else {
      console.log('[TrackerCard.handleRemoveCustomDateAnswer] No existing answer to remove', { 
        hasCustomExistingAnswer: !!customExistingAnswer 
      });
    }

    console.log('[TrackerCard.handleRemoveCustomDateAnswer] END', { 
      trackerId: tracker.id, 
      customDate 
    });
  };

  const handleRemoveAcknowledgement = async () => {
    console.log('[TrackerCard.handleRemoveAcknowledgement] START', { 
      trackerId: tracker.id, 
      selectedDate, 
      existingAnswer,
      timestamp: new Date().toISOString()
    });

    if (existingAnswer && existingAnswer.id) {
      console.log('[TrackerCard.handleRemoveAcknowledgement] Deleting note', { 
        noteId: existingAnswer.id,
        date: existingAnswer.date,
        answer: existingAnswer.answer
      });

      try {
        await deleteNoteById(existingAnswer.id);
        console.log('[TrackerCard.handleRemoveAcknowledgement] Note deleted successfully', { 
          noteId: existingAnswer.id 
        });
      } catch (error) {
        console.error('[TrackerCard.handleRemoveAcknowledgement] ERROR deleting note', { 
          noteId: existingAnswer.id, 
          error 
        });
      }

      // Refresh UI by toggling the day (removes completion)
      console.log('[TrackerCard.handleRemoveAcknowledgement] Calling onToggleDay with null', { 
        trackerId: tracker.id, 
        selectedDate 
      });
      onToggleDay(tracker.id, selectedDate, null);
      console.log('[TrackerCard.handleRemoveAcknowledgement] onToggleDay called', { 
        trackerId: tracker.id, 
        selectedDate 
      });
    } else {
      console.log('[TrackerCard.handleRemoveAcknowledgement] No existing answer to remove', { 
        hasExistingAnswer: !!existingAnswer 
      });
    }

    setShowValueModal(false);
    setShowYesNoModal(false);
    setValue('');
    setExistingAnswer(null);

    console.log('[TrackerCard.handleRemoveAcknowledgement] END', { 
      trackerId: tracker.id, 
      selectedDate 
    });
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

  // Calculate age in years, months, and days
  const calculateAge = (date) => {
    const today = moment();
    const targetDate = moment(date);
    
    let years = today.year() - targetDate.year();
    let months = today.month() - targetDate.month();
    let days = today.date() - targetDate.date();

    // Adjust for negative days
    if (days < 0) {
      months--;
      const lastMonth = moment(today).subtract(1, 'months');
      lastMonth.date(targetDate.date());
      days = today.diff(lastMonth, 'days');
    }

    // Adjust for negative months
    if (months < 0) {
      years--;
      months += 12;
    }

    const parts = [];
    if (years > 0) parts.push(`${years} year${years !== 1 ? 's' : ''}`);
    if (months > 0) parts.push(`${months} month${months !== 1 ? 's' : ''}`);
    if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);

    return parts.join(', ') || '0 days';
  };

  // Get last recorded date for yes/no trackers
  const getLastRecordedYes = () => {
    if (!answers || answers.length === 0) return null;
    
    const type = tracker.type ? tracker.type.toLowerCase() : '';
    const isYesNoTracker = type === 'yes,no' || type === 'yesno' || type === 'yes/no';
    
    if (!isYesNoTracker) return null;
    
    // Filter to only "yes" answers
    const yesAnswers = answers.filter(ans => ans.answer && ans.answer.toLowerCase() === 'yes');
    if (yesAnswers.length === 0) return null;
    
    // Sort by date (most recent first) and return the most recent
    const sortedAnswers = [...yesAnswers].sort((a, b) => moment(b.date).valueOf() - moment(a.date).valueOf());
    return sortedAnswers[0].date;
  };

  const getLastRecordedNo = () => {
    if (!answers || answers.length === 0) return null;
    
    const type = tracker.type ? tracker.type.toLowerCase() : '';
    const isYesNoTracker = type === 'yes,no' || type === 'yesno' || type === 'yes/no';
    
    if (!isYesNoTracker) return null;
    
    // Filter to only "no" answers
    const noAnswers = answers.filter(ans => ans.answer && ans.answer.toLowerCase() === 'no');
    if (noAnswers.length === 0) return null;
    
    // Sort by date (most recent first) and return the most recent
    const sortedAnswers = [...noAnswers].sort((a, b) => moment(b.date).valueOf() - moment(a.date).valueOf());
    return sortedAnswers[0].date;
  };

  // For backward compatibility with non-yes/no trackers
  const getLastRecordedDate = () => {
    if (!answers || answers.length === 0) return null;
    
    const type = tracker.type ? tracker.type.toLowerCase() : '';
    const isYesNoTracker = type === 'yes,no' || type === 'yesno' || type === 'yes/no';
    
    if (isYesNoTracker) {
      // For yes/no trackers, prefer "yes" but fall back to any answer
      const lastYes = getLastRecordedYes();
      if (lastYes) return lastYes;
      const lastNo = getLastRecordedNo();
      if (lastNo) return lastNo;
    }
    
    // For non-yes/no trackers, get the most recent answer
    const sortedAnswers = [...answers].sort((a, b) => moment(b.date).valueOf() - moment(a.date).valueOf());
    return sortedAnswers[0].date;
  };

  const lastRecordedDate = getLastRecordedDate();
  const lastRecordedAge = lastRecordedDate ? calculateAge(lastRecordedDate) : null;
  const lastRecordedYesDate = getLastRecordedYes();
  const lastRecordedYesAge = lastRecordedYesDate ? calculateAge(lastRecordedYesDate) : null;
  const lastRecordedNoDate = getLastRecordedNo();
  const lastRecordedNoAge = lastRecordedNoDate ? calculateAge(lastRecordedNoDate) : null;

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
              onClick={() => navigate(`/tracker-stats-analysis?tracker=${tracker.id}`)}
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
              title="Show all recorded values"
            >
              <ClockIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => {
                const today = moment().format('YYYY-MM-DD');
                setCustomDate(today);
                setCustomValue('');
                const existing = getAnswerForDate(today);
                setCustomExistingAnswer(existing);
                if (existing) {
                  const type = tracker.type ? tracker.type.toLowerCase() : '';
                  if (type === 'value') {
                    setCustomValue(existing.value || existing.answer || '');
                  } else if (type === 'yes,no' || type === 'yesno' || type === 'yes/no') {
                    setCustomValue(existing.answer || '');
                  }
                }
                setShowCustomDateModal(true);
              }}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              title="Enter value for custom date"
            >
              <PlusIcon className="h-5 w-5" />
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
              const answerValue = answerObj?.answer || answerObj?.value;
              if (answerObj && typeof answerValue === 'string' && answerValue.toLowerCase() === 'yes') {
                done = 'green';
              } else if (answerObj && typeof answerValue === 'string' && answerValue.toLowerCase() === 'no') {
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
        {/* Right chevron for next 7 (move forward towards today) */}
        {dateOffset > 0 && (
          <button
            className="p-1 rounded-full hover:bg-gray-200 focus:outline-none"
            onClick={() => setDateOffset(offset => Math.max(0, offset - 1))}
            aria-label="Show next 7"
          >
            <span className="text-xl">&#8594;</span>
          </button>
        )}
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
              onClick={() => {
                // Clear pending changes and value input when closing
                setMonthlyModalPendingChanges({});
                setMonthlyModalValueInput({ show: false, dateStr: null, value: '', dateObj: null });
                setShowMonthlyModal(false);
              }}
              aria-label="Close"
            >
              &times;
            </button>
            {/* Tracker Title */}
            <div className="text-center mb-2">
              <h2 className="text-xl font-semibold">{tracker.title}</h2>
            </div>
            
            {/* Month Navigation */}
            <div className="flex items-center justify-center mb-2 gap-4">
              <button
                className="p-2 rounded-full hover:bg-gray-200"
                onClick={() => {
                  setMonthlyModalMonth(prev => {
                    // Clone the moment object before mutating to avoid skipping months
                    return moment(prev).subtract(1, 'months').startOf('month');
                  });
                  // Clear pending changes and value input when changing months
                  setMonthlyModalPendingChanges({});
                  setMonthlyModalValueInput({ show: false, dateStr: null, value: '', dateObj: null });
                }}
                aria-label="Previous Month"
              >
                <span className="text-xl">&#8592;</span>
              </button>
              <h3 className="text-lg font-semibold text-center">
                {monthlyModalMonth.format('MMMM YYYY')}
              </h3>
              <button
                className="p-2 rounded-full hover:bg-gray-200"
                onClick={() => {
                  setMonthlyModalMonth(prev => {
                    // Clone the moment object before mutating to avoid skipping months
                    return moment(prev).add(1, 'months').startOf('month');
                  });
                  // Clear pending changes and value input when changing months
                  setMonthlyModalPendingChanges({});
                  setMonthlyModalValueInput({ show: false, dateStr: null, value: '', dateObj: null });
                }}
                aria-label="Next Month"
              >
                <span className="text-xl">&#8594;</span>
              </button>
            </div>
            
            {/* Cadence and Events Count */}
            <div className="text-center mb-4 text-sm text-gray-600">
              {(() => {
                // Count events marked in the month
                const monthStart = moment(monthlyModalMonth).startOf('month').format('YYYY-MM-DD');
                const monthEnd = moment(monthlyModalMonth).endOf('month').format('YYYY-MM-DD');
                const eventsInMonth = answers.filter(ans => {
                  const ansDate = moment(ans.date).format('YYYY-MM-DD');
                  return ansDate >= monthStart && ansDate <= monthEnd;
                }).length;
                
                // Format cadence for display
                const cadenceDisplay = cadence.charAt(0).toUpperCase() + cadence.slice(1);
                
                return `${cadenceDisplay} • ${eventsInMonth} event${eventsInMonth !== 1 ? 's' : ''} marked`;
              })()}
            </div>
            <div className="flex flex-wrap gap-2 justify-center bg-blue-50 p-4 rounded-lg">
              {getAllDatesInMonth(monthlyModalMonth).map(dateObj => {
                const dateStr = dateObj.format('YYYY-MM-DD');
                const answerObj = answers.find(ans => ans.date === dateStr);
                
                // Check if there's a pending change for this date, otherwise use existing answer
                const pendingValue = monthlyModalPendingChanges[dateStr];
                let displayValue = null;
                let displayValueString = null;
                if (pendingValue !== undefined) {
                  displayValue = pendingValue; // Use pending change
                  displayValueString = pendingValue !== null ? String(pendingValue) : null;
                } else if (answerObj && answerObj.answer) {
                  const ansValue = answerObj.answer || answerObj.value;
                  displayValue = ansValue;
                  displayValueString = String(ansValue);
                }
                
                let color = '';
                let isYesNoTracker = tracker.type && tracker.type.toLowerCase().includes('yes');
                let isValueTracker = tracker.type && tracker.type.toLowerCase() === 'value';
                
                // Check if this date is allowed for weekly trackers
                let isDateAllowed = true;
                if (cadence === 'weekly' && tracker.days && tracker.days.length > 0) {
                  // Get allowed weekday indices
                  const selectedDays = tracker.days.map(d => {
                    if (typeof d === 'string') {
                      const idx = ['sun','mon','tue','wed','thu','fri','sat'].indexOf(d.toLowerCase().slice(0,3));
                      return idx >= 0 ? idx : d;
                    }
                    return d;
                  }).filter(d => typeof d === 'number' && d >= 0 && d <= 6);
                  
                  // Check if this date's weekday is in the allowed days
                  const dateWeekday = dateObj.day(); // 0 = Sunday, 6 = Saturday
                  isDateAllowed = selectedDays.includes(dateWeekday);
                }
                
                if (isYesNoTracker) {
                  if (displayValue === 'yes') {
                    color = 'bg-green-300';
                  } else if (displayValue === 'no') {
                    color = 'bg-red-300';
                  }
                } else if (isValueTracker) {
                  color = displayValue ? 'bg-green-300' : '';
                } else {
                  color = displayValue ? 'bg-green-300' : '';
                }
                
                // Disable color styling if date is not allowed for weekly trackers
                const isDisabled = !isDateAllowed && cadence === 'weekly';
                const isClickable = (isYesNoTracker || isValueTracker) && !isDisabled;
                
                const handleMonthlyDateClick = () => {
                  if (!isYesNoTracker && !isValueTracker) return; // Only allow clicking for yes/no or value trackers
                  if (!isDateAllowed && cadence === 'weekly') return; // Disable clicks for non-allowed dates
                  
                  if (isValueTracker) {
                    // Show popup for value entry
                    const currentValue = pendingValue !== undefined 
                      ? pendingValue 
                      : (answerObj && (answerObj.answer || answerObj.value) ? String(answerObj.answer || answerObj.value) : '');
                    setMonthlyModalValueInput({
                      show: true,
                      dateStr,
                      value: currentValue,
                      dateObj
                    });
                  } else if (isYesNoTracker) {
                    // Toggle yes/no for yes/no trackers
                    const currentState = pendingValue !== undefined 
                      ? pendingValue 
                      : (answerObj && answerObj.answer ? answerObj.answer.toLowerCase() : null);
                    
                    // Toggle: null -> yes -> no -> null
                    let newValue = null;
                    if (currentState === null || currentState === '') {
                      newValue = 'yes';
                    } else if (currentState === 'yes') {
                      newValue = 'no';
                    } else if (currentState === 'no') {
                      newValue = null; // Remove
                    }
                    
                    console.log('[TrackerCard] Monthly date click', { 
                      dateStr, 
                      currentState, 
                      newValue,
                      isDateAllowed
                    });
                    
                    setMonthlyModalPendingChanges(prev => ({
                      ...prev,
                      [dateStr]: newValue
                    }));
                  }
                };
                
                return (
                  <div key={dateStr} className={`flex flex-col items-center w-10`}>
                    <span className="text-[10px] text-gray-400 mb-0.5 text-center w-full">{dateObj.format('ddd')}</span>
                    {/* Show value above date for value trackers */}
                    {isValueTracker && displayValueString && (
                      <span className="text-[9px] text-gray-600 mb-0.5 text-center w-full font-medium" title={`Value: ${displayValueString}`}>
                        {displayValueString.length > 4 ? displayValueString.substring(0, 4) + '...' : displayValueString}
                      </span>
                    )}
                    <button
                      onClick={handleMonthlyDateClick}
                      className={`w-8 h-8 rounded-full border flex items-center justify-center text-sm ${color} ${
                        isDisabled 
                          ? 'border-gray-200 opacity-30 cursor-not-allowed' 
                          : isClickable
                            ? 'border-gray-300 cursor-pointer hover:ring-2 hover:ring-blue-400' 
                            : 'border-gray-300 cursor-default'
                      }`}
                      title={
                        dateObj.format('MMM D, YYYY') + 
                        (isDisabled ? ' - Not available for this tracker' : 
                         isYesNoTracker ? ' - Click to toggle yes/no/remove' :
                         isValueTracker ? ' - Click to add/edit value' : '')
                      }
                      disabled={!isClickable}
                    >
                      {dateObj.date()}
                    </button>
                  </div>
                );
              })}
            </div>
            {/* Save button for yes/no and value trackers */}
            {((tracker.type && tracker.type.toLowerCase().includes('yes')) || 
              (tracker.type && tracker.type.toLowerCase() === 'value')) && 
              Object.keys(monthlyModalPendingChanges).length > 0 && (
              <div className="mt-4 flex justify-center gap-4">
                <button
                  onClick={async () => {
                    console.log('[TrackerCard] Saving monthly modal changes', { 
                      changes: monthlyModalPendingChanges 
                    });
                    
                    // Apply each change
                    for (const [dateStr, value] of Object.entries(monthlyModalPendingChanges)) {
                      if (value === null) {
                        // Remove: find existing answer and delete it
                        const existingAnswer = answers.find(ans => ans.date === dateStr);
                        if (existingAnswer && existingAnswer.id) {
                          try {
                            await deleteNoteById(existingAnswer.id);
                            console.log('[TrackerCard] Removed answer', { dateStr, noteId: existingAnswer.id });
                            // Update UI by calling onToggleDay with null
                            onToggleDay(tracker.id, dateStr, null);
                          } catch (error) {
                            console.error('[TrackerCard] ERROR removing answer', { dateStr, error });
                          }
                        } else {
                          // No existing answer, just update state
                          onToggleDay(tracker.id, dateStr, null);
                        }
                      } else {
                        // Update or create: use onToggleDay which handles both cases
                        console.log('[TrackerCard] Setting answer', { dateStr, value });
                        onToggleDay(tracker.id, dateStr, value);
                      }
                    }
                    
                    // Clear pending changes
                    setMonthlyModalPendingChanges({});
                    console.log('[TrackerCard] Monthly modal changes saved');
                  }}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Save Changes ({Object.keys(monthlyModalPendingChanges).length} changes)
                </button>
                <button
                  onClick={() => {
                    console.log('[TrackerCard] Cancelling monthly modal changes');
                    setMonthlyModalPendingChanges({});
                  }}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
            {/* Value Input Popup for value trackers */}
            {monthlyModalValueInput.show && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
                <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-lg">
                  <h3 className="text-lg font-semibold mb-4">
                    Enter Value for {monthlyModalValueInput.dateObj?.format('MMM D, YYYY')}
                  </h3>
                  <input
                    type="text"
                    value={monthlyModalValueInput.value}
                    onChange={(e) => setMonthlyModalValueInput(prev => ({ ...prev, value: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 mb-4"
                    placeholder="Enter value"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        // Save value to pending changes
                        const valueToSave = monthlyModalValueInput.value.trim() || null;
                        setMonthlyModalPendingChanges(prev => ({
                          ...prev,
                          [monthlyModalValueInput.dateStr]: valueToSave
                        }));
                        setMonthlyModalValueInput({ show: false, dateStr: null, value: '', dateObj: null });
                      } else if (e.key === 'Escape') {
                        setMonthlyModalValueInput({ show: false, dateStr: null, value: '', dateObj: null });
                      }
                    }}
                  />
                  <div className="flex justify-end gap-4">
                    <button
                      onClick={() => {
                        setMonthlyModalValueInput({ show: false, dateStr: null, value: '', dateObj: null });
                      }}
                      className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        // Save value to pending changes
                        const valueToSave = monthlyModalValueInput.value.trim() || null;
                        setMonthlyModalPendingChanges(prev => ({
                          ...prev,
                          [monthlyModalValueInput.dateStr]: valueToSave
                        }));
                        setMonthlyModalValueInput({ show: false, dateStr: null, value: '', dateObj: null });
                      }}
                      className="px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 rounded-lg transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}
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
      {/* All Recorded Values Modal */}
      {showLastValuesModal && (() => {
        const type = tracker.type ? tracker.type.toLowerCase() : '';
        const isYesNoTracker = type === 'yes,no' || type === 'yesno' || type === 'yes/no';
        
        // Filter answers based on yes/no filter
        let filteredAnswers = (answers || []).filter(ans => ans.value !== undefined || ans.answer !== undefined);
        
        if (isYesNoTracker) {
          if (yesNoFilter === 'yes') {
            filteredAnswers = filteredAnswers.filter(ans => ans.answer && ans.answer.toLowerCase() === 'yes');
          } else if (yesNoFilter === 'no') {
            filteredAnswers = filteredAnswers.filter(ans => ans.answer && ans.answer.toLowerCase() === 'no');
          }
        }
        
        // Group by year
        const groupedByYear = filteredAnswers.reduce((acc, ans) => {
          const year = moment(ans.date).year();
          if (!acc[year]) {
            acc[year] = [];
          }
          acc[year].push(ans);
          return acc;
        }, {});
        
        // Sort years descending
        const sortedYears = Object.keys(groupedByYear).sort((a, b) => parseInt(b) - parseInt(a));
        
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-lg relative max-h-[80vh] overflow-y-auto">
              <button
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl"
                onClick={() => {
                  setShowLastValuesModal(false);
                  setYesNoFilter('both');
                }}
                aria-label="Close"
              >
                &times;
              </button>
              <h2 className="text-lg font-semibold mb-4 text-center">All Recorded Values</h2>
              
              {/* Filter buttons for yes/no trackers */}
              {isYesNoTracker && (
                <div className="flex gap-2 justify-center mb-4">
                  <button
                    onClick={() => setYesNoFilter('both')}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      yesNoFilter === 'both'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Both
                  </button>
                  <button
                    onClick={() => setYesNoFilter('yes')}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      yesNoFilter === 'yes'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Yes Only
                  </button>
                  <button
                    onClick={() => setYesNoFilter('no')}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      yesNoFilter === 'no'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    No Only
                  </button>
                </div>
              )}
              
              <div className="mt-2 text-xs text-gray-600 w-full">
                {sortedYears.length === 0 ? (
                  <div className="text-gray-400 italic text-center">No values entered yet.</div>
                ) : (
                  sortedYears.map(year => {
                    const yearAnswers = groupedByYear[year].sort((a, b) => new Date(b.date) - new Date(a.date));
                    return (
                      <div key={year} className="mb-4">
                        <h3 className="text-sm font-semibold text-gray-700 mb-2 pb-1 border-b border-gray-200">
                          {year}
                        </h3>
                        {yearAnswers.map(ans => {
                          const age = calculateAge(ans.date);
                          return (
                            <div key={ans.id || ans.date} className="flex justify-between items-center px-2 py-1 border-b last:border-b-0">
                              <div className="flex flex-col">
                                <span className="text-[11px] text-gray-500">
                                  {moment(ans.date).format('DD-MM-YYYY')}
                                </span>
                                <span className="text-[10px] text-gray-400 mt-0.5">
                                  Age: {age}
                                </span>
                              </div>
                              <span className="font-mono text-[13px] text-gray-800">
                                {ans.value !== undefined ? ans.value : (ans.answer !== undefined ? (ans.answer === 'yes' ? 'Yes' : ans.answer === 'no' ? 'No' : ans.answer) : '')}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        );
      })()}
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
                className={`px-4 py-2 rounded-lg transition-colors cursor-pointer
                  ${existingAnswer && existingAnswer.answer && existingAnswer.answer.toLowerCase() === 'yes'
                    ? 'bg-green-600 text-white hover:bg-green-700 ring-2 ring-green-300'
                    : 'bg-green-500 text-white hover:bg-green-600'}
                `}
              >
                Yes
              </button>
              <button
                onClick={() => handleYesNo('no')}
                className={`px-4 py-2 rounded-lg transition-colors cursor-pointer
                  ${existingAnswer && existingAnswer.answer && existingAnswer.answer.toLowerCase() === 'no'
                    ? 'bg-red-600 text-white hover:bg-red-700 ring-2 ring-red-300'
                    : 'bg-red-500 text-white hover:bg-red-600'}
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
      {/* Custom Date Modal */}
      {showCustomDateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-2">Enter Value for Custom Date</h2>
            {tracker.question && (
              <div className="mb-4 text-sm text-gray-700 font-medium">{tracker.question}</div>
            )}
            
            {/* Date Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Date:</label>
              <input
                type="date"
                value={customDate}
                onChange={(e) => {
                  setCustomDate(e.target.value);
                  const existing = getAnswerForDate(e.target.value);
                  setCustomExistingAnswer(existing);
                  if (existing) {
                    const type = tracker.type ? tracker.type.toLowerCase() : '';
                    if (type === 'value') {
                      setCustomValue(existing.value || existing.answer || '');
                    } else if (type === 'yes,no' || type === 'yesno' || type === 'yes/no') {
                      setCustomValue(existing.answer || '');
                    }
                  } else {
                    setCustomValue('');
                  }
                }}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                max={moment().format('YYYY-MM-DD')}
              />
            </div>
            
            {/* Yes/No or Value Input based on tracker type */}
            {(() => {
              const type = tracker.type ? tracker.type.toLowerCase() : '';
              const isYesNoTracker = type === 'yes,no' || type === 'yesno' || type === 'yes/no';
              const isValueTracker = type === 'value';
              
              if (isYesNoTracker) {
                return (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Answer:</label>
                    <div className="flex gap-4">
                      <button
                        onClick={() => setCustomValue('yes')}
                        className={`px-4 py-2 rounded-lg transition-colors ${
                          customValue === 'yes'
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-green-100'
                        }`}
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setCustomValue('no')}
                        className={`px-4 py-2 rounded-lg transition-colors ${
                          customValue === 'no'
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-red-100'
                        }`}
                      >
                        No
                      </button>
                    </div>
                    {customExistingAnswer && (
                      <p className="mt-2 text-xs text-gray-500">
                        Existing answer: {customExistingAnswer.answer}
                      </p>
                    )}
                  </div>
                );
              } else if (isValueTracker) {
                return (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Value:</label>
                    <input
                      type="text"
                      value={customValue}
                      onChange={(e) => setCustomValue(e.target.value)}
                      placeholder="Enter value"
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                    {customExistingAnswer && (
                      <p className="mt-2 text-xs text-gray-500">
                        Existing value: {customExistingAnswer.value || customExistingAnswer.answer}
                      </p>
                    )}
                  </div>
                );
              } else {
                // Default tracker type
                return null;
              }
            })()}
            
            <div className="flex justify-between items-center mt-4">
              <div>
                {customExistingAnswer && (
                  <button
                    onClick={handleRemoveCustomDateAnswer}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Remove Answer
                  </button>
                )}
              </div>
              <div className="flex gap-4">
                <button
                  onClick={handleCancelCustomDateModal}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCustomDateSubmit}
                  className="px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 rounded-lg transition-colors"
                >
                  Submit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Footer */}
      <div className="mt-4 pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
        {!isDevMode && (() => {
          const type = tracker.type ? tracker.type.toLowerCase() : '';
          const isYesNoTracker = type === 'yes,no' || type === 'yesno' || type === 'yes/no';
          
          if (isYesNoTracker) {
            // For yes/no trackers, show last recorded yes and no separately
            if (!lastRecordedYesDate && !lastRecordedNoDate) return null;
            
            return (
              <div className="flex flex-col gap-1">
                {lastRecordedYesDate && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Last recorded yes:</span>
                    <span>({lastRecordedYesAge})</span>
                  </div>
                )}
                {lastRecordedNoDate && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Last recorded no:</span>
                    <span>({lastRecordedNoAge})</span>
                  </div>
                )}
              </div>
            );
          } else {
            // For other trackers, show the old format
            if (!lastRecordedDate) return null;
            
            return (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1">
                  <span className="font-medium">Last recorded:</span>
                  <span>{moment(lastRecordedDate).format('DD-MM-YYYY')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-medium">Age:</span>
                  <span>{lastRecordedAge}</span>
                </div>
              </div>
            );
          }
        })()}
        <div className="flex items-center gap-2 ml-auto">
          <span className="font-medium">Total events: {answers.length}</span>
        </div>
        {isDevMode && (
          <div className="flex items-center gap-1 ml-4">
            <span>ID:</span>
            <code className="font-mono bg-gray-50 px-1 py-0.5 rounded">{tracker.id}</code>
            <button
              onClick={handleCopyToClipboard}
              className="flex items-center gap-1 hover:text-gray-700 transition-colors ml-1"
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
        )}
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