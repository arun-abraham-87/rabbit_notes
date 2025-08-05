import React, { useState, useEffect } from 'react';
import NoteMetaInfo from './NoteMetaInfo';
import NoteContent from './NoteContent';
import NoteTagBar from './NoteTagBar';
import NoteFooter from './NoteFooter';
import LinkedNotesSection from './LinkedNotesSection';
import InlineEditor from './InlineEditor';
import { reorderMetaTags } from '../utils/MetaTagUtils';
import { PencilIcon } from '@heroicons/react/24/solid';
import NoteCardHeader from './NoteCardHeader';
import NoteCardContent from './NoteCardContent';
import NoteCardInlineEditor from './NoteCardInlineEditor';
import NoteCardFooter from './NoteCardFooter';
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
  multiMoveNoteId = null,
  setSearchQuery,
  focusedNoteIndex = -1,
  setFocusedNoteIndex = () => {},
  noteIndex = -1,
  onSetFocusedNoteIndex,
  settings = {}
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

  // Click counter popup state
  const [showClickCounterPopup, setShowClickCounterPopup] = useState(false);
  const [clickCounterValue, setClickCounterValue] = useState('');

  // Check if this note is focused
  const isFocused = focusedNoteIndex === noteIndex;
  
  // Debug logging
  if (isFocused) {
    console.log(`Note ${note.id} is focused, index: ${noteIndex}, focusedNoteIndex: ${focusedNoteIndex}`);
  }

  // Click tracking functionality
  const getClickCount = (noteId) => {
    try {
      const clickCounts = JSON.parse(localStorage.getItem('noteClickCounts') || '{}');
      return clickCounts[noteId] || 0;
    } catch (error) {
      console.error('Error loading click count:', error);
      return 0;
    }
  };

  const incrementClickCount = (noteId) => {
    try {
      const clickCounts = JSON.parse(localStorage.getItem('noteClickCounts') || '{}');
      clickCounts[noteId] = (clickCounts[noteId] || 0) + 1;
      localStorage.setItem('noteClickCounts', JSON.stringify(clickCounts));
    } catch (error) {
      console.error('Error updating click count:', error);
    }
  };

  // Handle click counter popup
  const handleClickCounterClick = (e) => {
    e.stopPropagation();
    setClickCounterValue(clickCount.toString());
    setShowClickCounterPopup(true);
  };

  const handleClickCounterSave = () => {
    try {
      const newValue = parseInt(clickCounterValue);
      if (isNaN(newValue) || newValue < 0) {
        alert('Please enter a valid non-negative integer');
        return;
      }
      
      const clickCounts = JSON.parse(localStorage.getItem('noteClickCounts') || '{}');
      if (newValue === 0) {
        delete clickCounts[note.id];
      } else {
        clickCounts[note.id] = newValue;
      }
      localStorage.setItem('noteClickCounts', JSON.stringify(clickCounts));
      
      setShowClickCounterPopup(false);
      setClickCounterValue('');
    } catch (error) {
      console.error('Error saving click count:', error);
      alert('Error saving click count');
    }
  };

  const handleClickCounterClear = () => {
    try {
      const clickCounts = JSON.parse(localStorage.getItem('noteClickCounts') || '{}');
      delete clickCounts[note.id];
      localStorage.setItem('noteClickCounts', JSON.stringify(clickCounts));
      
      setShowClickCounterPopup(false);
      setClickCounterValue('');
    } catch (error) {
      console.error('Error clearing click count:', error);
      alert('Error clearing click count');
    }
  };

  const handleClickCounterCancel = () => {
    setShowClickCounterPopup(false);
    setClickCounterValue('');
  };

  // Handle click outside to close popup
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showClickCounterPopup && !e.target.closest('.click-counter-popup')) {
        setShowClickCounterPopup(false);
        setClickCounterValue('');
      }
    };

    if (showClickCounterPopup) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showClickCounterPopup]);

  const [clickCount, setClickCount] = useState(getClickCount(note.id));

  // Update click count when note changes
  useEffect(() => {
    setClickCount(getClickCount(note.id));
  }, [note.id]);





  // Handle keyboard events in super edit mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isSuperEditMode) return;
      
      // Check if there's an active inline editor - if so, don't handle keyboard events
      const isInlineEditorActive = document.querySelector('textarea[class*="border-gray-300"]:focus') || 
                                 e.target.tagName === 'TEXTAREA' ||
                                 e.target.closest('textarea');
      
      if (isInlineEditorActive) {
        console.log('Inline editor is active, skipping NoteCard keyboard handler');
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
      } else if (e.key === 'Enter' && e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('Shift+Enter pressed in superedit mode, adding new line');
        
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
        
        console.log('Enter pressed in superedit mode, highlightedLineIndex:', highlightedLineIndex);
        
        // Open the highlighted line in inline editor
        if (highlightedLineIndex !== -1) {
          const lines = note.content.split('\n');
          const lineToEdit = lines[highlightedLineIndex];
          
          console.log('Opening inline editor for line:', lineToEdit, 'at index:', highlightedLineIndex);
          
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
        console.log('Returning to superedit mode with lineIndex:', lineIndex, 'from event:', event.detail.lineIndex, 'from stored:', lastEditedLineIndex);
        
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
        
        console.log('Final target line index:', targetLineIndex, 'non-meta indices:', nonTagLineIndices);
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

  // Debug logging for developer mode
  console.log('NoteCard - settings:', settings, 'developerMode:', settings?.developerMode);
  
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
            // Track click only when note comes into focus
            incrementClickCount(note.id);
            setClickCount(prevCount => prevCount + 1);
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
            e.preventDefault();
            e.stopPropagation();
            incrementClickCount(note.id);
            setClickCount(prevCount => prevCount + 1);
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
      
      {/* Click Counter */}
      {clickCount > 0 && (
        <div 
          className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full z-10 shadow-sm cursor-pointer hover:bg-blue-600 transition-colors duration-150"
          onClick={handleClickCounterClick}
          title="Click to edit counter"
        >
          {clickCount}
        </div>
      )}

      {/* Click Counter Popup */}
      {showClickCounterPopup && (
        <div className="absolute top-2 right-2 bg-white border border-gray-300 rounded-lg shadow-lg z-20 p-4 min-w-48 click-counter-popup">
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Click Count for Note
            </label>
            <input
              type="number"
              min="0"
              value={clickCounterValue}
              onChange={(e) => setClickCounterValue(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter new count"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleClickCounterSave}
              className="flex-1 px-3 py-2 bg-blue-500 text-white text-sm font-medium rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Save
            </button>
            <button
              onClick={handleClickCounterClear}
              className="flex-1 px-3 py-2 bg-red-500 text-white text-sm font-medium rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Clear
            </button>
            <button
              onClick={handleClickCounterCancel}
              className="flex-1 px-3 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Cancel
            </button>
          </div>
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
          multiMoveNoteId={multiMoveNoteId}
          setFocusedNoteIndex={setFocusedNoteIndex}
          isSuperEditMode={isSuperEditMode}
          highlightedLineIndex={highlightedLineIndex}
          highlightedLineText={highlightedLineText}
          wasOpenedFromSuperEdit={wasOpenedFromSuperEdit}
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

        <NoteCardInlineEditor
                  visible={addingLineNoteId === note.id}
                  text={newLineText}
                  setText={setNewLineText}
                  settings={settings}
                  onSave={async (finalText) => {
            console.log('NoteCard onSave called with text:', finalText);
            console.log('Current note content:', note.content);
            
            // Remove all trailing blank lines before appending the new line
            let contentWithNewline = note.content.replace(/\n+$/g, '');
            if (contentWithNewline && contentWithNewline.trim() !== '') {
              contentWithNewline += '\n';
            }
            const updated = contentWithNewline ? contentWithNewline + finalText : finalText;
            console.log('Updated content:', updated);
            
            const reorderedContent = reorderMetaTags(updated);
            console.log('Reordered content:', reorderedContent);
            
            console.log('Calling updateNote with note.id:', note.id);
            try {
              await updateNote(note.id, reorderedContent);
              console.log('updateNote completed successfully');
            } catch (error) {
              console.error('Error in updateNote:', error);
            }
            setAddingLineNoteId(null);
            setNewLineText('');
            
            // If this was opened from superedit mode, return to superedit
            if (wasOpenedFromSuperEdit) {
              // Calculate the index of the newly added line
              const lines = updated.split('\n');
              const newLineIndex = lines.length - 1; // Index of the last line (the newly added one)
              console.log('Saving new line, returning to superedit with lineIndex:', newLineIndex);
              
              // Find the non-meta line indices to determine the correct highlight position
              const nonTagLineIndices = lines
                .map((line, index) => ({ line: line.trim(), index }))
                .filter(({ line }) => line !== '' && !line.startsWith('meta::'))
                .map(({ index }) => index);
              
              // Find the closest non-meta line to the newly added line
              let targetLineIndex = newLineIndex;
              if (nonTagLineIndices.length > 0) {
                // If the new line is a non-meta line, use it directly
                if (nonTagLineIndices.includes(newLineIndex)) {
                  targetLineIndex = newLineIndex;
                } else {
                  // Find the closest non-meta line to the new line index
                  let closestIndex = nonTagLineIndices[nonTagLineIndices.length - 1]; // Default to last non-meta line
                  for (let i = 0; i < nonTagLineIndices.length; i++) {
                    if (nonTagLineIndices[i] >= newLineIndex) {
                      closestIndex = nonTagLineIndices[i];
                      break;
                    }
                  }
                  targetLineIndex = closestIndex;
                }
              }
              
              console.log('New line saved, target line index:', targetLineIndex, 'non-meta indices:', nonTagLineIndices);
              const event = new CustomEvent('returnToSuperEdit', {
                detail: { lineIndex: targetLineIndex }
              });
              document.dispatchEvent(event);
            }
          }}
          onCancel={() => {
            setAddingLineNoteId(null);
            setNewLineText('');
            
            // If this was opened from superedit mode, return to superedit
            if (wasOpenedFromSuperEdit) {
              // Calculate the index of the newly added line
              const lines = note.content.split('\n');
              const newLineIndex = lines.length - 1; // Index of the last line
              console.log('Canceling new line, returning to superedit with lineIndex:', newLineIndex);
              
              // Find the non-meta line indices to determine the correct highlight position
              const nonTagLineIndices = lines
                .map((line, index) => ({ line: line.trim(), index }))
                .filter(({ line }) => line !== '' && !line.startsWith('meta::'))
                .map(({ index }) => index);
              
              // Find the closest non-meta line to the newly added line
              let targetLineIndex = newLineIndex;
              if (nonTagLineIndices.length > 0) {
                // If the new line is a non-meta line, use it directly
                if (nonTagLineIndices.includes(newLineIndex)) {
                  targetLineIndex = newLineIndex;
                } else {
                  // Find the closest non-meta line to the new line index
                  let closestIndex = nonTagLineIndices[nonTagLineIndices.length - 1]; // Default to last non-meta line
                  for (let i = 0; i < nonTagLineIndices.length; i++) {
                    if (nonTagLineIndices[i] >= newLineIndex) {
                      closestIndex = nonTagLineIndices[i];
                      break;
                    }
                  }
                  targetLineIndex = closestIndex;
                }
              }
              
              console.log('New line canceled, target line index:', targetLineIndex, 'non-meta indices:', nonTagLineIndices);
              const event = new CustomEvent('returnToSuperEdit', {
                detail: { lineIndex: targetLineIndex }
              });
              document.dispatchEvent(event);
            }
          }}
          onDelete={() => {
            // For new lines, delete just means cancel
            setAddingLineNoteId(null);
            setNewLineText('');
            
            // If this was opened from superedit mode, return to superedit
            if (wasOpenedFromSuperEdit) {
              const lines = note.content.split('\n');
              const newLineIndex = lines.length - 1;
              console.log('Deleting new line, returning to superedit with lineIndex:', newLineIndex);
              
              // Find the non-meta line indices to determine the correct highlight position
              const nonTagLineIndices = lines
                .map((line, index) => ({ line: line.trim(), index }))
                .filter(({ line }) => line !== '' && !line.startsWith('meta::'))
                .map(({ index }) => index);
              
              // Find the closest non-meta line to the newly added line
              let targetLineIndex = newLineIndex;
              if (nonTagLineIndices.length > 0) {
                // If the new line is a non-meta line, use it directly
                if (nonTagLineIndices.includes(newLineIndex)) {
                  targetLineIndex = newLineIndex;
                } else {
                  // Find the closest non-meta line to the new line index
                  let closestIndex = nonTagLineIndices[nonTagLineIndices.length - 1]; // Default to last non-meta line
                  for (let i = 0; i < nonTagLineIndices.length; i++) {
                    if (nonTagLineIndices[i] >= newLineIndex) {
                      closestIndex = nonTagLineIndices[i];
                      break;
                    }
                  }
                  targetLineIndex = closestIndex;
                }
              }
              
              console.log('New line deleted, target line index:', targetLineIndex, 'non-meta indices:', nonTagLineIndices);
              const event = new CustomEvent('returnToSuperEdit', {
                detail: { lineIndex: targetLineIndex }
              });
              document.dispatchEvent(event);
            }
          }}
          wasOpenedFromSuperEdit={wasOpenedFromSuperEdit}
          lineIndex={lastEditedLineIndex}
        />
        <NoteCardFooter
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

        <NoteCardLinkedNotes
          note={note}
          allNotes={allNotes}
          onNavigate={onNavigate}
          updateNote={updateNote}
        />
      </div>
    </div>
    </DevModeInfo>
  );
};

export default NoteCard; 