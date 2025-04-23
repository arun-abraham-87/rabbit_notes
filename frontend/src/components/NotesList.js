import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PencilIcon, TrashIcon, EyeIcon, EyeSlashIcon, XCircleIcon, CheckCircleIcon, ExclamationCircleIcon, CalendarIcon, PlusIcon } from '@heroicons/react/24/solid';
// Removed react-beautiful-dnd imports
import { processContent, parseFormattedContent } from '../utils/TextUtils';
import ConfirmationModal from './ConfirmationModal';
import { getDateAgeInYearsMonthsDays, formatAndAgeDate } from '../utils/DateUtils';
import { updateNoteById, deleteNoteById } from '../utils/ApiUtils';
import { findDuplicatedUrls, buildLineElements } from '../utils/genUtils';

import NoteEditor from './NoteEditor';
import RightClickMenu from './RighClickMenu';
import NoteFooter from './NoteFooter';
import LinkedNotesSection from './LinkedNotesSection';
import EndDatePickerModal from './EndDatePickerModal';
import LinkNotesModal from './LinkNotesModal';
import ImageModal from './ImageModal';
import NoteMetaInfo from './NoteMetaInfo';
import TagSelectionPopup from './TagSelectionPopup';
import InlineEditor from './InlineEditor';
import NoteTagBar from './NoteTagBar';

// ─── end line‑rendering helper ──────────────────────────────────────

/**
 * Returns an array of booleans indicating whether each line should be
 * indented. Indentation starts on the line *after* an <h2> and continues
 * until the next <h2> or a blank line.
 */
const getIndentFlags = (contentLines) => {
  let flag = false;
  return contentLines.map((line) => {
    if (line.startsWith('<h2>')) {
      flag = true;
      return false;
    }
    if (line.trim() === '') {
      flag = false;
      return false;
    }
    return flag;
  });
};


const getRawLines = (content) =>
  content.split('\n').filter((line) => !line.trim().startsWith('meta::'));


const NotesList = ({ objList, notes, addNotes, updateNoteCallback, updateTotals, objects, addObjects, searchTerm }) => {
  const [isModalOpen, setModalOpen] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState(null);
  const [selectedText, setSelectedText] = useState('');
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [isPopupVisible, setPopupVisible] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState([]);
  const [showCreatedDate, setShowCreatedDate] = useState(false);
  const [popupNoteText, setPopupNoteText] = useState(null);
  const [imageUrls, setImageUrls] = useState({});
  const [popupImageUrl, setPopupImageUrl] = useState(null);
  const [popupImageLoading, setPopupImageLoading] = useState(false);
  const [popupImageScale, setPopupImageScale] = useState(1);
  const [linkingNoteId, setLinkingNoteId] = useState(null);
  const [linkSearchTerm, setLinkSearchTerm] = useState('');
  const [linkPopupVisible, setLinkPopupVisible] = useState(false);
  const popupContainerRef = useRef(null);
  const popupTimeoutRef = useRef(null);
  const textareaRef = useRef(null);
  const safeNotes = notes || [];
  const [selectedView, setSelectedView] = useState('All');
  const [showEndDatePickerForNoteId, setShowEndDatePickerForNoteId] = useState(null);
  const [editingInlineDate, setEditingInlineDate] = useState({
    noteId: null,
    lineIndex: null,
    originalDate: ''
  });
  const [focussedView, setFocussedView] = useState(false);
  const [rightClickText, setRightClickText] = useState(null);
  const [rightClickPos, setRightClickPos] = useState({ x: 0, y: 0 });
  const [rightClickNoteId, setRightClickNoteId] = useState(null);
  const [rightClickIndex, setRightClickIndex] = useState(null);
  const [editingLine, setEditingLine] = useState({ noteId: null, lineIndex: null });
  const [editedLineContent, setEditedLineContent] = useState('');
  // For adding a new line to a note
  const [addingLineNoteId, setAddingLineNoteId] = useState(null);
  const [newLineText, setNewLineText] = useState('');
  const newLineInputRef = useRef(null);
  // Highlight every case‑insensitive occurrence of `searchTerm` within plain text.
  // Returns a mix of strings and <mark> elements so callers may spread / concat.


  const openModal = () => setModalOpen(true);
  const closeModal = () => setModalOpen(false);

  const confirmDelete = () => {
    deleteNote(deletingNoteId);
    closeModal();
  };

  // Scroll smoothly to another note card by id
  const scrollToNote = (id) =>
    document
      .querySelector(`#note-${id}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });

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

  const handleEndDateSelect = (noteId, date) => {
    const updatedNotes = notes.map(note => {
      if (note.id === noteId) {
        const contentWithoutOldEndDate = note.content
          .split('\n')
          .filter(line => !line.trim().startsWith('meta::end_date::'))
          .join('\n')
          .trim();
        const newContent = `${contentWithoutOldEndDate}\nmeta::end_date::${new Date(date).toISOString()}`;
        updateNoteById(noteId, newContent);
        return { ...note, content: newContent };
      }
      return note;
    });
    updateNoteCallback(updatedNotes);
    setShowEndDatePickerForNoteId(null);
  };

  const handleInlineDateSelect = (noteId, lineIndex, newDate) => {
    const dateStr = newDate.toLocaleDateString();
    const noteToUpdate = notes.find(n => n.id === noteId);
    const lines = noteToUpdate.content.split('\n');
    lines[lineIndex] = lines[lineIndex].replace(editingInlineDate.originalDate, dateStr);
    updateNote(noteId, lines.join('\n'));
    setEditingInlineDate({ noteId: null, lineIndex: null, originalDate: '' });
  };

  const handleRemoveDuplicateUrlsWithinNotes = () => {
    safeNotes.forEach(note => {
      if (duplicateWithinNoteIds.has(note.id)) {
        const seen = new Set();
        const cleanedContent = note.content.replace(/https?:\/\/[^\s)]+/g, url => {
          if (seen.has(url)) return '';
          seen.add(url);
          return url;
        });
        updateNote(note.id, cleanedContent);
      }
    });
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
    try {
      // 1. Filter the selected notes
      const notesToMerge = notes.filter(note => selectedNotes.includes(note.id));

      if (notesToMerge.length === 0) return;

      // 2. Merge their content (separated by two newlines)
      const mergedContent = notesToMerge.map(note => note.content).join('\n\n');

      // 3. Collect unique tags across all notes (if tags are used)
      const allTags = notesToMerge.flatMap(note => note.tags || []);
      const uniqueTags = [...new Set(allTags)];

      // 4. Delete the original notes
      for (const note of notesToMerge) {
        await deleteNoteById(note.id);
      }

      // 5. Add the new merged note (assuming today's date)
      await addNotes(mergedContent, uniqueTags);
      // Clear selection so the Merge button disappears
      setSelectedNotes([]);

    } catch (error) {
      console.error("Error while merging notes:", error);
    }
  };


  const urlPattern = /https?:\/\/[^\s]+/g;

  const {
    duplicateUrlNoteIds,
    duplicateWithinNoteIds,
    urlToNotesMap,
    duplicatedUrlColors,
  } = findDuplicatedUrls(safeNotes);

  useEffect(() => {
    document.addEventListener('selectionchange', handleTextSelection);
    return () => {
      document.removeEventListener('selectionchange', handleTextSelection);
      if (popupTimeoutRef.current) {
        clearTimeout(popupTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (rightClickText === null) {
      setRightClickIndex(null);
      setRightClickNoteId(null);
    }
  }, [rightClickText]);

  useEffect(() => {
    const imagePattern = /!\[pasted image\]\((.*?)\)/g;
    const fetchImages = async () => {
      const newImageUrls = {};
      for (const note of safeNotes) {
        const matches = [...note.content.matchAll(imagePattern)];
        for (const match of matches) {
          const imageId = match[1];
          if (!imageId.includes("http")) {
            try {
              const res = await fetch(`http://localhost:5001/api/images/${imageId}.png`);
              if (res.ok) {
                newImageUrls[note.id] = `http://localhost:5001/api/images/${imageId}.png`;
              }
            } catch (e) {
              console.error("Image fetch failed:", imageId);
            }
          }
        }
      }
      setImageUrls(newImageUrls);
    };

    fetchImages();
  }, [safeNotes]);

  useEffect(() => {
    const handleClickOutside = () => {
      setRightClickText(null);
      setRightClickIndex(null);
      setRightClickNoteId(null);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') {
        setRightClickText(null);
        setRightClickIndex(null);
        setRightClickNoteId(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  return (
    <div className="relative">
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
      {safeNotes
        .map(note => {
          const urls = note.content.match(urlPattern) || [];
          urls.forEach((url) => {
            if (!urlToNotesMap[url]) urlToNotesMap[url] = [];
            urlToNotesMap[url].push(note.id);
          });
          const endDateMatch = note.content.match(/meta::end_date::([^\n]+)/);
          const parsedEndDate = endDateMatch ? new Date(endDateMatch[1]) : null;
          let endDateNotice = '';
          const isDeadlinePassed = parsedEndDate && parsedEndDate < new Date();
          const todoDateMatch = note.content.match(/meta::todo::([^\n]+)/);
          let todoAgeNotice = '';
          if (todoDateMatch) {
            const todoDate = new Date(todoDateMatch[1]);
            todoAgeNotice = `Open for: ${getDateAgeInYearsMonthsDays(todoDate, true)}`;
          }
          if (parsedEndDate) {
            const now = new Date();
            const diffMs = parsedEndDate - now;
            if (diffMs > 0) {
              endDateNotice = `Deadline in ${getDateAgeInYearsMonthsDays(parsedEndDate, false)}`;
            } else {
              endDateNotice = `Deadline passed ${getDateAgeInYearsMonthsDays(parsedEndDate, true)} ago`;
            }
          }
          return (
            <div
              key={note.id}
              onContextMenu={(e) => {
                e.preventDefault();
                setRightClickNoteId(note.id);
                setRightClickPos({ x: e.clientX, y: e.clientY });
              }}
              className="group flex flex-col p-6 mb-5 rounded-lg bg-neutral-50 border border-slate-200 ring-1 ring-slate-100"
            >
              <div className="flex flex-col flex-auto">
                {note.content.split('\n').some(line => line.trim().startsWith('meta::meeting')) && (() => {
                  // Treat first line as topic, second as time
                  const lines = note.content.split('\n');
                  const rawTime = lines[1] || '';
                  // Format for datetime-local input (YYYY-MM-DDTHH:MM)
                  const [datePart, timePart] = rawTime.split('T');
                  const inputValue = rawTime ? `${datePart}T${timePart?.slice(0,5)}` : '';
                  return (
                    <div className="px-4 py-2 flex items-center space-x-2">
                      <label className="text-sm font-medium">Meeting Time:</label>
                      <input
                        type="datetime-local"
                        value={inputValue}
                        onChange={e => {
                          const newValue = e.target.value; // e.g. "2025-04-23T14:30"
                          lines[1] = newValue;
                          updateNote(note.id, lines.join('\n'));
                        }}
                        className="border border-gray-300 rounded p-1 text-sm"
                      />
                    </div>
                  );
                })()}
                {note.content.split('\n').some(line => line.trim().startsWith('meta::event')) && (() => {
                  // Treat first line as event title, second as event time
                  const lines = note.content.split('\n');
                  const rawEventTime = lines[1] || '';
                  const datePart = rawEventTime.split('T')[0]; // keep only the date
                  const inputValue = datePart;                 // populate the <input type="date">
                  return (
                    <div className="px-4 py-2 flex items-center space-x-2">
                      <label className="text-sm font-medium">Event Date:</label>
                      <input
                        type="date"
                        value={inputValue}
                        onChange={e => {
                          const newDate = e.target.value;              // e.g. "2025-04-23"
                          lines[1] = `${newDate}T12:00`;               // default time 12:00
                          updateNote(note.id, lines.join('\n'));
                        }}
                        className="border border-gray-300 rounded p-1 text-sm"
                      />
                    </div>
                  );
                })()}
                {/* Layer 1: Content and Edit/Delete */}
                <div className="p-2">
                  {(note.content.includes('meta::todo') || endDateNotice) && (
                    < NoteMetaInfo
                      note={note}
                      todoAgeNotice={todoAgeNotice}
                      parsedEndDate={parsedEndDate}
                      endDateNotice={endDateNotice}
                      isDeadlinePassed={isDeadlinePassed}
                      updateNote={updateNote}
                      setShowEndDatePickerForNoteId={setShowEndDatePickerForNoteId}
                    />
                  )}
                  <div className="bg-gray-50 p-4 rounded-md border text-gray-800 text-sm leading-relaxed">
                    {(() => {
                      const rawLines = getRawLines(note.content);
                      const contentLines = parseFormattedContent(rawLines, searchTerm, duplicatedUrlColors)
                      const indentFlags = getIndentFlags(contentLines);
                      const endDateMatch = note.content.match(/meta::end_date::([^\n]+)/);
                      const parsedEndDate = endDateMatch ? new Date(endDateMatch[1]) : null;

                      return (
                        <>
                          <div className="whitespace-pre-wrap break-words break-all space-y-1">
                            {contentLines.map((line, idx) => {
                              const isListItem = line.startsWith('- ');
                              if (line.trim() === '') {
                                return (
                                  <div
                                    key={idx}
                                    onContextMenu={(e) => {
                                      e.preventDefault();
                                      setRightClickNoteId(note.id);
                                      setRightClickIndex(idx);
                                      setRightClickPos({ x: e.clientX, y: e.clientY });
                                    }}
                                    className={`cursor-text  ${rightClickNoteId === note.id && rightClickIndex === idx ? 'bg-yellow-100' : ''}`}
                                  >
                                    &nbsp;
                                  </div>
                                );
                              }
                              if (line.startsWith('<h1>') && line.endsWith('</h1>')) {
                                return (
                                  <h1
                                    key={idx}
                                    onContextMenu={(e) => {
                                      e.preventDefault();
                                      setRightClickNoteId(note.id);
                                      setRightClickIndex(idx);
                                      setRightClickPos({ x: e.clientX, y: e.clientY });
                                    }}
                                    className={`group text-2xl font-bold cursor-text flex items-center justify-between ${rightClickNoteId === note.id && rightClickIndex === idx ? 'bg-yellow-100' : ''}`}
                                  >
                                    {editingLine.noteId === note.id && editingLine.lineIndex === idx ? (
                                      <InlineEditor
                                        text={editedLineContent}
                                        setText={setEditedLineContent}
                                        onSave={(newText) => {
                                          const lines = note.content.split('\n');
                                          lines[idx] = `###${newText}###`;      // h1 wrapper
                                          updateNote(note.id, lines.join('\n'));
                                          setEditingLine({ noteId: null, lineIndex: null });
                                        }}
                                        onCancel={() => setEditingLine({ noteId: null, lineIndex: null })}
                                      />
                                    ) : (
                                      <>
                                        {(() => {
                                          const content = line.slice(4, -5);
                                          return (
                                            <span className="flex-1">
                                              {processContent(content, searchTerm, duplicatedUrlColors)}
                                            </span>
                                          );
                                        })()}
                                        <span className="invisible group-hover:visible">
                                          <PencilIcon
                                            className="h-4 w-4 text-gray-500 ml-2 cursor-pointer hover:text-gray-700"
                                            onClick={() => {
                                              setEditedLineContent(line.slice(4, -5));
                                              setEditingLine({ noteId: note.id, lineIndex: idx });
                                            }}
                                          />
                                        </span>
                                      </>
                                    )}
                                  </h1>
                                );
                              } else if (line.startsWith('<h2>') && line.endsWith('</h2>')) {
                                return (
                                  <h2
                                    key={idx}
                                    onContextMenu={(e) => {
                                      e.preventDefault();
                                      setRightClickNoteId(note.id);
                                      setRightClickIndex(idx);
                                      setRightClickPos({ x: e.clientX, y: e.clientY });
                                    }}
                                    className={`group text-lg font-semibold text-purple-700 cursor-text flex items-center justify-between ${rightClickNoteId === note.id && rightClickIndex === idx ? 'bg-yellow-100' : ''}`}
                                  >
                                    {editingLine.noteId === note.id && editingLine.lineIndex === idx ? (
                                      <InlineEditor
                                        text={editedLineContent}
                                        setText={setEditedLineContent}
                                        onSave={(newText) => {
                                          const lines = note.content.split('\n');
                                          lines[idx] = `##${newText}##`;          // h2 wrapper
                                          updateNote(note.id, lines.join('\n'));
                                          setEditingLine({ noteId: null, lineIndex: null });
                                        }}
                                        onCancel={() => setEditingLine({ noteId: null, lineIndex: null })}
                                      />
                                    ) : (
                                      <>
                                        <span className="flex-1">
                                          {processContent(line.slice(4, -5), searchTerm, duplicatedUrlColors)}
                                        </span>
                                        <span className="invisible group-hover:visible">
                                          <PencilIcon
                                            className="h-4 w-4 text-gray-500 ml-2 cursor-pointer hover:text-gray-700"
                                            onClick={() => {
                                              setEditedLineContent(line.slice(4, -5));
                                              setEditingLine({ noteId: note.id, lineIndex: idx });
                                            }}
                                          />
                                        </span>
                                      </>
                                    )}
                                  </h2>
                                );
                              } else {
                                return (
                                  <div
                                    key={idx}

                                    onContextMenu={(e) => {
                                      e.preventDefault();
                                      setRightClickNoteId(note.id);
                                      setRightClickIndex(idx);
                                      setRightClickPos({ x: e.clientX, y: e.clientY });
                                    }}
                                    className={`${(indentFlags[idx] || isListItem) ? 'pl-8 ' : ''}group cursor-text flex items-center justify-between `}
                                  >
                                    {editingLine.noteId === note.id && editingLine.lineIndex === idx ? (
                                      <InlineEditor
                                        text={editedLineContent}
                                        setText={setEditedLineContent}
                                        onSave={(newText) => {
                                          const lines = note.content.split('\n');
                                          lines[idx] = newText;
                                          updateNote(note.id, lines.join('\n'));
                                          setEditingLine({ noteId: null, lineIndex: null });
                                        }}
                                        onCancel={() => setEditingLine({ noteId: null, lineIndex: null })}
                                      />
                                    ) : (
                                      <>
                                        {(indentFlags[idx] || isListItem) && (
                                          <span className="mr-2 text-3xl self-start leading-none">
                                            •
                                          </span>
                                        )}
                                        <span className="flex-1">
                                          {buildLineElements(line, idx, isListItem, searchTerm)}
                                        </span>
                                        <span className="invisible group-hover:visible">
                                          <PencilIcon
                                            className="h-4 w-4 text-gray-500 ml-2 cursor-pointer hover:text-gray-700"
                                            onClick={() => {
                                              setEditedLineContent(line);
                                              setEditingLine({ noteId: note.id, lineIndex: idx });
                                            }}
                                          />
                                        </span>
                                        {editingInlineDate.noteId === note.id && editingInlineDate.lineIndex === idx && (
                                          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                                            <div className="bg-white p-4 rounded shadow-md">
                                              <input
                                                type="date"
                                                onChange={e =>
                                                  handleInlineDateSelect(
                                                    editingInlineDate.noteId,
                                                    editingInlineDate.lineIndex,
                                                    new Date(e.target.value)
                                                  )
                                                }
                                                className="border border-gray-300 rounded px-3 py-2 text-sm"
                                              />
                                              <button
                                                onClick={() =>
                                                  setEditingInlineDate({ noteId: null, lineIndex: null, originalDate: '' })
                                                }
                                                className="ml-2 text-sm text-red-500 hover:underline"
                                              >
                                                Cancel
                                              </button>
                                            </div>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                );
                              }
                            })}
                          </div>
                          {popupNoteText === note.id && (
                            <div className="mt-2">
                              <NoteEditor
                                objList={objList}
                                text={note.content}
                                note={note}
                                onCancel={() => setPopupNoteText(null)}
                                onSave={(updatedNote) => {
                                  updateNote(updatedNote.id, updatedNote.content);
                                  setPopupNoteText(null);
                                }}
                              />
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div>
                  {imageUrls[note.id] ? (
                    <button
                      className="w-24 h-24 mt-2"
                      onClick={() => {
                        setPopupImageLoading(true);
                        setPopupImageUrl(imageUrls[note.id]);
                      }}
                    >
                      <img
                        src={imageUrls[note.id]}
                        alt="Note thumbnail"
                        className="w-full h-full object-cover rounded-md transition-transform duration-200 transform hover:scale-105"
                      />
                    </button>
                  ) : note.content.match(/!\[pasted image\]\((.*?)\)/) ? (
                    <div className="w-6 h-6 mt-2 animate-spin border-2 border-purple-500 border-t-transparent rounded-full" />
                  ) : null}
                </div>

                {addingLineNoteId === note.id && (
                  <div className="w-full px-4 py-2">
                    <InlineEditor
                      text={newLineText}
                      setText={setNewLineText}
                      onSave={(text) => {
                        const updated = note.content.trimEnd() + '\n' + text;
                        updateNote(note.id, updated);
                        setAddingLineNoteId(null);
                        setNewLineText('');
                      }}
                      onCancel={() => {
                        setAddingLineNoteId(null);
                        setNewLineText('');
                      }}
                    />
                  </div>
                )}

                <div className="flex items-center space-x-4 px-4 py-2">
                  {/* Add new line button */}
                  <button
                    title="Add line"
                    onClick={() => {
                      setAddingLineNoteId(note.id);
                      setNewLineText('');
                      setTimeout(() => newLineInputRef.current?.focus(), 0);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <PlusIcon className="h-5 w-5" />
                  </button>
                  {/* Tag bar */}
                  <NoteTagBar
                    note={note}
                    updateNote={updateNote}
                    duplicateUrlNoteIds={duplicateUrlNoteIds}
                    duplicateWithinNoteIds={duplicateWithinNoteIds}
                  />
                </div>


                <NoteFooter
                  note={note}
                  showCreatedDate={showCreatedDate}
                  setShowEndDatePickerForNoteId={setShowEndDatePickerForNoteId}
                  handleDelete={handleDelete}
                  setPopupNoteText={setPopupNoteText}
                  setLinkingNoteId={setLinkingNoteId}
                  setLinkSearchTerm={setLinkSearchTerm}
                  setLinkPopupVisible={setLinkPopupVisible}
                  selectedNotes={selectedNotes}
                  toggleNoteSelection={toggleNoteSelection}
                  updateNote={updateNote}
                />


                <LinkedNotesSection
                  note={note}
                  allNotes={safeNotes}
                  onNavigate={scrollToNote}
                  updateNote={updateNote}
                />
              </div>
            </div>
          )
        })}

      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onConfirm={confirmDelete}
      />

      {isPopupVisible && (
        <TagSelectionPopup
          visible={isPopupVisible}
          position={popupPosition}
          onConvert={handleConvertToTag}
          onCancel={handleCancelPopup}
        />
      )}


      {popupImageUrl && (
        <ImageModal
          imageUrl={popupImageUrl}
          isLoading={popupImageLoading}
          scale={popupImageScale}
          onScaleChange={setPopupImageScale}
          onImageLoad={() => setPopupImageLoading(false)}
          onClose={() => setPopupImageUrl(null)}
        />
      )}

      {linkPopupVisible && (
        <LinkNotesModal
          visible={linkPopupVisible}
          notes={safeNotes}
          linkingNoteId={linkingNoteId}
          searchTerm={linkSearchTerm}
          onSearchTermChange={setLinkSearchTerm}
          onLink={(fromId, toId) => {
            const source = safeNotes.find(n => n.id === fromId);
            const target = safeNotes.find(n => n.id === toId);
            const addTag = (content, id) => {
              const lines = content.split('\n').map(l => l.trimEnd());
              const tag = `meta::link::${id}`;
              if (!lines.includes(tag)) lines.push(tag);
              return lines.join('\n');
            };
            updateNote(fromId, addTag(source.content, toId));
            updateNote(toId, addTag(target.content, fromId));
            setLinkPopupVisible(false);
            setLinkingNoteId(null);
            setLinkSearchTerm('');
          }}
          onCancel={() => {
            setLinkPopupVisible(false);
            setLinkingNoteId(null);
            setLinkSearchTerm('');
          }}
        />
      )}
      {showEndDatePickerForNoteId && (
        <EndDatePickerModal
          noteId={showEndDatePickerForNoteId}
          onSelect={handleEndDateSelect}
          onCancel={() => setShowEndDatePickerForNoteId(null)}
        />
      )}
      {rightClickNoteId !== null && rightClickIndex !== null && (
        <RightClickMenu
          noteId={rightClickNoteId}
          lineIndex={rightClickIndex}
          pos={rightClickPos}
          notes={safeNotes}
          updateNote={updateNote}
          handleDelete={handleDelete}
          setPopupNoteText={setPopupNoteText}
          setLinkingNoteId={setLinkingNoteId}
          setLinkSearchTerm={setLinkSearchTerm}
          setLinkPopupVisible={setLinkPopupVisible}
          selectedNotes={selectedNotes}
          toggleNoteSelection={toggleNoteSelection}
          setRightClickText={setRightClickText}
        />
      )}
    </div>
  );
};

export default NotesList;