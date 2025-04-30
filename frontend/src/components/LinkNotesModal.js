import React from 'react';
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
 */
export default function LinkNotesModal({
  visible,
  notes,
  linkingNoteId,
  searchTerm,
  onSearchTermChange,
  onLink,
  onCancel,
}) {
  if (!visible) return null;

  const filterNotes = (notes, searchTerm) => {
    const searchLower = searchTerm.toLowerCase();
    return notes.filter(n => {
      if (n.id === linkingNoteId) return false;
      if (!n.content.includes('meta::workstream')) return false;
      
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

  const filteredNotes = filterNotes(notes, searchTerm);
  const displayNotes = searchTerm ? filteredNotes : filteredNotes.slice(0, 5);

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
          type="text"
          placeholder="Search notes to link..."
          value={searchTerm}
          onChange={e => onSearchTermChange(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded mb-3"
          autoFocus
        />

        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {displayNotes.map(n => (
            <div
              key={n.id}
              className="flex justify-between items-center p-2 border rounded hover:bg-gray-50"
            >
              <div className="flex-1 mr-4">
                {getPreviewContent(n.content)}
              </div>
              <button
                onClick={() => onLink(linkingNoteId, n.id)}
                className="text-blue-600 hover:text-blue-800 whitespace-nowrap"
              >
                Link
              </button>
            </div>
          ))}
          
          {displayNotes.length === 0 && (
            <div className="text-center text-gray-500 py-4">
              No matching notes found
            </div>
          )}

          {!searchTerm && filteredNotes.length > 5 && (
            <div className="text-center text-gray-500 py-2 text-sm">
              Type to search through all notes
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