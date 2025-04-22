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
    // Map to store url → custom label (if any)
    const urlMap = new Map();

    // Regexes for markdown links and bare URLs
    const mdLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
    const urlRegex = /https?:\/\/[^\s)]+/g;

    notes.forEach(note => {
      if (note.content.split('\n').some(line => line.trim().startsWith('meta::bookmark'))) {
        // First extract markdown links
        let match;
        while ((match = mdLinkRegex.exec(note.content)) !== null) {
          const [, text, url] = match;
          if (!urlMap.has(url)) {
            urlMap.set(url, text);
          }
        }
        // Then extract any bare URLs
        const bareMatches = note.content.match(urlRegex) || [];
        bareMatches.forEach(url => {
          if (!urlMap.has(url)) {
            urlMap.set(url, null);
          }
        });
      }
    });

    // Convert map entries to array of objects
    return Array.from(urlMap.entries()).map(([url, label]) => ({ url, label }));
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