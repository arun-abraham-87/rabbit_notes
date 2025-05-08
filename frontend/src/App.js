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
import { getAge } from './utils/DateUtils';
import { createNote, addNewNoteCommon, addNewTag, loadNotes, loadAllNotes, loadTags, loadTodos, updateNoteById as updateNote, getSettings, defaultSettings } from './utils/ApiUtils';
import { SearchModalProvider } from './contexts/SearchModalContext';
import { NoteEditorProvider, useNoteEditor } from './contexts/NoteEditorContext';
import { NotesProvider, useNotes } from './contexts/NotesContext';
import NoteEditorModal from './components/NoteEditorModal';
import WatchList from './components/WatchList';
import News from './components/News';
import ExpenseTracker from './components/ExpenseTracker';
import TrackerListing from './components/TrackerListing';
import Dashboard from './components/Dashboard';
import TextPastePopup from './components/TextPastePopup';
import { Alerts } from './components/Alerts';

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
                      {parseNoteContent({ content: line, searchTerm: '' }).map((element, idx) => (
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
  const [showPastePopup, setShowPastePopup] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [newNoteText, setNewNoteText] = useState('');
  const [selectedPriority, setSelectedPriority] = useState(null);
  const [isWatchSelected, setIsWatchSelected] = useState(false);

  // Get active page from URL hash
  const activePage = location.pathname.split('/')[1] || 'notes';

  // Handle global Cmd+V (or Ctrl+V) event
  useEffect(() => {
    const handleKeyDown = async (e) => {
      // Check if Cmd+V (Mac) or Ctrl+V (Windows/Linux) is pressed
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        // Check if quick paste is enabled
        const isQuickPasteEnabled = localStorage.getItem('quickPasteEnabled') !== 'false';
        if (!isQuickPasteEnabled) return;

        // Check if we're not in an input or textarea
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        e.preventDefault();
        try {
          const text = await navigator.clipboard.readText();
          if (text) {
            setPasteText(text);
            setNewNoteText('');
            setSelectedPriority(null);
            setIsWatchSelected(false);
            setShowPastePopup(true);
          }
        } catch (err) {
          console.error('Failed to read clipboard:', err);
          Alerts.error('Failed to read clipboard content');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handlePasteSubmit = async () => {
    try {
      // Get current date in YYYY-MM-DD format
      const now = new Date();
      const year = now.getFullYear();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      const noteDate = `${year}-${month}-${day}`;

      // Format datetime for meta tags (dd/mm/yyyy, hh:mm am/pm)
      const hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'pm' : 'am';
      const formattedHours = hours % 12 || 12;
      const formattedDateTime = `${day}/${month}/${year}, ${formattedHours}:${minutes} ${ampm}`;

      // Get the first line from clipboard content
      const firstClipboardLine = pasteText.split('\n')[0].trim();
      
      // Create the note with textbox content and first line from clipboard
      let noteContent = `${newNoteText.trim()}\n${firstClipboardLine}`;
      
      // Add comments for selections
      let comments = [];
      if (selectedPriority) {
        comments.push(`Marked as todo - priority ${selectedPriority}`);
      }
      if (isWatchSelected) {
        comments.push('Added to watch list');
      }
      if (comments.length > 0) {
        noteContent += '\n\n' + comments.join(', ');
      }
      
      // Add todo meta tag if priority is selected
      if (selectedPriority) {
        noteContent += `\nmeta::todo::${formattedDateTime}`;
        noteContent += `\nmeta::${selectedPriority}`;
      }
      
      // Add watch meta tag if watch is selected
      if (isWatchSelected) {
        noteContent += `\nmeta::watch::${formattedDateTime}`;
      }
      
      // Add review pending tag
      noteContent += '\nmeta::review_pending';
      
      const newNote = await addNewNoteCommon(noteContent, [], noteDate);
      
      // Refresh the notes list with the current search query and date
      const data = await loadNotes(searchQuery, noteDate);
      setNotes(data.notes || []);
      setTotals(data.totals || 0);
      
      setShowPastePopup(false);
      setPasteText('');
      setNewNoteText('');
      setSelectedPriority(null);
      setIsWatchSelected(false);
      Alerts.success('Note created successfully');
    } catch (error) {
      console.error('Error creating note:', error);
      Alerts.error('Failed to create note');
    }
  };

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
    console.log('Fetching notes with searchText:', searchText, noteDate);
    const data = await loadNotes(searchText, noteDate)
    console.log('Filtered notes q:', data.notes.length);
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
      const response =await addNewNoteCommon(content, tags, noteDate);
      setSearchQuery('');
      setNotes([response,...notes]);
      setAllNotes([response,...allNotes]);
      // Use empty search query to fetch all notes after adding
      //await Promise.all([
       // fetchNotes(''),
        //fetchAllNotes()
      //]);
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
    <NoteEditorProvider>
      <SearchModalProvider notes={allNotes}>
        <NotesProvider>
          <div className="App flex flex-col h-screen overflow-hidden">
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
              <div className="flex-1 overflow-y-auto">
                <div className="h-full">
                  <Routes>
                    <Route path="/" element={
                      <div className="h-full overflow-y-auto">
                        <div className="max-w-[80%] mx-auto">
                          <PinnedSection notes={allNotes} onUnpin={fetchAllNotes} />
                          <NotesMainContainer
                            objList={objectList}
                            notes={notes}
                            allNotes={allNotes}
                            addNote={addNote}
                            setAllNotes={setAllNotes}
                            objects={objects}
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            addTag={addTag}
                            setNoteDate={setNoteDate}
                            settings={settings}
                          />
                        </div>
                      </div>
                    } />
                    <Route path="/notes" element={
                      <div className="h-full overflow-y-auto">
                        <div className="max-w-[80%] mx-auto">
                          <PinnedSection notes={allNotes} onUnpin={fetchAllNotes} />
                          <NotesMainContainer
                            objList={objectList}
                            notes={notes}
                            allNotes={allNotes}
                            addNote={addNote}
                            setAllNotes={setAllNotes}
                            objects={objects}
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            addTag={addTag}
                            setNoteDate={setNoteDate}
                            settings={settings}
                          />
                        </div>
                      </div>
                    } />
                    <Route path="/watch" element={
                      <div className="h-full overflow-y-auto">
                        <div className="max-w-[80%] mx-auto">
                          <div className="rounded-lg border bg-card text-card-foreground shadow-sm h-full">
                            <WatchList
                              allNotes={allNotes}
                              updateNote={updateNote}
                              refreshNotes={fetchAllNotes}
                            />
                          </div>
                        </div>
                      </div>
                    } />
                    <Route path="/tags" element={
                      <div className="h-full overflow-y-auto">
                        <div className="max-w-[80%] mx-auto">
                          <TagListing objectList={objects} />
                        </div>
                      </div>
                    } />
                    <Route path="/todos" element={
                      <div className="h-full overflow-y-auto">
                        <div className="max-w-[80%] mx-auto">
                          <div className="rounded-lg border bg-card text-card-foreground shadow-sm h-full">
                            <TodoList
                              todos={todos}
                              notes={notes}
                              updateTodosCallback={setTodos}
                              updateNoteCallBack={setNotes}
                            />
                          </div>
                        </div>
                      </div>
                    } />
                    <Route path="/journals" element={
                      <div className="h-full overflow-y-auto">
                        <div className="max-w-[80%] mx-auto">
                          <Journals />
                        </div>
                      </div>
                    } />
                    <Route path="/manage-notes" element={
                      <div className="h-full overflow-y-auto">
                        <div className="max-w-[80%] mx-auto">
                          <Manage />
                        </div>
                      </div>
                    } />
                    <Route path="/events" element={
                      <div className="h-full overflow-y-auto">
                        <div className="max-w-[80%] mx-auto">
                          <EventsPage
                            notes={allNotes}
                            setAllNotes={setAllNotes}
                            allNotes={allNotes}
                            
                          />
                        </div>
                      </div>
                    } />
                    <Route path="/people" element={
                      <div className="h-full overflow-y-auto">
                        <div className="max-w-[80%] mx-auto">
                          <div className="rounded-lg border bg-card text-card-foreground shadow-sm h-full">
                            <PeopleList
                              allNotes={allNotes}
                              setAllNotes={setAllNotes}
                            />
                          </div>
                        </div>
                      </div>
                    } />
                    <Route path="/news" element={
                      <div className="h-full overflow-y-auto">
                        <div className="max-w-[80%] mx-auto">
                          <div className="min-h-screen bg-gray-50">
                            <News />
                          </div>
                        </div>
                      </div>
                    } />
                    <Route path="/dashboard" element={
                      <div className="h-full overflow-y-auto">
                        <div className="max-w-[80%] mx-auto">
                          <div className="min-h-screen bg-gray-50">
                            <Dashboard notes={allNotes} setNotes={setAllNotes} />
                          </div>
                        </div>
                      </div>
                    } />
                    <Route path="/expense" element={
                      <div className="h-full overflow-y-auto">
                        <div className="max-w-[80%] mx-auto h-full">
                          <div className="h-full w-full bg-gray-50">
                            <div className="h-full w-full">
                              <ExpenseTracker />
                            </div>
                          </div>
                        </div>
                      </div>
                    } />
                    <Route path="/trackers" element={
                      <div className="h-full overflow-y-auto">
                        <div className="max-w-[80%] mx-auto">
                          <div className="min-h-screen bg-gray-50">
                            <TrackerListing />
                          </div>
                        </div>
                      </div>
                    } />
                  </Routes>
                </div>
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
            <NoteEditorModal addNote={addNote} updateNote={updateNote} />
            {showPastePopup && (
              <TextPastePopup
                isOpen={showPastePopup}
                onClose={() => {
                  setShowPastePopup(false);
                  setPasteText('');
                  setNewNoteText('');
                  setSelectedPriority(null);
                  setIsWatchSelected(false);
                }}
                newNoteText={newNoteText}
                setNewNoteText={setNewNoteText}
                pasteText={pasteText}
                selectedPriority={selectedPriority}
                setSelectedPriority={setSelectedPriority}
                isWatchSelected={isWatchSelected}
                setIsWatchSelected={setIsWatchSelected}
                onSave={handlePasteSubmit}
              />
            )}
          </div>
        </NotesProvider>
      </SearchModalProvider>
    </NoteEditorProvider>
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
