// Function to format time elapsed
export const formatTimeElapsed = (timestamp) => {
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

// Function to get cadence for a note
export const getNoteCadence = (noteId) => {
  const cadences = JSON.parse(localStorage.getItem('noteReviewCadence') || '{}');
  return cadences[noteId] || { hours: 24, minutes: 0 };
};

// Function to set cadence for a note
export const setNoteCadence = (noteId, hours, minutes) => {
  const cadences = JSON.parse(localStorage.getItem('noteReviewCadence') || '{}');
  cadences[noteId] = { hours, minutes };
  localStorage.setItem('noteReviewCadence', JSON.stringify(cadences));
};

// Function to format time remaining
export const formatTimeRemaining = (reviewTime, noteId) => {
  if (!reviewTime) return 'Never reviewed';
  
  const reviewDate = new Date(reviewTime);
  const now = new Date();
  const cadence = getNoteCadence(noteId);
  const nextReviewDate = new Date(reviewDate.getTime() + 
    (cadence.hours * 60 * 60 * 1000) + 
    (cadence.minutes * 60 * 1000));
  const diffInSeconds = Math.floor((nextReviewDate - now) / 1000);
  
  if (diffInSeconds <= 0) return 'Needs review now';
  
  const hours = Math.floor(diffInSeconds / 3600);
  const minutes = Math.floor((diffInSeconds % 3600) / 60);
  const seconds = diffInSeconds % 60;
  
  if (hours > 0) {
    return `Next review in: ${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `Next review in: ${minutes}m ${seconds}s`;
  } else {
    return `Next review in: ${seconds}s`;
  }
};

// Function to check if a note needs review
export const checkNeedsReview = (noteId) => {
  const reviews = JSON.parse(localStorage.getItem('noteReviews') || '{}');
  const reviewTime = reviews[noteId];
  if (!reviewTime) return true;
  
  const reviewDate = new Date(reviewTime);
  const now = new Date();
  const cadence = getNoteCadence(noteId);
  const nextReviewDate = new Date(reviewDate.getTime() + 
    (cadence.hours * 60 * 60 * 1000) + 
    (cadence.minutes * 60 * 1000));
  
  return now >= nextReviewDate;
};

// Function to check if a note has been reviewed
export const isNoteReviewed = (noteId) => {
  const reviews = JSON.parse(localStorage.getItem('noteReviews') || '{}');
  return reviews[noteId] !== undefined;
};

// Function to get the last review time
export const getLastReviewTime = (noteId) => {
  const reviews = JSON.parse(localStorage.getItem('noteReviews') || '{}');
  return reviews[noteId];
};

// Function to format the timestamp for display
export const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'Never reviewed';
  const date = new Date(timestamp);
  return date.toLocaleString();
}; 