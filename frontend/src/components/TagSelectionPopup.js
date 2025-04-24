import React, { useEffect, useRef } from 'react';

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
  const popupRef = useRef(null);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && visible) {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [visible, onCancel]);

  useEffect(() => {
    if (visible && popupRef.current) {
      const popup = popupRef.current;
      const rect = popup.getBoundingClientRect();
      
      // Get viewport dimensions
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Calculate adjusted position to keep popup in viewport
      let adjustedX = position.x;
      let adjustedY = position.y;
      
      // Adjust horizontal position if needed
      if (adjustedX + rect.width > viewportWidth) {
        adjustedX = viewportWidth - rect.width - 10;
      }
      if (adjustedX < 0) {
        adjustedX = 10;
      }
      
      // Adjust vertical position if needed
      if (adjustedY + rect.height > viewportHeight) {
        adjustedY = position.y - rect.height - 20; // Show above selection
      }
      if (adjustedY < 0) {
        adjustedY = 10;
      }
      
      // Apply adjusted position
      popup.style.left = `${adjustedX}px`;
      popup.style.top = `${adjustedY}px`;
    }
  }, [visible, position]);

  if (!visible) return null;

  return (
    <div
      ref={popupRef}
      className="fixed bg-white border border-gray-200 p-3 rounded-lg shadow-lg z-50 flex gap-2"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      <button
        onClick={onConvert}
        className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors"
      >
        Convert to Tag
      </button>
      <button
        onClick={onCancel}
        className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
}