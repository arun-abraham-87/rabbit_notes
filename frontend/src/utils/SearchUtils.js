import MiniSearch from 'minisearch';

const RECENT_SEARCHES_KEY = 'recentSearches';
const MAX_RECENT_SEARCHES = 5;

// Create a new MiniSearch instance
const miniSearch = new MiniSearch({
  fields: ['content', 'title'], // fields to index for full-text search
  storeFields: ['id', 'content', 'created_datetime'], // fields to return with search results
  searchOptions: {
    boost: { title: 2 }, // boost title matches
    fuzzy: 0.2, // enable fuzzy search with 0.2 tolerance
    prefix: true // enable prefix search
  }
});

// Initialize the search index
let isInitialized = false;

// Function to initialize or update the search index
export const initializeSearchIndex = (notes) => {
  if (!notes || !Array.isArray(notes)) return;
  
  // Clear existing index if it exists
  if (isInitialized) {
    miniSearch.removeAll();
  }
  
  // Add all notes to the index
  const documents = notes.map(note => ({
    id: note.id,
    content: note.content,
    title: note.content.split('\n')[0], // Use first line as title
    created_datetime: note.created_datetime
  }));
  
  miniSearch.addAll(documents);
  isInitialized = true;
};

// Function to search notes
export const searchNotes = (query) => {
  if (!isInitialized || !query) return [];
  
  try {
    return miniSearch.search(query);
  } catch (error) {
    console.error('Error searching notes:', error);
    return [];
  }
};

// Function to add a single note to the index
export const addNoteToIndex = (note) => {
  if (!note || !isInitialized) return;
  
  const document = {
    id: note.id,
    content: note.content,
    title: note.content.split('\n')[0],
    created_datetime: note.created_datetime
  };
  
  miniSearch.add(document);
};

// Function to update a note in the index
export const updateNoteInIndex = (note) => {
  if (!note || !isInitialized) return;
  
  const document = {
    id: note.id,
    content: note.content,
    title: note.content.split('\n')[0],
    created_datetime: note.created_datetime
  };
  
  miniSearch.replace(document);
};

// Function to remove a note from the index
export const removeNoteFromIndex = (noteId) => {
  if (!noteId || !isInitialized) return;
  
  miniSearch.remove({ id: noteId });
};

export const getRecentSearches = () => {
  try {
    const searches = localStorage.getItem(RECENT_SEARCHES_KEY);
    return searches ? JSON.parse(searches) : [];
  } catch (error) {
    console.error('Error getting recent searches:', error);
    return [];
  }
};

export const addRecentSearch = (searchTerm) => {
  try {
    if (!searchTerm.trim()) return;
    
    const searches = getRecentSearches();
    // Remove if already exists
    const filteredSearches = searches.filter(s => s !== searchTerm);
    // Add to beginning
    filteredSearches.unshift(searchTerm);
    // Keep only last 5
    const recentSearches = filteredSearches.slice(0, MAX_RECENT_SEARCHES);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recentSearches));
  } catch (error) {
    console.error('Error saving recent search:', error);
  }
}; 