import React, { useState } from 'react';
import CountdownCard from '../components/CountdownCard';

function parseEventNotes(notes, excludePurchases = true) {
  // Example: meta::event::, event_description:..., event_date:YYYY-MM-DD
  return notes
    .filter(note => note.content.includes('meta::event::'))
    .map(note => {
      const lines = note.content.split('\n');
      const title = lines.find(l => l.startsWith('event_description:'))?.replace('event_description:', '').trim() || 'Event';
      const dateStr = lines.find(l => l.startsWith('event_date:'))?.replace('event_date:', '').trim();
      const date = dateStr ? new Date(dateStr) : null;
      
      // Extract tags to check for purchase
      const eventTagsLine = lines.find(line => line.startsWith('event_tags:'));
      const isPurchase = eventTagsLine ? eventTagsLine.toLowerCase().includes('purchase') : false;
      
      return { id: note.id, title, date, isPurchase };
    })
    .filter(event => event.date)
    .filter(event => excludePurchases ? !event.isPurchase : true);
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

function filterFutureGroups(grouped, showPast) {
  if (showPast) return grouped;
  const now = new Date();
  const currentMonth = now.toLocaleString('default', { month: 'long' });
  const currentDay = now.getDate();
  let foundCurrentOrFutureMonth = false;
  return grouped
    .filter(({ key }) => {
      if (key === currentMonth) {
        foundCurrentOrFutureMonth = true;
        return true;
      }
      if (foundCurrentOrFutureMonth) return true;
      // Only show months after current month
      const monthOrder = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      return monthOrder.indexOf(key) > monthOrder.indexOf(currentMonth);
    })
    .map(group => {
      if (group.key === currentMonth) {
        return {
          ...group,
          events: group.events.filter(ev => ev.date.getDate() >= currentDay)
        };
      }
      return group;
    })
    .filter(group => group.events.length > 0);
}

export default function CountdownsPage({ notes }) {
  const [useThisYear, setUseThisYear] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [excludePurchases, setExcludePurchases] = useState(true);
  const events = parseEventNotes(notes, excludePurchases);
  const grouped = groupEventsByMonth(events);
  const filteredGrouped = filterFutureGroups(grouped, showPast);

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Countdown</h1>
      <div className="flex gap-4 mb-8">
        <button
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${useThisYear ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}
          onClick={() => setUseThisYear(v => !v)}
        >
          {useThisYear ? 'Show Original Dates' : 'Use This Year Date for All'}
        </button>
        <button
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${showPast ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          onClick={() => setShowPast(v => !v)}
        >
          {showPast ? 'Hide Past Dates' : 'Show Past Dates'}
        </button>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="excludePurchases"
            checked={excludePurchases}
            onChange={(e) => setExcludePurchases(e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
          />
          <label htmlFor="excludePurchases" className="text-sm font-medium text-gray-700">
            Exclude Purchases
          </label>
        </div>
      </div>
      <div className="space-y-10">
        {filteredGrouped.map(({ key, events }) => (
          <div key={key}>
            <h2 className="text-xl font-semibold mb-4 sticky top-0 bg-gray-50 z-10 py-2">{key}</h2>
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