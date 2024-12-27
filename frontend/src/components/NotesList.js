import React, { useState } from 'react';
import moment from 'moment';
import { PencilIcon } from '@heroicons/react/24/solid';
import { TrashIcon } from '@heroicons/react/24/solid';

import ConfirmationModal from './ConfirmationModal';



const NotesList = ({ notes, updateNoteCallback, updateTotals }) => {
  const [editedContent, setEditedContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState(null);

  const openModal = () => setModalOpen(true);
  const closeModal = () => setModalOpen(false);

  const confirmDelete = () => {
    deleteNote(deletingNoteId)
    
    closeModal();
  };

  const handleDelete = (noteId) => {
    setDeletingNoteId(noteId)
    openModal()
  }


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
      updateTotals(notes.length)
      setDeletingNoteId(0)
    } else {
      console.error('Err: Failed to delete note');
    }
  };


  // Function to format the date with relative time
  const formatDate = (dateString) => {
    const noteDate = moment(dateString, "DD/MM/YYYY, h:mm:ss a");
    return `${dateString} (${noteDate.fromNow()})`;
  };

  // Function to process the content with links and capitalization
  const processContent = (content) => {
    if (typeof content !== 'string') {
      return content; // Return content as is if it's not a string
    }

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    let isFirstTextSegment = true;

    return content.trim().split(urlRegex).map((part, index) => {
      if (urlRegex.test(part)) {
        try {
          const url = new URL(part);
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:text-blue-800"
            >
              {url.hostname}
            </a>
          );
        } catch {
          return part; // If URL parsing fails, return the original part
        }
      } else if (isFirstTextSegment && typeof part === 'string') {
        isFirstTextSegment = false;
        return part.charAt(0).toUpperCase() + part.slice(1); // Capitalize first text segment
      }
      return part; // Return subsequent non-URL parts as-is
    });
  };

  // Handle editing the note content
  const handleEdit = (noteId) => {
    console.log(noteId)
    setEditingNoteId(noteId)
    const noteToEdit = notes.find((note) => note.id === noteId);
    setEditedContent(noteToEdit ? noteToEdit.content : '');
  };

  // Handle saving the edited note content
  const handleSave = (noteId) => {
    console.log("Save")
    updateNote(noteId, editedContent); // Call the updateNote function passed as a prop
    setEditingNoteId(0)
  };

  return (
    <div>
      {notes.map((note) => (
        <div
          key={note.id}
          className="flex justify-content p-4 mb-6 rounded-lg border bg-card text-card-foreground shadow-sm relative group transition-shadow duration-200 items-center"
        >
          <div className="flex flex-col flex-auto">
            {/* Display editable content if in editing mode */}
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

          {/* Edit Button shown on hover */}
          <div className="flex-none">
            {editingNoteId === note.id ? (
              <button
                onClick={() => handleSave(note.id)}
                className="bg-green-500 text-white px-4 py-2 rounded-md"
              >
                Save
              </button>
            ) : (
              <div className='flex'>
                <div
                  className="relative group flex items-center p-4 rounded hover:bg-gray-200 cursor-pointer"
                  onClick={() => handleEdit(note.id)}
                >
                  <div className="flex-1">
                    <h3 className="text-gray-800 font-semibold">{note.title}</h3>
                    <p className="text-gray-600 text-sm">{note.description}</p>
                  </div>

                  {/* Edit Icon - Visible Only on Hover */}
                  <PencilIcon className="h-5 w-5 text-gray-600 invisible group-hover:visible" />

                </div>
                <div
                  className="relative group flex items-center p-4 rounded hover:bg-gray-200 cursor-pointer"
                  onClick={() => handleDelete(note.id)}>
                  {/* Trash Icon */}
                  <TrashIcon className="h-5 w-5 text-gray-600  invisible group-hover:visible" />

                </div>
              </div>
            )}
          </div>
        </div>
      ))
      }

      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onConfirm={confirmDelete}
      />
    </div >
  );
};

export default NotesList;
