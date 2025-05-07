import React from 'react';
import { XMarkIcon, CodeBracketIcon } from '@heroicons/react/24/outline';

const NoteView = ({ isOpen, content, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg max-w-lg w-full p-6 relative">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
          onClick={onClose}
        >
          <XMarkIcon className="h-6 w-6" />
        </button>
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <CodeBracketIcon className="h-5 w-5 text-indigo-600" /> Raw Note
        </h2>
        <pre className="bg-gray-100 rounded p-4 text-xs overflow-x-auto whitespace-pre-wrap max-h-96">
          {content}
        </pre>
      </div>
    </div>
  );
};

export default NoteView; 