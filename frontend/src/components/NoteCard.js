import React from 'react';
import NoteMetaInfo from './NoteMetaInfo';
import NoteContent from './NoteContent';
import NoteTagBar from './NoteTagBar';
import NoteFooter from './NoteFooter';
import LinkedNotesSection from './LinkedNotesSection';
import InlineEditor from './InlineEditor';
import { reorderMetaTags } from '../utils/MetaTagUtils';

const NoteCard = ({
  note,
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
  urlToNotesMap,
  updateNoteCallback,
  showCreatedDate,
  setShowEndDatePickerForNoteId,
  handleDelete,
  setLinkingNoteId,
  setLinkSearchTerm,
  setLinkPopupVisible,
  selectedNotes,
  toggleNoteSelection,
  allNotes,
  onNavigate,
  onContextMenu,
  isMeetingNote,
  isEventNote,
  setEditingMeetingNote,
  setEditingEventNote,
  duplicateUrlNoteIds,
  duplicateWithinNoteIds,
  urlShareSpaceNoteIds,
  focusMode = false,
  setSearchQuery
}) => {
  return (
    <div
      key={note.id}
      onContextMenu={(e) => onContextMenu(e, note)}
      className={`group flex flex-col ${
        focusMode 
          ? 'px-3 py-3 mb-3 rounded border border-gray-200 bg-white' 
          : 'px-6 py-6 mb-5 rounded-lg bg-neutral-50 border border-slate-200 ring-1 ring-slate-100'
      } relative`}
    >
      <div className="flex flex-col flex-auto">
        {/* Layer 1: Content and Edit/Delete */}
        <div className={focusMode ? "p-0" : "p-2"}>
          <NoteMetaInfo
            note={note}
            setShowEndDatePickerForNoteId={setShowEndDatePickerForNoteId}
            urlToNotesMap={urlToNotesMap}
            updateNoteCallback={updateNoteCallback}
          />
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
            focusMode={focusMode}
          />
        </div>

        {addingLineNoteId === note.id && (
          <div className="w-full px-4 py-2">
            <InlineEditor
              text={newLineText}
              setText={setNewLineText}
              onSave={(text) => {
                const updated = note.content.trimEnd() + '\n' + text;
                const reorderedContent = reorderMetaTags(updated);
                updateNote(note.id, reorderedContent);
                setAddingLineNoteId(null);
                setNewLineText('');
              }}
              onCancel={() => {
                setAddingLineNoteId(null);
                setNewLineText('');
              }}
            />
          </div>
        )}

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

        <NoteFooter
          note={note}
          showCreatedDate={showCreatedDate}
          setShowEndDatePickerForNoteId={setShowEndDatePickerForNoteId}
          handleDelete={handleDelete}
          setPopupNoteText={setPopupNoteText}
          setLinkingNoteId={setLinkingNoteId}
          setLinkSearchTerm={setLinkSearchTerm}
          setLinkPopupVisible={setLinkPopupVisible}
          selectedNotes={selectedNotes}
          toggleNoteSelection={toggleNoteSelection}
          updateNote={updateNote}
          focusMode={focusMode}
        />

        <LinkedNotesSection
          note={note}
          allNotes={allNotes}
          onNavigate={onNavigate}
          updateNote={updateNote}
        />
      </div>
    </div>
  );
};

export default NoteCard; 