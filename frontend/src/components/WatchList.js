import React, { useState, useEffect } from 'react';
import ReminderWatchCard from './ReminderWatchCard';
import { ClockIcon, PencilIcon, XMarkIcon, BellIcon } from '@heroicons/react/24/outline';
import NoteEditor from './NoteEditor';
import StockInfoPanel from './StockInfoPanel';
import { findDueRemindersAsNotes, findRemindersNotDue } from '../utils/CadenceHelpUtils';

const WatchList = ({ allNotes, updateNote}) => {
  const [editingNote, setEditingNote] = useState(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const watchlistNotes = allNotes.filter(note => 
    note && note.content && note.content.includes('meta::watch')
  );

  const handleMarkAsReminder = (noteId) => {
    // Find the note
    const note = allNotes.find(n => n.id === noteId);
    if (!note || !note.content) return;

    // Check if note already has reminder tag
    const hasReminder = note.content.includes('meta::reminder');
    
    let updatedContent;
    if (hasReminder) {
      // Remove the reminder tag
      updatedContent = note.content
        .split('\n')
        .filter(line => !line.trim().startsWith('meta::reminder'))
        .join('\n')
        .trim();
    } else {
      // Add the reminder tag
      updatedContent = note.content + '\nmeta::reminder';
    }
    
    // Update the note
    updateNote(noteId, updatedContent)
  };

  const handleMarkForReview = (noteId) => {
    // Get current reviews from localStorage
    const reviews = JSON.parse(localStorage.getItem('noteReviews') || '{}');
    // Delete the review entry for this note
    delete reviews[noteId];
    // Save back to localStorage
    localStorage.setItem('noteReviews', JSON.stringify(reviews));
    // Refresh the notes to update the UI
  };

  const getLastReviewTime = (noteId) => {
    const reviews = JSON.parse(localStorage.getItem('noteReviews') || '{}');
    return reviews[noteId] ? new Date(reviews[noteId]) : null;
  };

  const getReviewCadence = (noteId) => {
    const cadences = JSON.parse(localStorage.getItem('noteReviewCadence') || '{}');
    return cadences[noteId] || { hours: 24, minutes: 0 };
  };

  const overdueNotes = watchlistNotes.filter(note => {
    // Skip notes with reminder tag
    if (note.content.includes('meta::reminder')) return false;
    
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



  const reminderNotes = findRemindersNotDue(allNotes) 

  const reminderOverdueNotes = findDueRemindersAsNotes(allNotes)

  const watchNotes = watchlistNotes.filter(note => 
    !reminderNotes.includes(note) && !reminderOverdueNotes.includes(note) && note.content.includes('meta::watch')
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
    });
  };

  const getDaysSinceAdded = (note) => {
    const watchDateMatch = note.content.match(/meta::watch::(\d{4}-\d{2}-\d{2})/);
    if (!watchDateMatch) return 0;
    
    const watchDate = new Date(watchDateMatch[1]);
    const now = new Date();
    return Math.ceil((now - watchDate) / (1000 * 60 * 60 * 24));
  };

  const handleEdit = (note) => {
    setEditingNote(note);
    setIsEditorOpen(true);
  };

  const handleSave = (updatedNote) => {
    updateNote(editingNote.id, updatedNote);
    setIsEditorOpen(false);
    setEditingNote(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4">
        <h1 className="text-2xl font-semibold text-gray-900 mb-4">Watchlist</h1>
        
        {reminderOverdueNotes.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Overdue Notes</h2>
            <ReminderWatchCard
              notes={reminderOverdueNotes}
              updateNote={handleUnfollow}
              isWatchList={true}
              getNoteAge={getDaysSinceAdded}
              onReview={handleMarkForReview}
              onCadenceChange={handleMarkForReview}
              onEdit={handleEdit}
              onMarkForReview={handleMarkForReview}
              onMarkAsReminder={handleMarkAsReminder}
              getLastReviewTime={getLastReviewTime}
              getReviewCadence={getReviewCadence}
            />
          </div>
        )}

        {reminderNotes.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <BellIcon className="h-6 w-6 text-purple-500" />
              Reminders
            </h2>
            <ReminderWatchCard
              notes={reminderNotes}
              updateNote={handleUnfollow}
              isWatchList={true}
              getNoteAge={getDaysSinceAdded}
              onReview={handleMarkForReview}
              onCadenceChange={handleMarkForReview}
              onEdit={handleEdit}
              onMarkForReview={handleMarkForReview}
              onMarkAsReminder={handleMarkAsReminder}
              getLastReviewTime={getLastReviewTime}
              getReviewCadence={getReviewCadence}
            />
          </div>
        )}

        

        {watchNotes.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Active Notes</h2>
            <ReminderWatchCard
              notes={watchNotes}
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
              onReview={handleMarkForReview}
              onCadenceChange={handleMarkForReview}
              onEdit={handleEdit}
              onMarkForReview={handleMarkForReview}
              onMarkAsReminder={handleMarkAsReminder}
              getLastReviewTime={getLastReviewTime}
              getReviewCadence={getReviewCadence}
            />
          </div>
        )}

        {watchlistNotes.length === 0 && (
          <p className="text-gray-600">No notes tagged with meta::watch found.</p>
        )}
      </div>

      {isEditorOpen && editingNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Edit Note</h2>
              <button
                onClick={() => {
                  setIsEditorOpen(false);
                  setEditingNote(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <NoteEditor
              isAddMode={false}
              note={editingNote}
              onSave={handleSave}
              onCancel={() => {
                setIsEditorOpen(false);
                setEditingNote(null);
              }}
              objList={[]}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default WatchList; 