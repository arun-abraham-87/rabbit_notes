import React, { useMemo, useState, useCallback } from 'react';
import { XMarkIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { updateNoteById } from '../utils/ApiUtils';

// Cycle: days → weeks → days
const MODES = ['days', 'weeks'];

function formatDisplay(daysDiff, mode) {
  if (daysDiff === null) return { big: '—', sub: '' };
  if (daysDiff === 0) return { big: 'Today', sub: '' };
  const abs = Math.abs(daysDiff);
  const label = daysDiff > 0 ? 'since' : 'until';
  if (mode === 'weeks') {
    const w = Math.floor(abs / 7);
    const d = abs % 7;
    if (w === 0) return { big: `${d}`, sub: `day${d !== 1 ? 's' : ''} ${label}` };
    return { big: d ? `${w}w ${d}d` : `${w}`, sub: d ? `weeks ${label}` : `week${w !== 1 ? 's' : ''} ${label}` };
  }
  // days mode
  return { big: `${abs}`, sub: `day${abs !== 1 ? 's' : ''} ${label}` };
}

const TrackedEvents = ({ notes, setNotes }) => {
  const navigate = useNavigate();
  const [cardModes, setCardModes] = useState({});        // { noteId: 'days' | 'weeks' }
  const [confirmUntrack, setConfirmUntrack] = useState(null); // noteId being confirmed

  const trackedEvents = useMemo(() => {
    if (!notes) return [];
    return notes
      .filter(note => note?.content && note.content.split('\n').some(l => l.trim() === 'meta::event_tracked'))
      .map(note => {
        const lines = note.content.split('\n');
        const get = prefix => lines.find(l => l.startsWith(prefix))?.slice(prefix.length).trim() || '';
        const title = get('event_description:');
        const dateStr = get('event_date:').split('T')[0];
        const date = dateStr ? new Date(dateStr) : null;
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        if (date) date.setHours(0, 0, 0, 0);
        const daysDiff = date ? Math.floor((now - date) / (1000 * 60 * 60 * 24)) : null;
        return { id: note.id, title, date, dateStr, daysDiff };
      })
      .filter(e => e.title)
      .sort((a, b) => (b.date || 0) - (a.date || 0));
  }, [notes]);

  const toggleMode = useCallback((id, e) => {
    e.stopPropagation();
    setCardModes(prev => {
      const current = prev[id] || 'days';
      const next = MODES[(MODES.indexOf(current) + 1) % MODES.length];
      return { ...prev, [id]: next };
    });
  }, []);

  const handleUntrack = useCallback(async (id) => {
    setConfirmUntrack(null);
    const note = notes?.find(n => n.id === id);
    if (!note) return;
    const updatedContent = note.content.split('\n')
      .filter(l => l.trim() !== 'meta::event_tracked')
      .join('\n');
    await updateNoteById(note.id, updatedContent);
    if (setNotes) setNotes(prev => prev.map(n => n.id === id ? { ...n, content: updatedContent } : n));
  }, [notes, setNotes]);

  const goToEvent = useCallback((id, e) => {
    e.stopPropagation();
    navigate('/notes', { state: { searchQuery: `id:${id}` } });
  }, [navigate]);

  if (trackedEvents.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
        Tracked Events
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
        {trackedEvents.map(event => {
          const mode = cardModes[event.id] || 'days';
          const { big, sub } = formatDisplay(event.daysDiff, mode);
          const isToday = event.daysDiff === 0;
          const isConfirming = confirmUntrack === event.id;

          return (
            <div
              key={event.id}
              onClick={(e) => toggleMode(event.id, e)}
              className="group flex-shrink-0 flex flex-col items-start border border-gray-200 rounded-lg shadow-sm px-4 py-3 min-w-[200px] max-w-xs h-36 bg-white hover:shadow-md transition-shadow relative overflow-hidden cursor-pointer"
              title="Click to toggle days / weeks view"
            >
              {/* Top-right action buttons */}
              <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); navigate(`/events?note=${event.id}`); }}
                  className="p-1 text-gray-400 hover:text-blue-500 transition-colors rounded"
                  title="Go to event"
                >
                  <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmUntrack(event.id); }}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded"
                  title="Untrack"
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Inline untrack confirmation overlay */}
              {isConfirming && (
                <div
                  className="absolute inset-0 bg-white/95 flex flex-col items-center justify-center gap-2 z-10"
                  onClick={e => e.stopPropagation()}
                >
                  <span className="text-xs text-gray-600 font-medium">Untrack this event?</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUntrack(event.id)}
                      className="px-3 py-1 text-xs font-semibold bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                    >
                      Untrack
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmUntrack(null); }}
                      className="px-3 py-1 text-xs font-semibold bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              <div className="text-2xl font-bold text-gray-600">{big}</div>
              {sub && <div className="text-sm text-gray-400">{sub}</div>}
              <div className="font-medium text-gray-900 w-full truncate mt-1" title={event.title}>
                {event.title}
              </div>
              {event.date && (
                <div className="text-xs text-gray-400 mt-auto">
                  {event.date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TrackedEvents;
