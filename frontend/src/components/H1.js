import React from 'react';
import InlineEditor from './InlineEditor';
import { updateNoteById as updateNote } from '../utils/ApiUtils';
import { processContent } from '../utils/TextUtils';

/**
 * RenderH1 component
 * Extracted H1 rendering logic with inline edit and context menu
 */
export default function H1({
  note,
  line,
  idx,
  searchTerm,
  duplicatedUrlColors,
  editingLine,
  setEditingLine,
  editedLineContent,
  setEditedLineContent,
  setRightClickNoteId,
  setRightClickIndex,
  setRightClickPos,
  rightClickNoteId,
  rightClickIndex
}) {
  const content = line.slice(4, -5);

  return (
    <h1
      key={idx}
      onContextMenu={(e) => {
        e.preventDefault();
        setRightClickNoteId(note.id);
        setRightClickIndex(idx);
        setRightClickPos({ x: e.clientX, y: e.clientY });
      }}
      className={`group text-2xl font-bold cursor-text flex items-center justify-between ${
        rightClickNoteId === note.id && rightClickIndex === idx ? 'bg-yellow-100' : ''
      }`}
    >
      {editingLine.noteId === note.id && editingLine.lineIndex === idx ? (
        <InlineEditor
          text={editedLineContent}
          setText={setEditedLineContent}
          onSave={(newText) => {
            const lines = note.content.split('\n');
            lines[idx] = `###${newText}###`; // h1 wrapper
            updateNote(note.id, lines.join('\n'));
            setEditingLine({ noteId: null, lineIndex: null });
          }}
          onCancel={() => setEditingLine({ noteId: null, lineIndex: null })}
        />
      ) : (
        <span className="flex-1">
          {processContent(content, searchTerm, duplicatedUrlColors)}
        </span>
      )}
    </h1>
  );
}