import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PencilIcon, TrashIcon, EyeIcon, EyeSlashIcon, XCircleIcon, CheckCircleIcon, ExclamationCircleIcon, CalendarIcon } from '@heroicons/react/24/solid';
// Removed react-beautiful-dnd imports
import { processContent, parseFormattedContent, highlightMatches } from '../utils/TextUtils';
import ConfirmationModal from './ConfirmationModal';
import { getDateAgeInYearsMonthsDays, formatAndAgeDate } from '../utils/DateUtils';
import { updateNoteById, deleteNoteById } from '../utils/ApiUtils';

import NoteEditor from './NoteEditor';
import RightClickMenu from './RighClickMenu';
import NoteFooter from './NoteFooter';
import LinkedNotesSection from './LinkedNotesSection';
import EndDatePickerModal from './EndDatePickerModal';
import LinkNotesModal from './LinkNotesModal';
import ImageModal from './ImageModal';
import TagSelectionPopup from './TagSelectionPopup';


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
  const [dragSelecting, setDragSelecting] = useState(false);
  const [dragStartIndex, setDragStartIndex] = useState(null);
  const [dragEndIndex, setDragEndIndex] = useState(null);
  const [editingLine, setEditingLine] = useState({ noteId: null, lineIndex: null });
  const [editedLineContent, setEditedLineContent] = useState('');
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
                {/* Layer 1: Content and Edit/Delete */}
                <div className="p-2">
                  {(note.content.includes('meta::todo') || endDateNotice) && (
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircleIcon className="h-6 w-6 text-green-600" title="Todo" />
                      {todoAgeNotice && (
                        <button
                          className="text-gray-800 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1 hover:bg-gray-400"
                          onClick={() => {
                            const updatedContent = note.content
                              .split('\n')
                              .filter(line => !line.trim().startsWith('meta::todo'))
                              .join('\n')
                              .trim();
                            updateNote(note.id, updatedContent);
                          }}
                          title="Remove todo notice"
                        >
                          <span>{todoAgeNotice}</span>
                        </button>
                      )}
                      {parsedEndDate && (
                        <>
                          <span className="text-xs text-gray-700 font-semibold mr-1">Deadline Date:</span>
                          <span
                            className="text-xs text-gray-500 cursor-pointer"
                            onClick={() => setShowEndDatePickerForNoteId(note.id)}
                          >
                            {parsedEndDate.toLocaleDateString()}
                          </span>
                          <CalendarIcon
                            className="h-5 w-5 text-gray-600 cursor-pointer hover:text-gray-800"
                            onClick={() => setShowEndDatePickerForNoteId(note.id)}
                            title="Edit end date"
                          />
                        </>
                      )}
                      {endDateNotice && (
                        <button
                          className="text-gray-800 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1 hover:bg-gray-400"
                          onClick={() => {
                            const updatedContent = note.content
                              .split('\n')
                              .filter(line => !line.trim().startsWith('meta::end_date::'))
                              .join('\n')
                              .trim();
                            updateNote(note.id, updatedContent);
                          }}
                          title="Remove end date"
                        >
                          {isDeadlinePassed && (
                            <ExclamationCircleIcon className="h-4 w-4 text-red-600" title="Deadline passed" />
                          )}
                          <span>{endDateNotice}</span>
                          <span className={`${isDeadlinePassed ? 'text-red-600 hover:text-red-800' : 'text-blue-600 hover:text-blue-900'} ml-1 cursor-pointer`}>
                            ×
                          </span>
                        </button>
                      )}

                      {!parsedEndDate && (
                        <button
                          className="text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1 bg-gray-100 text-gray-800 hover:bg-gray-200"
                          onClick={() => setShowEndDatePickerForNoteId(note.id)}
                          title="Set end date"
                        >
                          No Deadline
                          <CalendarIcon className="h-4 w-4 text-gray-600 ml-1" title="Pick date" />
                        </button>
                      )}

                    </div>
                  )}
                  <div className="bg-gray-50 p-4 rounded-md border text-gray-800 text-sm leading-relaxed">
                    {(() => {
                      const rawLines = note.content.split('\n').filter(line => !line.trim().startsWith('meta::'));
                      const contentLines = parseFormattedContent(rawLines, searchTerm, duplicatedUrlColors);
                      // Track which lines should be indented: after an <h2> until next <h2> or blank
                      const indentFlags = (() => {
                        let flag = false;
                        return contentLines.map(line => {
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
                      })();
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
                                    onMouseDown={() => {
                                      setDragSelecting(true);
                                      setDragStartIndex(idx);
                                      setDragEndIndex(idx);
                                    }}
                                    onMouseEnter={() => {
                                      if (dragSelecting) setDragEndIndex(idx);
                                    }}
                                    onMouseUp={() => setDragSelecting(false)}
                                    onContextMenu={(e) => {
                                      e.preventDefault();
                                      setRightClickNoteId(note.id);
                                      setRightClickIndex(idx);
                                      setRightClickPos({ x: e.clientX, y: e.clientY });
                                    }}
                                    className={`cursor-text ${(dragStartIndex !== null && idx >= Math.min(dragStartIndex, dragEndIndex) && idx <= Math.max(dragStartIndex, dragEndIndex)) ? 'bg-blue-100' : ''} ${rightClickNoteId === note.id && rightClickIndex === idx ? 'bg-yellow-100' : ''}`}
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
                                      <>
                                        <input
                                          type="text"
                                          value={editedLineContent}
                                          onChange={(e) => setEditedLineContent(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              const lines = note.content.split('\n');
                                              lines[idx] = `###${editedLineContent}###`;
                                              updateNote(note.id, lines.join('\n'));
                                              setEditingLine({ noteId: null, lineIndex: null });
                                            }
                                          }}
                                          className="flex-1 border border-gray-300 px-2 py-1 rounded mr-2 text-sm"
                                        />
                                        <button
                                          onClick={() => {
                                            const lines = note.content.split('\n');
                                            lines[idx] = `###${editedLineContent}###`;
                                            updateNote(note.id, lines.join('\n'));
                                            setEditingLine({ noteId: null, lineIndex: null });
                                          }}
                                          className="text-green-600 text-xs font-semibold mr-1 hover:underline"
                                        >
                                          Save
                                        </button>
                                        <button
                                          onClick={() => setEditingLine({ noteId: null, lineIndex: null })}
                                          className="text-red-500 text-xs font-semibold hover:underline"
                                        >
                                          Cancel
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        {(() => {
                                          const content = line.slice(4, -5);
                                          const mdMatch = content.match(/^\[(.+)\]\((https?:\/\/[^\s)]+)\)$/);
                                          if (mdMatch) {
                                            const [, text, url] = mdMatch;
                                            return (
                                              <a
                                                href={url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-1 text-blue-600 underline"
                                              >
                                                {text}
                                              </a>
                                            );
                                          } else {
                                            return (
                                              <span className="flex-1">
                                                {processContent(content, searchTerm, duplicatedUrlColors)}
                                              </span>
                                            );
                                          }
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
                                      <>
                                        <input
                                          type="text"
                                          value={editedLineContent}
                                          onChange={(e) => setEditedLineContent(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              const lines = note.content.split('\n');
                                              lines[idx] = `##${editedLineContent}##`;
                                              updateNote(note.id, lines.join('\n'));
                                              setEditingLine({ noteId: null, lineIndex: null });
                                            }
                                          }}
                                          className="flex-1 border border-gray-300 px-2 py-1 rounded mr-2 text-sm"
                                        />
                                        <button
                                          onClick={() => {
                                            const lines = note.content.split('\n');
                                            lines[idx] = `##${editedLineContent}##`;
                                            updateNote(note.id, lines.join('\n'));
                                            setEditingLine({ noteId: null, lineIndex: null });
                                          }}
                                          className="text-green-600 text-xs font-semibold mr-1 hover:underline"
                                        >
                                          Save
                                        </button>
                                        <button
                                          onClick={() => setEditingLine({ noteId: null, lineIndex: null })}
                                          className="text-red-500 text-xs font-semibold hover:underline"
                                        >
                                          Cancel
                                        </button>
                                      </>
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
                                    onMouseDown={() => {
                                      setDragSelecting(true);
                                      setDragStartIndex(idx);
                                      setDragEndIndex(idx);
                                    }}
                                    onMouseEnter={() => {
                                      if (dragSelecting) setDragEndIndex(idx);
                                    }}
                                    onMouseUp={() => setDragSelecting(false)}
                                    onContextMenu={(e) => {
                                      e.preventDefault();
                                      setRightClickNoteId(note.id);
                                      setRightClickIndex(idx);
                                      setRightClickPos({ x: e.clientX, y: e.clientY });
                                    }}
                                    className={`${(indentFlags[idx] || isListItem) ? 'pl-8 ' : ''}group cursor-text flex items-center justify-between ${(dragStartIndex !== null && idx >= Math.min(dragStartIndex, dragEndIndex) && idx <= Math.max(dragStartIndex, dragEndIndex)) ? 'bg-blue-100' : ''} ${rightClickNoteId === note.id && rightClickIndex === idx ? 'bg-yellow-100' : ''}`}
                                  >
                                    {editingLine.noteId === note.id && editingLine.lineIndex === idx ? (
                                      <>
                                        <input
                                          type="text"
                                          value={editedLineContent}
                                          onChange={(e) => setEditedLineContent(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              const lines = note.content.split('\n');
                                              lines[idx] = editedLineContent;
                                              updateNote(note.id, lines.join('\n'));
                                              setEditingLine({ noteId: null, lineIndex: null });
                                            }
                                          }}
                                          className="flex-1 border border-gray-300 px-2 py-1 rounded mr-2 text-sm"
                                        />
                                        <button
                                          onClick={() => {
                                            const lines = note.content.split('\n');
                                            lines[idx] = editedLineContent;
                                            updateNote(note.id, lines.join('\n'));
                                            setEditingLine({ noteId: null, lineIndex: null });
                                          }}
                                          className="text-green-600 text-xs font-semibold mr-1 hover:underline"
                                        >
                                          Save
                                        </button>
                                        <button
                                          onClick={() => setEditingLine({ noteId: null, lineIndex: null })}
                                          className="text-red-500 text-xs font-semibold hover:underline"
                                        >
                                          Cancel
                                        </button>
                                      </>
                                    ) : (
                                      <>
                                        {(indentFlags[idx] || isListItem) && (
                                          <span className="mr-2 text-3xl self-start leading-none">
                                            •
                                          </span>
                                        )}
                                        <span className="flex-1">
                                          {(() => {
                                            const raw = isListItem ? line.slice(2) : line;
                                            const elements = [];
                                            const regex = /(\*\*([^*]+)\*\*)|(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))|(https?:\/\/[^\s)]+)/g;
                                            let lastIndex = 0;
                                            let match;
                                            while ((match = regex.exec(raw)) !== null) {
                                              if (match.index > lastIndex) {
                                                elements.push(...[].concat(highlightMatches(raw.slice(lastIndex, match.index), searchTerm)));
                                              }
                                              if (match[1]) {
                                                elements.push(
                                                  <strong key={`bold-${idx}-${match.index}`}>
                                                    {match[2]}
                                                  </strong>
                                                );
                                              } else if (match[3] && match[4]) {
                                                // Markdown link [text](url)
                                                elements.push(
                                                  <a
                                                    key={`link-${idx}-${match.index}`}
                                                    href={match[5]}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-600 underline"
                                                  >
                                                    {match[4]}
                                                  </a>
                                                );
                                              } else if (match[6]) {
                                                // Plain URL
                                                try {
                                                  const host = new URL(match[6]).hostname.replace(/^www\./, '');
                                                  elements.push(
                                                    <a
                                                      key={`url-${idx}-${match.index}`}
                                                      href={match[6]}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="text-blue-600 underline"
                                                    >
                                                      {host}
                                                    </a>
                                                  );
                                                } catch {
                                                  elements.push(
                                                    <a
                                                      key={`url-fallback-${idx}-${match.index}`}
                                                      href={match[6]}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="text-blue-600 underline"
                                                    >
                                                      {match[6]}
                                                    </a>
                                                  );
                                                }
                                              }
                                              lastIndex = match.index + match[0].length;
                                            }
                                            if (lastIndex < raw.length) {
                                              elements.push(...[].concat(highlightMatches(raw.slice(lastIndex)), searchTerm));
                                            }
                                            return elements;
                                          })()}
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

                <div className="flex flex-wrap gap-2 px-4 pb-2">
                  {['meta::low', 'meta::medium', 'meta::high'].map((priority, index) =>
                    note.content.includes(priority) ? (
                      <button
                        key={index}
                        className="bg-gray-300 text-gray-800 text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1 hover:bg-gray-400"
                      >
                        {priority.replace('meta::', '')}
                        <span
                          onClick={() => {
                            const updatedContent = note.content
                              .split('\n')
                              .filter(line => !line.trim().startsWith(priority))
                              .join('\n')
                              .trim();
                            updateNote(note.id, updatedContent);
                          }}
                          className="ml-1 text-purple-600 hover:text-purple-900 cursor-pointer"
                          title="Remove tag"
                        >
                          ×
                        </span>
                      </button>
                    ) : null
                  )}
                  {note.content.includes('meta::todo') && (
                    <button
                      className="bg-gray-300 text-gray-800 text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1 hover:bg-gray-400"
                    >
                      todo
                      <span
                        onClick={() => {
                          const updatedContent = note.content
                            .split('\n')
                            .filter(line => !line.trim().startsWith('meta::todo'))
                            .join('\n')
                            .trim();
                          updateNote(note.id, updatedContent);
                        }}
                        className="ml-1 text-purple-600 hover:text-purple-900 cursor-pointer"
                        title="Remove tag"
                      >
                        ×
                      </span>
                    </button>
                  )}
                  {duplicateUrlNoteIds.has(note.id) && (
                    <span className="bg-gray-300 text-gray-800 text-xs font-semibold px-3 py-1 rounded-full hover:bg-gray-400">
                      Duplicate URL
                    </span>
                  )}
                  {duplicateWithinNoteIds.has(note.id) && (
                    <>
                      <span className="bg-gray-300 text-gray-800 text-xs font-semibold px-3 py-1 rounded-full hover:bg-gray-400">
                        Duplicate Url In Note
                      </span>
                      <button
                        onClick={() => {
                          const seen = new Set();
                          const cleanedContent = note.content.replace(/https?:\/\/[^\s)]+/g, url => {
                            if (seen.has(url)) return '';
                            seen.add(url);
                            return url;
                          });
                          updateNote(note.id, cleanedContent);
                        }}
                        className="ml-2 px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Remove Duplicates
                      </button>
                    </>
                  )}
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