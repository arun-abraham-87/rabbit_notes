import React, { useMemo, useCallback } from 'react';
import { EyeIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { updateNoteById, deleteNoteById, createNote, loadNotes } from '../utils/ApiUtils';
import { getAgeInStringFmt } from '../utils/DateUtils';
import TrackerCard from './TrackerCard';

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
  return { watched, answersByTracker };
}

const WatchedTrackers = ({ notes, setNotes }) => {
  const navigate = useNavigate();

  const { watched, answersByTracker } = useMemo(
    () => parseTrackerData(notes || []),
    [notes]
  );

  const handleToggleDay = useCallback(async (trackerId, dateStr, value = null) => {
    const tid = String(trackerId);
    const isRemoval = value === null;

    if (isRemoval) {
      // Find and delete all answer notes for this tracker + date
      const toDelete = (notes || []).filter(note => {
        if (!note?.content) return false;
        const lines = note.content.split('\n');
        if (!lines.some(l => l.trim() === 'meta::tracker_answer')) return false;
        const link = lines.find(l => l.startsWith('meta::link:'))?.slice('meta::link:'.length).trim();
        const d = lines.find(l => l.startsWith('Date:'))?.slice('Date:'.length).trim();
        return String(link) === tid && d === dateStr;
      });

      await Promise.all(toDelete.map(n => deleteNoteById(n.id)));

      // Refresh notes from server so dashboard state stays accurate
      const fresh = await loadNotes();
      const freshNotes = Array.isArray(fresh) ? fresh : (fresh?.notes || []);
      setNotes(freshNotes);
    } else {
      // Create new answer note
      const tracker = watched.find(t => String(t.id) === tid);
      const content = `Answer: ${value}\nDate: ${dateStr}\nrecorded_on_date: ${dateStr}\nmeta::link:${tid}\nmeta::tracker_answer\nanswer for ${tracker?.title || ''}`;
      const newNote = await createNote(content);
      setNotes(prev => [...prev, newNote]);
    }
  }, [notes, setNotes, watched]);

  const handleUnwatch = useCallback(async (trackerId) => {
    const note = (notes || []).find(n => n.id === trackerId);
    if (!note) return;
    const updatedContent = note.content.split('\n')
      .filter(l => l.trim() !== 'meta::tracker_watched')
      .join('\n');
    await updateNoteById(note.id, updatedContent);
    setNotes(prev => prev.map(n => n.id === note.id ? { ...n, content: updatedContent } : n));
  }, [notes, setNotes]);

  if (watched.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <EyeIcon className="h-5 w-5 text-blue-500" />
        <h3 className="text-lg font-semibold text-gray-800">
          Watched Trackers ({watched.length})
        </h3>
        <button
          onClick={() => navigate('/trackers')}
          className="ml-2 text-xs text-blue-500 hover:underline"
        >
          Manage →
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {watched.map(tracker => (
          <TrackerCard
            key={tracker.id}
            tracker={tracker}
            onToggleDay={handleToggleDay}
            answers={answersByTracker[String(tracker.id)] || []}
            onEdit={() => navigate('/trackers')}
            isFocusMode={false}
            isDevMode={false}
            onWatch={handleUnwatch}
          />
        ))}
      </div>
    </div>
  );
};

export default WatchedTrackers;
