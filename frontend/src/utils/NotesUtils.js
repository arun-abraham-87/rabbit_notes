/**
 * Searches for text within a note's content
 * @param {Object} note - The note object to search in
 * @param {string} searchText - The text to search for
 * @returns {boolean} - Returns true if all search terms are found in note content, false otherwise
 */
export const searchInNote = (note, searchText) => {
    // Check if note or searchText is null/undefined
    if (!note || !searchText) {
        return false;
    }

    // Check if note.content exists
    if (!note.content) {
        return false;
    }

    // Handle special id: prefix for exact note ID matching
    if (searchText.startsWith('id:')) {
        const targetId = searchText.substring(3); // Remove 'id:' prefix
        return note.id.toString() === targetId;
    }

    // Split search text into individual terms and trim whitespace
    const searchTerms = searchText.toLowerCase().split(/\s+/).filter(term => term.length > 0);
    
    // If no valid search terms, return false
    if (searchTerms.length === 0) {
        return false;
    }

    // Convert note content to lowercase for case-insensitive search
    const noteContent = note.content.toLowerCase();

    // Check if all search terms are present in the note content
    return searchTerms.every(term => noteContent.includes(term));
};

/**
 * Builds workstream and people suggestions from notes
 * @param {Array} allNotes - Array of note objects
 * @param {Array} objList - Optional array of existing suggestions
 * @returns {Array} - Merged array of all suggestions
 */
export const buildSuggestionsFromNotes = (allNotes, objList = []) => {
    const workstreamSuggestions = (allNotes || [])
        .filter(note => note.content.includes('meta::workstream'))
        .map(note => ({
            type: 'workstream',
            id: note.id,
            text: note.content.split('\n')[0]
        }));

    const peopleSuggestions = (allNotes || [])
        .filter(note => note.content.includes('meta::person::'))
        .map(note => ({
            type: 'person',
            id: note.id,
            text: note.content.split('\n')[0]
        }));

    return [
        ...(objList || []),
        ...workstreamSuggestions,
        ...peopleSuggestions
    ];
};

// Extract image IDs from meta::image:: tags in note content
export const extractImageIds = (noteContent) => {
  if (!noteContent) return [];
  
  const imageMetaRegex = /meta::image::([a-f0-9-]+)/g;
  const imageIds = [];
  let match;
  
  while ((match = imageMetaRegex.exec(noteContent)) !== null) {
    imageIds.push(match[1]);
  }
  
  return imageIds;
};
