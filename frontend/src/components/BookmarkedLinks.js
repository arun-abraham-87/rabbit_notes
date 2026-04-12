import React, { useMemo, useState } from 'react';
import { BookmarkIcon, PencilIcon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { updateNoteById, createNote } from '../utils/ApiUtils';
import DeleteConfirmationModal from './DeleteConfirmationModal';

const BookmarkEditModal = ({ isOpen, onClose, bookmark, onSave }) => {
  const [customText, setCustomText] = useState(bookmark?.label || '');
  const [url, setUrl] = useState(bookmark?.url || '');

  React.useEffect(() => {
    if (bookmark) {
      setCustomText(bookmark.label || '');
      setUrl(bookmark.url || '');
    }
  }, [bookmark]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (url.trim()) {
      onSave(bookmark, customText.trim(), url.trim());
      onClose();
    }
  };

  const handleClose = () => {
    setCustomText('');
    setUrl('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-96 max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Edit Bookmark
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label htmlFor="customText" className="block text-sm font-medium text-gray-700 mb-2">
              Custom Text
            </label>
            <input
              type="text"
              id="customText"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Enter custom text for the link"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
              URL
            </label>
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter URL"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AddBookmarkModal = ({ isOpen, onClose, onSave }) => {
  const [customText, setCustomText] = useState('');
  const [url, setUrl] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (url.trim()) {
      onSave(customText.trim(), url.trim());
      onClose();
    }
  };

  const handleClose = () => {
    setCustomText('');
    setUrl('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-96 max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Add Bookmark
          </h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label htmlFor="customText" className="block text-sm font-medium text-gray-700 mb-2">
              Custom Text (optional)
            </label>
            <input
              type="text"
              id="customText"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Enter custom text for the link"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="mb-4">
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
              URL
            </label>
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter URL"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Add Bookmark
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const BookmarkedLinks = ({ notes, setNotes }) => {
  const [editMode, setEditMode] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const dragIndexRef = React.useRef(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Collect all pinned bookmarks from notes, sorted by their saved order.
  // A bookmark note must have both meta::bookmark and meta::bookmark_pinned tags to appear here.
  // meta::bookmark_order::N controls display position; notes without it sort to the end.
  const bookmarkedUrls = useMemo(() => {
    const seen = new Set();
    const list = [];
    const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s)]+)/g;
    notes.forEach(note => {
      if (note?.content && note.content.split('\n').some(line => line.trim().startsWith('meta::bookmark'))) {
        const lines = note.content.split('\n');
        const isPinned = lines.some(line => line.trim().startsWith('meta::bookmark_pinned'));
        if (!isPinned) return;

        const orderLine = lines.find(line => line.trim().startsWith('meta::bookmark_order::'));
        const order = orderLine ? parseInt(orderLine.trim().replace('meta::bookmark_order::', ''), 10) : Infinity;

        linkRegex.lastIndex = 0;
        let match;
        while ((match = linkRegex.exec(note.content)) !== null) {
          const url = match[2] || match[3];
          const label = match[1] || null;
          const key = `${url}|${label}`;
          if (!seen.has(key)) {
            seen.add(key);
            list.push({ url, label, noteId: note.id, order });
          }
        }
      }
    });
    list.sort((a, b) => a.order - b.order);
    return list;
  }, [notes]);

  const handleDragStart = (index) => {
    dragIndexRef.current = index;
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    const dragIndex = dragIndexRef.current;
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragOverIndex(null);
      dragIndexRef.current = null;
      return;
    }

    // Compute new order by moving the dragged item to the drop position
    const reordered = [...bookmarkedUrls];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);

    // Write meta::bookmark_order::N into every bookmark note to persist the new order.
    // We strip any existing order tag first, then append the new index.
    const updatedNotes = [...notes];
    for (let i = 0; i < reordered.length; i++) {
      const bookmark = reordered[i];
      const noteIndex = updatedNotes.findIndex(n => n.id === bookmark.noteId);
      if (noteIndex === -1) continue;
      const note = updatedNotes[noteIndex];
      const lines = note.content.split('\n').filter(line => !line.trim().startsWith('meta::bookmark_order::'));
      lines.push(`meta::bookmark_order::${i}`);
      const updatedContent = lines.join('\n');
      updatedNotes[noteIndex] = { ...note, content: updatedContent };
      await updateNoteById(note.id, updatedContent);
    }
    setNotes(updatedNotes);

    setDragOverIndex(null);
    dragIndexRef.current = null;
  };

  const handleDragEnd = () => {
    setDragOverIndex(null);
    dragIndexRef.current = null;
  };

  // Add keyboard event listener for number keys
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle number keys 1-9 when not in an input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      
      const key = e.key;
      if (key >= '1' && key <= '9') {
        const bookmarkIndex = parseInt(key) - 1;
        if (bookmarkIndex < bookmarkedUrls.length) {
          e.preventDefault();
          e.stopPropagation();
          const bookmark = bookmarkedUrls[bookmarkIndex];
          if (bookmark) {
            window.open(bookmark.url, '_blank');
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [bookmarkedUrls]);

  const handleEditBookmark = (bookmark) => {
    setEditingBookmark(bookmark);
    setShowEditModal(true);
  };

  const handleSaveBookmark = async (originalBookmark, newCustomText, newUrl) => {
    try {
      // Find the note containing this bookmark
      const note = notes.find(n => n.id === originalBookmark.noteId);
      if (!note) return;

      // Split content into lines
      const lines = note.content.split('\n');
      
      // Find and replace the bookmark line
      const updatedLines = lines.map(line => {
        const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s)]+)/g;
        let match;
        linkRegex.lastIndex = 0;
        
        while ((match = linkRegex.exec(line)) !== null) {
          const url = match[2] || match[3];
          const label = match[1] || null;
          
          if (url === originalBookmark.url && label === originalBookmark.label) {
            // Replace with new bookmark format
            return `[${newCustomText}](${newUrl})`;
          }
        }
        return line;
      });
      
      // Join lines back together
      const updatedContent = updatedLines.join('\n');
      
      // Update the note
      await updateNoteById(note.id, updatedContent);
      
      // Update the notes state
      setNotes(notes.map(n => n.id === note.id ? { ...n, content: updatedContent } : n));
      
    } catch (error) {
      console.error('Error updating bookmark:', error);
    }
  };

  const handleAddBookmark = async (customText, url) => {
    try {
      // Create a new note with the bookmark
      const bookmarkContent = customText
        ? `[${customText}](${url})\nmeta::bookmark\nmeta::bookmark_pinned`
        : `${url}\nmeta::bookmark\nmeta::bookmark_pinned`;
      
      const newNote = await createNote(bookmarkContent);
      
      // Add the new note to the notes state
      setNotes([...notes, newNote]);
      
    } catch (error) {
      console.error('Error adding bookmark:', error);
    }
  };

  const handleRemoveBookmark = (bookmark) => {
    setConfirmDelete(bookmark);
  };

  const confirmRemoveBookmark = async () => {
    const bookmark = confirmDelete;
    setConfirmDelete(null);
    try {
      const note = notes.find(n => n.id === bookmark.noteId);
      if (!note) return;

      // Strip all bookmark meta tags (meta::bookmark, meta::bookmark_pinned, meta::bookmark_order::N)
      // so the note stays but no longer appears in the bookmark bar.
      const updatedLines = note.content.split('\n').filter(line => {
        const t = line.trim();
        return !t.startsWith('meta::bookmark');
      });
      const updatedContent = updatedLines.join('\n');

      await updateNoteById(note.id, updatedContent);
      setNotes(notes.map(n => n.id === note.id ? { ...n, content: updatedContent } : n));
    } catch (error) {
      console.error('Error removing bookmark:', error);
    }
  };

  if (bookmarkedUrls.length === 0) return null;

  return (
    <>
      <div className="flex items-center gap-4 px-4 py-2 bg-white rounded-lg shadow-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <BookmarkIcon className="h-5 w-5" />
        </div>
        <div className="flex items-center gap-3 overflow-x-auto flex-1">
          {bookmarkedUrls.map(({ url, label, noteId }, index) => {
            const displayText = label || (() => {
              try { return new URL(url).hostname.replace(/^www\./, ''); }
              catch { return url; }
            })();
            const bookmarkNumber = index + 1;
            const isDragOver = dragOverIndex === index;
            return (
              <React.Fragment key={url}>
                {index > 0 && (
                  <div className={`h-4 w-px ${isDragOver ? 'bg-blue-400 w-0.5' : 'bg-gray-300'}`} />
                )}
                <div
                  className={`flex items-center gap-2 rounded px-1 transition-colors ${isDragOver ? 'bg-blue-50 outline outline-1 outline-blue-300' : ''} ${editMode ? 'cursor-grab active:cursor-grabbing' : ''}`}
                  draggable={editMode}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                >
                  <span className="text-xs font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                    {bookmarkNumber}
                  </span>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 whitespace-nowrap hover:underline"
                    draggable={false}
                  >
                    {displayText}
                  </a>
                  {editMode && (
                    <>
                      <button
                        onClick={() => handleEditBookmark({ url, label, noteId })}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Edit bookmark"
                      >
                        <PencilIcon className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleRemoveBookmark({ url, label, noteId })}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Remove from bookmarks"
                      >
                        <TrashIcon className="h-3 w-3" />
                      </button>
                    </>
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Add bookmark"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => setEditMode(!editMode)}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors duration-150 ${
              editMode 
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={editMode ? 'Exit edit mode' : 'Edit bookmarks'}
          >
            {editMode ? 'Done' : 'Edit'}
          </button>
        </div>
      </div>

      <BookmarkEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        bookmark={editingBookmark}
        onSave={handleSaveBookmark}
      />

      <AddBookmarkModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddBookmark}
      />

      <DeleteConfirmationModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={confirmRemoveBookmark}
        title="Delete Bookmark"
        message={`Remove "${confirmDelete?.label || confirmDelete?.url}" from bookmarks?`}
        confirmButtonText="Delete"
      />
    </>
  );
};

export default BookmarkedLinks; 