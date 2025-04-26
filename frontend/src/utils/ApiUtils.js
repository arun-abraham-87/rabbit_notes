import { reorderMetaTags } from './TextUtils';

// API Base URL
const API_BASE_URL = 'http://localhost:5001/api';

// Notes API functions
export const addNewNote = async (content, tags, noteDate) => {
    const response = await fetch(`${API_BASE_URL}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, tags, noteDate }),
    });
    if (!response.ok) throw new Error('Failed to add note');
    return await response.json();
};

export const updateNoteById = async (id, updatedContent) => {
    const reorderedContent = reorderMetaTags(updatedContent);
    const response = await fetch(`${API_BASE_URL}/notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: reorderedContent }),
    });
    if (!response.ok) throw new Error('Failed to update note');
    return await response.json();
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
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: journalData.content,
        tags: journalData.tags,
        metadata: {
          lastModified: journalData.lastModified,
          ...journalData.metadata
        }
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
    const response = await fetch(`${API_BASE_URL}/objects`);
    if (!response.ok) throw new Error('Failed to fetch tags');
    return await response.json();
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

export const editTag = async (tagId, newText) => {
    const response = await fetch(`${API_BASE_URL}/objects/${tagId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newText }),
    });
    if (!response.ok) throw new Error('Failed to edit tag');
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