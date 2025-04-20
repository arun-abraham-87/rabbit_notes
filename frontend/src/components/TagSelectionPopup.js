import React from 'react';

/**
 * TextSelectionPopup
 *
 * A small contextual popup that appears when the user selects text,
 * offering to convert the selection into a tag.
 *
 * Props:
 * - visible: boolean       — whether the popup should be shown
 * - position: { x, y }     — viewport coordinates for placing the popup
 * - onConvert: () => void  — callback when "Convert to Tag" is clicked
 * - onCancel: () => void   — callback when "Cancel" is clicked
 */
export default function TagSelectionPopup({ visible, position, onConvert, onCancel }) {
  if (!visible) return null;

  return (
    <div
      className="absolute bg-white border border-gray-300 p-2 rounded-md shadow-lg"
      style={{
        top: `${position.y}px`,
        left: `${position.x}px`,
      }}
    >
      <button
        onClick={onConvert}
        className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
      >
        Convert to Tag
      </button>
      <button
        onClick={onCancel}
        className="ml-2 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
      >
        Cancel
      </button>
    </div>
  );
}