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
      let date = null;
      if (dateStr) {
        // Handle different date formats
        if (dateStr.includes('-')) {
          // Format: YYYY-MM-DD
          date = new Date(dateStr);
        } else if (dateStr.includes('/')) {
          // Format: MM/DD/YYYY or DD/MM/YYYY
          date = new Date(dateStr);
        } else {
          // Try parsing as is
          date = new Date(dateStr);
        }
        
        // Validate the date
        if (isNaN(date.getTime())) {
          console.warn('Invalid date format:', dateStr);
          date = null;
        }
      }
      
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

function groupEventsByDaysRemaining(events) {
  const groups = {};
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Zero out time for accurate day calculation
  
  events.forEach(event => {
    const eventDate = new Date(event.date);
    eventDate.setHours(0, 0, 0, 0);
    
    const daysRemaining = Math.round((eventDate - now) / (1000 * 60 * 60 * 24));
    
    let dayKey;
    if (daysRemaining === 0) {
      dayKey = "Today";
    } else if (daysRemaining === 1) {
      dayKey = "1 day to event";
    } else if (daysRemaining < 0) {
      dayKey = `${Math.abs(daysRemaining)} days ago`;
    } else {
      dayKey = `${daysRemaining} days to event`;
    }
    
    if (!groups[dayKey]) groups[dayKey] = [];
    groups[dayKey].push(event);
  });
  
  // Sort by days remaining (negative numbers first, then 0, then positive)
  const sortedKeys = Object.keys(groups).sort((a, b) => {
    const getDaysFromKey = (key) => {
      if (key === "Today") return 0;
      if (key === "1 day to event") return 1;
      if (key.includes("days ago")) {
        const days = parseInt(key.match(/(\d+) days ago/)[1]);
        return -days;
      }
      const days = parseInt(key.match(/(\d+) days to event/)[1]);
      return days;
    };
    
    return getDaysFromKey(a) - getDaysFromKey(b);
  });
  
  return sortedKeys.map(dayKey => ({
    key: dayKey,
    events: groups[dayKey].sort((a, b) => a.title.localeCompare(b.title))
  }));
}

function filterFutureGroups(grouped, showPast, groupByDay = false) {
  if (showPast) return grouped;
  const now = new Date();
  
  if (groupByDay) {
    // For days remaining grouping, filter out past events unless showPast is true
    return grouped
      .filter(({ key }) => {
        if (showPast) return true;
        // Keep "Today", "1 day to event", and positive days
        return !key.includes("days ago");
      })
      .filter(group => group.events.length > 0);
  } else {
    // Original month-based filtering
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
}

export default function CountdownsPage({ notes }) {
  const [showPast, setShowPast] = useState(false);
  const [excludePurchases, setExcludePurchases] = useState(true);
  const [groupByDay, setGroupByDay] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pinnedEvents, setPinnedEvents] = useState(() => {
    try {
      const stored = localStorage.getItem('pinnedCountdownEvents');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading pinned events:', error);
      return [];
    }
  });

  // Functions to handle pinning/unpinning
  const togglePinEvent = (eventId) => {
    setPinnedEvents(prev => {
      const isPinned = prev.includes(eventId);
      const newPinned = isPinned 
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId];
      
      try {
        localStorage.setItem('pinnedCountdownEvents', JSON.stringify(newPinned));
      } catch (error) {
        console.error('Error saving pinned events:', error);
      }
      
      return newPinned;
    });
  };

  const isEventPinned = (eventId) => pinnedEvents.includes(eventId);
  
  const events = parseEventNotes(notes, excludePurchases);
  
  // Filter events based on search query
  const filteredEvents = searchQuery.trim() 
    ? events.filter(event => {
        const searchWords = searchQuery.toLowerCase().split(/\s+/).filter(word => word.length > 0);
        const eventTitle = event.title.toLowerCase();
        return searchWords.every(word => eventTitle.includes(word));
      })
    : events;

  // Separate pinned and unpinned events
  const pinnedEventList = filteredEvents
    .filter(event => isEventPinned(event.id))
    .sort((a, b) => {
      // Sort by days to event in ascending order (closest first)
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      
      const dateA = new Date(a.date);
      dateA.setHours(0, 0, 0, 0);
      const daysA = Math.round((dateA - now) / (1000 * 60 * 60 * 24));
      
      const dateB = new Date(b.date);
      dateB.setHours(0, 0, 0, 0);
      const daysB = Math.round((dateB - now) / (1000 * 60 * 60 * 24));
      
      return daysA - daysB;
    });
  const unpinnedEvents = filteredEvents.filter(event => !isEventPinned(event.id));
  
  const grouped = groupByDay ? groupEventsByDaysRemaining(unpinnedEvents) : groupEventsByMonth(unpinnedEvents);
  const filteredGrouped = filterFutureGroups(grouped, showPast, groupByDay);

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Countdown</h1>
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full max-w-md px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchQuery.trim() && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
          {searchQuery.trim() && (
            <span className="text-sm text-gray-600">
              {filteredEvents.length} of {events.length} events
            </span>
          )}
        </div>
      </div>
        <div className="flex gap-4 mb-8">
          <button
          className={`px-4 py-2 rounded text-sm font-medium transition-colors ${groupByDay ? 'bg-green-600 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
          onClick={() => setGroupByDay(v => !v)}
        >
          {groupByDay ? 'Group by Month' : 'Group by Days Remaining'}
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
        {/* Pinned Events Section */}
        {pinnedEventList.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 sticky top-0 bg-gray-50 z-10 py-2 text-blue-600">
              📌 Pinned Events
            </h2>
            <div className="flex flex-wrap gap-6">
              {pinnedEventList.map(event => (
                <CountdownCard
                  key={event.id}
                  title={event.title}
                  date={event.date}
                  useThisYear={true}
                  isPinned={true}
                  onTogglePin={() => togglePinEvent(event.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Regular Events */}
        {filteredGrouped.map(({ key, events }) => (
          <div key={key}>
            <h2 className="text-xl font-semibold mb-4 sticky top-0 bg-gray-50 z-10 py-2">{key}</h2>
            <div className="flex flex-wrap gap-6">
              {events.map(event => (
                <CountdownCard
                  key={event.id}
                  title={event.title}
                  date={event.date}
                  useThisYear={true}
                  isPinned={false}
                  onTogglePin={() => togglePinEvent(event.id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 