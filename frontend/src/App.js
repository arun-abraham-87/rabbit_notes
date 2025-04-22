import React, { useState, useEffect } from 'react';

import Navbar from './components/Navbar';
import AddNoteBar from './components/NoteAddAndSearchBar.js';
import NotesListing from './components/NotesListing.js';
import TagListing from './components/TagListing.js';
import TodoList from './components/TodoList.js';
import NoteEditor from './components/NoteEditor';
import LeftPanel from './components/LeftPanel';

import { addNewNote, addNewTag, loadNotes, loadAllNotes,loadTags, loadTodos } from './utils/ApiUtils';

const App = () => {
  const [allNotes, setAllNotes] = useState([]);
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

  const fetchAllNotes = async () => {
    const data = await loadAllNotes('', null)
    setAllNotes(data.notes);
    console.log('allNotes')
    console.log(allNotes)

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
    fetchAllNotes()
  };

  const addTag = async (objText) => {
    addNewTag(objText)
    setObjects((prevObjects) => [...prevObjects, objText]);
  };

  useEffect(() => {
    fetchTags()
    fetchAllNotes()
  }, []);

  useEffect(() => {
    fetchTodos();
  }, [activePage]);

  useEffect(() => {
    const debounceFetch = setTimeout(() => fetchNotes(searchQuery), 300);
    return () => clearTimeout(debounceFetch);
  }, [searchQuery, noteDate]);

  return (
    <div className="App flex flex-col h-screen">
      <Navbar activePage={activePage} setActivePage={setActivePage} />
      <div className="flex flex-1 overflow-auto">
        {/* Left panel */}
        <div className="w-[15%] min-w-[12rem] border-r overflow-y-auto">
          <LeftPanel notes={allNotes} setNotes={setAllNotes} />
        </div>

        {/* Right panel: main content */}
        <div className="w-[85%] p-8 overflow-auto">
          {activePage === 'notes' && (
            <NotesListing
              objList={objectList}
              notes={notes}
              addNote={addNote}
              setNotes={setNotes}
              objects={objects}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              addTag={addTag}
              setNoteDate={setNoteDate}
              totals={totals}
              setTotals={setTotals}
            />
          )}
          {activePage === 'tags' && <TagListing objectList={objects} />}
          {activePage === 'todos' && (
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm max-w-[80%] mx-auto p-6">
              <TodoList
                todos={todos}
                notes={notes}
                updateTodosCallback={setTodos}
                updateNoteCallBack={setNotes}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
