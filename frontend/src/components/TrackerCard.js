import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateNoteById, deleteNoteById, getNoteById, addNewNoteCommon } from '../utils/ApiUtils';
import { createTrackerAnswerNote } from '../utils/TrackerQuestionUtils';
import { ChartBarIcon, CalendarIcon, ArrowPathIcon, PencilIcon, ClockIcon, ClipboardIcon, ClipboardDocumentCheckIcon, PlusIcon, TrashIcon, EllipsisVerticalIcon, Cog6ToothIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';
import { Line } from 'react-chartjs-2';
import moment from 'moment';
import { toast } from 'react-hot-toast';

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

export default function TrackerCard({ tracker, onToggleDay, answers = [], onEdit, isFocusMode, isDevMode, onRefresh, onTrackerConverted, onTrackerDeleted }) {
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
        const idx = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(d.toLowerCase().slice(0, 3));
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
  const [selectedEntries, setSelectedEntries] = useState(new Set()); // Set of answer IDs
  // State for monthly modal pending changes (date -> answer value: 'yes', 'no', string value, or null for remove)
  const [monthlyModalPendingChanges, setMonthlyModalPendingChanges] = useState({});
  // State for value input popup in monthly modal
  const [monthlyModalValueInput, setMonthlyModalValueInput] = useState({
    show: false,
    dateStr: null,
    value: '',
    dateObj: null
  });
  // State for adhoc modals
  const [showAdhocDateModal, setShowAdhocDateModal] = useState(false);
  const [showAdhocValueModal, setShowAdhocValueModal] = useState(false);
  const [adhocDate, setAdhocDate] = useState(moment().format('YYYY-MM-DD'));
  const [adhocNotes, setAdhocNotes] = useState('');
  const [adhocValue, setAdhocValue] = useState('');
  const [editingAdhocAnswer, setEditingAdhocAnswer] = useState(null);
  const [showConvertMenu, setShowConvertMenu] = useState(false);

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

  // Handler for adhoc date submission
  const handleAdhocDateSubmit = async () => {
    if (!adhocDate) {
      alert('Please select a date');
      return;
    }

    try {
      if (editingAdhocAnswer && editingAdhocAnswer.id) {
        // Update existing note
        const updatedContent = `Answer: ${adhocDate}\nDate: ${adhocDate}\nrecorded_on_date: ${adhocDate}\nmeta::link:${tracker.id}\nmeta::tracker_answer\nanswer for ${tracker.title}${adhocNotes.trim() ? `\nNotes: ${adhocNotes.trim()}` : ''}`;
        await updateNoteById(editingAdhocAnswer.id, updatedContent);
      } else {
        // Create new note
        await createTrackerAnswerNote(tracker.id, adhocDate, adhocDate, adhocNotes, tracker.title);
      }
      // Reload trackers to refresh the list
      if (onRefresh) {
        onRefresh();
      }
      setShowAdhocDateModal(false);
      setAdhocDate(moment().format('YYYY-MM-DD'));
      setAdhocNotes('');
      setEditingAdhocAnswer(null);
    } catch (error) {
      console.error('Error saving adhoc date:', error);
      alert('Failed to save event');
    }
  };

  // Handler for adhoc value submission
  const handleAdhocValueSubmit = async () => {
    if (!adhocDate) {
      alert('Please select a date');
      return;
    }
    if (!adhocValue.trim()) {
      alert('Please enter a value');
      return;
    }

    try {
      if (editingAdhocAnswer && editingAdhocAnswer.id) {
        // Update existing note
        const updatedContent = `Answer: ${adhocValue.trim()}\nDate: ${adhocDate}\nrecorded_on_date: ${adhocDate}\nmeta::link:${tracker.id}\nmeta::tracker_answer\nanswer for ${tracker.title}${adhocNotes.trim() ? `\nNotes: ${adhocNotes.trim()}` : ''}`;
        await updateNoteById(editingAdhocAnswer.id, updatedContent);
      } else {
        // Create new note
        await createTrackerAnswerNote(tracker.id, adhocValue.trim(), adhocDate, adhocNotes, tracker.title);
      }
      // Reload trackers to refresh the list
      if (onRefresh) {
        onRefresh();
      }
      setShowAdhocValueModal(false);
      setAdhocDate(moment().format('YYYY-MM-DD'));
      setAdhocValue('');
      setAdhocNotes('');
      setEditingAdhocAnswer(null);
    } catch (error) {
      console.error('Error saving adhoc value:', error);
      alert('Failed to save event');
    }
  };

  // Handler to delete adhoc answer
  const handleDeleteAdhocAnswer = async (answerId, dateStr) => {
    try {
      await deleteNoteById(answerId);
      // Reload trackers to refresh the list
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Error deleting adhoc answer:', error);
      alert('Failed to delete event');
    }
  };

  // Handler to toggle selection of an entry
  const handleToggleEntrySelection = (answerId) => {
    setSelectedEntries(prev => {
      const newSet = new Set(prev);
      if (newSet.has(answerId)) {
        newSet.delete(answerId);
      } else {
        newSet.add(answerId);
      }
      return newSet;
    });
  };

  // Handler to select all entries
  const handleSelectAll = (filteredAnswers) => {
    const allIds = filteredAnswers
      .filter(ans => ans.id) // Only select entries with valid IDs (can be deleted)
      .map(ans => ans.id);
    setSelectedEntries(new Set(allIds));
  };

  // Handler to deselect all entries
  const handleDeselectAll = () => {
    setSelectedEntries(new Set());
  };

  // Handler to delete all selected entries
  const handleDeleteSelected = async (filteredAnswers) => {
    const selectedCount = selectedEntries.size;
    if (selectedCount === 0) {
      alert('No entries selected');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${selectedCount} selected entry/entries?`)) {
      return;
    }

    try {
      // Delete all selected entries
      const deletePromises = Array.from(selectedEntries).map(id => deleteNoteById(id));
      await Promise.all(deletePromises);

      // Clear selections
      setSelectedEntries(new Set());

      // Reload trackers to refresh the list
      if (onRefresh) {
        onRefresh();
      }

      toast.success(`Successfully deleted ${selectedCount} entry/entries`);
    } catch (error) {
      console.error('Error deleting selected entries:', error);
      alert('Failed to delete some entries');
    }
  };

  // Handler to convert tracker type
  const handleConvertTrackerType = async (newType) => {
    try {
      // Get the current tracker note
      let trackerNote;
      let trackerContent = null;

      try {
        trackerNote = await getNoteById(tracker.id);
        if (trackerNote && trackerNote.content) {
          trackerContent = trackerNote.content;
        }
      } catch (fetchError) {
        console.warn(`Failed to fetch tracker note ${tracker.id} for conversion, reconstructing from tracker object:`, fetchError);
        // If the note doesn't exist, reconstruct it from the tracker object
        const contentLines = [];
        if (tracker.title) contentLines.push(`Title: ${tracker.title}`);
        if (tracker.question) contentLines.push(`Question: ${tracker.question}`);
        // Use the new type instead of the old one
        contentLines.push(`Type: ${newType}`);
        if (tracker.cadence) contentLines.push(`Cadence: ${tracker.cadence}`);
        if (tracker.days && tracker.days.length > 0) {
          contentLines.push(`Days: ${tracker.days.join(', ')}`);
        }
        if (tracker.startDate) contentLines.push(`Start Date: ${tracker.startDate}`);
        if (tracker.endDate) contentLines.push(`End Date: ${tracker.endDate}`);
        contentLines.push('meta::tracker');

        trackerContent = contentLines.join('\n');
        console.log('Reconstructed tracker content from tracker object for conversion');
      }

      if (!trackerContent) {
        alert('Unable to get tracker content. The tracker may have been deleted.');
        return;
      }

      // Update the Type field in the note content
      const lines = trackerContent.split('\n');
      const updatedLines = lines.map(line => {
        if (line.startsWith('Type:')) {
          return `Type: ${newType}`;
        }
        return line;
      });

      const updatedContent = updatedLines.join('\n');

      // Update the tracker note (or create it if it doesn't exist)
      if (trackerNote && trackerNote.id) {
        // Note exists, update it
        await updateNoteById(tracker.id, updatedContent);
      } else {
        // Note doesn't exist, try to update anyway (in case it was just created)
        try {
          await updateNoteById(tracker.id, updatedContent);
        } catch (updateError) {
          // If update fails, create a new note
          console.warn(`Could not update tracker note ${tracker.id}, creating new note:`, updateError);
          const newNote = await addNewNoteCommon(updatedContent, [], null);
          console.log(`Created new tracker note with ID: ${newNote.id} (original ID was: ${tracker.id})`);
          // Note: The tracker object will still reference the old ID, but the refresh should handle this
        }
      }

      // Notify parent component to refresh
      if (onTrackerConverted) {
        onTrackerConverted(tracker.id, newType);
      }

      if (onRefresh) {
        onRefresh();
      }

      setShowConvertMenu(false);
      toast.success(`Tracker converted to ${newType === 'adhoc_date' ? 'Adhoc Date' : 'Adhoc Value'}`);
    } catch (error) {
      console.error('Error converting tracker type:', error);
      alert('Failed to convert tracker type');
    }
  };

  // Handler to duplicate tracker
  const handleDuplicateTracker = async () => {
    try {
      // Validate tracker ID
      if (!tracker || !tracker.id) {
        alert('Invalid tracker: missing ID');
        return;
      }

      console.log(`Starting duplication for tracker ${tracker.id} (${tracker.title})`);

      // Get the current tracker note
      let trackerNote;
      let trackerContent = null;

      try {
        trackerNote = await getNoteById(tracker.id);
        if (trackerNote && trackerNote.content) {
          trackerContent = trackerNote.content;
        }
      } catch (fetchError) {
        console.warn(`Failed to fetch tracker note ${tracker.id}, reconstructing from tracker object:`, fetchError);
        // If the note doesn't exist, reconstruct it from the tracker object
        // This handles cases where the note was deleted but the tracker object still exists
        const contentLines = [];
        if (tracker.title) contentLines.push(`Title: ${tracker.title}`);
        if (tracker.question) contentLines.push(`Question: ${tracker.question}`);
        if (tracker.type) contentLines.push(`Type: ${tracker.type}`);
        if (tracker.cadence) contentLines.push(`Cadence: ${tracker.cadence}`);
        if (tracker.days && tracker.days.length > 0) {
          contentLines.push(`Days: ${tracker.days.join(', ')}`);
        }
        if (tracker.startDate) contentLines.push(`Start Date: ${tracker.startDate}`);
        if (tracker.endDate) contentLines.push(`End Date: ${tracker.endDate}`);
        contentLines.push('meta::tracker');

        trackerContent = contentLines.join('\n');
        console.log('Reconstructed tracker content from tracker object');
      }

      if (!trackerContent) {
        alert('Unable to get tracker content. The tracker may have been deleted.');
        return;
      }

      // Parse the tracker note content
      const lines = trackerContent.split('\n');
      const updatedLines = lines.map(line => {
        // Add "duplicate" to the title
        if (line.startsWith('Title:')) {
          const currentTitle = line.replace('Title:', '').trim();
          return `Title: ${currentTitle} duplicate`;
        }
        // Remove any existing meta::link to break the link to original tracker
        if (line.startsWith('meta::link:')) {
          return ''; // Remove the link line, it will be set when the note is created
        }
        return line;
      }).filter(line => line !== ''); // Remove empty lines

      const duplicatedContent = updatedLines.join('\n');

      // Create the duplicated tracker note
      const newTrackerNote = await addNewNoteCommon(duplicatedContent, [], null);

      if (!newTrackerNote || !newTrackerNote.id) {
        alert('Failed to create duplicated tracker');
        return;
      }

      const newTrackerId = newTrackerNote.id;

      // Debug: Log answers array
      console.log(`[Duplicate] Answers array for tracker ${tracker.id}:`, answers);
      console.log(`[Duplicate] Answers length:`, answers ? answers.length : 0);

      // Duplicate all answer notes
      if (answers && answers.length > 0) {
        console.log(`[Duplicate] Processing ${answers.length} answers...`);
        const validAnswers = answers.filter(answer => {
          // Filter out invalid answers
          if (!answer || !answer.id) {
            console.warn(`[Duplicate] Filtering out answer without ID:`, answer);
            return false;
          }
          // Additional validation: ensure ID is a string/number, not an object
          if (typeof answer.id !== 'string' && typeof answer.id !== 'number') {
            console.warn('[Duplicate] Invalid answer ID format:', answer.id, typeof answer.id);
            return false;
          }
          console.log(`[Duplicate] Valid answer found:`, { id: answer.id, date: answer.date, answer: answer.answer });
          return true;
        });
        console.log(`[Duplicate] Attempting to duplicate ${validAnswers.length} answer notes for tracker ${tracker.id} (filtered from ${answers.length} total)`);

        // Use Promise.allSettled instead of Promise.all to handle individual failures
        const duplicatePromises = validAnswers.map(async (answer) => {
          try {
            // Validate answer ID before attempting fetch
            const answerId = String(answer.id).trim();
            if (!answerId || answerId === 'undefined' || answerId === 'null') {
              console.warn(`Invalid answer ID, skipping:`, answer);
              return { success: false, answerId: answer.id };
            }

            // Get the original answer note
            let answerNote;
            let answerContent = null;

            try {
              answerNote = await getNoteById(answerId);
              if (answerNote && answerNote.content) {
                answerContent = answerNote.content;
              }
            } catch (fetchError) {
              // If note doesn't exist, reconstruct it from the answer object
              console.warn(`Answer note ${answerId} could not be fetched, reconstructing from answer object:`, fetchError.message);

              // Reconstruct answer content from answer object data
              const answerValue = answer.answer || answer.value || '';
              const answerDate = answer.date || '';
              const answerNotes = answer.notes || '';

              if (!answerValue || !answerDate) {
                console.warn(`[Duplicate] Cannot reconstruct answer - missing value or date:`, answer);
                return { success: false, answerId: answerId };
              }

              // Build the answer content similar to createTrackerAnswerNote
              const contentLines = [
                `Answer: ${answerValue}`,
                `Date: ${answerDate}`,
                `recorded_on_date: ${answerDate}`,
                `meta::link:${newTrackerId}`,
                `meta::tracker_answer`
              ];

              if (answerNotes && answerNotes.trim()) {
                contentLines.push(`Notes: ${answerNotes.trim()}`);
              }

              answerContent = contentLines.join('\n');
              console.log(`[Duplicate] Reconstructed answer content from answer object:`, answerContent);
            }

            if (!answerContent) {
              console.warn(`Answer note ${answerId} has no content, skipping`);
              return { success: false, answerId: answerId };
            }

            // Parse and update the answer note content
            const answerLines = answerContent.split('\n');
            console.log(`[Duplicate] Answer content (first 10 lines):`, answerLines.slice(0, 10));

            // Verify required fields exist
            const hasAnswer = answerLines.some(line => line.startsWith('Answer:'));
            const hasDate = answerLines.some(line => line.startsWith('Date:'));
            const hasLink = answerLines.some(line => line.startsWith('meta::link:'));
            const hasTrackerAnswer = answerLines.some(line => line === 'meta::tracker_answer');

            console.log(`[Duplicate] Answer note structure check:`, {
              hasAnswer,
              hasDate,
              hasLink,
              hasTrackerAnswer,
              totalLines: answerLines.length
            });

            if (!hasAnswer || !hasDate || !hasLink || !hasTrackerAnswer) {
              console.warn(`[Duplicate] Answer note ${answerId} is missing required fields!`, {
                hasAnswer,
                hasDate,
                hasLink,
                hasTrackerAnswer
              });
            }

            const updatedAnswerLines = answerLines.map(line => {
              // Update the meta::link to point to the new tracker
              if (line.startsWith('meta::link:')) {
                console.log(`[Duplicate] Updating meta::link from ${line} to meta::link:${newTrackerId}`);
                return `meta::link:${newTrackerId}`;
              }
              return line;
            });

            const duplicatedAnswerContent = updatedAnswerLines.join('\n');
            console.log(`[Duplicate] Duplicated answer content:`, duplicatedAnswerContent);
            console.log(`[Duplicate] Duplicated answer content (first 10 lines):`, duplicatedAnswerContent.split('\n').slice(0, 10));

            // Create the duplicated answer note
            console.log(`[Duplicate] Creating duplicated answer note with content:`, duplicatedAnswerContent.substring(0, 200));
            const duplicatedAnswer = await addNewNoteCommon(duplicatedAnswerContent, [], null);
            console.log(`[Duplicate] Successfully duplicated answer ${answerId} -> ${duplicatedAnswer.id}`);
            return { success: true, answerId: answerId, newAnswerId: duplicatedAnswer.id };
          } catch (error) {
            console.error(`Error duplicating answer ${answer.id}:`, error);
            // Continue with other answers even if one fails
            return { success: false, answerId: answer.id, error: error.message };
          }
        });

        // Use Promise.allSettled to ensure all promises complete even if some fail
        console.log(`[Duplicate] Waiting for ${duplicatePromises.length} answer duplications to complete...`);
        const results = await Promise.allSettled(duplicatePromises);

        // Log detailed results
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            if (result.value && result.value.success) {
              console.log(`[Duplicate] ✓ Answer ${index + 1} duplicated successfully: ${result.value.answerId} -> ${result.value.newAnswerId}`);
            } else {
              console.error(`[Duplicate] ✗ Answer ${index + 1} failed:`, result.value);
            }
          } else {
            console.error(`[Duplicate] ✗ Answer ${index + 1} rejected:`, result.reason);
          }
        });

        const successfulDuplicates = results.filter(r =>
          r.status === 'fulfilled' && r.value && r.value.success === true
        ).length;
        const failedDuplicates = results.filter(r =>
          r.status === 'rejected' || (r.status === 'fulfilled' && (!r.value || r.value.success === false))
        ).length;
        console.log(`[Duplicate] Duplication complete: ${successfulDuplicates} succeeded, ${failedDuplicates} failed out of ${validAnswers.length} answer notes`);

        // Show appropriate success message
        if (validAnswers.length > 0) {
          if (successfulDuplicates === validAnswers.length) {
            toast.success(`Tracker duplicated successfully with all ${successfulDuplicates} answers`);
          } else if (successfulDuplicates > 0) {
            toast.success(`Tracker duplicated with ${successfulDuplicates} out of ${validAnswers.length} answers (${failedDuplicates} skipped)`);
          } else {
            toast.error(`Tracker duplicated, but no answers could be duplicated (${failedDuplicates} failed). Check console for details.`);
          }
        } else {
          toast.success('Tracker duplicated successfully (no answers to duplicate)');
        }
      } else {
        console.warn(`[Duplicate] No answers to duplicate. Answers array:`, answers);
        toast.success('Tracker duplicated successfully (no answers to duplicate)');
      }

      // Wait a bit before refreshing to ensure all notes are saved
      await new Promise(resolve => setTimeout(resolve, 500));

      // Refresh the tracker list
      if (onRefresh) {
        console.log('[Duplicate] Refreshing tracker list...');
        onRefresh();
      }

      setShowConvertMenu(false);
    } catch (error) {
      console.error('Error duplicating tracker:', error);
      alert('Failed to duplicate tracker');
    }
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
            const idx = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(d.toLowerCase().slice(0, 3));
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
      // For yes/no trackers, use the most recent answer regardless of yes/no
      // This ensures overdue calculation uses the last recorded date even if it's "no"
      const sortedAnswers = [...answers].sort((a, b) => moment(b.date).valueOf() - moment(a.date).valueOf());
      return sortedAnswers[0].date;
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

  // Calculate days since last entry
  const getDaysSinceLastEntry = () => {
    if (!lastRecordedDate) return null;
    const today = moment();
    const lastDate = moment(lastRecordedDate);
    return today.diff(lastDate, 'days');
  };

  const daysSinceLastEntry = getDaysSinceLastEntry();
  // Get overdue threshold from tracker.overdueDays if present, otherwise default to 30
  const isUsingDefaultOverdue = !tracker.overdueDays;
  const overdueThreshold = tracker.overdueDays ? parseInt(tracker.overdueDays) : 30;
  const isOverdue = daysSinceLastEntry !== null && daysSinceLastEntry > overdueThreshold;
  // Calculate days until overdue (if not already overdue)
  const daysUntilOverdue = daysSinceLastEntry !== null && !isOverdue
    ? overdueThreshold - daysSinceLastEntry
    : null;

  // Calculate weekly progress
  const getWeeklyProgress = () => {
    const today = moment();
    const startOfWeek = moment(today).startOf('week').subtract(dateOffset * 7, 'days');
    const endOfWeek = moment(today).endOf('week').subtract(dateOffset * 7, 'days');

    const weekAnswers = answers.filter(ans => {
      const answerDate = moment(ans.date);
      return answerDate.isSameOrAfter(startOfWeek) && answerDate.isSameOrBefore(endOfWeek);
    });

    // For yes/no trackers, count only "yes" answers
    const type = tracker.type ? tracker.type.toLowerCase() : '';
    const isYesNoTracker = type === 'yes,no' || type === 'yesno' || type === 'yes/no';
    const completedDays = isYesNoTracker
      ? weekAnswers.filter(ans => ans.answer && ans.answer.toLowerCase() === 'yes').length
      : weekAnswers.length;

    return {
      completed: completedDays,
      total: 7,
      percentage: Math.round((completedDays / 7) * 100)
    };
  };

  // Calculate current streak
  const getCurrentStreak = () => {
    if (!answers || answers.length === 0) return 0;

    const type = tracker.type ? tracker.type.toLowerCase() : '';
    const isYesNoTracker = type === 'yes,no' || type === 'yesno' || type === 'yes/no';

    // Filter answers - for yes/no, only count "yes"
    const validAnswers = isYesNoTracker
      ? answers.filter(ans => ans.answer && ans.answer.toLowerCase() === 'yes')
      : answers;

    if (validAnswers.length === 0) return 0;

    // Sort by date (most recent first)
    const sortedAnswers = [...validAnswers].sort((a, b) => moment(b.date).valueOf() - moment(a.date).valueOf());

    // Check if most recent answer is today or yesterday
    const today = moment().startOf('day');
    const mostRecent = moment(sortedAnswers[0].date).startOf('day');
    const daysDiff = today.diff(mostRecent, 'days');

    // If most recent is more than 1 day ago, streak is broken
    if (daysDiff > 1) return 0;

    // Count consecutive days
    let streak = 0;
    let currentDate = moment(today);

    for (const answer of sortedAnswers) {
      const answerDate = moment(answer.date).startOf('day');
      const diff = currentDate.diff(answerDate, 'days');

      if (diff === 0 || diff === 1) {
        streak++;
        currentDate = answerDate;
      } else {
        break;
      }
    }

    return streak;
  };

  // Calculate total check-ins
  const getTotalCheckIns = () => {
    const type = tracker.type ? tracker.type.toLowerCase() : '';
    const isYesNoTracker = type === 'yes,no' || type === 'yesno' || type === 'yes/no';

    // For yes/no trackers, count only "yes" answers
    if (isYesNoTracker) {
      return answers.filter(ans => ans.answer && ans.answer.toLowerCase() === 'yes').length;
    }

    return answers.length;
  };

  const weeklyProgress = getWeeklyProgress();
  const currentStreak = getCurrentStreak();
  const totalCheckIns = getTotalCheckIns();

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(tracker.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Get current week's days for display (with offset support)
  const getCurrentWeekDays = () => {
    const today = moment();
    const startOfWeek = moment(today).startOf('week').subtract(dateOffset * 7, 'days');
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(moment(startOfWeek).add(i, 'days'));
    }
    return days;
  };

  const weekDays = getCurrentWeekDays();
  const currentMonthYear = weekDays[0].format('MMM YYYY');

  return (
    <div className={`bg-white rounded-lg shadow-sm p-6 relative ${isOverdue ? 'border-2 border-red-500' : ''}`} title={isOverdue ? `Overdue: ${daysSinceLastEntry} days since last entry` : ''}>

      {/* Header */}
      <div className="mb-6">
        <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xl font-bold text-gray-900">{tracker.title}</h3>
              {(() => {
                const type = tracker.type ? tracker.type.toLowerCase() : '';
                const isAdhocDate = type === 'adhoc_date';
                const isAdhocValue = type === 'adhoc_value';
                // Don't show cadence for adhoc trackers
                if (isAdhocDate || isAdhocValue) {
                  return null;
                }
                return (
                  <span className="text-sm text-gray-500 capitalize">
                    {tracker.cadence ? `${tracker.cadence} tracker` : 'Tracker'}
                  </span>
                );
              })()}
            </div>
            {tracker.tags && Array.isArray(tracker.tags) && tracker.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {tracker.tags.map((tag, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    {tag.trim()}
                  </span>
                ))}
              </div>
            )}
            {!isFocusMode && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => onEdit(tracker)}
                  className="p-1 text-gray-500 hover:text-gray-700 transition-colors bg-white rounded"
                  title="Edit tracker"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setShowMonthlyModal(true)}
                  className="p-1 text-gray-500 hover:text-gray-700 transition-colors bg-white rounded"
                  title="Settings"
                >
                  <Cog6ToothIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => navigate(`/tracker-stats-analysis?tracker=${tracker.id}`)}
                  className="p-1 text-gray-500 hover:text-gray-700 transition-colors bg-white rounded"
                  title="Show stats"
                >
                  <ChartBarIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setShowLastValuesModal(true)}
                  className="p-1 text-gray-500 hover:text-gray-700 transition-colors bg-white rounded"
                  title="View all values"
                >
                  <ClipboardDocumentCheckIcon className="h-4 w-4" />
                </button>
                {onTrackerDeleted && (
                  <button
                    onClick={async () => {
                      if (window.confirm('Are you sure you want to delete this tracker?')) {
                        try {
                          await deleteNoteById(tracker.id);
                          if (onTrackerDeleted) {
                            onTrackerDeleted(tracker.id);
                          }
                          if (onRefresh) {
                            onRefresh();
                          }
                        } catch (error) {
                          console.error('Error deleting tracker:', error);
                          alert('Failed to delete tracker');
                        }
                      }
                    }}
                    className="p-1 text-gray-500 hover:text-red-600 transition-colors bg-white rounded"
                    title="Delete tracker"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                )}
                <div className="relative">
                  <button
                    onClick={() => setShowConvertMenu(!showConvertMenu)}
                    className="p-1 text-gray-500 hover:text-gray-700 transition-colors bg-white rounded"
                    title="More options"
                  >
                    <EllipsisVerticalIcon className="h-4 w-4" />
                  </button>
                  {showConvertMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowConvertMenu(false)}
                      />
                      <div className="absolute right-0 mt-2 w-44 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                        <div className="py-1">
                          <div className="px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase border-b border-gray-200">
                            Convert to Adhoc
                          </div>
                          <button
                            onClick={() => handleConvertTrackerType('adhoc_date')}
                            className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100"
                          >
                            Adhoc Date
                          </button>
                          <button
                            onClick={() => handleConvertTrackerType('adhoc_value')}
                            className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100"
                          >
                            Adhoc Value
                          </button>
                          <div className="px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase border-t border-gray-200 mt-1">
                            Actions
                          </div>
                          <button
                            onClick={() => handleDuplicateTracker()}
                            className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100"
                          >
                            Duplicate Tracker
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* For adhoc trackers and yes/no trackers, show last events as round buttons (7 for adhoc_date, 4 for adhoc_value, 7 for yes/no) */}
      {(() => {
        const type = tracker.type ? tracker.type.toLowerCase() : '';
        const isAdhocDate = type === 'adhoc_date';
        const isAdhocValue = type === 'adhoc_value';
        const isYesNoTracker = type === 'yes,no' || type === 'yesno' || type === 'yes/no';

        if (isAdhocDate || isAdhocValue || isYesNoTracker) {
          // For yes/no trackers, always show last 7 days regardless of answers
          // For adhoc trackers, show last events with answers
          let displayDays = [];

          if (isYesNoTracker) {
            // Check if tracker has selected days (for weekly cadence)
            let daysToShow = [];
            if (tracker.days && tracker.days.length > 0) {
              // Convert tracker.days to weekday indices (0 = Sunday, 6 = Saturday)
              const selectedDays = tracker.days.map(d => {
                if (typeof d === 'string') {
                  // Try to convert to weekday index
                  const idx = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(d.toLowerCase().slice(0, 3));
                  return idx >= 0 ? idx : d;
                }
                return d;
              }).filter(d => typeof d === 'number' && d >= 0 && d <= 6);

              // Get last 7 occurrences of selected days
              daysToShow = getLastSevenSelectedWeekdays(selectedDays);
            } else {
              // Generate last 7 consecutive days from today going backwards
              for (let i = 6; i >= 0; i--) {
                daysToShow.push(moment().subtract(i, 'days'));
              }
            }

            // Create displayDays array with answers
            daysToShow.forEach(day => {
              const dateStr = day.format('YYYY-MM-DD');
              // Find answer for this date if it exists
              const answer = answers.find(ans => ans.date === dateStr);
              displayDays.push({
                date: dateStr,
                dateMoment: day,
                answer: answer || null
              });
            });
          } else {
            // For adhoc trackers, use existing logic
            const sortedAnswers = [...answers].sort((a, b) => new Date(b.date) - new Date(a.date));
            const maxAnswers = isAdhocValue ? 4 : 7;
            const lastAnswers = sortedAnswers.slice(0, maxAnswers);
            displayDays = lastAnswers.reverse().map(answer => ({
              date: answer.date,
              dateMoment: moment(answer.date),
              answer: answer
            }));
          }

          // Calculate days from last logging for adhoc_date and adhoc_value only
          let daysFromLastLogging = null;
          if (!isYesNoTracker && answers.length > 0) {
            const sortedAnswers = [...answers].sort((a, b) => new Date(b.date) - new Date(a.date));
            const lastAnswer = sortedAnswers[0]; // Most recent answer
            const lastDate = moment(lastAnswer.date);
            const today = moment();
            daysFromLastLogging = today.diff(lastDate, 'days');
          }

          return (
            <div className="flex gap-2 justify-center items-center">
              {displayDays.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-4">No events recorded yet</div>
              ) : (
                <>
                  {displayDays.map((dayData) => {
                    const dateMoment = dayData.dateMoment;
                    const dateStr = dayData.date;
                    const answer = dayData.answer;
                    const isToday = dateMoment.format('YYYY-MM-DD') === now.format('YYYY-MM-DD');
                    const weekdayLabel = dateMoment.format('ddd');
                    const monthLabel = dateMoment.format('MMM YYYY');
                    const dayNumber = dateMoment.date();

                    const displayValue = isAdhocValue && answer ? (answer.value || answer.answer || '') : null;
                    const yesNoValue = isYesNoTracker && answer ? (answer.answer || answer.value || '').toLowerCase() : null;

                    // Calculate difference from previous value for adhoc value trackers
                    let valueDifference = null;
                    let daysDifference = null;
                    // Calculate days difference for adhoc date trackers
                    let adhocDateDaysDifference = null;

                    if (isAdhocValue && answer && displayValue) {
                      // Sort all answers by date to find previous one
                      const sortedAllAnswers = [...answers].sort((a, b) => new Date(a.date) - new Date(b.date));
                      const currentIndex = sortedAllAnswers.findIndex(a => a.id === answer.id || (a.date === answer.date && (a.value || a.answer) === displayValue));
                      if (currentIndex > 0) {
                        const previousAnswer = sortedAllAnswers[currentIndex - 1];
                        const previousValue = previousAnswer.value || previousAnswer.answer || '';
                        const currentValueNum = parseFloat(displayValue);
                        const previousValueNum = parseFloat(previousValue);
                        if (!isNaN(currentValueNum) && !isNaN(previousValueNum)) {
                          const diff = currentValueNum - previousValueNum;
                          const roundedDiff = parseFloat(diff.toFixed(2)); // Round to 2 decimal places
                          valueDifference = roundedDiff > 0 ? `+${roundedDiff}` : `${roundedDiff}`;
                        }
                        // Calculate days difference
                        const currentDate = moment(answer.date);
                        const previousDate = moment(previousAnswer.date);
                        const daysDiff = currentDate.diff(previousDate, 'days');
                        daysDifference = daysDiff;
                      }
                    } else if (isAdhocDate && answer) {
                      // For adhoc date trackers, calculate days difference from previous date entry
                      const sortedAllAnswers = [...answers].sort((a, b) => new Date(a.date) - new Date(b.date));
                      const currentIndex = sortedAllAnswers.findIndex(a => a.id === answer.id || a.date === answer.date);
                      if (currentIndex > 0) {
                        const previousAnswer = sortedAllAnswers[currentIndex - 1];
                        const currentDate = moment(answer.date);
                        const previousDate = moment(previousAnswer.date);
                        const daysDiff = currentDate.diff(previousDate, 'days');
                        adhocDateDaysDifference = daysDiff;
                      }
                    }

                    // Determine button color for yes/no trackers
                    let buttonBgColor = '';
                    let buttonBorderColor = '';
                    if (isYesNoTracker) {
                      if (yesNoValue === 'yes') {
                        buttonBgColor = 'bg-green-300';
                        buttonBorderColor = isToday ? 'border-blue-500' : 'border-green-400';
                      } else if (yesNoValue === 'no') {
                        buttonBgColor = 'bg-red-300';
                        buttonBorderColor = isToday ? 'border-blue-500' : 'border-red-400';
                      } else {
                        // No answer (none state)
                        buttonBgColor = 'bg-gray-200';
                        buttonBorderColor = isToday ? 'border-blue-500' : 'border-gray-300';
                      }
                    } else {
                      buttonBgColor = 'bg-green-300';
                      buttonBorderColor = isToday ? 'border-blue-500' : 'border-gray-300';
                    }

                    return (
                      <div key={dateStr} className="flex flex-col items-center w-10">
                        <span className="text-[10px] text-gray-400 mb-0.5 text-center w-full">{weekdayLabel}</span>
                        <button
                          onClick={() => {
                            if (isYesNoTracker) {
                              // Cycle yes -> no -> none
                              handleDateClick(dateMoment, dateStr);
                            } else if (isAdhocDate && answer) {
                              setAdhocDate(answer.date);
                              setAdhocNotes(answer.notes || '');
                              setEditingAdhocAnswer(answer);
                              setShowAdhocDateModal(true);
                            } else if (isAdhocValue && answer) {
                              setAdhocDate(answer.date);
                              setAdhocValue(answer.value || answer.answer || '');
                              setAdhocNotes(answer.notes || '');
                              setEditingAdhocAnswer(answer);
                              setShowAdhocValueModal(true);
                            }
                          }}
                          className={`w-8 h-8 border flex items-center justify-center text-sm rounded-full ${buttonBgColor} ${buttonBorderColor}`}
                          title={`${dateMoment.format('MMM D, YYYY')}${isYesNoTracker ? ` - ${yesNoValue === 'yes' ? 'Yes' : yesNoValue === 'no' ? 'No' : 'None'} (Click to cycle)` : isAdhocValue && answer ? ` - Value: ${answer.value || answer.answer}${valueDifference ? ` (${valueDifference} from previous)` : ''}${daysDifference !== null ? ` (${daysDifference} day${daysDifference !== 1 ? 's' : ''} since previous)` : ''}` : isAdhocDate && answer && adhocDateDaysDifference !== null ? ` (${adhocDateDaysDifference} day${adhocDateDaysDifference !== 1 ? 's' : ''} since previous)` : ''}${answer && answer.notes ? ` - ${answer.notes}` : ''}`}
                        >
                          {dayNumber}
                        </button>
                        {monthLabel && (
                          <span className="text-[10px] text-gray-400 mt-0.5 text-center w-full">{monthLabel}</span>
                        )}
                        {isAdhocValue && displayValue && (
                          <span className="text-[10px] text-gray-700 font-medium mt-0.5 text-center w-full truncate" title={`${displayValue}${valueDifference ? ` (${valueDifference} from previous)` : ''}${daysDifference !== null ? ` (${daysDifference} day${daysDifference !== 1 ? 's' : ''} since previous)` : ''}`}>
                            {displayValue.length > 6 ? `${displayValue.substring(0, 6)}...` : displayValue}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
              {/* Days from last logging - for adhoc_date and adhoc_value only */}
              {(isAdhocDate || isAdhocValue) && daysFromLastLogging !== null && (
                <div className="bg-gray-100 border border-gray-300 rounded-lg px-2 py-1 text-center">
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-700 font-medium leading-tight">
                      {daysFromLastLogging === 0 ? 'Today' : `${daysFromLastLogging} day${daysFromLastLogging !== 1 ? 's' : ''}`}
                    </span>
                    {daysFromLastLogging !== 0 && (
                      <span className="text-[10px] text-gray-600 leading-tight">
                        since last logging
                      </span>
                    )}
                  </div>
                </div>
              )}
              {/* Add button for adhoc trackers only */}
              {(isAdhocDate || isAdhocValue) && (
                <button
                  onClick={() => {
                    if (isAdhocDate) {
                      setAdhocDate(moment().format('YYYY-MM-DD'));
                      setAdhocNotes('');
                      setEditingAdhocAnswer(null);
                      setShowAdhocDateModal(true);
                    } else {
                      setAdhocDate(moment().format('YYYY-MM-DD'));
                      setAdhocValue('');
                      setAdhocNotes('');
                      setEditingAdhocAnswer(null);
                      setShowAdhocValueModal(true);
                    }
                  }}
                  className="flex items-center justify-center w-8 h-8 border border-gray-300 rounded-full bg-white hover:bg-gray-100 transition-colors"
                  title={isAdhocDate ? 'Add Event' : 'Add Value'}
                >
                  <PlusIcon className="h-4 w-4 text-gray-600" />
                </button>
              )}
            </div>
          );
        }

        // Regular trackers - show weekly progress
        return (
          <div className="space-y-6">
            {/* This Week's Progress */}
            <div>
              <p className="text-sm text-gray-500 mb-3">This Week's Progress</p>

              {/* Weekly check-ins */}
              <div className="flex items-center gap-2 mb-3">
                <button
                  className="p-1 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
                  onClick={() => setDateOffset(offset => Math.max(0, offset + 1))}
                  aria-label="Previous week"
                >
                  <ChevronLeftIcon className="h-5 w-5 text-gray-400" />
                </button>

                <div className="flex-1 flex items-center justify-center gap-2 min-w-0">
                  {weekDays.map((day) => {
                    const dateStr = day.format('YYYY-MM-DD');
                    const dayNumber = day.date();
                    const weekdayLabel = day.format('ddd').toUpperCase();
                    const isToday = day.format('YYYY-MM-DD') === moment().format('YYYY-MM-DD');

                    // Check if this day is completed
                    const answerObj = answers.find(ans => ans.date === dateStr);
                    const type = tracker.type ? tracker.type.toLowerCase() : '';
                    const isYesNoTracker = type === 'yes,no' || type === 'yesno' || type === 'yes/no';
                    let isCompleted = false;

                    if (isYesNoTracker) {
                      const answerValue = answerObj?.answer || answerObj?.value;
                      isCompleted = answerObj && typeof answerValue === 'string' && answerValue.toLowerCase() === 'yes';
                    } else {
                      isCompleted = !!answerObj;
                    }

                    return (
                      <div key={dateStr} className="flex flex-col items-center flex-shrink-0">
                        <span className="text-xs text-gray-500 mb-1.5">{weekdayLabel}</span>
                        <div className="relative">
                          <button
                            onClick={() => handleDateClick(day, dateStr)}
                            className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-sm font-medium transition-all
                              ${isToday
                                ? 'bg-blue-500 border-blue-500 text-white'
                                : isCompleted
                                  ? 'bg-white border-gray-300 text-gray-700'
                                  : 'bg-white border-gray-300 text-gray-700'
                              }`}
                            title={day.format('MMM D, YYYY')}
                          >
                            {dayNumber}
                          </button>
                          {isCompleted && !isToday && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
                              <CheckIcon className="h-2.5 w-2.5 text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {dateOffset > 0 && (
                  <button
                    className="p-1 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
                    onClick={() => setDateOffset(offset => Math.max(0, offset - 1))}
                    aria-label="Next week"
                  >
                    <ChevronRightIcon className="h-5 w-5 text-gray-400" />
                  </button>
                )}
              </div>

              {/* Month/Year */}
              <p className="text-xs text-gray-400 text-center mb-3">{currentMonthYear}</p>

              {/* Progress Bar */}
              <div className="mb-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-600">{weeklyProgress.percentage}% Complete This Week</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${weeklyProgress.percentage}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Your Momentum */}
            <div>
              <h4 className="text-base font-bold text-gray-900 mb-4">Your Momentum</h4>
              <div className="grid grid-cols-2 gap-4">
                {/* Total Check-ins */}
                <div>
                  <p className="text-xs text-gray-500 mb-1">Total Check-ins</p>
                  <p className="text-2xl font-bold text-gray-900">{totalCheckIns}</p>
                  {totalCheckIns > 0 && (
                    <p className="text-xs text-gray-500 mt-1">You're doing great! Keep it up.</p>
                  )}
                </div>

                {/* Current Streak */}
                <div>
                  <p className="text-xs text-gray-500 mb-1">Current Streak</p>
                  <p className="text-2xl font-bold text-blue-600">{currentStreak} {currentStreak === 1 ? 'Day' : 'Days'}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
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
                      const idx = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(d.toLowerCase().slice(0, 3));
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
                      className={`w-8 h-8 rounded-full border flex items-center justify-center text-sm ${color} ${isDisabled
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

        // Create a map of dates to background colors for highlighting same-day records
        const dateColorMap = new Map();
        const backgroundColors = [
          'bg-blue-50',
          'bg-green-50',
          'bg-yellow-50',
          'bg-purple-50',
          'bg-pink-50',
          'bg-indigo-50',
          'bg-orange-50',
          'bg-cyan-50'
        ];
        let colorIndex = 0;

        // Assign colors to dates
        filteredAnswers.forEach(ans => {
          const dateStr = moment(ans.date).format('YYYY-MM-DD');
          if (!dateColorMap.has(dateStr)) {
            dateColorMap.set(dateStr, backgroundColors[colorIndex % backgroundColors.length]);
            colorIndex++;
          }
        });

        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-lg relative max-h-[80vh] overflow-y-auto">
              <button
                className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl"
                onClick={() => {
                  setShowLastValuesModal(false);
                  setYesNoFilter('both');
                  setSelectedEntries(new Set());
                }}
                aria-label="Close"
              >
                &times;
              </button>
              <h2 className="text-lg font-semibold mb-4 text-center">All Recorded Values</h2>

              {/* Selection controls */}
              <div className="flex gap-2 justify-between items-center mb-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSelectAll(filteredAnswers)}
                    className="px-3 py-1 text-xs rounded-md bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    onClick={handleDeselectAll}
                    className="px-3 py-1 text-xs rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    Deselect All
                  </button>
                </div>
                {selectedEntries.size > 0 && (
                  <button
                    onClick={() => handleDeleteSelected(filteredAnswers)}
                    className="px-3 py-1 text-xs rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-1"
                  >
                    <TrashIcon className="h-3 w-3" />
                    Delete Selected ({selectedEntries.size})
                  </button>
                )}
              </div>

              {/* Filter buttons for yes/no trackers */}
              {isYesNoTracker && (
                <div className="flex gap-2 justify-center mb-4">
                  <button
                    onClick={() => setYesNoFilter('both')}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${yesNoFilter === 'both'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                  >
                    Both
                  </button>
                  <button
                    onClick={() => setYesNoFilter('yes')}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${yesNoFilter === 'yes'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                  >
                    Yes Only
                  </button>
                  <button
                    onClick={() => setYesNoFilter('no')}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${yesNoFilter === 'no'
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
                          const answerId = ans.id || ans.date;
                          const isSelected = ans.id ? selectedEntries.has(ans.id) : false;
                          const hasValidId = !!ans.id; // Only allow selection if entry has a valid ID
                          const dateStr = moment(ans.date).format('YYYY-MM-DD');
                          const bgColor = dateColorMap.get(dateStr) || '';
                          return (
                            <div key={answerId} className={`flex items-center gap-2 px-2 py-1 border-b last:border-b-0 ${bgColor} hover:opacity-80 transition-opacity`}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => hasValidId && handleToggleEntrySelection(ans.id)}
                                disabled={!hasValidId}
                                className={`h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer ${!hasValidId ? 'opacity-50 cursor-not-allowed' : ''}`}
                                title={!hasValidId ? 'This entry cannot be deleted' : ''}
                              />
                              <div className="flex justify-between items-center flex-1">
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
                        className={`px-4 py-2 rounded-lg transition-colors ${customValue === 'yes'
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-green-100'
                          }`}
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setCustomValue('no')}
                        className={`px-4 py-2 rounded-lg transition-colors ${customValue === 'no'
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
      {/* Adhoc Date Modal */}
      {showAdhocDateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">{editingAdhocAnswer ? 'Edit Event' : 'Add Event'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date:</label>
                <input
                  type="date"
                  value={adhocDate}
                  onChange={(e) => setAdhocDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  max={moment().format('YYYY-MM-DD')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional):</label>
                <textarea
                  value={adhocNotes}
                  onChange={(e) => setAdhocNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  rows="4"
                  placeholder="Enter any details about this event..."
                />
              </div>
            </div>
            <div className="flex justify-between items-center mt-6">
              {editingAdhocAnswer && editingAdhocAnswer.id && (
                <button
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to delete this event?')) {
                      await handleDeleteAdhocAnswer(editingAdhocAnswer.id, editingAdhocAnswer.date);
                      setShowAdhocDateModal(false);
                      setAdhocDate(moment().format('YYYY-MM-DD'));
                      setAdhocNotes('');
                      setEditingAdhocAnswer(null);
                    }
                  }}
                  className="px-4 py-2 bg-red-500 text-white hover:bg-red-600 rounded-lg transition-colors"
                >
                  Delete
                </button>
              )}
              <div className="flex justify-end gap-4 ml-auto">
                <button
                  onClick={() => {
                    setShowAdhocDateModal(false);
                    setAdhocDate(moment().format('YYYY-MM-DD'));
                    setAdhocNotes('');
                    setEditingAdhocAnswer(null);
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdhocDateSubmit}
                  className="px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 rounded-lg transition-colors"
                >
                  {editingAdhocAnswer ? 'Update' : 'Add'} Event
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Adhoc Value Modal */}
      {showAdhocValueModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">{editingAdhocAnswer ? 'Edit Event' : 'Add Event'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date:</label>
                <input
                  type="date"
                  value={adhocDate}
                  onChange={(e) => setAdhocDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  max={moment().format('YYYY-MM-DD')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Value:</label>
                <input
                  type="text"
                  value={adhocValue}
                  onChange={(e) => setAdhocValue(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="Enter value"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional):</label>
                <textarea
                  value={adhocNotes}
                  onChange={(e) => setAdhocNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  rows="4"
                  placeholder="Enter any details about this event..."
                />
              </div>
            </div>
            <div className="flex justify-between items-center mt-6">
              {editingAdhocAnswer && editingAdhocAnswer.id && (
                <button
                  onClick={async () => {
                    if (window.confirm('Are you sure you want to delete this event?')) {
                      await handleDeleteAdhocAnswer(editingAdhocAnswer.id, editingAdhocAnswer.date);
                      setShowAdhocValueModal(false);
                      setAdhocDate(moment().format('YYYY-MM-DD'));
                      setAdhocValue('');
                      setAdhocNotes('');
                      setEditingAdhocAnswer(null);
                    }
                  }}
                  className="px-4 py-2 bg-red-500 text-white hover:bg-red-600 rounded-lg transition-colors"
                >
                  Delete
                </button>
              )}
              <div className="flex justify-end gap-4 ml-auto">
                <button
                  onClick={() => {
                    setShowAdhocValueModal(false);
                    setAdhocDate(moment().format('YYYY-MM-DD'));
                    setAdhocValue('');
                    setAdhocNotes('');
                    setEditingAdhocAnswer(null);
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdhocValueSubmit}
                  className="px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 rounded-lg transition-colors"
                >
                  {editingAdhocAnswer ? 'Update' : 'Add'} Event
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
          const isAdhocDate = type === 'adhoc_date';
          const isAdhocValue = type === 'adhoc_value';

          // For adhoc trackers, only show overdue info
          if (isAdhocDate || isAdhocValue) {
            if (daysUntilOverdue === null && !isOverdue) return null;
            return (
              <div className="flex flex-col gap-1">
                {daysUntilOverdue !== null && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Overdue in:</span>
                    <span>{daysUntilOverdue} day{daysUntilOverdue !== 1 ? 's' : ''}{isUsingDefaultOverdue ? ' (default: 30)' : ''}</span>
                  </div>
                )}
                {isOverdue && daysSinceLastEntry !== null && (
                  <div className="flex items-center gap-1 text-red-600">
                    <span className="font-medium">Overdue:</span>
                    <span>{daysSinceLastEntry} day{daysSinceLastEntry !== 1 ? 's' : ''}{isUsingDefaultOverdue ? ' (default: 30)' : ''}</span>
                  </div>
                )}
              </div>
            );
          }

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
                {daysUntilOverdue !== null && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Overdue in:</span>
                    <span>{daysUntilOverdue} day{daysUntilOverdue !== 1 ? 's' : ''}{isUsingDefaultOverdue ? ' (default: 30)' : ''}</span>
                  </div>
                )}
                {isOverdue && daysSinceLastEntry !== null && (
                  <div className="flex items-center gap-1 text-red-600">
                    <span className="font-medium">Overdue:</span>
                    <span>{daysSinceLastEntry} day{daysSinceLastEntry !== 1 ? 's' : ''}{isUsingDefaultOverdue ? ' (default: 30)' : ''}</span>
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
                {daysUntilOverdue !== null && (
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Overdue in:</span>
                    <span>{daysUntilOverdue} day{daysUntilOverdue !== 1 ? 's' : ''}{isUsingDefaultOverdue ? ' (default: 30)' : ''}</span>
                  </div>
                )}
                {isOverdue && daysSinceLastEntry !== null && (
                  <div className="flex items-center gap-1 text-red-600">
                    <span className="font-medium">Overdue:</span>
                    <span>{daysSinceLastEntry} day{daysSinceLastEntry !== 1 ? 's' : ''}{isUsingDefaultOverdue ? ' (default: 30)' : ''}</span>
                  </div>
                )}
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
    const daysBetween = Math.max(1, Math.ceil((new Date(lastDate) - new Date(firstDate)) / (1000 * 60 * 60 * 24)) + 1);
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
          label: function (context) {
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
          callback: function (value) {
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
        {completionRate !== null && (
          <div className="col-span-2"><span className="font-semibold">Completion Rate:</span> {completionRate.toFixed(1)}%</div>
        )}
      </div>
    </div>
  );
} 