import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Alerts } from './Alerts';

import ConfirmationModal from './ConfirmationModal';
import { updateNoteById, deleteNoteById, addNewNoteCommon, loadNotes } from '../utils/ApiUtils';
import { findDuplicatedUrls} from '../utils/genUtils';

import RightClickMenu from './RightClickMenu';
import EndDatePickerModal from './EndDatePickerModal';
import LinkNotesModal from './LinkNotesModal';
import TagSelectionPopup from './TagSelectionPopup';
import EditMeetingModal from './EditMeetingModal';
import AddEventModal from './AddEventModal';
import EditEventModal from './EditEventModal';
import TextPastePopup from './TextPastePopup';
import NoteCard from './NoteCard';
import {
  CalendarIcon,
  ClockIcon,
  XMarkIcon,
} from '@heroicons/react/24/solid';
import NoteEditor from './NoteEditor';
import AddPeopleModal from './AddPeopleModal';

// Regex to match dates in DD/MM/YYYY or DD Month YYYY format
export const clickableDateRegex = /(\b\d{2}\/\d{2}\/\d{4}\b|\b\d{2} [A-Za-z]+ \d{4}\b)/g;

const NotesList = ({
    objList,
    notes,
    allNotes,
    addNotes,
    updateNoteCallback,
    updateTotals,
    objects,
    addObjects,
    searchQuery,
    setSearchQuery,
    onWordClick,
    settings,
    activePage = 'notes'
}) => {
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
  const [showPastePopup, setShowPastePopup] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [newNoteText, setNewNoteText] = useState('');
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
  const [showingNormalEventEditor, setShowingNormalEventEditor] = useState(false);
  const [showRefreshMenu, setShowRefreshMenu] = useState(false);
  const notesListRef = useRef(null);
  const textareaRef = useRef(null);
  const refreshButtonRef = useRef(null);
  const [showAddPeopleModal, setShowAddPeopleModal] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState(null);
  const [isWatchSelected, setIsWatchSelected] = useState(false);

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
      const container = range.commonAncestorContainer;
      
      // Check if the selection is within our component
      if (!notesListRef.current?.contains(container)) {
        return;
      }

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
    Alerts.success('Tag created successfully');
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
    const notesListElement = notesListRef.current;
    if (notesListElement) {
      notesListElement.addEventListener('mouseup', handleTextSelection);
      return () => {
        notesListElement.removeEventListener('mouseup', handleTextSelection);
        if (popupTimeoutRef.current) {
          clearTimeout(popupTimeoutRef.current);
        }
      };
    }
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


  // Handle Cmd+Enter to save note
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (showPastePopup && (e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handlePasteSubmit();
      }
      // Add Escape key handler
      if (showPastePopup && e.key === 'Escape') {
        e.preventDefault();
        setShowPastePopup(false);
        setPasteText('');
        setNewNoteText('');
        setSelectedPriority(null);
        setIsWatchSelected(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPastePopup, newNoteText, pasteText]);

  const handlePasteSubmit = async () => {
    try {
      // Get current date in YYYY-MM-DD format
      const now = new Date();
      const year = now.getFullYear();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      const noteDate = `${year}-${month}-${day}`;

      // Format datetime for meta tags (dd/mm/yyyy, hh:mm am/pm)
      const hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'pm' : 'am';
      const formattedHours = hours % 12 || 12;
      const formattedDateTime = `${day}/${month}/${year}, ${formattedHours}:${minutes} ${ampm}`;

      // Get the first line from clipboard content
      const firstClipboardLine = pasteText.split('\n')[0].trim();
      
      // Create the note with textbox content and first line from clipboard
      let noteContent = `${newNoteText.trim()}\n${firstClipboardLine}`;
      
      // Add comments for selections
      let comments = [];
      if (selectedPriority) {
        comments.push(`Marked as todo - priority ${selectedPriority}`);
      }
      if (isWatchSelected) {
        comments.push('Added to watch list');
      }
      if (comments.length > 0) {
        noteContent += '\n\n' + comments.join(', ');
      }
      
      // Add todo meta tag if priority is selected
      if (selectedPriority) {
        noteContent += `\nmeta::todo::${formattedDateTime}`;
        noteContent += `\nmeta::${selectedPriority}`;
      }
      
      // Add watch meta tag if watch is selected
      if (isWatchSelected) {
        noteContent += `\nmeta::watch::${formattedDateTime}`;
      }
      
      // Add review pending tag
      noteContent += '\nmeta::review_pending';
      
      const newNote = await addNewNoteCommon(noteContent, [], noteDate);
      
      // Refresh the notes list with the current search query and date
      const data = await loadNotes(searchQuery, noteDate);
      updateNoteCallback(data.notes || []);
      updateTotals(data.totals || 0);
      
      setShowPastePopup(false);
      setPasteText('');
      setNewNoteText('');
      setSelectedPriority(null);
      setIsWatchSelected(false);
      Alerts.success('Note created successfully');
    } catch (error) {
      console.error('Error creating note:', error);
      Alerts.error('Failed to create note');
    }
  };

  const handleContextMenu = (e, note) => {
    e.preventDefault();
    setRightClickNoteId(note.id);
    setRightClickPos({ x: e.clientX, y: e.clientY });
  };

  return (
    <div ref={notesListRef} className="relative">
      <div className="mb-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
        </div>
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
    
      {/* Only show pinned section when on notes page */}
      {activePage === 'notes' ? (
        <>
          {safeNotes.filter(note => note.pinned).length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Pinned Notes</h2>
              <div className="grid grid-cols-1 gap-4">
                {safeNotes.filter(note => note.pinned).map((note) => (
                  <NoteCard
                    key={note.id}
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
                    urlToNotesMap={urlToNotesMap}
                    updateNoteCallback={updateNoteCallback}
                    showCreatedDate={settings.showCreatedDate || false}
                    setShowEndDatePickerForNoteId={setShowEndDatePickerForNoteId}
                    handleDelete={handleDelete}
                    setLinkingNoteId={setLinkingNoteId}
                    setLinkSearchTerm={setLinkSearchTerm}
                    setLinkPopupVisible={setLinkPopupVisible}
                    selectedNotes={selectedNotes}
                    toggleNoteSelection={toggleNoteSelection}
                    allNotes={allNotes}
                    onNavigate={scrollToNote}
                    onContextMenu={handleContextMenu}
                    isMeetingNote={isMeetingNote}
                    isEventNote={isEventNote}
                    setEditingMeetingNote={setEditingMeetingNote}
                    setEditingEventNote={setEditingEventNote}
                    duplicateUrlNoteIds={duplicateUrlNoteIds}
                    duplicateWithinNoteIds={duplicateWithinNoteIds}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Regular notes section */}
          <div className="space-y-4">
            {safeNotes.filter(note => !note.pinned).length > 0 && (
              <h2 className="text-lg font-semibold text-gray-900">Other Notes</h2>
            )}
            <div className="grid grid-cols-1 gap-4">
              {safeNotes.filter(note => !note.pinned).map(note => (
                <NoteCard
                  key={note.id}
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
                  urlToNotesMap={urlToNotesMap}
                  updateNoteCallback={updateNoteCallback}
                  showCreatedDate={settings.showCreatedDate || false}
                  setShowEndDatePickerForNoteId={setShowEndDatePickerForNoteId}
                  handleDelete={handleDelete}
                  setLinkingNoteId={setLinkingNoteId}
                  setLinkSearchTerm={setLinkSearchTerm}
                  setLinkPopupVisible={setLinkPopupVisible}
                  selectedNotes={selectedNotes}
                  toggleNoteSelection={toggleNoteSelection}
                  allNotes={allNotes}
                  onNavigate={scrollToNote}
                  onContextMenu={handleContextMenu}
                  isMeetingNote={isMeetingNote}
                  isEventNote={isEventNote}
                  setEditingMeetingNote={setEditingMeetingNote}
                  setEditingEventNote={setEditingEventNote}
                  duplicateUrlNoteIds={duplicateUrlNoteIds}
                  duplicateWithinNoteIds={duplicateWithinNoteIds}
                />
              ))}
            </div>
          </div>
        </>
      ) : (
        // When not on notes page, render all notes without pinned/unpinned sections
        <div className="grid grid-cols-1 gap-4">
          {safeNotes.map(note => (
            <NoteCard
              key={note.id}
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
              urlToNotesMap={urlToNotesMap}
              updateNoteCallback={updateNoteCallback}
              showCreatedDate={settings.showCreatedDate || false}
              setShowEndDatePickerForNoteId={setShowEndDatePickerForNoteId}
              handleDelete={handleDelete}
              setLinkingNoteId={setLinkingNoteId}
              setLinkSearchTerm={setLinkSearchTerm}
              setLinkPopupVisible={setLinkPopupVisible}
              selectedNotes={selectedNotes}
              toggleNoteSelection={toggleNoteSelection}
              allNotes={allNotes}
              onNavigate={scrollToNote}
              onContextMenu={handleContextMenu}
              isMeetingNote={isMeetingNote}
              isEventNote={isEventNote}
              setEditingMeetingNote={setEditingMeetingNote}
              setEditingEventNote={setEditingEventNote}
              duplicateUrlNoteIds={duplicateUrlNoteIds}
              duplicateWithinNoteIds={duplicateWithinNoteIds}
            />
          ))}
        </div>
      )}

      <ConfirmationModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onConfirm={confirmDelete}
      />

      {isPopupVisible && (
        <TagSelectionPopup
          visible={isPopupVisible}
          position={popupPosition}
          selectedText={selectedText}
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
          notes={allNotes}
          updateNote={updateNote}
          setRightClickText={setRightClickText}
          setEditedLineContent={setEditedLineContent}
          setEditingLine={setEditingLine}
          setShowCopyToast={setShowCopyToast}
        />
      )}


      <AddEventModal
        isOpen={showAddEventModal}
        onClose={() => setShowAddEventModal(false)}
        onAdd={(content) => {
          addNotes(content);
          setShowAddEventModal(false);
        }}
        notes={allNotes}
      />

      {editingMeetingNote && (
        <EditMeetingModal
          note={editingMeetingNote}
          onSave={(updatedNote) => {
            updateNote(editingMeetingNote.id, updatedNote.content);
            setEditingMeetingNote(null);
          }}
          onCancel={() => setEditingMeetingNote(null)}
          onSwitchToNormalEdit={() => {
            setEditingMeetingNote(null);
            setPopupNoteText(editingMeetingNote.id);
          }}
        />
      )}

      {editingEventNote && (
        showingNormalEventEditor ? (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800">Edit Note</h2>
              </div>
              <NoteEditor
                note={editingEventNote}
                onSave={(updatedNote) => {
                  updateNote(updatedNote.id, updatedNote.content);
                  setEditingEventNote(null);
                  setShowingNormalEventEditor(false);
                }}
                onCancel={() => {
                  setEditingEventNote(null);
                  setShowingNormalEventEditor(false);
                }}
                objList={objList}
              />
            </div>
          </div>
        ) : (
          <EditEventModal
            note={editingEventNote}
            onClose={() => setEditingEventNote(null)}
            onSave={(updatedNote) => {
              updateNote(updatedNote.id, updatedNote.content);
              // Update the notes list immediately after successful update
              const updatedNotes = notes.map(note => 
                note.id === updatedNote.id ? { ...note, content: updatedNote.content } : note
              );
              updateNoteCallback(updatedNotes);
              setEditingEventNote(null);
            }}
            onCancel={() => setEditingEventNote(null)}
            onSwitchToNormalEdit={() => setShowingNormalEventEditor(true)}
          />
        )
      )}

      {popupNoteText && (
        <div className="mt-4 mb-4 bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">Edit Note</h2>
            <button
              onClick={() => setPopupNoteText(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
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
      )}

      {showPastePopup && (
        <TextPastePopup
          isOpen={showPastePopup}
          onClose={() => {
            setShowPastePopup(false);
            setPasteText('');
            setNewNoteText('');
            setSelectedPriority(null);
            setIsWatchSelected(false);
          }}
          newNoteText={newNoteText}
          setNewNoteText={setNewNoteText}
          pasteText={pasteText}
          selectedPriority={selectedPriority}
          setSelectedPriority={setSelectedPriority}
          isWatchSelected={isWatchSelected}
          setIsWatchSelected={setIsWatchSelected}
          onSave={handlePasteSubmit}
          textareaRef={textareaRef}
        />
      )}

      <AddPeopleModal
        isOpen={showAddPeopleModal}
        onClose={() => setShowAddPeopleModal(false)}
        onAdd={async (content) => {
          const newNote = await addNotes(content);
          setShowAddPeopleModal(false);
          return newNote;
        }}
        allNotes={allNotes || notes}
      />

    </div>
  );
};

export default NotesList;