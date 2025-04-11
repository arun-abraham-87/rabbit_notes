
export const addNewNote = async (content, tags, noteDate) => {
    const response = await fetch('http://localhost:5001/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, tags, noteDate }),
    });
};



export const updateNoteById = async (id, updatedContent) => {
    const response = await fetch(`http://localhost:5001/api/notes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: updatedContent }),
    });

    if (response.ok) {
        console.log('Note Updated Sucessfully:', id);
    } else {
        console.error('Err: Failed to update note');
    }
};



export const deleteNoteById = async (id) => {
    const response = await fetch(`http://localhost:5001/api/notes/${id}`, {
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

    const response = await fetch('http://localhost:5001/api/objects', {
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


export const loadNotes = async (searchText,noteDate) => {
    const encodedQuery = encodeURIComponent(searchText);
    let url = `http://localhost:5001/api/notes?search=${encodedQuery}`;
    url += `&currentDate=${searchText.trim().length === 0}`;
    url += `&noteDate=${noteDate}`;
    const response = await fetch(url);
    const data = await response.json();
    return data
  };


  export const loadTags = async () => {
    try {
      const response = await fetch("http://localhost:5001/api/objects");
      const data = await response.json();
      const tagsList = data.map((obj) => obj.text);
      console.log(tagsList)
      return tagsList
    } catch (error) {
      console.error("Error fetching objects:", error.message);
    }
  };


  export const loadTodos = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/todos');
      const data = await response.json();
      return (data.todos || []);
    } catch (error) {
      console.error("Error fetching todos:", error.message);
    }
  };