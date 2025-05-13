// cadenceUtils.js

// Get the last review time for a note from localStorage
export function getLastReviewTime(noteId) {
  const reviews = JSON.parse(localStorage.getItem('noteReviews') || '{}');
  return reviews[noteId] ? new Date(reviews[noteId]) : null;
} 