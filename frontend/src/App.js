import React, { useState, useEffect } from 'react';

import Navbar from './components/Navbar';
import AddNoteBar from './components/NoteAddAndSearchBar.js';
import InfoPanel from './components/InfoPanel.js';
import NotesList from './components/NotesList.js';
import TodoList from './components/TodoList.js';
import NotesListByDate from './components/NotesListByDate.js';
import DateSelectorBar from './components/DateSelectorBar.js';
import TextEditor from './components/TextEditor.js'

const App = () => {
  const [notes, setNotes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [totals, setTotals] = useState(0);
  const [checked, setChecked] = useState(false);
  const [objects, setObjects] = useState([]);
  const [objectList, setObjectList] = useState([]);
  const [noteDate, setNoteDate] = useState(null);
  const [activePage, setActivePage] = useState('notes');
  const [todos, setTodos] = useState([]);

  const fetchNotes = async (searchText) => {
    const encodedQuery = encodeURIComponent(searchText);
    let url = `http://localhost:5001/api/notes?search=${encodedQuery}`;
    url += `&currentDate=${searchText.trim().length === 0}`;
    url += `&noteDate=${noteDate}`;
    const response = await fetch(url);
    const data = await response.json();
    setNotes(data.notes);
    setTotals(data.totals);
  };

  const fetchTodos = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/todos');
      const data = await response.json();
      setTodos(data.todos || []);
    } catch (error) {
      console.error("Error fetching todos:", error.message);
    }
  };

  useEffect(() => {
    const fetchObjects = async () => {
      console.log(`Calling Object Fetch`)
      try {
        const response = await fetch("http://localhost:5001/api/objects");
        const data = await response.json();  
        const objectTexts = data.map((obj) => obj.text);
        setObjects(objectTexts || []);
        setObjectList(data);
        console.log(`objects loaded: ${objects}`)
      } catch (error) {
        console.error("Error fetching objects:", error.message);
      }
    };

    fetchObjects();
  }, []);

  useEffect(() => {
    fetchTodos();
  }, [activePage]);

  useEffect(() => {
    console.log(searchQuery)
    console.log("Search Query Based Fetch")
    const debounceFetch = setTimeout(() => fetchNotes(searchQuery), 300);
    return () => clearTimeout(debounceFetch);
  }, [searchQuery,noteDate]);

  const addNote = async (content, tags) => {
    const response = await fetch('http://localhost:5001/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, tags ,noteDate }),
    });
    setSearchQuery('')
    fetchNotes(searchQuery)
  };

  const addObject = async (objText) => {
    try {
      const response = await fetch('http://localhost:5001/api/objects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: objText }),
      }); 

      // Use the response to update the objects state
      setObjects((prevObjects) => [...prevObjects, objText]);

      // Log the new objects array (state update happens asynchronously)
      console.log(`New Object Added: ${JSON.stringify(response.data.object)}`);
    } catch (error) {
      console.error("Error adding the object:", error.message);
    }
  };

  return (
    <div className="App">
    <Navbar activePage={activePage} setActivePage={setActivePage} />
    <div className='p-8'>
      {activePage === 'notes' && (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm max-w-[80%] mx-auto p-6">
          <DateSelectorBar setNoteDate={setNoteDate} />
          <TextEditor addNotes={addNote} objList={objects} searchQuery={setSearchQuery} />
          <InfoPanel totals={totals} grpbyViewChkd={checked} enableGroupByView={setChecked} />
          {checked ? (
            <NotesListByDate notes={notes} searchQuery={searchQuery} />
          ) : (
            <NotesList notes={notes} updateNoteCallback={setNotes} updateTotals={setTotals} objects={objects} addObjects={addObject} />
          )}
        </div>
      )}
  
      {activePage === 'tags' && (
        <div className="max-w-[80%] mx-auto rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <h2 className="text-xl font-bold mb-4">Tags Page</h2>
          <ul className="list-disc pl-6">
            {todos.map((todo, index) => (
              <li key={index}>{todo}</li>
            ))}
          </ul>
        </div>
      )}

      {activePage === 'todos' && (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm max-w-[80%] mx-auto p-6">
         <TodoList todos={todos}/> 
        </div>
      )}
    </div>
  </div>
  
  );
};

export default App;
