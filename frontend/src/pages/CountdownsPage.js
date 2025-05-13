import React, { useState } from 'react';
import CountdownCard from '../components/CountdownCard';

function parseEventNotes(notes) {
  // Example: meta::event::, event_description:..., event_date:YYYY-MM-DD
  return notes
    .filter(note => note.content.includes('meta::event::'))
    .map(note => {
      const lines = note.content.split('\n');
      const title = lines.find(l => l.startsWith('event_description:'))?.replace('event_description:', '').trim() || 'Event';
      const dateStr = lines.find(l => l.startsWith('event_date:'))?.replace('event_date:', '').trim();
      const date = dateStr ? new Date(dateStr) : null;
      return { id: note.id, title, date };
    })
    .filter(event => event.date);
}

function groupEventsByMonth(events) {
  const groups = {};
  events.forEach(event => {
    const month = event.date.toLocaleString('default', { month: 'long' });
    if (!groups[month]) groups[month] = [];
    groups[month].push(event);
  });
  // Sort months by calendar order
  const monthOrder = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const sortedKeys = Object.keys(groups).sort((a, b) => monthOrder.indexOf(a) - monthOrder.indexOf(b));
  return sortedKeys.map(month => ({
    key: month,
    events: groups[month].sort((a, b) => a.date.getDate() - b.date.getDate())
  }));
}

export default function CountdownsPage({ notes }) {
  const [useThisYear, setUseThisYear] = useState(false);
  const events = parseEventNotes(notes);
  const grouped = groupEventsByMonth(events);

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Countdown</h1>
      <button
        className={`mb-8 px-4 py-2 rounded text-sm font-medium transition-colors ${useThisYear ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
        onClick={() => setUseThisYear(v => !v)}
      >
        {useThisYear ? 'Show Original Dates' : 'Use This Year Date for All'}
      </button>
      <div className="space-y-10">
        {grouped.map(({ key, events }) => (
          <div key={key}>
            <h2 className="text-xl font-semibold mb-4">{key}</h2>
            <div className="flex flex-wrap gap-6">
              {events.map(event => (
                <CountdownCard
                  key={event.id}
                  title={event.title}
                  date={event.date}
                  useThisYear={useThisYear}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 