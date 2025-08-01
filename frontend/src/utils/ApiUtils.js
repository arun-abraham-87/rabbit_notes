import { reorderMetaTags } from './MetaTagUtils';
import JSZip from 'jszip';

// API Base URL
const API_BASE_URL = 'http://localhost:5001/api';

// Notes API functions
export const addNewNoteCommon = async (content, tags, noteDate) => {
    const response = await fetch(`${API_BASE_URL}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, tags, noteDate }),
    });
    if (!response.ok) throw new Error('Failed to add note');
    return await response.json();
};

export const updateNoteById = async (id, updatedContent) => {
    console.log('updateNoteById called with id:', id, 'updatedContent:', updatedContent);
    const reorderedContent = reorderMetaTags(updatedContent);
    console.log('reorderedContent:', reorderedContent);
    const response = await fetch(`${API_BASE_URL}/notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: reorderedContent }),
    });
    console.log('Server response status:', response.status);
    if (!response.ok) throw new Error('Failed to update note');
    const result = await response.json();
    console.log('Server response data:', result);
    return result;
};

export const deleteNoteById = async (id) => {
    const response = await fetch(`${API_BASE_URL}/notes/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to delete note');
    return await response.json();
};

export const loadAllNotes = async (searchText, noteDate) => {
    const encodedQuery = encodeURIComponent(searchText || '');
    const url = new URL(`${API_BASE_URL}/notes`);
    url.searchParams.append('search', encodedQuery);
    url.searchParams.append('currentDate', 'false');
    if (noteDate) url.searchParams.append('noteDate', noteDate);
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to load all notes');
    const data = await response.json();
    return {
        notes: data.notes.map(note => ({
            ...note,
            content: typeof note.content === 'object' ? note.content.content : note.content
        })),
        totals: data.totals
    };
};

export const loadNotes = async (searchText, noteDate) => {
    const encodedQuery = encodeURIComponent(searchText || '');
    const url = new URL(`${API_BASE_URL}/notes`);
    url.searchParams.append('search', encodedQuery);
    url.searchParams.append('currentDate', (!searchText || searchText.trim().length === 0).toString());
    if (noteDate) url.searchParams.append('noteDate', noteDate);
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to load notes');
    const data = await response.json();
    return {
        notes: data.notes.map(note => ({
            ...note,
            content: typeof note.content === 'object' ? note.content.content : note.content
        })),
        totals: data.totals
    };
};

// Journal APIs
export const loadJournal = async (date) => {
  try {
    const response = await fetch(`${API_BASE_URL}/journals/${date}`);
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) throw new Error('Failed to load journal');
    const data = await response.json();
    return {
      content: data.content || '',
      tags: data.tags || [],
      metadata: data.metadata || {}
    };
  } catch (error) {
    console.error('Error loading journal:', error);
    throw error;
  }
};

export const saveJournal = async (date, journalData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/journals/${date}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        date,
        content: journalData.content,
        metadata: journalData.metadata,
        preview: journalData.content.slice(0, 150)
      }),
    });
    if (!response.ok) throw new Error('Failed to save journal');
    return await response.json();
  } catch (error) {
    console.error('Error saving journal:', error);
    throw error;
  }
};

export const listJournals = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/journals`);
    if (!response.ok) throw new Error('Failed to list journals');
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error listing journals:', error);
    throw error;
  }
};

// Tag Operations
export const loadTags = async () => {
    try {
        //console.log('loadTags - making request to /api/objects');
        const response = await fetch(`${API_BASE_URL}/objects`);
        //console.log('loadTags - response status:', response.status);
        if (!response.ok) {
            console.warn('Failed to fetch tags, returning empty array');
            return [];
        }
        const data = await response.json();
        //console.log('loadTags - received data:', data);
        //console.log('loadTags - data length:', data?.length);
        //console.log('loadTags - suggestions in data:', data?.filter(tag => tag.text.toLowerCase().includes('suggestions')));
        return data;
    } catch (error) {
        console.warn('Error fetching tags:', error);
        return [];
    }
};

export const loadWorkstreams = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/workstreams`);
        if (!response.ok) {
            console.warn('Failed to fetch workstreams, returning empty array');
            return [];
        }
        return await response.json();
    } catch (error) {
        console.warn('Error fetching workstreams:', error);
        return [];
    }
};

export const loadPeople = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/people`);
        if (!response.ok) {
            console.warn('Failed to fetch people, returning empty array');
            return [];
        }
        return await response.json();
    } catch (error) {
        console.warn('Error fetching people:', error);
        return [];
    }
};

export const getAllTags = async () => {
    const response = await fetch(`${API_BASE_URL}/tags`);
    if (!response.ok) throw new Error('Failed to fetch tags');
    return await response.json();
};

export const updateTags = async (tags) => {
    const response = await fetch(`${API_BASE_URL}/tags`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags }),
    });
    if (!response.ok) throw new Error('Failed to update tags');
    return await response.json();
};

export const deleteTag = async (tagId) => {
    const response = await fetch(`${API_BASE_URL}/objects/${tagId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to delete tag');
    return await response.json();
};

export const deleteWorkstream = async (workstreamId) => {
    const response = await fetch(`${API_BASE_URL}/workstreams/${workstreamId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to delete workstream');
    return await response.json();
};

export const deletePerson = async (personId) => {
    const response = await fetch(`${API_BASE_URL}/people/${personId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) throw new Error('Failed to delete person');
    return await response.json();
};

export const editTag = async (tagId, newText) => {
    //console.log('editTag called with:', { tagId, newText });
    const response = await fetch(`${API_BASE_URL}/objects/${tagId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newText }),
    });
    //console.log('editTag response status:', response.status);
    if (!response.ok) {
        const errorText = await response.text();
        //console.log('editTag error response:', errorText);
        throw new Error('Failed to edit tag');
    }
    return await response.json();
};

// Settings API functions
export const getSettings = async () => {
    const response = await fetch(`${API_BASE_URL}/settings`);
    if (!response.ok) throw new Error('Failed to fetch settings');
    return await response.json();
};

export const updateSettings = async (settings) => {
    const response = await fetch(`${API_BASE_URL}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
    });
    if (!response.ok) throw new Error('Failed to update settings');
    return await response.json();
};

// Todo Operations
export const loadTodos = async () => {
    const response = await fetch(`${API_BASE_URL}/todos`);
    if (!response.ok) throw new Error('Failed to fetch todos');
    const data = await response.json();
    return data.todos || [];
};

export const addNewTag = async (tagText) => {
    try {
        const response = await fetch(`${API_BASE_URL}/objects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: tagText }),
        });
        if (!response.ok) {
            throw new Error('Failed to add tag');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error adding tag:", error.message);
        throw error;
    }
};

export const defaultSettings = {
  theme: 'light',
  sortBy: 'date',
  autoCollapse: false,
  showDates: true,
  showCreatedDate: false,
  excludeEventsByDefault: false,
  excludeMeetingsByDefault: false,
  developerMode: false,
  searchQuery: '',
  totals: {
    total: 0,
    todos: 0,
    meetings: 0,
    events: 0
  }
};

export const createNote = async (content) => {
    const response = await fetch(`${API_BASE_URL}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
    });
    if (!response.ok) throw new Error('Failed to create note');
    return await response.json();
};

export const exportAllNotes = async () => {
  try {
    // Create a new ZIP file
    const zip = new JSZip();
    
    // Create folders for notes and journals
    const notesFolder = zip.folder('notes');
    const journalsFolder = zip.folder('journals');

    // Fetch all notes and journals metadata
    const [notesData, journalsMetadata] = await Promise.all([
      loadAllNotes('', null),
      listJournals()
    ]);

    // Add notes to the ZIP
    notesData.notes.forEach((note, index) => {
      const fileName = `note_${note.id || index}.txt`;
      notesFolder.file(fileName, note.content);
    });

    // Load and add each journal's full content to the ZIP
    for (const journal of journalsMetadata) {
      try {
        const fullJournal = await loadJournal(journal.date);
        if (fullJournal) {
          const fileName = `journal_${journal.date}.txt`;
          journalsFolder.file(fileName, fullJournal.content);
        }
      } catch (error) {
        console.error(`Error loading journal ${journal.date}:`, error);
      }
    }

    // Generate the ZIP file
    const content = await zip.generateAsync({ type: 'blob' });

    // Create a download link
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rabbit_notes_export_${new Date().toISOString().split('T')[0]}.zip`;
    
    // Trigger the download
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Create backup note
    const backupDateTime = new Date().toISOString();
    const backupNoteContent = `Backup Performed\nmeta::notes_backup_date::${backupDateTime}`;
    await createNote(backupNoteContent);

    return true;
  } catch (error) {
    console.error('Export error:', error);
    throw new Error('Error during export: ' + error.message);
  }
};