/**
 * Searches for text within a note's content
 * @param {Object} note - The note object to search in
 * @param {string} searchText - The text to search for
 * @returns {boolean} - Returns true if searchText is found in note content, false otherwise
 */
export const searchInNote = (note, searchText) => {
    // Check if note or searchText is null/undefined
    if (!note || !searchText) {
        return false;
    }

    // Check if note.content exists and is an array
    if (!note.content) {
        return false;
    }

    // Convert searchText to lowercase for case-insensitive search
    const searchTextLower = searchText.toLowerCase();

    // Convert line to lowercase and check if it contains the search text
    return note.content.toLowerCase().includes(searchTextLower);
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
