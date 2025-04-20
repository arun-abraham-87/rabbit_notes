import React from 'react';

/**
 * Modal for linking two notes together.
 *
 * Props:
 * - visible: boolean — whether to show the modal
 * - notes: Array<{ id: number, content: string }> — all available notes
 * - linkingNoteId: number — the ID of the note you’re linking from
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-4 rounded shadow max-w-md w-full">
        <input
          type="text"
          placeholder="Search notes to link..."
          value={searchTerm}
          onChange={e => onSearchTermChange(e.target.value)}
          className="w-full p-2 border border-gray-300 rounded mb-3"
        />

        <div className="space-y-2 max-h-60 overflow-y-auto">
          {notes
            .filter(
              n =>
                n.id !== linkingNoteId &&
                n.content.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .slice(0, 5)
            .map(n => (
              <div
                key={n.id}
                className="flex justify-between items-center p-2 border rounded"
              >
                <span className="text-sm text-gray-800 line-clamp-1">
                  {n.content.slice(0, 50)}…
                </span>
                <button
                  onClick={() => onLink(linkingNoteId, n.id)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Link
                </button>
              </div>
            ))}
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