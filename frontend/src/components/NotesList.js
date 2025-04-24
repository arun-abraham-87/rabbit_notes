import React, { useState, useEffect, useRef, useMemo } from 'react';
import { toast } from 'react-toastify';

import ConfirmationModal from './ConfirmationModal';
import { updateNoteById, deleteNoteById } from '../utils/ApiUtils';
import { findDuplicatedUrls} from '../utils/genUtils';

import RightClickMenu from './RighClickMenu';
import NoteFooter from './NoteFooter';
import LinkedNotesSection from './LinkedNotesSection';
import EndDatePickerModal from './EndDatePickerModal';
import LinkNotesModal from './LinkNotesModal';
import NoteMetaInfo from './NoteMetaInfo';
import TagSelectionPopup from './TagSelectionPopup';
import InlineEditor from './InlineEditor';
import NoteTagBar from './NoteTagBar';
import NoteContent from './NoteContent';
import AddMeetingModal from './AddMeetingModal';
import EditMeetingModal from './EditMeetingModal';
import AddEventModal from './AddEventModal';
import EditEventModal from './EditEventModal';
import { CalendarIcon, ClockIcon } from '@heroicons/react/24/solid';
import NoteEditor from './NoteEditor';

// Regex to match dates in DD/MM/YYYY or DD Month YYYY format
export const clickableDateRegex = /(\b\d{2}\/\d{2}\/\d{4}\b|\b\d{2} [A-Za-z]+ \d{4}\b)/g;

const NotesList = ({ objList, notes, allNotes, addNotes, updateNoteCallback, updateTotals, objects, addObjects, searchQuery, setSearchQuery, settings = {} }) => {
  const [isModalOpen, setModalOpen] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState(null);
  const [selectedText, setSelectedText] = useState('');
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [isPopupVisible, setPopupVisible] = useState(false);
  const [selectedNotes, setSelectedNotes] = useState([]);
  const [popupNoteText, setPopupNoteText] = useState(null);
  const [linkingNoteId, setLinkingNoteId] = useState(null);
  const [linkSearchTerm, setLinkSearchTerm] = useState('');
  const [linkPopupVisible, setLinkPopupVisible] = useState(false);
  const popupTimeoutRef = useRef(null);
  const safeNotes = notes || [];
  const [showEndDatePickerForNoteId, setShowEndDatePickerForNoteId] = useState(null);
  const [editingInlineDate, setEditingInlineDate] = useState({
    noteId: null,
    lineIndex: null,
    originalDate: ''
  });
  const [rightClickText, setRightClickText] = useState(null);
  const [rightClickPos, setRightClickPos] = useState({ x: 0, y: 0 });
  const [rightClickNoteId, setRightClickNoteId] = useState(null);
  const [rightClickIndex, setRightClickIndex] = useState(null);
  const [editingLine, setEditingLine] = useState({ noteId: null, lineIndex: null });
  const [editedLineContent, setEditedLineContent] = useState('');
  const [addingLineNoteId, setAddingLineNoteId] = useState(null);
  const [newLineText, setNewLineText] = useState('');
  const newLineInputRef = useRef(null);
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [showAddMeetingModal, setShowAddMeetingModal] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [editingMeetingNote, setEditingMeetingNote] = useState(null);
  const [editingEventNote, setEditingEventNote] = useState(null);

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

  const updateNote = async (id, updatedContent) => {
    try {
      await updateNoteById(id, updatedContent);
      // Update the notes list immediately after successful update
      const updatedNotes = notes.map(note => 
        note.id === id ? { ...note, content: updatedContent } : note
      );
      updateNoteCallback(updatedNotes);
    } catch (error) {
      console.error('Error updating note:', error);
    }
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

  const handleInlineDateSelect = (noteId, lineIndex, dateValue) => {
    const [year, month, day] = dateValue.split('-');
    const dateStr = `${day}/${month}/${year}`;
    const noteToUpdate = notes.find(n => n.id === noteId);
    const lines = noteToUpdate.content.split('\n');
    lines[lineIndex] = lines[lineIndex].replace(editingInlineDate.originalDate, dateStr);
    updateNote(noteId, lines.join('\n'));
    setEditingInlineDate({ noteId: null, lineIndex: null, originalDate: '' });
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
      
      // Calculate position relative to the viewport
      const viewportX = rect.left;
      const viewportY = rect.top;
      
      // Add scroll offset to get the absolute position
      const x = viewportX + window.scrollX;
      const y = viewportY + window.scrollY;
      
      // Position the popup above the selected text with some offset
      setPopupPosition({
        x: x,
        y: y - 40, // Position slightly above the text
      });

      if (popupTimeoutRef.current) {
        clearTimeout(popupTimeoutRef.current);
      }

      // Show popup immediately on selection
      setPopupVisible(true);
    } else {
      setPopupVisible(false);
    }
  };

  const handleConvertToTag = () => {
    addObjects(selectedText);
    setPopupVisible(false);
    toast.success('Tag created successfully');
  };

  const handleSearch = () => {
    if (setSearchQuery) {
      setSearchQuery(selectedText);
      setPopupVisible(false);
      // Find and focus the search input
      const searchInput = document.querySelector('input[type="search"]');
      if (searchInput) {
        searchInput.value = selectedText;
        searchInput.focus();
      }
    }
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
      const notesToMerge = notes.filter(note => selectedNotes.includes(note.id));
      if (notesToMerge.length === 0) return;
      const mergedContent = notesToMerge.map(note => note.content).join('\n\n');
      const allTags = notesToMerge.flatMap(note => note.tags || []);
      const uniqueTags = [...new Set(allTags)];
      for (const note of notesToMerge) {
        await deleteNoteById(note.id);
      }
      await addNotes(mergedContent, uniqueTags);
      setSelectedNotes([]);
    } catch (error) {
      console.error("Error while merging notes:", error);
    }
  };

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

  // Show ephemeral popup when copying from right-click menu
  useEffect(() => {
    if (rightClickText === 'copied') {
      setShowCopyToast(true);
      const timer = setTimeout(() => {
        setShowCopyToast(false);
      }, 1500);
      return () => clearTimeout(timer);
    } else {
      setShowCopyToast(false);
    }
  }, [rightClickText]);

  useEffect(() => {
    if (!showCopyToast) {
      setRightClickText(null);
    }
  }, [showCopyToast]);

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
        setPopupVisible(false); // Also dismiss the tag selection popup
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // Helper function to check if a note is a meeting note
  const isMeetingNote = (note) => {
    return note.content.includes('meta::meeting::');
  };

  // Helper function to check if a note is an event note
  const isEventNote = (note) => {
    return note.content.includes('meta::event::');
  };

  return (
    <div className="relative">
      <div className="mb-4 flex justify-end gap-3">
        <button
          onClick={() => setShowAddEventModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors shadow-sm"
        >
          <ClockIcon className="h-5 w-5" />
          <span>Add Event</span>
        </button>
        <button
          onClick={() => setShowAddMeetingModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors shadow-sm"
        >
          <CalendarIcon className="h-5 w-5" />
          <span>Add Meeting</span>
        </button>
      </div>
      {showCopyToast && (
        <div className="fixed bottom-4 right-4 bg-black text-white text-sm px-3 py-1 rounded shadow-lg z-50">
          Copied to clipboard
        </div>
      )}
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
    
      {safeNotes
        .map(note => {
         
          return (
            <div
              key={note.id}
              onContextMenu={(e) => {
                e.preventDefault();
                setRightClickNoteId(note.id);
                setRightClickPos({ x: e.clientX, y: e.clientY });
              }}
              className="group flex flex-col p-6 mb-5 rounded-lg bg-neutral-50 border border-slate-200 ring-1 ring-slate-100 relative"
            >
              <div className="flex flex-col flex-auto">
                {/* Layer 1: Content and Edit/Delete */}
                <div className="p-2">
                  < NoteMetaInfo
                    note={note}
                    setShowEndDatePickerForNoteId={setShowEndDatePickerForNoteId}
                    urlToNotesMap={urlToNotesMap}
                    updateNoteCallback={updateNoteCallback}
                  />
                  <NoteContent
                    note={note}
                    searchQuery={searchQuery}
                    duplicatedUrlColors={duplicatedUrlColors}
                    editingLine={editingLine}
                    setEditingLine={setEditingLine}
                    editedLineContent={editedLineContent}
                    setEditedLineContent={setEditedLineContent}
                    rightClickNoteId={rightClickNoteId}
                    rightClickIndex={rightClickIndex}
                    setRightClickNoteId={setRightClickNoteId}
                    setRightClickIndex={setRightClickIndex}
                    setRightClickPos={setRightClickPos}
                    editingInlineDate={editingInlineDate}
                    setEditingInlineDate={setEditingInlineDate}
                    handleInlineDateSelect={handleInlineDateSelect}
                    popupNoteText={popupNoteText}
                    setPopupNoteText={setPopupNoteText}
                    objList={objList}
                    addingLineNoteId={addingLineNoteId}
                    setAddingLineNoteId={setAddingLineNoteId}
                    newLineText={newLineText}
                    setNewLineText={setNewLineText}
                    newLineInputRef={newLineInputRef}
                    updateNote={updateNote}
                  />
                </div>
                <div>
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
                  showCreatedDate={settings.showCreatedDate || false}
                  setShowEndDatePickerForNoteId={setShowEndDatePickerForNoteId}
                  handleDelete={handleDelete}
                  setPopupNoteText={(noteId) => {
                    if (isMeetingNote(note)) {
                      setEditingMeetingNote(note);
                    } else if (isEventNote(note)) {
                      setEditingEventNote(note);
                    } else {
                      setPopupNoteText(noteId);
                    }
                  }}
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
          onSearch={handleSearch}
          onCancel={handleCancelPopup}
        />
      )}

      {linkPopupVisible && (
        <LinkNotesModal
          visible={linkPopupVisible}
          notes={allNotes || notes}
          linkingNoteId={linkingNoteId}
          searchTerm={linkSearchTerm}
          onSearchTermChange={setLinkSearchTerm}
          onLink={(fromId, toId) => {
            const source = allNotes.find(n => n.id === fromId) || notes.find(n => n.id === fromId);
            const target = allNotes.find(n => n.id === toId) || notes.find(n => n.id === toId);
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
          setRightClickText={setRightClickText}
          setEditedLineContent={setEditedLineContent}
          setEditingLine={setEditingLine}
          setShowCopyToast={setShowCopyToast}
        />
      )}

      <AddMeetingModal
        isOpen={showAddMeetingModal}
        onClose={() => setShowAddMeetingModal(false)}
        onAdd={(content) => {
          addNotes(content);
          setShowAddMeetingModal(false);
        }}
      />

      <AddEventModal
        isOpen={showAddEventModal}
        onClose={() => setShowAddEventModal(false)}
        onAdd={(content) => {
          addNotes(content);
          setShowAddEventModal(false);
        }}
      />

      {editingMeetingNote && (
        <EditMeetingModal
          note={editingMeetingNote}
          onClose={() => setEditingMeetingNote(null)}
          onSave={(updatedContent) => {
            updateNote(editingMeetingNote.id, updatedContent);
            setEditingMeetingNote(null);
          }}
        />
      )}

      {editingEventNote && (
        <EditEventModal
          note={editingEventNote}
          onClose={() => setEditingEventNote(null)}
          onSave={(updatedContent) => {
            updateNote(editingEventNote.id, updatedContent);
            setEditingEventNote(null);
          }}
        />
      )}

      {popupNoteText && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Edit Note</h2>
            </div>
            <NoteEditor
              note={notes.find(n => n.id === popupNoteText)}
              onSave={(updatedNote) => {
                updateNote(updatedNote.id, updatedNote.content);
                setPopupNoteText(null);
              }}
              onCancel={() => setPopupNoteText(null)}
              objList={objList}
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default NotesList;