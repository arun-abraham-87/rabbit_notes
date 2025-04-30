import React, { useState, useEffect } from 'react';
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
  const [needsReviewState, setNeedsReviewState] = useState({});
  const [timeElapsed, setTimeElapsed] = useState({});

  // Function to format time elapsed
  const formatTimeElapsed = (timestamp) => {
    if (!timestamp) return 'Never reviewed';
    
    const reviewDate = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now - reviewDate) / 1000);
    
    if (diffInSeconds < 60) {
      return `${diffInSeconds} seconds ago`;
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} hours ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} days ago`;
  };

  // Function to check if a note needs review (not reviewed in last 24 hours)
  const checkNeedsReview = (noteId) => {
    const reviews = JSON.parse(localStorage.getItem('noteReviews') || '{}');
    const reviewTime = reviews[noteId];
    if (!reviewTime) return true;
    
    const reviewDate = new Date(reviewTime);
    const now = new Date();
    const diffInSeconds = (now - reviewDate) / 1000;
    return diffInSeconds > 86400; // More than 24 hours ago
  };

  // Background check for review times and update time elapsed
  useEffect(() => {
    const interval = setInterval(() => {
      const newState = {};
      const newTimeElapsed = {};
      
      notes.forEach(note => {
        newState[note.id] = checkNeedsReview(note.id);
        const reviews = JSON.parse(localStorage.getItem('noteReviews') || '{}');
        newTimeElapsed[note.id] = formatTimeElapsed(reviews[note.id]);
      });
      
      setNeedsReviewState(newState);
      setTimeElapsed(newTimeElapsed);
    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, [notes]);

  const handleUnfollow = (noteId, content) => {
    const updatedContent = content
      .split('\n')
      .filter(line => !line.includes('meta::watch'))
      .join('\n')
      .trim();
    
    updateNote(noteId, updatedContent);
  };

  const handleReview = (noteId) => {
    // Get existing reviews from localStorage
    const reviews = JSON.parse(localStorage.getItem('noteReviews') || '{}');
    const currentTime = new Date().toISOString();
    
    // Update the review timestamp for this note
    reviews[noteId] = currentTime;
    localStorage.setItem('noteReviews', JSON.stringify(reviews));

    // Update the local state immediately
    setNeedsReviewState(prev => ({
      ...prev,
      [noteId]: false
    }));
    
    // Update time elapsed immediately
    setTimeElapsed(prev => ({
      ...prev,
      [noteId]: 'Just now'
    }));
  };

  // Function to check if a note has been reviewed
  const isNoteReviewed = (noteId) => {
    const reviews = JSON.parse(localStorage.getItem('noteReviews') || '{}');
    return reviews[noteId] !== undefined;
  };

  // Function to get the last review time
  const getLastReviewTime = (noteId) => {
    const reviews = JSON.parse(localStorage.getItem('noteReviews') || '{}');
    return reviews[noteId];
  };

  // Function to format the timestamp for display
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Never reviewed';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="space-y-1">
      {notes.map(note => (
        <div
          key={note.id}
          onContextMenu={onContextMenu}
          className={`p-1 rounded border relative group transition-all duration-300 ${
            needsReviewState[note.id] 
              ? 'animate-[pulse_1s_ease-in-out_infinite] bg-gradient-to-r from-red-50 to-red-100 border-red-200' 
              : 'bg-neutral-50 border-slate-200'
          }`}
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
              <div className="text-xs text-gray-500 mr-2">
                Last review: {formatTimestamp(getLastReviewTime(note.id))} ({timeElapsed[note.id] || 'Never reviewed'})
              </div>
              <button
                onClick={() => handleReview(note.id)}
                className={`px-2 py-1 rounded-md flex items-center gap-1 ${
                  isNoteReviewed(note.id)
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-green-50 text-green-600 hover:bg-green-100'
                }`}
                title={isNoteReviewed(note.id) ? 'Update review timestamp' : 'Mark as reviewed'}
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