import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { getAgeInStringFmt } from '../utils/DateUtils';
import { CalendarIcon, ClockIcon, PlusIcon, PencilIcon, EyeIcon, XMarkIcon } from '@heroicons/react/24/outline';
import EditEventModal from './EditEventModal';
import { updateNoteById, deleteNoteById, createNote } from '../utils/ApiUtils';
 
const formatDateString = (date) => {
  // If date is already a string in YYYY-MM-DD format, return it
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  // Convert to Date object if it's a string
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  // Ensure we have a valid Date object
  if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
    console.error('Invalid date:', date);
    return '';
  }

  return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
};

const calculateNextOccurrence = (meetingTime, recurrenceType, selectedDays = [], content = '') => {
  // Ensure meetingTime is a Date object
  const meetingDateObj = meetingTime instanceof Date ? meetingTime : new Date(meetingTime);
  const now = new Date();
  const meetingDate = formatDateString(meetingDateObj);
  const todayStr = formatDateString(now);

  // Extract all acknowledgment dates from meta tags and normalize to YYYY-MM-DD format
  const ackDates = content
    .split('\n')
    .filter(line => line.trim().startsWith('meta::meeting_acknowledge::'))
    .map(line => {
      const dateStr = line.split('::')[2].trim();
      return formatDateString(dateStr);
    });

  // For daily recurrence
  if (recurrenceType.trim() === 'daily') {
    // If today's meeting hasn't been acknowledged, return it
    if (meetingDate === todayStr && !ackDates.includes(todayStr)) {
      return meetingDateObj;
    }

    // Start from tomorrow's date
    let currentDate = new Date(now);
    currentDate.setDate(currentDate.getDate() + 1);
    currentDate.setHours(meetingDateObj.getHours());
    currentDate.setMinutes(meetingDateObj.getMinutes());
    currentDate.setSeconds(meetingDateObj.getSeconds());

    // Find the next unacknowledged date
    while (true) {
      const currentDateStr = formatDateString(currentDate);
      if (!ackDates.includes(currentDateStr)) {
        return currentDate;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }

  // For other recurrence types
  const nextDate = new Date(meetingDateObj);

  // Default to yearly if no recurrence type is specified
  const effectiveRecurrenceType = recurrenceType ? recurrenceType.trim() : 'yearly';

  switch (effectiveRecurrenceType) {
    case 'weekly':
      while (formatDateString(nextDate) <= todayStr || ackDates.includes(formatDateString(nextDate))) {
        nextDate.setDate(nextDate.getDate() + 7);
      }
      break;
    case 'monthly':
      while (formatDateString(nextDate) <= todayStr || ackDates.includes(formatDateString(nextDate))) {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }
      break;
    case 'yearly':
      while (formatDateString(nextDate) <= todayStr || ackDates.includes(formatDateString(nextDate))) {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      }
      break;
    case 'custom':
      if (selectedDays.length === 0) return null;

      const currentDay = now.getDay();
      const meetingDay = meetingDateObj.getDay();

      let nextDay = null;
      let minDiff = Infinity;

      selectedDays.forEach(day => {
        const dayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(day);
        if (dayIndex === -1) return;

        let diff = dayIndex - currentDay;
        if (diff <= 0) diff += 7;

        if (diff < minDiff) {
          minDiff = diff;
          nextDay = dayIndex;
        }
      });

      if (nextDay === null) return null;

      nextDate.setDate(now.getDate() + minDiff);
      nextDate.setHours(meetingDateObj.getHours());
      nextDate.setMinutes(meetingDateObj.getMinutes());

      while (ackDates.includes(formatDateString(nextDate))) {
        nextDate.setDate(nextDate.getDate() + 7);
      }
      break;
    default:
      // Default to yearly if an unknown recurrence type is provided
      while (formatDateString(nextDate) <= todayStr || ackDates.includes(formatDateString(nextDate))) {
        nextDate.setFullYear(nextDate.getFullYear() + 1);
      }
      break;
  }

  return nextDate;
};

const UpcomingEventsAlert = ({ notes, expanded: initialExpanded = true, setNotes }) => {
    const [isExpanded, setIsExpanded] = useState(initialExpanded);
    const [showPopup, setShowPopup] = useState(false);
    const [upcomingEvents, setUpcomingEvents] = useState([]);
    const [showEditEventModal, setShowEditEventModal] = useState(false);
    const [revealedEvents, setRevealedEvents] = useState({});
    const [eventIndicators, setEventIndicators] = useState('');
    const [editingEvent, setEditingEvent] = useState(null);
  
      const handleEditEvent = async (event) => {
    const originalNote = notes.find(n => n.id === event.id);
    if (originalNote) {
      setEditingEvent({
        id: event.id,
        content: originalNote.content
      });
      setShowEditEventModal(true);
    }
  };

  const handlePinEvent = async (event) => {
    try {
      // Get the current events from localStorage
      const stored = localStorage.getItem('tempEvents');
      const currentEvents = stored && stored !== '[]' ? JSON.parse(stored) : [];
      
      // Create a new event object
      const newEvent = {
        id: Date.now(),
        name: event.description,
        date: event.date.toISOString().split('T')[0], // Format as YYYY-MM-DD
        type: 'event',
        bgColor: '#ffffff'
      };
      
      // Add the new event to the existing events
      const updatedEvents = [...currentEvents, newEvent];
      
      // Save back to localStorage
      localStorage.setItem('tempEvents', JSON.stringify(updatedEvents));
      
      // Show success message
      toast.success('Event pinned to EventManager');
    } catch (error) {
      console.error('Error pinning event:', error);
      toast.error('Failed to pin event');
    }
  };
  
    // Add the typewriter animation style
    useEffect(() => {
      const styleSheet = document.createElement('style');
      styleSheet.textContent = `
        @keyframes typewriter {
          0% {
            opacity: 0;
          }
          5% {
            opacity: 1;
          }
          95% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }
        .typewriter-text {
          display: inline-block;
          font-weight: 600;
          color: rgb(239, 68, 68);
        }
        .typewriter-text span {
          display: inline-block;
          opacity: 0;
          animation: typewriter 3s infinite;
        }
        .typewriter-text span:nth-child(1) { animation-delay: 0s; }
        .typewriter-text span:nth-child(2) { animation-delay: 0.1s; }
        .typewriter-text span:nth-child(3) { animation-delay: 0.2s; }
        .typewriter-text span:nth-child(4) { animation-delay: 0.3s; }
        .typewriter-text span:nth-child(5) { animation-delay: 0.4s; }
        .typewriter-text span:nth-child(6) { animation-delay: 0.5s; }
        .typewriter-text span:nth-child(7) { animation-delay: 0.6s; }
        .typewriter-text span:nth-child(8) { animation-delay: 0.7s; }
        .typewriter-text span:nth-child(9) { animation-delay: 0.8s; }
        .typewriter-text span:nth-child(10) { animation-delay: 0.9s; }
        .typewriter-text span:nth-child(11) { animation-delay: 1s; }
        .typewriter-text span:nth-child(12) { animation-delay: 1.1s; }
        .typewriter-text span:nth-child(13) { animation-delay: 1.2s; }
        .typewriter-text span:nth-child(14) { animation-delay: 1.3s; }
        .typewriter-text span:nth-child(15) { animation-delay: 1.4s; }
        .typewriter-text span:nth-child(16) { animation-delay: 1.5s; }
        .typewriter-text span:nth-child(17) { animation-delay: 1.6s; }
        .typewriter-text span:nth-child(18) { animation-delay: 1.7s; }
        .typewriter-text span:nth-child(19) { animation-delay: 1.8s; }
        .typewriter-text span:nth-child(20) { animation-delay: 1.9s; }
      `;
      document.head.appendChild(styleSheet);
      return () => {
        document.head.removeChild(styleSheet);
      };
    }, []);
  
    useEffect(() => {
      const calculateUpcomingEvents = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Start of today
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(today.getDate() + 7);
        sevenDaysFromNow.setHours(23, 59, 59, 999); // End of the day
  
        const eventNotes = notes.filter(note => {
          // Exclude notes that are deadlines
          if (note.content.includes('meta::event_deadline')) return false;
          
          // Check if it's an event
          if (!note.content.includes('meta::event::')) return false;
          
          // Check if it has the deadline tag or purchase tag
          const lines = note.content.split('\n');
          const tagsLine = lines.find(line => line.startsWith('event_tags:'));
          if (tagsLine) {
            const tags = tagsLine.replace('event_tags:', '').trim().split(',').map(tag => tag.trim());
            if (tags.some(tag => tag.toLowerCase() === 'deadline' || tag.toLowerCase() === 'purchase')) return false;
          }
          
          return true;
        });
        const upcoming = [];
        let hasTodayEvent = false;
        let hasTomorrowEvent = false;
        let nextEventDays = null;
  
        eventNotes.forEach(note => {
          const lines = note.content.split('\n');
          const description = lines[0].trim();
          const eventDateLine = lines.find(line => line.startsWith('event_date:'));
          const baseEventDate = eventDateLine ? eventDateLine.replace('event_date:', '').trim() : null;
          if (!baseEventDate) return;
  
          const recurringLine = lines.find(line => line.startsWith('event_recurring_type:'));
          const recurrenceType = recurringLine ? recurringLine.replace('event_recurring_type:', '').trim() : 'yearly';  // Default to yearly if no recurrence type
  
          const locationLine = lines.find(line => line.startsWith('event_location:'));
          const location = locationLine ? locationLine.replace('event_location:', '').trim() : null;
  
          const tagsLine = lines.find(line => line.startsWith('event_tags:'));
          const tags = tagsLine ? tagsLine.replace('event_tags:', '').trim().split(',').map(tag => tag.trim()) : [];
  
          const isHidden = note.content.includes('meta::event_hidden');
  
          try {
            // Calculate next occurrence if it's a recurring event
            const nextOccurrence = calculateNextOccurrence(baseEventDate, recurrenceType, [], note.content);
  
            // If there's no next occurrence or invalid date, don't include the event
            if (!nextOccurrence || !(nextOccurrence instanceof Date)) return;
  
            // Check if event is today or tomorrow
            const eventDate = new Date(nextOccurrence);
            const todayStart = new Date(today);
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date(todayStart);
            todayEnd.setHours(23, 59, 59, 999);
            const sevenDaysFromNow = new Date(todayStart);
            sevenDaysFromNow.setDate(todayStart.getDate() + 7);
            sevenDaysFromNow.setHours(23, 59, 59, 999);
  
            // Debug logging
           
  
            // Check if event is today or tomorrow for indicators
            if (eventDate >= todayStart && eventDate <= todayEnd) {
              hasTodayEvent = true;
            } else if (eventDate >= todayEnd && eventDate <= new Date(todayEnd.getTime() + 24 * 60 * 60 * 1000)) {
              hasTomorrowEvent = true;
            } else if (!nextEventDays || eventDate < new Date(nextEventDays.date)) {
              const diffTime = eventDate - todayStart;
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              if (diffDays > 0) {
                nextEventDays = { date: eventDate, days: diffDays };
              }
            }
  
            // Include events from today and within the next 7 days
            if (eventDate >= todayStart && eventDate <= sevenDaysFromNow) {
              upcoming.push({
                id: note.id,
                date: nextOccurrence,
                originalDate: new Date(baseEventDate),
                description: description.replace('event_description:', '').trim(),
                location,
                isRecurring: !!recurrenceType,
                recurrenceType,
                baseEventDate,
                isHidden,
                tags
              });
            }
          } catch (error) {
            console.error('Error processing event:', error);
          }
        });
  
        // Set event indicators with animation class for today/tomorrow events
        if (hasTodayEvent && hasTomorrowEvent) {
          setEventIndicators('(Events Today & Tomorrow)');
        } else if (hasTodayEvent) {
          setEventIndicators('(Event Today)');
        } else if (hasTomorrowEvent) {
          setEventIndicators('(Event Tomorrow)');
        } else if (nextEventDays) {
          setEventIndicators(`(Next Event in ${nextEventDays.days} days)`);
        } else {
          setEventIndicators('');
        }
  
        // Sort events by date
        upcoming.sort((a, b) => a.date - b.date);
        setUpcomingEvents(upcoming);
      };
  
      calculateUpcomingEvents();
    }, [notes]);
  
    const toggleEventVisibility = (eventId) => {
      setRevealedEvents(prev => ({
        ...prev,
        [eventId]: !prev[eventId]
      }));
    };
  
    const getDaysUntilEvent = (eventDate) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const event = new Date(eventDate);
      event.setHours(0, 0, 0, 0);
      const diffTime = event - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    };
  
    if (upcomingEvents.length === 0) return null;
  
    const renderAnimatedText = (text) => {
      if (!text) return null;
      // Replace spaces with non-breaking spaces to ensure they're preserved in the animation
      const processedText = text.replace(/ /g, '\u00A0');
      return (
        <div className="typewriter-text">
          {processedText.split('').map((char, index) => (
            <span key={index}>{char}</span>
          ))}
        </div>
      );
    };
  
    return (
      <>
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors duration-150 h-[88px] flex items-center" onClick={() => setShowPopup(true)}>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center">
                <CalendarIcon className="h-6 w-6 text-blue-500" />
                <div className="ml-3">
                  <h3 className="text-lg font-semibold text-blue-800">
                    Upcoming Events ({upcomingEvents.length})
                  </h3>
                  {eventIndicators && (
                    <div className="mt-1">
                      {eventIndicators.includes('Today') || eventIndicators.includes('Tomorrow') 
                        ? renderAnimatedText(eventIndicators)
                        : <span className="text-blue-600">{eventIndicators}</span>
                      }
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingEvent(null);
                    setShowEditEventModal(true);
                  }}
                  className="px-3 py-1 text-blue-600 hover:text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors duration-150"
                  title="Add Event"
                >
                  <PlusIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
          {showPopup && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-800">Upcoming Events</h2>
                  <button
                    onClick={() => setShowPopup(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                <div className="space-y-4">
                  {upcomingEvents.length === 0 ? (
                    <div className="p-4 text-gray-500">
                      No events scheduled for the next 7 days.
                    </div>
                  ) : (
                    upcomingEvents.map((event) => {
                      const daysUntil = getDaysUntilEvent(event.date);
                      return (
                        <div 
                          key={event.id}
                          className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-150 flex"
                        >
                          <div className="flex flex-col items-center justify-center min-w-[80px] bg-blue-100 rounded-l-lg -m-4 mr-4">
                            <div className="text-3xl font-bold text-blue-700">
                              {daysUntil}
                            </div>
                            <div className="text-sm text-blue-600 font-medium">
                              {daysUntil === 1 ? 'day' : 'days'}
                            </div>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-lg font-medium text-gray-900">
                                    {event.isHidden && !revealedEvents[event.id] ? 'XXXXXXXXX' : event.description}
                                  </h4>
                                  {event.isHidden && (
                                    <button
                                      onClick={() => toggleEventVisibility(event.id)}
                                      className="text-blue-600 hover:text-blue-800 focus:outline-none"
                                      title={revealedEvents[event.id] ? "Hide description" : "Reveal description"}
                                    >
                                      <EyeIcon className="h-5 w-5" />
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleEditEvent(event)}
                                    className="text-blue-600 hover:text-blue-800 focus:outline-none ml-2"
                                    title="Edit event"
                                  >
                                    <PencilIcon className="h-5 w-5" />
                                  </button>
                                  <button
                                    onClick={() => handlePinEvent(event)}
                                    className="text-green-600 hover:text-green-800 focus:outline-none ml-2"
                                    title="Pin Event"
                                  >
                                    <PlusIcon className="h-5 w-5" />
                                  </button>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                  <CalendarIcon className="h-4 w-4" />
                                  <span>
                                    {event.date.toLocaleDateString('en-US', {
                                      weekday: 'long',
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    })}
                                  </span>
                                </div>
                                {event.isRecurring && event.originalDate && (
                                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                    <ClockIcon className="h-4 w-4" />
                                    <span>
                                      Original date: {event.originalDate.toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                      })} ({getAgeInStringFmt(event.originalDate)})
                                    </span>
                                  </div>
                                )}
                                {event.location && (
                                  <div className="flex items-center gap-1.5 text-sm text-gray-600 mt-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                      <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                                    </svg>
                                    <span>{event.location}</span>
                                  </div>
                                )}
                                {event.isRecurring && (
                                  <div className="flex items-center gap-1.5 text-sm text-gray-600 mt-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                      <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                                    </svg>
                                    <span>{event.recurrenceType.charAt(0).toUpperCase() + event.recurrenceType.slice(1)}</span>
                                  </div>
                                )}
                                {event.tags && event.tags.length > 0 && (
                                  <div className="flex items-center gap-1.5 text-sm text-gray-600 mt-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                      <path fillRule="evenodd" d="M5.25 2.25a3 3 0 00-3 3v4.318a3 3 0 00.879 2.121l9.58 9.581c.92.92 2.39.92 3.31 0l4.318-4.318a3 3 0 000-3.31l-9.58-9.581a3 3 0 00-2.121-.879H5.25zM6.375 7.5a1.125 1.125 0 100-2.25 1.125 1.125 0 000 2.25z" clipRule="evenodd" />
                                    </svg>
                                    <div className="flex flex-wrap gap-1">
                                      {event.tags.map((tag, index) => (
                                        <span key={index} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs">
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
  
        {showEditEventModal && (
          <EditEventModal
            isOpen={showEditEventModal}
            note={editingEvent}
            onSave={async (content) => {
              if (editingEvent) {
                try {
                  // Update existing event
                  const note = notes.find(n => n.id === editingEvent.id);
                  if (note) {
                    // Preserve the original meta tags
                    const originalLines = note.content.split('\n');
                    const metaTags = originalLines.filter(line => 
                      line.startsWith('meta::') && 
                      !line.startsWith('meta::event::')
                    );
                    
                    // Combine new content with preserved meta tags
                    const updatedContent = content + '\n' + metaTags.join('\n');
                    
                    // Update the note in the backend
                    await updateNoteById(editingEvent.id, updatedContent);
                    
                    // Update the note in the local state
                    const updatedNote = { ...note, content: updatedContent };
                    setNotes(notes.map(n => n.id === note.id ? updatedNote : n));
                  }
                } catch (error) {
                  console.error('Error updating event:', error);
                }
              } else {
                // Add new event
                try {
                  const newNote = {
                    id: Date.now().toString(),
                    content: content,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  };
                  await createNote(content);
                  setNotes([...notes, newNote]);
                } catch (error) {
                  console.error('Error creating event:', error);
                }
              }
              setShowEditEventModal(false);
              setEditingEvent(null);
            }}
            onCancel={() => {
              setShowEditEventModal(false);
              setEditingEvent(null);
            }}
            onSwitchToNormalEdit={() => {
              setShowEditEventModal(false);
              setEditingEvent(null);
            }}
            onDelete={async () => {
              if (editingEvent) {
                try {
                  await deleteNoteById(editingEvent.id);
                  setNotes(notes.filter(n => n.id !== editingEvent.id));
                } catch (error) {
                  console.error('Error deleting event:', error);
                }
              }
              setShowEditEventModal(false);
              setEditingEvent(null);
            }}
            notes={notes}
          />
        )}
      </>
    );
  };

  export default UpcomingEventsAlert;