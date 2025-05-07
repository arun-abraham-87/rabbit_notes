import React, { useState, useEffect } from 'react';
import { checkForOngoingMeeting, findNextMeeting, getUnacknowledgedPastMeetings } from '../utils/MeetingUtils';
import OngoingMeetingBanner from './OngoingMeetingBanner';
import NextMeetingBanner from './NextMeetingBanner';
import UnacknowledgedMeetingsBanner from './UnacknowledgedMeetingsBanner';
import { updateNoteById } from '../utils/ApiUtils';

const MeetingManager = ({ 
  allNotes, 
  setNotes,
  searchQuery,
  currentDate
}) => {
  const [ongoingMeeting, setOngoingMeeting] = useState(null);
  const [meetings, setMeetings] = useState([]);

  // Extract meetings from notes
  useEffect(() => {
    if (!Array.isArray(allNotes)) return;
    const extractedMeetings = allNotes.flatMap(note => {
      if (!note?.content) return [];
      if (note.content.split('\n').some(line => line.trim().startsWith('meta::meeting'))) {
        const lines = note.content.split('\n');
        const durationMatch = note.content.match(/meta::meeting_duration::(\d+)/);
        const duration = durationMatch ? parseInt(durationMatch[1]) : null;
        return [{ 
          id: note.id, 
          context: lines[0].trim(), 
          time: lines[1].trim(),
          duration: duration
        }];
      }
      return [];
    }).sort((a, b) => new Date(a.time) - new Date(b.time));
    setMeetings(extractedMeetings);
  }, [allNotes]);

  // Check for ongoing meetings periodically and schedule checks for upcoming meetings
  useEffect(() => {
    let upcomingMeetingTimeout;

    const checkMeetings = () => {
      const meeting = checkForOngoingMeeting(allNotes);
      setOngoingMeeting(meeting);

      // If no ongoing meeting, check for upcoming meetings
      if (!meeting) {
        const nextMeeting = findNextMeeting(allNotes);
        if (nextMeeting) {
          const timeUntilStart = nextMeeting.startTime - new Date();
          if (timeUntilStart > 0) {
            // Clear any existing timeout
            if (upcomingMeetingTimeout) {
              clearTimeout(upcomingMeetingTimeout);
            }
            // Set timeout to check again when the meeting starts
            upcomingMeetingTimeout = setTimeout(() => {
              checkMeetings();
            }, timeUntilStart);
          }
        }
      }
    };

    // Initial check
    checkMeetings();

    return () => {
      if (upcomingMeetingTimeout) {
        clearTimeout(upcomingMeetingTimeout);
      }
    };
  }, [allNotes]);

  const handleDismissMeeting = async () => {
    if (!ongoingMeeting) return;
    
    const note = allNotes.find(n => n.id === ongoingMeeting.id);
    if (!note) return;
    
    // Add the dismissed tag
    const updatedContent = `${note.content}\nmeta_detail::dismissed`;
    
    try {
      await updateNoteById(note.id, updatedContent);
      // Update the notes state to reflect the change
      setNotes(allNotes.map(n => n.id === note.id ? { ...n, content: updatedContent } : n));
      // Clear the ongoing meeting state
      setOngoingMeeting(null);
    } catch (error) {
      console.error('Error dismissing meeting:', error);
    }
  };

  const handleDismissUnacknowledgedMeeting = async (noteId) => {
    const note = allNotes.find(n => n.id === noteId);
    if (!note) return;
    
    // Add the acknowledged tag with timestamp
    const ackLine = `meta::meeting_acknowledge::${new Date().toISOString()}`;
    const updatedContent = `${note.content}\n${ackLine}`;
    
    try {
      await updateNoteById(noteId, updatedContent);
      // Update the notes state to reflect the change
      setNotes(allNotes.map(n => n.id === noteId ? { ...n, content: updatedContent } : n));
    } catch (error) {
      console.error('Error acknowledging meeting:', error);
    }
  };

  const unacknowledgedMeetings = getUnacknowledgedPastMeetings(allNotes);

  return (
    <>
      <UnacknowledgedMeetingsBanner 
        meetings={unacknowledgedMeetings} 
        onDismiss={handleDismissUnacknowledgedMeeting} 
      />
      {ongoingMeeting && (
        <OngoingMeetingBanner
          meeting={ongoingMeeting}
          onDismiss={handleDismissMeeting}
        />
      )}
      <NextMeetingBanner meetings={meetings} notes={allNotes} />
    </>
  );
};

export default MeetingManager; 