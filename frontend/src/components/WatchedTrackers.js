import React, { useMemo, useCallback, useState } from 'react';
import { EyeIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { updateNoteById, deleteNoteById, createNote } from '../utils/ApiUtils';
import { getAgeInStringFmt } from '../utils/DateUtils';
import TrackerCard from './TrackerCard';
import moment from 'moment';

// Build tracker objects and answers map from raw notes, mirroring TrackerListing logic.
function parseTrackerData(notes) {
  const trackerNotes = notes
    .filter(note => note?.content && note.content.split('\n').some(l => l.trim() === 'meta::tracker'))
    .map(note => {
      const lines = note.content.split('\n');
      const get = (prefix) => lines.find(l => l.startsWith(prefix))?.slice(prefix.length).trim();
      const daysStr = get('Days:') || '';
      return {
        id: note.id,
        title: get('Title:') || 'Untitled',
        question: get('Question:') || '',
        type: get('Type:') || '',
        cadence: get('Cadence:') || '',
        days: daysStr ? daysStr.split(',').map(d => d.trim()) : [],
        startDate: get('Start Date:') || '',
        endDate: get('End Date:') || '',
        tags: (get('Tags:') || '').split(',').map(t => t.trim()).filter(Boolean),
        overdueDays: get('overdue:') || undefined,
        watched: lines.some(l => l.trim() === 'meta::tracker_watched'),
        completions: {},
      };
    });

  const answersByTracker = {};

  notes
    .filter(note => note?.content && note.content.split('\n').some(l => l.trim() === 'meta::tracker_answer'))
    .forEach(answer => {
      const lines = answer.content.split('\n');
      const get = (prefix) => lines.find(l => l.startsWith(prefix))?.slice(prefix.length).trim();
      const link = get('meta::link:');
      const answerValue = get('Answer:');
      const date = get('Date:');
      if (!link || !answerValue || !date) return;

      const tracker = trackerNotes.find(t => String(t.id) === String(link));
      if (!tracker) return;

      const tid = String(tracker.id);
      if (!answersByTracker[tid]) answersByTracker[tid] = [];
      answersByTracker[tid].push({
        id: answer.id,
        date,
        answer: answerValue,
        value: answerValue,
        notes: get('Notes:') || '',
        age: getAgeInStringFmt(new Date(date)),
      });
      tracker.completions[date] = true;
    });

  const watched = trackerNotes.filter(t => t.watched);

  const overdue = trackerNotes.filter(tracker => {
    const trackerAnswers = answersByTracker[String(tracker.id)] || [];
    if (trackerAnswers.length === 0) return false;
    const sorted = [...trackerAnswers].sort((a, b) => moment(b.date).valueOf() - moment(a.date).valueOf());
    const daysSince = moment().diff(moment(sorted[0].date), 'days');
    const threshold = tracker.overdueDays ? parseInt(tracker.overdueDays) : 30;
    return daysSince > threshold;
  });

  const allTags = [...new Set(trackerNotes.flatMap(t => Array.isArray(t.tags) ? t.tags.filter(Boolean) : []))].sort();

  return { watched, answersByTracker, overdue, allTags };
}

// Find all answer notes in `notes` that belong to a given tracker+date.
function findAnswerNotes(notes, tid, dateStr) {
  return (notes || []).filter(note => {
    if (!note?.content) return false;
    const lines = note.content.split('\n');
    if (!lines.some(l => l.trim() === 'meta::tracker_answer')) return false;
    const link = lines.find(l => l.startsWith('meta::link:'))?.slice('meta::link:'.length).trim();
    const d = lines.find(l => l.startsWith('Date:'))?.slice('Date:'.length).trim();
    return String(link) === String(tid) && d === dateStr;
  });
}

const WatchedTrackers = ({ notes, setNotes }) => {
  const navigate = useNavigate();
  const [showOverdue, setShowOverdue] = useState(false);
  const [selectedTag, setSelectedTag] = useState(null);

  const { watched, answersByTracker, overdue, allTags } = useMemo(
    () => parseTrackerData(notes || []),
    [notes]
  );

  const handleToggleDay = useCallback(async (trackerId, dateStr, value = null) => {
    const tid = String(trackerId);
    const isRemoval = value === null;
    const existingAnswerNotes = findAnswerNotes(notes, tid, dateStr);

    if (isRemoval) {
      // Optimistically remove all answer notes for this tracker+date immediately.
      const deleteIds = new Set(existingAnswerNotes.map(n => n.id));
      if (deleteIds.size > 0) {
        setNotes(prev => prev.filter(n => !deleteIds.has(n.id)));
      }
      // TrackerCard may have already deleted the note — catch 404s silently.
      await Promise.all(existingAnswerNotes.map(n => deleteNoteById(n.id).catch(() => {})));
    } else {
      if (existingAnswerNotes.length > 0) {
        // UPDATE the first existing note; delete duplicates.
        const [first, ...rest] = existingAnswerNotes;
        const updatedContent = first.content
          .split('\n')
          .map(l => l.startsWith('Answer:') ? `Answer: ${value}` : l)
          .join('\n');

        const restIds = new Set(rest.map(n => n.id));
        setNotes(prev =>
          prev
            .filter(n => !restIds.has(n.id))
            .map(n => n.id === first.id ? { ...n, content: updatedContent } : n)
        );

        await updateNoteById(first.id, updatedContent).catch(() => {});
        await Promise.all(rest.map(n => deleteNoteById(n.id).catch(() => {})));
      } else {
        // CREATE a new answer note.
        const allTrackers = [...watched, ...overdue];
        const tracker = allTrackers.find(t => String(t.id) === tid);
        const content = [
          `Answer: ${value}`,
          `Date: ${dateStr}`,
          `recorded_on_date: ${dateStr}`,
          `meta::link:${tid}`,
          `meta::tracker_answer`,
          `answer for ${tracker?.title || ''}`,
        ].join('\n');
        const newNote = await createNote(content);
        setNotes(prev => [...prev, newNote]);
      }
    }
  }, [notes, setNotes, watched, overdue]);

  const handleSaveTags = useCallback(async (trackerId, newTags) => {
    const note = (notes || []).find(n => String(n.id) === String(trackerId));
    if (!note) return;
    const lines = note.content.split('\n');
    const tagsLineIdx = lines.findIndex(l => l.startsWith('Tags:'));
    let updated;
    if (newTags.length === 0) {
      updated = tagsLineIdx !== -1 ? lines.filter((_, i) => i !== tagsLineIdx) : lines;
    } else {
      const newTagsLine = `Tags: ${newTags.join(', ')}`;
      updated = tagsLineIdx !== -1
        ? lines.map((l, i) => i === tagsLineIdx ? newTagsLine : l)
        : [...lines, newTagsLine];
    }
    const updatedContent = updated.join('\n');
    await updateNoteById(note.id, updatedContent);
    setNotes(prev => prev.map(n => String(n.id) === String(note.id) ? { ...n, content: updatedContent } : n));
  }, [notes, setNotes]);

  const handleUnwatch = useCallback(async (trackerOrId) => {
    const id = trackerOrId && typeof trackerOrId === 'object' ? trackerOrId.id : trackerOrId;
    const note = (notes || []).find(n => String(n.id) === String(id));
    if (!note) return;
    const updatedContent = note.content.split('\n')
      .filter(l => l.trim() !== 'meta::tracker_watched')
      .join('\n');
    // Optimistically update state first, then persist.
    setNotes(prev => prev.map(n => String(n.id) === String(id) ? { ...n, content: updatedContent } : n));
    await updateNoteById(note.id, updatedContent).catch(() => {});
  }, [notes, setNotes]);

  if (watched.length === 0 && overdue.length === 0) return null;

  const overdueOnly = showOverdue
    ? overdue.filter(t => !watched.some(w => String(w.id) === String(t.id)))
    : [];

  const filterByTag = (trackers) =>
    selectedTag ? trackers.filter(t => t.tags?.includes(selectedTag)) : trackers;

  const visibleWatched = filterByTag(watched);
  const visibleOverdue = filterByTag(overdueOnly);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <EyeIcon className="h-5 w-5 text-blue-500" />
        <h3 className="text-lg font-semibold text-gray-800">
          Watched Trackers ({watched.length})
        </h3>
        {overdue.length > 0 && (
          <button
            onClick={() => setShowOverdue(v => !v)}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
              showOverdue
                ? 'bg-red-500 text-white'
                : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
            }`}
            title="Toggle showing all overdue trackers"
          >
            <ExclamationCircleIcon className="h-3.5 w-3.5" />
            {showOverdue ? 'Hide overdue' : `Show all overdue (${overdue.length})`}
          </button>
        )}
        <button
          onClick={() => navigate('/trackers')}
          className="ml-auto text-xs text-blue-500 hover:underline"
        >
          Manage →
        </button>
      </div>

      {/* Tag filter bar — shows all tags from watched+overdue trackers */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          <button
            onClick={() => setSelectedTag(null)}
            className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
              selectedTag === null
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                selectedTag === tag
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {visibleWatched.map(tracker => (
          <TrackerCard
            key={tracker.id}
            tracker={tracker}
            onToggleDay={handleToggleDay}
            answers={answersByTracker[String(tracker.id)] || []}
            onEdit={() => navigate('/trackers')}
            isFocusMode={false}
            isDevMode={false}
            onWatch={handleUnwatch}
            allTags={allTags}
            onSaveTags={handleSaveTags}
          />
        ))}
        {visibleOverdue.map(tracker => (
          <TrackerCard
            key={`overdue-${tracker.id}`}
            tracker={tracker}
            onToggleDay={handleToggleDay}
            answers={answersByTracker[String(tracker.id)] || []}
            onEdit={() => navigate('/trackers')}
            isFocusMode={false}
            isDevMode={false}
            onWatch={handleUnwatch}
            allTags={allTags}
            onSaveTags={handleSaveTags}
          />
        ))}
      </div>
    </div>
  );
};

export default WatchedTrackers;
