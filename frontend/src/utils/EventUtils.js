// Shared function to extract event details from note content.
// Returns a superset of fields used by EventManager and EventsPage.
export const getEventDetails = (content) => {
  const lines = content.split('\n');

  // Find the description
  const descriptionLine = lines.find(line => line.startsWith('event_description:'));
  const description = descriptionLine ? descriptionLine.replace('event_description:', '').trim() : '';

  // Find the event date
  const eventDateLine = lines.find(line => line.startsWith('event_date:'));
  const dateTime = eventDateLine ? eventDateLine.replace('event_date:', '').trim() : '';

  // Find event notes
  const notesLine = lines.find(line => line.startsWith('event_notes:'));
  const notes = notesLine ? notesLine.replace('event_notes:', '').trim() : '';

  // Find recurring info
  const recurringLine = lines.find(line => line.startsWith('event_recurring_type:'));
  let recurrence = recurringLine ? recurringLine.replace('event_recurring_type:', '').trim() : 'none';

  const isTemporary = lines.some(line => line.trim() === 'meta::event_temporary:true' || line.trim() === 'meta::event_temporary');

  // Find meta information
  const metaLine = lines.find(line => line.startsWith('meta::event::'));
  const metaDate = metaLine ? metaLine.replace('meta::event::', '').trim() : '';

  // Find tags
  const tagsLine = lines.find(line => line.startsWith('event_tags:'));
  const tags = tagsLine ? tagsLine.replace('event_tags:', '').trim().split(',').map(tag => tag.trim()) : [];

  // Check if it's a deadline
  const isDeadline = tags.some(tag => tag.toLowerCase() === 'deadline') ||
    content.includes('meta::event_deadline') ||
    content.includes('meta::deadline');

  // Find any line that starts with event_$: where $ is any character
  const customFields = {};
  lines.forEach(line => {
    if (line.startsWith('event_') && line.includes(':')) {
      const [key, value] = line.split(':');
      if (key !== 'event_description' && key !== 'event_date' && key !== 'event_notes' && key !== 'event_recurring_type' && key !== 'event_tags') {
        const fieldName = key.replace('event_', '');
        customFields[fieldName] = value.trim();
      }
    }
  });

  // Calculate next occurrence for recurring events
  let nextOccurrence = null;
  let lastOccurrence = null;
  if (recurrence === 'none' && !isTemporary) {
    recurrence = "yearly";
  }
  else if (recurrence !== 'none' && dateTime) {
    const eventDate = new Date(dateTime);
    const now = new Date();

    // Calculate last occurrence
    lastOccurrence = new Date(eventDate);
    if (recurrence === 'daily') {
      while (lastOccurrence > now) {
        lastOccurrence.setDate(lastOccurrence.getDate() - 1);
      }
    }
    else if (recurrence === 'weekly') {
      while (lastOccurrence > now) {
        lastOccurrence.setDate(lastOccurrence.getDate() - 7);
      }
    }
    else if (recurrence === 'monthly') {
      while (lastOccurrence > now) {
        lastOccurrence.setMonth(lastOccurrence.getMonth() - 1);
      }
    }
    else if (recurrence === 'yearly') {
      while (lastOccurrence > now) {
        lastOccurrence.setFullYear(lastOccurrence.getFullYear() - 1);
      }
    }

    // Calculate next occurrence
    if (recurrence === 'daily') {
      nextOccurrence = new Date(lastOccurrence);
      nextOccurrence.setDate(lastOccurrence.getDate() + 1);
      while (nextOccurrence <= now) {
        nextOccurrence.setDate(nextOccurrence.getDate() + 1);
      }
    }
    else if (recurrence === 'weekly') {
      nextOccurrence = new Date(lastOccurrence);
      nextOccurrence.setDate(lastOccurrence.getDate() + 7);
      while (nextOccurrence <= now) {
        nextOccurrence.setDate(nextOccurrence.getDate() + 7);
      }
    }
    else if (recurrence === 'monthly') {
      nextOccurrence = new Date(lastOccurrence);
      nextOccurrence.setMonth(lastOccurrence.getMonth() + 1);
      while (nextOccurrence <= now) {
        nextOccurrence.setMonth(nextOccurrence.getMonth() + 1);
      }
    }
    else if (recurrence === 'yearly') {
      nextOccurrence = new Date(lastOccurrence);
      nextOccurrence.setFullYear(lastOccurrence.getFullYear() + 1);
      while (nextOccurrence <= now) {
        nextOccurrence.setFullYear(nextOccurrence.getFullYear() + 1);
      }
    }
  }

  return {
    description,
    dateTime,
    tags,
    isDeadline,
    notes,
    recurrence,
    isTemporary,
    metaDate,
    nextOccurrence,
    lastOccurrence,
    customFields
  };
};

export const getAllUniqueTags = (notes, type = 'all') => {
  const allTags = new Set();

  notes.forEach(note => {
    if (note?.content) {
      const lines = note.content.split('\n');

      // Parse event tags
      if (type === 'all' || type === 'event') {
        const eventTagsLine = lines.find(line => line.startsWith('event_tags:'));
        if (eventTagsLine) {
          const tags = eventTagsLine.replace('event_tags:', '').trim().split(',');
          tags.forEach(tag => {
            const t = tag.trim();
            if (t) allTags.add(t.startsWith('#') ? t : `#${t}`);
          });
        }
      }

      // Parse tracker tags
      if (type === 'all' || type === 'tracker') {
        const trackerTagsLine = lines.find(line => line.startsWith('Tags:'));
        if (trackerTagsLine) {
          const tags = trackerTagsLine.replace('Tags:', '').trim().split(',');
          tags.forEach(tag => {
            const t = tag.trim();
            if (t) allTags.add(t.startsWith('#') ? t : `#${t}`);
          });
        }
      }
    }
  });

  return Array.from(allTags).sort();
};
