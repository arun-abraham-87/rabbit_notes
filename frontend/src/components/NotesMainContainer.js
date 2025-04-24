import React, { useState, useEffect, useMemo } from 'react';

import NotesListByDate from './NotesListByDate.js';
import DateSelectorBar from './DateSelectorBar.js';
import TextEditor from './TextEditor.js'
import InfoPanel from './InfoPanel.js';
import NotesList from './NotesList.js';
import NoteEditor from './NoteEditor.js';
import OngoingMeetingBanner from './OngoingMeetingBanner.js';
import NextMeetingBanner from './NextMeetingBanner.js';
import { updateNoteById } from '../utils/ApiUtils';

const checkForOngoingMeeting = (notes) => {
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

// Helper function to find the next upcoming meeting
const findNextMeeting = (notes) => {
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
    const [currentDate, setCurrentDate] = useState(null);

    // Extract meetings from notes
    const meetings = useMemo(() => {
        return notes.flatMap(note => {
            if (note.content.split('\n').some(line => line.trim().startsWith('meta::meeting'))) {
                const lines = note.content.split('\n');
                // Extract duration from meta tag
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
    }, [notes]);

    // Filter notes for display based on selected date, but only if there's no search query
    const filteredNotes = notes.filter(note => {
        if (!currentDate || searchQuery) return true;  // Don't filter by date if there's a search query
        
        const lines = note.content.split('\n');
        
        // Try to find a date in either format
        const isoDateStr = lines.find(line => /^\d{4}-\d{2}-\d{2}/.test(line));
        if (isoDateStr && isoDateStr.startsWith(currentDate)) return true;
        
        // Check for DD/MM/YYYY format
        const ddmmyyyyStr = lines.find(line => /^\d{2}\/\d{2}\/\d{4}/.test(line));
        if (ddmmyyyyStr) {
            const [day, month, year] = ddmmyyyyStr.split('/');
            const isoDate = `${year}-${month}-${day}`;
            return isoDate.startsWith(currentDate);
        }
        
        // Also check created_datetime which is in DD/MM/YYYY format
        if (note.created_datetime) {
            const [datePart] = note.created_datetime.split(',');
            if (datePart) {
                const [day, month, year] = datePart.split('/');
                const isoDate = `${year}-${month}-${day}`;
                return isoDate.startsWith(currentDate);
            }
        }
        
        return false;
    });

    // Handle date selection
    const handleDateChange = (date) => {
        setCurrentDate(date);
        setNoteDate(date);
    };

    // Check for ongoing meetings periodically and schedule checks for upcoming meetings
    useEffect(() => {
        let checkInterval;
        let upcomingMeetingTimeout;

        const checkMeetings = () => {
            // Use all notes for meeting checks, not filtered notes
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
    }, [notes]); // Keep dependency on all notes

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
            await updateNoteById(note.id, updatedContent);
            // Update the notes state to reflect the change
            setNotes(notes.map(n => n.id === note.id ? { ...n, content: updatedContent } : n));
            // Clear the ongoing meeting state
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
            <NextMeetingBanner meetings={meetings} notes={notes} />
            <DateSelectorBar 
                setNoteDate={handleDateChange} 
                defaultCollapsed={true} 
            />
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
                    notes={filteredNotes}
                    searchQuery={searchQuery} 
                    onWordClick={handleTagClick}
                    settings={settings}
                />
            ) : (
                <NotesList 
                    objList={objList} 
                    notes={filteredNotes}
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
    );
};

export default NotesMainContainer;