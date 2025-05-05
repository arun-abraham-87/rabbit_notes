import React, { useState } from 'react';
import CompressedNotesList from './CompressedNotesList';
import { ClockIcon, PencilIcon } from '@heroicons/react/24/outline';
import { useNoteEditor } from '../contexts/NoteEditorContext';
import NoteEditorModal from './NoteEditorModal';

const WatchList = ({ allNotes, updateNote, refreshNotes }) => {
  const { openEditor } = useNoteEditor();
  const [editingNote, setEditingNote] = useState(null);
  const watchlistNotes = allNotes.filter(note => 
    note.content.includes('meta::watch')
  );

  const overdueNotes = watchlistNotes.filter(note => {
    // Check if note needs review based on its cadence
    const reviews = JSON.parse(localStorage.getItem('noteReviews') || '{}');
    const reviewTime = reviews[note.id];
    if (!reviewTime) return true;
    
    const reviewDate = new Date(reviewTime);
    const now = new Date();
    
    // Get the note's cadence from localStorage
    const cadences = JSON.parse(localStorage.getItem('noteReviewCadence') || '{}');
    const cadence = cadences[note.id] || { hours: 24, minutes: 0 };
    
    // Calculate when the next review is due
    const nextReviewDate = new Date(reviewDate.getTime() + 
      (cadence.hours * 60 * 60 * 1000) + 
      (cadence.minutes * 60 * 1000));
    
    return now >= nextReviewDate;
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
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Overdue Notes</h2>
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
              refreshNotes={refreshNotes}
              onReview={handleUnfollow}
              onCadenceChange={handleUnfollow}
              onEdit={(note) => {
                openEditor(note.content, 'edit', note.id);
                setEditingNote(note);
              }}
            />
          </div>
        )}

        {activeNotes.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Active Notes</h2>
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
              refreshNotes={refreshNotes}
              onReview={handleUnfollow}
              onCadenceChange={handleUnfollow}
              onEdit={(note) => {
                openEditor(note.content, 'edit', note.id);
                setEditingNote(note);
              }}
            />
          </div>
        )}

        {watchlistNotes.length === 0 && (
          <p className="text-gray-600">No notes tagged with meta::watch found.</p>
        )}
      </div>
      <NoteEditorModal />
    </div>
  );
};

export default WatchList; 