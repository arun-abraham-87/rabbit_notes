import React, { useState, useEffect, useRef } from 'react';
import { PencilIcon } from '@heroicons/react/24/solid';
import { TrashIcon } from '@heroicons/react/24/solid';
import { processContent } from '../utils/TextUtils';
import ConfirmationModal from './ConfirmationModal';
import { formatDate } from '../utils/DateUtils';

const NotesList = ({ notes, updateNoteCallback, updateTotals, objects, addObjects }) => {
  const [editedContent, setEditedContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState(null);
  const [selectedText, setSelectedText] = useState('');
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [isPopupVisible, setPopupVisible] = useState(false);
  const popupTimeoutRef = useRef(null);

  const openModal = () => setModalOpen(true);
  const closeModal = () => setModalOpen(false);

  const confirmDelete = () => {
    deleteNote(deletingNoteId);
    closeModal();
  };

  const handleDelete = (noteId) => {
    setDeletingNoteId(noteId);
    openModal();
  };

  const updateNote = async (id, updatedContent) => {
    const response = await fetch(`http://localhost:5001/api/notes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: updatedContent }),
    });

    if (response.ok) {
      console.log('Note Updated:', id);
      updateNoteCallback(
        notes.map((note) =>
          note.id === id ? { ...note, content: updatedContent } : note
        )
      );
    } else {
      console.error('Err: Failed to update note');
    }
  };

  const deleteNote = async (id) => {
    const response = await fetch(`http://localhost:5001/api/notes/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      console.log('Note Deleted:', id);
      updateNoteCallback(
        notes.filter((note) => note.id !== id) // Filter out the deleted note from the list
      );
      updateTotals(notes.length);
      setDeletingNoteId(0);
    } else {
      console.error('Err: Failed to delete note');
    }
  };

  // Handle editing the note content
  const handleEdit = (noteId) => {
    setEditingNoteId(noteId);
    const noteToEdit = notes.find((note) => note.id === noteId);
    setEditedContent(noteToEdit ? noteToEdit.content : '');
  };

  // Handle saving the edited note content
  const handleSave = (noteId) => {
    updateNote(noteId, editedContent); // Call the updateNote function passed as a prop
    setEditingNoteId(0);
  };

  const handleTextSelection = (e) => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelectedText(selection.toString().trim());
      setPopupPosition({
        x: rect.left + window.scrollX,
        y: rect.top + window.scrollY - 60, // Position the popup above the selected text
      });

      // Clear any previous timeout
      if (popupTimeoutRef.current) {
        clearTimeout(popupTimeoutRef.current);
      }

      // Set a new timeout to show the popup after 500ms
      popupTimeoutRef.current = setTimeout(() => {
        setPopupVisible(true);
      }, 500);
    } else {
      setPopupVisible(false);
    }
  };

  const handleConvertToTag = () => {
    // Add the selected text as a tag to the note's tags list
    console.log(`Tag added: ${selectedText}`);
    addObjects(selectedText)
    setPopupVisible(false);
  };

  const handleCancelPopup = () => {
    setPopupVisible(false);
  };

  useEffect(() => {
    document.addEventListener('selectionchange', handleTextSelection);
    return () => {
      document.removeEventListener('selectionchange', handleTextSelection);
      // Clean up the timeout when the component is unmounted
      if (popupTimeoutRef.current) {
        clearTimeout(popupTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div>
      {notes.map((note) => (
        <div
          key={note.id}
          className="flex justify-content p-4 mb-6 rounded-lg border bg-card text-card-foreground shadow-sm relative group transition-shadow duration-200 items-center"
        >
          <div className="flex flex-col flex-auto">
            <div className="p-2">
              {editingNoteId === note.id ? (
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full border rounded-md p-2 min-h-64"
                />
              ) : (
                <pre>{processContent(note.content)}</pre>
              )}
            </div>
            <div className="text-xs text-gray-700 p-1">
              {formatDate(note.created_datetime)}
            </div>
          </div>

          <div className="flex-none">
            {editingNoteId === note.id ? (
              <button
                onClick={() => handleSave(note.id)}
                className="bg-green-500 text-white px-4 py-2 rounded-md"
              >
                Save
              </button>
            ) : (
              <div className="flex">
                <div
                  className="relative group flex items-center p-4 rounded hover:bg-gray-200 cursor-pointer"
                  onClick={() => handleEdit(note.id)}
                >
                  <div className="flex-1">
                    <h3 className="text-gray-800 font-semibold">{note.title}</h3>
                    <p className="text-gray-600 text-sm">{note.description}</p>
                  </div>

                  <PencilIcon className="h-5 w-5 text-gray-600 invisible group-hover:visible" />
                </div>
                <div
                  className="relative group flex items-center p-4 rounded hover:bg-gray-200 cursor-pointer"
                  onClick={() => handleDelete(note.id)}
                >
                  <TrashIcon className="h-5 w-5 text-gray-600 invisible group-hover:visible" />
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onConfirm={confirmDelete}
      />

      {isPopupVisible && (
        <div
          className="absolute bg-white border border-gray-300 p-2 rounded-md shadow-lg"
          style={{
            top: `${popupPosition.y}px`,
            left: `${popupPosition.x}px`,
          }}
        >
          <button
            onClick={handleConvertToTag}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
            Convert to Tag
          </button>
          <button
            onClick={handleCancelPopup}
            className="ml-2 bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default NotesList;
