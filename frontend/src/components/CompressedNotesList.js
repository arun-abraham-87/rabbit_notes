import React from 'react';
import NoteContent from './NoteContent';

const CompressedNotesList = ({
  notes,
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
  onContextMenu
}) => {
  return (
    <div className="space-y-1">
      {notes.map(note => (
        <div
          key={note.id}
          onContextMenu={onContextMenu}
          className="p-1 rounded bg-neutral-50 border border-slate-200"
        >
          <NoteContent
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
          />
        </div>
      ))}
    </div>
  );
};

export default CompressedNotesList; 