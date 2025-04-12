import React, { useState, useRef, useEffect } from 'react';

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
  const textareasRef = useRef([]);

  useEffect(() => {
    if (textareasRef.current[0]) {
      textareasRef.current[0].focus();
    }
  }, []);
  
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

      // Mark as title
      if (e.key.toLowerCase() === 't') {
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
    const newLines = [...lines];

    // Remove title from existing title line if any
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
    const [selected] = newLines.splice(index, 1);
    selected.isTitle = true;
    if (!selected.text.startsWith('##')) {
      selected.text = `##${selected.text}##`;
    }

    // Place it at the top
    newLines.unshift(selected);
    setLines(newLines);
  };

  const handleSave = () => {
    const merged = lines.map(line => line.text).join('\n');
    onSave({ ...note, content: merged });
    setMergedContent(merged);
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

  return (
    <div className="p-4 bg-white border border-gray-300 rounded shadow-md">
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
      <div className="mb-4">
        <button
          onClick={() => setIsTextMode(!isTextMode)}
          className="px-3 py-1 text-sm rounded bg-gray-100 hover:bg-gray-200 border border-gray-300"
        >
          {isTextMode ? 'Switch to Advanced Mode' : 'Switch to Text Mode'}
        </button>
      </div>
      {isTextMode ? (
        <textarea
          className="w-full p-2 border border-gray-300 rounded resize-none min-h-[200px]"
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
        <div className="border border-gray-300 rounded-md divide-y divide-gray-200">
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
              className={`${dropTargetIndex === index ? 'border-t border-blue-500' : ''}`}
            >
              {dropTargetIndex === index && draggedId !== lines[index].id && (
                <div className="h-1 bg-blue-500 rounded my-1"></div>
              )}
              <div className="relative w-full flex items-center">
                <span className="absolute left-1 top-1 cursor-move text-gray-400">☰</span>
                <textarea
                  ref={(el) => (textareasRef.current[index] = el)}
                  value={line.text}
                  onChange={(e) => handleTextChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  onPaste={(e) => handlePaste(e, index)}
                  className={`w-full pl-6 pr-20 py-0 resize-none focus:outline-none border-none bg-transparent ${line.isTitle ? 'font-bold text-xl' : ''}`}
                  rows={1}
                />
                <div className="absolute top-1 right-1 flex space-x-2">
                  <button onClick={() => handleDeleteLine(index)} className="text-red-500 text-sm">🗑️</button>
                  {!line.isTitle && (
                    <button onClick={() => handleMarkAsTitle(index)} className="text-blue-500 text-sm">🏷️</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="text-xs text-gray-400 mt-2 text-center">
        ⌘↑ Move Up | ⌘↓ Move Down | ⌘D Duplicate | ⌘T Title | ⌘⏎ Save
      </div>
      <div className="flex justify-end space-x-2 mt-4">
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Save
        </button>
      </div>
    </div>
  );
};

export default NoteEditor;