// cadenceUtils.js

// Get the last review time for a note from localStorage
export function getLastReviewTime(noteId) {
  const reviews = JSON.parse(localStorage.getItem('noteReviews') || '{}');
  return reviews[noteId] ? new Date(reviews[noteId]) : null;
}

// Parse meta::review_cadence:: line from note content
export function parseReviewCadenceMeta(content) {
  const line = content.split('\n').find(l => l.startsWith('meta::review_cadence::'));
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
  // Local helper to get last review time for a note
  function getLocalLastReviewTime(noteId) {
    const reviews = JSON.parse(localStorage.getItem('noteReviews') || '{}');
    return reviews[noteId] ? new Date(reviews[noteId]) : null;
  }
  const meta = parseReviewCadenceMeta(note.content);
  const lastReview = getLocalLastReviewTime(note.id);
  const now = new Date();
  if (!meta) {
    // Fallback: 12 hours after last review or now
    if (!lastReview) return now;
    return new Date(lastReview.getTime() + 12 * 60 * 60 * 1000);
  }
  // Handle each cadence type
  if (meta.type === 'every-x-hours') {
    const hours = meta.hours || 12;
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
  // Only look at notes with reminder tag
  if (!note.content.includes('meta::reminder')) return false;

  // Skip dismissed or snoozed reminders
  if (note.content.includes('meta::reminder_dismissed')) return false;
  if (note.content.includes('meta::reminder_snooze')) {
    const snoozeMatch = note.content.match(/meta::reminder_snooze::until=([^;]+)/);
    if (snoozeMatch) {
      const snoozeUntil = new Date(snoozeMatch[1]);
      if (snoozeUntil > now) return false;
    }
  }

  // Get the next review time
  const nextReview = getNextReviewDate(note);
  if (!nextReview) return false;

  // Check if the next review time has passed
  return nextReview <= now;
}

// Find reminders that are due for review right now
export function findDueReminders(notes) {
  const now = new Date();
  return notes.filter(note => isReminderDue(note, now))
    .map(note => ({
      note,
      nextReview: getNextReviewDate(note),
      overdueBy: now.getTime() - getNextReviewDate(note).getTime()
    }))
    .sort((a, b) => b.overdueBy - a.overdueBy); // Sort by most overdue first
}

// Render a human-readable cadence summary for a note
export function renderCadenceSummary(note) {
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
    const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
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
export function handleRemoveLastReview(noteId, refreshNotes) {
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