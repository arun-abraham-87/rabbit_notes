import React from 'react';

export default function TagPopup({ visible, tags, selected, onSelect, onDelete, onClose }) {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-30">
      <div className="bg-white rounded-lg shadow-lg p-6 min-w-[300px] max-w-[90vw]">
        <h2 className="text-lg font-semibold mb-2">Tags for Note</h2>
        {tags.length === 0 ? (
          <div className="text-gray-500">No tags found.</div>
        ) : (
          <ul>
            {tags.map((tag, idx) => (
              <li
                key={tag.type + ':' + tag.value + ':' + idx}
                className={`flex items-center px-2 py-1 rounded cursor-pointer ${selected === idx ? 'bg-blue-100' : ''}`}
                onMouseEnter={() => onSelect(idx)}
              >
                <span className="flex-1">{tag.type}: {tag.value}</span>
                {selected === idx && (
                  <button
                    className="ml-2 text-xs text-red-500 px-2 py-0.5 rounded hover:bg-red-100"
                    onClick={() => onDelete(idx)}
                  >
                    Delete (x)
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 text-right">
          <button onClick={onClose} className="px-3 py-1 rounded bg-gray-200 hover:bg-gray-300">Close (Esc)</button>
        </div>
      </div>
    </div>
  );
} 