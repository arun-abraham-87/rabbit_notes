import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';

export default function RawNoteModal({ isOpen, rawNote, setRawNote }) {
  if (!isOpen || !rawNote) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Raw Note Content</h2>
          <button
            onClick={() => setRawNote(null)}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded-lg">
          {rawNote.content}
        </pre>
      </div>
    </div>
  );
} 