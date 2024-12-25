import React from 'react';

const NotesList = ({ notes }) => (
  <div className="">
    {notes.map((note) => (
      <div key={note.id} className="mb-6 rounded-lg border bg-card text-card-foreground shadow-sm relative group transition-shadow duration-200">
        <div className='p-4'>
          <div className='prose prose-sm dark:prose-invert'><p>{note.content}</p></div>
          <div className="tags">{note.tags.join(', ')}</div>
          <div className='text-sm text-muted-foreground mt-2'>{new Date(note.created_datetime).toLocaleString()}</div>
        </div>
      </div>
    ))}
  </div>
);

export default NotesList;