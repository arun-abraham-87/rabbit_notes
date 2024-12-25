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
    <div className="mb-6">
      <div className='flex mb-6'>
        <input
          type="text"
          placeholder="Enter note content..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
        />
        <button className='inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2' onClick={handleAdd}>Add Note</button>
      </div>
      <input
        type="text"
        placeholder="Enter tags (comma separated)..."
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        className='flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
      />

    </div>
  );
};

export default AddNoteBar;
