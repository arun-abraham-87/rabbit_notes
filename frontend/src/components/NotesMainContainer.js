import React, { useState, useEffect, useMemo } from 'react';

import NotesListByDate from './NotesListByDate.js';
import InfoPanel from './InfoPanel.js';
import NotesList from './NotesList.js';
import NoteEditor from './NoteEditor.js';
import MeetingManager from './MeetingManager.js';
import WatchList from './WatchList';
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

const filterNotes = (notes, searchQuery, showDeadlinePassedFilter) => {
  if (!notes) return [];
  
  const now = new Date();
  return notes.filter(note => {
    // If no search query, only show notes from current day
    if (!searchQuery || searchQuery.trim() === '') {
      // Check if note is from current day
      const lines = note.content.split('\n');
      const isoDateStr = lines.find(line => /^\d{4}-\d{2}-\d{2}/.test(line));
      const ddmmyyyyStr = lines.find(line => /^\d{2}\/\d{2}\/\d{4}/.test(line));
      const createdDate = note.created_datetime ? note.created_datetime.split(',')[0] : null;
      
      const today = new Date();
      const noteDate = isoDateStr || ddmmyyyyStr || createdDate;
      
      if (!noteDate) return true; // If no date found, show the note
      
      // Convert to YYYY-MM-DD format for comparison
      let noteDateFormatted;
      if (isoDateStr) {
        noteDateFormatted = isoDateStr.split('T')[0];
      } else if (ddmmyyyyStr) {
        const [day, month, year] = ddmmyyyyStr.split('/');
        noteDateFormatted = `${year}-${month}-${day}`;
      } else if (createdDate) {
        const [day, month, year] = createdDate.split('/');
        noteDateFormatted = `${year}-${month}-${day}`;
      }
      
      const todayFormatted = today.toISOString().split('T')[0];
      const isFromToday = noteDateFormatted === todayFormatted;
      
      // Only apply deadline passed filter if needed
      if (showDeadlinePassedFilter) {
        const endDateMatch = note.content.match(/meta::end_date::([^\n]+)/);
        if (!endDateMatch) return false;
        
        const endDate = new Date(endDateMatch[1]);
        endDate.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        
        return endDate < today;
      }
      
      return isFromToday;
    }

    // If search query exists, search across all dates
    const content = note.content.toLowerCase();
    const searchTerm = searchQuery.toLowerCase().trim();
    
    // Check if the search term matches in any of these fields
    const contentMatch = content.includes(searchTerm);
    const tagsMatch = note.tags && note.tags.some(tag => 
      tag.toLowerCase().includes(searchTerm)
    );
    const eventMatch = note.event_description && 
      note.event_description.toLowerCase().includes(searchTerm);
    
    const matchesSearch = contentMatch || tagsMatch || eventMatch;
    
    if (!matchesSearch) return false;

    // Check for deadline passed filter
    if (showDeadlinePassedFilter) {
      const endDateMatch = content.match(/meta::end_date::([^\n]+)/);
      if (!endDateMatch) return false;
      
      const endDate = new Date(endDateMatch[1]);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      
      return endDate < today;
    }

    return true;
  });
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
    settings = defaultSettings,
    activePage = 'notes'
}) => {
    const [checked, setChecked] = useState(false);
    const [compressedView, setCompressedView] = useState(false);
    const [currentDate, setCurrentDate] = useState(null);
    const [excludeEvents, setExcludeEvents] = useState(settings?.excludeEventsByDefault || false);
    const [excludeMeetings, setExcludeMeetings] = useState(settings?.excludeMeetingsByDefault || false);
    const [overdueTodosCount, setOverdueTodosCount] = useState(0);
    const [highPriorityOverdueCount, setHighPriorityOverdueCount] = useState(0);
    const [passedDeadlineCount, setPassedDeadlineCount] = useState(0);
    const [oldTodosCount, setOldTodosCount] = useState(0);
    const [alertsExpanded, setAlertsExpanded] = useState(false);
    const [showDeadlinePassedFilter, setShowDeadlinePassedFilter] = useState(false);
    const [eventsState, setEventsState] = useState([]);

    // Extract events from notes with proper metadata
    const events = useMemo(() => {
        if (!Array.isArray(allNotes)) return [];
        const processedEvents = allNotes
            .filter(note => {
                if (!note?.content) return false;
                return note.content.includes('meta::event::') && !note.content.includes('meta::archived::');
            })
            .map(note => {
                const lines = note.content.split('\n');
                
                // Extract date from event_date line
                const dateLine = lines.find(line => line.startsWith('event_date:'));
                let eventDate = null;
                if (dateLine) {
                    const dateStr = dateLine.split('event_date:')[1];
                    eventDate = new Date(dateStr);
                }
                
                // Extract description from event_description line
                const descLine = lines.find(line => line.startsWith('event_description:'));
                const description = descLine ? descLine.split('event_description:')[1] : lines[0] || '';
                
                // Determine recurrence type from event_recurring_type line
                const recurLine = lines.find(line => line.startsWith('event_recurring_type:'));
                let recurrence = 'none';
                if (recurLine) {
                    const recurType = recurLine.split('event_recurring_type:')[1].trim();
                    if (recurType === 'daily') recurrence = 'daily';
                    else if (recurType === 'weekly') recurrence = 'weekly';
                    else if (recurType === 'monthly') recurrence = 'monthly';
                    else if (recurType === 'yearly') recurrence = 'yearly';
                }
                
                return {
                    id: note.id,
                    content: note.content,
                    dateTime: eventDate,
                    description: description,
                    recurrence: recurrence
                };
            });
        
        return processedEvents;
    }, [allNotes]);

    // Update eventsState when events change
    useEffect(() => {
        setEventsState(events);
    }, [events]);

    // Add debug logging
    useEffect(() => {
        const unacknowledged = events.filter(event => {
            const now = new Date();
            const april2025 = new Date('2025-04-01');
            const eventDate = new Date(event.dateTime);
            const year = eventDate.getFullYear();
            const metaTag = `meta::acknowledged::${year}`;
            
            return eventDate >= april2025 && 
                   eventDate < now && 
                   !event.content.includes(metaTag);
        });
    }, [events]);

    // Filter notes for display based on selected date and exclude states
    const filteredNotes = useMemo(() => {
      console.log('Filtered notes n:',notes.length);
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
                    const [day, month, year] = datePart.split('/');
                    const isoDate = `${year}-${month}-${day}`;
                    if (!isoDate.startsWith(currentDate)) return false;
                }
            }

            // Then apply exclude filters
            if (excludeEvents && note.content.includes('meta::event::')) return false;
            if (excludeMeetings && note.content.includes('meta::meeting::')) return false;

            // Check for end date and deadline passed filters
            const endDateMatch = note.content.match(/meta::end_date::([^\n]+)/);
            if (endDateMatch) {
                const endDate = new Date(endDateMatch[1]);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                endDate.setHours(0, 0, 0, 0);

                // If deadline passed filter is active, only show passed deadlines
                if (showDeadlinePassedFilter) {
                    return endDate < today;
                }
                // If only end date filter is active, show all notes with end dates
                return true;
            }

            // If end date filter is active but note doesn't have an end date, hide it
            if (searchQuery.includes('meta::end_date::')) {
                return false;
            }

            return true;
        });
        console.log('Filtered notes:', filtered.lengthf);
        return filtered;
    }, [notes, currentDate, searchQuery, excludeEvents, excludeMeetings, showDeadlinePassedFilter]);

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

    // Handle event acknowledgment
    const handleAcknowledgeEvent = async (noteId, year) => {
        const note = allNotes.find(n => n.id === noteId);
        if (!note) return;
        
        // Check if already acknowledged
        const metaTag = `meta::acknowledged::${year}`;
        if (note.content.includes(metaTag)) return;
        
        // Add the acknowledged tag with year
        const updatedContent = `${note.content.trim()}\n${metaTag}`;
        
        try {
            const response = await updateNoteById(noteId, updatedContent);
            if (response && response.success) {
                // Update the notes state to reflect the change
                const updatedNotes = allNotes.map(n => 
                    n.id === noteId ? { ...n, content: updatedContent } : n
                );
                
                // Update both allNotes and notes state
                setNotes(updatedNotes);
                
                // Force a refresh of the events by updating allNotes
                const data = await loadNotes(searchQuery, currentDate);
                if (data && data.notes) {
                    setNotes(data.notes);
                    setTotals(data.totals);
                    
                    // Force update events state
                    const updatedEvents = eventsState.filter(event => event.id !== noteId);
                    setEventsState(updatedEvents);
                }
            } else {
                console.error('Failed to acknowledge event:', response);
            }
        } catch (error) {
            console.error('Error acknowledging event:', error);
        }
    };

    // Build workstream and people suggestions from allNotes
    const workstreamSuggestions = useMemo(() =>
      (allNotes || [])
        .filter(note => note.content.includes('meta::workstream'))
        .map(note => ({
          type: 'workstream',
          id: note.id,
          text: note.content.split('\n')[0]
        })),
      [allNotes]
    );
    const peopleSuggestions = useMemo(() =>
      (allNotes || [])
        .filter(note => note.content.includes('meta::person::'))
        .map(note => ({
          type: 'person',
          id: note.id,
          text: note.content.split('\n')[0]
        })),
      [allNotes]
    );
    const mergedObjList = useMemo(() => [
      ...(objList || []),
      ...workstreamSuggestions,
      ...peopleSuggestions
    ], [objList, workstreamSuggestions, peopleSuggestions]);

    return (
        <div className="flex flex-col h-full">
            <div className="rounded-lg border bg-card text-card-foreground shadow-sm w-full p-6">
                <MeetingManager 
                    allNotes={allNotes}
                    setNotes={setNotes}
                    searchQuery={searchQuery}
                    currentDate={currentDate}
                />
                <div className="mt-4">
                    {activePage === 'watch' ? (
                        <WatchList allNotes={allNotes} />
                    ) : (
                        <>
                            <NoteEditor
                                objList={mergedObjList}
                                note={{ id: '', content: '' }}
                                text=""
                                addNote={addNote}
                                onSave={(note) => {
                                    addNote(note.content);
                                }}
                                onCancel={() => {}}
                                searchQuery={searchQuery}
                                setSearchQuery={setSearchQuery}
                                isAddMode={true}
                                settings={settings}
                                onExcludeEventsChange={setExcludeEvents}
                                onExcludeMeetingsChange={setExcludeMeetings}
                                onDeadlinePassedChange={setShowDeadlinePassedFilter}
                            />
                            <InfoPanel 
                                totals={totals} 
                                grpbyViewChkd={checked} 
                                enableGroupByView={setChecked}
                                compressedView={compressedView}
                                setCompressedView={setCompressedView}
                            />
                            {checked ? (
                                <NotesListByDate
                                    notes={filteredNotes}
                                    searchQuery={searchQuery}
                                    onWordClick={handleTagClick}
                                    settings={settings}
                                />
                            ) : (
                                <NotesList
                                    objList={mergedObjList}
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
                                    compressedView={compressedView}
                                />
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotesMainContainer;