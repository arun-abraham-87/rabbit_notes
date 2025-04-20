import React from 'react';

/**
 * A modal dialog for picking an end date/time.
 *
 * Props:
 * - noteId: ID of the note being edited (falsy → hidden)
 * - onSelect(noteId, dateValue): callback when a date is chosen
 * - onCancel(): callback to close without saving
 */
export default function EndDatePickerModal({ noteId, onSelect, onCancel }) {
  if (!noteId) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-4 rounded shadow-md">
        <input
          type="datetime-local"
          onChange={e => onSelect(noteId, e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 text-sm"
        />
        <button
          onClick={onCancel}
          className="ml-2 text-sm text-red-500 hover:underline"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}