// src/components/LeftPanel.js
import React, { useMemo, useState, useEffect } from 'react';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { updateNoteById } from '../utils/ApiUtils';

const removeBookmarkFromNotes = (url, notes, setNotes) => {
  if (!window.confirm('Remove this bookmark from Quick links?')) return;

  const newNotes = notes.map(note => {
    if (
      note.content.includes(url) &&
      note.content.split('\n').some(line => line.trim().startsWith('meta::bookmark'))
    ) {
      const updatedContent = note.content
        .split('\n')
        .filter(line => !line.trim().startsWith('meta::bookmark'))
        .join('\n')
        .trim();
      // Persist to backend
      updateNoteById(note.id, updatedContent);
      // Return updated note locally
      return { ...note, content: updatedContent };
    }
    return note;
  });

  // Refresh local state so UI re‑renders
  if (typeof setNotes === 'function') {
    setNotes(newNotes);
  }
};

const LeftPanel = ({ notes, setNotes }) => {
  // State for current time to drive countdowns
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [showQuickLinks, setShowQuickLinks] = useState(true);
  const [showMeetingsSection, setShowMeetingsSection] = useState(true);
  const [showEventsSection, setShowEventsSection] = useState(true);

  const uniqueUrls = useMemo(() => {
    const seen = new Set();
    const list = [];
    // Combined regex to match markdown links or bare URLs
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s)]+)/g;

    notes.forEach(note => {
      // Only consider bookmarked notes
      if (note.content.split('\n').some(line => line.trim().startsWith('meta::bookmark'))) {
        linkRegex.lastIndex = 0;
        let match;
        while ((match = linkRegex.exec(note.content)) !== null) {
          const url = match[2] || match[3];
          const label = match[1] || null;
          const key = `${url}|${label}`;
          if (!seen.has(key)) {
            seen.add(key);
            list.push({ url, label });
          }
        }
      }
    });

    return list;
  }, [notes]);

  // Extract meetings: context and time from notes tagged meta::meeting, sorted by datetime ascending
  const meetings = useMemo(() => {
    // Build array of meeting objects
    const result = notes.flatMap(note => {
      if (note.content.split('\n').some(line => line.trim().startsWith('meta::meeting'))) {
        const lines = note.content.split('\n');
        const context = lines[0] || '';
        const time = lines[1] || '';
        return [{ id: note.id, context: context.trim(), time: time.trim() }];
      }
      return [];
    });
    // Sort by time ascending
    return result.sort((a, b) => new Date(a.time) - new Date(b.time));
  }, [notes]);

  // Only show meetings that are upcoming or not yet acknowledged when past
  const visibleMeetings = useMemo(() => {
    return meetings.filter(m => {
      const note = notes.find(n => n.id === m.id);
      const eventTime = new Date(m.time).getTime();
      // If passed and acknowledged, hide it
      if (eventTime < now && note?.content.includes('meta::meeting_acknowledge')) {
        return false;
      }
      return true;
    });
  }, [meetings, notes, now]);

  // Extract events tagged meta::event, sorted chronologically
  const events = useMemo(() => {
    const result = notes.flatMap(note => {
      if (note.content.split('\n').some(line => line.trim().startsWith('meta::event'))) {
        const lines = note.content.split('\n');
        const context = lines[0] || '';
        const time = lines[1] || '';
        return [{ id: note.id, context: context.trim(), time: time.trim() }];
      }
      return [];
    });
    return result.sort((a, b) => new Date(a.time) - new Date(b.time));
  }, [notes]);

  // Only show events that are today or in the future
  const visibleEvents = useMemo(() => {
    return events.filter(e => new Date(e.time).getTime() >= now);
  }, [events, now]);

  // Alert for imminent meetings
  const [alertMeetingId, setAlertMeetingId] = useState(null);
  useEffect(() => {
    // Find a meeting starting within the next 2 minutes, skipping acknowledged
    const soon = meetings.find(m => {
      // skip if already acknowledged
      const note = notes.find(n => n.id === m.id);
      if (note?.content.includes('meta::meeting_acknowledge')) return false;
      // Parse ISO datetime directly
      const target = new Date(m.time);
      const diff = target.getTime() - now;
      return diff > 0 && diff < 120_000;
    });
    if (soon) setAlertMeetingId(soon.id);
  }, [meetings, now]);

  return (
    <>
      {alertMeetingId && (() => {
        const m = meetings.find(x => x.id === alertMeetingId);
        return (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
            <div className="p-8 rounded-lg shadow-xl transform bg-gradient-to-r from-red-400 via-yellow-400 to-green-400 animate-pulse max-w-sm text-center">
              <h3 className="text-lg font-bold mb-2">Meeting Soon!</h3>
              <p className="mb-4">{m.context}</p>
              <p className="mb-6">Starts at {m.time}</p>
              <button
                onClick={() => {
                  const note = notes.find(n => n.id === alertMeetingId);
                  if (note) {
                    const ackLine = `meta::meeting_acknowledge::${new Date().toISOString()}`;
                    const updatedContent = (note.content + '\n' + ackLine).trim();
                    updateNoteById(note.id, updatedContent);
                    // update local state
                    setNotes(notes.map(n => n.id === note.id ? { ...n, content: updatedContent } : n));
                  }
                  setAlertMeetingId(null);
                }}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Close
              </button>
            </div>
          </div>
        );
      })()}
      <div className="w-full h-full bg-gray-100 p-4 space-y-2 overflow-y-auto">
      {/* Quick Links Section */}
      <div>
        <h2
          className="font-semibold text-gray-700 mb-2 flex justify-between items-center cursor-pointer p-2 hover:bg-gray-200 rounded"
          onClick={() => setShowQuickLinks(prev => !prev)}
        >
          <span>Quick links</span>
          {showQuickLinks ? (
            <ChevronDownIcon className="h-6 w-6 text-gray-700" />
          ) : (
            <ChevronRightIcon className="h-6 w-6 text-gray-700" />
          )}
        </h2>
        {showQuickLinks && (
          uniqueUrls.length === 0 ? (
            <p className="text-gray-500">No Quick Links</p>
          ) : (
            uniqueUrls.map(({ url, label }) => {
              // derive hostname if no custom label
              let displayText = label;
              if (!displayText) {
                try {
                  displayText = new URL(url).hostname.replace(/^www\./, '');
                } catch {
                  displayText = url;
                }
              }
              return (
                <div key={url} className="flex items-center mb-2 pl-4">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-black hover:underline truncate"
                  >
                    {displayText}
                  </a>
                  <button
                    onClick={() => removeBookmarkFromNotes(url, notes, setNotes)}
                    className="ml-2 text-gray-400 hover:text-red-600 focus:outline-none"
                    title="Remove from Quick links"
                  >
                    &times;
                  </button>
                </div>
              );
            })
          )
        )}
      </div>

      {/* Meetings Section */}
      {visibleMeetings.length > 0 && (
        <div>
          <h2
            className="font-semibold text-gray-700 mt-4 mb-2 flex justify-between items-center cursor-pointer p-2 hover:bg-gray-200 rounded"
            onClick={() => setShowMeetingsSection(prev => !prev)}
          >
            <span>Meetings</span>
            {showMeetingsSection ? (
              <ChevronDownIcon className="h-6 w-6 text-gray-700" />
            ) : (
              <ChevronRightIcon className="h-6 w-6 text-gray-700" />
            )}
          </h2>
          {showMeetingsSection && (
            visibleMeetings.map(m => {
              const eventTime = new Date(m.time).getTime();
              const diff = eventTime - now;
              const isFlashing = diff > 0 && diff <= 10 * 60 * 1000;
              return (
                <div
                  key={m.id}
                  className={`mb-2 pl-4 ${isFlashing ? 'animate-pulse bg-yellow-200' : ''}`}
                >
                <div className="text-sm font-medium">{m.context}</div>

                {/* Display date */}
                <div className="text-xs text-gray-500">
                  {(() => {
                    const eventDate = new Date(m.time);
                    const todayDate = new Date(now);
                    // If same day, show "Today"
                    if (eventDate.toDateString() === todayDate.toDateString()) {
                      return 'Today';
                    }
                    // Otherwise format as "MMM D, YYYY"
                    return eventDate.toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    });
                  })()}
                </div>

                {/* Display time in 12-hour format */}
                <div className="text-xs text-gray-500">
                  {(() => {
                    const eventDate = new Date(m.time);
                    let hours = eventDate.getHours();
                    const minutes = eventDate.getMinutes();
                    const ampm = hours >= 12 ? 'PM' : 'AM';
                    hours = hours % 12 || 12;
                    return `${hours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
                  })()}
                </div>

                {/* Countdown */}
                <div className="text-xs text-blue-600">
                  {(() => {
                    const target = new Date(m.time);
                    const diff = target.getTime() - now;
                    const days = Math.floor(diff / 86400000);
                    const hoursLeft = Math.floor((diff % 86400000) / 3600000);
                    const minutesLeft = Math.floor((diff % 3600000) / 60000);
                    const secondsLeft = Math.floor((diff % 60000) / 1000);
                    const parts = [];
                    if (days) parts.push(`${days}d`);
                    if (hoursLeft) parts.push(`${hoursLeft}h`);
                    if (minutesLeft) parts.push(`${minutesLeft}m`);
                    if (!parts.length) parts.push(`${secondsLeft}s`);
                    return `in ${parts.join(' ')}`;
                  })()}
                </div>
              </div>
              );
            })
          )}
        </div>
      )}

      {/* Events Section */}
      {visibleEvents.length > 0 && (
        <div>
          <h2
            className="font-semibold text-gray-700 mt-4 mb-2 flex justify-between items-center cursor-pointer p-2 hover:bg-gray-200 rounded"
            onClick={() => setShowEventsSection(prev => !prev)}
          >
            <span>Events</span>
            {showEventsSection ? (
              <ChevronDownIcon className="h-6 w-6 text-gray-700" />
            ) : (
              <ChevronRightIcon className="h-6 w-6 text-gray-700" />
            )}
          </h2>
          {showEventsSection && (
            visibleEvents.map(e => {
              const eventTime = new Date(e.time).getTime();
              const diff = eventTime - now;
              const isFlashing = diff > 0 && diff <= 10 * 60 * 1000; // flash if within 10 min
              return (
                <div
                  key={e.id}
                  className={`mb-2 pl-4 ${isFlashing ? 'animate-pulse bg-green-200' : ''}`}
                >
                  {/* Event context */}
                  <div className="text-sm font-medium">{e.context}</div>

                  {/* Event date */}
                  <div className="text-xs text-gray-500">
                    {(() => {
                      const eventDate = new Date(e.time);
                      const today = new Date(now);
                      return eventDate.toDateString() === today.toDateString()
                        ? 'Today'
                        : eventDate.toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          });
                    })()}
                  </div>

                  {/* Event time */}
                  <div className="text-xs text-gray-500">
                    {(() => {
                      const d = new Date(e.time);
                      let h = d.getHours();
                      const m = d.getMinutes();
                      const ampm = h >= 12 ? 'PM' : 'AM';
                      h = h % 12 || 12;
                      return `${h}:${m.toString().padStart(2, '0')} ${ampm}`;
                    })()}
                  </div>

                  {/* Countdown */}
                  <div className="text-xs text-blue-600">
                    {(() => {
                      const target = new Date(e.time).getTime();
                      const delta = target - now;
                      const days = Math.floor(delta / 86400000);
                      const hours = Math.floor((delta % 86400000) / 3600000);
                      const minutes = Math.floor((delta % 3600000) / 60000);
                      const seconds = Math.floor((delta % 60000) / 1000);
                      const parts = [];
                      if (days) parts.push(`${days}d`);
                      if (hours) parts.push(`${hours}h`);
                      if (minutes) parts.push(`${minutes}m`);
                      if (!parts.length) parts.push(`${seconds}s`);
                      return `in ${parts.join(' ')}`;
                    })()}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
    </>
  );
};

export default LeftPanel;