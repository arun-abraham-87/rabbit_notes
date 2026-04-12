import React, { useMemo } from 'react';
import { MapPinIcon } from '@heroicons/react/24/outline';

const TrackedEvents = ({ notes }) => {
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

  if (trackedEvents.length === 0) return null;

  const formatDays = (days) => {
    if (days === null) return '—';
    if (days === 0) return 'Today';
    if (days === 1) return '1 day ago';
    if (days < 0) return `in ${Math.abs(days)} day${Math.abs(days) !== 1 ? 's' : ''}`;
    const weeks = Math.floor(days / 7);
    const rem = days % 7;
    if (days < 7) return `${days} days ago`;
    if (rem === 0) return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
    return `${weeks}w ${rem}d ago`;
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <MapPinIcon className="h-5 w-5 text-blue-500" />
        <h3 className="text-lg font-semibold text-gray-800">
          Tracked Events ({trackedEvents.length})
        </h3>
      </div>
      <div className="flex flex-wrap gap-3">
        {trackedEvents.map(event => (
          <div
            key={event.id}
            className="bg-white border border-blue-100 rounded-xl px-4 py-3 shadow-sm hover:shadow-md transition-shadow min-w-[160px]"
          >
            <div className="text-sm font-semibold text-gray-800 truncate max-w-[180px]" title={event.title}>
              {event.title}
            </div>
            {event.dateStr && (
              <div className="text-xs text-gray-400 mt-0.5">
                {event.date?.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            )}
            <div className={`text-xs font-medium mt-1 ${
              event.daysDiff === 0 ? 'text-green-600' :
              event.daysDiff < 0  ? 'text-blue-600' : 'text-gray-500'
            }`}>
              {formatDays(event.daysDiff)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrackedEvents;
