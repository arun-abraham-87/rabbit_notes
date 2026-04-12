import React, { useMemo } from 'react';

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

  const formatDisplay = (days) => {
    if (days === null) return { value: '—', unit: '' };
    if (days === 0) return { value: 'Today', unit: '' };
    const abs = Math.abs(days);
    const past = days > 0;
    if (abs < 7) return { value: abs, unit: `day${abs !== 1 ? 's' : ''}` };
    if (abs < 30) {
      const w = Math.floor(abs / 7), d = abs % 7;
      return { value: d ? `${w}w ${d}d` : `${w}`, unit: d ? '' : `week${w !== 1 ? 's' : ''}` };
    }
    if (abs < 365) {
      const m = Math.floor(abs / 30);
      return { value: m, unit: `month${m !== 1 ? 's' : ''}` };
    }
    const y = Math.floor(abs / 365);
    return { value: y, unit: `year${y !== 1 ? 's' : ''}` };
  };

  return (
    <div className="mb-6">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
        Tracked Events
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
        {trackedEvents.map(event => {
          const { value, unit } = formatDisplay(event.daysDiff);
          const isPast = event.daysDiff > 0;
          const isToday = event.daysDiff === 0;

          return (
            <div
              key={event.id}
              className="flex-shrink-0 flex flex-col items-start border border-gray-200 rounded-lg shadow-sm px-4 py-3 min-w-[200px] max-w-xs h-36 bg-white hover:shadow-md transition-shadow relative overflow-hidden"
            >
              <div className="text-2xl font-bold text-gray-600">
                {isToday ? 'Today' : value}
              </div>
              {!isToday && (
                <div className="text-sm text-gray-400">
                  {unit} {isPast ? 'since' : 'until'}
                </div>
              )}
              <div
                className="font-medium text-gray-900 w-full truncate mt-1"
                title={event.title}
              >
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
