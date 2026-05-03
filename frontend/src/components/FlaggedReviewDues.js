import React, { useEffect, useMemo, useState } from 'react';
import { EllipsisVerticalIcon, FlagIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { createNote, updateNoteById } from '../utils/ApiUtils';
import { getTimerStatus, removeTimerMetaLines, withTimerMeta } from '../utils/TimerUtils';

const SUPER_CRITICAL_REVIEW_META = 'meta::review_super_critical';

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
  const today = new Date();
  const [showQuickAddTimer, setShowQuickAddTimer] = useState(false);
  const [quickTimerTitle, setQuickTimerTitle] = useState('');
  const [quickTimerType, setQuickTimerType] = useState('weekly');
  const [quickTimerValue, setQuickTimerValue] = useState(String(today.getDay() || 7));
  const [quickTimerOnce, setQuickTimerOnce] = useState(false);
  const [openTimerMenuId, setOpenTimerMenuId] = useState(null);

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
        const isSuperCritical = n.content.split('\n').some(line => line.trim() === SUPER_CRITICAL_REVIEW_META);
        return { id: n.id, title, status, days: status?.days ?? null, note: n, isSuperCritical };
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

  const handleToggleSuperCritical = async (e, note) => {
    e.stopPropagation();
    const lines = note.content.split('\n');
    const hasSuperCritical = lines.some(line => line.trim() === SUPER_CRITICAL_REVIEW_META);
    const updatedContent = hasSuperCritical
      ? lines.filter(line => line.trim() !== SUPER_CRITICAL_REVIEW_META).join('\n')
      : [...lines, SUPER_CRITICAL_REVIEW_META].join('\n');

    await updateNoteById(note.id, updatedContent);
    if (setNotes) setNotes(prev => prev.map(n => n.id === note.id ? { ...n, content: updatedContent } : n));
    setOpenTimerMenuId(null);
  };

  const handleToggleTimerMenu = (e, id) => {
    e.stopPropagation();
    setOpenTimerMenuId(openId => openId === id ? null : id);
  };

  const handleQuickAddTimer = async (e) => {
    e.preventDefault();

    const title = quickTimerTitle.trim();
    if (!title) return;

    const formattedDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const timerContent = withTimerMeta(title, quickTimerType, quickTimerValue, { once: quickTimerOnce });
    const content = `${timerContent}\nmeta::watch::${formattedDate}`;

    try {
      const newNote = await createNote(content);
      if (setNotes) setNotes(prev => [newNote, ...prev]);
      setQuickTimerTitle('');
      setShowQuickAddTimer(false);
    } catch (error) {
      console.error('Error creating timer reminder:', error);
    }
  };

  const handleTimerTypeChange = (type) => {
    setQuickTimerType(type);
    setQuickTimerValue(type === 'weekly' ? String(new Date().getDay() || 7) : String(new Date().getDate()));
  };

  const handleDismissQuickAddTimer = () => {
    setQuickTimerTitle('');
    setQuickTimerType('weekly');
    setQuickTimerValue(String(new Date().getDay() || 7));
    setQuickTimerOnce(false);
    setShowQuickAddTimer(false);
  };

  if (flaggedNotes.length === 0 && timerNotes.length === 0 && !sectionHeader) return null;

  return (
    <div className="mb-6 space-y-4">
      {sectionHeader && (
        <div className="mb-2 border-b border-gray-200 pb-1 flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">
            {timerNotes.length > 0
              ? `Timed Reminders (${timerNotes.length})`
              : 'Reviews Due'}
          </h2>
          <button
            type="button"
            onClick={() => setShowQuickAddTimer(show => !show)}
            className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-600 transition-colors hover:bg-blue-100"
            title="Quick add timer reminder"
          >
            <PlusIcon className="h-3 w-3" />
            Add
          </button>
        </div>
      )}
      {showQuickAddTimer && (
        <form
          onSubmit={handleQuickAddTimer}
          className="flex flex-wrap items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-2"
        >
          <input
            type="text"
            value={quickTimerTitle}
            onChange={(e) => setQuickTimerTitle(e.target.value)}
            placeholder="Timer reminder"
            className="min-w-[220px] flex-1 rounded border border-blue-200 bg-white px-2 py-1 text-sm text-gray-800 outline-none focus:border-blue-400"
            autoFocus
          />
          <select
            value={quickTimerType}
            onChange={(e) => handleTimerTypeChange(e.target.value)}
            className="rounded border border-blue-200 bg-white px-2 py-1 text-sm text-gray-700"
          >
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
          <select
            value={quickTimerValue}
            onChange={(e) => setQuickTimerValue(e.target.value)}
            className="rounded border border-blue-200 bg-white px-2 py-1 text-sm text-gray-700"
          >
            {quickTimerType === 'weekly'
              ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
                <option key={day} value={String(index + 1)}>{day}</option>
              ))
              : Array.from({ length: 31 }, (_, index) => index + 1).map(day => (
                <option key={day} value={String(day)}>Day {day}</option>
              ))}
          </select>
          <label className="inline-flex items-center gap-1 text-xs font-medium text-blue-700">
            <input
              type="checkbox"
              checked={quickTimerOnce}
              onChange={(e) => setQuickTimerOnce(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-blue-300"
            />
            Once
          </label>
          <button
            type="submit"
            className="rounded bg-blue-600 px-3 py-1 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            disabled={!quickTimerTitle.trim()}
          >
            Add
          </button>
          <button
            type="button"
            onClick={handleDismissQuickAddTimer}
            className="inline-flex h-8 w-8 items-center justify-center rounded border border-blue-200 bg-white text-blue-500 hover:bg-blue-100 hover:text-blue-700"
            title="Cancel timer reminder"
            aria-label="Cancel timer reminder"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </form>
      )}
      {/* Timer reminders */}
      {timerNotes.length > 0 && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {timerNotes.map(({ id, title, days, status, note, isSuperCritical }) => (
              <div
                key={id}
                className={`review-due-timer-card relative rounded-lg p-3 group ${
                  status?.expired
                    ? 'review-due-timer-card-expired bg-red-50 border border-red-200'
                    : 'bg-blue-50 border border-blue-200'
                }`}
                onMouseLeave={() => setOpenTimerMenuId(openId => openId === id ? null : openId)}
              >
                <p className="review-due-timer-title text-sm font-medium text-gray-800 truncate pr-16">{title}</p>
                <div className="mt-1">
                  {status?.expired ? (
                    <span className="review-due-timer-status text-xs font-bold text-red-600">
                      Expired {status.daysExpired} day{status.daysExpired !== 1 ? 's' : ''} ago
                    </span>
                  ) : days === 0 ? (
                    <span className="review-due-timer-status text-xs font-bold text-green-600">Today! 🎉</span>
                  ) : days === 1 ? (
                    <span className="review-due-timer-status text-xs font-semibold text-orange-600">Tomorrow</span>
                  ) : (
                    <span className="review-due-timer-status text-xs text-blue-700 font-medium">
                      {days} day{days !== 1 ? 's' : ''} left
                    </span>
                  )}
                  {status?.once && !status.expired && (
                    <span className="review-due-timer-chip ml-2 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                      Once
                    </span>
                  )}
                </div>
                {/* Progress bar */}
                {days !== null && (
                  <div className={`review-due-timer-progress-track mt-1.5 h-1 rounded-full overflow-hidden ${status?.expired ? 'bg-red-100' : 'bg-blue-100'}`}>
                    <div
                      className={`review-due-timer-progress-fill h-full rounded-full transition-all ${status?.expired ? 'bg-red-400' : 'bg-blue-400'}`}
                      style={{ width: `${status?.expired ? 100 : Math.max(4, 100 - (days / 31) * 100)}%` }}
                    />
                  </div>
                )}
                <button
                  onClick={(e) => handleRemoveTimer(e, note)}
                  className="review-due-timer-remove absolute top-2 right-8 p-0.5 text-blue-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                  title="Remove timer"
                >
                  <XMarkIcon className="h-3.5 w-3.5" />
                </button>
                <div className="absolute right-2 top-2">
                  <button
                    type="button"
                    onClick={(e) => handleToggleTimerMenu(e, id)}
                    className="inline-flex h-5 w-5 items-center justify-center rounded text-blue-400 opacity-0 transition-opacity hover:bg-blue-100 hover:text-blue-700 group-hover:opacity-100"
                    title="Timer reminder actions"
                    aria-label="Timer reminder actions"
                  >
                    <EllipsisVerticalIcon className="h-4 w-4" />
                  </button>
                  {openTimerMenuId === id && (
                    <div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-md border border-gray-200 bg-white py-1 text-sm shadow-lg">
                      <button
                        type="button"
                        onClick={(e) => handleToggleSuperCritical(e, note)}
                        className="block w-full px-3 py-1.5 text-left text-gray-700 hover:bg-blue-50 hover:text-blue-700"
                      >
                        {isSuperCritical ? 'Unmark as super critical' : 'Mark as super critical'}
                      </button>
                    </div>
                  )}
                </div>
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
