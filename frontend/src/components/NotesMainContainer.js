import React, { useState, useEffect } from 'react';

import NotesListByDate from './NotesListByDate.js';
import DateSelectorBar from './DateSelectorBar.js';
import TextEditor from './TextEditor.js'
import InfoPanel from './InfoPanel.js';
import NotesList from './NotesList.js';
import NoteEditor from './NoteEditor.js';
import OngoingMeetingBanner from './OngoingMeetingBanner.js';

const checkForOngoingMeeting = (notes) => {
  if (!notes) return null;
  
  const now = new Date();
  
  for (const note of notes) {
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

    // Check for ongoing meetings periodically
    useEffect(() => {
        const checkMeetings = () => {
            const meeting = checkForOngoingMeeting(notes);
            setOngoingMeeting(meeting);
        };

        // Initial check
        checkMeetings();

        // Check every minute
        const interval = setInterval(checkMeetings, 60000);

        return () => clearInterval(interval);
    }, [notes]);

    const handleTagClick = (tag) => {
        setSearchQuery(tag);
    };

    const updateNoteCallback = async (noteId, updatedContent) => {
        await setNotes(noteId, updatedContent);
    };

    return (
        <div className="rounded-lg border bg-card text-card-foreground shadow-sm w-full p-6">
            {ongoingMeeting && <OngoingMeetingBanner meeting={ongoingMeeting} />}
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