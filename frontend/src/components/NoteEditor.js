import React, { useState, useRef, useEffect, useCallback } from 'react';
import { updateNoteById } from '../utils/ApiUtils';
import NoteFilters from './NoteFilters';
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { debounce } from 'lodash';
import { reorderMetaTags } from '../utils/MetaTagUtils';

const NoteEditor = ({isModal=false, objList, note, onSave, onCancel, text, searchQuery='', setSearchQuery, addNote, isAddMode = false, settings = {}, onExcludeEventsChange=true, onExcludeMeetingsChange=true }) => {
  const contentSource = isAddMode ? searchQuery || '' : text || note.content || '';
  const initialLines = contentSource
    ? [
      ...contentSource.split('\n').map((text, index) => ({
        id: `line-${index}`,
        text,
        isTitle: text.startsWith('##') && text.endsWith('##'),
      })),
      // Only add extra line if not in add mode
      ...(!isAddMode ? [{ id: `line-${Date.now()}-extra`, text: '', isTitle: false }] : [])
    ]
    : [{ id: 'line-0', text: '', isTitle: false }];

  const [lines, setLines] = useState(initialLines);
  const [focusedLineIndex, setFocusedLineIndex] = useState(null);
  const [showTodoSubButtons, setShowTodoSubButtons] = useState(false);
  const [showEndDateFilterSubButtons, setShowEndDateFilterSubButtons] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [activePriority, setActivePriority] = useState('');
  const [selectedDateIndex, setSelectedDateIndex] = useState(null);

  const [filteredTags, setFilteredTags] = useState([]);
  const [selectedTagIndex, setSelectedTagIndex] = useState(-1);
  const [showPopup, setShowPopup] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const throttleRef = useRef(null);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const popupRef = useRef(null);
  const [showTextSelection, setShowTextSelection] = useState(false);

  // Vim-like mode system
  const [mode, setMode] = useState('view'); // 'view' or 'edit'
  const [cursorLine, setCursorLine] = useState(0); // Current line in view mode
  
  // Initialize cursor line to first non-empty line or 0
  useEffect(() => {
    const firstNonEmptyIndex = lines.findIndex(line => line.text.trim() !== '');
    setCursorLine(firstNonEmptyIndex >= 0 ? firstNonEmptyIndex : 0);
  }, [lines]);
  
  // Focus the note editor container when it opens
  useEffect(() => {
    const container = document.querySelector('.note-editor-container');
    if (container) {
      // Focus the container immediately when component mounts
      setTimeout(() => {
        container.focus();
      }, 0);
    }
  }, []);

  // Focus when in modal context
  useEffect(() => {
    const modalContainer = document.querySelector('[data-modal="true"]');
    if (modalContainer && mode === 'view') {
      const noteEditorContainer = document.querySelector('.note-editor-container');
      if (noteEditorContainer) {
        setTimeout(() => {
          console.log('NoteEditor: Focusing container in modal context');
          noteEditorContainer.focus();
        }, 100); // Slightly longer delay for modal context
      }
    }
  }, [mode]);
  
  // Focus when mode changes
  useEffect(() => {
    if (mode === 'view') {
      const container = document.querySelector('.note-editor-container');
      if (container) {
        setTimeout(() => {
          container.focus();
        }, 0);
      }
    }
  }, [mode]);

  const replaceLastWord = (tag) => {
    //console.log(lines)
    //console.log(focusedLineIndex)
    //console.log(lines[focusedLineIndex])
    const lastSpaceIndex = lines[focusedLineIndex].text.lastIndexOf(" ");
    const updatedText =
      (lastSpaceIndex === -1 ? "" : lines[focusedLineIndex].text.slice(0, lastSpaceIndex + 1)) +
      `${tag} `;
    const updatedLines = [...lines];
    updatedLines[focusedLineIndex].text = updatedText;
    setLines(updatedLines);
    // Keep the search bar in sync
    if (typeof setSearchQuery === 'function') {
      setSearchQuery(updatedText.trim());
    }
    setShowPopup(false);
    // setShowCalendar(false)
    setSelectedTagIndex(-1);
    //moveCursorToEndOfText(focusIndex)
  }

  const handleSelectTag = (tag) => {
    replaceLastWord(tag)
  };

  const handleDateSelect = (date) => {
    const newLines = [...lines];
    const endDateLine = `meta::end_date::${new Date(date).toISOString()}`;
    newLines.splice(selectedDateIndex + 1, 0, {
      id: `line-${Date.now()}-end-date`,
      text: endDateLine,
      isTitle: false
    });
    setLines(newLines);
    setShowDatePicker(false);
    setSelectedDateIndex(null);
  };

  const filterTags = (text) => {
    const match = text.trim().match(/(\S+)$/);
    if (!match) {
      setShowPopup(false);
      return;
    }
    //console.log(objList);
    const filterText = match[1].toLowerCase();
    const filtered = objList.filter((tag) =>
      tag && tag.text && tag.text.toLowerCase().startsWith(filterText)
    );
    setFilteredTags(filtered.map(tag => tag.text));
    setSearchTerm(filterText);
    setShowPopup(filtered.length > 0);
  };

  const handleMarkAsTitle = (index) => {
    let newLines = [...lines];
    // Prepare selected line
    let content = newLines[index].text.trim();
    // Remove any H2 markers if present
    if (content.startsWith('##') && content.endsWith('##')) {
      content = content.slice(2, -2);
    }
    // Toggle H1
    if (content.startsWith('###') && content.endsWith('###')) {
      content = content.slice(3, -3);
    } else {
      content = `###${content}###`;
    }
    // Update the line
    newLines[index].text = content;
    setLines(newLines);
  };

  const handleMarkAsSubtitle = (index) => {
    let newLines = [...lines];
    // Prepare selected line
    let content = newLines[index].text.trim();
    // Remove H1 markers if present
    if (content.startsWith('###') && content.endsWith('###')) {
      content = content.slice(3, -3);
    }
    // Toggle H2
    if (content.startsWith('##') && content.endsWith('##')) {
      content = content.slice(2, -2);
    } else {
      content = `##${content}##`;
    }
    // Update the line
    newLines[index].text = content;
    setLines(newLines);
  };

  const [dropTargetIndex, setDropTargetIndex] = useState(null);
  const [mergedContent, setMergedContent] = useState(null);
  const [draggedId, setDraggedId] = useState(null);
  const [selectAllPressCount, setSelectAllPressCount] = useState(0);
  const [isTextMode, setIsTextMode] = useState(false);
  const [urlLabelSelection, setUrlLabelSelection] = useState({ urlIndex: null, labelIndex: null });
  const [pendingUrlIndex, setPendingUrlIndex] = useState(null);
  const [customLabel, setCustomLabel] = useState('');
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, index: null });
  const textareasRef = useRef([]);

  useEffect(() => {
    const last = textareasRef.current[textareasRef.current.length - 1];
    if (last) {
      last.focus();
      last.selectionStart = last.selectionEnd = last.value.length;
    }
  }, []);

  // Update lines when search query changes
  useEffect(() => {
    if (isAddMode && searchQuery !== undefined) {
      setLines([
        { id: 'line-0', text: searchQuery || '', isTitle: false }
      ]);
    }
  }, [searchQuery, isAddMode]);

  const updateNote = (id, updatedContent) => {
    updateNoteById(id, updatedContent);
  };

  const handleSelectAll = (e) => {
    const active = document.activeElement;
    const isTextareaFocused = textareasRef.current.includes(active);

    if ((e.metaKey || e.ctrlKey) && e.key === 'a' && isTextareaFocused) {
      e.preventDefault();

      if (selectAllPressCount === 0) {
        active.select();
        setSelectAllPressCount(1);
      } else {
        const selection = window.getSelection();
        const range = document.createRange();
        if (textareasRef.current.length > 0) {
          const first = textareasRef.current[0];
          const last = textareasRef.current[textareasRef.current.length - 1];
          range.setStart(first, 0);
          range.setEnd(last, 1);
          selection.removeAllRanges();
          selection.addRange(range);
        }
        setSelectAllPressCount(0);
      }
    } else if (e.key !== 'a') {
      setSelectAllPressCount(0);
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleSelectAll);
    return () => {
      document.removeEventListener('keydown', handleSelectAll);
    };
  }, [lines]);

  const handleDragStart = (e, index) => {
    const id = lines[index].id;
    e.dataTransfer.setData('text/plain', id);
    setDraggedId(id);
  };

  const handleDragOver = (index) => {
    if (dropTargetIndex !== index) {
      setDropTargetIndex(index);
    }
  };

  const handleDrop = (e, targetIndex) => {
    const draggedId = e.dataTransfer.getData('text/plain');
    const draggedIndex = lines.findIndex(line => line.id === draggedId);
    if (draggedIndex === -1 || draggedIndex === targetIndex) return;

    const newLines = [...lines];
    const [movedItem] = newLines.splice(draggedIndex, 1);
    newLines.splice(targetIndex, 0, movedItem);
    setLines(newLines);
    setDropTargetIndex(null);
    setDraggedId(null);
  };

  const debouncedSetSearchQuery = useCallback(
    debounce((value) => {
      if (setSearchQuery) {
        console.log('Setting searchQuery in handleTextChange:', value);
        setSearchQuery(value);
      }
    }, 300),
    [setSearchQuery]
  );

  const handleTextChange = (index, value) => {
    const updatedLines = [...lines];
    updatedLines[index].text = value;
    setLines(updatedLines);

    // Debounce the search query update
    debouncedSetSearchQuery(value);

    // Handle tag suggestions
    if (value.trim().length === 0) {
      setShowPopup(false);
      return;
    }

    const match = value.trim().match(/(\S+)$/);
    if (match) {
      const filterText = match[1].toLowerCase();

      clearTimeout(throttleRef.current);
      throttleRef.current = setTimeout(() => {
        const filtered = objList.filter((tag) =>
          tag && tag.text && tag.text.toLowerCase().startsWith(filterText)
        );

        if (filtered.length > 0) {
          const textarea = textareasRef.current[index];
          if (textarea) {
            const rect = textarea.getBoundingClientRect();
            const coords = {
              x: rect.left + window.scrollX + (textarea.selectionStart * 8),
              y: rect.bottom + window.scrollY
            };
            setCursorPosition(coords);
            setFilteredTags(filtered.map(tag => tag.text));
            setShowPopup(true);
          }
        } else {
          setShowPopup(false);
        }
      }, 150);
    } else {
      setShowPopup(false);
    }
  };

  const handlePaste = (e, index) => {
    const pasteText = e.clipboardData.getData('text');

    if (pasteText.includes('\n')) {
      e.preventDefault();
      const newLines = [...lines];
      const pastedLines = pasteText.split('\n').map((text, i) => ({
        id: `line-${Date.now()}-${i}`,
        text,
        isTitle: false,
      }));
      newLines.splice(index + 1, 0, ...pastedLines);
      setLines(newLines);
      
      // Update cursor line to point to the first pasted line for view mode navigation
      setCursorLine(index + 1);
      
      return;
    }

    const urlPattern = /^https?:\/\/[^\s]+$/;
    if (urlPattern.test(pasteText)) {
      e.preventDefault();
      const newLines = [...lines];
      newLines[index].text = pasteText;
      setLines(newLines);
      setPendingUrlIndex(index);
      setCustomLabel(new URL(pasteText).hostname);
      setTimeout(() => {
        const input = document.getElementById('custom-label-input');
        if (input) input.focus();
      }, 0);
      return;
    }
  };


  const handleKeyDown = (e, index) => {
    // General Escape handler to cancel the note editor
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      if (showPopup || contextMenu.visible) {
      setShowPopup(false);
      setSelectedTagIndex(-1);
      setContextMenu({ visible: false, x: 0, y: 0, index: null });
      if (focusedLineIndex !== null && textareasRef.current[focusedLineIndex]) {
        textareasRef.current[focusedLineIndex].focus();
        }
      } else if (mode === 'edit') {
        // Switch to view mode
        setMode('view');
      } else {
        // Cancel the note editor popup
        onCancel();
      }
      return;
    }
    if (showPopup && filteredTags.length > 0) {
      if (e.key === 'Tab') {
        e.preventDefault();
        const tagToSelect = filteredTags[selectedTagIndex >= 0 ? selectedTagIndex : 0];
        handleSelectTag(tagToSelect);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedTagIndex((prev) => (prev + 1) % filteredTags.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedTagIndex((prev) => (prev - 1 + filteredTags.length) % filteredTags.length);
        return;
      }
      if (e.key === 'Enter' && selectedTagIndex >= 0) {
        e.preventDefault();
        handleSelectTag(filteredTags[selectedTagIndex]);
        return;
      }
    }
    if (e.key === 'Backspace') {
      const cursorAtStart = e.target.selectionStart === 0;
      const prevLine = lines[index - 1];

      if (cursorAtStart && index > 0 && prevLine) {
        e.preventDefault();
        const newLines = [...lines];
        const prevTextLength = newLines[index - 1].text.length;
        newLines[index - 1].text += newLines[index].text;
        newLines.splice(index, 1);
        setLines(newLines);
        setTimeout(() => {
          const prevTextarea = textareasRef.current[index - 1];
          if (prevTextarea) {
            prevTextarea.focus();
            prevTextarea.selectionStart = prevTextarea.selectionEnd = prevTextLength;
          }
        }, 0);
        return;
      }
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const newLines = [...lines];
      const line = newLines[index];

      if (e.shiftKey) {
        const cursorAtStart = e.target.selectionStart === 0;
        const prevLine = lines[index - 1];

        if (cursorAtStart && index > 0 && prevLine) {
          e.preventDefault();
          const current = newLines[index];
          newLines[index - 1].text += ' ' + current.text;
          newLines.splice(index, 1);
          setLines(newLines);
          setTimeout(() => {
            const prevTextarea = textareasRef.current[index - 1];
            if (prevTextarea) {
              prevTextarea.focus();
              prevTextarea.selectionStart = prevTextarea.selectionEnd = prevTextarea.value.length;
            }
          }, 0);
          return;
        }

        // Existing outdent logic
        if (line.text.startsWith('    ')) {
          line.text = line.text.slice(4);
        } else if (line.text.startsWith('- ')) {
          line.text = line.text.slice(2);
        }
      } else {
        // Indent with bullet or additional space
        if (!line.text.startsWith('- ')) {
          line.text = '- ' + line.text;
        } else {
          line.text = '    ' + line.text;
        }
      }

      setLines(newLines);

      setTimeout(() => {
        const cursor = textareasRef.current[index];
        if (cursor) {
          const offset = e.shiftKey ? -4 : 4;
          const pos = Math.max(0, e.target.selectionStart + offset);
          cursor.selectionStart = cursor.selectionEnd = pos;
        }
      }, 0);

      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const cursorPos = e.target.selectionStart;
      const newLines = [...lines];
      const currentLine = newLines[index];
      const before = currentLine.text.slice(0, cursorPos);
      const after = currentLine.text.slice(cursorPos);

      // Continue list items if prefixed with "- "
      const listMatch = before.match(/^(-\s+)/);
      currentLine.text = before;
      const newLineText = listMatch ? listMatch[1] + after : after;

      const newLine = {
        id: `line-${Date.now()}`,
        text: newLineText,
        isTitle: false
      };

      newLines.splice(index + 1, 0, newLine);
      setLines(newLines);
      
      // Update cursor line to point to the new line for view mode navigation
      setCursorLine(index + 1);

      setTimeout(() => {
        const nextTextarea = textareasRef.current[index + 1];
        if (nextTextarea) {
          nextTextarea.focus();
          nextTextarea.selectionStart = nextTextarea.selectionEnd = newLineText.length;
        }
      }, 0);

      return;
    }

    if (e.key === 'ArrowUp' && !e.shiftKey) {
      const cursorPosition = e.target.selectionStart;
      if (cursorPosition === 0 && index > 0) {
        e.preventDefault();
        textareasRef.current[index - 1]?.focus();
        return;
      }
    }

    if (e.key === 'ArrowDown' && !e.shiftKey) {
      const cursorPosition = e.target.selectionStart;
      const textLength = e.target.value.length;
      if (cursorPosition === textLength && index < lines.length - 1) {
        e.preventDefault();
        // Auto-prefix next line if current is a list item
        const newLines = [...lines];
        const match = newLines[index].text.match(/^(-\s+)/);
        if (match && !newLines[index + 1].text.startsWith(match[1])) {
          newLines[index + 1].text = match[1] + newLines[index + 1].text;
          setLines(newLines);
        }
        textareasRef.current[index + 1]?.focus();
        return;
      }
    }

    if (e.metaKey || e.ctrlKey) {
      const newLines = [...lines];

      // Move up
      if (e.key === 'ArrowUp' && index > 0) {
        e.preventDefault();
        const temp = newLines[index];
        newLines[index] = newLines[index - 1];
        newLines[index - 1] = temp;
        setLines(newLines);
        setTimeout(() => textareasRef.current[index - 1]?.focus(), 0);
      }

      // Move down
      if (e.key === 'ArrowDown' && index < newLines.length - 1) {
        e.preventDefault();
        const temp = newLines[index];
        newLines[index] = newLines[index + 1];
        newLines[index + 1] = temp;
        setLines(newLines);
        setTimeout(() => textareasRef.current[index + 1]?.focus(), 0);
      }
    }

    // Shift+Up and Shift+Down to move lines
    if (e.shiftKey && !e.metaKey && !e.ctrlKey) {
      const newLines = [...lines];

      // Move up with Shift+Up
      if (e.key === 'ArrowUp' && index > 0) {
        e.preventDefault();
        const temp = newLines[index];
        newLines[index] = newLines[index - 1];
        newLines[index - 1] = temp;
        setLines(newLines);
        setTimeout(() => textareasRef.current[index - 1]?.focus(), 0);
        return;
      }

      // Move down with Shift+Down
      if (e.key === 'ArrowDown' && index < newLines.length - 1) {
        e.preventDefault();
        const temp = newLines[index];
        newLines[index] = newLines[index + 1];
        newLines[index + 1] = temp;
        setLines(newLines);
        setTimeout(() => textareasRef.current[index + 1]?.focus(), 0);
        return;
      }
      }

      // Duplicate line
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'd') {
        e.preventDefault();
      const newLines = [...lines];
        newLines.splice(index + 1, 0, {
          id: `line-${Date.now()}`,
          text: newLines[index].text,
          isTitle: false,
        });
        setLines(newLines);
        setTimeout(() => textareasRef.current[index + 1]?.focus(), 0);
      }

      // Mark as title with Cmd+Option+T
      if ((e.metaKey || e.ctrlKey) && e.altKey && e.code === 'KeyT') {
        e.preventDefault();
        handleMarkAsTitle(index);
    }
  };

  const handleDeleteLine = (index) => {
    if (lines.length === 1) {
      const newLines = [...lines];
      newLines[0].text = '';
      setLines(newLines);
      setCursorLine(0);
    } else {
      const newLines = lines.filter((_, i) => i !== index);
      setLines(newLines);
      
      // Update cursor line after deletion
      if (cursorLine >= index) {
        // If cursor was at or after the deleted line, move it up
        setCursorLine(Math.max(0, cursorLine - 1));
      }
      // If cursor was before the deleted line, it stays the same
    }
  };

  const saveNote = () => {
    console.log('Saving note with lines:', lines);
    
    // Remove empty lines from the end and trim all lines
    const trimmedLines = lines
      .map(line => line.text.trim()) // Trim each line
      .filter(text => text !== ''); // Remove empty lines
    
    console.log('Trimmed lines:', trimmedLines);
    
    // Join lines with newlines
    const merged = trimmedLines.join('\n');
    console.log('Merged content:', merged);
    
    // Check if note is empty or only contains whitespace
    if (!merged || !merged.trim()) {
      return;
    }

    // Reorder meta tags to ensure they appear at the bottom
    const reorderedContent = reorderMetaTags(merged);
    console.log('Reordered content:', reorderedContent);
   console.log('isAddMode', isAddMode);
    if (isAddMode) {
        addNote(reorderedContent);
        setLines([{ id: 'line-0', text: '', isTitle: false }]);
        setUrlLabelSelection({ urlIndex: null, labelIndex: null });
        onCancel();
      //}
    } else {
        onSave(reorderedContent);
    //  });
    }
  };

  const handleSave = () => {
    saveNote();
  };

  useEffect(() => {
    const handleGlobalKey = (e) => {
      console.log('NoteEditor Global: Key pressed:', e.key, 'mode:', mode);
      // Check if we're in the note editor context or modal
      const noteEditorContainer = document.querySelector('.note-editor-container');
      const modalContainer = document.querySelector('[data-modal="true"]');
      const isInNoteEditor = noteEditorContainer?.contains(document.activeElement) || 
                            document.activeElement?.closest('.note-editor-container') ||
                            document.activeElement?.closest('[data-modal]') ||
                            (modalContainer && modalContainer.contains(document.activeElement));
      
      console.log('NoteEditor Global: isInNoteEditor:', isInNoteEditor, 'mode:', mode, 'activeElement:', document.activeElement?.tagName);
      
      // Always handle navigation keys if we're in the note editor context and in view mode
      if (isInNoteEditor && mode === 'view') {
        console.log('NoteEditor Global: Handling navigation key:', e.key, 'mode:', mode);
        if (e.key === 'j' || e.key === 'ArrowDown') {
          e.preventDefault();
          e.stopPropagation();
          setCursorLine(prev => Math.min(prev + 1, lines.length - 1));
          return;
        }
        if (e.key === 'k' || e.key === 'ArrowUp') {
          e.preventDefault();
          e.stopPropagation();
          setCursorLine(prev => Math.max(prev - 1, 0));
          return;
        }
        if (e.key === 'gg') {
          e.preventDefault();
          e.stopPropagation();
          setCursorLine(0);
          return;
        }
        if (e.key === 'G' && e.shiftKey) {
          e.preventDefault();
          e.stopPropagation();
          setCursorLine(lines.length - 1);
          return;
        }
      }
      
      // Handle navigation keys in edit mode
      if (isInNoteEditor && mode === 'edit') {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          // Only handle if we're not in a textarea (to avoid interfering with text editing)
          if (e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'INPUT') {
            e.preventDefault();
            e.stopPropagation();
            
            if (e.key === 'ArrowDown') {
              setCursorLine(prev => Math.min(prev + 1, lines.length - 1));
            } else if (e.key === 'ArrowUp') {
              setCursorLine(prev => Math.max(prev - 1, 0));
            }
            
            // Focus on the new cursor line
            setTimeout(() => {
              if (textareasRef.current[cursorLine]) {
                const textarea = textareasRef.current[cursorLine];
                textarea.focus();
                textarea.setSelectionRange(textarea.value.length, textarea.value.length);
              }
            }, 50);
            return;
          }
        }
      }
      
      // Handle header formatting in view mode
      console.log('NoteEditor Global: Checking header formatting condition:', 'isInNoteEditor:', isInNoteEditor, 'mode:', mode, 'key:', e.key);
      if (isInNoteEditor && mode === 'view' && (e.key === '1' || e.key === '2' || e.key === '0')) {
        console.log('NoteEditor Global: Header formatting key pressed:', e.key, 'cursorLine:', cursorLine);
        e.preventDefault();
        e.stopPropagation();
        
        const newLines = [...lines];
        const currentLine = newLines[cursorLine];
        
        if (e.key === '1') {
          // Make h1 by wrapping in ###
          if (!currentLine.text.startsWith('###') && !currentLine.text.endsWith('###')) {
            currentLine.text = `###${currentLine.text}###`;
            console.log('NoteEditor Global: Applied h1 formatting');
          }
        } else if (e.key === '2') {
          // Make h2 by wrapping in ##
          if (!currentLine.text.startsWith('##') && !currentLine.text.endsWith('##')) {
            currentLine.text = `##${currentLine.text}##`;
            console.log('NoteEditor Global: Applied h2 formatting');
          }
        } else if (e.key === '0') {
          // Clear all #'s wrapping from start and end
          currentLine.text = currentLine.text.replace(/^#+/, '').replace(/#+$/, '');
          console.log('NoteEditor Global: Cleared header formatting');
        }
        
        setLines(newLines);
        
        // Keep focus on the same line after header formatting
        setTimeout(() => {
          if (textareasRef.current[cursorLine]) {
            const textarea = textareasRef.current[cursorLine];
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
          }
        }, 50);
        return;
      }
      
      // Handle line deletion in view mode
      if (isInNoteEditor && mode === 'view' && e.key === 'x') {
        console.log('NoteEditor Global: Delete line key pressed:', 'cursorLine:', cursorLine);
        e.preventDefault();
        e.stopPropagation();
        
        // Don't delete if it's the last line and it's empty
        if (lines.length === 1 && lines[0].text.trim() === '') {
          console.log('NoteEditor Global: Skipping deletion of last empty line');
          return;
        }
        
        // Delete the current line
        const newLines = lines.filter((_, index) => index !== cursorLine);
        setLines(newLines);
        
        // Move focus to next line if present, otherwise to previous line
        let newCursorLine = cursorLine;
        if (cursorLine < newLines.length) {
          // Move to next line (same position)
          newCursorLine = cursorLine;
        } else {
          // Move to previous line (last line)
          newCursorLine = Math.max(0, newLines.length - 1);
        }
        
        setCursorLine(newCursorLine);
        
        // Focus on the new line
        setTimeout(() => {
          if (textareasRef.current[newCursorLine]) {
            const textarea = textareasRef.current[newCursorLine];
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
          }
        }, 50);
        
        console.log('NoteEditor Global: Line deleted, moved to line:', newCursorLine);
        return;
      }
      
      // Only handle other keys when the note editor is focused
      if (!isInNoteEditor) {
        return;
      }
      
      // Mode switching
      if (e.key === 'i' && mode === 'view') {
        e.preventDefault();
        e.stopPropagation();
        setMode('edit');
        // Focus on the current cursor line and place cursor at the end
        setTimeout(() => {
          if (textareasRef.current[cursorLine]) {
            const textarea = textareasRef.current[cursorLine];
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
          }
        }, 50);
        return;
      }
      
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (mode === 'edit') {
          setMode('view');
        } else if (mode === 'view') {
          onCancel();
        }
        return;
      }
      
      if (e.key === 'Enter' && mode === 'view') {
        e.preventDefault();
        e.stopPropagation();
        
        // Check if the current line contains just a URL
        const currentLine = lines[cursorLine];
        const urlPattern = /^https?:\/\/[^\s]+$/;
        if (currentLine && urlPattern.test(currentLine.text.trim())) {
          // Open URL edit popup
          setPendingUrlIndex(cursorLine);
          setCustomLabel(new URL(currentLine.text.trim()).hostname);
          return;
        }
        
        // Otherwise, enter edit mode
        setMode('edit');
        // Focus on the current cursor line and place cursor at the end
        setTimeout(() => {
          if (textareasRef.current[cursorLine]) {
            const textarea = textareasRef.current[cursorLine];
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
          }
        }, 50);
        return;
      }
      
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        
        // Check if all lines are empty
        const hasContent = lines.some(line => line.text.trim() !== '');
        if (!hasContent) {
          return; // Don't do anything if all lines are empty
        }
       console.log('isAddMode', isAddMode);
        saveNote();
      }
    };
    document.addEventListener('keydown', handleGlobalKey);
    return () => {
      document.removeEventListener('keydown', handleGlobalKey);
    };
  }, [lines, isAddMode, note, addNote, onSave, onCancel, mode, cursorLine]);

  useEffect(() => {
    const hideContext = () => setContextMenu({ visible: false, x: 0, y: 0, index: null });
    window.addEventListener('click', hideContext);
    return () => window.removeEventListener('click', hideContext);
  }, []);


  function getCursorCoordinates(textarea) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return null;

    const range = selection.getRangeAt(0).cloneRange();
    const rects = range.getClientRects();

    if (rects.length > 0) {
      const rect = rects[0];
      const caretOffsetX = textarea.selectionStart * 6; // Approximate width per character
      return {
        x: rect.left + window.scrollX + caretOffsetX,
        y: rect.top + window.scrollY
      };
    }

    // If there's no rect (empty line), insert a dummy span to measure
    const dummy = document.createElement("span");
    dummy.textContent = "\u200b"; // zero-width space
    range.insertNode(dummy);
    const rect = dummy.getBoundingClientRect();
    const caretOffsetX = textarea.selectionStart * 6; // Approximate width per character
    const coords = {
      x: rect.left + window.scrollX + caretOffsetX,
      y: rect.top + window.scrollY
    };
    dummy.parentNode.removeChild(dummy);
    return coords;
  }

  const handleInputChange = (e) => {
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);

    // Get the caret position relative to the current node
    const caretOffset = range.startOffset;

    const inputedText = e.target.value || '';

    //Needed to fix issue of popup showing after deleting all text and popup showing up based on last deleted char
    if (!inputedText || inputedText.trim().length === 0) {
        setShowPopup(false);
        return;
    }

    const match = inputedText.trim().match(/(\S+)$/); // Match the last word
    if (match && match[1]) {
        const filterText = match[1].toLowerCase();
        let filtered = [];

        // Throttle logic
        if (filterText !== "") {
            clearTimeout(throttleRef.current); // Clear the existing timeout
            throttleRef.current = setTimeout(() => {
                if (filterText === "cal") {
                    // Calendar logic here
                } else {
                    filtered = objList.filter((tag) =>
                        tag && tag.text && tag.text.toLowerCase().startsWith(filterText)
                    );

                    setFilteredTags(filtered.map(tag => tag.text));
                }
                if (filtered.length > 0) {
                    const textarea = textareasRef.current[focusedLineIndex];
                    if (textarea) {
                        const { x, y } = getCursorCoordinates(textarea);
                        setCursorPosition({ x, y: y + 20 });
                    }
                    setShowPopup(true);
                } else {
                    setShowPopup(false);
                }
            }, 300); // 300ms delay for throttling
        }
    } else {
        setShowPopup(false);
        setSelectedTagIndex(-1);
    }
  };


  const toCamelCase = (str) =>
    str
      .toLowerCase()
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) =>
        index === 0 ? word.toLowerCase() : word.toUpperCase()
      )
      .replace(/\s+/g, '');

  const handleCamelCase = (index) => {
    const newLines = [...lines];
    newLines[index].text = toCamelCase(newLines[index].text);
    setLines(newLines);
  };

  const toSentenceCase = (str) => {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const handleSentenceCase = (index) => {
    const newLines = [...lines];
    newLines[index].text = toSentenceCase(newLines[index].text);
    setLines(newLines);
  };

  return (
    <div 
      className="p-6 bg-white border border-gray-300 rounded-lg shadow-xl w-full note-editor-container note-editor" 
      data-modal="true"
      tabIndex={-1}
      onFocus={() => {}} // This makes the div focusable
      onClick={(e) => {
        // Focus the container when clicked
        if (e.target === e.currentTarget) {
          console.log('NoteEditor: Container clicked, focusing');
          e.currentTarget.focus();
        }
      }}
      onKeyDown={(e) => {
        console.log('NoteEditor Container: Key pressed:', e.key, 'mode:', mode, 'target:', e.target.tagName);
        // Direct keyboard handling for view mode navigation
        if (mode === 'view') {
          console.log('NoteEditor: Key pressed in view mode:', e.key);
          if (e.key === 'j' || e.key === 'ArrowDown') {
            e.preventDefault();
            e.stopPropagation();
            setCursorLine(prev => Math.min(prev + 1, lines.length - 1));
            return;
          }
          if (e.key === 'k' || e.key === 'ArrowUp') {
            e.preventDefault();
            e.stopPropagation();
            setCursorLine(prev => Math.max(prev - 1, 0));
            return;
          }
          if (e.key === 'gg') {
            e.preventDefault();
            e.stopPropagation();
            setCursorLine(0);
            return;
          }
          if (e.key === 'G' && e.shiftKey) {
            e.preventDefault();
            e.stopPropagation();
            setCursorLine(lines.length - 1);
            return;
          }
          if (e.key === 'i') {
            e.preventDefault();
            e.stopPropagation();
            setMode('edit');
            // Focus on the current cursor line and place cursor at the end
            setTimeout(() => {
              if (textareasRef.current[cursorLine]) {
                const textarea = textareasRef.current[cursorLine];
                textarea.focus();
                textarea.setSelectionRange(textarea.value.length, textarea.value.length);
              }
            }, 50);
            return;
          }
          if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            onCancel();
            return;
          }
          if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            
            // Check if the current line contains just a URL
            const currentLine = lines[cursorLine];
            const urlPattern = /^https?:\/\/[^\s]+$/;
            if (currentLine && urlPattern.test(currentLine.text.trim())) {
              // Open URL edit popup
              setPendingUrlIndex(cursorLine);
              setCustomLabel(new URL(currentLine.text.trim()).hostname);
              return;
            }
            
            // Otherwise, enter edit mode
            setMode('edit');
            // Focus on the current cursor line and place cursor at the end
            setTimeout(() => {
              if (textareasRef.current[cursorLine]) {
                const textarea = textareasRef.current[cursorLine];
                textarea.focus();
                textarea.setSelectionRange(textarea.value.length, textarea.value.length);
              }
            }, 50);
            return;
          }
          
          // Handle header formatting in view mode
          console.log('NoteEditor Container: Checking header formatting condition:', 'key:', e.key);
          if (e.key === '1' || e.key === '2' || e.key === '0') {
            console.log('NoteEditor: Header formatting key pressed:', e.key, 'cursorLine:', cursorLine);
            e.preventDefault();
            e.stopPropagation();
            
            const newLines = [...lines];
            const currentLine = newLines[cursorLine];
            
            if (e.key === '1') {
              // Make h1 by wrapping in ###
              if (!currentLine.text.startsWith('###') && !currentLine.text.endsWith('###')) {
                currentLine.text = `###${currentLine.text}###`;
                console.log('NoteEditor: Applied h1 formatting');
              }
            } else if (e.key === '2') {
              // Make h2 by wrapping in ##
              if (!currentLine.text.startsWith('##') && !currentLine.text.endsWith('##')) {
                currentLine.text = `##${currentLine.text}##`;
                console.log('NoteEditor: Applied h2 formatting');
              }
            } else if (e.key === '0') {
              // Clear all #'s wrapping from start and end
              currentLine.text = currentLine.text.replace(/^#+/, '').replace(/#+$/, '');
              console.log('NoteEditor: Cleared header formatting');
            }
            
            setLines(newLines);
            
            // Keep focus on the same line after header formatting
            setTimeout(() => {
              if (textareasRef.current[cursorLine]) {
                const textarea = textareasRef.current[cursorLine];
                textarea.focus();
                textarea.setSelectionRange(textarea.value.length, textarea.value.length);
              }
            }, 50);
            return;
          }
          
          // Handle line deletion in view mode
          if (e.key === 'x') {
            console.log('NoteEditor: Delete line key pressed:', 'cursorLine:', cursorLine);
            e.preventDefault();
            e.stopPropagation();
            
            // Don't delete if it's the last line and it's empty
            if (lines.length === 1 && lines[0].text.trim() === '') {
              console.log('NoteEditor: Skipping deletion of last empty line');
              return;
            }
            
            // Delete the current line
            const newLines = lines.filter((_, index) => index !== cursorLine);
            setLines(newLines);
            
            // Move focus to next line if present, otherwise to previous line
            let newCursorLine = cursorLine;
            if (cursorLine < newLines.length) {
              // Move to next line (same position)
              newCursorLine = cursorLine;
            } else {
              // Move to previous line (last line)
              newCursorLine = Math.max(0, newLines.length - 1);
            }
            
            setCursorLine(newCursorLine);
            
            // Focus on the new line
            setTimeout(() => {
              if (textareasRef.current[newCursorLine]) {
                const textarea = textareasRef.current[newCursorLine];
                textarea.focus();
                textarea.setSelectionRange(textarea.value.length, textarea.value.length);
              }
            }, 50);
            
            console.log('NoteEditor: Line deleted, moved to line:', newCursorLine);
            return;
          }
        }
      }}
    >
      {/* Mode indicator */}
      <div className="mb-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className={`px-3 py-1 rounded text-sm font-mono ${
            mode === 'view' 
              ? 'bg-blue-100 text-blue-800 border border-blue-300' 
              : 'bg-green-100 text-green-800 border border-green-300'
          }`}>
            {mode === 'view' ? 'VIEW' : 'EDIT'}
          </div>
          <div className="text-xs text-gray-500">
            {mode === 'view' ? 'Press i to enter edit mode' : 'Press Esc to return to view mode'}
          </div>
        </div>
        {!isAddMode && (
          <button
            onClick={() => setIsTextMode(!isTextMode)}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            {isTextMode ? 'Advanced Mode' : 'Text Mode'}
          </button>
        )}
      </div>
      {mergedContent && (
        <div className="fixed top-10 left-1/2 transform -translate-x-1/2 bg-white shadow-lg border border-gray-300 rounded p-4 z-50 max-w-xl w-full">
          <h2 className="font-bold mb-2">Merged Note</h2>
          <pre className="whitespace-pre-wrap text-sm">{mergedContent}</pre>
          <button
            onClick={() => setMergedContent(null)}
            className="mt-4 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700"
          >
            Close
          </button>
          <button
            onClick={() => {
              setLines([{ id: 'line-0', text: '#people', isTitle: false }]);
              if (setSearchQuery) setSearchQuery('#people');
            }}
            className="px-3 py-1 text-xs rounded bg-blue-100 hover:bg-blue-200 text-blue-800"
          >
            People
          </button>
        </div>
      )}
      <div className="mb-4 flex justify-end items-center">
        {!isAddMode && (
          <button
            onClick={() => setIsTextMode(!isTextMode)}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            {isTextMode ? 'Advanced Mode' : 'Text Mode'}
          </button>
        )}
        {pendingUrlIndex !== null && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-md w-96 max-h-[90vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Edit Link Text</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="custom-label-input" className="block text-sm mb-2 text-gray-700">
                    Custom text for the link:
                  </label>
                  <input
                    id="custom-label-input"
                    type="text"
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === 'Escape') {
                        const newLines = [...lines];
                        const url = newLines[pendingUrlIndex].text.match(/\((https?:\/\/[^\s)]+)\)/)?.[1] || newLines[pendingUrlIndex].text;
                        newLines[pendingUrlIndex].text = `[${customLabel}](${url})`;
                        setLines(newLines);
                        setPendingUrlIndex(null);
                        setCustomLabel('');
                        setShowTextSelection(false);
                        
                        // Add a new row and focus on it
                        const updatedLines = [...newLines];
                        updatedLines.splice(pendingUrlIndex + 1, 0, {
                          id: `line-${Date.now()}-new`,
                          text: '',
                          isTitle: false
                        });
                        setLines(updatedLines);
                        setTimeout(() => {
                          const nextTextarea = textareasRef.current[pendingUrlIndex + 1];
                          if (nextTextarea) {
                            nextTextarea.focus();
                          }
                        }, 0);
                      }
                    }}
                    className="w-full border px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter custom text"
                    autoFocus
                  />
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setShowTextSelection(!showTextSelection)}
                    className="w-full px-4 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-between"
                  >
                    <span>Select from text</span>
                    {showTextSelection ? (
                      <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRightIcon className="h-4 w-4 text-gray-500" />
                    )}
                  </button>
                  
                  {showTextSelection && (
                    <div className="border-t max-h-48 overflow-y-auto">
                      {lines.map((line, idx) => {
                        // Skip empty lines, meta lines, and the current URL line
                        if (
                          idx === pendingUrlIndex ||
                          !line.text.trim() ||
                          line.text.trim().startsWith('meta::') ||
                          line.text.match(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/) ||
                          line.text.match(/^https?:\/\/[^\s]+$/)
                        ) {
                          return null;
                        }

                        return (
                          <button
                            key={line.id}
                            onClick={() => {
                              setCustomLabel(line.text);
                              // Remove the selected line from the note
                              const newLines = [...lines];
                              // Get the URL from the current URL line
                              const url = newLines[pendingUrlIndex].text.match(/\((https?:\/\/[^\s)]+)\)/)?.[1] || newLines[pendingUrlIndex].text;
                              // Update the URL line with the markdown link format
                              newLines[pendingUrlIndex].text = `[${line.text}](${url})`;
                              // Remove the selected text line
                              newLines.splice(idx, 1);
                              setLines(newLines);
                              setPendingUrlIndex(null);
                              setCustomLabel('');
                              setShowTextSelection(false);
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 border-b last:border-b-0 flex items-center group"
                          >
                            <span className="flex-1 truncate">{line.text}</span>
                            <span className="text-blue-500 opacity-0 group-hover:opacity-100 ml-2">Use</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="text-sm text-gray-500 break-all">
                  <span className="font-medium">URL: </span>
                  <span className="break-all">
                    {lines[pendingUrlIndex]?.text.match(/\((https?:\/\/[^\s)]+)\)/)?.[1] || lines[pendingUrlIndex]?.text}
                  </span>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    onClick={() => {
                      setPendingUrlIndex(null);
                      setCustomLabel('');
                      setShowTextSelection(false);
                    }}
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const newLines = [...lines];
                      const url = newLines[pendingUrlIndex].text.match(/\((https?:\/\/[^\s)]+)\)/)?.[1] || newLines[pendingUrlIndex].text;
                      newLines[pendingUrlIndex].text = `[${customLabel}](${url})`;
                      setLines(newLines);
                      setPendingUrlIndex(null);
                      setCustomLabel('');
                      setShowTextSelection(false);
                    }}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* {isAddMode && !isModal && (
        <div className="mb-4 flex flex-wrap gap-2 group relative">
          <NoteFilters
            setLines={setLines}
            setShowTodoSubButtons={setShowTodoSubButtons}
            setActivePriority={setActivePriority}
            setSearchQuery={setSearchQuery}
            searchQuery={searchQuery}
            settings={settings}
          />
        </div>
      )} */}
      {isTextMode ? (
        <textarea
          className="w-full p-4 text-sm border border-gray-300 rounded-lg shadow-sm resize-none min-h-[200px] font-mono"
          value={lines.map(line => line.text).join('\n')}
          onChange={(e) => {
            const timestamp = Date.now();
            const updatedLines = e.target.value.split('\n').map((text, index) => ({
              id: `line-${timestamp}-${index}`,
              text,
              isTitle: text.startsWith('##') && text.endsWith('##'),
            }));
            setLines(updatedLines);
            // Update search query if in add mode
            if (isAddMode && setSearchQuery) {
              console.log('Setting searchQuery in textarea mode:', e.target.value);
              setSearchQuery(e.target.value);
            }
          }}
        />
      ) : (
        <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 shadow-sm">
          {/* Regular content lines */}
          {lines.filter(line => !line.text.trim().startsWith('meta::')).map((line, index) => {
            const originalIndex = lines.findIndex(l => l.id === line.id);
            const isCursorLine = mode === 'view' && cursorLine === originalIndex;
            return (
            <div
              key={line.id}
              draggable
              onDragStart={(e) => handleDragStart(e, originalIndex)}
              onDragOver={(e) => {
                e.preventDefault();
                handleDragOver(originalIndex);
              }}
              onDrop={(e) => handleDrop(e, originalIndex)}
                              className={`relative group transition border-l-4 border-transparent ${
                mode === 'view' 
                  ? isCursorLine 
                    ? 'bg-blue-50 border-blue-400' 
                    : 'bg-gray-50 hover:bg-gray-100'
                  : 'bg-gray-50 hover:bg-white hover:border-blue-400'
              } ${dropTargetIndex === originalIndex ? 'border-blue-500' : ''}`}
            >
              {dropTargetIndex === originalIndex && draggedId !== lines[originalIndex].id && (
                <div className="h-1 bg-blue-500 rounded my-1"></div>
              )}
              <div className="flex items-start px-3 py-2 relative">
                <span className="absolute left-1 top-2 text-gray-400 cursor-grab group-hover:opacity-100 opacity-0">☰</span>
                {line.text.match(/^https?:\/\/[^\s]+$/) && urlLabelSelection.urlIndex === null && (
                  <input
                    type="checkbox"
                    title="Select this URL"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setUrlLabelSelection({ urlIndex: originalIndex, labelIndex: null });
                      }
                    }}
                    className="mr-2 mt-1"
                  />
                )}
                {!line.text.match(/https?:\/\/[^\s]+/) && urlLabelSelection.urlIndex !== null && (
                  <input
                    type="checkbox"
                    title="Use this line as label"
                    checked={urlLabelSelection.labelIndex === originalIndex}
                    onChange={(e) => {
                      setUrlLabelSelection((prev) => ({
                        ...prev,
                        labelIndex: e.target.checked ? originalIndex : null,
                      }));
                    }}
                    className="mr-2 mt-1"
                  />
                )}
                {line.text.match(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/) ? (
                  <div className="flex items-center pl-6 pr-28 w-full">
                    <button
                      onClick={() => {
                        const match = line.text.match(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/);
                        const currentLabel = match[1];
                        const url = match[2];
                        setPendingUrlIndex(originalIndex);
                        setCustomLabel(currentLabel);
                      }}
                      className="text-blue-600 hover:text-blue-800 underline text-sm mr-2 text-left"
                    >
                      {line.text.match(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/)[1]}
                    </button>
                    <button
                      onClick={() => handleDeleteLine(index)}
                      className="text-red-400 text-xs ml-2 font-mono transition-transform transform hover:scale-150"
                      title="Remove URL"
                    >
                      x
                    </button>
                  </div>
                ) : line.text.match(/^https?:\/\/[^\s]+$/) ? (
                  <div className="flex items-center pl-6 pr-28 w-full">
                    <button
                      onClick={() => {
                        setPendingUrlIndex(originalIndex);
                        setCustomLabel(new URL(line.text).hostname);
                      }}
                      className="text-blue-600 hover:text-blue-800 underline text-sm mr-2 text-left"
                    >
                      {new URL(line.text).hostname}
                    </button>
                    <button
                      onClick={() => handleDeleteLine(index)}
                      className="text-red-400 text-xs ml-2 font-mono transition-transform transform hover:scale-150"
                      title="Remove URL"
                    >
                      x
                    </button>
                  </div>
                ) : mode === 'view' ? (
                  <div 
                    className={`w-full pl-6 pr-28 text-sm cursor-pointer ${
                      line.isTitle ? 'font-bold text-lg text-gray-800' : 'text-gray-700'
                    } ${isCursorLine ? 'bg-blue-100' : ''}`}
                    onClick={() => setCursorLine(originalIndex)}
                  >
                    {isCursorLine && <span className="text-blue-600 mr-1">▶</span>}
                    {line.text || ' '}
                  </div>
                ) : (
                  <textarea
                    ref={(el) => (textareasRef.current[originalIndex] = el)}
                    value={line.text}
                    onFocus={() => setFocusedLineIndex(originalIndex)}
                    onChange={(e) => {
                      handleTextChange(originalIndex, e.target.value);
                    }}
                    onKeyDown={(e) => handleKeyDown(e, originalIndex)}
                    onPaste={(e) => handlePaste(e, originalIndex)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({
                        visible: true,
                        x: e.clientX,
                        y: e.clientY,
                        index: originalIndex
                      });
                    }}
                    className={`w-full pl-6 pr-28 bg-transparent resize-none focus:outline-none text-sm ${
                      line.isTitle ? 'font-bold text-lg text-gray-800' : 'text-gray-700'
                    }`}
                    rows={1}
                  />
                )}
                {!isTextMode && mode === 'edit' && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex flex-row justify-center gap-0.5 h-full items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {line.text && (
                      <>
                        <button
                          onClick={() => {
                            const newLines = [...lines];
                            newLines[originalIndex].text = '';
                            setLines(newLines);
                          }}
                          className="text-gray-500 text-sm hover:text-blue-500 px-2 py-0.5 border border-gray-300 rounded hover:border-blue-500 transition-colors"
                          title="Clear text"
                        >
                          Clear
                        </button>
                        <div className="h-4 w-px bg-gray-200 mx-1"></div>
                      </>
                    )}
                    <button
                      onClick={() => handleMarkAsTitle(originalIndex)}
                      className="text-gray-500 text-xs hover:text-black px-1 transition-transform transform hover:scale-125"
                      title="Mark as H1"
                    >
                      H1
                    </button>
                    <button
                      onClick={() => handleMarkAsSubtitle(originalIndex)}
                      className="text-gray-500 text-xs hover:text-black px-1 transition-transform transform hover:scale-125"
                      title="Mark as H2"
                    >
                      H2
                    </button>
                    <button
                      onClick={() => {
                        const newLines = [...lines];
                        newLines[originalIndex].text = newLines[originalIndex].text.toUpperCase();
                        setLines(newLines);
                      }}
                      className="text-gray-500 text-xs hover:text-black px-1 transition-transform transform hover:scale-125"
                      title="UPPERCASE"
                    >
                      AA
                    </button>
                    <button
                      onClick={() => handleSentenceCase(originalIndex)}
                      className="text-gray-500 text-xs hover:text-black px-1 transition-transform transform hover:scale-125"
                      title="Sentence case"
                    >
                      Aa
                    </button>
                    <div className="h-4 w-px bg-gray-200 mx-1"></div>
                    <button
                      onClick={() => handleDeleteLine(originalIndex)}
                      className="text-gray-500 text-xs hover:text-red-500 px-1 transition-transform transform hover:scale-125"
                      title="Delete line"
                    >
                      🗑
                    </button>
                    <button
                      onClick={() => {
                        const newLines = [...lines];
                        newLines.splice(index, 0, {
                          id: `line-${Date.now()}-above`,
                          text: '',
                          isTitle: false
                        });
                        setLines(newLines);
                        setTimeout(() => textareasRef.current[index]?.focus(), 0);
                      }}
                      className="text-gray-500 text-xs hover:text-black px-1 transition-transform transform hover:scale-125"
                      title="Insert line above"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => {
                        const newLines = [...lines];
                        newLines.splice(index + 1, 0, {
                          id: `line-${Date.now()}-below`,
                          text: '',
                          isTitle: false
                        });
                        setLines(newLines);
                        setTimeout(() => textareasRef.current[index + 1]?.focus(), 0);
                      }}
                      className="text-gray-500 text-xs hover:text-black px-1 transition-transform transform hover:scale-125"
                      title="Insert line below"
                    >
                      ↓
                    </button>
                    {(() => {
                      const text = lines[index]?.text || '';
                      const isH1 = text.startsWith('###') && text.endsWith('###');
                      const isH2 = text.startsWith('##') && text.endsWith('##');
                      if (isH1 || isH2) {
                        return (
                          <>
                            <div className="h-4 w-px bg-gray-200 mx-1"></div>
                            <button
                              onClick={() => {
                                const newLines = [...lines];
                                let text = newLines[index].text;
                                if (isH1) text = text.slice(3, -3);
                                else if (isH2) text = text.slice(2, -2);
                                newLines[index].text = text;
                                newLines[index].isTitle = false;
                                setLines(newLines);
                              }}
                              className="text-gray-500 text-xs hover:text-red-500 px-1 transition-transform transform hover:scale-125"
                              title="Remove formatting"
                            >
                              ❌
                            </button>
                          </>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </div>
            </div>
          );
          })}
          
          {/* Meta:: lines section */}
          {lines.filter(line => line.text.trim().startsWith('meta::')).length > 0 && (
            <>
              <div className="border-t-2 border-gray-300 bg-gray-50 px-3 py-2">
                <div className="text-xs font-medium text-gray-600 mb-2">Meta Tags (Read-only)</div>
                {lines.filter(line => line.text.trim().startsWith('meta::')).map((line, index) => (
                  <div key={line.id} className="flex items-center py-1">
                    <span className="text-gray-400 text-xs mr-2">☰</span>
                    <div className="flex-1 text-sm text-gray-700 font-mono bg-gray-100 px-2 py-1 rounded">
                      {line.text}
              </div>
            </div>
          ))}
              </div>
            </>
          )}
        </div>
      )}
      {showDatePicker && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white p-4 rounded shadow-md">
            <input
              type="datetime-local"
              onChange={(e) => handleDateSelect(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            />
            <button onClick={() => setShowDatePicker(false)} className="ml-2 text-sm text-red-500 hover:underline">
              Cancel
            </button>
          </div>
        </div>)}
      {urlLabelSelection.urlIndex !== null && urlLabelSelection.labelIndex !== null && (
        <div className="flex justify-end mt-4">
          <button
            onClick={() => {
              const newLines = [...lines];
              const label = newLines[urlLabelSelection.labelIndex].text;
              const urlLine = newLines[urlLabelSelection.urlIndex];
              const urlMatch = urlLine.text.match(/https?:\/\/[^\s]+/);
              if (urlMatch) {
                const url = urlMatch[0];
                urlLine.text = urlLine.text.replace(url, `[${label}](${url})`);
                newLines.splice(urlLabelSelection.labelIndex, 1);
                setLines(newLines);
                setUrlLabelSelection({ urlIndex: null, labelIndex: null });
              }
            }}
            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
          >
            Make URL Text
          </button>
        </div>
      )}
      <div className="flex justify-end gap-3 mt-6">
        {isAddMode && (
          <button
            onClick={() => {
              const merged = lines.map(line => line.text).join('\n');
              const reorderedContent = reorderMetaTags(merged);
              addNote(reorderedContent);
              setLines([{ id: 'line-0', text: '', isTitle: false }]);
              setUrlLabelSelection({ urlIndex: null, labelIndex: null });
              onCancel();
            }}
            className="px-3 py-1.5 rounded text-sm bg-gray-800 text-white hover:bg-gray-700 shadow-sm"
          >
            Add Note
          </button>
        )}
        {isAddMode ? (
          <button
            onClick={() => {
              setLines([{ id: 'line-0', text: '', isTitle: false }]);
              setSearchQuery && setSearchQuery('');
              setShowTodoSubButtons(false);
              setActivePriority('');
              setShowEndDateFilterSubButtons(false);
              setTimeout(() => {
                if (textareasRef.current[0]) {
                  textareasRef.current[0].focus();
                }
              }, 0);
            }}
            className="px-3 py-1.5 rounded text-sm bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
          >
            Clear
          </button>
        ) : (
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded text-sm bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
          >
            Cancel
          </button>
        )}
        {!isAddMode && (
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
          >
            Save
          </button>
        )}
      </div>

      {showPopup && (
        <div
          id="tagpop"
          ref={popupRef}
          className="fixed bg-white border-2 border-purple-500 rounded-lg shadow-lg p-2 z-[9999] max-h-40 overflow-y-auto no-scrollbar text-sm w-52"
          style={{
            left: cursorPosition.x,
            top: cursorPosition.y + 5,
            minHeight: '40px'
          }}
        >
          {filteredTags.length === 0 ? (
            <div className="p-2 text-gray-500">No matching tags</div>
          ) : (
            filteredTags.map((tag, index) => (
              <div
                key={tag}
                onClick={() => handleSelectTag(tag)}
                className={`p-2 cursor-pointer hover:bg-purple-100 ${
                  selectedTagIndex === index ? "bg-purple-200" : ""
                }`}
              >
                {tag}
              </div>
            ))
          )}
        </div>
      )}
      {contextMenu.visible && (
        <div
          className="fixed bg-white border border-gray-300 rounded shadow-md z-50 p-2"
          style={{
            left: Math.min(contextMenu.x, window.innerWidth - 200),
            top: Math.min(contextMenu.y, window.innerHeight - 250),
          }}
        >
          <button
            className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100"
            onClick={() => handleMarkAsTitle(contextMenu.index)}
          >
            H1
          </button>
          <button
            className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100"
            onClick={() => handleMarkAsSubtitle(contextMenu.index)}
          >
            H2
          </button>
          <button
            className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100"
            onClick={() => {
              const newLines = [...lines];
              newLines[contextMenu.index].text = newLines[contextMenu.index].text.toUpperCase();
              setLines(newLines);
            }}
          >
            CAPS
          </button>
          <button
            className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100"
            onClick={() => {
              const newLines = [...lines];
              newLines[contextMenu.index].text = toSentenceCase(newLines[contextMenu.index].text);
              setLines(newLines);
            }}
          >
            Sentence Case
          </button>
          <button
            className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100 text-red-500"
            onClick={() => {
              if (lines.length === 1) {
                const newLines = [...lines];
                newLines[0].text = '';
                setLines(newLines);
              } else {
                const newLines = lines.filter((_, i) => i !== contextMenu.index);
                setLines(newLines);
              }
            }}
          >
            🗑 Delete Line
          </button>
          {(() => {
            const text = lines[contextMenu.index]?.text || '';
            const isH1 = text.startsWith('###') && text.endsWith('###');
            const isH2 = text.startsWith('##') && text.endsWith('##');
            if (isH1 || isH2) {
              return (
                <button
                  className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100 text-red-500"
                  onClick={() => {
                    const newLines = [...lines];
                    let text = newLines[contextMenu.index].text;
                    if (isH1) text = text.slice(3, -3);
                    else if (isH2) text = text.slice(2, -2);
                    newLines[contextMenu.index].text = text;
                    newLines[contextMenu.index].isTitle = false;
                    setLines(newLines);
                  }}
                >
                  ❌ Remove Formatting
                </button>
              );
            }
            return null;
          })()}
          <button
            className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100"
            onClick={() => {
              const newLines = [...lines];
              newLines.splice(contextMenu.index, 0, {
                id: `line-${Date.now()}-above`,
                text: '',
                isTitle: false
              });
              setLines(newLines);
              setTimeout(() => textareasRef.current[contextMenu.index]?.focus(), 0);
            }}
          >
            ⬆️ Add Line Above
          </button>
          <button
            className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100"
            onClick={() => {
              const newLines = [...lines];
              newLines.splice(contextMenu.index + 1, 0, {
                id: `line-${Date.now()}-below`,
                text: '',
                isTitle: false
              });
              setLines(newLines);
              setTimeout(() => textareasRef.current[contextMenu.index + 1]?.focus(), 0);
            }}
          >
            ⬇️ Add Line Below
          </button>
          <button
            className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100"
            onClick={() => {
              const newLines = [...lines];
              const [selectedLine] = newLines.splice(contextMenu.index, 1);
              newLines.unshift(selectedLine);
              setLines(newLines);
              setTimeout(() => textareasRef.current[0]?.focus(), 0);
            }}
          >
            ⬆️ Move to Top
          </button>
        </div>
      )}

    </div>

  );
};

export default NoteEditor;