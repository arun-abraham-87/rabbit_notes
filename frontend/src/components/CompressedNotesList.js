import React from 'react';
import NoteContent from './NoteContent';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/solid';

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
  onContextMenu,
  isWatchList = false
}) => {
  const handleUnfollow = (noteId, content) => {
    const updatedContent = content
      .split('\n')
      .filter(line => !line.includes('meta::watch'))
      .join('\n')
      .trim();
    
    updateNote(noteId, updatedContent);
  };

  const handleReview = (noteId, content) => {
    const updatedContent = `${content}\nmeta::reviewed::${new Date().toISOString()}`;
    updateNote(noteId, updatedContent);
  };

  return (
    <div className="space-y-1">
      {notes.map(note => (
        <div
          key={note.id}
          onContextMenu={onContextMenu}
          className="p-1 rounded bg-neutral-50 border border-slate-200 relative group"
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
            compressedView={true}
          />
          {isWatchList && (
            <div className="absolute top-1/2 -translate-y-1/2 right-2 flex items-center gap-2">
              <button
                onClick={() => handleReview(note.id, note.content)}
                className="px-2 py-1 rounded-md bg-green-50 text-green-600 hover:bg-green-100 flex items-center gap-1"
                title="Mark as reviewed"
              >
                <CheckIcon className="h-4 w-4" />
                <span className="text-sm">Review</span>
              </button>
              <button
                onClick={() => handleUnfollow(note.id, note.content)}
                className="px-2 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100 flex items-center gap-1"
                title="Unfollow note"
              >
                <XMarkIcon className="h-4 w-4" />
                <span className="text-sm">Unfollow</span>
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default CompressedNotesList; 