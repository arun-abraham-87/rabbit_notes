import React, { useState, useEffect } from 'react';
import NoteContent from './NoteContent';
import CadenceSelector from './CadenceSelector';
import { XMarkIcon, CheckIcon, ClockIcon, PencilIcon, ChevronDownIcon, ChevronUpIcon, CodeBracketIcon, BellIcon } from '@heroicons/react/24/solid';
import {
  formatTimeElapsed,
  formatTimeRemaining,
  checkNeedsReview,
  formatTimestamp
} from '../utils/watchlistUtils';
import { getLastReviewTime as CadenceHelpUtilsLastReviewTime, parseReviewCadenceMeta, getNextReviewDate, renderCadenceSummary, getBaseTime, handleRemoveLastReview, getNextReviewDateObj, formatDateTime, getHumanFriendlyTimeDiff, findDueRemindersAsNotes } from '../utils/CadenceHelpUtils';

const ReminderWatchCard = ({
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
  isWatchList = false,
  onEdit,
  onMarkForReview,
  onMarkAsReminder
}) => {
  const [needsReviewState, setNeedsReviewState] = useState({});
  const [timeElapsed, setTimeElapsed] = useState({});
  const [nextReviewTime, setNextReviewTime] = useState({});
  const [showCadenceSelector, setShowCadenceSelector] = useState(null);
  const [expandedNotes, setExpandedNotes] = useState({});
  const [showRawNotes, setShowRawNotes] = useState({});
  const [countdowns, setCountdowns] = useState({});

  // Background check for review times and update time elapsed
  useEffect(() => {
    const interval = setInterval(() => {
      const newState = {};
      const newTimeElapsed = {};
      const newNextReviewTime = {};
      let needsRefresh = false;
      
      notes.forEach(note => {
        // Remove the skip for reminder notes
        newState[note.id] = checkNeedsReview(note.id);
        const reviews = JSON.parse(localStorage.getItem('noteReviews') || '{}');
        newTimeElapsed[note.id] = formatTimeElapsed(reviews[note.id]);
        newNextReviewTime[note.id] = formatTimeRemaining(reviews[note.id], note.id, note);
        
        // Check if this note just became overdue
        if (newState[note.id] && !needsReviewState[note.id]) {
          needsRefresh = true;
        }
      });
      
      setNeedsReviewState(newState);
      setTimeElapsed(newTimeElapsed);
      setNextReviewTime(newNextReviewTime);
      
      
    }, 1000);

    return () => clearInterval(interval);
  }, [notes, needsReviewState]);

  useEffect(() => {
    const interval = setInterval(() => {
      const newCountdowns = {};
      notes.forEach(note => {
        const nextReview = getNextReviewDateObj(note);
        const now = new Date();
        let diff = Math.max(0, nextReview - now);
        const hours = String(Math.floor(diff / (1000 * 60 * 60))).padStart(2, '0');
        const minutes = String(Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
        const seconds = String(Math.floor((diff % (1000 * 60)) / 1000)).padStart(2, '0');
        newCountdowns[note.id] = `${hours}:${minutes}:${seconds}`;
      });
      setCountdowns(newCountdowns);
    }, 1000);
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

  const toggleNoteExpansion = (noteId) => {
    setExpandedNotes(prev => ({
      ...prev,
      [noteId]: !prev[noteId]
    }));
  };

  const toggleRawView = (noteId) => {
    setShowRawNotes(prev => ({
      ...prev,
      [noteId]: !prev[noteId]
    }));
  };

  const getVisibleLines = (content) => {
    const lines = content.split('\n')
      .filter(line => line.trim().length > 0)
      .filter(line => !line.trim().startsWith('meta::'));
    return lines.length > 3 ? lines.slice(0, 3).join('\n') : content;
  };

  const getContentLines = (content) => {
    return content.split('\n')
      .filter(line => line.trim().length > 0)
      .filter(line => !line.trim().startsWith('meta::'));
  };

  function formatDateTime(dt) {
    if (!dt) return '';
    return dt.toLocaleString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  function getHumanFriendlyTimeDiff(nextReviewDate) {
    const now = new Date();
    let diff = nextReviewDate - now;
    if (diff <= 0) return 'now';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    let msg = '';
    if (days > 0) msg = `in ${days}d ${hours}h ${minutes}m`;
    else if (hours > 0) msg = `in ${hours}h ${minutes}m`;
    else if (minutes > 0) msg = `in ${minutes}m`;
    else msg = 'in <1m';
    return msg;
  }

  return (
    <div className="space-y-4">
      

      {/* Regular Notes List */}
      {notes.map(note => {
        const contentLines = getContentLines(note.content);
        const isLongNote = contentLines.length > 3;
        const isExpanded = expandedNotes[note.id];
        const isRawView = showRawNotes[note.id];
        const displayContent = isLongNote && !isExpanded 
          ? getVisibleLines(note.content)
          : note.content;

        // Check if note has reminder tag
        const isReminder = note.content.includes('meta::reminder');

        return (
          <div
            key={note.id}
            onContextMenu={onContextMenu}
            className={`p-1 rounded border relative group transition-all duration-300 ${
              !isReminder && needsReviewState[note.id]
                ? 'border-2 border-red-500 bg-red-50' 
                : isReminder
                ? 'border-2 border-purple-500 bg-purple-50'
                : 'bg-neutral-50 border-slate-200'
            }`}
          >
            {isRawView ? (
              <pre className="whitespace-pre-wrap break-words p-4 bg-gray-50 rounded text-sm font-mono">
                {note.content}
              </pre>
            ) : (
              <NoteContent
                note={{ ...note, content: displayContent }}
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
            )}
            {isLongNote && !isRawView && (
              <button
                onClick={() => toggleNoteExpansion(note.id)}
                className="w-full text-center py-1 text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1"
              >
                {isExpanded ? (
                  <>
                    <ChevronUpIcon className="h-4 w-4" />
                    <span>Show less</span>
                  </>
                ) : (
                  <>
                    <ChevronDownIcon className="h-4 w-4" />
                    <span>Show more ({contentLines.length - 3} more lines)</span>
                  </>
                )}
              </button>
            )}
            {isWatchList && (
              <div className="mt-2 flex items-center justify-between border-t pt-2">
                <div className="text-xs text-gray-500 flex flex-col">
                  <span>{formatTimeRemaining(CadenceHelpUtilsLastReviewTime(note.id), note.id, note)}</span>
                  <span>
                    Last review: {formatTimestamp(CadenceHelpUtilsLastReviewTime(note.id))}
                    {CadenceHelpUtilsLastReviewTime(note.id) && (
                      <button
                        onClick={() => handleRemoveLastReview(note.id)}
                        className="ml-2 text-xs text-red-500 underline hover:text-red-700"
                        title="Remove last review from local storage"
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                      >
                        Remove
                      </button>
                    )}
                  </span>
                  <span>Base time for next review: {formatTimestamp(getBaseTime(note))}</span>
                  {isReminder ? (
                    <>
                      <span className="text-purple-600">Reminder</span>
                      <div className="text-xs text-gray-400">
                        {needsReviewState[note.id] 
                          ? 'Last review: ' + formatTimestamp(CadenceHelpUtilsLastReviewTime(note.id)) + ' (' + timeElapsed[note.id] + ')'
                          : nextReviewTime[note.id]}
                        <div className="text-xs text-gray-400">
                          {showCadenceSelector === note.id ? (
                            <CadenceSelector
                              noteId={note.id}
                              notes={notes}
                              onCadenceChange={() => {
                                setShowCadenceSelector(null);
                               
                              }}
                            />
                          ) : (
                            <div className="flex items-center gap-1">
                              <span>{renderCadenceSummary(note)}</span>
                              <button
                                onClick={() => setShowCadenceSelector(note.id)}
                                className="text-blue-500 hover:text-blue-700 underline text-sm"
                                title="Set review cadence"
                              >
                                Set Cadence
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {needsReviewState[note.id] 
                        ? 'Last review: ' + formatTimestamp(CadenceHelpUtilsLastReviewTime(note.id)) + ' (' + timeElapsed[note.id] + ')'
                        : nextReviewTime[note.id]}
                      <div className="text-xs text-gray-400">
                        {showCadenceSelector === note.id ? (
                          <CadenceSelector
                            noteId={note.id}
                            notes={notes}
                            onCadenceChange={() => {
                              setShowCadenceSelector(null);
                              
                            }}
                          />
                        ) : (
                          <div className="flex items-center gap-1">
                            <span>{renderCadenceSummary(note)}</span>
                            <button
                              onClick={() => setShowCadenceSelector(note.id)}
                              className="text-blue-500 hover:text-blue-700 underline text-sm"
                              title="Set review cadence"
                            >
                              Set Cadence
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  <span>
                    Next review: {formatDateTime(getNextReviewDateObj(note))}
                  </span>
                  <span>
                    Next review in: {countdowns[note.id] || '--:--:--'}
                  </span>
                  <span>
                    Next review in: {getHumanFriendlyTimeDiff(getNextReviewDateObj(note))}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleRawView(note.id)}
                    className="px-2 py-1 rounded-md bg-gray-50 text-gray-600 hover:bg-gray-100 flex items-center gap-1"
                    title={isRawView ? "View formatted" : "View raw"}
                  >
                    <CodeBracketIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onEdit && onEdit(note)}
                    className="px-2 py-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center gap-1"
                    title="Edit note"
                  >
                    <PencilIcon className="h-4 w-4" />
                    <span className="text-sm">Edit</span>
                  </button>
                  <button
                    onClick={() => onMarkAsReminder && onMarkAsReminder(note.id)}
                    className={`px-2 py-1 rounded-md flex items-center gap-1 ${
                      isReminder 
                        ? 'bg-purple-50 text-purple-600 hover:bg-purple-100' 
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                    title={isReminder ? "Remove reminder" : "Set as reminder"}
                  >
                    <BellIcon className="h-4 w-4" />
                    <span className="text-sm">{isReminder ? "UnMark As Reminder" : "Set As Reminder"}</span>
                  </button>
                  {!isReminder && (
                    <>
                      {needsReviewState[note.id] ? (
                        <button
                          onClick={() => handleReview(note.id)}
                          className="px-2 py-1 rounded-md bg-green-50 text-green-600 hover:bg-green-100 flex items-center gap-1"
                          title="Mark as reviewed"
                        >
                          <CheckIcon className="h-4 w-4" />
                          <span className="text-sm">Review</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onMarkForReview && onMarkForReview(note.id)}
                          className="px-2 py-1 rounded-md bg-yellow-50 text-yellow-600 hover:bg-yellow-100 flex items-center gap-1"
                          title="Mark for review"
                        >
                          <ClockIcon className="h-4 w-4" />
                          <span className="text-sm">Mark for Review</span>
                        </button>
                      )}
                    </>
                  )}
                  <button
                    onClick={() => handleUnfollow(note.id, note.content)}
                    className="px-2 py-1 rounded-md bg-red-50 text-red-600 hover:bg-red-100 flex items-center gap-1"
                    title="Unfollow note"
                  >
                    <XMarkIcon className="h-4 w-4" />
                    <span className="text-sm">Un-Watch</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ReminderWatchCard; 