import React, { useState, useMemo } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, MapPinIcon } from '@heroicons/react/24/solid';

const RightPanel = ({ notes, setNotes, setActivePage }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoveredNote, setHoveredNote] = useState(null);

  // Extract pinned notes (notes with meta::notes_pinned tag)
  const pinnedNotes = useMemo(() => {
    return notes.filter(note => 
      note.content && note.content.includes('meta::notes_pinned')
    );
  }, [notes]);

  const handleNavigateToNote = (noteId) => {
    setActivePage('notes');
    // Add a search query to highlight the specific note
    const searchEvent = new CustomEvent('searchNote', { 
      detail: { noteId, query: `id:${noteId}` } 
    });
    document.dispatchEvent(searchEvent);
  };

  if (pinnedNotes.length === 0) {
    return null; // Don't render if no pinned notes
  }

  return (
    <div className={`fixed right-0 top-0 h-full bg-white border-l border-gray-200 shadow-lg transition-all duration-300 z-40 ${
      isCollapsed ? 'w-8' : 'w-80'
    }`}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -left-3 top-4 bg-white border border-gray-200 rounded-full p-1 shadow-md hover:shadow-lg transition-shadow"
      >
        {isCollapsed ? (
          <ChevronLeftIcon className="h-4 w-4 text-gray-600" />
        ) : (
          <ChevronRightIcon className="h-4 w-4 text-gray-600" />
        )}
      </button>

      {!isCollapsed && (
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              <MapPinIcon className="h-5 w-5 text-red-500" />
              <h2 className="text-lg font-semibold text-gray-800">Pinned Notes</h2>
              <span className="ml-auto text-sm text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                {pinnedNotes.length}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {pinnedNotes.map((note) => (
                <div
                  key={note.id}
                  className="bg-gray-50 rounded-lg p-3 border border-gray-200 hover:border-gray-300 transition-colors"
                  onMouseEnter={() => setHoveredNote(note.id)}
                  onMouseLeave={() => setHoveredNote(null)}
                >
                  {/* Note Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MapPinIcon className="h-4 w-4 text-red-500" />
                      <span className="text-sm font-medium text-gray-700">
                        {new Date(note.created_datetime).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      onClick={() => handleNavigateToNote(note.id)}
                      className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      View Full
                    </button>
                  </div>

                  {/* Note Content */}
                  <div className="bg-white rounded p-2 border-l-4 border-red-400">
                    <div className="text-sm text-gray-800 whitespace-pre-wrap max-h-32 overflow-y-auto">
                      {note.content.split('\n').filter(line => !line.trim().startsWith('meta::')).join('\n')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RightPanel;

 