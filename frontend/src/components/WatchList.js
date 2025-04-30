import React from 'react';
import CompressedNotesList from './CompressedNotesList';

const WatchList = ({ allNotes, updateNote, refreshNotes }) => {
  const watchlistNotes = allNotes.filter(note => 
    note.content.includes('meta::watch')
  );

  const handleUnfollow = (noteId, content) => {
    // Remove the entire line containing meta::watch
    const updatedContent = content
      .split('\n')
      .filter(line => !line.trim().startsWith('meta::watch'))
      .join('\n')
      .trim();
    
    // Call the parent's updateNote function to save the changes
    updateNote(noteId, updatedContent).then(() => {
      // Refresh the notes list
      refreshNotes();
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">Watchlist</h1>
        {watchlistNotes.length === 0 ? (
          <p className="text-gray-600">No notes tagged with meta::watch found.</p>
        ) : (
          <CompressedNotesList
            notes={watchlistNotes}
            searchQuery=""
            duplicatedUrlColors={{}}
            editingLine={null}
            setEditingLine={() => {}}
            editedLineContent=""
            setEditedLineContent={() => {}}
            rightClickNoteId={null}
            rightClickIndex={null}
            setRightClickNoteId={() => {}}
            setRightClickIndex={() => {}}
            setRightClickPos={() => {}}
            editingInlineDate={null}
            setEditingInlineDate={() => {}}
            handleInlineDateSelect={() => {}}
            popupNoteText={null}
            setPopupNoteText={() => {}}
            objList={[]}
            addingLineNoteId={null}
            setAddingLineNoteId={() => {}}
            newLineText=""
            setNewLineText={() => {}}
            newLineInputRef={null}
            updateNote={handleUnfollow}
            onContextMenu={() => {}}
            isWatchList={true}
          />
        )}
      </div>
    </div>
  );
};

export default WatchList; 