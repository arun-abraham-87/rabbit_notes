import moment from 'moment';

/**
 * Checks for any ongoing meetings in the notes
 * @param {Array} notes - Array of note objects
 * @returns {Object|null} Meeting object or null if no ongoing meeting
 */
export const checkForOngoingMeeting = (notes) => {
  if (!notes) return null;
  
  const now = new Date();
  let closestOngoingMeeting = null;
  let earliestEndTime = null;
  
  for (const note of notes) {
    // Skip if the note has been dismissed
    if (note.content.includes('meta_detail::dismissed')) continue;
    
    // Skip if not a meeting note
    if (!note.content.includes('meta::meeting::')) continue;
    
    const lines = note.content.split('\n');
    const meetingTimeStr = lines.find(line => /^\d{4}-\d{2}-\d{2}/.test(line));
    if (!meetingTimeStr) continue;
    
    try {
      const meetingTime = new Date(meetingTimeStr);
      
      // Find meeting duration from meta tag
      const durationMatch = note.content.match(/meta::meeting_duration::(\d+)/);
      if (!durationMatch) continue;
      
      const durationMins = parseInt(durationMatch[1], 10);
      const meetingEndTime = new Date(meetingTime.getTime() + durationMins * 60000);
      
      // Check if meeting is ongoing
      if (now >= meetingTime && now <= meetingEndTime) {
        // If we haven't found a meeting yet, or if this one ends sooner
        if (!earliestEndTime || meetingEndTime < earliestEndTime) {
          earliestEndTime = meetingEndTime;
          closestOngoingMeeting = {
            id: note.id,
            description: lines[0], // First line has the description
            startTime: meetingTimeStr,
            duration: durationMins
          };
        }
      }
    } catch (error) {
      console.error('Error parsing meeting time:', error);
      continue;
    }
  }
  
  return closestOngoingMeeting;
};

/**
 * Finds the next upcoming meeting in the notes
 * @param {Array} notes - Array of note objects
 * @returns {Object|null} Next meeting object or null if no upcoming meetings
 */
export const findNextMeeting = (notes) => {
  if (!notes) return null;
  
  const now = new Date();
  let nextMeeting = null;
  let earliestStartTime = null;
  
  for (const note of notes) {
    if (note.content.includes('meta_detail::dismissed')) continue;
    if (!note.content.includes('meta::meeting::')) continue;
    
    const lines = note.content.split('\n');
    const meetingTimeStr = lines.find(line => /^\d{4}-\d{2}-\d{2}/.test(line));
    if (!meetingTimeStr) continue;
    
    try {
      const meetingTime = new Date(meetingTimeStr);
      
      // Only consider future meetings
      if (meetingTime > now) {
        if (!earliestStartTime || meetingTime < earliestStartTime) {
          earliestStartTime = meetingTime;
          nextMeeting = {
            id: note.id,
            startTime: meetingTime
          };
        }
      }
    } catch (error) {
      continue;
    }
  }
  
  return nextMeeting;
};

/**
 * Gets all unacknowledged past meetings
 * @param {Array} notes - Array of note objects
 * @returns {Array} Array of unacknowledged meeting notes
 */
export const getUnacknowledgedPastMeetings = (notes) => {
  return notes.filter(note => {
    // Check if it's a meeting note
    if (!note.content.includes('meta::meeting::')) return false;
    // Skip if already acknowledged
    if (note.content.includes('meta::meeting_acknowledge')) return false;

    const lines = note.content.split('\n');
    const meetingTimeStr = lines.find(line => /^\d{4}-\d{2}-\d{2}/.test(line));
    if (!meetingTimeStr) return false;

    try {
      const meetingTime = new Date(meetingTimeStr);
      // Find meeting duration from meta tag
      const durationMatch = note.content.match(/meta::meeting_duration::(\d+)/);
      if (!durationMatch) return false;
      
      const durationMins = parseInt(durationMatch[1], 10);
      const meetingEndTime = new Date(meetingTime.getTime() + durationMins * 60000);
      
      // Check if meeting has ended and wasn't acknowledged
      return Date.now() > meetingEndTime;
    } catch (error) {
      return false;
    }
  });
}; 