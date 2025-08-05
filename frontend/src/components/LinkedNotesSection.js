import React, { useState, useEffect, useMemo } from 'react';
import { ChevronUpIcon, ChevronDownIcon, ArrowSmallUpIcon, ArrowSmallDownIcon, MagnifyingGlassIcon, TrashIcon } from '@heroicons/react/24/solid';
import { parseNoteContent } from '../utils/TextUtils';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [deletingLinkId, setDeletingLinkId] = useState(null);

  // Extract linked IDs in order
  const orderedIds = useMemo(() => {
    const ids = note.content
      .split('\n')
      .filter(line => line.trim().toLowerCase().startsWith('meta::link'))
      .map(line => line.split('::').pop().trim());
    
    
    return ids;
  }, [note.content]);

  // Filter notes based on search query
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) {
      return orderedIds;
    }
    
    const query = searchQuery.toLowerCase();
    return orderedIds.filter(id => {
      const note = allNotes.find(n => String(n.id) === id);
      if (!note) return false;
      return note.content.toLowerCase().includes(query);
    });
  }, [searchQuery, orderedIds, allNotes]);

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

  // Function to delete a linked note
  const deleteLink = (linkId) => {
    const linkedNote = allNotes.find(n => String(n.id) === String(linkId));
    const noteTitle = linkedNote ? linkedNote.content.split('\n')[0]?.trim() || 'Unknown note' : 'Unknown note';
    
    if (window.confirm(`Are you sure you want to remove the link to "${noteTitle}"?`)) {
      const lines = note.content.split('\n');
      const filteredLines = lines.filter(line => {
        const trimmedLine = line.trim().toLowerCase();
        // Remove the specific link line
        if (trimmedLine.startsWith('meta::link')) {
          const lineId = line.split('::').pop().trim();
          return lineId !== String(linkId);
        }
        return true;
      });
      
      const newContent = filteredLines.join('\n');
      updateNote(note.id, newContent);
    }
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
        <div className="mt-2 space-y-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search linked notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
          <div className="pl-4 border-l border-gray-300 space-y-4">
            {filteredNotes.map((id, index) => {
              
              
              
              const ln = allNotes.find(n => String(n.id) === String(id));
              
              if (!ln) {
                
                return (
                  <div
                    key={id}
                    className="bg-red-50 border border-red-200 rounded-lg shadow-sm overflow-hidden"
                  >
                    <div className="p-4 text-red-600 flex items-center justify-between">
                      <span>Linked note not found (ID: {id})</span>
                      <button
                        onClick={() => deleteLink(id)}
                        className="text-red-500 hover:text-red-700 p-1 bg-red-50 rounded shadow-sm"
                        title="Delete broken link"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              }
              
              return (
                <div
                  key={id}
                  className="bg-white border rounded-lg shadow-sm overflow-hidden"
                >
                  <div className="relative group">
                    <div className="whitespace-pre-wrap font-mono text-sm p-4 bg-white text-gray-800 overflow-x-auto">
                      {parseNoteContent({ 
                        content: getFilteredContent(ln.content, showMetaTags[id]),
                        searchTerm: ''
                      }).map((element, idx) => (
                        <React.Fragment key={idx}>{element}</React.Fragment>
                      ))}
                    </div>
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
                          <button
                            onClick={() => deleteLink(id)}
                            className="text-red-400 hover:text-red-700 p-1 bg-white/80 rounded shadow-sm"
                            title="Delete link"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}