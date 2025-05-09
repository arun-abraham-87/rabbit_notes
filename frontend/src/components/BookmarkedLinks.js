import React, { useMemo } from 'react';
import { BookmarkIcon } from '@heroicons/react/24/outline';

const BookmarkedLinks = ({ notes }) => {
  const bookmarkedUrls = useMemo(() => {
    const seen = new Set();
    const list = [];
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s)]+)/g;
    notes.forEach(note => {
      if (note?.content && note.content.split('\n').some(line => line.trim().startsWith('meta::bookmark'))) {
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

  if (bookmarkedUrls.length === 0) return null;

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-white rounded-lg shadow-sm">
      <div className="flex items-center gap-2 text-gray-600">
        <BookmarkIcon className="h-5 w-5" />
        <span className="text-sm font-medium">Bookmarks:</span>
      </div>
      <div className="flex items-center gap-3 overflow-x-auto">
        {bookmarkedUrls.map(({ url, label }, index) => {
          const displayText = label || (() => {
            try { return new URL(url).hostname.replace(/^www\./, ''); }
            catch { return url; }
          })();
          return (
            <React.Fragment key={url}>
              {index > 0 && (
                <div className="h-4 w-px bg-gray-300" />
              )}
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 whitespace-nowrap hover:underline"
              >
                {displayText}
              </a>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default BookmarkedLinks; 