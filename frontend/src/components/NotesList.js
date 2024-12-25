import React from 'react';

const NotesList = ({ notes }) => (
  <div className="notes-list">
    {notes.map((note) => (
      <div key={note.id} className="note">
        <p>{note.content}</p>
        <div className="tags">{note.tags.join(', ')}</div>
        <small>{new Date(note.created_datetime).toLocaleString()}</small>
      </div>
    ))}
  </div>
);

export default NotesList;