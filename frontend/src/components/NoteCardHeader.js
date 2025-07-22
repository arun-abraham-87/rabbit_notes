import React from 'react';
import NoteMetaInfo from './NoteMetaInfo';
import NoteTagBar from './NoteTagBar';

export default function NoteCardHeader({
  note,
  setShowEndDatePickerForNoteId,
  urlToNotesMap,
  updateNoteCallback,
  updateNote,
  duplicateUrlNoteIds,
  duplicateWithinNoteIds,
  urlShareSpaceNoteIds,
  focusMode,
  onNavigate,
  allNotes,
  setSearchQuery
}) {
  return (
    <>
      <NoteMetaInfo
        note={note}
        setShowEndDatePickerForNoteId={setShowEndDatePickerForNoteId}
        urlToNotesMap={urlToNotesMap}
        updateNoteCallback={updateNoteCallback}
      />
      {!focusMode && (
        <div className="flex items-center space-x-4 px-4 py-2">
          <NoteTagBar
            note={note}
            updateNote={updateNote}
            duplicateUrlNoteIds={duplicateUrlNoteIds}
            duplicateWithinNoteIds={duplicateWithinNoteIds}
            urlShareSpaceNoteIds={urlShareSpaceNoteIds}
            focusMode={focusMode}
            onNavigate={onNavigate}
            allNotes={allNotes}
            setSearchQuery={setSearchQuery}
          />
        </div>
      )}
    </>
  );
} 