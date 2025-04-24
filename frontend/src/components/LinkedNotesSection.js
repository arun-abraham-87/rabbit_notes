import React, { useState, useEffect, useMemo } from 'react';
import { ChevronUpIcon, ChevronDownIcon, ArrowSmallUpIcon, ArrowSmallDownIcon } from '@heroicons/react/24/solid';

/**
 * LinkedNotesSection
 * Renders and allows reordering of notes linked via meta::link::ID tags.
 */
export default function LinkedNotesSection({
  note,
  allNotes,
  updateNote,
  onNavigate,
  initiallyOpen = false,
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const [showRawNote, setShowRawNote] = useState(null);
  const [showMetaTags, setShowMetaTags] = useState({});
  const [hoveredNote, setHoveredNote] = useState(null);

  // Extract linked IDs in order
  const orderedIds = useMemo(() => {
    return note.content
      .split('\n')
      .filter(line => line.trim().toLowerCase().startsWith('meta::link'))
      .map(line => line.split('::').pop().trim());
  }, [note.content]);

  // Filter out meta tags from content
  const getFilteredContent = (content, showMeta) => {
    if (showMeta) return content;
    return content
      .split('\n')
      .filter(line => !line.trim().toLowerCase().startsWith('meta::'))
      .join('\n');
  };

  // Function to move a note up or down in the order
  const moveNote = (currentIndex, direction) => {
    const lines = note.content.split('\n');
    const linkLines = lines.filter(line => line.trim().toLowerCase().startsWith('meta::link'));
    const nonLinkLines = lines.filter(line => !line.trim().toLowerCase().startsWith('meta::link'));
    
    // Calculate new index
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    // Swap the positions
    const temp = linkLines[currentIndex];
    linkLines[currentIndex] = linkLines[newIndex];
    linkLines[newIndex] = temp;
    
    // Reconstruct the content with the new order
    const newContent = [
      ...nonLinkLines.filter(line => !line.trim().startsWith('meta::')),
      ...linkLines,
      ...nonLinkLines.filter(line => line.trim().startsWith('meta:') && !line.trim().startsWith('meta::link'))
    ].join('\n');
    
    updateNote(note.id, newContent);
  };

  // No links → no section
  if (orderedIds.length === 0) return null;

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="text-sm text-purple-600 hover:underline flex items-center gap-1"
      >
        Linked Notes ({orderedIds.length})
        {open ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
      </button>
      {open && (
        <div className="mt-2 pl-4 border-l border-gray-300 space-y-4">
          {orderedIds.map((id, index) => {
            const ln = allNotes.find(n => String(n.id) === id);
            if (!ln) return null;
            
            return (
              <div
                key={id}
                className="bg-white border rounded-lg shadow-sm overflow-hidden"
              >
                <div className="relative group">
                  <pre className="whitespace-pre-wrap font-mono text-sm p-4 bg-white text-gray-800 overflow-x-auto">
                    {getFilteredContent(ln.content, showMetaTags[id])}
                  </pre>
                  <div 
                    className="absolute right-0 top-0 bottom-0 w-24 opacity-0 group-hover:opacity-100 transition-opacity"
                    onMouseEnter={() => setHoveredNote(id)}
                    onMouseLeave={() => setHoveredNote(null)}
                  >
                    <div className={`absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 transition-opacity duration-200 ${hoveredNote === id ? 'opacity-100' : 'opacity-0'}`}>
                      <button
                        onClick={() => setShowMetaTags(prev => ({ ...prev, [id]: !prev[id] }))}
                        className="text-xs text-gray-400 hover:text-gray-700 bg-white/80 rounded shadow-sm px-2 py-1"
                      >
                        {showMetaTags[id] ? 'Hide meta' : 'Show meta'}
                      </button>
                      <div className="flex flex-col gap-1">
                        {index > 0 && (
                          <button
                            onClick={() => moveNote(index, 'up')}
                            className="text-gray-400 hover:text-gray-700 p-1 bg-white/80 rounded shadow-sm"
                            title="Move up"
                          >
                            <ArrowSmallUpIcon className="h-4 w-4" />
                          </button>
                        )}
                        {index < orderedIds.length - 1 && (
                          <button
                            onClick={() => moveNote(index, 'down')}
                            className="text-gray-400 hover:text-gray-700 p-1 bg-white/80 rounded shadow-sm"
                            title="Move down"
                          >
                            <ArrowSmallDownIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}