import React, { useState, useEffect } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Navbar from './components/Navbar';
import AddNoteBar from './components/NoteAddAndSearchBar.js';
import NotesMainContainer from './components/NotesMainContainer.js';
import TagListing from './components/TagListing.js';
import TodoList from './components/TodoList.js';
import NoteEditor from './components/NoteEditor';
import LeftPanel from './components/LeftPanel';
import { ChevronDoubleLeftIcon, ChevronDoubleRightIcon, XMarkIcon } from '@heroicons/react/24/solid';

import { addNewNote, addNewTag, loadNotes, loadAllNotes, loadTags, loadTodos, updateNoteById as updateNote, getSettings } from './utils/ApiUtils';

const defaultSettings = {
  theme: 'light',
  sortBy: 'date',
  autoCollapse: false,
  showDates: true,
  showCreatedDate: false,
  searchQuery: '',
  totals: {
    total: 0,
    todos: 0,
    meetings: 0,
    events: 0
  }
};

// Helper to render first four pinned notes
const PinnedSection = ({ notes, onUnpin }) => {
  const pinned = (notes || []).filter(n => n.content.includes('meta::pin')).slice(0, 4);
  if (pinned.length === 0) return null;
  return (
    <div className="mb-6 p-4 bg-white rounded shadow-sm">
      <div className="grid grid-cols-4 gap-4">
        {pinned.map(note => {
          // Extract non-meta content lines
          const contentLines = note.content.split('\n').filter(line => !line.trim().startsWith('meta::'));
          // Find the pin tag and parse indices
          const pinTagLine = note.content.split('\n').find(line => line.startsWith('meta::pin::'));
          const indices = pinTagLine
            ? pinTagLine.split('::')[2].split(',').map(n => parseInt(n, 10))
            : [];
          // Gather the pinned lines (1-based indices)
          const pinnedLines = indices.map(i => contentLines[i - 1] || '');
          return (
            <div key={note.id} className="relative border rounded-lg p-4 shadow">
              <XMarkIcon
                className="absolute top-2 right-2 h-4 w-4 text-gray-400 hover:text-gray-600 cursor-pointer"
                onClick={() => {
                  if (window.confirm('Unpin this note?')) {
                    const newContent = note.content
                      .split('\n')
                      .filter(l => !l.trim().startsWith('meta::pin::'))
                      .join('\n')
                      .trim();
                    updateNote(note.id, newContent).then(() => {
                      if (onUnpin) onUnpin();
                    });
                  }
                }}
                title="Unpin note"
              />
              {pinnedLines.map((text, i) => (
                <div
                  key={i}
                  className={i === 0 ? 'font-medium truncate' : 'text-sm text-gray-500 truncate'}
                >
                  {text}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const App = () => {
  const [allNotes, setAllNotes] = useState([]);
  const [notes, setNotes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [settings, setSettings] = useState(defaultSettings);

  const [objects, setObjects] = useState([]);
  const [objectList, setObjectList] = useState([]);
  const [activePage, setActivePage] = useState('notes');
  const [todos, setTodos] = useState([]);
  const [noteDate, setNoteDate] = useState(null);
  const [totals, setTotals] = useState(0);

  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);

  const updateBothNotesLists = async (updatedNotes) => {
    try {
      // First update the notes list
      setNotes(updatedNotes);
      
      // Then fetch fresh data to update both lists
      const [notesData, allNotesData] = await Promise.all([
        loadNotes(searchQuery, noteDate),
        loadAllNotes('', null)
      ]);
      
      setNotes(notesData.notes);
      setAllNotes(allNotesData.notes);
      setTotals(notesData.totals);
    } catch (error) {
      console.error('Error updating notes:', error);
    }
  };

  const fetchNotes = async (searchText) => {
    const data = await loadNotes(searchText, noteDate)
    setNotes(data.notes);
    setTotals(data.totals);
  };

  const fetchAllNotes = async () => {
    const data = await loadAllNotes('', null)
    setAllNotes(data.notes);
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
    try {
      await addNewNote(content, tags, noteDate);
      setSearchQuery('');
      // Use empty search query to fetch all notes after adding
      await Promise.all([
        fetchNotes(''),
        fetchAllNotes()
      ]);
    } catch (error) {
      console.error('Error adding note:', error);
    }
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
    const debounceFetch = setTimeout(() => {
      // Only fetch filtered notes when search changes
      fetchNotes(searchQuery);
    }, 300);
    return () => clearTimeout(debounceFetch);
  }, [searchQuery, noteDate]);

  // Separate effect for allNotes to keep it unfiltered
  useEffect(() => {
    const fetchUnfilteredNotes = async () => {
      const data = await loadAllNotes('', null);
      setAllNotes(data.notes);
    };
    fetchUnfilteredNotes();
  }, [noteDate]); // Only re-fetch when date changes, not on search

  // Load settings on app mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await getSettings();
        const mergedSettings = { ...defaultSettings, ...savedSettings };
        setSettings(mergedSettings);
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    loadSettings();
  }, []);

  return (
    <div className="App flex flex-col h-screen">
      <Navbar activePage={activePage} setActivePage={setActivePage} />
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div
          className={`border-r flex-shrink-0 transition-all duration-300 ease-in-out ${
            isLeftPanelCollapsed ? 'w-0' : 'w-[300px]'
          } relative`}
        >
          <button
            onClick={() => setIsLeftPanelCollapsed(prev => !prev)}
            className="absolute top-2 right-[-12px] w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-sm text-white shadow hover:bg-gray-500 z-50"
            title={isLeftPanelCollapsed ? "Expand Panel" : "Collapse Panel"}
          >
            {isLeftPanelCollapsed ? (
              <ChevronDoubleRightIcon className="h-4 w-4" />
            ) : (
              <ChevronDoubleLeftIcon className="h-4 w-4" />
            )}
          </button>
          <div className="h-full overflow-hidden">
            <LeftPanel
              notes={allNotes}
              setNotes={setAllNotes}
              searchQuery={searchQuery}
              settings={settings}
              setSettings={setSettings}
            />
          </div>
        </div>

        {isLeftPanelCollapsed && (
          <button
            onClick={() => setIsLeftPanelCollapsed(false)}
            className="absolute top-2 left-2 w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-sm text-white shadow hover:bg-gray-500 z-50"
            title="Expand Panel"
          >
            <ChevronDoubleRightIcon className="h-4 w-4" />
          </button>
        )}

        {/* Right panel: main content */}
        <div
          className={`flex-1 p-8 overflow-auto`}
        >
          <PinnedSection notes={allNotes} onUnpin={fetchAllNotes} />
          {activePage === 'notes' && (
            <NotesMainContainer
              objList={objectList}
              notes={notes}
              allNotes={allNotes}
              addNote={addNote}
              setNotes={updateBothNotesLists}
              objects={objects}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              addTag={addTag}
              setNoteDate={setNoteDate}
              totals={totals}
              setTotals={setTotals}
              settings={settings}
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
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  );
};

export default App;
