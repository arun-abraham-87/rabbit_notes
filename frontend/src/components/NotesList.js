import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PencilIcon } from '@heroicons/react/24/solid';
import { TrashIcon } from '@heroicons/react/24/solid';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { processContent } from '../utils/TextUtils';
import ConfirmationModal from './ConfirmationModal';
import { formatDate } from '../utils/DateUtils';
import { updateNoteById, deleteNoteById } from '../utils/ApiUtils';
import NoteEditor from './NoteEditor';

const HOSTNAME_MAP = {
  'mail.google.com': 'Gmail',
  'docs.google.com': 'Google Docs',
  'drive.google.com': 'Google Drive',
  'calendar.google.com': 'Google Calendar',
  'slack.com': 'Slack',
  'github.com': 'GitHub',
};

const renderSmartLink = (url, highlightColor = null) => {
  try {
    const parsedUrl = new URL(url);
    const host = parsedUrl.hostname.replace(/^www\./, '');

    const backgroundColor = highlightColor ? `${highlightColor}20` : 'transparent';
    const borderColor = highlightColor || 'transparent';

    return (
      <a
        key={url}
        href={url}
        title={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline hover:text-blue-800 px-1 rounded border-2"
        style={{ borderColor, backgroundColor }}
      >
        {host}
      </a>
    );
  } catch {
    return null;
  }
};

const NotesList = ({ notes, addNotes, updateNoteCallback, updateTotals, objects, addObjects, searchTerm }) => {
  const [isModalOpen, setModalOpen] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState(null);
  const [selectedText, setSelectedText] = useState('');
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [isPopupVisible, setPopupVisible] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState([]);
  const [showCreatedDate, setShowCreatedDate] = useState(false);
  const [popupNoteText, setPopupNoteText] = useState(null);
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

  const duplicatedUrls = Object.entries(urlToNotesMap)
    .filter(([, ids]) => ids.length > 1)
    .map(([url]) => url);

  const duplicatedUrlColors = {};
  const highlightPalette = ['#fde68a', '#a7f3d0', '#fbcfe8', '#bfdbfe', '#ddd6fe', '#fecaca'];
  duplicatedUrls.forEach((url, idx) => {
    duplicatedUrlColors[url] = highlightPalette[idx % highlightPalette.length];
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
              <div className="bg-gray-50 p-4 rounded-md border text-gray-800 text-sm leading-relaxed">
                {(() => {
                  const lines = note.content.split('\n');
                  const firstLine = lines[0];
                  const rest = lines.slice(1).join('\n');
                  const isTitle = firstLine.startsWith('##') && firstLine.endsWith('##');
                  const title = isTitle ? firstLine.replace(/^##|##$/g, '') : null;
                  const contentToRender = isTitle ? rest : note.content;
 
                  return (
                    <>
                      {isTitle && <h2 className="text-lg font-semibold text-purple-700 mb-2">{title}</h2>}
                      <pre className="whitespace-pre-wrap">
                        {contentToRender.split(/(\[[^\]]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s]+)/g).map((part, idx) => {
                          const markdownMatch = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
                          if (markdownMatch) {
                            const [, label, url] = markdownMatch;
                            return (
                              <a
                                key={url + idx}
                                href={url}
                                title={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 underline hover:text-blue-800"
                              >
                                {label}
                              </a>
                            );
                          } else if (part.match(/https?:\/\/[^\s]+/)) {
                            return renderSmartLink(part, duplicatedUrlColors[part]);
                          }
                          return part;
                        })}
                      </pre>
                    </>
                  );
                })()}
              </div>
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
                      onClick={() => setPopupNoteText(note.content)}
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

      {popupNoteText && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow max-w-3xl w-full">
            <NoteEditor
              text={popupNoteText}
              note={{
                content: popupNoteText,
                id: safeNotes.find(n => n.content === popupNoteText)?.id,
              }}
              onCancel={() => setPopupNoteText(null)}
              onSave={(updatedNote) => {
                updateNote(updatedNote.id, updatedNote.content);
                setPopupNoteText(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default NotesList;
