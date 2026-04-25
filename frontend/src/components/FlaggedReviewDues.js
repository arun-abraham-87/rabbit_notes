import React, { useEffect, useMemo, useState } from 'react';
import { FlagIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { updateNoteById } from '../utils/ApiUtils';
import { getTimerStatus, removeTimerMetaLines } from '../utils/TimerUtils';

const getDisplayTitle = (content) => {
  const firstContentLine = (content || '')
    .split('\n')
    .map(line => line.trim())
    .find(line => line && !line.startsWith('meta::'));
  if (!firstContentLine) return 'Untitled';
  if (firstContentLine.startsWith('event_description:')) {
    return firstContentLine.replace('event_description:', '').trim() || 'Untitled';
  }
  return firstContentLine;
};

const FlaggedReviewDues = ({ notes, setNotes, setActivePage, sectionHeader = false }) => {
  const [showTimerList, setShowTimerList] = useState(() => localStorage.getItem('dashboardShowTimerList') !== 'false');

  useEffect(() => {
    localStorage.setItem('dashboardShowTimerList', showTimerList ? 'true' : 'false');
  }, [showTimerList]);

  useEffect(() => {
    const cleanupExpiredOnceTimers = async () => {
      const timersToCleanup = (notes || []).filter(note => getTimerStatus(note)?.shouldCleanup);
      if (timersToCleanup.length === 0) return;

      const updates = await Promise.all(timersToCleanup.map(async note => {
        const updatedContent = removeTimerMetaLines(note.content);
        await updateNoteById(note.id, updatedContent);
        return { id: note.id, content: updatedContent };
      }));

      if (setNotes) {
        setNotes(prev => prev.map(note => {
          const update = updates.find(item => item.id === note.id);
          return update ? { ...note, content: update.content } : note;
        }));
      }
    };

    cleanupExpiredOnceTimers().catch(error => {
      console.error('Error cleaning up expired one-time timers:', error);
    });
  }, [notes, setNotes]);

  const flaggedNotes = useMemo(() =>
    (notes || []).filter(n => n.content && n.content.includes('meta::review_overdue_priority')),
    [notes]
  );

  const timerNotes = useMemo(() =>
    (notes || [])
      .filter(n => n.content && n.content.split('\n').some(l => l.trim().startsWith('meta::timer_cadence::')))
      .map(n => {
        const status = getTimerStatus(n);
        const title = getDisplayTitle(n.content);
        return { id: n.id, title, status, days: status?.days ?? null, note: n };
      })
      .filter(item => !item.status?.shouldCleanup)
      .sort((a, b) => {
        const aDays = Number.isFinite(a.days) ? a.days : Number.POSITIVE_INFINITY;
        const bDays = Number.isFinite(b.days) ? b.days : Number.POSITIVE_INFINITY;
        return aDays - bDays;
      }),
    [notes]
  );

  const getFirstLine = (content) => (content || '').split('\n')[0] || '';

  const handleClick = () => {
    document.querySelector('[data-section="review-overdue"]')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleUnflag = async (e, note) => {
    e.stopPropagation();
    const updatedContent = note.content.split('\n')
      .filter(l => l.trim() !== 'meta::review_overdue_priority')
      .join('\n');
    await updateNoteById(note.id, updatedContent);
    if (setNotes) setNotes(prev => prev.map(n => n.id === note.id ? { ...n, content: updatedContent } : n));
  };

  const handleRemoveTimer = async (e, note) => {
    e.stopPropagation();
    const updatedContent = removeTimerMetaLines(note.content);
    await updateNoteById(note.id, updatedContent);
    if (setNotes) setNotes(prev => prev.map(n => n.id === note.id ? { ...n, content: updatedContent } : n));
  };

  if (flaggedNotes.length === 0 && timerNotes.length === 0) return null;

  return (
    <div className="mb-6 space-y-4">
      {sectionHeader && (
        <div className="mb-2 border-b border-gray-200 pb-1 flex items-center gap-2">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Reviews Due</h2>
          {timerNotes.length > 0 && (
            <button
              type="button"
              onClick={() => setShowTimerList(prev => !prev)}
              className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                showTimerList
                  ? 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
              title={showTimerList ? 'Hide timer reminder list' : 'Show timer reminder list'}
            >
              {showTimerList ? 'hide timers' : `show timers (${timerNotes.length})`}
            </button>
          )}
        </div>
      )}
      {/* Timer reminders */}
      {showTimerList && timerNotes.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base leading-none">⏱</span>
            <h3 className="text-base font-semibold text-gray-700">
              Timer Reminders ({timerNotes.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {timerNotes.map(({ id, title, days, status, note }) => (
              <div
                key={id}
                className={`relative rounded-lg p-3 group ${
                  status?.expired
                    ? 'bg-red-50 border border-red-200'
                    : 'bg-blue-50 border border-blue-200'
                }`}
              >
                <p className="text-sm font-medium text-gray-800 truncate pr-6">{title}</p>
                <div className="mt-1">
                  {status?.expired ? (
                    <span className="text-xs font-bold text-red-600">
                      Expired {status.daysExpired} day{status.daysExpired !== 1 ? 's' : ''} ago
                    </span>
                  ) : days === 0 ? (
                    <span className="text-xs font-bold text-green-600">Today! 🎉</span>
                  ) : days === 1 ? (
                    <span className="text-xs font-semibold text-orange-600">Tomorrow</span>
                  ) : (
                    <span className="text-xs text-blue-700 font-medium">
                      {days} day{days !== 1 ? 's' : ''} left
                    </span>
                  )}
                  {status?.once && !status.expired && (
                    <span className="ml-2 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                      Once
                    </span>
                  )}
                </div>
                {/* Progress bar */}
                {days !== null && (
                  <div className={`mt-1.5 h-1 rounded-full overflow-hidden ${status?.expired ? 'bg-red-100' : 'bg-blue-100'}`}>
                    <div
                      className={`h-full rounded-full transition-all ${status?.expired ? 'bg-red-400' : 'bg-blue-400'}`}
                      style={{ width: `${status?.expired ? 100 : Math.max(4, 100 - (days / 31) * 100)}%` }}
                    />
                  </div>
                )}
                <button
                  onClick={(e) => handleRemoveTimer(e, note)}
                  className="absolute top-2 right-2 p-0.5 text-blue-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                  title="Remove timer"
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Flagged review dues */}
      {flaggedNotes.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FlagIcon className="h-5 w-5 text-red-500" />
            <h3 className="text-base font-semibold text-gray-700">
              Flagged Review Dues ({flaggedNotes.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {flaggedNotes.map((note) => (
              <div
                key={note.id}
                onClick={handleClick}
                className="relative bg-red-50 border border-red-200 rounded-lg p-3 cursor-pointer hover:bg-red-100 transition-colors group"
              >
                <p className="text-sm text-gray-800 font-medium truncate pr-6">
                  {getFirstLine(note.content)}
                </p>
                <button
                  onClick={(e) => handleUnflag(e, note)}
                  className="absolute top-2 right-2 p-0.5 text-red-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                  title="Remove flag"
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FlaggedReviewDues;
