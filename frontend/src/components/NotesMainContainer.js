import React, { useState, useEffect, useMemo } from 'react';

import NotesListByDate from './NotesListByDate.js';
import DateSelectorBar from './DateSelectorBar.js';
import TextEditor from './TextEditor.js'
import InfoPanel from './InfoPanel.js';
import NotesList from './NotesList.js';
import NoteEditor from './NoteEditor.js';
import OngoingMeetingBanner from './OngoingMeetingBanner.js';
import NextMeetingBanner from './NextMeetingBanner.js';
import UnacknowledgedMeetingsBanner from './UnacknowledgedMeetingsBanner.js';
import { updateNoteById, loadNotes, defaultSettings } from '../utils/ApiUtils';

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

const getUnacknowledgedPastMeetings = (notes) => {
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

const checkForOverdueTodos = (notes) => {
  if (!notes) return 0;
  
  const now = new Date();
  return notes.filter(note => {
    // Check if it's a todo
    if (!note.content.includes('meta::todo::')) return false;
    
    // Check for deadline
    const endDateMatch = note.content.match(/meta::end_date::([^\n]+)/);
    if (endDateMatch) {
      const endDate = new Date(endDateMatch[1]);
      if (endDate < now) return true; // Deadline has passed
    }
    
    // Check for age (older than 2 days)
    const todoDateMatch = note.content.match(/meta::todo::([^\n]+)/);
    if (todoDateMatch) {
      const todoDate = new Date(todoDateMatch[1]);
      const daysOld = (now - todoDate) / (1000 * 60 * 60 * 24);
      return daysOld > 2;
    }
    
    return false;
  }).length;
};

const checkForHighPriorityOverdueTodos = (notes) => {
  if (!notes) return 0;
  
  const now = new Date();
  return notes.filter(note => {
    // Check if it's a high priority todo
    if (!note.content.includes('meta::high')) return false;
    
    // Check for age (older than 2 days)
    const todoDateMatch = note.content.match(/meta::todo::([^\n]+)/);
    if (todoDateMatch) {
      const todoDate = new Date(todoDateMatch[1]);
      const daysOld = (now - todoDate) / (1000 * 60 * 60 * 24);
      return daysOld > 2;
    }
    
    return false;
  }).length;
};

const checkForPassedDeadlineTodos = (notes) => {
  if (!notes) return 0;
  
  const now = new Date();
  return notes.filter(note => {
    if (!note.content.includes('meta::todo::')) return false;
    
    const endDateMatch = note.content.match(/meta::end_date::([^\n]+)/);
    if (endDateMatch) {
      const endDate = new Date(endDateMatch[1]);
      return endDate < now;
    }
    return false;
  }).length;
};

const checkForOldTodos = (notes) => {
  if (!notes) return 0;
  
  const now = new Date();
  return notes.filter(note => {
    if (!note.content.includes('meta::todo::')) return false;
    if (note.content.includes('meta::high')) return false; // Exclude high priority todos
    
    const todoDateMatch = note.content.match(/meta::todo::([^\n]+)/);
    if (todoDateMatch) {
      const todoDate = new Date(todoDateMatch[1]);
      const daysOld = (now - todoDate) / (1000 * 60 * 60 * 24);
      return daysOld > 2;
    }
    return false;
  }).length;
};

const NotesMainContainer = ({ 
    objList = [], 
    notes = [],
    allNotes = [], 
    addNote, 
    setNotes, 
    objects = [], 
    searchQuery = '', 
    setSearchQuery, 
    addTag, 
    setNoteDate, 
    totals = {
        total: 0,
        todos: 0,
        meetings: 0,
        events: 0
    }, 
    setTotals,
    settings = defaultSettings
}) => {
    const [checked, setChecked] = useState(false);
    const [ongoingMeeting, setOngoingMeeting] = useState(null);
    const [currentDate, setCurrentDate] = useState(null);
    const [excludeEvents, setExcludeEvents] = useState(settings?.excludeEventsByDefault || false);
    const [excludeMeetings, setExcludeMeetings] = useState(settings?.excludeMeetingsByDefault || false);
    const [overdueTodosCount, setOverdueTodosCount] = useState(0);
    const [highPriorityOverdueCount, setHighPriorityOverdueCount] = useState(0);
    const [passedDeadlineCount, setPassedDeadlineCount] = useState(0);
    const [oldTodosCount, setOldTodosCount] = useState(0);
    const [alertsExpanded, setAlertsExpanded] = useState(true);

    // Extract meetings from notes with null check
    const meetings = useMemo(() => {
        if (!Array.isArray(allNotes)) return [];
        return allNotes.flatMap(note => {
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
    }, [allNotes]);

    // Filter notes for display based on selected date and exclude states
    const filteredNotes = useMemo(() => {
        const filtered = notes.filter(note => {
            // First apply date filter if needed
            if (currentDate && !searchQuery) {
                const lines = note.content.split('\n');
                const isoDateStr = lines.find(line => /^\d{4}-\d{2}-\d{2}/.test(line));
                if (isoDateStr && !isoDateStr.startsWith(currentDate)) return false;
                
                const ddmmyyyyStr = lines.find(line => /^\d{2}\/\d{2}\/\d{4}/.test(line));
                if (ddmmyyyyStr) {
                    const [day, month, year] = ddmmyyyyStr.split('/');
                    const isoDate = `${year}-${month}-${day}`;
                    if (!isoDate.startsWith(currentDate)) return false;
                }
                
                if (note.created_datetime) {
                    const [datePart] = note.created_datetime.split(',');
                    if (datePart) {
                        const [day, month, year] = datePart.split('/');
                        const isoDate = `${year}-${month}-${day}`;
                        if (!isoDate.startsWith(currentDate)) return false;
                    }
                }
            }

            // Then apply exclude filters
            if (excludeEvents && note.content.includes('meta::event::')) return false;
            if (excludeMeetings && note.content.includes('meta::meeting::')) return false;

            return true;
        });

        return filtered;
    }, [notes, currentDate, searchQuery, excludeEvents, excludeMeetings]);

    // Update totals based on filtered notes
    useEffect(() => {
        const newTotals = {
            total: filteredNotes.length,
            events: filteredNotes.filter(note => note.content.includes('meta::event::')).length,
            meetings: filteredNotes.filter(note => note.content.includes('meta::meeting::')).length,
            todos: filteredNotes.filter(note => note.content.includes('meta::todo::')).length
        };
        setTotals(newTotals);
    }, [filteredNotes, setTotals]);

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
            // Use allNotes for meeting checks, not filtered notes
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

        // Check every 15 seconds
        checkInterval = setInterval(checkMeetings, 15000);

        return () => {
            clearInterval(checkInterval);
            if (upcomingMeetingTimeout) {
                clearTimeout(upcomingMeetingTimeout);
            }
        };
    }, [allNotes]); // Keep dependency on allNotes instead of filtered notes

    // Update overdue todos count when notes change
    useEffect(() => {
        setOverdueTodosCount(checkForOverdueTodos(allNotes));
    }, [allNotes]);

    // Update high priority overdue todos count when notes change
    useEffect(() => {
        setHighPriorityOverdueCount(checkForHighPriorityOverdueTodos(allNotes));
    }, [allNotes]);

    // Update passed deadline todos count when notes change
    useEffect(() => {
        setPassedDeadlineCount(checkForPassedDeadlineTodos(allNotes));
    }, [allNotes]);

    // Update old todos count when notes change
    useEffect(() => {
        setOldTodosCount(checkForOldTodos(allNotes));
    }, [allNotes]);

    const handleTagClick = (tag) => {
        setSearchQuery(tag);
    };

    const updateNoteCallback = async (updatedNotes) => {
        try {
            await setNotes(updatedNotes);
            // Fetch fresh notes to ensure we have the latest data
            const data = await loadNotes(searchQuery, currentDate);
            setNotes(data.notes);
            setTotals(data.totals);
        } catch (error) {
            console.error('Error updating notes:', error);
        }
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

    const unacknowledgedMeetings = useMemo(() => getUnacknowledgedPastMeetings(allNotes), [allNotes]);

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

    return (
        <div className="flex flex-col h-full">
            {/* Alerts Section */}
            {(highPriorityOverdueCount > 0 || passedDeadlineCount > 0 || oldTodosCount > 0) && (
                <div className="mb-4">
                    <div 
                        className="flex items-center justify-between bg-rose-50 p-2 rounded-t-lg cursor-pointer"
                        onClick={() => setAlertsExpanded(!alertsExpanded)}
                    >
                        <div className="flex items-center">
                            <svg className="h-5 w-5 text-rose-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-medium text-rose-800">
                                Alerts ({highPriorityOverdueCount + passedDeadlineCount + oldTodosCount})
                            </span>
                        </div>
                        <button className="text-rose-600 hover:text-rose-800">
                            <svg 
                                className={`h-5 w-5 transform transition-transform ${alertsExpanded ? 'rotate-180' : ''}`} 
                                viewBox="0 0 20 20" 
                                fill="currentColor"
                            >
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                    {alertsExpanded && (
                        <div className="space-y-2">
                            {/* High Priority Overdue Todos Alert */}
                            {highPriorityOverdueCount > 0 && (
                                <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-lg">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0">
                                            <svg className="h-5 w-5 text-rose-400" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="ml-3">
                                            <h3 className="text-sm font-medium text-rose-800">
                                                Urgent: {highPriorityOverdueCount} high priority {highPriorityOverdueCount === 1 ? 'todo' : 'todos'} older than 2 days
                                            </h3>
                                            <div className="mt-2 text-sm text-rose-700">
                                                <ul className="list-disc pl-5 space-y-1">
                                                    {notes
                                                        .filter(note => {
                                                            const content = note.content;
                                                            const hasHighPriority = content.includes('meta::high');
                                                            const hasTodo = content.includes('meta::todo');
                                                            if (!hasHighPriority || !hasTodo) return false;
                                                            
                                                            const dateMatch = content.match(/meta::todo::(\d{4}-\d{2}-\d{2})/);
                                                            if (!dateMatch) return false;
                                                            
                                                            const todoDate = new Date(dateMatch[1]);
                                                            const now = new Date();
                                                            const diffTime = Math.abs(now - todoDate);
                                                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                                            
                                                            return diffDays > 2;
                                                        })
                                                        .slice(0, 1)
                                                        .map(note => (
                                                            <li key={note.id}>
                                                                {note.content.split('\n').filter(line => !line.trim().startsWith('meta::')).join(' ').slice(0, 100)}
                                                                {note.content.length > 100 ? '...' : ''}
                                                            </li>
                                                        ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Passed Deadline Todos Alert */}
                            {passedDeadlineCount > 0 && (
                                <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-lg">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0">
                                            <svg className="h-5 w-5 text-rose-400" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="ml-3">
                                            <h3 className="text-sm font-medium text-rose-800">
                                                Deadline passed: {passedDeadlineCount} {passedDeadlineCount === 1 ? 'todo' : 'todos'} with passed deadlines
                                            </h3>
                                            <div className="mt-2 text-sm text-rose-700">
                                                <ul className="list-disc pl-5 space-y-1">
                                                    {notes
                                                        .filter(note => {
                                                            const content = note.content;
                                                            const hasTodo = content.includes('meta::todo');
                                                            if (!hasTodo) return false;
                                                            
                                                            const dateMatch = content.match(/meta::todo::(\d{4}-\d{2}-\d{2})/);
                                                            if (!dateMatch) return false;
                                                            
                                                            const todoDate = new Date(dateMatch[1]);
                                                            const now = new Date();
                                                            return todoDate < now;
                                                        })
                                                        .slice(0, 1)
                                                        .map(note => (
                                                            <li key={note.id}>
                                                                {note.content.split('\n').filter(line => !line.trim().startsWith('meta::')).join(' ').slice(0, 100)}
                                                                {note.content.length > 100 ? '...' : ''}
                                                            </li>
                                                        ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Old Todos Alert */}
                            {oldTodosCount > 0 && (
                                <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-lg">
                                    <div className="flex items-center">
                                        <div className="flex-shrink-0">
                                            <svg className="h-5 w-5 text-rose-400" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div className="ml-3">
                                            <h3 className="text-sm font-medium text-rose-800">
                                                Attention needed: {oldTodosCount} {oldTodosCount === 1 ? 'todo' : 'todos'} older than 2 days
                                            </h3>
                                            <div className="mt-2 text-sm text-rose-700">
                                                <ul className="list-disc pl-5 space-y-1">
                                                    {notes
                                                        .filter(note => {
                                                            const content = note.content;
                                                            const hasTodo = content.includes('meta::todo');
                                                            const hasHighPriority = content.includes('meta::high');
                                                            if (!hasTodo || hasHighPriority) return false;
                                                            
                                                            const dateMatch = content.match(/meta::todo::(\d{4}-\d{2}-\d{2})/);
                                                            if (!dateMatch) return false;
                                                            
                                                            const todoDate = new Date(dateMatch[1]);
                                                            const now = new Date();
                                                            const diffTime = Math.abs(now - todoDate);
                                                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                                            
                                                            return diffDays > 2;
                                                        })
                                                        .slice(0, 1)
                                                        .map(note => (
                                                            <li key={note.id}>
                                                                {note.content.split('\n').filter(line => !line.trim().startsWith('meta::')).join(' ').slice(0, 100)}
                                                                {note.content.length > 100 ? '...' : ''}
                                                            </li>
                                                        ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm w-full p-6">
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
                <div className="mt-4">
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
                        settings={settings}
                        onExcludeEventsChange={setExcludeEvents}
                        onExcludeMeetingsChange={setExcludeMeetings}
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
                            allNotes={allNotes}
                            addNotes={addNote}
                            updateNoteCallback={updateNoteCallback}
                            updateTotals={setTotals}
                            objects={objects}
                            addObjects={addTag}
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            onWordClick={handleTagClick}
                            settings={settings}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotesMainContainer;