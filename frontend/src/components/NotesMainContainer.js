import React, { useState, useEffect } from 'react';

import NotesListByDate from './NotesListByDate.js';
import DateSelectorBar from './DateSelectorBar.js';
import TextEditor from './TextEditor.js'
import InfoPanel from './InfoPanel.js';
import NotesList from './NotesList.js';
import NoteEditor from './NoteEditor.js';
import OngoingMeetingBanner from './OngoingMeetingBanner.js';
import { updateNoteById } from '../utils/ApiUtils';

const checkForOngoingMeeting = (notes) => {
  if (!notes) return null;
  
  const now = new Date();
  
  for (const note of notes) {
    // Skip if the note has been dismissed
    if (note.content.includes('meta_detail::dismissed')) continue;
    
    const lines = note.content.split('\n');
    const meetingTimeStr = lines[1]; // Second line has the meeting time
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
        return {
          id: note.id,
          description: lines[0], // First line has the description
          startTime: meetingTimeStr,
          duration: durationMins
        };
      }
    } catch (error) {
      console.error('Error parsing meeting time:', error);
      continue;
    }
  }
  
  return null;
};

// Helper function to find the next upcoming meeting
const findNextMeeting = (notes) => {
  if (!notes) return null;
  
  const now = new Date();
  let nextMeeting = null;
  let earliestStartTime = null;
  
  for (const note of notes) {
    if (note.content.includes('meta_detail::dismissed')) continue;
    
    const lines = note.content.split('\n');
    const meetingTimeStr = lines[1];
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

const NotesMainContainer = ({ 
    objList, 
    notes, 
    addNote, 
    setNotes, 
    objects, 
    searchQuery, 
    setSearchQuery, 
    addTag, 
    setNoteDate, 
    totals, 
    setTotals,
    settings
}) => {
    const [checked, setChecked] = useState(false);
    const [ongoingMeeting, setOngoingMeeting] = useState(null);

    // Check for ongoing meetings periodically and schedule checks for upcoming meetings
    useEffect(() => {
        let checkInterval;
        let upcomingMeetingTimeout;

        const checkMeetings = () => {
            const meeting = checkForOngoingMeeting(notes);
            setOngoingMeeting(meeting);

            // If no ongoing meeting, check for upcoming meetings
            if (!meeting) {
                const nextMeeting = findNextMeeting(notes);
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

        // Check every 15 seconds
        checkInterval = setInterval(checkMeetings, 15000);

        return () => {
            clearInterval(checkInterval);
            if (upcomingMeetingTimeout) {
                clearTimeout(upcomingMeetingTimeout);
            }
        };
    }, [notes]);

    const handleTagClick = (tag) => {
        setSearchQuery(tag);
    };

    const updateNoteCallback = async (noteId, updatedContent) => {
        await setNotes(noteId, updatedContent);
    };

    const handleDismissMeeting = async () => {
        if (!ongoingMeeting) return;
        
        const note = notes.find(n => n.id === ongoingMeeting.id);
        if (!note) return;
        
        // Add the dismissed tag
        const updatedContent = `${note.content}\nmeta_detail::dismissed`;
        
        try {
            // First update the note in the backend
            await updateNoteById(note.id, updatedContent);
            // Then update the notes state and wait for it to complete
            await setNotes(note.id, updatedContent);
            // Only clear the ongoing meeting state after both updates are complete
            setOngoingMeeting(null);
        } catch (error) {
            console.error('Error dismissing meeting:', error);
        }
    };

    return (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm w-full p-6">
            {ongoingMeeting && (
                <OngoingMeetingBanner 
                    meeting={ongoingMeeting} 
                    onDismiss={handleDismissMeeting}
                />
            )}
            <DateSelectorBar setNoteDate={setNoteDate} defaultCollapsed={true} />
            <NoteEditor
                objList={objList}
                note={{ id: '', content: '' }}
                text=""
                addNote={addNote}
                onSave={(note) => {
                    addNote(note.content);
                }}
                onCancel={() => {
                    console.log("NoteEditor canceled");
                }}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                isAddMode={true}
            />
            <InfoPanel totals={totals} grpbyViewChkd={checked} enableGroupByView={setChecked} />
            {checked ? (
                <NotesListByDate 
                    notes={notes} 
                    searchQuery={searchQuery} 
                    onWordClick={handleTagClick}
                    settings={settings}
                />
            ) : (
                <NotesList 
                    objList={objList} 
                    notes={notes} 
                    addNotes={addNote} 
                    updateNoteCallback={updateNoteCallback}
                    updateTotals={setTotals} 
                    objects={objects} 
                    addObjects={addTag} 
                    searchTerm={searchQuery} 
                    onWordClick={handleTagClick}
                    settings={settings}
                />
            )}
        </div>
    )
};

export default NotesMainContainer;