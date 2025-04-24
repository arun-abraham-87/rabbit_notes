import { reorderMetaTags } from './TextUtils';

// API Base URL
const API_BASE_URL = 'http://localhost:5001/api';

export const addNewNote = async (content, tags, noteDate) => {
    const response = await fetch(`${API_BASE_URL}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, tags, noteDate }),
    });
};

export const updateNoteById = async (id, updatedContent) => {
    // Reorder meta tags before sending the update
    const reorderedContent = reorderMetaTags(updatedContent);
    
    const response = await fetch(`${API_BASE_URL}/notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: reorderedContent }),
    });

    if (!response.ok) {
        throw new Error('Failed to update note');
    }

    const result = await response.json();
    return result;
};

export const deleteNoteById = async (id) => {
    const response = await fetch(`${API_BASE_URL}/notes/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
        console.log('Note Deleted:', id);
    } else {
        console.error('Err: Failed to delete note');
    }
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

export const loadAllNotes = async (searchText, noteDate) => {
    const encodedQuery = encodeURIComponent(searchText);
    let url = `${API_BASE_URL}/notes?search=${encodedQuery}`;
    url += `&currentDate=false`;
    url += `&noteDate=${noteDate}`;
    const response = await fetch(url);
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
    const encodedQuery = encodeURIComponent(searchText);
    let url = `${API_BASE_URL}/notes?search=${encodedQuery}`;
    url += `&currentDate=${!searchText || searchText.trim().length === 0}`;
    url += `&noteDate=${noteDate}`;
    const response = await fetch(url);
    const data = await response.json();
    return {
        notes: data.notes.map(note => ({
            ...note,
            content: typeof note.content === 'object' ? note.content.content : note.content
        })),
        totals: data.totals
    };
};

export const loadTags = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/objects`);
        if (!response.ok) {
            throw new Error('Failed to fetch tags');
        }
        const data = await response.json();
        return data; // Return full objects to have access to IDs
    } catch (error) {
        console.error("Error fetching objects:", error.message);
        throw error;
    }
};

export const loadTodos = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/todos`);
        const data = await response.json();
        return (data.todos || []);
    } catch (error) {
        console.error("Error fetching todos:", error.message);
    }
};

// Settings API functions
export const getSettings = async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/settings`);
        const contentType = response.headers.get("content-type");
        
        if (!response.ok) {
            if (contentType && contentType.includes("application/json")) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch settings');
            } else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        }
        
        if (!contentType || !contentType.includes("application/json")) {
            throw new Error("Received non-JSON response from server");
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching settings:', error);
        throw error;
    }
};

export const updateSettings = async (settings) => {
    try {
        const response = await fetch(`${API_BASE_URL}/settings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(settings),
        });
        
        const contentType = response.headers.get("content-type");
        
        if (!response.ok) {
            if (contentType && contentType.includes("application/json")) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update settings');
            } else {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
        }
        
        if (!contentType || !contentType.includes("application/json")) {
            throw new Error("Received non-JSON response from server");
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error updating settings:', error);
        throw error;
    }
};

// Tag Operations
export const getAllTags = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/tags`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch tags');
    }
    return response.json();
  } catch (error) {
    console.error('Error in getAllTags:', error);
    throw error;
  }
};

export const updateTags = async (tags) => {
  try {
    const response = await fetch(`${API_BASE_URL}/tags`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to update tags');
    }
    return response.json();
  } catch (error) {
    console.error('Error in updateTags:', error);
    throw error;
  }
};

export const deleteTag = async (tagId) => {
    try {
        const response = await fetch(`${API_BASE_URL}/objects/${tagId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
            throw new Error('Failed to delete tag');
        }
        return await response.json();
    } catch (error) {
        console.error("Error deleting tag:", error.message);
        throw error;
    }
};

export const editTag = async (tagId, newText) => {
    try {
        const response = await fetch(`${API_BASE_URL}/objects/${tagId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: newText }),
        });
        if (!response.ok) {
            throw new Error('Failed to edit tag');
        }
        return await response.json();
    } catch (error) {
        console.error("Error editing tag:", error.message);
        throw error;
    }
};