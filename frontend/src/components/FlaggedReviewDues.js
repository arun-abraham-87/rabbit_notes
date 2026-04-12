import React, { useMemo } from 'react';
import { FlagIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { updateNoteById } from '../utils/ApiUtils';

// Calculate days until next occurrence for a timer note.
function getNextOccurrenceDays(cadenceType, cadenceValue) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (cadenceType === 'monthly') {
    const day = parseInt(cadenceValue, 10);
    // Find this month's occurrence
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), day);
    const target = today <= thisMonth ? thisMonth
      : new Date(today.getFullYear(), today.getMonth() + 1, day);
    return Math.round((target - today) / (1000 * 60 * 60 * 24));
  }

  if (cadenceType === 'weekly') {
    // cadenceValue: 1=Mon … 7=Sun (ISO)
    const targetDow = parseInt(cadenceValue, 10); // 1-7
    const todayDow = today.getDay() || 7;          // 1-7
    let diff = targetDow - todayDow;
    if (diff <= 0) diff += 7;
    return diff;
  }

  return null;
}

const FlaggedReviewDues = ({ notes, setNotes, setActivePage }) => {
  const flaggedNotes = useMemo(() =>
    (notes || []).filter(n => n.content && n.content.includes('meta::review_overdue_priority')),
    [notes]
  );

  const timerNotes = useMemo(() =>
    (notes || [])
      .filter(n => n.content && n.content.split('\n').some(l => l.trim().startsWith('meta::timer_cadence::')))
      .map(n => {
        const cadenceLine = n.content.split('\n').find(l => l.trim().startsWith('meta::timer_cadence::'));
        const parts = cadenceLine.trim().split('::');   // ['meta', 'timer_cadence', type, value]
        const cadenceType = parts[2] || '';
        const cadenceValue = parts[3] || '';
        const days = getNextOccurrenceDays(cadenceType, cadenceValue);
        const title = n.content.split('\n')[0]?.trim() || 'Untitled';
        return { id: n.id, title, days, cadenceType, cadenceValue, note: n };
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
    const updatedContent = note.content.split('\n')
      .filter(l => !l.trim().startsWith('meta::timer_cadence::'))
      .join('\n');
    await updateNoteById(note.id, updatedContent);
    if (setNotes) setNotes(prev => prev.map(n => n.id === note.id ? { ...n, content: updatedContent } : n));
  };

  if (flaggedNotes.length === 0 && timerNotes.length === 0) return null;

  return (
    <div className="mb-6 space-y-4">
      {/* Timer reminders */}
      {timerNotes.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base leading-none">⏱</span>
            <h3 className="text-base font-semibold text-gray-700">
              Timer Reminders ({timerNotes.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {timerNotes.map(({ id, title, days, note }) => (
              <div
                key={id}
                className="relative bg-blue-50 border border-blue-200 rounded-lg p-3 group"
              >
                <p className="text-sm font-medium text-gray-800 truncate pr-6">{title}</p>
                <div className="mt-1">
                  {days === 0 ? (
                    <span className="text-xs font-bold text-green-600">Today! 🎉</span>
                  ) : days === 1 ? (
                    <span className="text-xs font-semibold text-orange-600">Tomorrow</span>
                  ) : (
                    <span className="text-xs text-blue-700 font-medium">
                      {days} day{days !== 1 ? 's' : ''} left
                    </span>
                  )}
                </div>
                {/* Progress bar */}
                {days !== null && (
                  <div className="mt-1.5 h-1 bg-blue-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-400 rounded-full transition-all"
                      style={{ width: `${Math.max(4, 100 - (days / 31) * 100)}%` }}
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
