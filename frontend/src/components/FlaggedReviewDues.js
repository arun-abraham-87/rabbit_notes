import React from 'react';
import { FlagIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { updateNoteById } from '../utils/ApiUtils';

const FlaggedReviewDues = ({ notes, setNotes, setActivePage }) => {
  const flaggedNotes = notes.filter(note =>
    note.content && note.content.includes('meta::review_overdue_priority')
  );

  const getFirstLine = (content) => {
    if (!content) return '';
    return content.split('\n')[0] || '';
  };

  const handleClick = () => {
    const reviewOverdueSection = document.querySelector('[data-section="review-overdue"]');
    if (reviewOverdueSection) {
      reviewOverdueSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleUnflag = async (e, note) => {
    e.stopPropagation();
    const updatedContent = note.content
      .split('\n')
      .filter(l => l.trim() !== 'meta::review_overdue_priority')
      .join('\n');
    await updateNoteById(note.id, updatedContent);
    if (setNotes) {
      setNotes(prev => prev.map(n => n.id === note.id ? { ...n, content: updatedContent } : n));
    }
  };

  if (flaggedNotes.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <FlagIcon className="h-5 w-5 text-red-500" />
        <h3 className="text-lg font-semibold text-gray-800">
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
  );
};

export default FlaggedReviewDues;
