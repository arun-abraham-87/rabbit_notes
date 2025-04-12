import React, { useState, useEffect } from 'react';

import Navbar from './components/Navbar';
import AddNoteBar from './components/NoteAddAndSearchBar.js';
import NotesListing from './components/NotesListing.js';
import TagListing from './components/TagListing.js';
import TodoList from './components/TodoList.js';
import NoteEditor from './components/NoteEditor';

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
  const [showTimezones, setShowTimezones] = useState(false);

  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => forceUpdate((n) => n + 1), 1000);
    return () => clearInterval(interval);
  }, []);

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

  const getTimeDiffFromAEST = (targetZone) => {
    const aestDate = new Date().toLocaleString('en-US', { timeZone: 'Australia/Sydney' });
    const targetDate = new Date().toLocaleString('en-US', { timeZone: targetZone });
    const diffMs = new Date(aestDate) - new Date(targetDate);
    const diffHrs = Math.round(diffMs / 3600000);
    const sign = diffHrs === 0 ? '' : diffHrs > 0 ? `${Math.abs(diffHrs)}h behind` : `${Math.abs(diffHrs)}h ahead`;
    return sign;
  };

  return (
    <div className="App">
      <Navbar activePage={activePage} setActivePage={setActivePage} />
      <div className="flex justify-center mt-4">
        <button
          onClick={() => setShowTimezones(!showTimezones)}
          className="px-3 py-1 text-sm border rounded bg-gray-50 hover:bg-gray-100 shadow"
        >
          {showTimezones ? 'Hide Timezones' : 'Show Timezones'}
        </button>
      </div>
      {showTimezones && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-4 py-4 text-sm font-mono">
          {[
            { label: 'AEST', timeZone: 'Australia/Sydney' },
            { label: 'IST', timeZone: 'Asia/Kolkata' },
            { label: 'EST', timeZone: 'America/New_York' },
            { label: 'PST', timeZone: 'America/Los_Angeles' },
          ].map(({ label, timeZone }) => {
            const zoneDate = new Date().toLocaleString('en-US', { timeZone });
            const hour = new Date(zoneDate).getHours();
            const isDay = hour >= 6 && hour < 18;
            const icon = isDay ? '☀️' : '🌙';
            const animation = isDay ? 'animate-bounce' : 'animate-pulse';
            const date = new Date().toLocaleString('en-US', {
              timeZone,
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            });
            const timeParts = date.split(' ');
            const ampm = timeParts[1];
            const color = ampm === 'AM' ? 'text-green-500' : 'text-orange-500';

            return (
              <div key={label} className="bg-white shadow-md rounded-lg p-4 border border-gray-200">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{label}</span>
                  <span className={`${animation}`}>{icon}</span>
                </div>
                <div className={`text-xl font-semibold ${color}`}>
                  {timeParts[0]} {ampm}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date().toLocaleDateString('en-US', {
                    timeZone,
                    month: 'short',
                    day: 'numeric',
                  })}
                  {label !== 'AEST' && (
                    <span className="block mt-1 text-[10px] text-gray-400">
                      {getTimeDiffFromAEST(timeZone)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
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

        {activePage === 'editor' && (
          <NoteEditor
            note={{ content: '' }}
            onSave={(updatedNote) => console.log('Saved note:', updatedNote)}
            onCancel={() => setActivePage('notes')}
          />
        )}
      </div>
    </div>

  );
};

export default App;
