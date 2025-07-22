import React from 'react';
import { PencilIcon } from '@heroicons/react/24/solid';

export default function NoteCardSuperEditButton({ isSuperEditMode, onSuperEdit }) {
  return (
    <div className="flex justify-end px-4 py-2">
      <button
        onClick={onSuperEdit}
        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-200 ${
          isSuperEditMode 
            ? 'text-white bg-purple-600 hover:bg-purple-700 border border-purple-600' 
            : 'text-purple-600 bg-purple-50 hover:bg-purple-100 border border-purple-200'
        }`}
        title="Focus on first line in this note"
      >
        <PencilIcon className="h-3 w-3" />
        Super Edit
      </button>
    </div>
  );
} 