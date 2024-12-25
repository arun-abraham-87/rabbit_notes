import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AddNoteBar from './components/AddNoteBar.js';
import SearchBar from './components/SearchBar.js';
import InfoPanel from './components/InfoPanel.js';
import NotesList from './components/NotesList.js';

const App = () => {
  const [notes, setNotes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [totals, setTotals] = useState(0);

  useEffect(() => {
    const fetchNotes = async () => {
      const response = await fetch(`http://localhost:5001/api/notes?search=${searchQuery}`);
      const data = await response.json();
      setNotes(data.notes);
      setTotals(data.totals);
    };

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
      <div className="main">
        <AddNoteBar addNote={addNote} />
        <SearchBar setSearchQuery={setSearchQuery} />
        <InfoPanel totals={totals} />
        <NotesList notes={notes} />
      </div>
    </div>
  );
};

export default App;
