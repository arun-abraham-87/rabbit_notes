import React, { useState, useEffect } from 'react';
import NoteMetaInfo from './NoteMetaInfo';
import NoteContent from './NoteContent';
import NoteTagBar from './NoteTagBar';
import NoteFooter from './NoteFooter';
import LinkedNotesSection from './LinkedNotesSection';
import InlineEditor from './InlineEditor';
import { reorderMetaTags } from '../utils/MetaTagUtils';
import { PencilIcon } from '@heroicons/react/24/solid';

const NoteCard = ({
  note,
  searchQuery,
  duplicatedUrlColors,
  editingLine,
  setEditingLine,
  editedLineContent,
  setEditedLineContent,
  rightClickNoteId,
  rightClickIndex,
  setRightClickNoteId,
  setRightClickIndex,
  setRightClickPos,
  editingInlineDate,
  setEditingInlineDate,
  handleInlineDateSelect,
  popupNoteText,
  setPopupNoteText,
  objList,
  addingLineNoteId,
  setAddingLineNoteId,
  newLineText,
  setNewLineText,
  newLineInputRef,
  updateNote,
  urlToNotesMap,
  updateNoteCallback,
  showCreatedDate,
  setShowEndDatePickerForNoteId,
  handleDelete,
  setLinkingNoteId,
  setLinkSearchTerm,
  setLinkPopupVisible,
  selectedNotes,
  toggleNoteSelection,
  allNotes,
  onNavigate,
  onContextMenu,
  isMeetingNote,
  isEventNote,
  setEditingMeetingNote,
  setEditingEventNote,
  duplicateUrlNoteIds,
  duplicateWithinNoteIds,
  urlShareSpaceNoteIds,
  focusMode = false,
  setSearchQuery,
  focusedNoteIndex = -1,
  noteIndex = -1
}) => {
  const [isSuperEditMode, setIsSuperEditMode] = useState(false);
  const [highlightedLineIndex, setHighlightedLineIndex] = useState(-1);
  const [highlightedLineText, setHighlightedLineText] = useState('');

  // Check if this note is focused
  const isFocused = focusedNoteIndex === noteIndex;
  
  // Debug logging
  if (isFocused) {
    console.log(`Note ${note.id} is focused, index: ${noteIndex}, focusedNoteIndex: ${focusedNoteIndex}`);
  }

  const handleSuperEdit = () => {
    // Find the first non-empty line in the note
    const lines = note.content.split('\n');
    const firstNonEmptyLineIndex = lines.findIndex(line => line.trim() !== '');
    
    if (firstNonEmptyLineIndex !== -1) {
      const trimmedLine = lines[firstNonEmptyLineIndex].trim();
      setHighlightedLineIndex(firstNonEmptyLineIndex);
      setHighlightedLineText(trimmedLine);
      // Enter super edit mode without changing search query
      setIsSuperEditMode(true);
      
      // Scroll to the note
      const noteElement = document.querySelector(`[data-note-id="${note.id}"]`);
      if (noteElement) {
        noteElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // Handle keyboard events in super edit mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isSuperEditMode) return;
      
      if (e.key === '1') {
        e.preventDefault();
        
        // Find the line in the note content and wrap it with ###
        const lines = note.content.split('\n');
        
        if (highlightedLineIndex !== -1) {
          const updatedLines = [...lines];
          // Wrap the line with ### if it's not already wrapped
          if (!updatedLines[highlightedLineIndex].trim().startsWith('###')) {
            updatedLines[highlightedLineIndex] = `###${updatedLines[highlightedLineIndex].trim()}###`;
          }
          
          const updatedContent = updatedLines.join('\n');
          updateNote(note.id, updatedContent);
          
          // Stay in super edit mode - don't exit automatically
          // The user can continue navigating and converting other lines
        }
      } else if (e.key === '0') {
        e.preventDefault();
        
        // Find the line in the note content and clear all formatting
        const lines = note.content.split('\n');
        
        if (highlightedLineIndex !== -1) {
          const updatedLines = [...lines];
          // Clear all formatting: remove ###, ##, **, etc.
          let cleanText = updatedLines[highlightedLineIndex].trim();
          cleanText = cleanText.replace(/^###\s*/, '').replace(/\s*###$/, ''); // Remove H1
          cleanText = cleanText.replace(/^##\s*/, '').replace(/\s*##$/, ''); // Remove H2
          cleanText = cleanText.replace(/\*\*([^*]+)\*\*/g, '$1'); // Remove bold
          cleanText = cleanText.replace(/^-\s*/, ''); // Remove bullet points
          
          updatedLines[highlightedLineIndex] = cleanText;
          
          const updatedContent = updatedLines.join('\n');
          updateNote(note.id, updatedContent);
          
          // Stay in super edit mode - don't exit automatically
        }
      } else if (e.key === 'Escape') {
        // Exit super edit mode
        setIsSuperEditMode(false);
        setHighlightedLineIndex(-1);
        setHighlightedLineText('');
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        
        // Get all non-tag lines (lines that don't start with meta::)
        const lines = note.content.split('\n');
        const nonTagLineIndices = lines
          .map((line, index) => ({ line: line.trim(), index }))
          .filter(({ line }) => line !== '' && !line.startsWith('meta::'))
          .map(({ index }) => index);
        
        if (nonTagLineIndices.length > 0) {
          const currentIndex = nonTagLineIndices.indexOf(highlightedLineIndex);
          let newIndex;
          
          if (e.key === 'ArrowUp') {
            // Move to previous non-tag line
            newIndex = currentIndex > 0 ? currentIndex - 1 : nonTagLineIndices.length - 1;
          } else {
            // Move to next non-tag line
            newIndex = currentIndex < nonTagLineIndices.length - 1 ? currentIndex + 1 : 0;
          }
          
          const newLineIndex = nonTagLineIndices[newIndex];
          const newLineText = lines[newLineIndex].trim();
          
          setHighlightedLineIndex(newLineIndex);
          setHighlightedLineText(newLineText);
        }
      }
    };

    // Exit super edit mode when clicking outside
    const handleClickOutside = (e) => {
      if (isSuperEditMode && !e.target.closest(`[data-note-id="${note.id}"]`)) {
        setIsSuperEditMode(false);
        setHighlightedLineIndex(-1);
        setHighlightedLineText('');
      }
    };

    if (isSuperEditMode) {
      // Only add event listeners when super edit mode is active
      document.addEventListener('keydown', handleKeyDown, true);
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('keydown', handleKeyDown, true);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [isSuperEditMode, highlightedLineIndex, note.content, note.id, updateNote]);

  // Pass the highlighted line info to NoteContent for visual highlighting
  const noteContentProps = {
    note,
    searchQuery,
    duplicatedUrlColors,
    editingLine,
    setEditingLine,
    editedLineContent,
    setEditedLineContent,
    rightClickNoteId,
    rightClickIndex,
    setRightClickNoteId,
    setRightClickIndex,
    setRightClickPos,
    editingInlineDate,
    setEditingInlineDate,
    handleInlineDateSelect,
    popupNoteText,
    setPopupNoteText,
    objList,
    addingLineNoteId,
    setAddingLineNoteId,
    newLineText,
    setNewLineText,
    newLineInputRef,
    updateNote,
    focusMode,
    // Add super edit mode props
    isSuperEditMode,
    highlightedLineIndex,
    highlightedLineText
  };

  return (
    <div
      key={note.id}
      data-note-id={note.id}
      onContextMenu={(e) => onContextMenu(e, note)}
      className={`group flex flex-col ${
        focusMode 
          ? 'px-3 py-3 mb-3 rounded border border-gray-200 bg-white' 
          : 'px-6 py-6 mb-5 rounded-lg bg-neutral-50 border border-slate-200 ring-1 ring-slate-100'
      } relative ${isSuperEditMode ? 'ring-2 ring-purple-500' : ''} ${
        isFocused ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-300' : ''
      }`}
      style={{
        backgroundColor: isFocused ? '#eff6ff' : undefined,
        borderColor: isFocused ? '#3b82f6' : undefined,
        boxShadow: isFocused ? '0 0 0 2px rgba(59, 130, 246, 0.5)' : undefined
      }}
    >
      {isSuperEditMode && (
        <div className="absolute top-2 right-2 bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-medium">
          Super Edit Mode - Press 1 for H1, 0 to clear format, ↑↓ to navigate, Esc to exit
        </div>
      )}
      
      {isFocused && !isSuperEditMode && (
        <div className="absolute top-2 right-2 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
          Press 's' to enter Super Edit Mode
        </div>
      )}
      
      <div className="flex flex-col flex-auto">
        {/* Layer 1: Content and Edit/Delete */}
        <div className={focusMode ? "p-0" : "p-2"}>
          <NoteMetaInfo
            note={note}
            setShowEndDatePickerForNoteId={setShowEndDatePickerForNoteId}
            urlToNotesMap={urlToNotesMap}
            updateNoteCallback={updateNoteCallback}
          />
          <NoteContent
            {...noteContentProps}
          />
        </div>

        {addingLineNoteId === note.id && (
          <div className="w-full px-4 py-2">
            <InlineEditor
              text={newLineText}
              setText={setNewLineText}
              onSave={(text) => {
                const updated = note.content.trimEnd() + '\n' + text;
                const reorderedContent = reorderMetaTags(updated);
                updateNote(note.id, reorderedContent);
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

        {!focusMode && (
          <div className="flex items-center space-x-4 px-4 py-2">
            <NoteTagBar
              note={note}
              updateNote={updateNote}
              duplicateUrlNoteIds={duplicateUrlNoteIds}
              duplicateWithinNoteIds={duplicateWithinNoteIds}
              urlShareSpaceNoteIds={urlShareSpaceNoteIds}
              focusMode={focusMode}
              onNavigate={onNavigate}
              allNotes={allNotes}
              setSearchQuery={setSearchQuery}
            />
          </div>
        )}

        {/* Super Edit Button */}
        {!focusMode && (
          <div className="flex justify-end px-4 py-2">
            <button
              onClick={handleSuperEdit}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-200 ${
                isSuperEditMode 
                  ? 'text-white bg-purple-600 hover:bg-purple-700 border border-purple-600' 
                  : 'text-purple-600 bg-purple-50 hover:bg-purple-100 border border-purple-200'
              }`}
              title="Focus on first line in this note"
            >
              <PencilIcon className="h-3 w-3" />
              Super Edit
            </button>
          </div>
        )}

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
          focusMode={focusMode}
        />

        <LinkedNotesSection
          note={note}
          allNotes={allNotes}
          onNavigate={onNavigate}
          updateNote={updateNote}
        />
      </div>
    </div>
  );
};

export default NoteCard; 