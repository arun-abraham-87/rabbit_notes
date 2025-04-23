// src/components/LeftPanel.js
import React, { useMemo, useState, useEffect } from 'react';
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

  // Extract meetings: context and time from notes tagged meta::meeting
  const meetings = useMemo(() => {
    return notes.flatMap(note => {
      const lines = note.content.split('\n');
      // Find the line index containing the meeting tag
      const tagIndex = lines.findIndex(line => line.trim().startsWith('meta::meeting'));
      if (tagIndex !== -1) {
        const context = lines[tagIndex + 1] || '';
        const time = lines[tagIndex + 2] || '';
        return [{ id: note.id, context: context.trim(), time: time.trim() }];
      }
      return [];
    });
  }, [notes]);

  // State for current time to drive countdowns
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Alert for imminent meetings
  const [alertMeetingId, setAlertMeetingId] = useState(null);
  useEffect(() => {
    // Find a meeting starting within the next 2 minutes
    const soon = meetings.find(m => {
      const [timePart, ampm] = m.time.split(' ');
      const [h, min] = timePart.split('.').map(Number);
      let hour = h;
      if (ampm.toUpperCase() === 'PM' && hour < 12) hour += 12;
      if (ampm.toUpperCase() === 'AM' && hour === 12) hour = 0;
      const target = new Date(now);
      target.setHours(hour, min, 0, 0);
      if (target.getTime() < now) target.setDate(target.getDate() + 1);
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
            <div className="bg-white p-8 rounded-lg shadow-xl transform animate-pulse max-w-sm text-center">
              <h3 className="text-lg font-bold mb-2">Meeting Soon!</h3>
              <p className="mb-4">{m.context}</p>
              <p className="mb-6">Starts at {m.time}</p>
              <button
                onClick={() => setAlertMeetingId(null)}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Close
              </button>
            </div>
          </div>
        );
      })()}
      <div className="w-full h-full bg-gray-100 p-4 space-y-2 overflow-y-auto">
      {uniqueUrls.length === 0 ? (
        <p className="text-gray-500">No Quick Links</p>
      ) : (
        <>
          <h2 className="font-semibold text-gray-700 mb-2">Quick links</h2>
          {uniqueUrls.map(({ url, label }) => {
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
          })}

          {meetings.length > 0 && (
            <>
              <h2 className="font-semibold text-gray-700 mt-4 mb-2">Meetings</h2>
              {meetings.map(m => (
                <div key={m.id} className="mb-2 pl-4">
                  <div className="text-sm font-medium">{m.context}</div>
                  <div className="text-xs text-gray-500">{m.time}</div>
                  <div className="text-xs text-blue-600">
                    {(() => {
                      // Parse "2.30 PM" format
                      const [timePart, ampm] = m.time.split(' ');
                      const [hourStr, minuteStr] = timePart.split('.');
                      let hours = parseInt(hourStr, 10);
                      const minutes = parseInt(minuteStr, 10);
                      const isPM = ampm.toUpperCase() === 'PM';
                      if (isPM && hours < 12) hours += 12;
                      if (!isPM && hours === 12) hours = 0;
                      // Build target Date for today at that time
                      const target = new Date(now);
                      target.setHours(hours, minutes, 0, 0);
                      // If that time has already passed today, schedule for tomorrow
                      if (target.getTime() < now) {
                        target.setDate(target.getDate() + 1);
                      }
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
              ))}
            </>
          )}
        </>
      )}
    </div>
    </>
  );
};

export default LeftPanel;