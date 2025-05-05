import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Navbar from './components/Navbar';
import AddNoteBar from './components/NoteAddAndSearchBar.js';
import NotesMainContainer from './components/NotesMainContainer.js';
import TagListing from './components/TagListing.js';
import TodoList from './components/TodoList.js';
import NoteEditor from './components/NoteEditor';
import LeftPanel from './components/LeftPanel';
import Journals from './pages/Journals';
import Manage from './pages/Manage';
import EventsPage from './pages/EventsPage';
import PeopleList from './components/PeopleList';
import { ChevronDoubleLeftIcon, ChevronDoubleRightIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { parseNoteContent } from './utils/TextUtils';
import { formatAndAgeDate } from './utils/DateUtils';

import { addNewNoteCommon, addNewTag, loadNotes, loadAllNotes, loadTags, loadTodos, updateNoteById as updateNote, getSettings, defaultSettings } from './utils/ApiUtils';
import { SearchModalProvider } from './contexts/SearchModalContext';
import { NoteEditorProvider, useNoteEditor } from './contexts/NoteEditorContext';
import { NotesProvider, useNotes } from './contexts/NotesContext';
import NoteEditorModal from './components/NoteEditorModal';
import WatchList from './components/WatchList';
import News from './components/News';
import ExpenseTracker from './components/ExpenseTracker';
import TrackerListing from './components/TrackerListing';
import Dashboard from './components/Dashboard';


// Helper to render first four pinned notes
const PinnedSection = ({ notes, onUnpin }) => {
  const [cardColors, setCardColors] = useState(() => {
    // Load saved colors from localStorage
    const savedColors = localStorage.getItem('pinnedCardColors');
    return savedColors ? JSON.parse(savedColors) : {};
  });

  const pinned = (notes || []).filter(n => n.content.includes('meta::pin')).slice(0, 4);
  
  // Save colors to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('pinnedCardColors', JSON.stringify(cardColors));
  }, [cardColors]);

  const handleColorChange = (noteId, color) => {
    setCardColors(prev => ({
      ...prev,
      [noteId]: color
    }));
  };

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
            <div 
              key={note.id} 
              className="relative border rounded-lg p-4 shadow"
              style={{ backgroundColor: cardColors[note.id] || 'white' }}
              onContextMenu={(e) => {
                e.preventDefault();
                // Hide all other popups first
                document.querySelectorAll('.color-popup').forEach(popup => {
                  popup.classList.add('hidden');
                });
                // Show this popup
                const popup = e.currentTarget.querySelector('.color-popup');
                popup.classList.remove('hidden');
                // Position the popup at the cursor relative to the viewport
                popup.style.position = 'fixed';
                popup.style.left = `${e.clientX}px`;
                popup.style.top = `${e.clientY}px`;
              }}
            >
              <div className="absolute top-2 right-2 z-20">
                <XMarkIcon
                  className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-pointer"
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
              </div>
              <div 
                className="fixed hidden bg-white rounded-lg shadow-lg p-2 z-50 color-popup"
                onMouseLeave={() => {
                  const popup = document.querySelector('.color-popup');
                  if (popup) {
                    popup.classList.add('hidden');
                  }
                }}
              >
                <div className="flex flex-col space-y-1">
                  {[
                    { color: '#ffffff', label: 'White' },
                    { color: '#fecaca', label: 'Light Red' },
                    { color: '#fed7aa', label: 'Light Orange' },
                    { color: '#bbf7d0', label: 'Light Green' }
                  ].map(({ color, label }) => (
                    <button
                      key={color}
                      className="flex items-center space-x-2 px-2 py-1 text-sm hover:bg-gray-100 rounded"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleColorChange(note.id, color);
                        const popup = e.currentTarget.parentElement.parentElement;
                        if (popup) {
                          popup.classList.add('hidden');
                        }
                      }}
                    >
                      <div 
                        className="w-3 h-3 rounded-full border border-gray-300"
                        style={{ backgroundColor: color }}
                      />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="text-sm text-gray-800 whitespace-pre-wrap">
                {pinnedLines.map((line, lineIndex) => {
                  // Check for headings first
                  const h1Match = line.match(/^###(.+)###$/);
                  const h2Match = line.match(/^##(.+)##$/);

                  if (h1Match) {
                    return (
                      <h1 key={`line-${lineIndex}`} className="text-xl font-bold mb-2 text-gray-900">
                        {parseNoteContent({ content: h1Match[1].trim(), searchTerm: '' }).map((element, idx) => (
                          <React.Fragment key={idx}>{element}</React.Fragment>
                        ))}
                      </h1>
                    );
                  }

                  if (h2Match) {
                    return (
                      <h2 key={`line-${lineIndex}`} className="text-lg font-semibold mb-2 text-gray-800">
                        {parseNoteContent({ content: h2Match[1].trim(), searchTerm: '' }).map((element, idx) => (
                          <React.Fragment key={idx}>{element}</React.Fragment>
                        ))}
                      </h2>
                    );
                  }

                  // Process regular lines with URL parsing
                  return (
                    <div 
                      key={`line-${lineIndex}`} 
                      className={`mb-1 ${lineIndex === 0 ? 'font-medium' : 'text-gray-500'}`}
                    >
                      {parseNoteContent({ content: formatAndAgeDate(line), searchTerm: '' }).map((element, idx) => (
                        <React.Fragment key={idx}>{element}</React.Fragment>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AppContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [allNotes, setAllNotes] = useState([]);
  const [notes, setNotes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [settings, setSettings] = useState(defaultSettings);
  const [objects, setObjects] = useState([]);
  const [objectList, setObjectList] = useState([]);
  const [todos, setTodos] = useState([]);
  const [noteDate, setNoteDate] = useState(null);
  const [totals, setTotals] = useState(0);

  // Get active page from URL hash
  const activePage = location.pathname.split('/')[1] || 'notes';

  // Save active page to localStorage
  useEffect(() => {
    localStorage.setItem('activePage', activePage);
  }, [activePage]);

  // Load active page from localStorage on mount
  useEffect(() => {
    const savedPage = localStorage.getItem('activePage');
    if (savedPage) {
      navigate(savedPage);
    }
  }, [navigate]);

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
      await addNewNoteCommon(content, tags, noteDate);
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
    try {
      await addNewTag(objText);
      // Fetch updated tags after adding new one
      await fetchTags();
    } catch (error) {
      console.error('Error adding tag:', error);
    }
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
    <SearchModalProvider notes={allNotes}>
      <NotesProvider>
        <NoteEditorProvider>
          <div className="App flex flex-col h-screen">
            <Navbar activePage={activePage} setActivePage={(page) => navigate(`/${page}`)} settings={settings} />
            <div className="flex flex-1 overflow-hidden">
              {/* Left panel */}
              <div className="relative">
                <LeftPanel
                  notes={allNotes}
                  setNotes={setAllNotes}
                  searchQuery={searchQuery}
                  settings={settings}
                  setSettings={setSettings}
                />
              </div>

              {/* Right panel: main content */}
              <div className="flex-1 overflow-hidden">
                <Routes>
                  <Route path="/" element={
                    <>
                      <PinnedSection notes={allNotes} onUnpin={fetchAllNotes} />
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
                    </>
                  } />
                  <Route path="/notes" element={
                    <>
                      <PinnedSection notes={allNotes} onUnpin={fetchAllNotes} />
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
                    </>
                  } />
                  <Route path="/watch" element={
                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm h-full">
                      <WatchList 
                        allNotes={allNotes} 
                        updateNote={updateNote} 
                        refreshNotes={fetchAllNotes} 
                      />
                    </div>
                  } />
                  <Route path="/tags" element={<TagListing objectList={objects} />} />
                  <Route path="/todos" element={
                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm h-full">
                      <TodoList
                        todos={todos}
                        notes={notes}
                        updateTodosCallback={setTodos}
                        updateNoteCallBack={setNotes}
                      />
                    </div>
                  } />
                  <Route path="/journals" element={<Journals />} />
                  <Route path="/manage-notes" element={<Manage />} />
                  <Route path="/events" element={
                    <EventsPage 
                      notes={allNotes} 
                      onUpdate={(updatedNotes) => {
                        setAllNotes(updatedNotes);
                        if (activePage === 'notes') {
                          setNotes(updatedNotes);
                        }
                      }}
                    />
                  } />
                  <Route path="/people" element={
                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm h-full">
                      <PeopleList 
                        notes={allNotes}
                        searchQuery={searchQuery}
                        allNotes={allNotes}
                      />
                    </div>
                  } />
                  <Route path="/news" element={
                    <div className="min-h-screen bg-gray-50">
                      <News />
                    </div>
                  } />
                  <Route path="/dashboard" element={
                    <div className="min-h-screen bg-gray-50">
                      <Dashboard />
                    </div>
                  } />
                  <Route path="/expense" element={
                    <div className="min-h-screen bg-gray-50">
                      <ExpenseTracker />
                    </div>
                  } />
                  <Route path="/trackers" element={
                    <div className="min-h-screen bg-gray-50">
                      <TrackerListing />
                    </div>
                  } />
                </Routes>
              </div>
            </div>
            <ToastContainer
              position="bottom-right"
              autoClose={1500}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="light"
              closeButton={false}
            />
            <NoteEditorModal />
          </div>
        </NoteEditorProvider>
      </NotesProvider>
    </SearchModalProvider>
  );
};

const App = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;
