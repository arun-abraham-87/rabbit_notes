import React, { useMemo } from 'react';
import { EyeIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { updateNoteById } from '../utils/ApiUtils';

const WatchedTrackers = ({ notes, setNotes }) => {
  const navigate = useNavigate();

  const watchedTrackers = useMemo(() => {
    if (!notes) return [];
    return notes
      .filter(note => {
        if (!note?.content) return false;
        const lines = note.content.split('\n');
        return (
          lines.some(l => l.trim() === 'meta::tracker') &&
          lines.some(l => l.trim() === 'meta::tracker_watched')
        );
      })
      .map(note => {
        const lines = note.content.split('\n');
        const title = lines.find(l => l.startsWith('Title:'))?.replace('Title:', '').trim() || 'Untitled';
        const cadence = lines.find(l => l.startsWith('Cadence:'))?.replace('Cadence:', '').trim() || '';
        return { id: note.id, title, cadence };
      });
  }, [notes]);

  const handleUnwatch = async (trackerId) => {
    const note = notes.find(n => n.id === trackerId);
    if (!note) return;
    const updatedContent = note.content.split('\n')
      .filter(l => l.trim() !== 'meta::tracker_watched')
      .join('\n');
    await updateNoteById(note.id, updatedContent);
    setNotes(notes.map(n => n.id === note.id ? { ...n, content: updatedContent } : n));
  };

  if (watchedTrackers.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <EyeIcon className="h-5 w-5 text-blue-500" />
        <h3 className="text-lg font-semibold text-gray-800">
          Watched Trackers ({watchedTrackers.length})
        </h3>
      </div>
      <div className="flex flex-wrap gap-3">
        {watchedTrackers.map(tracker => (
          <div
            key={tracker.id}
            className="bg-white border border-blue-200 rounded-lg px-4 py-3 flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow"
          >
            <div
              className="cursor-pointer"
              onClick={() => navigate('/trackers')}
            >
              <div className="text-sm font-medium text-gray-800">{tracker.title}</div>
              {tracker.cadence && (
                <div className="text-xs text-blue-500 mt-0.5">{tracker.cadence}</div>
              )}
            </div>
            <button
              onClick={() => handleUnwatch(tracker.id)}
              className="p-1 text-blue-400 hover:text-red-500 transition-colors rounded"
              title="Remove from watched"
            >
              <EyeIcon className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WatchedTrackers;
