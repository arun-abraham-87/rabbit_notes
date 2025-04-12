import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PencilIcon } from '@heroicons/react/24/solid';
import { TrashIcon } from '@heroicons/react/24/solid';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { processContent } from '../utils/TextUtils';
import ConfirmationModal from './ConfirmationModal';
import { formatDate } from '../utils/DateUtils';
import { updateNoteById, deleteNoteById } from '../utils/ApiUtils';

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
    
    return (
      <a
        key={url}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline hover:text-blue-800"
      >
        {host}
      </a>
    );
  } catch {
    return null;
  }
};

const NotesList = ({ notes, addNotes, updateNoteCallback, updateTotals, objects, addObjects, searchTerm }) => {
  const [editedContent, setEditedContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState(null);
  const [selectedText, setSelectedText] = useState('');
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [isPopupVisible, setPopupVisible] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState([]);
  const [showCreatedDate, setShowCreatedDate] = useState(false);
  const popupTimeoutRef = useRef(null);
  const textareaRef = useRef(null);
  const safeNotes = notes || [];

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

  const updateNote = (id, updatedContent) => {
    updateNoteById(id, updatedContent);
    updateNoteCallback(
      notes.map((note) =>
        note.id === id ? { ...note, content: updatedContent } : note
      )
    );
  };

  const deleteNote = async (id) => {
    deleteNoteById(id);
    updateNoteCallback(
      notes.filter((note) => note.id !== id) // Filter out the deleted note from the list
    );
    updateTotals(notes.length);
    setDeletingNoteId(0);
  };

  const handleEdit = (id) => {
    setEditingNoteId(id);
    const noteToEdit = notes.find((note) => note.id === id);
    setEditedContent(noteToEdit ? noteToEdit.content : '');
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.selectionStart = textareaRef.current.selectionEnd = textareaRef.current.value.length;
      }
    }, 0);
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

  const toggleNoteSelection = (id) => {
    setSelectedNotes((prev) =>
      prev.includes(id) ? prev.filter((nid) => nid !== id) : [...prev, id]
    );
  };

  const handleMergeNotes = async () => {
    const mergedContent = selectedNotes
      .map((id) => notes.find((n) => n.id === id)?.content)
      .filter(Boolean)
      .join('\n-----------------------------------\n') + '\n#merged';
    console.log('Merged Note');
    console.log(mergedContent);
    for (const id of selectedNotes) {
      await deleteNote(id);
    }
    addNotes(mergedContent);
    setSelectedNotes([]);
  };

  const urlPattern = /https?:\/\/[^\s]+/g;
  const urlToNotesMap = {};

  safeNotes.forEach((note) => {
    const urls = note.content.match(urlPattern) || [];
    urls.forEach((url) => {
      if (!urlToNotesMap[url]) {
        urlToNotesMap[url] = [];
      }
      urlToNotesMap[url].push(note.id);
    });
  });

  const duplicateUrlNoteIds = new Set();
  Object.values(urlToNotesMap).forEach((noteIds) => {
    if (noteIds.length > 1) {
      noteIds.forEach((id) => duplicateUrlNoteIds.add(id));
    }
  });

  const duplicateWithinNoteIds = new Set();
  safeNotes.forEach((note) => {
    const urls = note.content.match(urlPattern) || [];
    const seen = new Set();
    for (const url of urls) {
      if (seen.has(url)) {
        duplicateWithinNoteIds.add(note.id);
        break;
      }
      seen.add(url);
    }
  });

  useEffect(() => {
    document.addEventListener('selectionchange', handleTextSelection);
    return () => {
      document.removeEventListener('selectionchange', handleTextSelection);
      if (popupTimeoutRef.current) {
        clearTimeout(popupTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div>
      {selectedNotes.length > 1 && (
        <div className="mb-4">
          <button
            onClick={handleMergeNotes}
            className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:from-purple-600 hover:to-indigo-700"
          >
            Merge Selected Notes
          </button>
        </div>
      )}
      <div className="flex justify-between items-center px-4 py-2 mb-4 mt-2 bg-white rounded-lg border border-gray-200 shadow-sm">
        <p className="text-sm text-gray-700">Settings</p>
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="toggleCreatedDate"
            checked={showCreatedDate}
            onChange={() => setShowCreatedDate((prev) => !prev)}
            className="accent-purple-600 w-4 h-4 rounded border-gray-300 focus:ring-purple-500"
          />
          <label htmlFor="toggleCreatedDate" className="text-sm text-gray-700">Show created date</label>
        </div>
      </div>
      {safeNotes.map((note) => (
        <div
          key={note.id}
          className={`flex flex-col p-5 mb-5 rounded-xl border ${
            note.content.toLowerCase().includes('#todo') ? 'border-purple-500' : 'border-gray-200'
          } bg-white shadow hover:shadow-md transition-shadow duration-200`}
        >
          <div className="flex flex-col flex-auto">
            {/* Layer 1: Content and Edit/Delete */}
            <div className="p-2">
              {editingNoteId === note.id ? (
                <>
                  <textarea
                    ref={textareaRef}
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, note.id)}
                    className="w-full border rounded-md p-2 min-h-64"
                  />
                  <div className="mt-2 flex justify-end space-x-2">
                    <button
                      onClick={handleCancel}
                      className="text-sm text-gray-600 hover:text-gray-800 border border-gray-300 px-3 py-1 rounded-md"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSave(note.id)}
                      className="text-sm text-white bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded-md"
                    >
                      Save
                    </button>
                  </div>
                </>
              ) : (
                <div className="bg-gray-50 p-4 rounded-md border text-gray-800 text-sm leading-relaxed">
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
                    className="bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              {duplicateUrlNoteIds.has(note.id) && (
                <span className="bg-red-100 text-red-800 text-xs font-semibold px-3 py-1 rounded-full">
                  Duplicate URL
                </span>
              )}
              {duplicateWithinNoteIds.has(note.id) && (
                <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-3 py-1 rounded-full">
                  Duplicate Url In Note
                </span>
              )}
            </div>

            {/* Layer 3: Date and Todo Toggle */}
            <div className="flex text-xs text-gray-700 px-4 pb-2 items-center">
              <div className="flex justify-between w-full items-center">
                <div className="flex-1">
                  {showCreatedDate && <span>{formatDate(note.created_datetime)}</span>}
                </div>
                <div className="flex items-center space-x-2">
                  {note.content.toLowerCase().includes('#todo') ? (
                    <div className="group relative">
                      <XCircleIcon
                        title="Unmark as Todo"
                        className="h-4 w-4 text-purple-600 cursor-pointer group-hover:scale-150 transition-transform duration-200 ease-in-out hover:text-purple-800"
                        onClick={() => {
                          const updatedContent = note.content.replace(/#todo/gi, '').trim();
                          updateNote(note.id, updatedContent);
                        }}
                      />
                    </div>
                  ) : (
                    <div className="group relative">
                      <CheckCircleIcon
                        title="Mark as Todo"
                        className="h-4 w-4 text-purple-600 cursor-pointer group-hover:scale-150 transition-transform duration-200 ease-in-out hover:text-purple-800"
                        onClick={() => {
                          updateNote(note.id, `${note.content.trim()} #todo`);
                        }}
                      />
                    </div>
                  )}
                  <div className="group relative">
                    <PencilIcon
                      className="h-4 w-4 text-gray-600 cursor-pointer group-hover:scale-150 transition-transform duration-200 ease-in-out hover:text-gray-800"
                      onClick={() => handleEdit(note.id)}
                    />
                  </div>
                  <div className="group relative">
                    <TrashIcon
                      className="h-4 w-4 text-gray-600 cursor-pointer group-hover:scale-150 transition-transform duration-200 ease-in-out hover:text-gray-800"
                      onClick={() => handleDelete(note.id)}
                    />
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedNotes.includes(note.id)}
                    onChange={() => toggleNoteSelection(note.id)}
                    title="Select Note"
                    className="accent-purple-600 w-4 h-4 rounded border-gray-300 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>
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
