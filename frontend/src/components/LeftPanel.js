// src/components/LeftPanel.js
import React, { useMemo } from 'react';

const LeftPanel = ({ notes }) => {
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
        <p className="text-gray-500">No bookmarks</p>
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
              <div key={url} className="mb-2 pl-4">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-black hover:underline"
                >
                  {displayText}
                </a>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};

export default LeftPanel;