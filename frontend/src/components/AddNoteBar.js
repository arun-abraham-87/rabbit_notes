import React, { useState } from 'react';

const AddNoteBar = ({ addNote }) => {
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');

  const handleAdd = () => {
    addNote(content, tags.split(',').map((tag) => tag.trim()));
    setContent('');
    setTags('');
  };

  return (
    <div className="add-note-bar">
      <input
        type="text"
        placeholder="Enter note content..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      <input
        type="text"
        placeholder="Enter tags (comma separated)..."
        value={tags}
        onChange={(e) => setTags(e.target.value)}
      />
      <button onClick={handleAdd}>Add Note</button>
    </div>
  );
};

export default AddNoteBar;
