import React from 'react';

export default function NoteTagBar({
  note,
  updateNote,
  duplicateUrlNoteIds,
  duplicateWithinNoteIds,
}) {
  return (
    <div className="flex flex-wrap gap-2 px-4 pb-2">
      {['meta::low', 'meta::medium', 'meta::high'].map((priority, index) => 
        note.content.includes(priority) ? (
          <button
            key={index}
            className="bg-gray-300 text-gray-800 text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1 hover:bg-gray-400"
          >
            {priority.replace('meta::', '')}
            <span
              onClick={() => {
                const updatedContent = note.content
                  .split('\n')
                  .filter(line => !line.trim().startsWith(priority))
                  .join('\n')
                  .trim();
                updateNote(note.id, updatedContent);
              }}
              className="ml-1 text-purple-600 hover:text-purple-900 cursor-pointer"
              title="Remove tag"
            >
              ×
            </span>
          </button>
        ) : null
      )}

      {note.content.includes('meta::todo') && (
        <button className="bg-gray-300 text-gray-800 text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1 hover:bg-gray-400">
          todo
          <span
            onClick={() => {
              const updatedContent = note.content
                .split('\n')
                .filter(line => !line.trim().startsWith('meta::todo'))
                .join('\n')
                .trim();
              updateNote(note.id, updatedContent);
            }}
            className="ml-1 text-purple-600 hover:text-purple-900 cursor-pointer"
            title="Remove tag"
          >
            ×
          </span>
        </button>
      )}

      {note.content.includes('meta::abbreviation') && (
        <button className="bg-gray-300 text-gray-800 text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1 hover:bg-gray-400">
          Abbreviation
          <span
            onClick={() => {
              const updatedContent = note.content
                .split('\n')
                .filter(line => !line.trim().startsWith('meta::abbreviation'))
                .join('\n')
                .trim();
              updateNote(note.id, updatedContent);
            }}
            className="ml-1 text-purple-600 hover:text-purple-900 cursor-pointer"
            title="Remove tag"
          >
            ×
          </span>
        </button>
      )}

      {duplicateUrlNoteIds.has(note.id) && (
        <span className="bg-gray-300 text-gray-800 text-xs font-semibold px-3 py-1 rounded-full hover:bg-gray-400">
          Duplicate URL
        </span>
      )}

      {duplicateWithinNoteIds.has(note.id) && (
        <>
          <span className="bg-gray-300 text-gray-800 text-xs font-semibold px-3 py-1 rounded-full hover:bg-gray-400">
            Duplicate Url In Note
          </span>
          <button
            onClick={() => {
              const seen = new Set();
              const cleanedContent = note.content.replace(/https?:\/\/[^\s)]+/g, url => {
                if (seen.has(url)) return '';
                seen.add(url);
                return url;
              });
              updateNote(note.id, cleanedContent);
            }}
            className="ml-2 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
          >
            Remove Duplicates
          </button>
        </>
      )}
    </div>
  );
}