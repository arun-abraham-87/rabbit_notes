// src/components/InlineEditor.js
import React, { useRef, useEffect, useState } from 'react';

/**
 * Reusable inline‑edit UI: a textarea with Save / Cancel.
 *
 * Props
 * -----
 * text            – current text (string)
 * setText         – setter for the text in the parent state
 * onSave          – fn(newText)  called on Save or "Cmd+Enter"
 * onCancel        – fn()         called on Cancel click or "Escape"
 * inputClass      – extra Tailwind classes for the textarea (optional)
 */
const InlineEditor = ({ text, setText, onSave, onCancel, inputClass = '' }) => {
  const inputRef = useRef(null);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // State for custom label popup on paste
  const [pendingUrl, setPendingUrl] = useState(null);
  const [labelInput, setLabelInput] = useState('');
  const [cursorPosition, setCursorPosition] = useState({ start: 0, end: 0 });

  const handlePaste = (e) => {
    const pasteText = e.clipboardData.getData('text');
    const urlPattern = /^https?:\/\/[^\s]+$/;
    if (urlPattern.test(pasteText)) {
      e.preventDefault();
      
      // Get cursor position
      const textarea = e.target;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      
      // Show custom label popup with cursor position info
      setPendingUrl(pasteText);
      setLabelInput('');
      
      // Store cursor position for later use
      setCursorPosition({ start, end });
    }
  };

  const handleKeyDown = (e) => {
    // Handle Escape to cancel
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onCancel();
      return;
    }

    // Handle Cmd+Enter (or Ctrl+Enter) to save
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault(); // Prevent the event from bubbling up
      e.stopPropagation(); // Stop propagation to prevent global handler
      onSave(text);
      return;
    }

    // Handle regular Enter - create new line
    if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      // Add newline to current text
      setText(text + '\n');
      // Trigger resize after the newline is added
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.style.height = 'auto';
          inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 200) + 'px';
        }
      }, 0);
      return;
    }
  };

  const closeUrlPopup = (newText) => {
    // Insert the new text at the cursor position
    const before = text.slice(0, cursorPosition.start);
    const after = text.slice(cursorPosition.end);
    const newContent = before + newText + after;
    
    setText(newContent);
    setPendingUrl(null);
    setCursorPosition({ start: 0, end: 0 });
    
    // Return focus to the main input after a short delay to ensure the DOM has updated
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        // Set cursor position after the inserted text
        const newCursorPos = cursorPosition.start + newText.length;
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  return (
    <div className="w-full relative">
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

      <textarea
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        className={`w-full border border-gray-300 px-2 py-1 rounded text-sm resize-none ${inputClass}`}
        rows={1}
        style={{
          resize: 'none',
          overflow: 'hidden'
        }}
        onInput={(e) => {
          // Auto-resize the textarea
          e.target.style.height = 'auto';
          e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
        }}
      />
      
      {/* Floating buttons at the end of text */}
      <div className="absolute right-0 top-0 flex items-center h-full pointer-events-none">
        <div className="flex items-center gap-1 pointer-events-auto">
          <button
            onClick={() => onSave(text)}
            className="px-2 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 focus:outline-none focus:ring-1 focus:ring-green-400 transition-colors duration-150 shadow-sm"
          >
            Save
          </button>

          <button
            onClick={onCancel}
            className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-400 transition-colors duration-150 shadow-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default InlineEditor;