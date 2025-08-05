import React from 'react';
import NoteMetaInfo from './NoteMetaInfo';

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
    </>
  );
} 