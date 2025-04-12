import React, { useState } from 'react';

const NoteEditor = ({ note, onSave, onCancel }) => {
  const [content, setContent] = useState(note.content || '');

  const handleSave = () => {
    onSave({ ...note, content });
  };

  return (
    <div className="p-4 bg-white border border-gray-300 rounded shadow-md">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full h-48 p-2 border border-gray-300 rounded mb-4"
      />
      <div className="flex justify-end space-x-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Save
        </button>
      </div>
    </div>
  );
};

export default NoteEditor;
