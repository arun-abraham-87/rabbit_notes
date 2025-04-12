import React, { useState, useRef, useEffect } from 'react';

const NoteEditor = ({ note, onSave, onCancel }) => {
  const initialLines = (note.content || '').split('\n').map((text, index) => ({
    id: `line-${index}`,
    text,
    isTitle: text.startsWith('##') && text.endsWith('##'),
  }));

  const [lines, setLines] = useState(initialLines);
  const [dropTargetIndex, setDropTargetIndex] = useState(null);
  const [mergedContent, setMergedContent] = useState(null);
  const [draggedId, setDraggedId] = useState(null);
  const textareasRef = useRef([]);

  useEffect(() => {
    if (textareasRef.current[0]) {
      textareasRef.current[0].focus();
    }
  }, []);

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

  const handleKeyDown = (e, index) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const newLines = [...lines];
      newLines.splice(index + 1, 0, { id: `line-${Date.now()}`, text: '', isTitle: false });
      setLines(newLines);
      setTimeout(() => {
        if (textareasRef.current[index + 1]) {
          textareasRef.current[index + 1].focus();
        }
      }, 0);
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
          className={`mb-2 border border-gray-200 rounded bg-gray-50 ${dropTargetIndex === index ? 'border-blue-500' : ''}`}
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
              className={`w-full pl-6 pr-20 p-1 resize-none focus:outline-none ${line.isTitle ? 'font-bold text-xl' : ''}`}
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
