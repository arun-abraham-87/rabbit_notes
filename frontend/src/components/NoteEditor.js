import React, { useState, useRef } from 'react';

const NoteEditor = ({ note, onSave, onCancel }) => {
  const initialLines = (note.content || '').split('\n').map((text, index) => ({
    id: `line-${index}`,
    text,
  }));

  const [lines, setLines] = useState(initialLines);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [mergedContent, setMergedContent] = useState(null);
  const textareasRef = useRef([]);

  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDrop = (targetIndex) => {
    if (draggedIndex === null) return;
    const newLines = [...lines];
    const [movedItem] = newLines.splice(draggedIndex, 1);
    newLines.splice(targetIndex, 0, movedItem);
    setLines(newLines);
    setDraggedIndex(null);
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
      newLines.splice(index + 1, 0, { id: `line-${Date.now()}`, text: '' });
      setLines(newLines);
      setTimeout(() => {
        if (textareasRef.current[index + 1]) {
          textareasRef.current[index + 1].focus();
        }
      }, 0);
    }
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
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => handleDrop(index)}
          className="mb-2 p-2 border border-gray-200 rounded bg-gray-50"
        >
          <textarea
            ref={el => textareasRef.current[index] = el}
            value={line.text}
            onChange={(e) => handleTextChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className="w-full p-1 border border-gray-300 rounded resize-none"
            rows={1}
          />
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
