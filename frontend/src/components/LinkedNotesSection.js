import React, { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid';

/**
 * Renders an expandable list of notes referenced with meta::link::<id> tags.
 *
 * Props
 * ──────────────────────────────────────────────────────
 * note          – the current note object
 * allNotes      – array of every note (used to resolve linked IDs)
 * onNavigate(id)– callback → scroll / open the target note
 * initiallyOpen – boolean (optional) default collapsed
 */
const LinkedNotesSection = ({ note, allNotes, onNavigate, initiallyOpen = false }) => {
  // Extract ids such as meta::link::123
  const linkIds = [...note.content.matchAll(/meta::link::(\d+)/g)].map(m => m[1]);
  if (linkIds.length === 0) return null; // nothing to show

  const [open, setOpen] = useState(initiallyOpen);
  const linkedNotes = allNotes.filter(n => linkIds.includes(String(n.id)));

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(!open)}
        className="text-sm text-purple-600 font-medium hover:underline flex items-center gap-1"
      >
        Linked Notes ({linkedNotes.length})
        {open ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
      </button>

      {open && (
        <div className="mt-2 pl-4 border-l border-gray-300 space-y-2">
          {linkedNotes.map(l => (
            <div
              key={l.id}
              className="p-3 bg-white border rounded shadow-sm hover:bg-gray-50"
            >
              <p className="text-sm text-gray-800 line-clamp-3">
                {l.content.split('\n')[0] || '—'}
              </p>
              <button
                className="mt-1 text-xs text-blue-600 hover:underline"
                onClick={() => onNavigate(l.id)}
              >
                View
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LinkedNotesSection;