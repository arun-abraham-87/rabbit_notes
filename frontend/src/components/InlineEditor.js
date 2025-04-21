// src/components/InlineEditor.js
import React from 'react';

/**
 * Reusable inline‑edit UI: an input box with Save / Cancel.
 *
 * Props
 * -----
 * text            – current text (string)
 * setText         – setter for the text in the parent state
 * onSave          – fn(newText)  called on Save or “Enter”
 * onCancel        – fn()         called on Cancel click
 * inputClass      – extra Tailwind classes for the <input> (optional)
 */
const InlineEditor = ({ text, setText, onSave, onCancel, inputClass = '' }) => (
  <>
    <input
      type="text"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onSave(text);
      }}
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
  </>
);

export default InlineEditor;