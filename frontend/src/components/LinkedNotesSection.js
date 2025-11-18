import React, { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
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
  const location = useLocation();
  
  // Always show expanded in /notes, otherwise use initiallyOpen prop
  const shouldBeOpen = location.pathname === '/notes' ? true : initiallyOpen;
  const [open, setOpen] = useState(shouldBeOpen);
  const [showMetaTags, setShowMetaTags] = useState({});
  const [hoveredNote, setHoveredNote] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Extract linked IDs in order
  const orderedIds = useMemo(() => {
    const ids = note.content
      .split('\n')
      .filter(line => line.trim().toLowerCase().startsWith('meta::link'))
      .map(line => {
        const trimmedLine = line.trim();
        // Handle both formats: meta::link::ID and meta::link:ID
        // Check if it's the double colon format (meta::link::ID)
        if (trimmedLine.toLowerCase().startsWith('meta::link::')) {
          // Double colon format: meta::link::ID
          return trimmedLine.replace(/^meta::link::/i, '').trim();
        } else if (trimmedLine.toLowerCase().startsWith('meta::link:')) {
          // Single colon format: meta::link:ID
          return trimmedLine.replace(/^meta::link:/i, '').trim();
        }
        // Fallback: try to extract ID after the last colon
        const parts = trimmedLine.split(':');
        return parts[parts.length - 1].trim();
      });
    
    
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

  // Filter out meta tags from content and truncate to 50 chars
  const getFilteredContent = (content, showMeta) => {
    let filteredContent;
    if (showMeta) {
      filteredContent = content;
    } else {
      filteredContent = content
        .split('\n')
        .filter(line => !line.trim().toLowerCase().startsWith('meta::'))
        .join('\n');
    }
    
    // Truncate to 50 characters maximum
    if (filteredContent.length > 50) {
      return filteredContent.substring(0, 50) + '...';
    }
    return filteredContent;
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
        const trimmedLine = line.trim();
        // Remove the specific link line
        if (trimmedLine.toLowerCase().startsWith('meta::link')) {
          let lineId;
          // Handle both formats: meta::link::ID and meta::link:ID
          if (trimmedLine.toLowerCase().startsWith('meta::link::')) {
            lineId = trimmedLine.replace(/^meta::link::/i, '').trim();
          } else if (trimmedLine.toLowerCase().startsWith('meta::link:')) {
            lineId = trimmedLine.replace(/^meta::link:/i, '').trim();
          } else {
            // Fallback: try to extract ID after the last colon
            const parts = trimmedLine.split(':');
            lineId = parts[parts.length - 1].trim();
          }
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
          {orderedIds.length > 5 && (
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
          )}
          <div className="pl-4 border-l border-gray-300 flex flex-wrap">
            {filteredNotes.map((id, index) => {
              
              
              
              const ln = allNotes.find(n => String(n.id) === String(id));
              
              if (!ln) {
                
                return (
                  <div
                    key={id}
                    className="bg-red-50 border border-red-200 rounded-lg shadow-sm overflow-hidden w-fit max-w-full"
                  >
                    <div className="p-3 text-red-600 flex items-center justify-between">
                      <span className="text-sm">Linked note not found (ID: {id})</span>
                      <button
                        onClick={() => deleteLink(id)}
                        className="text-red-500 hover:text-red-700 p-1 bg-red-50 rounded shadow-sm ml-2"
                        title="Delete broken link"
                      >
                        <TrashIcon className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              }
              
              return (
                <div
                  key={id}
                  className="bg-white border rounded-lg shadow-sm overflow-hidden w-fit max-w-full"
                >
                  <div className="relative group">
                    <div 
                      className="whitespace-pre-wrap font-mono text-sm p-3 bg-white text-gray-800 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => onNavigate && onNavigate(id)}
                      title="Click to navigate to this note"
                    >
                      {parseNoteContent({ 
                        content: getFilteredContent(ln.content, showMetaTags[id]),
                        searchTerm: ''
                      }).map((element, idx) => (
                        <React.Fragment key={idx}>{element}</React.Fragment>
                      ))}
                    </div>
                    <div 
                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      onMouseEnter={() => setHoveredNote(id)}
                      onMouseLeave={() => setHoveredNote(null)}
                    >
                      <div className={`flex items-center gap-1 transition-opacity duration-200 ${hoveredNote === id ? 'opacity-100' : 'opacity-0'}`}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowMetaTags(prev => ({ ...prev, [id]: !prev[id] }));
                          }}
                          className="text-xs text-gray-400 hover:text-gray-700 bg-white/90 rounded shadow-sm px-1 py-0.5"
                          title={showMetaTags[id] ? 'Hide meta' : 'Show meta'}
                        >
                          {showMetaTags[id] ? 'M' : 'M'}
                        </button>
                        {index > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              moveNote(index, 'up');
                            }}
                            className="text-gray-400 hover:text-gray-700 p-0.5 bg-white/90 rounded shadow-sm"
                            title="Move up"
                          >
                            <ArrowSmallUpIcon className="h-3 w-3" />
                          </button>
                        )}
                        {index < orderedIds.length - 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              moveNote(index, 'down');
                            }}
                            className="text-gray-400 hover:text-gray-700 p-0.5 bg-white/90 rounded shadow-sm"
                            title="Move down"
                          >
                            <ArrowSmallDownIcon className="h-3 w-3" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteLink(id);
                          }}
                          className="text-red-400 hover:text-red-700 p-0.5 bg-white/90 rounded shadow-sm"
                          title="Delete link"
                        >
                          <TrashIcon className="h-3 w-3" />
                        </button>
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