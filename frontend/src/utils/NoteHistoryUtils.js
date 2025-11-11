/**
 * Note History Utility
 * Manages note history in localStorage with FIFO (First In First Out) queue
 * Maximum 5 notes in history
 */

const STORAGE_KEY = 'noteHistory';
const MAX_HISTORY_SIZE = 5;

/**
 * Save a note to history
 * @param {Object} note - Full note object with id, content, and all properties
 */
export const saveNoteToHistory = (note) => {
  if (!note || !note.id) {
    console.warn('Cannot save note to history: invalid note object');
    return;
  }

  try {
    // Get existing history
    const existingHistory = getNoteHistory();
    
    // Remove this note if it already exists in history (to avoid duplicates)
    const filteredHistory = existingHistory.filter(item => item.id !== note.id);
    
    // Add the new note at the beginning
    const newHistory = [note, ...filteredHistory];
    
    // Keep only the most recent MAX_HISTORY_SIZE notes (FIFO)
    const trimmedHistory = newHistory.slice(0, MAX_HISTORY_SIZE);
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedHistory));
    
    console.log(`[NoteHistory] Saved note ${note.id} to history. History size: ${trimmedHistory.length}`);
  } catch (error) {
    console.error('[NoteHistory] Error saving note to history:', error);
  }
};

/**
 * Get note history from localStorage
 * @returns {Array} Array of note objects
 */
export const getNoteHistory = () => {
  try {
    const historyJson = localStorage.getItem(STORAGE_KEY);
    if (!historyJson) {
      return [];
    }
    return JSON.parse(historyJson);
  } catch (error) {
    console.error('[NoteHistory] Error reading note history:', error);
    return [];
  }
};

/**
 * Get a specific note from history by ID
 * @param {string} noteId - Note ID to retrieve
 * @returns {Object|null} Note object or null if not found
 */
export const getNoteFromHistory = (noteId) => {
  try {
    const history = getNoteHistory();
    return history.find(note => note.id === noteId) || null;
  } catch (error) {
    console.error('[NoteHistory] Error getting note from history:', error);
    return null;
  }
};

/**
 * Clear note history
 */
export const clearNoteHistory = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('[NoteHistory] History cleared');
  } catch (error) {
    console.error('[NoteHistory] Error clearing history:', error);
  }
};

/**
 * Remove a specific note from history
 * @param {string} noteId - Note ID to remove
 */
export const removeNoteFromHistory = (noteId) => {
  try {
    const history = getNoteHistory();
    const filteredHistory = history.filter(note => note.id !== noteId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredHistory));
    console.log(`[NoteHistory] Removed note ${noteId} from history`);
  } catch (error) {
    console.error('[NoteHistory] Error removing note from history:', error);
  }
};

