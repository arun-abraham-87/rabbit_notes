import React, { useState, useEffect } from 'react';
import NoteCardHeader from './NoteCardHeader';
import NoteCardContent from './NoteCardContent';
import NoteCardFooter from './NoteCardFooter';
import NoteTagBar from './NoteTagBar';
import NoteCardSuperEditBanner from './NoteCardSuperEditBanner';
import NoteCardLinkedNotes from './NoteCardLinkedNotes';
import { DevModeInfo } from '../utils/DevUtils';


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
  fullNotesList = allNotes, // Add prop for full notes list
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
  bulkDeleteMode = false,
  setBulkDeleteMode = () => {},
  bulkDeleteNoteId = null,
  setBulkDeleteNoteId = () => {},
  multiMoveNoteId = null,
  setSearchQuery,
  focusedNoteIndex = -1,
  setFocusedNoteIndex = () => {},
  noteIndex = -1,
  onSetFocusedNoteIndex,
  settings = {},
  addNote = null
}) => {
  const [isSuperEditMode, setIsSuperEditMode] = useState(false);
  const [highlightedLineIndex, setHighlightedLineIndex] = useState(-1);
  const [highlightedLineText, setHighlightedLineText] = useState('');
  const [wasOpenedFromSuperEdit, setWasOpenedFromSuperEdit] = useState(false);
  const [keySequence, setKeySequence] = useState('');
  const [lastEditedLineIndex, setLastEditedLineIndex] = useState(-1);

  // --- Vim navigation state for super edit mode ---
  const [vimNumberBuffer, setVimNumberBuffer] = useState('');
  const [vimGPressed, setVimGPressed] = useState(false);


  // Check if this note is focused
  const isFocused = focusedNoteIndex === noteIndex;
  
  // Debug logging
  if (isFocused) {
    
  }









  // Handle keyboard events in super edit mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isSuperEditMode) return;
      
      // Check if there's an active inline editor - if so, don't handle keyboard events
      const isInlineEditorActive = document.querySelector('textarea[class*="border-gray-300"]:focus') || 
                                 e.target.tagName === 'TEXTAREA' ||
                                 e.target.closest('textarea');
      
      if (isInlineEditorActive) {
        
        return;
      }
      
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
      } else if ((e.key === '`' || e.key === '~') && e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        
        
        
        // Cycle between different text cases: lowercase -> sentence case -> uppercase
        const lines = note.content.split('\n');
        
        if (highlightedLineIndex !== -1) {
          const updatedLines = [...lines];
          const currentText = updatedLines[highlightedLineIndex];
          
          
          
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
            
          } else if (currentText === toSentenceCase(currentText)) {
            // Currently sentence case, convert to title case
            newText = toTitleCase(currentText);
            
          } else if (currentText === toTitleCase(currentText)) {
            // Currently title case, convert to uppercase
            newText = currentText.toUpperCase();
            
          } else {
            // Currently lowercase or mixed, convert to sentence case
            newText = toSentenceCase(currentText);
            
          }
          
          
          
          updatedLines[highlightedLineIndex] = newText;
          
          const updatedContent = updatedLines.join('\n');
          updateNote(note.id, updatedContent);
          
          // Update the highlighted line text
          setHighlightedLineText(newText.trim());
        }
      } else if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        
        
        
        // Show inline editor at the end of the note to add a new line
        const lines = note.content.split('\n');
        const newLineIndex = lines.length; // Index for the new line
        setLastEditedLineIndex(newLineIndex);
        setWasOpenedFromSuperEdit(true); // Mark that this was opened from superedit mode
        setAddingLineNoteId(note.id);
        setNewLineText('');
        
        // Focus the new line input after a short delay to ensure it's rendered
        setTimeout(() => {
          if (newLineInputRef.current) {
            newLineInputRef.current.focus();
          }
        }, 100);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        
        
        
        // Open the highlighted line in inline editor
        if (highlightedLineIndex !== -1) {
          const lines = note.content.split('\n');
          const lineToEdit = lines[highlightedLineIndex];
          
          
          
          // Store the line index before opening the editor
          setLastEditedLineIndex(highlightedLineIndex);
          
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
        setLastEditedLineIndex(-1);
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
      // Don't handle clicks on textarea elements or their parents
      if (e.target.tagName === 'TEXTAREA' || e.target.closest('textarea')) {
        
        return;
      }
      
      // Don't handle clicks on inline editor elements
      if (e.target.closest('[data-note-inline-editor="true"]')) {
        
        return;
      }
      
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
        
        // Use the line index from the event detail, or the stored last edited line index, or fall back to 0
        const lineIndex = event.detail.lineIndex !== null ? event.detail.lineIndex : (lastEditedLineIndex !== -1 ? lastEditedLineIndex : 0);
        
        
        // Find the correct non-meta line index to highlight
        const lines = note.content.split('\n');
        const nonTagLineIndices = lines
          .map((line, index) => ({ line: line.trim(), index }))
          .filter(({ line }) => line !== '' && !line.startsWith('meta::'))
          .map(({ index }) => index);
        
        let targetLineIndex = lineIndex;
        
        // If the line index is valid and points to a non-meta line, use it directly
        if (lineIndex >= 0 && lineIndex < lines.length && nonTagLineIndices.includes(lineIndex)) {
          targetLineIndex = lineIndex;
        } else if (lineIndex >= 0 && lineIndex < lines.length) {
          // If the line index is a meta tag or empty, find the closest non-meta line
          const targetLine = lines[lineIndex].trim();
          if (targetLine === '' || targetLine.startsWith('meta::')) {
            // Find the closest non-meta line to the target index
            let closestIndex = nonTagLineIndices[0] || 0;
            for (let i = 0; i < nonTagLineIndices.length; i++) {
              if (nonTagLineIndices[i] >= lineIndex) {
                closestIndex = nonTagLineIndices[i];
                break;
              }
            }
            targetLineIndex = closestIndex;
          }
        } else if (nonTagLineIndices.length > 0) {
          // If the line index is invalid, use the first non-meta line
          targetLineIndex = nonTagLineIndices[0];
        } else {
          // If no non-meta lines exist, use the first line
          targetLineIndex = 0;
        }
        
        
        setHighlightedLineIndex(targetLineIndex);
        setWasOpenedFromSuperEdit(false);
        setLastEditedLineIndex(-1); // Reset the last edited line index
        
        // Update the highlighted line text
        if (targetLineIndex >= 0 && targetLineIndex < lines.length) {
          setHighlightedLineText(lines[targetLineIndex].trim());
        }
      }
    };
    
    document.addEventListener('returnToSuperEdit', handleReturnToSuperEdit);
    return () => {
      document.removeEventListener('returnToSuperEdit', handleReturnToSuperEdit);
    };
  }, [isSuperEditMode, highlightedLineIndex, note.content, note.id, updateNote, lastEditedLineIndex]);

  // --- Vim navigation state for super edit mode ---
  useEffect(() => {
    if (!isSuperEditMode) return;
    const handleVimNav = (e) => {
      // Only handle navigation if not editing a line
      const isInlineEditorActive = document.querySelector('textarea[class*="border-gray-300"]:focus') || 
        e.target.tagName === 'TEXTAREA' ||
        e.target.closest('textarea');
      if (isInlineEditorActive) return;

      // Only allow navigation keys in super edit mode
      const vimKeys = ['g', 'G', 'j', 'k', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
      if (!vimKeys.includes(e.key)) return;

      // Get all non-meta, non-blank lines
      const lines = note.content.split('\n');
      const navigable = lines
        .map((line, idx) => ({ line: line.trim(), idx }))
        .filter(({ line }) => line !== '' && !line.startsWith('meta::'));
      if (navigable.length === 0) return;

      if (/^[0-9]$/.test(e.key)) {
        setVimNumberBuffer(prev => prev + e.key);
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (e.key === 'g' && !vimGPressed) {
        setVimGPressed(true);
        setTimeout(() => setVimGPressed(false), 400);
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (e.key === 'g' && vimGPressed) {
        // gg: go to top
        setHighlightedLineIndex(navigable[0].idx);
        setHighlightedLineText(lines[navigable[0].idx].trim());
        setVimGPressed(false);
        setVimNumberBuffer('');
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (e.key === 'G') {
        // G: go to bottom
        setHighlightedLineIndex(navigable[navigable.length - 1].idx);
        setHighlightedLineText(lines[navigable[navigable.length - 1].idx].trim());
        setVimGPressed(false);
        setVimNumberBuffer('');
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (e.key === 'j' && vimNumberBuffer) {
        // number + j: jump to xth line (1-based)
        const n = Math.max(1, Math.min(navigable.length, parseInt(vimNumberBuffer, 10)));
        setHighlightedLineIndex(navigable[n - 1].idx);
        setHighlightedLineText(lines[navigable[n - 1].idx].trim());
        setVimNumberBuffer('');
        setVimGPressed(false);
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      if (e.key === 'k' && vimNumberBuffer) {
        // number + k: jump to xth line from bottom (1-based)
        const n = Math.max(1, Math.min(navigable.length, parseInt(vimNumberBuffer, 10)));
        setHighlightedLineIndex(navigable[navigable.length - n].idx);
        setHighlightedLineText(lines[navigable[navigable.length - n].idx].trim());
        setVimNumberBuffer('');
        setVimGPressed(false);
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      // Reset buffer if any other key
      setVimNumberBuffer('');
      setVimGPressed(false);
      e.preventDefault();
      e.stopPropagation();
    };
    document.addEventListener('keydown', handleVimNav, true);
    return () => document.removeEventListener('keydown', handleVimNav, true);
  }, [isSuperEditMode, note.content, highlightedLineIndex, vimGPressed, vimNumberBuffer]);

  // Debug logging for developer mode
  
  
  // Add a simple test div to verify developer mode is working
  const testDevMode = settings?.developerMode || false;
  
  return (
    <DevModeInfo 
      componentName="NoteCard" 
      isDevMode={testDevMode}
    >
      <div
        key={note.id}
        data-note-id={note.id}
        onContextMenu={(e) => onContextMenu(e, note)}
        onClick={(e) => {
          if (isSuperEditMode) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          if (typeof onSetFocusedNoteIndex === 'function' && !isFocused) {
            onSetFocusedNoteIndex(noteIndex);
          }
        }}
        tabIndex={0}
        role="button"
        onKeyDown={e => {
          if ((e.key === 'Enter' || e.key === ' ') && typeof onSetFocusedNoteIndex === 'function' && !isSuperEditMode && !isFocused) {
            e.preventDefault();
            e.stopPropagation();
            onSetFocusedNoteIndex(noteIndex);
          }
          // Increment click counter when Enter or 'l' is pressed on a focused note
          if ((e.key === 'Enter' || e.key === 'l') && isFocused && !isSuperEditMode) {
            // Don't handle if the target is a textarea or input
            if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT' || e.target.closest('textarea') || e.target.closest('input')) {
              return;
            }
            e.preventDefault();
            e.stopPropagation();
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
      <NoteCardSuperEditBanner isVisible={isFocused && !isSuperEditMode} />
      
      {/* Developer Mode Test Indicator */}
      {testDevMode && (
        <div className="absolute top-0 right-0 bg-red-500 text-white text-xs px-2 py-1 rounded-bl z-10">
          DEV MODE ON
        </div>
      )}
      

      
      <div className="flex flex-col flex-auto">
        <NoteCardHeader
          note={note}
          setShowEndDatePickerForNoteId={setShowEndDatePickerForNoteId}
          urlToNotesMap={urlToNotesMap}
          updateNoteCallback={updateNoteCallback}
          updateNote={updateNote}
          duplicateUrlNoteIds={duplicateUrlNoteIds}
          duplicateWithinNoteIds={duplicateWithinNoteIds}
          urlShareSpaceNoteIds={urlShareSpaceNoteIds}
          focusMode={focusMode}
          onNavigate={onNavigate}
          allNotes={allNotes}
          setSearchQuery={setSearchQuery}
        />
        <NoteCardContent
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
          focusMode={focusMode}
          bulkDeleteMode={bulkDeleteMode}
          setBulkDeleteMode={setBulkDeleteMode}
          bulkDeleteNoteId={bulkDeleteNoteId}
          setBulkDeleteNoteId={setBulkDeleteNoteId}
          multiMoveNoteId={multiMoveNoteId}
          setFocusedNoteIndex={setFocusedNoteIndex}
          isSuperEditMode={isSuperEditMode}
          highlightedLineIndex={highlightedLineIndex}
          highlightedLineText={highlightedLineText}
          wasOpenedFromSuperEdit={wasOpenedFromSuperEdit}
          allNotes={fullNotesList}
          addNote={addNote}
        />
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

        <NoteCardLinkedNotes
          note={note}
          allNotes={fullNotesList}
          onNavigate={onNavigate}
          updateNote={updateNote}
        />
        
        <NoteCardFooter
          note={note}
          showCreatedDate={showCreatedDate}
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
      </div>
    </div>
    </DevModeInfo>
  );
};

export default NoteCard; 