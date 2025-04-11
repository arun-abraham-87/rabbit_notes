import React, { useState, useEffect } from 'react';

import Navbar from './components/Navbar';
import AddNoteBar from './components/NoteAddAndSearchBar.js';
import NotesListing from './components/NotesListing.js';
import TagListing from './components/TagListing.js';
import TodoList from './components/TodoList.js';

import { addNewNote, addNewTag, loadNotes, loadTags, loadTodos } from './utils/ApiUtils';

const App = () => {
  const [notes, setNotes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [objects, setObjects] = useState([]);
  const [objectList, setObjectList] = useState([]);
  const [activePage, setActivePage] = useState('notes');
  const [todos, setTodos] = useState([]);
  const [noteDate, setNoteDate] = useState(null);
  const [totals, setTotals] = useState(0);


  const fetchNotes = async (searchText) => {
    const data = await loadNotes(searchText, noteDate)
    setNotes(data.notes);
    setTotals(data.totals);
  };

  const fetchTodos = async () => {
    const todosList = await loadTodos()
    setTodos(todosList);
  };

  const fetchTags = async () => {
    const tags = await loadTags()
    setObjects(tags || []);
    setObjectList(tags);
  };

  const addNote = async (content, tags) => {
    addNewNote(content, tags, noteDate)
    setSearchQuery('')
    fetchNotes(searchQuery)
  };

  const addTag = async (objText) => {
    addNewTag(objText)
    setObjects((prevObjects) => [...prevObjects, objText]);
  };

  useEffect(() => {
    fetchTags()
  }, []);

  useEffect(() => {
    fetchTodos();
  }, [activePage]);

  useEffect(() => {
    const debounceFetch = setTimeout(() => fetchNotes(searchQuery), 300);
    return () => clearTimeout(debounceFetch);
  }, [searchQuery, noteDate]);

  return (
    <div className="App">
      <Navbar activePage={activePage} setActivePage={setActivePage} />
      <div className='p-8'>
        {activePage === 'notes' && (
          <NotesListing notes={notes} addNote={addNote} setNotes={setNotes} objects={objects} searchQuery={searchQuery} setSearchQuery={setSearchQuery} addTag={addTag} setNoteDate={setNoteDate} totals={totals} setTotals={setTotals} />
        )}

        {activePage === 'tags' && (
          <TagListing objectList={objects}/>
        )}

        {activePage === 'todos' && (
          <div className="rounded-lg border bg-card text-card-foreground shadow-sm max-w-[80%] mx-auto p-6">
            <TodoList todos={todos} notes={notes} updateTodosCallback={setTodos} updateNoteCallBack={setNotes} />
          </div>
        )}
      </div>
    </div>

  );
};

export default App;
