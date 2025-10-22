import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Navbar from './components/Navbar';
import NotesMainContainer from './components/NotesMainContainer.js';
import TagListing from './components/TagListing.js';
import TodoList from './components/TodoList.js';
import LeftPanel from './components/LeftPanel';
import RightPanel from './components/RightPanel';
import Journals from './pages/Journals';
import Manage from './pages/Manage';
import EventsPage from './pages/EventsPage';
import PeopleList from './components/PeopleList';
import { createNote, loadAllNotes, updateNoteById, getSettings, defaultSettings, addNewTag, loadTags } from './utils/ApiUtils';
import { SearchModalProvider } from './contexts/SearchModalContext';
import { NoteEditorProvider } from './contexts/NoteEditorContext';
import { NotesProvider} from './contexts/NotesContext';
import { LeftPanelProvider, useLeftPanel } from './contexts/LeftPanelContext';
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
import Timelines from './pages/Timelines';
import { getDummyCadenceObj, getDummyCadenceLine } from './utils/CadenceHelpUtils';
import StockVesting from './components/StockVesting';
import Pomodoro from './components/Pomodoro';

// MainContentArea component that adjusts based on left panel state
const MainContentArea = ({ 
  allNotes, 
  setAllNotes, 
  addNote, 
  searchQuery, 
  setSearchQuery, 
  setNoteDate, 
  settings, 
  addTag, 
  refreshTags, 
  objList, 
  updateNote,
  navigate
}) => {
  const { isVisible } = useLeftPanel();
  
  return (
    <div 
      className={`flex-1 overflow-y-auto transition-all duration-300 ease-in-out ${
        isVisible ? 'ml-80' : 'ml-0'
      }`}
    >
      <div className="h-full">
        <Routes>
          <Route path="/" element={
            <NotesProvider>
              <Dashboard notes={allNotes} setNotes={setAllNotes} setActivePage={(page) => navigate(`/${page}`)} />
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
                refreshTags={refreshTags}
                objList={objList}
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
                  <Dashboard notes={allNotes} setNotes={setAllNotes} setActivePage={(page) => navigate(`/${page}`)} />
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
          <Route path="/pomodoro" element={
            <div className="h-full overflow-y-auto">
              <div className="w-full 2xl:max-w-[80%] 2xl:mx-auto">
                <div className="min-h-screen bg-gray-50 flex justify-center items-center">
                  <Pomodoro />
                </div>
              </div>
            </div>
          } />
          <Route path="/timelines" element={
            <div className="h-full overflow-y-auto">
              <div className="w-full 2xl:max-w-[80%] 2xl:mx-auto">
                <Timelines notes={allNotes} />
              </div>
            </div>
          } />
        </Routes>
      </div>
    </div>
  );
};



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
  const [isSensitiveSelected, setIsSensitiveSelected] = useState(false);
  const [objList, setObjList] = useState([]);
  const [lastAddedNoteId, setLastAddedNoteId] = useState(() => {
    // Load last added note ID from localStorage on mount
    const saved = localStorage.getItem('lastAddedNoteId');
    return saved ? parseInt(saved) : null;
  });

  // Get active page from URL hash
  const activePage = location.pathname.split('/')[1] || 'dashboard';

  // Handle global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = async (e) => {
      // Check if we're in an input or textarea - don't handle navigation shortcuts
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      // Handle Cmd+V (or Ctrl+V) for quick paste
      if ((e.metaKey || e.ctrlKey) && e.key === 'v') {
        // Check if quick paste is enabled
        const isQuickPasteEnabled = localStorage.getItem('quickPasteEnabled') !== 'false';
        if (!isQuickPasteEnabled) return;

        e.preventDefault();
        try {
          // Check for text content first
          const text = await navigator.clipboard.readText();
          if (text) {
            setPasteText(text);
            setNewNoteText('');
            setSelectedPriority(null);
            setIsWatchSelected(false);
            setShowPastePopup(true);
            return;
          }
          
          // If no text, check for image content
          const clipboardItems = await navigator.clipboard.read();
          const hasImage = clipboardItems.some(item => 
            item.types.some(type => type.startsWith('image/'))
          );
          
          if (hasImage) {
            // Open popup even if there's only an image
            setPasteText(''); // Empty text since it's just an image
            setNewNoteText('');
            setSelectedPriority(null);
            setIsWatchSelected(false);
            setShowPastePopup(true);
          }
        } catch (err) {
          console.error('Failed to read clipboard:', err);
          Alerts.error('Failed to read clipboard content');
        }
        return;
      }



      // Handle navigation shortcuts
      // 'gt' to go to /tags, 'gn' to go to /notes, 'gh' to go to /dashboard, 'ge' to go to /events, 'gl' to go to last note, 'gb' to go to bookmarks
      if (e.key === 'g') {
        // Start tracking for navigation sequence - this takes precedence over any page-specific shortcuts
        const handleNextKey = (nextEvent) => {
          // Always prevent default and stop propagation for global navigation
          e.preventDefault();
          nextEvent.preventDefault();
          nextEvent.stopPropagation();
          
          if (nextEvent.key === 't') {
            navigate('/tags');
          } else if (nextEvent.key === 'n') {
            navigate('/notes');
          } else if (nextEvent.key === 'h') {
            navigate('/dashboard');
          } else if (nextEvent.key === 'e') {
            navigate('/events');
          } else if (nextEvent.key === 'l') {
            // Navigate to last added note
            if (lastAddedNoteId) {
              navigate('/notes', { state: { searchQuery: `id:${lastAddedNoteId}` } });
              Alerts.success('Navigated to last added note');
            } else {
              // If no last note, just go to notes page
              navigate('/notes');
              Alerts.error('No last added note found');
            }
          } else if (nextEvent.key === 'b') {
            navigate('/bookmarks');
          }
          // Always remove the event listener, regardless of the key pressed
          window.removeEventListener('keydown', handleNextKey);
        };
        
        // Listen for the next key press with capture phase to ensure it fires before other handlers
        window.addEventListener('keydown', handleNextKey, { once: true, capture: true });
        return;
      }

      // Handle Option + single-key navigation shortcuts (global)
      // On Mac, altKey is true when Option is pressed
      if (e.altKey && !e.metaKey && !e.ctrlKey && !e.shiftKey) {
        
        
        if (e.key === 'n') {
          e.preventDefault();
          e.stopPropagation();
          
          navigate('/notes');
          return;
        }

        if (e.key === 'e') {
          e.preventDefault();
          e.stopPropagation();
          
          navigate('/events');
          return;
        }
      }

      // Handle single key shortcuts (global)
      if (!e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey &&
          e.target.tagName !== 'INPUT' && 
          e.target.tagName !== 'TEXTAREA' &&
          e.target.contentEditable !== 'true') {
        
        if (e.key === 'b') {
          e.preventDefault();
          e.stopPropagation();
          
          // Toggle the left panel (sidebar)
          const leftPanelToggleEvent = new CustomEvent('toggleLeftPanel');
          document.dispatchEvent(leftPanelToggleEvent);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, lastAddedNoteId]);

  const handlePasteSubmit = async (customContent = null) => {
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
      
      // Use custom content if provided (for image uploads), otherwise build normally
      let noteContent;
      if (customContent) {
        // Custom content already includes newNoteText + image + meta tags
        // Add the clipboard content
        noteContent = `${customContent.trim()}\n${firstClipboardLine}`;
      } else {
        // Create the note with textbox content and first line from clipboard
        noteContent = `${newNoteText.trim()}\n${firstClipboardLine}`;
      }
      
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
      
      // Add sensitive meta tag if sensitive is selected
      if (isSensitiveSelected) {
        noteContent += `\nmeta::sensitive::`;
      }
      
      const newNote = await createNote(noteContent);
      
      // Track the last added note
      setLastAddedNoteId(newNote.id);
      localStorage.setItem('lastAddedNoteId', newNote.id.toString());
      
      // Refresh the notes list with the current search query and date
      const data = await loadAllNotes(searchQuery, noteDate);
      setAllNotes(data.notes || []);
      setTotals(data.totals || 0);
      
      setShowPastePopup(false);
      setPasteText('');
      setNewNoteText('');
      setSelectedPriority(null);
      setIsWatchSelected(false);
      setIsSensitiveSelected(false);
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

  // Load tags
  const fetchTags = async () => {
    try {
      const tags = await loadTags();
      setObjList(tags || []);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

 

  const addNote = async (content, tags) => {
    try {
      const response = await createNote(content);
      setSearchQuery('');
      setAllNotes([response, ...allNotes]);
      // Track the last added note
      setLastAddedNoteId(response.id);
      localStorage.setItem('lastAddedNoteId', response.id.toString());
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
      
    } catch (error) {
      console.error('Error adding tag:', error);
    }
  };

  useEffect(() => {
    fetchAllNotesFromServer()
    fetchTags()
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
          <LeftPanelProvider>
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
                    activePage={activePage}
                    setActivePage={(page) => navigate(`/${page}`)}
                    setShowPastePopup={setShowPastePopup}
                  />
                </div>

                {/* Right panel: main content */}
                <MainContentArea 
                  allNotes={allNotes}
                  setAllNotes={setAllNotes}
                  addNote={addNote}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  setNoteDate={setNoteDate}
                  settings={settings}
                  addTag={addTag}
                  refreshTags={fetchTags}
                  objList={objList}
                  updateNote={updateNote}
                  navigate={navigate}
                />
                
                {/* Right panel: pinned notes */}
                <RightPanel 
                  notes={allNotes}
                  setNotes={setAllNotes}
                  setActivePage={(page) => navigate(`/${page}`)}
                />
              </div>
              <ToastContainer
                position="bottom-right"
                autoClose={1500}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick={false}
                rtl={false}
                pauseOnFocusLoss={false}
                draggable={false}
                pauseOnHover={false}
                theme="light"
                closeButton={false}
                limit={1}
                enableMultiContainer={false}
                preventDuplicates={true}
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
                    setIsSensitiveSelected(false);
                  }}
                  newNoteText={newNoteText}
                  setNewNoteText={setNewNoteText}
                  pasteText={pasteText}
                  selectedPriority={selectedPriority}
                  setSelectedPriority={setSelectedPriority}
                  isWatchSelected={isWatchSelected}
                  setIsWatchSelected={setIsWatchSelected}
                  isSensitiveSelected={isSensitiveSelected}
                  setIsSensitiveSelected={setIsSensitiveSelected}
                  onSave={handlePasteSubmit}
                  objList={objList}
                  allNotes={allNotes}
                />
              )}
            </div>
          </LeftPanelProvider>
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
