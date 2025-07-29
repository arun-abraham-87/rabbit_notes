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
 * onDelete        – fn()         called on Delete button click
 * inputClass      – extra Tailwind classes for the textarea (optional)
 */
const InlineEditor = ({ text, setText, onSave, onCancel, onDelete, inputClass = '', isSuperEditMode = false, wasOpenedFromSuperEdit = false, lineIndex = null }) => {
  console.log('InlineEditor props:', { isSuperEditMode, wasOpenedFromSuperEdit });
  const inputRef = useRef(null);
  const [headerType, setHeaderType] = useState(null); // 'h1', 'h2', or null
  const [displayText, setDisplayText] = useState('');
  
  // Track if this is the initial mount
  const [isInitialMount, setIsInitialMount] = useState(true);
  
  useEffect(() => {
    if (inputRef.current && isInitialMount) {
      inputRef.current.focus();
      // Only position cursor at the end on initial mount
      const textLength = displayText.length;
      inputRef.current.setSelectionRange(textLength, textLength);
      setIsInitialMount(false);
    }
  }, [displayText, isInitialMount]);

  // Detect if text is H1 (###) or H2 (##) and strip hash symbols for editing
  useEffect(() => {
    const trimmedText = text.trim();
    let newDisplayText = text;
    let newHeaderType = null;
    
    if (trimmedText.startsWith('###') && trimmedText.endsWith('###')) {
      newHeaderType = 'h1';
      newDisplayText = trimmedText.substring(3, trimmedText.length - 3); // Remove '###' prefix and '###' suffix
    } else if (trimmedText.startsWith('##') && trimmedText.endsWith('##')) {
      newHeaderType = 'h2';
      newDisplayText = trimmedText.substring(2, trimmedText.length - 2); // Remove '##' prefix and '##' suffix
    } else if (trimmedText.startsWith('### ')) {
      newHeaderType = 'h1';
      newDisplayText = trimmedText.substring(4); // Remove '### ' prefix only
    } else if (trimmedText.startsWith('## ')) {
      newHeaderType = 'h2';
      newDisplayText = trimmedText.substring(3); // Remove '## ' prefix only
    } else {
      newHeaderType = null;
      newDisplayText = text;
    }
    
    setHeaderType(newHeaderType);
    setDisplayText(newDisplayText);
  }, [text]);

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
    console.log('InlineEditor handleKeyDown called with key:', e.key, 'target:', e.target.tagName);
    
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
      handleSave();
      return;
    }

    // Handle Cmd+K (or Ctrl+K) to save
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      e.stopPropagation();
      handleSave();
      return;
    }

    // Handle regular Enter - create new line or save based on mode
    if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      e.stopPropagation();
      
      console.log('Enter pressed in InlineEditor:', { isSuperEditMode, wasOpenedFromSuperEdit, lineIndex });
      
      if (isSuperEditMode || wasOpenedFromSuperEdit) {
        // In superedit mode or opened from superedit mode, Enter saves the line
        console.log('Saving from superedit mode');
        handleSave();
        return;
      } else {
        // In normal mode, Enter creates a new line
        console.log('Creating new line in normal mode');
        const newText = displayText + '\n';
        setDisplayText(newText);
        // Trigger resize after the newline is added
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.style.height = 'auto';
            inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 200) + 'px';
          }
        }, 0);
        return;
      }
    }
  };

  // Function to handle saving with proper header formatting
  const handleSave = () => {
    let finalText = displayText;
    
    // Add header symbols back if it was a header
    if (headerType === 'h1') {
      finalText = '###' + displayText + '###';
    } else if (headerType === 'h2') {
      finalText = '##' + displayText + '##';
    }
    
    console.log('InlineEditor handleSave called with finalText:', finalText, 'wasOpenedFromSuperEdit:', wasOpenedFromSuperEdit, 'lineIndex:', lineIndex);
    console.log('Calling onSave with:', finalText);
    onSave(finalText);
    
    // If this was opened from superedit mode, trigger a return to superedit
    if (wasOpenedFromSuperEdit) {
      // Dispatch a custom event to signal return to superedit mode
      const event = new CustomEvent('returnToSuperEdit', {
        detail: { lineIndex: lineIndex } // Pass the actual line index
      });
      console.log('InlineEditor dispatching returnToSuperEdit event with lineIndex:', lineIndex);
      document.dispatchEvent(event);
    }
  };

  const closeUrlPopup = (newText) => {
    // Insert the new text at the cursor position
    const before = displayText.slice(0, cursorPosition.start);
    const after = displayText.slice(cursorPosition.end);
    const newContent = before + newText + after;
    
    setDisplayText(newContent);
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
      {/* Red X button for deleting the line */}
      <button
        onClick={onDelete}
        className="absolute left-1 top-1/2 transform -translate-y-1/2 z-10 w-5 h-5 flex items-center justify-center text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors duration-150"
        title="Delete this line"
      >
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
      
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
        value={displayText}
        onChange={(e) => setDisplayText(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        className={`w-full border border-gray-300 pl-8 pr-16 py-1 rounded text-sm resize-none ${inputClass}`}
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
      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center pointer-events-none">
        <div className="flex items-center gap-1 pointer-events-auto">
          <button
            onClick={handleSave}
            className="px-1.5 py-0.5 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 focus:outline-none focus:ring-1 focus:ring-green-400 transition-colors duration-150 shadow-sm"
          >
            Save
          </button>

          <button
            onClick={onCancel}
            className="px-1.5 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-400 transition-colors duration-150 shadow-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default InlineEditor;