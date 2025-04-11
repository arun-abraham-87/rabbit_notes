import React, { useState, useEffect, useRef } from 'react';
import { PencilIcon } from '@heroicons/react/24/solid';
import { TrashIcon } from '@heroicons/react/24/solid';
import { processContent } from '../utils/TextUtils';
import ConfirmationModal from './ConfirmationModal';
import { formatDate } from '../utils/DateUtils';

const HOSTNAME_MAP = {
  'mail.google.com': 'Gmail',
  'docs.google.com': 'Google Docs',
  'drive.google.com': 'Google Drive',
  'calendar.google.com': 'Google Calendar',
  'slack.com': 'Slack',
  'github.com': 'GitHub',
};

const renderSmartLink = (url) => {
  try {
    const parsedUrl = new URL(url);
    const host = parsedUrl.hostname.replace(/^www\./, '');
    const path = parsedUrl.pathname.split('/').filter(Boolean);
    let label = HOSTNAME_MAP[host] || host;
    let icon = '🔗';

    if (host.includes('slack.com') && path.includes('archives')) {
      label = 'Slack Thread';
      icon = '💬';
    } else if (url.startsWith('mail.google.com')) {
      label = url.replace('mailto:', '');
      icon = '✉️';
    } else if (host.includes('docs.google.com')) {
      label = 'Google Doc';
      icon = '📄';
    } else {
      const mappedHost = HOSTNAME_MAP[host] || host;
      label = mappedHost;
      icon = '🌐';
    }

    return (
      <a
        key={url}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center text-sm font-medium bg-gray-100 text-blue-800 px-3 py-1 rounded-full hover:bg-gray-200 transition mr-2 mb-2"
      >
        <span className="mr-1">{icon}</span>
        {label}
      </a>
    );
  } catch {
    return null;
  }
};

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

  const handleEdit = (noteId) => {
    setEditingNoteId(noteId);
    const noteToEdit = notes.find((note) => note.id === noteId);
    setEditedContent(noteToEdit ? noteToEdit.content : '');
  };

  const handleSave = (noteId) => {
    updateNote(noteId, editedContent);
    setEditingNoteId(0);
  };

  const handleKeyDown = (e, noteId) => {
    if (e.metaKey && e.key === 'Enter') {
      handleSave(noteId);
    }
  };

  const handleCancel = () => {
    setEditingNoteId(0);
    setEditedContent('');
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

      if (popupTimeoutRef.current) {
        clearTimeout(popupTimeoutRef.current);
      }

      popupTimeoutRef.current = setTimeout(() => {
        setPopupVisible(true);
      }, 500);
    } else {
      setPopupVisible(false);
    }
  };

  const handleConvertToTag = () => {
    console.log(`Tag added: ${selectedText}`);
    addObjects(selectedText);
    setPopupVisible(false);
  };

  const handleCancelPopup = () => {
    setPopupVisible(false);
  };

  useEffect(() => {
    document.addEventListener('selectionchange', handleTextSelection);
    return () => {
      document.removeEventListener('selectionchange', handleTextSelection);
      if (popupTimeoutRef.current) {
        clearTimeout(popupTimeoutRef.current);
      }
    };
  }, []);

  const safeNotes = notes || [];

  return (
    <div>
      {safeNotes.map((note) => (
        <div
          key={note.id}
          className="flex justify-content p-4 mb-6 rounded-lg border bg-card text-card-foreground shadow-sm relative group transition-shadow duration-200 items-center"
        >
          <div className="flex flex-col flex-auto">
            {/* Layer 1: Content and Edit/Delete */}
            <div className="p-2">
              {editingNoteId === note.id ? (
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, note.id)}
                  className="w-full border rounded-md p-2 min-h-64"
                />
              ) : (
                <div className="bg-gray-50 p-3 rounded-md border">
                  <pre className="whitespace-pre-wrap">
                    {note.content.split(/(https?:\/\/[^\s]+)/g).map((part, idx) =>
                      part.match(/https?:\/\/[^\s]+/) ? renderSmartLink(part) : part
                    )}
                  </pre>
                </div>
              )}
            </div>

            {/* Layer 2: Tags */}
            <div className="flex flex-wrap gap-2 px-4 pb-2">
              {note.content
                .match(/#\w+/g)
                ?.filter((tag) => objects.includes(tag.substring(1)))
                .map((tag, index) => (
                  <span
                    key={index}
                    className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded"
                  >
                    {tag}
                  </span>
                ))}
            </div>

            {/* Layer 3: Date and Todo Toggle */}
            <div className="flex text-xs text-gray-700 px-4 pb-2 justify-between">
              <span>{formatDate(note.created_datetime)}</span>
              {note.content.toLowerCase().includes('#todo') ? (
                <button
                  onClick={() => {
                    const updatedContent = note.content.replace(/#todo/gi, '').trim();
                    updateNote(note.id, updatedContent);
                  }}
                  className="text-gray-400 text-xs hover:text-blue-600"
                >
                  Unmark as Todo
                </button>
              ) : (
                <button
                  onClick={() => {
                    updateNote(note.id, `${note.content.trim()} #todo`);
                  }}
                  className="text-gray-400 text-xs hover:text-blue-600"
                >
                  Mark as Todo
                </button>
              )}
            </div>
          </div>

          <div className="flex-none">
            {editingNoteId === note.id ? (
              <div className="flex space-x-2">
                <button
                  onClick={() => handleSave(note.id)}
                  className="bg-green-500 text-white px-4 py-2 rounded-md"
                >
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="bg-gray-500 text-white px-4 py-2 rounded-md"
                >
                  Cancel
                </button>
              </div>
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
