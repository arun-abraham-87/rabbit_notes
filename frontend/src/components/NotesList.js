import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PencilIcon, TrashIcon, EyeIcon, EyeSlashIcon, XCircleIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import { processContent } from '../utils/TextUtils';
import ConfirmationModal from './ConfirmationModal';
import { formatDate } from '../utils/DateUtils';
import { updateNoteById, deleteNoteById } from '../utils/ApiUtils';
import NoteEditor from './NoteEditor';
const formatAndAgeDate = (text) => {
  const dateRegex = /\b(\d{2})\/(\d{2})\/(\d{4})\b|\b(\d{2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4})\b/g;
    return text.replace(dateRegex, (match, d1, m1, y1, d2, monthStr, y2) => {
      let date;
      if (d1 && m1 && y1) {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        date = new Date(`${y1}-${m1}-${d1}`);
        const formatted = `${d1} ${months[parseInt(m1) - 1]} ${y1}`;
        const now = new Date();
        let diff = now - date;
        let inFuture = diff < 0;
        diff = Math.abs(diff);
        const diffDate = new Date(diff);
        const years = diffDate.getUTCFullYear() - 1970;
        const monthsDiff = diffDate.getUTCMonth();
        const days = diffDate.getUTCDate() - 1;
        let parts = [];
        if (years > 0) parts.push(`${years} yr${years > 1 ? 's' : ''}`);
        if (monthsDiff > 0) parts.push(`${monthsDiff} month${monthsDiff > 1 ? 's' : ''}`);
        if (days > 0 || parts.length === 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
        const ageStr = inFuture ? `(in ${parts.join(' ')})` : `(${parts.join(' ')} ago)`;
        return `${formatted} ${ageStr}`;
      } else if (d2 && monthStr && y2) {
        date = new Date(`${monthStr} ${d2}, ${y2}`);
        const formatted = `${d2} ${monthStr} ${y2}`;
        const now = new Date();
        let diff = now - date;
        let inFuture = diff < 0;
        diff = Math.abs(diff);
        const diffDate = new Date(diff);
        const years = diffDate.getUTCFullYear() - 1970;
        const monthsDiff = diffDate.getUTCMonth();
        const days = diffDate.getUTCDate() - 1;
        let parts = [];
        if (years > 0) parts.push(`${years} yr${years > 1 ? 's' : ''}`);
        if (monthsDiff > 0) parts.push(`${monthsDiff} month${monthsDiff > 1 ? 's' : ''}`);
        if (days > 0 || parts.length === 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
        const ageStr = inFuture ? `(in ${parts.join(' ')})` : `(${parts.join(' ')} ago)`;
        return `${formatted} ${ageStr}`;
    }
    return match;
  });
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
      {notes
        .map(note => {
          const urls = note.content.match(urlPattern) || [];
          urls.forEach((url) => {
            if (!urlToNotesMap[url]) urlToNotesMap[url] = [];
            urlToNotesMap[url].push(note.id);
          });
          return note;
        })
        .filter(note => safeNotes.some(n => n.id === note.id))
        .map(note => {
          const endDateMatch = note.content.match(/meta::end_date::([^\n]+)/);
          const parsedEndDate = endDateMatch ? new Date(endDateMatch[1]) : null;
          let endDateNotice = '';
          const todoDateMatch = note.content.match(/meta::todo::([^\n]+)/);
          let todoAgeNotice = '';
          if (todoDateMatch) {
            const todoDate = new Date(todoDateMatch[1]);
            const now = new Date();
            let diff = now - todoDate;
            if (diff > 0) {
              const diffDate = new Date(diff);
              const years = diffDate.getUTCFullYear() - 1970;
              const months = diffDate.getUTCMonth();
              const days = diffDate.getUTCDate() - 1;
              const parts = [];
              if (years > 0) parts.push(`${years} yr${years > 1 ? 's' : ''}`);
              if (months > 0) parts.push(`${months} month${months > 1 ? 's' : ''}`);
              if (days > 0 || parts.length === 0) parts.push(`${days} day${days > 1 ? 's' : ''}`);
              todoAgeNotice = `Open for: ${parts.join(' ')}`;
            }
          }
          if (parsedEndDate) {
            const now = new Date();
            const diffMs = parsedEndDate - now;
            if (diffMs > 0) {
              const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
              const days = Math.floor(totalHours / 24);
              const hours = totalHours % 24;
              endDateNotice = `Deadline in ${days} day${days !== 1 ? 's' : ''}${hours > 0 ? ` and ${hours} hour${hours !== 1 ? 's' : ''}` : ''}`;
            }
          }
          return (
        <div
          key={note.id}
          className={`flex flex-col p-5 mb-5 rounded-xl border ${
            note.content.toLowerCase().includes('meta::todo') ? 'border-purple-500' : 'border-gray-200'
          } bg-white shadow hover:shadow-md transition-shadow duration-200`}
        >
          <div className="flex flex-col flex-auto">
            {/* Layer 1: Content and Edit/Delete */}
            <div className="p-2">
              {todoAgeNotice && (
                <div className="text-sm text-green-700 font-semibold mb-2 px-2">
                  {todoAgeNotice}
                </div>
              )}
              {endDateNotice && (
                <div className="text-sm text-red-600 font-semibold mb-2 px-2">
                  {endDateNotice}
                </div>
              )}
              <div className="bg-gray-50 p-4 rounded-md border text-gray-800 text-sm leading-relaxed">
                {(() => {
                  const lines = note.content.split('\n').filter(line => !line.trim().startsWith('meta::'));
                  const firstLine = lines[0];
                  const rest = lines.slice(1).join('\n');
                  const isTitle = firstLine.startsWith('##') && firstLine.endsWith('##');
                  const title = isTitle ? firstLine.replace(/^##|##$/g, '') : null;
                  const contentToRender = isTitle ? rest : lines.join('\n');
                  const endDateMatch = note.content.match(/meta::end_date::([^\n]+)/);
                  const parsedEndDate = endDateMatch ? new Date(endDateMatch[1]) : null;
 
                  return (
                    <>
                      {isTitle && <h2 className="text-lg font-semibold text-purple-700 mb-2">{title}</h2>}
                      <pre className="whitespace-pre-wrap">
                        {contentToRender
                          .split('\n')
                          .filter(line => !line.match(/^!\[pasted image\]\((.*?)\)$/))
                          .join('\n')
                          .split(/(\[[^\]]+\]\(https?:\/\/[^\s)]+\)|https?:\/\/[^\s]+)/g)
                          .map((part, idx) => {
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
                          if (searchTerm && typeof part === 'string') {
                            const keywords = searchTerm.trim().split(/\s+/).filter(Boolean);
                            if (keywords.length) {
                              const regex = new RegExp(`(${keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
                              const segments = part.split(regex);
                              return segments.map((seg, i) =>
                                keywords.some(kw => seg.toLowerCase() === kw.toLowerCase()) ? (
                                  <mark key={i} className="bg-yellow-200">{seg}</mark>
                                ) : (
                                  seg
                                )
                              );
                            }
                          }
                          return formatAndAgeDate(part);
                        })}
                      </pre>
                      {popupNoteText === note.id && (
                        <div className="mt-2">
                          <NoteEditor
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

            <div className="flex flex-wrap gap-2 px-4 pb-2">
              {(note.content.match(/(?:^|\s)#\w+/g) || [])
                .filter(tag => tag.trim().startsWith('#'))
                .map((tag, index) => (
                  <button
                    key={index}
                    className="bg-purple-100 text-purple-800 text-xs font-medium px-3 py-1 rounded-full hover:bg-purple-200"
                  >
                    {tag.trim()}
                  </button>
              ))}
              {duplicateUrlNoteIds.has(note.id) && (
                <span className="bg-red-100 text-red-800 text-xs font-semibold px-3 py-1 rounded-full">
                  Duplicate URL
                </span>
              )}
              {duplicateWithinNoteIds.has(note.id) && (
                <>
                  <span className="bg-yellow-100 text-yellow-800 text-xs font-semibold px-3 py-1 rounded-full">
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
              {parsedEndDate && (
                <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full">
                  Ends: {parsedEndDate.toLocaleString()}
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
                  {note.content.toLowerCase().includes('meta::todo') ? (
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <button
                          className="bg-green-100 text-green-800 px-2 py-1 text-xs rounded hover:bg-green-200"
                          onClick={() => {
                            const updated = note.content.replace(/#(low|medium|high)/gi, '').trim() + ' #low';
                            updateNote(note.id, updated);
                          }}
                        >
                          Low
                        </button>
                        <button
                          className="bg-yellow-100 text-yellow-800 px-2 py-1 text-xs rounded hover:bg-yellow-200"
                          onClick={() => {
                            const updated = note.content.replace(/#(low|medium|high)/gi, '').trim() + ' #medium';
                            updateNote(note.id, updated);
                          }}
                        >
                          Medium
                        </button>
                        <button
                          className="bg-red-100 text-red-800 px-2 py-1 text-xs rounded hover:bg-red-200"
                          onClick={() => {
                            const updated = note.content.replace(/#(low|medium|high)/gi, '').trim() + ' #high';
                            updateNote(note.id, updated);
                          }}
                        >
                          High
                        </button>
                      </div>
                      <div className="group relative">
                        <XCircleIcon
                          title="Unmark as Todo"
                          className="h-4 w-4 text-purple-600 cursor-pointer group-hover:scale-150 transition-transform duration-200 ease-in-out hover:text-purple-800"
                          onClick={() => {
                            const updatedContent = note.content
                              .replace(/meta::todo::[^\n]*/gi, '')
                              .replace(/#(low|medium|high)/gi, '')
                              .trim();
                            updateNote(note.id, updatedContent);
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="group relative">
                      <CheckCircleIcon
                        title="Mark as Todo"
                        className="h-4 w-4 text-purple-600 cursor-pointer group-hover:scale-150 transition-transform duration-200 ease-in-out hover:text-purple-800"
                        onClick={() => {
                          const timestamp = new Date().toISOString();
                          const contentWithoutOldTodoMeta = note.content
                            .split('\n')
                            .filter(line => !line.trim().startsWith('meta::todo::'))
                            .join('\n')
                            .trim();
                          const newContent = `${contentWithoutOldTodoMeta}\nmeta::todo::${timestamp}`;
                          updateNote(note.id, newContent);
                        }}
                      />
                    </div>
                  )}
                  {note.content.toLowerCase().includes('#watch') ? (
                    <div className="group relative">
                      <EyeSlashIcon
                        title="Unmark from Watchlist"
                        className="h-4 w-4 text-yellow-600 cursor-pointer group-hover:scale-150 transition-transform duration-200 ease-in-out hover:text-yellow-800"
                        onClick={() => {
                          const updatedContent = note.content.replace(/#watch/gi, '').trim();
                          updateNote(note.id, updatedContent);
                        }}
                      />
                    </div>
                  ) : (
                    <div className="group relative">
                      <EyeIcon
                        title="Add to Watchlist"
                        className="h-4 w-4 text-yellow-600 cursor-pointer group-hover:scale-150 transition-transform duration-200 ease-in-out hover:text-yellow-800"
                        onClick={() => {
                          updateNote(note.id, `${note.content.trim()} #watch`);
                        }}
                      />
                    </div>
                  )}
                  <div className="group relative">
                    <PencilIcon
                      className="h-4 w-4 text-gray-600 cursor-pointer group-hover:scale-150 transition-transform duration-200 ease-in-out hover:text-gray-800"
                      onClick={() => setPopupNoteText(note.id)}
                    />
                  </div>
                  <div className="group relative">
                    <TrashIcon
                      className="h-4 w-4 text-gray-600 cursor-pointer group-hover:scale-150 transition-transform duration-200 ease-in-out hover:text-gray-800"
                      onClick={() => handleDelete(note.id)}
                    />
                  </div>
                  {note.content.toLowerCase().includes('meta::todo') && (
                    <div className="group relative">
                      <button
                        title="Set End Date"
                        onClick={() => setShowEndDatePickerForNoteId(note.id)}
                        className="text-gray-600 hover:text-blue-700 text-base"
                      >
                        📅
                      </button>
                    </div>
                  )}
                  <div className="group relative">
                    <button
                      title="Link Note"
                      onClick={() => {
                        setLinkingNoteId(note.id);
                        setLinkSearchTerm('');
                        setLinkPopupVisible(true);
                      }}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Link Notes
                    </button>
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
      )})}

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

      
      {popupImageUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
            <div
              ref={popupContainerRef}
              className="relative bg-white p-4 rounded shadow-lg resize overflow-auto"
              style={{ width: 'auto', height: 'auto' }}
            >
            {popupImageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80">
                <div className="w-10 h-10 animate-spin border-4 border-purple-600 border-t-transparent rounded-full" />
              </div>
            )}
            <div className="flex justify-center gap-2 mb-2">
              {[0.5, 1, 1.5, 2.5].map((scale) => (
                <button
                  key={scale}
                  onClick={() => setPopupImageScale(scale)}
                  className="px-3 py-1 text-sm bg-purple-100 text-purple-800 rounded hover:bg-purple-200"
                >
                  {Math.round(scale * 100)}%
                </button>
              ))}
            </div>
            <img
              src={popupImageUrl}
              alt="Full"
              style={{
                width: popupContainerRef.current ? `${popupContainerRef.current.offsetWidth * popupImageScale}px` : 'auto',
                height: 'auto'
              }}
              className="max-w-screen-md max-h-screen object-contain"
              onLoad={() => setPopupImageLoading(false)}
            />
            <button
              onClick={() => setPopupImageUrl(null)}
              className="absolute top-2 right-2 bg-gray-800 text-white px-2 py-1 rounded hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    
    {linkPopupVisible && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white p-4 rounded shadow max-w-md w-full">
          <input
            type="text"
            placeholder="Search notes to link..."
            value={linkSearchTerm}
            onChange={(e) => setLinkSearchTerm(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded mb-3"
          />
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {safeNotes
              .filter(n => n.id !== linkingNoteId && n.content.toLowerCase().includes(linkSearchTerm.toLowerCase()))
              .slice(0, 5)
              .map(n => (
                <div key={n.id} className="flex justify-between items-center p-2 border rounded">
                  <span className="text-sm text-gray-800 line-clamp-1">{n.content.slice(0, 50)}...</span>
                  <button
                    onClick={() => {
                      alert(`Note ${linkingNoteId} linked with Note ${n.id}`);
                      setLinkPopupVisible(false);
                      setLinkingNoteId(null);
                      setLinkSearchTerm('');
                      updateNoteCallback([...notes]); // Simulate a refresh
                    }}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Link
                  </button>
                </div>
              ))}
          </div>
          <div className="flex justify-end mt-3">
            <button
              onClick={() => {
                setLinkPopupVisible(false);
                setLinkingNoteId(null);
                setLinkSearchTerm('');
              }}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}
    {showEndDatePickerForNoteId && (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div className="bg-white p-4 rounded shadow-md">
          <input
            type="datetime-local"
            onChange={(e) => handleEndDateSelect(showEndDatePickerForNoteId, e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm"
          />
          <button
            onClick={() => setShowEndDatePickerForNoteId(null)}
            className="ml-2 text-sm text-red-500 hover:underline"
          >
            Cancel
          </button>
        </div>
      </div>
    )}
    </div>
  );
};

export default NotesList;