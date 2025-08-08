import React, { useState, useEffect, useRef } from 'react';
import { parseNoteContent } from '../utils/TextUtils';

/**
 * Modal for linking two notes together.
 *
 * Props:
 * - visible: boolean — whether to show the modal
 * - notes: Array<{ id: number, content: string }> — all available notes
 * - linkingNoteId: number — the ID of the note you're linking from
 * - searchTerm: string — current filter text
 * - onSearchTermChange: (term: string) => void — update the filter
 * - onLink: (fromId: number, toId: number) => void — callback to perform the link
 * - onCancel: () => void — callback to close the modal without action
 * - addNote: (content: string) => Promise<Note> — callback to create a new note
 */
export default function LinkNotesModal({
  visible,
  notes,
  linkingNoteId,
  searchTerm,
  onSearchTermChange,
  onLink,
  onCancel,
  addNote,
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const itemRefs = useRef([]);

  // Define filterNotes function before using it
  const filterNotes = (notes, searchTerm) => {
    const searchLower = searchTerm.toLowerCase();
    return notes.filter(n => {
      if (n.id === linkingNoteId) return false;
      
      // Only show notes that have meta::workstream tag
      const hasWorkstreamTag = n.content.split('\n').some(line => 
        line.trim().startsWith('meta::workstream')
      );
      if (!hasWorkstreamTag) return false;
      
      // If no search term, show all workstream notes
      if (!searchTerm) return true;
      
      // Search in all content
      const contentLower = n.content.toLowerCase();
      if (contentLower.includes(searchLower)) return true;
      
      // Search in first line (title) with higher priority
      const firstLine = contentLower.split('\n')[0];
      if (firstLine.includes(searchLower)) return true;
      
      // Search in non-meta lines
      const nonMetaLines = contentLower
        .split('\n')
        .filter(line => !line.startsWith('meta::'));
      return nonMetaLines.some(line => line.includes(searchLower));
    });
  };

  const getPreviewContent = (content) => {
    const lines = content.split('\n');
    const nonMetaLines = lines.filter(line => !line.startsWith('meta::'));
    if (nonMetaLines.length === 0) return '';
    
    // Get first line and format it
    const firstLine = nonMetaLines[0];
    const formattedContent = parseNoteContent({ 
      content: firstLine,
      searchTerm: searchTerm 
    });

    return (
      <div className="text-sm text-gray-800">
        {formattedContent.map((element, idx) => (
          <React.Fragment key={idx}>{element}</React.Fragment>
        ))}
      </div>
    );
  };

  // Reset selected index when modal opens or search term changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [visible, searchTerm]);

  // Focus input when modal opens
  useEffect(() => {
    if (visible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [visible]);

  const filteredNotes = filterNotes(notes, searchTerm);
  const displayNotes = searchTerm ? filteredNotes : filteredNotes.slice(0, 5);

  // Auto-scroll to selected item
  useEffect(() => {
    if (selectedIndex >= 0 && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex].scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [selectedIndex]);

  // Handle keyboard navigation
  const handleKeyDown = async (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, displayNotes.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (displayNotes.length > 0 && selectedIndex >= 0 && selectedIndex < displayNotes.length) {
        // Link to existing note
        onLink(linkingNoteId, displayNotes[selectedIndex].id);
      } else if (displayNotes.length === 0 && searchTerm.trim() && addNote) {
        // Create new note with workstream tag and link it
        try {
          const newNoteContent = `${searchTerm.trim()}\nmeta::workstream::`;
          const newNote = await addNote(newNoteContent);
          if (newNote && newNote.id) {
            onLink(linkingNoteId, newNote.id);
          }
        } catch (error) {
          console.error('Error creating new note:', error);
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-4 rounded shadow max-w-md w-full">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-gray-800">Link Notes</h3>
          <span className="text-sm text-gray-500">
            {searchTerm ? `${filteredNotes.length} notes found` : `Showing 5 of ${filteredNotes.length} notes`}
          </span>
        </div>
        
        <input
          ref={inputRef}
          type="text"
          placeholder="Search workstream notes to link..."
          value={searchTerm}
          onChange={e => onSearchTermChange(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full p-2 border border-gray-300 rounded mb-3"
          autoFocus
        />

        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {displayNotes.map((n, index) => (
            <div
              key={n.id}
              ref={el => itemRefs.current[index] = el}
              className={`flex justify-between items-center p-2 border rounded cursor-pointer transition-colors ${
                index === selectedIndex 
                  ? 'bg-blue-100 border-blue-300' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => onLink(linkingNoteId, n.id)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="flex-1 mr-4">
                {getPreviewContent(n.content)}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLink(linkingNoteId, n.id);
                }}
                className="text-blue-600 hover:text-blue-800 whitespace-nowrap"
              >
                Link
              </button>
            </div>
          ))}
          
          {displayNotes.length === 0 && (
            <div className="text-center text-gray-500 py-4">
              {searchTerm.trim() ? (
                <div>
                  <p>No matching notes found</p>
                  <p className="text-sm text-blue-600 mt-2">
                    Press Enter to create a new workstream note: "{searchTerm.trim()}"
                  </p>
                </div>
              ) : (
                <p>No matching notes found</p>
              )}
            </div>
          )}

          {!searchTerm && filteredNotes.length > 5 && (
            <div className="text-center text-gray-500 py-2 text-sm">
              Type to search through workstream notes
            </div>
          )}
        </div>

        <div className="flex justify-end mt-3">
          <button
            onClick={onCancel}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}