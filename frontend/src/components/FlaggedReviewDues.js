import React from 'react';
import { FlagIcon } from '@heroicons/react/24/solid';

const FlaggedReviewDues = ({ notes, setActivePage }) => {
  // Filter notes that have the meta::review_overdue_priority tag
  const flaggedNotes = notes.filter(note => 
    note.content && note.content.includes('meta::review_overdue_priority')
  );

  // Get the first line of each note
  const getFirstLine = (content) => {
    if (!content) return '';
    const lines = content.split('\n');
    return lines[0] || '';
  };

  // Handle click to navigate to review overdue section
  const handleClick = () => {
    // Scroll to the review overdue section
    const reviewOverdueSection = document.querySelector('[data-section="review-overdue"]');
    if (reviewOverdueSection) {
      reviewOverdueSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (flaggedNotes.length === 0) {
    return null; // Don't render anything if no flagged notes
  }

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
              className="bg-red-50 border border-red-200 rounded-lg p-3 cursor-pointer hover:bg-red-100 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 font-medium truncate">
                  {getFirstLine(note.content)}
                </p>
              </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default FlaggedReviewDues; 