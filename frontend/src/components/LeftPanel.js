// src/components/LeftPanel.js
import React, { useMemo } from 'react';
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

  return (
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
        </>
      )}
    </div>
  );
};

export default LeftPanel;