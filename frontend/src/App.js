import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Navbar from './components/Navbar';
import NotesMainContainer from './components/NotesMainContainer.js';
import TagListing from './components/TagListing.js';
import TodoList from './components/TodoList.js';
import LeftPanel from './components/LeftPanel';
import Journals from './pages/Journals';
import Manage from './pages/Manage';
import EventsPage from './pages/EventsPage';
import PeopleList from './components/PeopleList';
import { createNote, loadAllNotes, updateNoteById, getSettings, defaultSettings, addNewTag } from './utils/ApiUtils';
import { SearchModalProvider } from './contexts/SearchModalContext';
import { NoteEditorProvider } from './contexts/NoteEditorContext';
import { NotesProvider} from './contexts/NotesContext';
import NoteEditorModal from './components/NoteEditorModal';
import WatchList from './components/WatchList';
import News from './components/News';
import ExpenseTracker from './components/ExpenseTracker';
import TrackerListing from './components/TrackerListing';
import Dashboard from './components/Dashboard';
import TextPastePopup from './components/TextPastePopup';
import { Alerts } from './components/Alerts';
import CustomCalendar from './components/CustomCalendar';
import BookmarkManager from './components/BookmarkManager';
import { initializeSearchIndex, searchNotes, addNoteToIndex, updateNoteInIndex, removeNoteFromIndex } from './utils/SearchUtils';
import Assets from './components/Assets';
import CountdownsPage from './pages/CountdownsPage';
import { getDummyCadenceObj, getDummyCadenceLine } from './utils/CadenceHelpUtils';
import StockVesting from './components/StockVesting';

const AppContent = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [allNotes, setAllNotes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [settings, setSettings] = useState(defaultSettings);
  const [todos, setTodos] = useState([]);
  const [noteDate, setNoteDate] = useState(null);
  const [totals, setTotals] = useState(0);
  const [showPastePopup, setShowPastePopup] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [newNoteText, setNewNoteText] = useState('');
  const [selectedPriority, setSelectedPriority] = useState(null);
  const [isWatchSelected, setIsWatchSelected] = useState(false);

  // Get active page from URL hash
  const activePage = location.pathname.split('/')[1] || 'dashboard';

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
        noteContent += getDummyCadenceLine();
      }
      
      // Add review pending tag
      noteContent += '\nmeta::review_pending';
      
      const newNote = await createNote(noteContent);
      
      // Refresh the notes list with the current search query and date
      const data = await loadAllNotes(searchQuery, noteDate);
      setAllNotes(data.notes || []);
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

 

  const searchAllNotesFromCache = async (searchText) => {

    if (searchText) {
      // Use MiniSearch for in-memory search
      const searchResults = searchNotes(searchText);
      setTotals(searchResults.length);
    } 
  };

  const fetchAllNotesFromServer = async () => {
    const data = await loadAllNotes('', null)
    setAllNotes(data.notes);
  };

 

  const addNote = async (content, tags) => {
    try {
      const response = await createNote(content);
      setSearchQuery('');
      setAllNotes([response, ...allNotes]);
      // Add to search index
      addNoteToIndex(response);
    } catch (error) {
      console.error('Error adding note:', error);
    }
  };

  const updateNote = async (id, content) => {
    const response = await updateNoteById(id, content);
    setAllNotes(allNotes.map(note => note.id === id ? response : note));
  };

  const addTag = async (tagText, callback) => {
    try {
      // Create a new tag using the proper API
      const response = await addNewTag(tagText);
      if (callback) await callback();
      console.log('Tag created successfully:', response);
    } catch (error) {
      console.error('Error adding tag:', error);
    }
  };

  useEffect(() => {
    fetchAllNotesFromServer()
  }, []);

  useEffect(() => {
    const debounceFetch = setTimeout(() => {
      // Only fetch filtered notes when search changes
      searchAllNotesFromCache(searchQuery);
    }, 300);
    return () => clearTimeout(debounceFetch);
  }, [searchQuery, noteDate]);



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

  // Initialize search index when allNotes changes
  useEffect(() => {
    initializeSearchIndex(allNotes);
  }, [allNotes]);

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
                  searchQuery={searchQuery}
                  settings={settings}
                  setSettings={setSettings}
                  activePage={activePage}
                  setActivePage={(page) => navigate(`/${page}`)}
                  setShowPastePopup={setShowPastePopup}
                />
              </div>

              {/* Right panel: main content */}
              <div className="flex-1 overflow-y-auto">
                <div className="h-full">
                  <Routes>
                    <Route path="/" element={
                      <NotesProvider>
                        <Dashboard notes={allNotes} setNotes={setAllNotes} />
                      </NotesProvider>
                    } />
                    <Route path="/notes" element={
                      <NotesProvider>
                        <NotesMainContainer
                          allNotes={allNotes}
                          setAllNotes={setAllNotes}
                          addNote={addNote}
                          searchQuery={searchQuery}
                          setSearchQuery={setSearchQuery}
                          setNoteDate={setNoteDate}
                          settings={settings}
                          addTag={addTag}
                          refreshTags={() => {}}
                        />
                      </NotesProvider>
                    } />
                    <Route path="/watch" element={
                      <div className="h-full overflow-y-auto">
                        <div className="w-full 2xl:max-w-[80%] 2xl:mx-auto">
                          <div className="rounded-lg border bg-card text-card-foreground shadow-sm h-full">
                            <WatchList
                              allNotes={allNotes}
                              updateNote={updateNote}
                            />
                          </div>
                        </div>
                      </div>
                    } />
                    <Route path="/tags" element={
                      <div className="h-full overflow-y-auto">
                        <div className="w-full 2xl:max-w-[80%] 2xl:mx-auto">
                          <TagListing />
                        </div>
                      </div>
                    } />
                    <Route path="/todos" element={
                      <div className="h-full overflow-y-auto">
                        <div className="w-full 2xl:max-w-[80%] 2xl:mx-auto">
                          <div className="rounded-lg border bg-card text-card-foreground shadow-sm h-full">
                            <TodoList
                              allNotes={allNotes}
                              setAllNotes={setAllNotes}
                              updateNote={updateNote}
                            />
                          </div>
                        </div>
                      </div>
                    } />
                    <Route path="/journals" element={
                      <div className="h-full overflow-y-auto">
                        <div className="w-full 2xl:max-w-[80%] 2xl:mx-auto">
                          <Journals />
                        </div>
                      </div>
                    } />
                    <Route path="/manage-notes" element={
                      <div className="h-full overflow-y-auto">
                        <div className="w-full 2xl:max-w-[80%] 2xl:mx-auto">
                          <Manage />
                        </div>
                      </div>
                    } />
                    <Route path="/events" element={
                      <div className="h-full overflow-y-auto">
                        <div className="w-full 2xl:max-w-[80%] 2xl:mx-auto">
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
                        <div className="w-full 2xl:max-w-[80%] 2xl:mx-auto">
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
                        <div className="w-full 2xl:max-w-[80%] 2xl:mx-auto">
                          <div className="min-h-screen bg-gray-50">
                            <News />
                          </div>
                        </div>
                      </div>
                    } />
                    <Route path="/dashboard" element={
                      <div className="h-full overflow-y-auto">
                        <div className="w-full 2xl:max-w-[80%] 2xl:mx-auto">
                          <div className="min-h-screen bg-gray-50">
                            <Dashboard notes={allNotes} setNotes={setAllNotes} />
                          </div>
                        </div>
                      </div>
                    } />
                    <Route path="/expense" element={
                      <div className="h-full overflow-y-auto">
                        <div className="w-full 2xl:max-w-[80%] 2xl:mx-auto h-full">
                          <div className="h-full w-full bg-gray-50">
                            <div className="h-full w-full">
                              <NotesProvider>
                                <ExpenseTracker />
                              </NotesProvider>
                            </div>
                          </div>
                        </div>
                      </div>
                    } />
                    <Route path="/trackers" element={
                      <div className="h-full overflow-y-auto">
                        <div className="w-full 2xl:max-w-[80%] 2xl:mx-auto">
                          <div className="min-h-screen bg-gray-50">
                            <TrackerListing />
                          </div>
                        </div>
                      </div>
                    } />
                    <Route path="/calendar" element={
                      <div className="h-full overflow-y-auto">
                        <div className="w-full 2xl:max-w-[80%] 2xl:mx-auto">
                          <div className="min-h-screen bg-gray-50 p-4">
                            <CustomCalendar notes={allNotes} setNotes={setAllNotes} />
                          </div>
                        </div>
                      </div>
                    } />
                    <Route path="/bookmarks" element={
                      <div className="h-full overflow-y-auto">
                        <div className="w-full 2xl:max-w-[80%] 2xl:mx-auto">
                          <div className="min-h-screen bg-gray-50 p-4">
                            <BookmarkManager allNotes={allNotes} />
                          </div>
                        </div>
                      </div>
                    } />
                    <Route path="/assets" element={
                      <div className="h-full overflow-y-auto">
                        <div className="w-full 2xl:max-w-[80%] 2xl:mx-auto">
                          <div className="min-h-screen bg-gray-50 p-4">
                            <Assets />
                          </div>
                        </div>
                      </div>
                    } />
                    <Route path="/countdowns" element={
                      <div className="h-full overflow-y-auto">
                        <div className="w-full 2xl:max-w-[80%] 2xl:mx-auto">
                          <CountdownsPage notes={allNotes} />
                        </div>
                      </div>
                    } />
                    <Route path="/stock-vesting" element={
                      <div className="h-full overflow-y-auto">
                        <div className="w-full 2xl:max-w-[80%] 2xl:mx-auto">
                          <StockVesting notes={allNotes} />
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
