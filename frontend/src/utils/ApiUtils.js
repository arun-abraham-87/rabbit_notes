import { reorderMetaTags } from './MetaTagUtils';
import { extractImageIds } from './NotesUtils';
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

export const getNoteById = async (id) => {
  const fetchDebugPrefix = `[📥 GET NOTE] [${new Date().toISOString()}]`;
  console.log(`${fetchDebugPrefix} ========== GET NOTE BY ID ==========`);
  console.log(`${fetchDebugPrefix} Note ID: ${id}`);
  console.log('[ApiUtils] getNoteById called:', id);
  const fetchStartTime = Date.now();
  const response = await fetch(`${API_BASE_URL}/notes/${id}`);
  const fetchDuration = Date.now() - fetchStartTime;
  console.log(`${fetchDebugPrefix} Fetch completed in ${fetchDuration}ms`);
  console.log('[ApiUtils] getNoteById response status:', response.status);
  console.log('[ApiUtils] getNoteById response ok:', response.ok);
  if (!response.ok) {
    console.error(`${fetchDebugPrefix} ❌ ERROR: Fetch failed`, { status: response.status, id });
    console.error('[ApiUtils] getNoteById failed:', { status: response.status, id });
    throw new Error('Failed to fetch note');
  }
  const result = await response.json();
  console.log(`${fetchDebugPrefix} ✅ Fetch successful`);
  console.log(`${fetchDebugPrefix} Returned note ID: ${result?.id}`);
  console.log(`${fetchDebugPrefix} Returned note content length: ${result?.content?.length}`);

  // Count linked events in fetched content
  const fetchedLinkedEventLines = result?.content?.split('\n').filter(line => line.trim().startsWith('meta::linked_from_events::')) || [];
  console.log(`${fetchDebugPrefix} Linked event lines in fetched content: ${fetchedLinkedEventLines.length}`);
  console.log(`${fetchDebugPrefix} Linked event lines:`, fetchedLinkedEventLines);
  console.log(`${fetchDebugPrefix} Content preview (last 500 chars):`, result?.content?.substring(Math.max(0, result.content.length - 500)));
  console.log(`${fetchDebugPrefix} ========== GET NOTE COMPLETE ==========`);
  console.log('[ApiUtils] getNoteById success:', { id, hasContent: !!result?.content, contentLength: result?.content?.length });
  console.log('[ApiUtils] getNoteById - content preview (last 200 chars):', result?.content?.substring(Math.max(0, result.content.length - 200)));
  return result;
};

export const updateNoteById = async (id, updatedContent, tags) => {
  const apiDebugPrefix = `[🌐 API UPDATE] [${new Date().toISOString()}]`;
  console.log(`${apiDebugPrefix} ========== API UPDATE CALLED ==========`);
  console.log(`${apiDebugPrefix} Note ID: ${id}`);
  console.log(`${apiDebugPrefix} Content length: ${updatedContent?.length}`);
  console.log(`${apiDebugPrefix} Tags:`, tags);

  // ... existing logging ...

  const reorderedContent = reorderMetaTags(updatedContent);
  const response = await fetch(`${API_BASE_URL}/notes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: reorderedContent,
      tags: tags
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`${apiDebugPrefix} ❌ ERROR: Update failed`, { status: response.status, errorText });
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
  // If 404, the note is already deleted - don't throw error
  if (response.status === 404) {
    console.log('[ApiUtils] Note already deleted (404):', id);
    return { success: true, alreadyDeleted: true };
  }
  if (!response.ok) throw new Error('Failed to delete note');
  return await response.json();
};

// Image deletion functions
export const deleteImageById = async (imageId) => {
  const response = await fetch(`${API_BASE_URL}/images/${imageId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) throw new Error('Failed to delete image');
  return await response.json();
};

export const deleteImagesFromNote = async (noteContent) => {
  const imageIds = extractImageIds(noteContent);
  const deletePromises = imageIds.map(imageId =>
    deleteImageById(imageId).catch(error => {
      console.warn(`Failed to delete image ${imageId}:`, error);
      return null; // Don't fail the whole operation if one image fails
    })
  );

  await Promise.all(deletePromises);
  return imageIds;
};

export const deleteNoteWithImages = async (id, noteContent) => {
  try {
    // First delete associated images
    await deleteImagesFromNote(noteContent);
    console.log('✅ Associated images deleted');
  } catch (error) {
    console.warn('⚠️ Some images could not be deleted:', error);
    // Continue with note deletion even if image deletion fails
  }

  // Then delete the note
  return await deleteNoteById(id);
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
    //
    const response = await fetch(`${API_BASE_URL}/objects`);
    //
    if (!response.ok) {
      console.warn('Failed to fetch tags, returning empty array');
      return [];
    }
    const data = await response.json();
    //
    //
    //
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

export const fetchPeopleWithFilters = async (filters = {}) => {
  try {
    const params = new URLSearchParams();

    if (filters.startsWith) {
      params.append('startsWith', filters.startsWith);
    }
    if (filters.tags && filters.tags.length > 0) {
      filters.tags.forEach(tag => params.append('tags', tag));
    }
    if (filters.search) {
      params.append('search', filters.search);
    }
    if (filters.hasPhoto !== undefined) {
      params.append('hasPhoto', filters.hasPhoto);
    }
    if (filters.withoutPhoto !== undefined) {
      params.append('withoutPhoto', filters.withoutPhoto);
    }

    const queryString = params.toString();
    const url = queryString
      ? `${API_BASE_URL}/people?${queryString}`
      : `${API_BASE_URL}/people`;

    const response = await fetch(url);
    if (!response.ok) {
      console.warn('Failed to fetch people with filters, returning empty array');
      return [];
    }
    return await response.json();
  } catch (error) {
    console.warn('Error fetching people with filters:', error);
    return [];
  }
};

export const fetchPeopleTags = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/people/tags`);
    if (!response.ok) {
      console.warn('Failed to fetch people tags, returning empty array');
      return [];
    }
    return await response.json();
  } catch (error) {
    console.warn('Error fetching people tags:', error);
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
  //
  const response = await fetch(`${API_BASE_URL}/objects/${tagId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: newText }),
  });
  //
  if (!response.ok) {
    const errorText = await response.text();
    //
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
  },
  noteCardOptions: {
    watch: { visible: true, location: 'card' },
    pin: { visible: true, location: 'card' },
    sensitive: { visible: true, location: 'card' },
    bookmark: { visible: true, location: 'more' },
    abbreviation: { visible: true, location: 'more' },
    workstream: { visible: true, location: 'more' },
    removeAllTags: { visible: true, location: 'more' },
    convertToBookmark: { visible: true, location: 'more' },
    todo: { visible: true, location: 'more' },
    todoHigh: { visible: true, location: 'more' },
    todoMedium: { visible: true, location: 'more' },
    todoLow: { visible: true, location: 'more' },
    pinLines: { visible: true, location: 'more' },
    linkNote: { visible: true, location: 'card' },
    merge: { visible: true, location: 'card' },
    copy: { visible: true, location: 'card' },
    rawNote: { visible: true, location: 'card' },
    edit: { visible: true, location: 'card' },
    delete: { visible: true, location: 'card' }
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

    // Create folders for notes, journals, and images
    const notesFolder = zip.folder('notes');
    const journalsFolder = zip.folder('journals');
    const imagesFolder = zip.folder('images');

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

    // Fetch list of all images from the backend
    let allImages = [];
    try {
      const imagesResponse = await fetch(`${API_BASE_URL}/images`);
      if (imagesResponse.ok) {
        const imagesData = await imagesResponse.json();
        allImages = imagesData.images || [];
        console.log(`Found ${allImages.length} images in the images directory`);
      } else {
        console.warn('Failed to fetch images list from backend, will try to extract from notes');
        // Fallback: extract image IDs from notes if backend endpoint fails
        const allImageIds = new Set();
        notesData.notes.forEach((note) => {
          const imageIds = extractImageIds(note.content);
          imageIds.forEach(id => allImageIds.add(id));
        });
        // Convert to image objects with unknown extension
        allImages = Array.from(allImageIds).map(id => ({ filename: id, id, extension: 'unknown' }));
      }
    } catch (error) {
      console.error('Error fetching images list:', error);
      // Fallback: extract image IDs from notes
      const allImageIds = new Set();
      notesData.notes.forEach((note) => {
        const imageIds = extractImageIds(note.content);
        imageIds.forEach(id => allImageIds.add(id));
      });
      allImages = Array.from(allImageIds).map(id => ({ filename: id, id, extension: 'unknown' }));
    }

    // Fetch and add all images to the ZIP
    const imageFetchPromises = allImages.map(async (imageInfo) => {
      try {
        const { filename, id, extension } = imageInfo;

        // If we have the full filename, use it directly
        if (filename && filename.includes('.')) {
          try {
            const imageUrl = `${API_BASE_URL}/images/${filename}`;
            const response = await fetch(imageUrl);

            if (response.ok && response.status === 200) {
              const blob = await response.blob();
              imagesFolder.file(filename, blob);
              console.log(`Added image to backup: ${filename}`);
              return;
            }
          } catch (error) {
            console.warn(`Failed to fetch image ${filename}:`, error);
          }
        }

        // Fallback: try different extensions if we only have the ID
        const extensions = extension && extension !== 'unknown'
          ? [extension, extension.toUpperCase()]
          : ['png', 'PNG', 'jpg', 'JPG', 'jpeg', 'JPEG', 'gif', 'GIF', 'webp', 'WEBP', 'heic', 'HEIC'];

        for (const ext of extensions) {
          try {
            const imageUrl = `${API_BASE_URL}/images/${id}.${ext}`;
            const response = await fetch(imageUrl);

            if (response.ok && response.status === 200) {
              const blob = await response.blob();
              const fileName = `${id}.${ext}`;
              imagesFolder.file(fileName, blob);
              console.log(`Added image to backup: ${fileName}`);
              return; // Successfully added
            }
          } catch (error) {
            // Try next extension
            continue;
          }
        }

        console.warn(`Could not find image: ${filename || id}`);
      } catch (error) {
        console.error(`Error fetching image ${imageInfo.filename || imageInfo.id}:`, error);
      }
    });

    // Wait for all images to be fetched and added
    await Promise.all(imageFetchPromises);

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

// Timeline API functions
export const getTimelines = async (params = {}) => {
  const { status, search, searchTitlesOnly } = params;
  const queryParams = new URLSearchParams();
  if (status) queryParams.append('status', status);
  if (search) queryParams.append('search', search);
  if (searchTitlesOnly) queryParams.append('searchTitlesOnly', searchTitlesOnly);

  const queryString = queryParams.toString();
  const url = `${API_BASE_URL}/timelines${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch timelines');
  return await response.json();
};

export const getTimelineById = async (id) => {
  const response = await fetch(`${API_BASE_URL}/timelines/${id}`);
  if (!response.ok) throw new Error('Failed to fetch timeline');
  return await response.json();
};

export const getTimelineEvents = async (id, search = '') => {
  const queryParams = new URLSearchParams();
  if (search) queryParams.append('search', search);
  const queryString = queryParams.toString();
  const url = `${API_BASE_URL}/timelines/${id}/events${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch timeline events');
  return await response.json();
};

export const getMasterTimelineEvents = async (year) => {
  const queryParams = new URLSearchParams();
  if (year) queryParams.append('year', year);
  const queryString = queryParams.toString();
  const url = `${API_BASE_URL}/timelines/master/events${queryString ? `?${queryString}` : ''}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error('Failed to fetch master timeline events');
  return await response.json();
};