import React, { useState, useEffect } from 'react';

import Navbar from './components/Navbar';
import AddNoteBar from './components/NoteAddAndSearchBar.js';
import InfoPanel from './components/InfoPanel.js';
import NotesList from './components/NotesList.js';
import NotesListByDate from './components/NotesListByDate.js';

const App = () => {
  const [notes, setNotes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [totals, setTotals] = useState(0);
  const [checked, setChecked] = useState(false);


  useEffect(() => {
    const fetchNotes = async () => {
      const encodedQuery = encodeURIComponent(searchQuery);
      const response = await fetch(`http://localhost:5001/api/notes?search=${encodedQuery}`);
      const data = await response.json();
      setNotes(data.notes);
      setTotals(data.totals);
    };
    console.log(searchQuery)

    const debounceFetch = setTimeout(() => fetchNotes(), 300);
    return () => clearTimeout(debounceFetch);
  }, [searchQuery]);

  const addNote = async (content, tags) => {
    const response = await fetch('http://localhost:5001/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, tags }),
    });
    const newNote = await response.json();
    setNotes((prevNotes) => [...prevNotes, newNote]);
    setTotals((prev) => prev + 1);
  };



  return (
    <div className="App">
      <Navbar />
      <div className='p-8'>
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm max-w-[80%] mx-auto p-6">
          <AddNoteBar addNote={addNote} searchQuery={setSearchQuery} />
          <InfoPanel totals={totals} grpbyViewChkd={checked} enableGroupByView={setChecked} />
          {checked ? (
            <NotesListByDate notes={notes} />
          ) : (
            <NotesList notes={notes} updateNoteCallback={setNotes} updateTotals={setTotals} />
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
