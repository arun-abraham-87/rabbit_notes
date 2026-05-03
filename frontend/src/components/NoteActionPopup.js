import React, { useEffect, useRef } from 'react';

export default function NoteActionPopup({ visible, selected, onSelect, onEnter, onClose, actions = ['Open Links', 'Edit'] }) {
  const popupRef = useRef(null);

  useEffect(() => {
    if (visible && popupRef.current) {
      popupRef.current.focus();
    }
  }, [visible]);

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown' || e.key === 'j') {
      onSelect((selected + 1) % actions.length);
      e.preventDefault();
      e.stopPropagation();
      return;
    } else if (e.key === 'ArrowUp' || e.key === 'k') {
      onSelect((selected - 1 + actions.length) % actions.length);
      e.preventDefault();
      e.stopPropagation();
      return;
    } else if (e.key === 'Enter') {
      onEnter(selected);
      e.preventDefault();
      e.stopPropagation();
    } else if (e.key === 'Escape') {
      onClose();
      e.preventDefault();
      e.stopPropagation();
    }
  }

  if (!visible) return null;
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-30"
      tabIndex={0}
      ref={popupRef}
      onKeyDown={handleKeyDown}
      autoFocus
    >
      <div className="bg-white rounded-lg shadow-lg p-6 min-w-[240px] max-w-[90vw]">
        <h2 className="text-lg font-semibold mb-2">Note Actions</h2>
        <ul>
          {actions.map((action, index) => (
            <li
              key={action}
              className={`px-4 py-2 rounded cursor-pointer ${selected === index ? 'bg-blue-100' : ''}`}
              onClick={() => onEnter(index)}
            >
              {action}
            </li>
          ))}
        </ul>
        <div className="text-xs text-gray-400 mt-2">Use ↑/↓ or j/k to navigate, Enter to select, Esc to cancel.</div>
      </div>
    </div>
  );
} 
