import React, { useState, useEffect, useMemo } from 'react';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/solid';

/**
 * LinkedNotesSection
 * Renders and allows reordering of notes linked via meta::link::ID tags.
 */
export default function LinkedNotesSection({
  note,
  allNotes,
  updateNote,
  onNavigate,
  initiallyOpen = false,
}) {
  const [open, setOpen] = useState(initiallyOpen);

  // Extract linked IDs in order
  const orderedIds = useMemo(() => {
    return note.content
      .split('\n')
      .filter(line => line.trim().toLowerCase().startsWith('meta::link'))
      .map(line => line.split('::').pop().trim());
  }, [note.content]);

  // No links → no section
  if (orderedIds.length === 0) return null;

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="text-sm text-purple-600 hover:underline flex items-center gap-1"
      >
        Linked Notes ({orderedIds.length})
        {open ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
      </button>
      {open && (
        <div className="mt-2 pl-4 border-l border-gray-300 space-y-2">
          {orderedIds.map(id => {
            const ln = allNotes.find(n => String(n.id) === id);
            return (
              <div
                key={id}
                className="p-3 bg-white border rounded shadow-sm hover:bg-gray-50"
              >
                <p className="text-sm text-gray-800 line-clamp-3">
                  {ln?.content.split('\n')[0] || '—'}
                </p>
                <button
                  className="mt-1 text-xs text-blue-600 hover:underline"
                  onClick={() => onNavigate(ln.id)}
                >
                  View
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}