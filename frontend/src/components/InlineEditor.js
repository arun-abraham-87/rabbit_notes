// src/components/InlineEditor.js
import React, { useRef, useEffect, useState } from 'react';

/**
 * Reusable inline‑edit UI: an input box with Save / Cancel.
 *
 * Props
 * -----
 * text            – current text (string)
 * setText         – setter for the text in the parent state
 * onSave          – fn(newText)  called on Save or "Enter"
 * onCancel        – fn()         called on Cancel click
 * inputClass      – extra Tailwind classes for the <input> (optional)
 */
const InlineEditor = ({ text, setText, onSave, onCancel, inputClass = '' }) => {
  const inputRef = useRef(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // State for custom label popup on paste
  const [pendingUrl, setPendingUrl] = useState(null);
  const [labelInput, setLabelInput] = useState('');

  const handlePaste = (e) => {
    const pasteText = e.clipboardData.getData('text');
    const urlPattern = /^https?:\/\/[^\s]+$/;
    if (urlPattern.test(pasteText)) {
      e.preventDefault();
      // Show custom label popup
      setPendingUrl(pasteText);
      setLabelInput('');
    }
  };

  const handleKeyDown = (e) => {
    // Handle Cmd+Enter (or Ctrl+Enter) to save
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault(); // Prevent the event from bubbling up
      e.stopPropagation(); // Stop propagation to prevent global handler
      onSave(text);
      return;
    }

    // Handle regular Enter
    if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      onSave(text);
    }
  };

  const closeUrlPopup = (newText) => {
    setText(newText);
    setPendingUrl(null);
    // Return focus to the main input after a short delay to ensure the DOM has updated
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  return (
    <div className="w-full flex items-center">
      {pendingUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded shadow-lg w-80">
            <label className="block text-sm mb-2">Link text:</label>
            <input
              type="text"
              value={labelInput}
              onChange={e => setLabelInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  // confirm with custom or hostname
                  let label = labelInput.trim();
                  if (!label) {
                    try {
                      label = new URL(pendingUrl).hostname.replace(/^www\./, '');
                    } catch {
                      label = pendingUrl;
                    }
                  }
                  closeUrlPopup(`[${label}](${pendingUrl})`);
                } else if (e.key === 'Escape') {
                  // confirm bare URL
                  closeUrlPopup(pendingUrl);
                }
              }}
              autoFocus
              className="w-full border px-2 py-1 rounded mb-4"
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => {
                  const label = labelInput.trim() || (() => {
                    try { return new URL(pendingUrl).hostname.replace(/^www\./,''); }
                    catch { return pendingUrl; }
                  })();
                  closeUrlPopup(`[${label}](${pendingUrl})`);
                }}
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
              >
                OK
              </button>
              <button
                onClick={() => closeUrlPopup(pendingUrl)}
                className="px-3 py-1 bg-gray-300 rounded text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <input
        type="text"
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        className={`flex-1 border border-gray-300 px-2 py-1 rounded mr-2 text-sm ${inputClass}`}
      />

      <button
        onClick={() => onSave(text)}
        className="text-green-600 text-xs font-semibold mr-1 hover:underline"
      >
        Save
      </button>

      <button
        onClick={onCancel}
        className="text-red-500 text-xs font-semibold hover:underline"
      >
        Cancel
      </button>
    </div>
  );
};

export default InlineEditor;