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
    const response = await fetch(`${API_BASE_URL}/notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: updatedContent }),
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
    const response = await fetch(`${API_BASE_URL}/objects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: tagText }),
    });
    if (response.ok) {
        console.log('Tag Added');
    } else {
        console.error('Err: Failed to add tag.');
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
        const data = await response.json();
        const tagsList = data.map((obj) => obj.text);
        console.log(tagsList);
        return tagsList;
    } catch (error) {
        console.error("Error fetching objects:", error.message);
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