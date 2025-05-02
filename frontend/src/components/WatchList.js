import React from 'react';
import CompressedNotesList from './CompressedNotesList';
import { ClockIcon } from '@heroicons/react/24/outline';

const WatchList = ({ allNotes, updateNote, refreshNotes }) => {
  const watchlistNotes = allNotes.filter(note => 
    note.content.includes('meta::watch')
  );

  const overdueNotes = watchlistNotes.filter(note => {
    // Check if note needs review (not reviewed in last 24 hours)
    const reviews = JSON.parse(localStorage.getItem('noteReviews') || '{}');
    const reviewTime = reviews[note.id];
    if (!reviewTime) return true;
    
    const reviewDate = new Date(reviewTime);
    const now = new Date();
    const diffInSeconds = (now - reviewDate) / 1000;
    return diffInSeconds > 86400; // More than 24 hours ago
  });

  const activeNotes = watchlistNotes.filter(note => !overdueNotes.includes(note));

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

  const getDaysSinceAdded = (note) => {
    const watchDateMatch = note.content.match(/meta::watch::(\d{4}-\d{2}-\d{2})/);
    if (!watchDateMatch) return 0;
    
    const watchDate = new Date(watchDateMatch[1]);
    const now = new Date();
    return Math.ceil((now - watchDate) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">Watchlist</h1>
        
        {overdueNotes.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <ClockIcon className="h-5 w-5 text-red-500" />
              <h2 className="text-lg font-semibold text-red-800">Needs Review ({overdueNotes.length})</h2>
            </div>
            <CompressedNotesList
              notes={overdueNotes}
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
              getNoteAge={getDaysSinceAdded}
            />
          </div>
        )}

        {activeNotes.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Active Watch Items ({activeNotes.length})</h2>
            <CompressedNotesList
              notes={activeNotes}
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
              getNoteAge={getDaysSinceAdded}
            />
          </div>
        )}

        {watchlistNotes.length === 0 && (
          <p className="text-gray-600">No notes tagged with meta::watch found.</p>
        )}
      </div>
    </div>
  );
};

export default WatchList; 