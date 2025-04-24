import React, { useState, useEffect } from 'react';

/**
 * A modal dialog for picking an end date/time.
 *
 * Props:
 * - noteId: ID of the note being edited (falsy → hidden)
 * - onSelect(noteId, dateValue): callback when a date is chosen
 * - onCancel(): callback to close without saving
 */
export default function EndDatePickerModal({ noteId, onSelect, onCancel }) {
  // Set initial value to current date/time
  const [dateValue, setDateValue] = useState('');

  useEffect(() => {
    if (noteId) {
      // Format current date/time as YYYY-MM-DDTHH:mm
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setDateValue(`${year}-${month}-${day}T${hours}:${minutes}`);
    }
  }, [noteId]);

  if (!noteId) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-4 rounded shadow-md">
        <input
          type="datetime-local"
          value={dateValue}
          onChange={e => {
            setDateValue(e.target.value);
          }}
          className="border border-gray-300 rounded px-3 py-2 text-sm"
        />
        <div className="mt-3 flex justify-end gap-2">
          <button
            onClick={() => onSelect(noteId, dateValue)}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
          >
            Set Date
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}