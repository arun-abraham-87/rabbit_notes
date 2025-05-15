import { updateNoteById } from './ApiUtils';

export function findDueRemindersAsNotes(notes) {
  return notes.filter(note => isReminderDue(note, new Date())&& note.content.includes('meta::reminder'))
}

export const findwatchitemsOverdue = (notes) => {
  return notes.filter(note => isReminderDue(note, new Date()) && !note.content.includes('meta::reminder'));
}

export const findRemindersNotDue = (notes) => {
  return notes.filter(note => !isReminderDue(note, new Date()) && note.content.includes('meta::reminder') && !note.content.includes('meta::reminder_dismissed') && !note.content.includes('meta::reminder_dismissed'))
}
export function getLastReviewObject() {
  const reviews = JSON.parse(localStorage.getItem('noteReviews') || '{}');
  return reviews;
}






// Get the last review time for a note from localStorage
export function getLastReviewTime(noteId) {
  const reviews = JSON.parse(localStorage.getItem('noteReviews') || '{}');
  return reviews[noteId] ? new Date(reviews[noteId]) : null;
}

//fiunction for adding current date with nte id into local storage
export function addCurrentDateToLocalStorage(noteId) {
  console.log('Adding current date to local storage for note', noteId);
  const reviews = JSON.parse(localStorage.getItem('noteReviews') || '{}');
  reviews[noteId] = new Date().toISOString();
  localStorage.setItem('noteReviews', JSON.stringify(reviews));
}


// Parse meta::review_cadence:: line from note content
export function parseReviewCadenceMeta(content) {
  if (!content) return null;
  const lines = content.split('\n');
  if (!lines) return null;
  const line = lines.find(l => l && l.startsWith('meta::review_cadence::'));
  if (!line) return null;
  const meta = {};
  line.replace('meta::review_cadence::', '').split(';').forEach(pair => {
    const [k, v] = pair.split('=');
    if (k && v !== undefined) {
      if (k === 'days') meta[k] = v.split(',').map(Number);
      else if (k === 'day' || k === 'month' || k === 'hours' || k === 'minutes') meta[k] = Number(v);
      else meta[k] = v;
    }
  });
  return meta;
}

// Get next review Date object for a note
export function getNextReviewDate(note) {
  let meta = parseReviewCadenceMeta(note.content);
  const lastReview = getLastReviewTime(note.id);
  const now = new Date();
  if (!meta) {
    // Fallback: 12 hours after last review or now
    meta = getDummyCadenceObj();
  }
  // Handle each cadence type
  if (meta.type === 'every-x-hours') {
    const hours = meta.hours || 0;
    const minutes = meta.minutes || 0;
    if (!lastReview) return now;
    return new Date(lastReview.getTime() + (hours * 60 * 60 * 1000) + (minutes * 60 * 1000));
  } else if (meta.type === 'daily') {
    // Next review is next occurrence of meta.time (HH:MM) after lastReview or now
    const [hh, mm] = (meta.time || '09:00').split(':').map(Number);
    let base = lastReview && lastReview > now ? lastReview : now;
    let next = new Date(base);
    next.setHours(hh, mm, 0, 0);
    if (next <= base) next.setDate(next.getDate() + 1);
    return next;
  } else if (meta.type === 'weekly') {
    // Next review is next selected weekday at meta.time after lastReview or now
    const days = Array.isArray(meta.days) ? meta.days : [];
    const [hh, mm] = (meta.time || '09:00').split(':').map(Number);
    let base = lastReview && lastReview > now ? lastReview : now;
    let next = new Date(base);
    next.setHours(hh, mm, 0, 0);
    let tries = 0;
    while (tries < 14) {
      if (days.includes(next.getDay()) && next > base) return next;
      next.setDate(next.getDate() + 1);
      tries++;
    }
    return next;
  } else if (meta.type === 'monthly') {
    // Next review is next meta.day of month at meta.time after lastReview or now
    const day = meta.day || 1;
    const [hh, mm] = (meta.time || '09:00').split(':').map(Number);
    let base = lastReview && lastReview > now ? lastReview : now;
    let next = new Date(base);
    next.setHours(hh, mm, 0, 0);
    if (next.getDate() > day || (next.getDate() === day && next <= base)) {
      // Go to next month
      next.setMonth(next.getMonth() + 1);
    }
    next.setDate(day);
    return next;
  } else if (meta.type === 'yearly') {
    // Next review is next meta.month/meta.day at meta.time after lastReview or now
    const day = meta.day || 1;
    const month = meta.month ? meta.month - 1 : 0; // JS months 0-based
    const [hh, mm] = (meta.time || '09:00').split(':').map(Number);
    let base = lastReview && lastReview > now ? lastReview : now;
    let next = new Date(base);
    next.setHours(hh, mm, 0, 0);
    if (
      next.getMonth() > month ||
      (next.getMonth() === month && (next.getDate() > day || (next.getDate() === day && next <= base)))
    ) {
      next.setFullYear(next.getFullYear() + 1);
    }
    next.setMonth(month);
    next.setDate(day);
    return next;
  }
  // Fallback
  if (!lastReview) return now;
  return new Date(lastReview.getTime() + 12 * 60 * 60 * 1000);
}

// Helper to check if a reminder note is due for review
function isReminderDue(note, now = new Date()) {
  // Check if note or note.content exists
  if (!note || !note.content) return false;

  // Only look at notes with reminder tag
  if (!note.content.includes('meta::watch')) return false;

  // Skip dismissed or snoozed reminders
  if (note.content.includes('meta::reminder_dismissed')) return false;

  // Get the next review time
  const nextReview = getNextReviewDate(note);
  if (!nextReview) return false;

  if (nextReview.getTime() <= now.getTime()) {
    return true;
  }

  return false;
}



// Find reminders that are due for review right now
export function findDueReminders(notes) {
  const now = new Date();
  return findDueRemindersAsNotes(notes)
    .map(note => ({
      note,
      nextReview: getNextReviewDate(note),
      overdueBy: now.getTime() - getNextReviewDate(note).getTime()
    }))
    .sort((a, b) => b.overdueBy - a.overdueBy); // Sort by most overdue first
}

// Render a human-readable cadence summary for a note
export function renderCadenceSummary(note) {
  if (!note || !note.content) return 'Review every 12 hours';
  const meta = parseReviewCadenceMeta(note.content);
  if (!meta) return 'Review every 12 hours';

  let summary = [];

  if (meta.type === 'every-x-hours') {
    let parts = [];
    if (meta.days) parts.push(`${meta.days}d`);
    if (meta.hours) parts.push(`${meta.hours}h`);
    if (meta.minutes) parts.push(`${meta.minutes}m`);
    summary.push(`Review every ${parts.join(' ') || '12h'}`);
  } else if (meta.type === 'daily') {
    summary.push(`Review daily at ${meta.time || '09:00'}`);
  } else if (meta.type === 'weekly') {
    const days = Array.isArray(meta.days) ? meta.days : [];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const selected = days.map(idx => dayNames[idx]).join(', ');
    summary.push(`Review weekly on ${selected || 'all days'} at ${meta.time || '09:00'}`);
  } else if (meta.type === 'monthly') {
    summary.push(`Review monthly on day ${meta.day || 1} at ${meta.time || '09:00'}`);
  } else if (meta.type === 'yearly') {
    summary.push(`Review yearly on ${meta.day || 1}/${meta.month || 1} at ${meta.time || '09:00'}`);
  }

  // Add start/end dates if they exist
  if (meta.start) {
    const startDate = new Date(meta.start);
    summary.push(`Starts: ${startDate.toLocaleDateString()}`);
  }
  if (meta.end) {
    const endDate = new Date(meta.end);
    summary.push(`Ends: ${endDate.toLocaleDateString()}`);
  }

  return summary.join(' • ');
}

// Get the base time for next review calculation
export function getBaseTime(note) {
  const lastReview = getLastReviewTime(note.id);
  const now = new Date();
  return lastReview && lastReview > now ? lastReview : now;
}

// Remove last review from localStorage for a note
export function handleRemoveLastReview(noteId) {
  const reviews = JSON.parse(localStorage.getItem('noteReviews') || '{}');
  delete reviews[noteId];
  localStorage.setItem('noteReviews', JSON.stringify(reviews));
}

// Get the next review date as a Date object (wrapper)
export function getNextReviewDateObj(note) {
  if (typeof getNextReviewDate === 'function') {
    return getNextReviewDate(note);
  }
  // fallback: 12 hours after last review or now
  const lastReview = getLastReviewTime(note.id);
  const now = new Date();
  if (!lastReview) return now;
  return new Date(lastReview.getTime() + 12 * 60 * 60 * 1000);
}

// Format a Date object as a readable string
export function formatDateTime(dt) {
  if (!dt) return '';
  return dt.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

// Get a human-friendly time difference string
export function getHumanFriendlyTimeDiff(nextReviewDate) {
  const now = new Date();
  let diff = nextReviewDate - now;
  if (diff <= 0) return 'now';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  let msg = '';
  if (days > 0) msg = `in ${days}d ${hours}h ${minutes}m`;
  else if (hours > 0) msg = `in ${hours}h ${minutes}m`;
  else if (minutes > 0) msg = `in ${minutes}m`;
  else msg = 'in <1m';
  return msg;
}

const getDummyCadenceObj = () => {
  return { hours: 0, minutes: 1, type: 'every-x-hours', days: 0, time: '09:00', day: 1, start: new Date().toISOString().slice(0, 10), end: '' };
}

export const getDummyCadenceLine = () => {
  return `meta::review_cadence::type=every-x-hours;hours=0;minutes=1;time=09:00;days=0;start=${new Date().toISOString().slice(0, 10)};end=`;
}

export const addCadenceLineToNote = (note, cadenceObj = {}, dummy = false) => {
  if (dummy) {
    cadenceObj = getDummyCadenceObj();
  }
  let metaLine = `meta::review_cadence::type=${cadenceObj.type}`;
  metaLine += `;hours=${cadenceObj.hours}`;
  metaLine += `;minutes=${cadenceObj.minutes}`;
  if (cadenceObj.time) metaLine += `;time=${cadenceObj.time}`;
  if (cadenceObj.days) metaLine += `;days=${cadenceObj.days.join(',')}`;
  if (cadenceObj.day) metaLine += `;day=${cadenceObj.day}`;
  if (cadenceObj.month) metaLine += `;month=${cadenceObj.month}`;

  if (note) {
    let lines = note.content.split('\n');
    const metaIdx = lines.findIndex(line => line.startsWith('meta::review_cadence::'));
    if (metaIdx !== -1) {
      lines[metaIdx] = metaLine;
    } else {
      lines.push(metaLine);
    }
    console.log("lines", lines);
    const updatedContent = lines.join('\n');
    updateNoteById(note.id, updatedContent);
    return updatedContent;
  }
}



export const updateCadenceHoursMinutes = (note, hours, minutes) => {
  let cadenceObj = parseReviewCadenceMeta(note.content);
  if (cadenceObj == null) {
    cadenceObj = getDummyCadenceObj();
  }
  else {
    cadenceObj.type = 'every-x-hours';
    cadenceObj.hours = hours;
    cadenceObj.minutes = minutes;
  }
  console.log('cadenceObj', cadenceObj);
  return handleCadenceChange(note, hours, minutes, cadenceObj.type, cadenceObj.days, cadenceObj.time, cadenceObj.time, cadenceObj.days, cadenceObj.time, cadenceObj.day, cadenceObj.start, cadenceObj.end);
}



export const handleCadenceChange = (note, hours, minutes, cadenceType, cadenceDays, dailyTime, weeklyTime, weeklyDays, monthlyTime, monthlyDay, startDate, endDate) => {
  let cadenceObj = {
    type: cadenceType,
  };

  if (cadenceType === 'every-x-hours') {
    if (cadenceDays) {
      hours += cadenceDays * 24;
    }
    cadenceObj.hours = hours;
    cadenceObj.minutes = minutes;
    cadenceObj.time = dailyTime;
    cadenceObj.days = cadenceDays;
  } else if (cadenceType === 'daily') {
    hours = 24; minutes = 0;
    cadenceObj.hours = hours;
    cadenceObj.minutes = minutes;
    cadenceObj.dailyTime = dailyTime;
    cadenceObj.days = cadenceDays;
  } else if (cadenceType === 'weekly') {
    hours = 24 * 7; minutes = 0;
    cadenceObj.hours = hours;
    cadenceObj.minutes = minutes;
    cadenceObj.weeklyTime = weeklyTime;
    cadenceObj.weeklyDays = weeklyDays;
  } else if (cadenceType === 'monthly') {
    hours = 24 * 30; minutes = 0;
    cadenceObj.hours = hours;
    cadenceObj.minutes = minutes;
    cadenceObj.monthlyTime = monthlyTime;
    cadenceObj.monthlyDays = monthlyDay;
  } else if (cadenceType === 'yearly') {
    hours = 24 * 365; minutes = 0;
    cadenceObj.hours = hours;
    cadenceObj.minutes = minutes;
  }


  console.log('cadenceObj', cadenceObj);
  // Build single-line meta tag
  const res = addCadenceLineToNote(note, cadenceObj, false);
  return res;

  // Find the note and update its content

};