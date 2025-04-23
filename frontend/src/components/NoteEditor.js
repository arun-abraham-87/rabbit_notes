import React, { useState, useRef, useEffect } from 'react';
import { updateNoteById } from '../utils/ApiUtils';

const NoteEditor = ({ objList, note, onSave, onCancel, text, searchQuery, setSearchQuery, addNote, isAddMode = false }) => {
  const contentSource = text || note.content || '';
  const initialLines = contentSource
    ? [
      ...contentSource.split('\n').map((text, index) => ({
        id: `line-${index}`,
        text,
        isTitle: text.startsWith('##') && text.endsWith('##'),
      })),
      { id: `line-${Date.now()}-extra`, text: '', isTitle: false }
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

  const replaceLastWord = (tag) => {
    console.log(lines)
    console.log(focusedLineIndex)
    console.log(lines[focusedLineIndex])
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
    console.log(objList);
    const filterText = match[1].toLowerCase();
    const filtered = objList.filter((tag) =>
      tag.toLowerCase().startsWith(filterText)
    );
    setFilteredTags(filtered);
    setSearchTerm(filterText);
    setShowPopup(filtered.length > 0);
  };

  const handleMarkAsSubtitle = (index) => {
    let newLines = [...lines];
    // Remove subtitle from any existing subtitle line
    const existingSubtitleIndex = newLines.findIndex(line => line.isSubtitle);
    if (existingSubtitleIndex !== -1) {
      const existingSubtitle = { ...newLines[existingSubtitleIndex] };
      existingSubtitle.isSubtitle = false;
      if (existingSubtitle.text.startsWith('##') && existingSubtitle.text.endsWith('##')) {
        existingSubtitle.text = existingSubtitle.text.slice(2, -2);
      }
      newLines.splice(existingSubtitleIndex, 1, existingSubtitle);
      // Adjust index if existing subtitle was before current index
      if (existingSubtitleIndex < index) index -= 1;
    }

    // Extract and wrap selected line as subtitle
    const selected = { ...newLines[index] };
    selected.isSubtitle = true;
    selected.text = selected.text.replace(/^##|##$/g, '');
    selected.text = `##${selected.text}##`;

    // Remove the original selected line
    newLines.splice(index, 1);

    // Insert subtitle just after the first line (below title)
    newLines.splice(1, 0, selected);

    // Filter out any blank lines and update state
    setLines(newLines.filter(line => line.text.trim() !== ''));
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

  const handleTextChange = (index, newText) => {
    const newLines = [...lines];
    newLines[index].text = newText;
    setLines(newLines);
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
      return;
    }

    const urlPattern = /^https?:\/\/[^\s]+$/;
    if (urlPattern.test(pasteText)) {
      e.preventDefault();
      const newLines = [...lines];
      newLines[index].text = pasteText;
      setLines(newLines);
      setPendingUrlIndex(index);
      setCustomLabel('');
      setTimeout(() => {
        const input = document.getElementById('custom-label-input');
        if (input) input.focus();
      }, 0);
      return;
    }
  };


  const handleKeyDown = (e, index) => {
    if ((showPopup || contextMenu.visible) && e.key === 'Escape') {
      e.preventDefault();
      setShowPopup(false);
      setSelectedTagIndex(-1);
      setContextMenu({ visible: false, x: 0, y: 0, index: null });
      if (focusedLineIndex !== null && textareasRef.current[focusedLineIndex]) {
        textareasRef.current[focusedLineIndex].focus();
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

      setTimeout(() => {
        const nextTextarea = textareasRef.current[index + 1];
        if (nextTextarea) {
          nextTextarea.focus();
          nextTextarea.selectionStart = nextTextarea.selectionEnd = newLineText.length;
        }
      }, 0);

      return;
    }

    if (e.key === 'ArrowUp') {
      const cursorPosition = e.target.selectionStart;
      if (cursorPosition === 0 && index > 0) {
        e.preventDefault();
        textareasRef.current[index - 1]?.focus();
        return;
      }
    }

    if (e.key === 'ArrowDown') {
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

      // Duplicate line
      if (e.key.toLowerCase() === 'd') {
        e.preventDefault();
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
    }
  };

  const handleDeleteLine = (index) => {
    const newLines = (lines || []).filter((_, i) => i !== index);
    setLines(newLines);
  };

  const handleMarkAsTitle = (index) => {
    let newLines = [...lines];
    // Unwrap any existing H1 (###...###)
    const existingH1 = newLines.findIndex(line =>
      line.text.trim().startsWith('###') && line.text.trim().endsWith('###')
    );
    if (existingH1 !== -1) {
      const unwrapped = { ...newLines[existingH1] };
      unwrapped.text = unwrapped.text.trim().slice(3, -3);
      newLines.splice(existingH1, 1, unwrapped);
      if (existingH1 < index) index -= 1;
    }
    // Prepare selected line
    const selected = { ...newLines[index] };
    let content = selected.text.trim();
    // Remove any H2 markers
    if (content.startsWith('##') && content.endsWith('##')) {
      content = content.slice(2, -2);
    }
    // Wrap as H1
    selected.text = `###${content}###`;
    // Remove original line and prepend selected
    newLines.splice(index, 1);
    newLines.unshift(selected);
    setLines(newLines);
  };

  const handleSave = () => {
    const trimmedLines = lines.map(line => line.text.trim());
    while (trimmedLines.length && trimmedLines[trimmedLines.length - 1] === '') {
      trimmedLines.pop();
    }
    const merged = trimmedLines.join('\n');
    if (!merged) {
      return;
    }
    updateNote(note.id, merged);
    onSave({ ...note, content: merged });
    //setMergedContent(merged);
  };

  const handleLabelUrl = (index) => {
    const line = lines[index];
    const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/;
    const plainUrlRegex = /(https?:\/\/[^\s]+)/;
    const markdownMatch = line.text.match(markdownLinkRegex);
    const plainUrlMatch = line.text.match(plainUrlRegex);

    if (markdownMatch) {
      const [, currentLabel, url] = markdownMatch;
      const newLabel = prompt("Edit label for this URL:", currentLabel);
      if (newLabel !== null) {
        const newText = line.text.replace(markdownLinkRegex, `[${newLabel}](${url})`);
        const newLines = [...lines];
        newLines[index].text = newText;
        setLines(newLines);
      }
    } else if (plainUrlMatch) {
      const url = plainUrlMatch[0];
      const label = prompt("Enter custom label for this URL:", "Link");
      if (label) {
        const newText = line.text.replace(url, `[${label}](${url})`);
        const newLines = [...lines];
        newLines[index].text = newText;
        setLines(newLines);
      }
    } else {
      alert("No URL found in this line.");
    }
  };

  useEffect(() => {
    const handleGlobalKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        const trimmedLines = lines.map(line => line.text.trim());
        while (trimmedLines.length && trimmedLines[trimmedLines.length - 1] === '') {
          trimmedLines.pop();
        }
        const merged = trimmedLines.join('\n');
        if (!merged) {
          return;
        }
        if (isAddMode) {
          addNote(merged);
          setLines([{ id: 'line-0', text: '', isTitle: false }]);
          setUrlLabelSelection({ urlIndex: null, labelIndex: null });
          onCancel();
        } else {
          updateNote(note.id, merged);
          onSave({ ...note, content: merged });
          setMergedContent(merged);
        }
      }
    };
    document.addEventListener('keydown', handleGlobalKey);
    return () => {
      document.removeEventListener('keydown', handleGlobalKey);
    };
  }, [lines, isAddMode, note, addNote, onSave, onCancel]);

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

    //const updatedNotes = [...notes];
    const inputedText = e.target.value;
    //    updatedNotes[index] = inputedText
    //  setNotes(updatedNotes);
    console.log(`INputed text set as searhcquwery: ${inputedText}`)
    //searchQuery(!inputedText ? "" : inputedText);

    //Needed to fix issue of popup showing after deleting all text and popup showing up based on last deleted char
    if (inputedText.trim().length === 0) {
      setShowPopup(false);
      //      setShowCalendar(false);
    }

    const match = inputedText.trim().match(/(\S+)$/); // Match the last word
    if (match) {
      const filterText = match[1].toLowerCase();
      let filtered = [];

      // Throttle logic
      if (filterText !== "") {
        clearTimeout(throttleRef.current); // Clear the existing timeout
        throttleRef.current = setTimeout(() => {

          if (filterText === "cal") {
            // let { x, y } = getCursorCoordinates();
            // x = x + 5;
            // setCalendarPosition({ x, y });
            // setShowCalendar(true);
            // setShowPopup(false);
          } else {

            filtered = objList.filter((tag) =>
              tag.toLowerCase().startsWith(filterText)
            );


            setFilteredTags(filtered);
            //console.log(`objlit: ${objList}`)
            //console.log(`FilteredTags: ${filteredTags}`)
          }
          if (filtered.length > 0) {
            const textarea = textareasRef.current[focusedLineIndex];
            if (textarea) {
              const { x, y } = getCursorCoordinates(textarea);
              setCursorPosition({ x, y: y + 20 });
            }
            setShowPopup(true);
            // const popupElement = document.getElementById("tagpop");
            // if (popupElement) {
            //   popupElement.style.position = "absolute";
            //   popupElement.style.left = `${x}px`;
            //   popupElement.style.top = `${y}px`;
            // }
          } else {
            setShowPopup(false);
          }

        }, 300); // 300ms delay for throttling
      }
    } else {
      setShowPopup(false);
      setSelectedTagIndex(-1);
      //focusTextareaAtEnd();
    }


    // Restore the caret position after the state update
    // setTimeout(() => {
    //   const div = editorRef.current?.children[index];
    //   if (div) {
    //     const newRange = document.createRange();
    //     const newSelection = window.getSelection();
    //     newRange.setStart(div.firstChild || div, caretOffset); // Restore the offset
    //     newRange.collapse(true);
    //     newSelection.removeAllRanges();
    //     newSelection.addRange(newRange);
    //   }
    // }, 0);

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
    <div className="p-6 bg-white border border-gray-300 rounded-lg shadow-xl w-full">
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
            {isTextMode ? '🧩 Advanced Mode' : '✍️ Text Mode'}
          </button>
        )}
        {pendingUrlIndex !== null && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
            <div className="bg-white p-4 rounded shadow-md w-80">
              <label htmlFor="custom-label-input" className="block text-sm mb-2 text-gray-700">
                Enter custom label for the URL:
              </label>
              <input
                id="custom-label-input"
                type="text"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}

                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const newLines = [...lines];
                    const url = newLines[pendingUrlIndex].text;
                    newLines[pendingUrlIndex].text = `[${customLabel}](${url})`;

                    // Insert new line below
                    const newLine = {
                      id: `line-${Date.now()}-after-url`,
                      text: '',
                      isTitle: false
                    };
                    newLines.splice(pendingUrlIndex + 1, 0, newLine);
                    setLines(newLines);

                    setPendingUrlIndex(null);
                    setCustomLabel('');

                    setTimeout(() => {
                      requestAnimationFrame(() => {
                        const target = textareasRef.current[pendingUrlIndex + 1];
                        if (target) {
                          target.focus();
                          target.selectionStart = target.selectionEnd = target.value.length;
                        }
                      });
                    }, 0);
                  } else if (e.key === 'Escape') {
                    setPendingUrlIndex(null);
                    setCustomLabel('');
                  }
                }}
                className="w-full border px-2 py-1 rounded text-sm"
              />
            </div>
          </div>
        )}
      </div>
      {isAddMode && (
        <div className="mb-4 flex flex-wrap gap-2 group relative">
          <div className="flex flex-col">
            <button
              onClick={() => {
                setShowEndDateFilterSubButtons(false);
                setActivePriority('');
                setLines((prev) => [...prev.filter(line => line.text.trim() !== ''), { id: `line-${Date.now()}`, text: 'meta::todo', isTitle: false }]);
                if (setSearchQuery) setSearchQuery(prev => (prev ? prev + ' ' : '') + 'meta::todo');
                setShowTodoSubButtons(true);
              }}
              className={`px-3 py-1 text-xs rounded transition-all transform ${showTodoSubButtons
                  ? 'opacity-100 scale-105 bg-purple-300 border border-purple-700'
                  : 'opacity-30 hover:opacity-60'
                }`}
            >
              Todos
            </button>
            {showTodoSubButtons && (
              <div className="flex gap-1 mt-1">
                <button
                  onClick={() => {
                    const additional = ' meta::high';
                    setLines((prev) => [...prev.filter(line => line.text.trim() !== ''), { id: `line-${Date.now()}`, text: 'meta::todo' + additional, isTitle: false }]);
                    if (setSearchQuery) setSearchQuery(prev => (prev || '') + additional);
                    setActivePriority('high');
                  }}
                  className={`px-2 py-1 text-xs rounded transition-all transform hover:opacity-100 hover:scale-105 ${activePriority === '' || activePriority === 'high' ? 'opacity-100' : 'opacity-30'
                    } ${activePriority === 'high' ? 'bg-red-300 border border-red-700' : 'bg-red-100 hover:bg-red-200 text-red-800'}`}
                >
                  High
                </button>
                <button
                  onClick={() => {
                    const additional = ' meta::medium';
                    setLines((prev) => [...prev.filter(line => line.text.trim() !== ''), { id: `line-${Date.now()}`, text: 'meta::todo' + additional, isTitle: false }]);
                    if (setSearchQuery) setSearchQuery(prev => (prev || '') + additional);
                    setActivePriority('medium');
                  }}
                  className={`px-2 py-1 text-xs rounded transition-all transform hover:opacity-100 hover:scale-105 ${activePriority === '' || activePriority === 'medium' ? 'opacity-100' : 'opacity-30'
                    } ${activePriority === 'medium' ? 'bg-yellow-300 border border-yellow-700' : 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800'}`}
                >
                  Medium
                </button>
                <button
                  onClick={() => {
                    const additional = ' meta::low';
                    setLines((prev) => [...prev.filter(line => line.text.trim() !== ''), { id: `line-${Date.now()}`, text: 'meta::todo' + additional, isTitle: false }]);
                    if (setSearchQuery) setSearchQuery(prev => (prev || '') + additional);
                    setActivePriority('low');
                  }}
                  className={`px-2 py-1 text-xs rounded transition-all transform hover:opacity-100 hover:scale-105 ${activePriority === '' || activePriority === 'low' ? 'opacity-100' : 'opacity-30'
                    } ${activePriority === 'low' ? 'bg-green-300 border border-green-700' : 'bg-green-100 hover:bg-green-200 text-green-800'}`}
                >
                  Low
                </button>
              </div>
            )}
          </div>
          <button
            onClick={() => {
              setLines((prev) => [...prev.filter(line => line.text.trim() !== ''), { id: `line-${Date.now()}`, text: '#watch', isTitle: false }]);
              if (setSearchQuery) setSearchQuery(prev => (prev ? prev + ' ' : '') + '#watch');
              setShowTodoSubButtons(false);
              setShowEndDateFilterSubButtons(false);
              setActivePriority('');
            }}
            className={`px-3 py-1 text-xs rounded transition-all transform ${searchQuery?.includes('#watch') ? 'opacity-100 scale-105 bg-yellow-300 border border-yellow-700' : 'opacity-30 hover:opacity-60'
              }`}
          >
            Watch List
          </button>
          {/* Today filter button - moved here before dropdown */}
          <button
            onClick={() => {
              setLines((prev) => [...prev.filter(line => line.text.trim() !== ''), { id: `line-${Date.now()}`, text: 'meta::today::', isTitle: false }]);
              if (setSearchQuery) setSearchQuery(prev => (prev ? prev + ' ' : '') + 'meta::today::');
              setShowTodoSubButtons(false);
              setShowEndDateFilterSubButtons(false);
              setActivePriority('');
            }}
            className={`px-3 py-1 text-xs rounded transition-all transform ${searchQuery?.includes('meta::today::')
                ? 'opacity-100 scale-105 bg-green-300 border border-green-700'
                : 'opacity-30 hover:opacity-60'
              }`}
          >
            Today
          </button>
          <div className="relative">
            <button className="px-3 py-1 text-xs rounded transition-all transform opacity-30 hover:opacity-60 border">
              More Filters ▾
            </button>
            <div className="absolute left-0 mt-1 bg-white border border-gray-300 rounded shadow-lg z-10 hidden group-hover:block min-w-[140px]">
              <button
                onClick={() => {
                  setShowTodoSubButtons(false);
                  setActivePriority('');
                  setLines((prev) => [...prev.filter(line => line.text.trim() !== ''), { id: `line-${Date.now()}`, text: 'meta::end_date::', isTitle: false }]);
                  if (setSearchQuery) setSearchQuery(prev => (prev ? prev + ' ' : '') + 'meta::end_date::');
                }}
                className="block w-full text-left px-3 py-1 text-xs hover:bg-gray-100"
              >
                Has End Date
              </button>
              <button
                onClick={() => {
                  setLines((prev) => [...prev.filter(line => line.text.trim() !== ''), { id: `line-${Date.now()}`, text: 'meta::Abbreviation::', isTitle: false }]);
                  if (setSearchQuery) setSearchQuery(prev => (prev ? prev + ' ' : '') + 'meta::Abbreviation::');
                  setShowTodoSubButtons(false);
                  setShowEndDateFilterSubButtons(false);
                  setActivePriority('');
                }}
                className="block w-full text-left px-3 py-1 text-xs hover:bg-gray-100"
              >
                Abbreviation
              </button>
              <button
                onClick={() => {
                  setLines((prev) => [...prev.filter(line => line.text.trim() !== ''), { id: `line-${Date.now()}`, text: '#people', isTitle: false }]);
                  if (setSearchQuery) setSearchQuery(prev => (prev ? prev + ' ' : '') + '#people');
                  setShowTodoSubButtons(false);
                  setShowEndDateFilterSubButtons(false);
                  setActivePriority('');
                }}
                className="block w-full text-left px-3 py-1 text-xs hover:bg-gray-100"
              >
                People
              </button>
            </div>
          </div>
        </div>
      )}
      {isTextMode ? (
        <textarea
          className="w-full p-4 text-sm border border-gray-300 rounded-lg shadow-sm resize-none min-h-[200px] font-mono"
          value={lines.map(line => line.text).join('\n')}
          onChange={(e) => {
            const updatedLines = e.target.value.split('\n').map((text, index) => ({
              id: `line-${index}-${Date.now()}`,
              text,
              isTitle: text.startsWith('##') && text.endsWith('##'),
            }));
            setLines(updatedLines);
          }}
        />
      ) : (
        <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 shadow-sm">
          {lines.map((line, index) => (
            <div
              key={line.id}
              draggable
              onDragStart={(e) => handleDragStart(e, index)}

              onDragOver={(e) => {
                e.preventDefault();
                handleDragOver(index);
              }}
              onDrop={(e) => handleDrop(e, index)}
              className={`relative group bg-gray-50 hover:bg-white transition border-l-4 border-transparent hover:border-blue-400 ${dropTargetIndex === index ? 'border-blue-500' : ''}`}
            >
              {dropTargetIndex === index && draggedId !== lines[index].id && (
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
                        setUrlLabelSelection({ urlIndex: index, labelIndex: null });
                      }
                    }}
                    className="mr-2 mt-1"
                  />
                )}
                {!line.text.match(/https?:\/\/[^\s]+/) && urlLabelSelection.urlIndex !== null && (
                  <input
                    type="checkbox"
                    title="Use this line as label"
                    checked={urlLabelSelection.labelIndex === index}
                    onChange={(e) => {
                      setUrlLabelSelection((prev) => ({
                        ...prev,
                        labelIndex: e.target.checked ? index : null,
                      }));
                    }}
                    className="mr-2 mt-1"
                  />
                )}
                {line.text.match(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/) ? (
                  <div className="flex items-center pl-6 pr-28 w-full">
                    <a
                      href={line.text.match(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/)[2]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline text-sm mr-2"
                    >
                      {line.text.match(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/)[1]}
                    </a>
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
                    <a
                      href={line.text}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline text-sm mr-2"
                    >
                      {new URL(line.text).hostname}
                    </a>
                    <button
                      onClick={() => handleDeleteLine(index)}
                      className="text-red-400 text-xs ml-2 font-mono transition-transform transform hover:scale-150"
                      title="Remove URL"
                    >
                      x
                    </button>
                  </div>
                ) : (
                  <textarea
                    ref={(el) => (textareasRef.current[index] = el)}
                    value={line.text}
                    onFocus={() => setFocusedLineIndex(index)}
                    // onBlur={() => setFocusedLineIndex(null)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({ visible: true, x: e.pageX, y: e.pageY, index });
                    }}
                    onChange={(e) => {
                      handleTextChange(index, e.target.value);
                      handleInputChange(e)
                      if (setSearchQuery) {
                        setSearchQuery(e.target.value);
                      }
                    }}
                    onKeyDown={(e) => {
                      handleKeyDown(e, index);

                      // Tag suggestion logic (if any)
                      // For example, check if the key pressed is related to tags
                      // and invoke your tag suggestion logic here.
                    }}
                    onPaste={(e) => handlePaste(e, index)}
                    className={`w-full pl-6 pr-28 bg-transparent resize-none focus:outline-none text-sm ${line.isTitle ? 'font-bold text-lg text-gray-800' : 'text-gray-700'}`}
                    rows={1}
                  />
                )}
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex flex-row justify-center gap-0.5 h-full items-center">
                  <button
                    onClick={() => handleDeleteLine(index)}
                    className="text-gray-500 text-xs hover:text-black px-1 transition-transform transform hover:scale-125"
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
                </div>
              </div>
            </div>
          ))}
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
              addNote(merged);
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
          className="absolute bg-white border border-gray-300 rounded-lg shadow-lg p-2 z-20 max-h-40 overflow-y-auto no-scrollbar text-sm w-52"
          style={{
            left: cursorPosition.x,
            top: cursorPosition.y,
          }}
        >
          {filteredTags.map((tag, index) => (
            <div
              key={tag}
              onClick={() => handleSelectTag(tag)}
              style={{
                padding: "5px",
                cursor: "pointer",
                backgroundColor:
                  selectedTagIndex === index ? "#e6f7ff" : "white",
              }}
            >
              {tag}
            </div>
          ))}
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