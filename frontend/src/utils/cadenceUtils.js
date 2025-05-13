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
  const meta = parseReviewCadenceMeta(note.content);
  const reviews = JSON.parse(localStorage.getItem('noteReviews') || '{}');
  const lastReview = reviews[note.id] ? new Date(reviews[note.id]) : null;
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

// Find reminders that are due for review right now
export function findDueReminders(notes) {
  const now = new Date();
  
  return notes.filter(note => {
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
  }).map(note => ({
    note,
    nextReview: getNextReviewDate(note),
    overdueBy: now.getTime() - getNextReviewDate(note).getTime()
  })).sort((a, b) => b.overdueBy - a.overdueBy); // Sort by most overdue first
} 