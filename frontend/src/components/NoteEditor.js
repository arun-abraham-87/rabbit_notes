import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { useHotkeys } from 'react-hotkeys-hook';
import { updateNoteById } from '../utils/ApiUtils';
import NoteFilters from './NoteFilters';
import { ChevronDownIcon, ChevronRightIcon, PlusIcon } from '@heroicons/react/24/solid';
import { debounce } from 'lodash';
import { reorderMetaTags } from '../utils/MetaTagUtils';
import { DevModeInfo } from '../utils/DevUtils';
import { decodeSensitiveContent, encodeSensitiveContent, hasEncodedContent, hasReversedUrls, restoreUrlsInText, reverseUrlsInText } from '../utils/SensitiveUrlUtils';

const NoteEditor = ({ isModal = false, objList, note, onSave, onCancel, text, searchQuery = '', setSearchQuery, addNote, isAddMode = false, settings = {}, onExcludeEventsChange = true, onExcludeMeetingsChange = true, initialMode = 'view', initialTextMode = false, onImagePaste = null }) => {
  // Component initialized - debug logs removed for cleaner experience

  const contentSource = isAddMode ? searchQuery || '' : text || note.content || '';

  // Check if this note has reversed URLs
  const noteHasEncodedContent = hasEncodedContent(contentSource);
  const noteHasReversedUrls = hasReversedUrls(contentSource);
  const editableContentSource = decodeSensitiveContent(contentSource);

  // Function to separate content from meta tags
  const separateContentFromMeta = (content) => {
    const lines = content.split('\n');
    const contentLines = [];
    const metaLines = [];

    for (const line of lines) {
      if (line.trim().startsWith('meta::')) {
        metaLines.push(line);
      } else {
        contentLines.push(line);
      }
    }

    return { contentLines, metaLines };
  };

  const { contentLines, metaLines } = separateContentFromMeta(editableContentSource);

  // Process content lines to restore URLs if they were reversed
  const processedContentLines = !noteHasEncodedContent && noteHasReversedUrls
    ? contentLines.map(text => restoreUrlsInText(text))
    : contentLines;

  const initialLines = editableContentSource
    ? [
      // Content lines (with restored URLs if they were reversed)
      ...processedContentLines.map((text, index) => ({
        id: `line-${index}`,
        text,
        isTitle: text.startsWith('{#h1#}') || text.startsWith('{#h2#}'),
      })),
      // Add empty line for editing (if not in add mode)
      ...(!isAddMode ? [{ id: `line-${Date.now()}-editing`, text: '', isTitle: false }] : []),
      // Meta lines
      ...metaLines.map((text, index) => ({
        id: `meta-${index}`,
        text,
        isTitle: false,
      }))
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
  const [insertionPoint, setInsertionPoint] = useState(null); // { index: number, position: 'above' | 'below' }

  // Removed vim-like mode system - always in edit mode

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

  // Global save shortcut for Cmd+Enter / Ctrl+Enter
  useHotkeys('meta+enter, ctrl+enter', (e) => {
    e.preventDefault();
    e.stopPropagation();
    saveNote();
  }, {
    enableOnFormTags: true,
    enableOnContentEditable: true,
    preventDefault: true
  });

  // Removed modal focus logic for view mode

  // Function to find the best cursor position for edit mode
  const findBestCursorPosition = () => {
    // Find the first meta line to determine where content ends
    const firstMetaIndex = lines.findIndex(line => line.text.trim().startsWith('meta::'));

    if (firstMetaIndex === -1) {
      // No meta lines, find the last non-empty line
      let lastContentIndex = -1;
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].text.trim() !== '') {
          lastContentIndex = i;
          break;
        }
      }
      return lastContentIndex >= 0 ? lastContentIndex + 1 : 0;
    }

    // When meta lines are present, find the last content line before the first meta line
    let lastContentIndex = -1;
    for (let i = firstMetaIndex - 1; i >= 0; i--) {
      if (lines[i].text.trim() !== '') {
        lastContentIndex = i;
        break;
      }
    }

    // Return the position after the last content line (before the first meta line)
    return lastContentIndex >= 0 ? lastContentIndex + 1 : firstMetaIndex;
  };

  // Focus on the best position when component mounts
  useEffect(() => {
    setTimeout(() => {
      const bestIndex = findBestCursorPosition();

      // Try multiple times to find the textarea
      const tryFocus = (attempts = 0) => {
        if (textareasRef.current[bestIndex]) {
          const textarea = textareasRef.current[bestIndex];
          textarea.focus();
          textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        } else if (textareasRef.current[0]) {
          // Fallback to first textarea if best position not found
          const textarea = textareasRef.current[0];
          textarea.focus();
          textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        } else if (attempts < 5) {
          // Try again after a short delay
          setTimeout(() => tryFocus(attempts + 1), 50);
        }
      };

      tryFocus();
    }, 50);
  }, []); // Only run on mount

  const replaceLastWord = (tag) => {



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
    //
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
    if (content.startsWith('{#h2#}')) {
      content = content.slice(6);
    }
    // Toggle H1
    if (content.startsWith('{#h1#}')) {
      content = content.slice(6);
    } else {
      content = `{#h1#}${content}`;
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
    if (content.startsWith('{#h1#}')) {
      content = content.slice(6);
    }
    // Toggle H2
    if (content.startsWith('{#h2#}')) {
      content = content.slice(6);
    } else {
      content = `{#h2#}${content}`;
    }
    // Update the line
    newLines[index].text = content;
    setLines(newLines);
  };

  const [dropTargetIndex, setDropTargetIndex] = useState(null);
  const [mergedContent, setMergedContent] = useState(null);
  const [draggedId, setDraggedId] = useState(null);
  const [selectAllPressCount, setSelectAllPressCount] = useState(0);
  const [isTextMode, setIsTextMode] = useState(initialTextMode);
  const [urlLabelSelection, setUrlLabelSelection] = useState({ urlIndex: null, labelIndex: null });
  const [pendingUrlIndex, setPendingUrlIndex] = useState(null);
  const [customLabel, setCustomLabel] = useState('');
  const [customUrl, setCustomUrl] = useState('');
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, index: null });
  const textareasRef = useRef([]);

  const getEditableLinkParts = (lineText = '') => {
    const markdownMatch = lineText.match(/^(\s*)\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)(\s*)$/);
    if (markdownMatch) {
      return {
        leadingWhitespace: markdownMatch[1],
        label: markdownMatch[2],
        url: markdownMatch[3],
        trailingWhitespace: markdownMatch[4]
      };
    }

    const plainUrlMatch = lineText.match(/^(\s*)(https?:\/\/[^\s]+)(\s*)$/);
    if (plainUrlMatch) {
      return {
        leadingWhitespace: plainUrlMatch[1],
        label: '',
        url: plainUrlMatch[2],
        trailingWhitespace: plainUrlMatch[3]
      };
    }

    return {
      leadingWhitespace: '',
      label: '',
      url: lineText,
      trailingWhitespace: ''
    };
  };

  const buildEditableLinkLine = (lineText, label, url) => {
    const { leadingWhitespace, trailingWhitespace } = getEditableLinkParts(lineText);
    const cleanLabel = label.trim();
    const cleanUrl = url.trim();
    return cleanLabel
      ? `${leadingWhitespace}[${cleanLabel}](${cleanUrl})${trailingWhitespace}`
      : `${leadingWhitespace}${cleanUrl}${trailingWhitespace}`;
  };

  // Removed conflicting useEffect that was focusing the last textarea

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

        setSearchQuery(value);
      }
    }, 300),
    [setSearchQuery]
  );

  const handleTextChange = (index, value) => {

    const updatedLines = [...lines];
    updatedLines[index].text = value;
    setLines(updatedLines);

    // Only update search query for the first line (title/content line)
    if (index === 0) {
      debouncedSetSearchQuery(value);
    }

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
    // Check for images first if onImagePaste handler is provided
    if (typeof onImagePaste === 'function') {
      const items = e.clipboardData.items;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault();
          const blob = items[i].getAsFile();
          onImagePaste(blob);
          return;
        }
      }
    }

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

      // Removed cursor line update

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
      setCustomUrl(pasteText);
      setTimeout(() => {
        const input = document.getElementById('custom-label-input');
        if (input) input.focus();
      }, 0);
      return;
    }
  };


  const handleKeyDown = (e, index) => {
    // Save on Cmd/Ctrl+Enter
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      saveNote();
      return;
    }
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
        if (line.text.startsWith('{meta::sub} ')) {
          line.text = line.text.slice(12);
        } else if (line.text.startsWith('{meta::sub}')) {
          line.text = line.text.slice(11);
        }
      } else {
        if (!line.text.startsWith('{meta::sub}')) {
          line.text = '{meta::sub} ' + line.text;
        }
      }

      setLines(newLines);

      setTimeout(() => {
        const cursor = textareasRef.current[index];
        if (cursor) {
          const offset = e.shiftKey ? -12 : 12;
          const pos = Math.max(0, e.target.selectionStart + offset);
          cursor.selectionStart = cursor.selectionEnd = pos;
        }
      }, 0);

      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      let cursorPos = e.target.selectionStart;
      const newLines = [...lines];
      const currentLine = newLines[index];
      const before = currentLine.text.slice(0, cursorPos);
      const after = currentLine.text.slice(cursorPos);

      currentLine.text = before;
      const newLineText = after;

      const newLine = {
        id: `line-${Date.now()}`,
        text: newLineText,
        isTitle: false
      };

      newLines.splice(index + 1, 0, newLine);
      setLines(newLines);

      setTimeout(() => {
        const nextTextarea = textareasRef.current[index + 1];
        if (nextTextarea) {
          nextTextarea.focus();
          nextTextarea.selectionStart = nextTextarea.selectionEnd = 0;
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
    } else {
      const newLines = lines.filter((_, i) => i !== index);
      setLines(newLines);
    }
  };

  const insertLineAbove = (index) => {
    const newLines = [...lines];
    newLines.splice(index, 0, { id: `line-${Date.now()}-above`, text: '', isTitle: false });
    setLines(newLines);
    setTimeout(() => {
      if (textareasRef.current[index]) {
        textareasRef.current[index].focus();
      }
    }, 10);
  };

  const insertLineBelow = (index) => {
    const newLines = [...lines];
    newLines.splice(index + 1, 0, { id: `line-${Date.now()}-below`, text: '', isTitle: false });
    setLines(newLines);
    setTimeout(() => {
      if (textareasRef.current[index + 1]) {
        textareasRef.current[index + 1].focus();
      }
    }, 10);
  };

  const insertSeparatorAbove = (index) => {
    const newLines = [...lines];
    newLines.splice(index, 0, { id: `line-${Date.now()}-sep-above`, text: '----------------------------------------------------------------------------------------------------', isTitle: false });
    setLines(newLines);
  };

  const insertSeparatorBelow = (index) => {
    const newLines = [...lines];
    newLines.splice(index + 1, 0, { id: `line-${Date.now()}-sep-below`, text: '----------------------------------------------------------------------------------------------------', isTitle: false });
    setLines(newLines);
  };

  const saveNote = () => {


    // Preserve blank lines between content, only remove trailing empty lines
    const processedLines = lines.map(line => line.text);

    // Remove trailing empty lines only
    let trimmedLines = processedLines;
    while (trimmedLines.length > 0 && trimmedLines[trimmedLines.length - 1].trim() === '') {
      trimmedLines = trimmedLines.slice(0, -1);
    }



    // Join lines with newlines
    let merged = trimmedLines.join('\n');

    // New sensitive notes encode every non-meta line. Older notes without
    // meta::encoded keep the previous URL-only behavior for compatibility.
    if (noteHasEncodedContent || hasEncodedContent(merged)) {
      merged = encodeSensitiveContent(merged);
    } else if (noteHasReversedUrls) {
      // Separate content from meta tags for processing
      const { contentLines, metaLines } = separateContentFromMeta(merged);

      // Re-reverse URLs in content lines
      const reReversedContentLines = contentLines.map(text => reverseUrlsInText(text));

      // Reconstruct the content with re-reversed URLs
      merged = [
        ...reReversedContentLines,
        ...metaLines
      ].join('\n');
    }

    // Check if note is empty or only contains whitespace
    if (!merged || !merged.trim()) {
      return;
    }

    // Reorder meta tags to ensure they appear at the bottom
    const reorderedContent = reorderMetaTags(merged);


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

  // Removed vim-like global key handling useEffect

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
    // Word-based suggestion feature removed - now using Obsidian-style [[ wiki-link autocomplete
    // The suggestion popup is disabled
    setShowPopup(false);
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

  // Debug logging for developer mode


  return (
    <DevModeInfo
      componentName="NoteEditor"
      isDevMode={settings?.developerMode || false}
    >
      <div
        className="p-6 bg-white border border-gray-300 rounded-lg shadow-xl w-full note-editor-container note-editor"
        data-modal="true"
        tabIndex={-1}
        onFocus={() => { }} // This makes the div focusable
        onClick={(e) => {
          // Focus the container when clicked
          if (e.target === e.currentTarget) {
            e.currentTarget.focus();
          }
        }}
      >
        {/* Removed mode indicator */}

        {/* Text Mode Toggle Button - shown in both modal and non-modal contexts */}
        {(!isAddMode || isModal) && (
          <div className="mb-4 flex justify-end">
            <button
              onClick={() => setIsTextMode(!isTextMode)}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              {isTextMode ? 'Advanced Mode' : 'Text Mode'}
            </button>
          </div>
        )}
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

          {pendingUrlIndex !== null && ReactDOM.createPortal(
            <div
              className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-[9999]"
              data-modal="true"
              data-link-text-popup="true"
              onClick={(e) => {
                e.stopPropagation();
                if (e.target === e.currentTarget) {
                  setPendingUrlIndex(null);
                  setCustomLabel('');
                  setCustomUrl('');
                  setShowTextSelection(false);
                }
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                // Stop propagation to prevent NoteEditor/NotesList from seeing keys
                e.stopPropagation();
              }}
            >
              <div
                className="bg-white p-6 rounded-lg shadow-md w-96 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
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
                        if (e.key === 'Enter') {
                          const newLines = [...lines];
                          newLines[pendingUrlIndex].text = buildEditableLinkLine(newLines[pendingUrlIndex].text, customLabel, customUrl);
                          setLines(newLines);
                          setPendingUrlIndex(null);
                          setCustomLabel('');
                          setCustomUrl('');
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
                              nextTextarea.selectionStart = nextTextarea.selectionEnd = 0;
                            }
                          }, 0);
                        } else if (e.key === 'Escape') {
                          setPendingUrlIndex(null);
                          setCustomLabel('');
                          setCustomUrl('');
                          setShowTextSelection(false);
                        }
                      }}
                      className="w-full border px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter custom text"
                      autoFocus
                    />
                  </div>

                  <div className="border rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowTextSelection(prev => !prev);
                      }}
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
                        {(() => {
                          const selectableLines = lines
                            .map((line, idx) => ({ line, idx }))
                            .filter(({ line, idx }) => (
                              idx !== pendingUrlIndex &&
                              line.text.trim() &&
                              !line.text.trim().startsWith('meta::') &&
                              !line.text.match(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/) &&
                              !line.text.match(/^https?:\/\/[^\s]+$/)
                            ));

                          if (selectableLines.length === 0) {
                            return (
                              <div className="px-4 py-3 text-sm text-gray-400">
                                No text lines available to use as the link label.
                              </div>
                            );
                          }

                          return selectableLines.map(({ line, idx }) => (
                            <button
                              key={line.id}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setCustomLabel(line.text);
                                // Remove the selected line from the note
                                const newLines = [...lines];
                                // Update the URL line with the markdown link format
                                newLines[pendingUrlIndex].text = buildEditableLinkLine(newLines[pendingUrlIndex].text, line.text, customUrl);
                                // Remove the selected text line
                                newLines.splice(idx, 1);
                                setLines(newLines);
                                setPendingUrlIndex(null);
                                setCustomLabel('');
                                setCustomUrl('');
                                setShowTextSelection(false);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-blue-50 border-b last:border-b-0 flex items-center group"
                            >
                              <span className="flex-1 truncate">{line.text}</span>
                              <span className="text-blue-500 opacity-0 group-hover:opacity-100 ml-2">Use</span>
                            </button>
                          ));
                        })()}
                      </div>
                    )}
                  </div>

                  <div className="text-sm text-gray-500 break-all">
                    <label htmlFor="custom-url-input" className="block text-sm mb-2 text-gray-700">
                      URL:
                    </label>
                    <input
                      id="custom-url-input"
                      type="text"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const newLines = [...lines];
                          newLines[pendingUrlIndex].text = buildEditableLinkLine(newLines[pendingUrlIndex].text, customLabel, customUrl);
                          setLines(newLines);
                          setPendingUrlIndex(null);
                          setCustomLabel('');
                          setCustomUrl('');
                          setShowTextSelection(false);
                        } else if (e.key === 'Escape') {
                          setPendingUrlIndex(null);
                          setCustomLabel('');
                          setCustomUrl('');
                          setShowTextSelection(false);
                        }
                      }}
                      className="w-full border px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter URL"
                    />
                  </div>
                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPendingUrlIndex(null);
                        setCustomLabel('');
                        setCustomUrl('');
                        setShowTextSelection(false);
                      }}
                      className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const newLines = [...lines];
                        newLines[pendingUrlIndex].text = buildEditableLinkLine(newLines[pendingUrlIndex].text, customLabel, customUrl);
                        setLines(newLines);
                        setPendingUrlIndex(null);
                        setCustomLabel('');
                        setCustomUrl('');
                        setShowTextSelection(false);
                      }}
                      className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
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
                isTitle: text.startsWith('{#h1#}') || text.startsWith('{#h2#}'),
              }));
              setLines(updatedLines);
              // Update search query if in add mode
              if (isAddMode && setSearchQuery) {

                setSearchQuery(e.target.value);
              }
            }}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                saveNote();
              }
            }}
          />
        ) : (
          <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 shadow-sm">
            {/* Regular content lines */}
            {lines.filter(line => !line.text.trim().startsWith('meta::')).map((line, index) => {
              const originalIndex = lines.findIndex(l => l.id === line.id);
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
                  className={`relative group transition border-l-4 border-transparent bg-gray-50 hover:bg-white hover:border-blue-400 ${dropTargetIndex === originalIndex ? 'border-blue-500' : ''}`}
                >
                  {dropTargetIndex === originalIndex && draggedId !== lines[originalIndex].id && (
                    <div className="h-1 bg-blue-500 rounded my-1"></div>
                  )}
                  {/* Insertion point highlight */}
                  {insertionPoint && insertionPoint.index === originalIndex && (
                    <div className={`absolute left-0 right-0 h-1 bg-blue-500 z-[70] rounded-full transition-all ${insertionPoint.position === 'above' ? 'top-0' : 'bottom-0'}`} />
                  )}
                  <div className="flex items-start px-3 py-2 relative">
                    {/* Hover actions on the far left - widened to ensure stable hover bridge */}
                    <div className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center group/actions">
                      {/* The thin "invisible" trigger strip */}
                      <div className="w-1.5 h-2/3 bg-gray-300 opacity-0 group-hover/actions:opacity-100 rounded-full transition-opacity cursor-pointer"></div>
                      
                      {/* The actual buttons revealed on hover of the strip or line */}
                      <div className="absolute right-[calc(100%-2px)] hidden group-hover/actions:flex flex-col gap-1.5 bg-white shadow-2xl border border-gray-200 rounded-xl p-2 z-[100] min-w-[130px]">
                        <button
                          onMouseEnter={() => setInsertionPoint({ index: originalIndex, position: 'above' })}
                          onMouseLeave={() => setInsertionPoint(null)}
                          onClick={(e) => { e.stopPropagation(); insertLineAbove(originalIndex); setInsertionPoint(null); }}
                          className="w-full h-10 flex items-center justify-between px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-sm active:scale-95"
                        >
                          <span className="text-[10px] font-black uppercase tracking-widest">Above</span>
                          <PlusIcon className="w-4 h-4" />
                        </button>
                        <button
                          onMouseEnter={() => setInsertionPoint({ index: originalIndex, position: 'below' })}
                          onMouseLeave={() => setInsertionPoint(null)}
                          onClick={(e) => { e.stopPropagation(); insertLineBelow(originalIndex); setInsertionPoint(null); }}
                          className="w-full h-10 flex items-center justify-between px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-sm active:scale-95"
                        >
                          <span className="text-[10px] font-black uppercase tracking-widest">Below</span>
                          <PlusIcon className="w-4 h-4" />
                        </button>
                        <div className="h-px bg-gray-200 my-1"></div>
                        <button
                          onMouseEnter={() => setInsertionPoint({ index: originalIndex, position: 'above' })}
                          onMouseLeave={() => setInsertionPoint(null)}
                          onClick={(e) => { e.stopPropagation(); insertSeparatorAbove(originalIndex); setInsertionPoint(null); }}
                          className="w-full h-10 flex items-center justify-between px-3 bg-gray-800 hover:bg-black text-white rounded-lg transition-all shadow-sm active:scale-95"
                        >
                          <span className="text-[10px] font-black uppercase tracking-widest">Line ↑</span>
                          <span className="font-bold text-lg leading-tight">―</span>
                        </button>
                        <button
                          onMouseEnter={() => setInsertionPoint({ index: originalIndex, position: 'below' })}
                          onMouseLeave={() => setInsertionPoint(null)}
                          onClick={(e) => { e.stopPropagation(); insertSeparatorBelow(originalIndex); setInsertionPoint(null); }}
                          className="w-full h-10 flex items-center justify-between px-3 bg-gray-800 hover:bg-black text-white rounded-lg transition-all shadow-sm active:scale-95"
                        >
                          <span className="text-[10px] font-black uppercase tracking-widest">Line ↓</span>
                          <span className="font-bold text-lg leading-tight">―</span>
                        </button>
                      </div>
                    </div>
                    <span className="absolute left-7 top-2 text-gray-400 cursor-grab group-hover:opacity-100 opacity-0">☰</span>
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
                      <div
                        className="flex items-center pl-12 pr-28 w-full"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onMouseUp={(e) => e.stopPropagation()}
                        onDoubleClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            const match = line.text.match(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/);
                            const currentLabel = match[1];
                            const url = match[2];
                            setPendingUrlIndex(originalIndex);
                            setCustomLabel(currentLabel);
                            setCustomUrl(url);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          onMouseUp={(e) => e.stopPropagation()}
                          className="text-blue-600 hover:text-blue-800 underline text-sm mr-2 text-left"
                        >
                          {line.text.match(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/)[1]}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLine(index);
                          }}
                          className="text-red-400 text-xs ml-2 font-mono transition-transform transform hover:scale-150"
                          title="Remove URL"
                        >
                          x
                        </button>
                      </div>
                    ) : line.text.match(/^https?:\/\/[^\s]+$/) ? (
                      <div
                        className="flex items-center pl-12 pr-28 w-full"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onMouseUp={(e) => e.stopPropagation()}
                        onDoubleClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setPendingUrlIndex(originalIndex);
                            setCustomLabel(new URL(line.text).hostname);
                            setCustomUrl(line.text);
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          onMouseUp={(e) => e.stopPropagation()}
                          className="text-blue-600 hover:text-blue-800 underline text-sm mr-2 text-left"
                        >
                          {new URL(line.text).hostname}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLine(index);
                          }}
                          className="text-red-400 text-xs ml-2 font-mono transition-transform transform hover:scale-150"
                          title="Remove URL"
                        >
                          x
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-start w-full">
                        <textarea
                          ref={(el) => (textareasRef.current[originalIndex] = el)}
                          value={line.text}
                          onFocus={() => {
                            setFocusedLineIndex(originalIndex);
                          }}
                          onChange={(e) => {
                            handleTextChange(originalIndex, e.target.value);
                          }}
                          onKeyDown={(e) => {
                            handleKeyDown(e, originalIndex);
                          }}
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
                          className={`w-full pl-12 pr-28 bg-transparent resize-none focus:outline-none text-sm ${line.isTitle ? 'font-bold text-lg text-gray-800' : 'text-gray-700'
                            }`}
                          rows={1}
                        />
                      </div>
                    )}
                    {!isTextMode && (
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
                          const isH1 = text.startsWith('{#h1#}');
                          const isH2 = text.startsWith('{#h2#}');
                          if (isH1 || isH2) {
                            return (
                              <>
                                <div className="h-4 w-px bg-gray-200 mx-1"></div>
                                <button
                                  onClick={() => {
                                    const newLines = [...lines];
                                    let text = newLines[index].text;
                                    if (isH1) text = text.slice(6);
                                    else if (isH2) text = text.slice(6);
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
                  <div className="text-xs font-medium text-gray-600 mb-2">Meta Tags</div>
                  {lines.filter(line => line.text.trim().startsWith('meta::')).map((line, index) => {
                    const originalIndex = lines.findIndex(l => l.id === line.id);
                    return (
                      <div key={line.id} className="flex items-center py-1 group">
                        <span className="text-gray-400 text-xs mr-2">☰</span>
                        <div className="flex-1 text-sm text-gray-700 font-mono bg-gray-100 px-2 py-1 rounded">
                          {line.text}
                        </div>
                        <button
                          onClick={() => handleDeleteLine(originalIndex)}
                          className="ml-2 text-red-400 text-xs hover:text-red-600 px-2 py-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                          title="Delete meta tag"
                        >
                          🗑
                        </button>
                      </div>
                    );
                  })}
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
                  className={`p-2 cursor-pointer hover:bg-purple-100 ${selectedTagIndex === index ? "bg-purple-200" : ""
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
              const isH1 = text.startsWith('{#h1#}');
              const isH2 = text.startsWith('{#h2#}');
              if (isH1 || isH2) {
                return (
                  <button
                    className="block w-full text-left px-2 py-1 text-sm hover:bg-gray-100 text-red-500"
                    onClick={() => {
                      const newLines = [...lines];
                      let text = newLines[contextMenu.index].text;
                      if (isH1) text = text.slice(6);
                      else if (isH2) text = text.slice(6);
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
    </DevModeInfo>

  );
};

export default NoteEditor;
