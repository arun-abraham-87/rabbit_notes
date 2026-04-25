import React, { useState, useRef, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const TAG_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-green-100 text-green-700',
  'bg-purple-100 text-purple-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
  'bg-teal-100 text-teal-700',
  'bg-yellow-100 text-yellow-700',
  'bg-red-100 text-red-700',
];

export function tagColor(tag) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

export function parseLineTags(rawLine) {
  const m = rawLine?.match(/\{#tags:([^#]*?)#\}/);
  if (!m || !m[1].trim()) return [];
  return m[1].split(',').map(t => t.trim()).filter(Boolean);
}

export function setLineTags(rawLine, tags) {
  const stripped = rawLine?.replace(/\s*\{#tags:[^#]*?#\}/, '') ?? '';
  if (tags.length === 0) return stripped;
  return `${stripped}{#tags:${tags.join(',')}#}`;
}

export function getAllNoteTags(content) {
  if (!content) return [];
  const tags = new Set();
  content.split('\n').forEach(line => {
    parseLineTags(line).forEach(t => tags.add(t));
  });
  return [...tags].sort();
}

export default function InlineTagEditor({ rawLine, noteContent, onSave, onClose }) {
  const [currentTags, setCurrentTags] = useState(() => parseLineTags(rawLine));
  const [input, setInput] = useState('');
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const allNoteTags = getAllNoteTags(noteContent);

  // Tags from note not already on this line, filtered by current input
  const inputLower = input.trim().toLowerCase();
  const autocomplete = inputLower
    ? allNoteTags.filter(t => t.startsWith(inputLower) && !currentTags.includes(t))
    : [];
  const suggestedTags = allNoteTags.filter(t => !currentTags.includes(t));

  useEffect(() => {
    // Focus the input after a tick so the # button's mousedown doesn't blur it
    const t = setTimeout(() => inputRef.current?.focus(), 10);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    setCurrentTags(parseLineTags(rawLine));
    setInput('');
  }, [rawLine]);

  // Close when clicking outside — but NOT on the # toggle button (caller handles that)
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        onClose();
      }
    };
    // Use setTimeout so this listener doesn't fire for the same click that opened us
    const t = setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener('mousedown', handler);
    };
  }, [onClose]);

  const addInputTags = (raw) => {
    const words = raw.split(/[\s,]+/).map(w => w.trim().toLowerCase()).filter(Boolean);
    if (words.length === 0) return currentTags;
    const next = [...currentTags];
    words.forEach(w => { if (!next.includes(w)) next.push(w); });
    setCurrentTags(next);
    setInput('');
    return next;
  };

  const saveAndClose = (tags = currentTags) => {
    onSave(tags);
    onClose();
  };

  const commitPendingAndClose = () => {
    const next = input.trim() ? addInputTags(input) : currentTags;
    saveAndClose(next);
  };

  const removeTag = (tag) => {
    const next = currentTags.filter(t => t !== tag);
    setCurrentTags(next);
  };

  const handleKeyDown = (e) => {
    e.stopPropagation();
    if (e.key === 'Tab' && autocomplete.length > 0) {
      e.preventDefault();
      addInputTags(autocomplete[0]);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      commitPendingAndClose();
    } else if ((e.key === ',' || e.key === ' ') && input.trim()) {
      e.preventDefault();
      addInputTags(input);
    } else if (e.key === 'Backspace' && !input && currentTags.length > 0) {
      removeTag(currentTags[currentTags.length - 1]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      ref={containerRef}
      className="absolute left-0 top-full z-50 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 min-w-[240px] max-w-xs"
      data-no-inline-edit="true"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Current tags + input */}
      <div
        className="flex flex-wrap items-center gap-1 p-1 rounded border border-gray-200 mb-2 cursor-text min-h-[28px]"
        onClick={() => inputRef.current?.focus()}
      >
        {currentTags.map(tag => (
          <span key={tag} className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-medium ${tagColor(tag)}`}>
            {tag}
            <button
              onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
              className="ml-0.5 hover:opacity-70 flex-shrink-0"
            >
              <XMarkIcon className="h-3 w-3" />
            </button>
          </span>
        ))}
        <div className="relative flex-1 min-w-[80px]">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={currentTags.length === 0 ? 'Type tags…' : ''}
            className="w-full text-xs outline-none bg-transparent"
          />
          {/* Inline autocomplete ghost text */}
          {autocomplete.length > 0 && (
            <span className="absolute left-0 top-0 text-xs text-gray-300 pointer-events-none whitespace-nowrap">
              {input}<span>{autocomplete[0].slice(inputLower.length)}</span>
            </span>
          )}
        </div>
      </div>

      {/* Tab hint */}
      {autocomplete.length > 0 && (
        <div className="text-[10px] text-gray-400 mb-1 px-0.5">
          Tab → <span className={`px-1.5 py-0.5 rounded-full font-medium ${tagColor(autocomplete[0])}`}>{autocomplete[0]}</span>
        </div>
      )}

      {/* All note tags not on this line */}
      {suggestedTags.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-1">From this note</div>
          <div className="flex flex-wrap gap-1">
            {suggestedTags.map(tag => (
              <button
                key={tag}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addInputTags(tag)}
                className={`px-2 py-0.5 rounded-full text-xs font-medium ${tagColor(tag)} hover:opacity-80`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-gray-100 pt-2">
        <span className="text-[10px] text-gray-400">Enter saves tags</span>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
          onClick={(e) => { e.stopPropagation(); commitPendingAndClose(); }}
          className="rounded bg-gray-900 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-gray-700"
        >
          Save
        </button>
      </div>
    </div>
  );
}
