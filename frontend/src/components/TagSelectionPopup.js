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
 * - selectedText: string   — the currently selected text
 * - onConvert: () => void  — callback when "Convert to Tag" is clicked
 * - onSearch: () => void   — callback when "Search" is clicked
 * - onCancel: () => void   — callback when "Cancel" is clicked
 */
export default function TagSelectionPopup({ visible, position, selectedText, onConvert, onSearch, onCancel }) {
  const popupRef = useRef(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(selectedText);
      onCancel(); // Close the popup after copying
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

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
      
      // Position the popup just slightly above the selection
      adjustedY -= (rect.height + 10); // Only 10px offset
      
      // Adjust horizontal position if needed
      if (adjustedX + rect.width > viewportWidth) {
        adjustedX = viewportWidth - rect.width - 10;
      }
      if (adjustedX < 0) {
        adjustedX = 10;
      }
      
      // Ensure popup doesn't go above viewport
      if (adjustedY < 10) {
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
        onClick={onSearch}
        className="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
      >
        Search
      </button>
      <button
        onClick={handleCopy}
        className="px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
      >
        Copy
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