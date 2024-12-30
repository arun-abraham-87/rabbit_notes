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
  const [objects, setObjects] = useState([]);


  const fetchNotes = async (searchText) => {
    const encodedQuery = encodeURIComponent(searchText);
    let url = `http://localhost:5001/api/notes?search=${encodedQuery}`;
    url += `&currentDate=${encodedQuery.trim().length === 0}`;
    const response = await fetch(url);
    const data = await response.json();
    setNotes(data.notes);
    setTotals(data.totals);
  };

  useEffect(() => {
    const obj_list = ["karthikey", "kitchen", "RQ Project", "Nitish"];
    setObjects(obj_list)
  }, []);

  useEffect(() => {
    console.log(searchQuery)
    console.log("Search Query Based Fetch")
    const debounceFetch = setTimeout(() => fetchNotes(searchQuery), 300);
    return () => clearTimeout(debounceFetch);
  }, [searchQuery]);

  const addNote = async (content, tags) => {
    const response = await fetch('http://localhost:5001/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, tags }),
    });
    setSearchQuery('')
    fetchNotes(searchQuery)
  };

  const addObject = (objText)=>{
    setObjects([...objects,objText])
    console.log(`New Objects = ${objects}`)
  }

  return (
    <div className="App">
      <Navbar />
      <div className='p-8'>
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm max-w-[80%] mx-auto p-6">
          <AddNoteBar addNote={addNote} searchQuery={setSearchQuery} objList={objects}/>
          <InfoPanel totals={totals} grpbyViewChkd={checked} enableGroupByView={setChecked} />
          {checked ? (
            <NotesListByDate notes={notes} />
          ) : (
            <NotesList notes={notes} updateNoteCallback={setNotes} updateTotals={setTotals} objects={objects} addObjects={addObject} />)
          }
        </div>
      </div>
    </div>
  );
};

export default App;
