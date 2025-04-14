import React, { useState, useRef, useEffect } from 'react';
import { updateNoteById} from '../utils/ApiUtils';

const NoteEditor = ({ note, onSave, onCancel, text }) => {
  const contentSource = text || note.content || '##dfgdsfg2##\nsfgsdfgsdfg3\ndfgsdfg1';
  const initialLines = contentSource.split('\n').map((text, index) => ({
    id: `line-${index}`,
    text,
    isTitle: text.startsWith('##') && text.endsWith('##'),
  }));

  const [lines, setLines] = useState(initialLines);
  const [dropTargetIndex, setDropTargetIndex] = useState(null);
  const [mergedContent, setMergedContent] = useState(null);
  const [draggedId, setDraggedId] = useState(null);
  const [selectAllPressCount, setSelectAllPressCount] = useState(0);
  const [isTextMode, setIsTextMode] = useState(false);
  const [urlLabelSelection, setUrlLabelSelection] = useState({ urlIndex: null, labelIndex: null });
  const textareasRef = useRef([]);

  useEffect(() => {
    if (textareasRef.current[0]) {
      textareasRef.current[0].focus();
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
    }
  };

  const handleKeyDown = (e, index) => {
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

      currentLine.text = before;

      const newLine = {
        id: `line-${Date.now()}`,
        text: after,
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
    const newLines = lines.filter((_, i) => i !== index);
    setLines(newLines);
  };

  const handleMarkAsTitle = (index) => {
    let newLines = [...lines];

    // Remove title from any existing title line
    const existingTitleIndex = newLines.findIndex(line => line.isTitle);
    if (existingTitleIndex !== -1) {
      const existingTitle = { ...newLines[existingTitleIndex] };
      existingTitle.isTitle = false;
      if (existingTitle.text.startsWith('##') && existingTitle.text.endsWith('##')) {
        existingTitle.text = existingTitle.text.slice(2, -2);
      }
      newLines.splice(existingTitleIndex, 1, existingTitle);
    }

    // Promote the selected line to title
    const selected = { ...newLines[index] };
    selected.isTitle = true;
    selected.text = selected.text.replace(/^##|##$/g, '');
    selected.text = `##${selected.text}##`;

    newLines.splice(index, 1); // Remove selected line
    newLines = [selected, ...newLines]; // Prepend title

    // Remove any completely blank lines
    setLines(newLines.filter(line => line.text.trim() !== ''));
  };

  const handleSave = () => {
    const merged = lines.map(line => line.text).join('\n');
    updateNote(note.id, merged);
    onSave({ ...note, content: merged });
    setMergedContent(merged);
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
        handleSave();
      }
    };
    document.addEventListener('keydown', handleGlobalKey);
    return () => {
      document.removeEventListener('keydown', handleGlobalKey);
    };
  }, [lines]);

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
    <div className="p-6 bg-white border border-gray-300 rounded-lg shadow-xl max-w-3xl mx-auto">
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
        </div>
      )}
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-700">Edit Note</h2>
        <button
          onClick={() => setIsTextMode(!isTextMode)}
          className="px-4 py-1.5 rounded-md bg-blue-100 text-blue-800 font-medium hover:bg-blue-200 border border-blue-300"
        >
          {isTextMode ? '🧩 Advanced Mode' : '✍️ Text Mode'}
        </button>
      </div>
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
                      className="text-red-500 text-sm ml-2"
                      title="Remove URL"
                    >
                      ❌
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
                      className="text-red-500 text-sm ml-2"
                      title="Remove URL"
                    >
                      ❌
                    </button>
                  </div>
                ) : (
                  <textarea
                    ref={(el) => (textareasRef.current[index] = el)}
                    value={line.text}
                    onChange={(e) => handleTextChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    onPaste={(e) => handlePaste(e, index)}
                    className={`w-full pl-6 pr-28 bg-transparent resize-none focus:outline-none text-sm ${line.isTitle ? 'font-bold text-lg text-gray-800' : 'text-gray-700'}`}
                    rows={1}
                  />
                )}
                <div className="absolute right-8 top-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={async () => {
                      const text = await navigator.clipboard.readText();
                      const newLines = [...lines];
                      newLines[index].text = text;
                      setLines(newLines);
                    }}
                    className="text-gray-500 hover:text-blue-600 text-base transition-colors"
                    title="Paste from clipboard"
                  >
                    📥
                  </button>
                  <button
                    onClick={() => handleSentenceCase(index)}
                    className="text-gray-500 hover:text-blue-600 text-base transition-colors"
                    title="Convert to Sentence Case"
                  >
                    Aa
                  </button>
                  <button
                    onClick={() => handleDeleteLine(index)}
                    className="text-gray-500 hover:text-red-600 text-base transition-colors"
                    title="Delete line"
                  >
                    🗑
                  </button>
                  {!line.isTitle && (
                    <button
                      onClick={() => handleMarkAsTitle(index)}
                      className="text-gray-500 hover:text-blue-600 text-base transition-colors"
                      title="Make this line H1"
                    >
                      H1
                    </button>
                  )}
                  {line.text.match(/https?:\/\/[^\s]+/) && (
                    <button
                      onClick={() => handleLabelUrl(index)}
                      className="text-gray-500 hover:text-green-600 text-base transition-colors"
                      title="Label this URL"
                    >
                      🔖
                    </button>
                  )}
                </div>
                <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex flex-col justify-center gap-0.5 h-full">
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
                    ➖
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
                    ➕
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="text-xs text-gray-400 mt-3 text-center font-mono">
        ⌘↑ Move | ⌘↓ Move | ⌘D Duplicate | ⌘⌥T Title | ⌘⏎ Save | Tab Indent | Shift+Tab Outdent
      </div>
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
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-md bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
        >
          Save
        </button>
      </div>
    </div>
  );
};

export default NoteEditor;