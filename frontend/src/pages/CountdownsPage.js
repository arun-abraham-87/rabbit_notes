import React from 'react';
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

export default function CountdownsPage({ notes }) {
  const events = parseEventNotes(notes);
  // Sort by soonest
  const sorted = [...events].sort((a, b) => a.date - b.date);

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Countdown</h1>
      <div className="flex flex-wrap gap-6">
        {sorted.map((event, idx) => (
          <CountdownCard
            key={event.id}
            title={event.title}
            date={event.date}
            highlight={idx === 0}
          />
        ))}
      </div>
    </div>
  );
} 