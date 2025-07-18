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
  noteIndex = -1,
  onSetFocusedNoteIndex
}) => {
  const [isSuperEditMode, setIsSuperEditMode] = useState(false);
  const [highlightedLineIndex, setHighlightedLineIndex] = useState(-1);
  const [highlightedLineText, setHighlightedLineText] = useState('');
  const [wasOpenedFromSuperEdit, setWasOpenedFromSuperEdit] = useState(false);
  const [keySequence, setKeySequence] = useState('');

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
      } else if (e.key === '2') {
        e.preventDefault();
        
        // Find the line in the note content and wrap it with ##
        const lines = note.content.split('\n');
        
        if (highlightedLineIndex !== -1) {
          const updatedLines = [...lines];
          // Wrap the line with ## if it's not already wrapped
          if (!updatedLines[highlightedLineIndex].trim().startsWith('##')) {
            updatedLines[highlightedLineIndex] = `##${updatedLines[highlightedLineIndex].trim()}##`;
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
            } else if (e.key === 'x') {
        e.preventDefault();
        e.stopPropagation();
        
        // Delete the current line and move focus to next line (or previous if at end)
        const lines = note.content.split('\n');
        
        if (highlightedLineIndex !== -1 && lines.length > 1) {
          const updatedLines = [...lines];
          updatedLines.splice(highlightedLineIndex, 1); // Remove the current line
          
          const updatedContent = updatedLines.join('\n');
          updateNote(note.id, updatedContent);
          
          // Determine where to move focus after deletion
          let newHighlightedIndex = highlightedLineIndex;
          
          if (highlightedLineIndex >= updatedLines.length) {
            // If we were at the last line, move to the previous line
            newHighlightedIndex = Math.max(0, updatedLines.length - 1);
          }
          // If we're not at the end, stay at the same index (which now points to the next line)
          
          // Find the next non-empty, non-tag line to highlight
          const nonTagLineIndices = updatedLines
            .map((line, index) => ({ line: line.trim(), index }))
            .filter(({ line }) => line !== '' && !line.startsWith('meta::'))
            .map(({ index }) => index);
          
          if (nonTagLineIndices.length > 0) {
            // Find the closest line to our new position
            let targetIndex = nonTagLineIndices[0];
            for (let i = 0; i < nonTagLineIndices.length; i++) {
              if (nonTagLineIndices[i] >= newHighlightedIndex) {
                targetIndex = nonTagLineIndices[i];
                break;
              }
            }
            
            setHighlightedLineIndex(targetIndex);
            setHighlightedLineText(updatedLines[targetIndex].trim());
          } else {
            // If no non-tag lines remain, exit super edit mode
            setIsSuperEditMode(false);
            setHighlightedLineIndex(-1);
            setHighlightedLineText('');
          }
        } else if (lines.length === 1) {
          // If this is the only line, just clear it
          updateNote(note.id, '');
          setIsSuperEditMode(false);
            setHighlightedLineIndex(-1);
            setHighlightedLineText('');
        }
      } else if (e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        e.stopPropagation();
        
        // Check if Shift is pressed for uppercase conversion
        if (e.shiftKey) {
          // Convert the highlighted line to uppercase
          const lines = note.content.split('\n');
          
          if (highlightedLineIndex !== -1) {
            const updatedLines = [...lines];
            updatedLines[highlightedLineIndex] = updatedLines[highlightedLineIndex].toUpperCase();
            
            const updatedContent = updatedLines.join('\n');
            updateNote(note.id, updatedContent);
            
            // Update the highlighted line text
            setHighlightedLineText(updatedLines[highlightedLineIndex].trim());
          }
        } else {
          // Show inline editor at the end of the note to add a new line
          setAddingLineNoteId(note.id);
          setNewLineText('');
          
          // Focus the new line input after a short delay to ensure it's rendered
          setTimeout(() => {
            if (newLineInputRef.current) {
              newLineInputRef.current.focus();
            }
          }, 100);
        }
      } else if ((e.key === '`' || e.key === '~') && e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('Shift+~ pressed, cycling text case');
        
        // Cycle between different text cases: lowercase -> sentence case -> uppercase
        const lines = note.content.split('\n');
        
        if (highlightedLineIndex !== -1) {
          const updatedLines = [...lines];
          const currentText = updatedLines[highlightedLineIndex];
          
          console.log('Current text:', currentText);
          
          // Helper function to convert to sentence case
          const toSentenceCase = (text) => {
            return text.toLowerCase().replace(/(^\w|\.\s+\w)/g, letter => letter.toUpperCase());
          };
          
          // Helper function to convert to title case (first letter of each word capitalized)
          const toTitleCase = (text) => {
            return text.toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase());
          };
          
          // Determine current case and cycle to next: lowercase -> sentence case -> title case -> uppercase -> lowercase
          let newText;
          if (currentText === currentText.toUpperCase()) {
            // Currently uppercase, convert to lowercase
            newText = currentText.toLowerCase();
            console.log('Converting from uppercase to lowercase');
          } else if (currentText === toSentenceCase(currentText)) {
            // Currently sentence case, convert to title case
            newText = toTitleCase(currentText);
            console.log('Converting from sentence case to title case');
          } else if (currentText === toTitleCase(currentText)) {
            // Currently title case, convert to uppercase
            newText = currentText.toUpperCase();
            console.log('Converting from title case to uppercase');
          } else {
            // Currently lowercase or mixed, convert to sentence case
            newText = toSentenceCase(currentText);
            console.log('Converting to sentence case');
          }
          
          console.log('New text:', newText);
          
          updatedLines[highlightedLineIndex] = newText;
          
          const updatedContent = updatedLines.join('\n');
          updateNote(note.id, updatedContent);
          
          // Update the highlighted line text
          setHighlightedLineText(newText.trim());
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        
        // Open the highlighted line in inline editor
        if (highlightedLineIndex !== -1) {
          const lines = note.content.split('\n');
          const lineToEdit = lines[highlightedLineIndex];
          
          // Set the editing line and content
          setEditingLine({ noteId: note.id, lineIndex: highlightedLineIndex });
          setEditedLineContent(lineToEdit);
          
          // Mark that this was opened from superedit mode
          setWasOpenedFromSuperEdit(true);
          
          // Exit super edit mode since we're now in inline editing mode
          setIsSuperEditMode(false);
          setHighlightedLineIndex(-1);
          setHighlightedLineText('');
        }
      } else if (e.key === 'h') {
        e.preventDefault();
        e.stopPropagation();
        
        // Start or continue the 'h' sequence
        setKeySequence('h');
        
        // Clear the sequence after a delay
        setTimeout(() => {
          setKeySequence('');
        }, 1000);
      } else if (e.key === 'b' && keySequence === 'h') {
        e.preventDefault();
        e.stopPropagation();
        
        // Hide bullets for the highlighted line
        if (highlightedLineIndex !== -1) {
          const lines = note.content.split('\n');
          const updatedLines = [...lines];
          const currentLine = updatedLines[highlightedLineIndex];
          
          // Remove bullet points and indentation
          let newLine = currentLine.replace(/^[•\-\s]+/, ''); // Remove bullets and leading spaces
          newLine = newLine.replace(/^\s+/, ''); // Remove any remaining leading spaces
          
          updatedLines[highlightedLineIndex] = newLine;
          
          const updatedContent = updatedLines.join('\n');
          updateNote(note.id, updatedContent);
          
          // Update the highlighted line text
          setHighlightedLineText(newLine.trim());
        }
        
        // Clear the key sequence
        setKeySequence('');
      } else if (e.key === 'Escape') {
        // Exit super edit mode
        setIsSuperEditMode(false);
        setHighlightedLineIndex(-1);
        setHighlightedLineText('');
        setKeySequence('');
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        
        // Check if Shift is pressed for line movement
        if (e.shiftKey) {
          // Move the highlighted line up or down
          const lines = note.content.split('\n');
          if (highlightedLineIndex >= 0 && highlightedLineIndex < lines.length) {
            let newLines = [...lines];
            let newHighlightedIndex = highlightedLineIndex;
            
            if (e.key === 'ArrowUp' && highlightedLineIndex > 0) {
              // Move line up
              [newLines[highlightedLineIndex], newLines[highlightedLineIndex - 1]] = 
                [newLines[highlightedLineIndex - 1], newLines[highlightedLineIndex]];
              newHighlightedIndex = highlightedLineIndex - 1;
            } else if (e.key === 'ArrowDown' && highlightedLineIndex < lines.length - 1) {
              // Move line down
              [newLines[highlightedLineIndex], newLines[highlightedLineIndex + 1]] = 
                [newLines[highlightedLineIndex + 1], newLines[highlightedLineIndex]];
              newHighlightedIndex = highlightedLineIndex + 1;
            }
            
            // Update the note content
            const updatedContent = newLines.join('\n');
            updateNote(note.id, updatedContent);
            
            // Update the highlighted line index
            setHighlightedLineIndex(newHighlightedIndex);
            setHighlightedLineText(newLines[newHighlightedIndex].trim());
          }
        } else {
          // Normal navigation between non-tag lines
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
    
    // Listen for return to superedit mode event
    const handleReturnToSuperEdit = (event) => {
      if (event.detail && wasOpenedFromSuperEdit) {
        // Re-enter superedit mode
        setIsSuperEditMode(true);
        
        // Use the line index from the event detail or fall back to the editing line
        const lineIndex = event.detail.lineIndex || editingLine?.lineIndex || 0;
        setHighlightedLineIndex(lineIndex);
        setWasOpenedFromSuperEdit(false);
        
        // Update the highlighted line text
        const lines = note.content.split('\n');
        if (lineIndex >= 0 && lineIndex < lines.length) {
          setHighlightedLineText(lines[lineIndex].trim());
        } else {
          // Find the first non-empty line if the line index is invalid
          const firstNonEmptyLineIndex = lines.findIndex(line => line.trim() !== '');
          if (firstNonEmptyLineIndex !== -1) {
            setHighlightedLineIndex(firstNonEmptyLineIndex);
            setHighlightedLineText(lines[firstNonEmptyLineIndex].trim());
          }
        }
      }
    };
    
    document.addEventListener('returnToSuperEdit', handleReturnToSuperEdit);
    return () => {
      document.removeEventListener('returnToSuperEdit', handleReturnToSuperEdit);
    };
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
    highlightedLineText,
    wasOpenedFromSuperEdit
  };

  return (
    <div
      key={note.id}
      data-note-id={note.id}
      onContextMenu={(e) => onContextMenu(e, note)}
      onClick={() => {
        console.log('NoteCard clicked', {noteIndex, isSuperEditMode, isFocused});
        if (typeof onSetFocusedNoteIndex === 'function' && !isSuperEditMode && !isFocused) {
          onSetFocusedNoteIndex(noteIndex);
        }
      }}
      tabIndex={0}
      role="button"
      onKeyDown={e => {
        if ((e.key === 'Enter' || e.key === ' ') && typeof onSetFocusedNoteIndex === 'function' && !isSuperEditMode && !isFocused) {
          e.preventDefault();
          onSetFocusedNoteIndex(noteIndex);
        }
      }}
      className={`group flex flex-col cursor-pointer ${
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

      
      {isFocused && !isSuperEditMode && (
        <div className="absolute top-2 right-2 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
          Press Enter to enter Super Edit Mode
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