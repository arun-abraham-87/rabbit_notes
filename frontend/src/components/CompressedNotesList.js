import React, { useState, useEffect } from 'react';
import NoteContent from './NoteContent';
import { XMarkIcon, CheckIcon, ClockIcon, PencilIcon, ChevronDownIcon, ChevronUpIcon, CodeBracketIcon, BellIcon } from '@heroicons/react/24/solid';
import {
  formatTimeElapsed,
  getNoteCadence,
  setNoteCadence,
  formatTimeRemaining,
  checkNeedsReview,
  isNoteReviewed,
  getLastReviewTime,
  formatTimestamp
} from '../utils/watchlistUtils';
import { updateNoteById } from '../utils/ApiUtils';
import { getLastReviewTime as cadenceUtilsLastReviewTime } from '../utils/cadenceUtils';

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
  isWatchList = false,
  refreshNotes,
  onEdit,
  onMarkForReview,
  onMarkAsReminder
}) => {
  const [needsReviewState, setNeedsReviewState] = useState({});
  const [timeElapsed, setTimeElapsed] = useState({});
  const [nextReviewTime, setNextReviewTime] = useState({});
  const [showCadenceSelector, setShowCadenceSelector] = useState(null);
  const [cadenceHours, setCadenceHours] = useState(24);
  const [cadenceMinutes, setCadenceMinutes] = useState(0);
  const [cadenceType, setCadenceType] = useState('every-x-hours');
  const [cadenceDays, setCadenceDays] = useState(0);
  const [expandedNotes, setExpandedNotes] = useState({});
  const [showRawNotes, setShowRawNotes] = useState({});
  const [dailyTime, setDailyTime] = useState('09:00');
  const [weeklyTime, setWeeklyTime] = useState('09:00');
  const [weeklyDays, setWeeklyDays] = useState([]); // 0=Sun, 1=Mon, ...
  const [monthlyTime, setMonthlyTime] = useState('09:00');
  const [monthlyDay, setMonthlyDay] = useState(1);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('');

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
        newNextReviewTime[note.id] = formatTimeRemaining(reviews[note.id], note.id);
        
        // Check if this note just became overdue
        if (newState[note.id] && !needsReviewState[note.id]) {
          needsRefresh = true;
        }
      });
      
      setNeedsReviewState(newState);
      setTimeElapsed(newTimeElapsed);
      setNextReviewTime(newNextReviewTime);
      
      // If any note just became overdue, refresh the page
      if (needsRefresh && typeof refreshNotes === 'function') {
        refreshNotes();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [notes, needsReviewState, refreshNotes]);

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

    // Trigger a refresh of the notes list
    if (typeof refreshNotes === 'function') {
      refreshNotes();
    }
  };

  const handleCadenceChange = async (noteId) => {
    let hours = cadenceHours;
    let minutes = cadenceMinutes;
    let cadenceObj = {};
    if (cadenceType === 'every-x-hours') {
      hours += cadenceDays * 24;
      cadenceObj = { hours, minutes };
    } else if (cadenceType === 'daily') {
      hours = 24; minutes = 0;
      cadenceObj = { hours, minutes, time: dailyTime };
    } else if (cadenceType === 'weekly') {
      hours = 24 * 7; minutes = 0;
      cadenceObj = { hours, minutes, time: weeklyTime, days: weeklyDays };
    } else if (cadenceType === 'monthly') {
      hours = 24 * 30; minutes = 0;
      cadenceObj = { hours, minutes, time: monthlyTime, day: monthlyDay };
    } else if (cadenceType === 'yearly') {
      hours = 24 * 365; minutes = 0;
      cadenceObj = { hours, minutes };
    }
    cadenceObj.startDate = startDate;
    cadenceObj.endDate = endDate;

    // Build single-line meta tag
    let metaLine = `meta::review_cadence::type=${cadenceType}`;
    metaLine += `;hours=${hours}`;
    metaLine += `;minutes=${minutes}`;
    if (cadenceObj.time) metaLine += `;time=${cadenceObj.time}`;
    if (cadenceType === 'weekly' && cadenceObj.days) metaLine += `;days=${cadenceObj.days.join(',')}`;
    if (cadenceType === 'monthly' && cadenceObj.day) metaLine += `;day=${cadenceObj.day}`;
    if (cadenceType === 'yearly' && cadenceObj.day && cadenceObj.month) metaLine += `;day=${cadenceObj.day};month=${cadenceObj.month}`;
    if (cadenceObj.startDate) metaLine += `;start=${cadenceObj.startDate}`;
    if (cadenceObj.endDate) metaLine += `;end=${cadenceObj.endDate}`;

    // Find the note and update its content
    const note = notes.find(n => n.id === noteId);
    if (note) {
      let lines = note.content.split('\n');
      const metaIdx = lines.findIndex(line => line.startsWith('meta::review_cadence::'));
      if (metaIdx !== -1) {
        lines[metaIdx] = metaLine;
      } else {
        lines.push(metaLine);
      }
      const updatedContent = lines.join('\n');
      await updateNoteById(noteId, updatedContent);
    }
    setShowCadenceSelector(null);
    if (typeof refreshNotes === 'function') {
      refreshNotes();
    }
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

  // Helper to parse meta::review_cadence:: line from note content
  function parseReviewCadenceMeta(content) {
    const line = content.split('\n').find(l => l.startsWith('meta::review_cadence::'));
    if (!line) return null;
    const meta = {};
    line.replace('meta::review_cadence::', '').split(';').forEach(pair => {
      const [k, v] = pair.split('=');
      if (k && v !== undefined) {
        if (k === 'days') meta[k] = v.split(',').map(Number);
        else if (k === 'day' || k === 'month' || k === 'hours' || k === 'minutes') meta[k] = Number(v);
        else meta[k] = v;
      }
    });
    return meta;
  }

  // Helper to get next review Date object for a note
  function getNextReviewDate(note) {
    const meta = parseReviewCadenceMeta(note.content);
    const reviews = JSON.parse(localStorage.getItem('noteReviews') || '{}');
    const lastReview = reviews[note.id] ? new Date(reviews[note.id]) : null;
    const now = new Date();
    if (!meta) {
      // Fallback: 12 hours after last review or now
      if (!lastReview) return now;
      return new Date(lastReview.getTime() + 12 * 60 * 60 * 1000);
    }
    // Handle each cadence type
    if (meta.type === 'every-x-hours') {
      const hours = meta.hours || 12;
      const minutes = meta.minutes || 0;
      if (!lastReview) return now;
      return new Date(lastReview.getTime() + (hours * 60 * 60 * 1000) + (minutes * 60 * 1000));
    } else if (meta.type === 'daily') {
      // Next review is next occurrence of meta.time (HH:MM) after lastReview or now
      const [hh, mm] = (meta.time || '09:00').split(':').map(Number);
      let base = lastReview && lastReview > now ? lastReview : now;
      let next = new Date(base);
      next.setHours(hh, mm, 0, 0);
      if (next <= base) next.setDate(next.getDate() + 1);
      return next;
    } else if (meta.type === 'weekly') {
      // Next review is next selected weekday at meta.time after lastReview or now
      const days = Array.isArray(meta.days) ? meta.days : [];
      const [hh, mm] = (meta.time || '09:00').split(':').map(Number);
      let base = lastReview && lastReview > now ? lastReview : now;
      let next = new Date(base);
      next.setHours(hh, mm, 0, 0);
      let tries = 0;
      while (tries < 14) {
        if (days.includes(next.getDay()) && next > base) return next;
        next.setDate(next.getDate() + 1);
        tries++;
      }
      return next;
    } else if (meta.type === 'monthly') {
      // Next review is next meta.day of month at meta.time after lastReview or now
      const day = meta.day || 1;
      const [hh, mm] = (meta.time || '09:00').split(':').map(Number);
      let base = lastReview && lastReview > now ? lastReview : now;
      let next = new Date(base);
      next.setHours(hh, mm, 0, 0);
      if (next.getDate() > day || (next.getDate() === day && next <= base)) {
        // Go to next month
        next.setMonth(next.getMonth() + 1);
      }
      next.setDate(day);
      return next;
    } else if (meta.type === 'yearly') {
      // Next review is next meta.month/meta.day at meta.time after lastReview or now
      const day = meta.day || 1;
      const month = meta.month ? meta.month - 1 : 0; // JS months 0-based
      const [hh, mm] = (meta.time || '09:00').split(':').map(Number);
      let base = lastReview && lastReview > now ? lastReview : now;
      let next = new Date(base);
      next.setHours(hh, mm, 0, 0);
      if (
        next.getMonth() > month ||
        (next.getMonth() === month && (next.getDate() > day || (next.getDate() === day && next <= base)))
      ) {
        next.setFullYear(next.getFullYear() + 1);
      }
      next.setMonth(month);
      next.setDate(day);
      return next;
    }
    // Fallback
    if (!lastReview) return now;
    return new Date(lastReview.getTime() + 12 * 60 * 60 * 1000);
  }

  // Update formatTimeRemaining to use getNextReviewDate
  function formatTimeRemaining(lastReview, noteId, noteObj) {
    const note = noteObj || (notes && notes.find(n => n.id === noteId));
    if (!note) return '';
    const next = getNextReviewDate(note);
    const now = new Date();
    if (!next) return '';
    const diff = next - now;
    if (diff <= 0) return 'Due now';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `Next review in ${hours}h ${minutes}m`;
    return `Next review in ${minutes}m`;
  }

  // Update checkNeedsReview to use getNextReviewDate
  function checkNeedsReview(noteId) {
    const note = notes && notes.find(n => n.id === noteId);
    if (!note) return false;
    const next = getNextReviewDate(note);
    const now = new Date();
    return now >= next;
  }

  return (
    <div className="space-y-4">
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
                  {/* Always use new next review logic for display */}
                  <span>{formatTimeRemaining(cadenceUtilsLastReviewTime(note.id), note.id, note)}</span>
                  {isReminder ? (
                    <>
                      <span className="text-purple-600">Reminder</span>
                      <div className="text-xs text-gray-400">
                        {needsReviewState[note.id] 
                          ? 'Last review: ' + formatTimestamp(cadenceUtilsLastReviewTime(note.id)) + ' (' + timeElapsed[note.id] + ')'
                          : nextReviewTime[note.id]}
                        <div className="text-xs text-gray-400">
                          {showCadenceSelector === note.id ? (
                            <div className="flex flex-col gap-2 bg-white p-3 rounded shadow z-50">
                              <label className="text-xs font-semibold mb-1">Cadence Type</label>
                              <select
                                value={cadenceType}
                                onChange={e => setCadenceType(e.target.value)}
                                className="border rounded px-2 py-1 text-sm mb-2"
                              >
                                <option value="every-x-hours">Every X hours</option>
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                                <option value="yearly">Yearly</option>
                              </select>
                              {cadenceType === 'every-x-hours' && (
                                <>
                                  <div className="flex flex-wrap gap-2 mb-2">
                                    {[{d:0,h:2,m:0,label:'2h'},{d:0,h:4,m:0,label:'4h'},{d:0,h:8,m:0,label:'8h'},{d:0,h:12,m:0,label:'12h'},{d:1,h:0,m:0,label:'24h'},{d:3,h:0,m:0,label:'3d'},{d:7,h:0,m:0,label:'7d'}].map(opt => (
                                      <button
                                        key={opt.label}
                                        className="px-2 py-1 bg-gray-100 rounded hover:bg-blue-100 text-xs"
                                        onClick={() => { setCadenceDays(opt.d); setCadenceHours(opt.h); setCadenceMinutes(opt.m); }}
                                      >
                                        {opt.label}
                                      </button>
                                    ))}
                                  </div>
                                  <div className="flex items-center gap-1 mb-2">
                                    <input
                                      type="number"
                                      min="0"
                                      max="365"
                                      value={cadenceDays}
                                      onChange={e => setCadenceDays(parseInt(e.target.value) || 0)}
                                      className="w-12 px-1 py-0.5 border rounded text-sm"
                                      placeholder="Days"
                                    />
                                    <span className="text-sm">d</span>
                                    <input
                                      type="number"
                                      min="0"
                                      max="23"
                                      value={cadenceHours}
                                      onChange={e => setCadenceHours(parseInt(e.target.value) || 0)}
                                      className="w-12 px-1 py-0.5 border rounded text-sm"
                                      placeholder="Hours"
                                    />
                                    <span className="text-sm">h</span>
                                    <input
                                      type="number"
                                      min="0"
                                      max="59"
                                      value={cadenceMinutes}
                                      onChange={e => setCadenceMinutes(parseInt(e.target.value) || 0)}
                                      className="w-12 px-1 py-0.5 border rounded text-sm"
                                      placeholder="Minutes"
                                    />
                                    <span className="text-sm">m</span>
                                  </div>
                                </>
                              )}
                              {cadenceType === 'daily' && (
                                <div className="flex items-center gap-2 mb-2">
                                  <label className="text-xs">Time of day:</label>
                                  <input
                                    type="time"
                                    value={dailyTime}
                                    onChange={e => setDailyTime(e.target.value)}
                                    className="border rounded px-2 py-1 text-sm"
                                  />
                                </div>
                              )}
                              {cadenceType === 'weekly' && (
                                <>
                                  <div className="flex items-center gap-2 mb-2">
                                    <label className="text-xs">Time of day:</label>
                                    <input
                                      type="time"
                                      value={weeklyTime}
                                      onChange={e => setWeeklyTime(e.target.value)}
                                      className="border rounded px-2 py-1 text-sm"
                                    />
                                  </div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <label className="text-xs">Days:</label>
                                    {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d, idx) => (
                                      <label key={d} className="flex items-center gap-1 text-xs">
                                        <input
                                          type="checkbox"
                                          checked={weeklyDays.includes(idx)}
                                          onChange={e => {
                                            if (e.target.checked) {
                                              setWeeklyDays(prev => [...prev, idx]);
                                            } else {
                                              setWeeklyDays(prev => prev.filter(day => day !== idx));
                                            }
                                          }}
                                        />
                                        {d}
                                      </label>
                                    ))}
                                  </div>
                                </>
                              )}
                              {cadenceType === 'monthly' && (
                                <>
                                  <div className="flex items-center gap-2 mb-2">
                                    <label className="text-xs">Day of month:</label>
                                    <select
                                      value={monthlyDay}
                                      onChange={e => setMonthlyDay(Number(e.target.value))}
                                      className="border rounded px-2 py-1 text-sm"
                                    >
                                      {Array.from({length: 31}, (_, i) => i + 1).map(day => (
                                        <option key={day} value={day}>{day}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <label className="text-xs">Time of day:</label>
                                    <input
                                      type="time"
                                      value={monthlyTime}
                                      onChange={e => setMonthlyTime(e.target.value)}
                                      className="border rounded px-2 py-1 text-sm"
                                    />
                                  </div>
                                </>
                              )}
                              <div className="flex items-center gap-2 mb-2">
                                <label className="text-xs">Start Date:</label>
                                <input
                                  type="date"
                                  value={startDate}
                                  onChange={e => setStartDate(e.target.value)}
                                  className="border rounded px-2 py-1 text-sm"
                                />
                                <label className="text-xs">End Date:</label>
                                <input
                                  type="date"
                                  value={endDate}
                                  onChange={e => setEndDate(e.target.value)}
                                  className="border rounded px-2 py-1 text-sm"
                                />
                              </div>
                              <div className="flex gap-2 mt-2">
                                <button
                                  onClick={() => handleCadenceChange(note.id)}
                                  className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200"
                                >
                                  Set
                                </button>
                                <button
                                  onClick={() => setShowCadenceSelector(null)}
                                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <span>Review every: {getNoteCadence(note.id).hours}h {getNoteCadence(note.id).minutes}m</span>
                              <button
                                onClick={() => {
                                  const cadence = getNoteCadence(note.id);
                                  setCadenceHours(cadence.hours);
                                  setCadenceMinutes(cadence.minutes);
                                  setShowCadenceSelector(note.id);
                                }}
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
                        ? 'Last review: ' + formatTimestamp(cadenceUtilsLastReviewTime(note.id)) + ' (' + timeElapsed[note.id] + ')'
                        : nextReviewTime[note.id]}
                      <div className="text-xs text-gray-400">
                        {showCadenceSelector === note.id ? (
                          <div className="flex flex-col gap-2 bg-white p-3 rounded shadow z-50">
                            <label className="text-xs font-semibold mb-1">Cadence Type</label>
                            <select
                              value={cadenceType}
                              onChange={e => setCadenceType(e.target.value)}
                              className="border rounded px-2 py-1 text-sm mb-2"
                            >
                              <option value="every-x-hours">Every X hours</option>
                              <option value="daily">Daily</option>
                              <option value="weekly">Weekly</option>
                              <option value="monthly">Monthly</option>
                              <option value="yearly">Yearly</option>
                            </select>
                            {cadenceType === 'every-x-hours' && (
                              <>
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {[{d:0,h:2,m:0,label:'2h'},{d:0,h:4,m:0,label:'4h'},{d:0,h:8,m:0,label:'8h'},{d:0,h:12,m:0,label:'12h'},{d:1,h:0,m:0,label:'24h'},{d:3,h:0,m:0,label:'3d'},{d:7,h:0,m:0,label:'7d'}].map(opt => (
                                    <button
                                      key={opt.label}
                                      className="px-2 py-1 bg-gray-100 rounded hover:bg-blue-100 text-xs"
                                      onClick={() => { setCadenceDays(opt.d); setCadenceHours(opt.h); setCadenceMinutes(opt.m); }}
                                    >
                                      {opt.label}
                                    </button>
                                  ))}
                                </div>
                                <div className="flex items-center gap-1 mb-2">
                                  <input
                                    type="number"
                                    min="0"
                                    max="365"
                                    value={cadenceDays}
                                    onChange={e => setCadenceDays(parseInt(e.target.value) || 0)}
                                    className="w-12 px-1 py-0.5 border rounded text-sm"
                                    placeholder="Days"
                                  />
                                  <span className="text-sm">d</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max="23"
                                    value={cadenceHours}
                                    onChange={e => setCadenceHours(parseInt(e.target.value) || 0)}
                                    className="w-12 px-1 py-0.5 border rounded text-sm"
                                    placeholder="Hours"
                                  />
                                  <span className="text-sm">h</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max="59"
                                    value={cadenceMinutes}
                                    onChange={e => setCadenceMinutes(parseInt(e.target.value) || 0)}
                                    className="w-12 px-1 py-0.5 border rounded text-sm"
                                    placeholder="Minutes"
                                  />
                                  <span className="text-sm">m</span>
                                </div>
                              </>
                            )}
                            {cadenceType === 'daily' && (
                              <div className="flex items-center gap-2 mb-2">
                                <label className="text-xs">Time of day:</label>
                                <input
                                  type="time"
                                  value={dailyTime}
                                  onChange={e => setDailyTime(e.target.value)}
                                  className="border rounded px-2 py-1 text-sm"
                                />
                              </div>
                            )}
                            {cadenceType === 'weekly' && (
                              <>
                                <div className="flex items-center gap-2 mb-2">
                                  <label className="text-xs">Time of day:</label>
                                  <input
                                    type="time"
                                    value={weeklyTime}
                                    onChange={e => setWeeklyTime(e.target.value)}
                                    className="border rounded px-2 py-1 text-sm"
                                  />
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                  <label className="text-xs">Days:</label>
                                  {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d, idx) => (
                                    <label key={d} className="flex items-center gap-1 text-xs">
                                      <input
                                        type="checkbox"
                                        checked={weeklyDays.includes(idx)}
                                        onChange={e => {
                                          if (e.target.checked) {
                                            setWeeklyDays(prev => [...prev, idx]);
                                          } else {
                                            setWeeklyDays(prev => prev.filter(day => day !== idx));
                                          }
                                        }}
                                      />
                                      {d}
                                    </label>
                                  ))}
                                </div>
                              </>
                            )}
                            {cadenceType === 'monthly' && (
                              <>
                                <div className="flex items-center gap-2 mb-2">
                                  <label className="text-xs">Day of month:</label>
                                  <select
                                    value={monthlyDay}
                                    onChange={e => setMonthlyDay(Number(e.target.value))}
                                    className="border rounded px-2 py-1 text-sm"
                                  >
                                    {Array.from({length: 31}, (_, i) => i + 1).map(day => (
                                      <option key={day} value={day}>{day}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="flex items-center gap-2 mb-2">
                                  <label className="text-xs">Time of day:</label>
                                  <input
                                    type="time"
                                    value={monthlyTime}
                                    onChange={e => setMonthlyTime(e.target.value)}
                                    className="border rounded px-2 py-1 text-sm"
                                  />
                                </div>
                              </>
                            )}
                            <div className="flex items-center gap-2 mb-2">
                              <label className="text-xs">Start Date:</label>
                              <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="border rounded px-2 py-1 text-sm"
                              />
                              <label className="text-xs">End Date:</label>
                              <input
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                className="border rounded px-2 py-1 text-sm"
                              />
                            </div>
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={() => handleCadenceChange(note.id)}
                                className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200"
                              >
                                Set
                              </button>
                              <button
                                onClick={() => setShowCadenceSelector(null)}
                                className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            <span>Review every: {getNoteCadence(note.id).hours}h {getNoteCadence(note.id).minutes}m</span>
                            <button
                              onClick={() => {
                                const cadence = getNoteCadence(note.id);
                                setCadenceHours(cadence.hours);
                                setCadenceMinutes(cadence.minutes);
                                setShowCadenceSelector(note.id);
                              }}
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

export default CompressedNotesList; 