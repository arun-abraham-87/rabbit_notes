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

  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);

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
        <div
          className={`border-r overflow-y-auto transition-all duration-300 ease-in-out ${
            isLeftPanelCollapsed ? 'w-0 min-w-0' : 'w-[20%] min-w-[12rem]'
          } relative`}
        >
          <button
            onClick={() => setIsLeftPanelCollapsed(prev => !prev)}
            className="absolute top-2 right-[-12px] w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-sm text-white shadow hover:bg-gray-500"
          >
            {isLeftPanelCollapsed ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5 align-middle" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5 align-middle" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            )}
          </button>
          <LeftPanel notes={allNotes} setNotes={setAllNotes} />
        </div>
        {isLeftPanelCollapsed && (
          <button
            onClick={() => setIsLeftPanelCollapsed(false)}
            className="absolute top-2 left-2 w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-sm text-white shadow hover:bg-gray-500 z-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-2.5 h-2.5 align-middle" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Right panel: main content */}
        <div
          className={`transition-all duration-300 ease-in-out ${
            isLeftPanelCollapsed ? 'w-full' : 'w-[80%]'
          } p-8 overflow-auto`}
        >
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
