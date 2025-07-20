import React, { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/solid';
import { getAgeInStringFmt } from '../utils/DateUtils';
import Countdown from './Countdown';

const EventManager = ({ selectedDate, onClose, type = 'all', notes, setActivePage, onEditEvent }) => {
  const [events, setEvents] = useState(() => {
    try {
      const stored = localStorage.getItem('tempEvents');
      if (stored && stored !== '[]') {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.error('Error loading initial events:', error);
    }
    return [];
  });

  const [displayMode, setDisplayMode] = useState(() => {
    try {
      const stored = localStorage.getItem('eventDisplayMode');
      return stored || 'days';
    } catch (error) {
      console.error('Error loading display mode:', error);
      return 'days';
    }
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  
  // Format date to YYYY-MM-DD without timezone conversion
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [eventForm, setEventForm] = useState({ 
    name: '', 
    date: selectedDate ? formatDate(selectedDate) : '', 
    endDate: '',
    type: 'event', // Add type field with default value 'event'
    bgColor: '#ffffff' // Default background color
  });

  // Helper function to extract event details from note content
  const getEventDetails = (content) => {
    const lines = content.split('\n');
    
    // Find the description
    const descriptionLine = lines.find(line => line.startsWith('event_description:'));
    const description = descriptionLine ? descriptionLine.replace('event_description:', '').trim() : '';
    
    // Find the event date
    const eventDateLine = lines.find(line => line.startsWith('event_date:'));
    const dateTime = eventDateLine ? eventDateLine.replace('event_date:', '').trim() : '';
    
    // Find tags
    const tagsLine = lines.find(line => line.startsWith('event_tags:'));
    const tags = tagsLine ? tagsLine.replace('event_tags:', '').trim().split(',').map(tag => tag.trim()) : [];
    
    // Check if it's a deadline
    const isDeadline = tags.some(tag => tag.toLowerCase() === 'deadline') || 
                      content.includes('meta::event_deadline') ||
                      content.includes('meta::deadline');

    return {
      description,
      dateTime,
      tags,
      isDeadline
    };
  };

  // Helper function to calculate next occurrence for recurring events
  const calculateNextOccurrence = (originalDate) => {
    if (!originalDate) return null;
    
    const eventDate = new Date(originalDate);
    const now = new Date();
    const currentYear = now.getFullYear();
    
    // Create a new date with current year
    const nextOccurrence = new Date(eventDate);
    nextOccurrence.setFullYear(currentYear);
    
    // If the date has already passed this year, use next year
    if (nextOccurrence < now) {
      nextOccurrence.setFullYear(currentYear + 1);
    }
    
    return nextOccurrence;
  };

  // Get top 10 event notes
  const getEventNotes = () => {
    if (!notes) return [];
    
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Zero out time for accurate comparison
    
    // Load stored background colors for event notes
    let storedColors = {};
    try {
      const stored = localStorage.getItem('eventNoteColors');
      if (stored) {
        storedColors = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading event note colors:', error);
    }
    
    return notes
      .filter(note => {
        if (!note?.content) return false;
        
        // Only include notes with meta::event
        if (!note.content.includes('meta::event')) return false;
        
        // Exclude notes with "purchase" tag
        const content = note.content.toLowerCase();
        if (content.includes('purchase')) return false;
        
        return true;
      })
      .map(note => {
        const details = getEventDetails(note.content);
        
        // Set default background color based on whether it's a deadline
        let defaultColor = '#ffffff'; // white
        if (details.isDeadline) {
          defaultColor = '#f3e8ff'; // purple for deadlines
        }
        
        return {
          ...note,
          ...details,
          bgColor: storedColors[note.id] || defaultColor // Load stored color or use default
        };
      })
      .filter(event => {
        if (!event.dateTime) return false; // Only include events with valid dates
        
        // Calculate next occurrence for recurring events
        const nextOccurrence = calculateNextOccurrence(event.dateTime);
        if (!nextOccurrence) return false;
        
        // Calculate days until event using the next occurrence
        nextOccurrence.setHours(0, 0, 0, 0);
        const daysUntilEvent = Math.ceil((nextOccurrence - now) / (1000 * 60 * 60 * 24));
        
        // Only show events with 0 or positive days until event
        return daysUntilEvent >= 0;
      })
      .map(event => {
        // Calculate next occurrence and add it to the event object
        const nextOccurrence = calculateNextOccurrence(event.dateTime);
        return {
          ...event,
          nextOccurrence: nextOccurrence
        };
      })
      .sort((a, b) => {
        const daysA = Math.ceil((a.nextOccurrence - now) / (1000 * 60 * 60 * 24));
        const daysB = Math.ceil((b.nextOccurrence - now) / (1000 * 60 * 60 * 24));
        return daysA - daysB; // Sort by days until event (ascending)
      })
      .slice(0, 10); // Get top 10
  };

  // Update eventForm when selectedDate changes
  useEffect(() => {
    if (selectedDate) {
      setEventForm(prev => ({
        ...prev,
        date: formatDate(selectedDate)
      }));
    }
  }, [selectedDate]);

  // Save events to localStorage when changed
  useEffect(() => {
    if (events.length > 0) {
      try {
        localStorage.setItem('tempEvents', JSON.stringify(events));
      } catch (error) {
        console.error('Error saving events to localStorage:', error);
      }
    }
  }, [events]);

  // Listen for add event from Dashboard
  useEffect(() => {
    const handleAddEvent = () => {
      setEventForm({
        name: '',
        date: selectedDate ? formatDate(selectedDate) : formatDate(new Date()),
        endDate: '',
        type: 'event',
        bgColor: '#ffffff'
      });
      setIsEditMode(false);
      setIsModalOpen(true);
    };

    document.addEventListener('addEvent', handleAddEvent);
    return () => {
      document.removeEventListener('addEvent', handleAddEvent);
    };
  }, [selectedDate]);

  const handleEventInput = (e) => {
    const { name, value } = e.target;
    setEventForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEventSubmit = (e) => {
    e.preventDefault();
    if (!eventForm.name || (eventForm.type === 'event' && !eventForm.date)) return;
    
    if (isEditMode && eventForm.id) {
      // Update existing event/note
      setEvents(prev => prev.map(ev => ev.id === eventForm.id ? { ...eventForm } : ev));
    } else {
      // Add new event/note
      const newEvent = {
        id: Date.now(),
        ...eventForm
      };
      setEvents(prev => [...prev, newEvent]);
    }
    // Reset form and close modal
    setEventForm({ name: '', date: '', endDate: '', type: 'event', bgColor: '#ffffff' });
    setIsModalOpen(false);
    setIsEditMode(false);
  };

  const handleEditEvent = (event) => {
    setEventForm(event);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleDeleteEvent = (id) => {
    setPendingDeleteId(id);
  };

  const confirmDelete = () => {
    setEvents(prev => {
      const updatedEvents = prev.filter(ev => ev.id !== pendingDeleteId);
      try {
        localStorage.setItem('tempEvents', JSON.stringify(updatedEvents));
      } catch (error) {
        console.error('Error saving events to localStorage:', error);
      }
      return updatedEvents;
    });
    setPendingDeleteId(null);
  };

  const cancelDelete = () => {
    setPendingDeleteId(null);
  };

  const toggleDisplayMode = () => {
    const modes = ['days', 'weeks', 'months', 'years'];
    const currentIndex = modes.indexOf(displayMode);
    const newIndex = (currentIndex + 1) % modes.length;
    const newMode = modes[newIndex];
    setDisplayMode(newMode);
    try {
      localStorage.setItem('eventDisplayMode', newMode);
    } catch (error) {
      console.error('Error saving display mode:', error);
    }
  };

  const handleCloseModal = () => {
    setEventForm({ name: '', date: '', endDate: '', type: 'event', bgColor: '#ffffff' });
    setIsModalOpen(false);
    setIsEditMode(false);
    if (onClose) {
      onClose();
    }
  };

  const handleColorChange = (eventId, newColor) => {
    // Handle color changes for local events
    setEvents(prev => prev.map(ev => 
      ev.id === eventId ? { ...ev, bgColor: newColor } : ev
    ));
    
    // Handle color changes for event notes (from notes array)
    // Store the color preference in localStorage
    try {
      const storedColors = localStorage.getItem('eventNoteColors') || '{}';
      const colorMap = JSON.parse(storedColors);
      colorMap[eventId] = newColor;
      localStorage.setItem('eventNoteColors', JSON.stringify(colorMap));
    } catch (error) {
      console.error('Error saving event note color:', error);
    }
  };

  const colorOptions = [
    '#ffffff', // white
    '#fef9c3', // yellow
    '#d1fae5', // green
    '#e0e7ff', // blue
    '#fee2e2', // red
    '#f3e8ff', // purple (for deadlines)
    '#ff6b6b', // reddish
    '#f1f5f9'  // gray
  ];

    return (
    <div className="flex flex-row gap-3 items-stretch">
      {/* Events */}
      {(type === 'all' || type === 'events') && (() => {
        const eventItems = events.filter(ev => ev.type === 'event');
        const sortedEvents = eventItems.sort((a, b) => {
          const dateA = new Date(a.date + 'T00:00');
          const dateB = new Date(b.date + 'T00:00');
          const now = new Date();
          const daysA = Math.ceil((dateA - now) / (1000 * 60 * 60 * 24));
          const daysB = Math.ceil((dateB - now) / (1000 * 60 * 60 * 24));
          return Math.abs(daysA) - Math.abs(daysB);
        });

        return sortedEvents.map(ev => {
            const eventDate = new Date(ev.date + 'T' + (ev.start || '00:00'));
            const now = new Date();
            // Zero out time for accurate day diff
            now.setHours(0, 0, 0, 0);
            eventDate.setHours(0, 0, 0, 0);
            const totalDays = Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24));
            const age = getAgeInStringFmt(eventDate);
            
            let timeLeft, timeUnit, displayText;
            switch (displayMode) {
              case 'weeks':
                const weeks = Math.floor(totalDays / 7);
                const remainingDays = totalDays % 7;
                timeLeft = weeks;
                timeUnit = 'weeks';
                displayText = weeks > 0 ? `${weeks} week${weeks !== 1 ? 's' : ''}${remainingDays > 0 ? ` ${remainingDays} day${remainingDays !== 1 ? 's' : ''}` : ''}` : `${remainingDays} day${remainingDays !== 1 ? 's' : ''}`;
                break;
              case 'months':
                const months = Math.floor(totalDays / 30.44);
                const remainingDaysInMonth = Math.floor(totalDays % 30.44);
                timeLeft = months;
                timeUnit = 'months';
                displayText = months > 0 ? `${months} month${months !== 1 ? 's' : ''}${remainingDaysInMonth > 0 ? ` ${remainingDaysInMonth} day${remainingDaysInMonth !== 1 ? 's' : ''}` : ''}` : `${remainingDaysInMonth} day${remainingDaysInMonth !== 1 ? 's' : ''}`;
                break;
              case 'years':
                const years = Math.floor(totalDays / 365.25);
                const remainingDaysInYear = Math.floor(totalDays % 365.25);
                const monthsInYear = Math.floor(remainingDaysInYear / 30.44);
                timeLeft = years;
                timeUnit = 'years';
                if (years > 0) {
                  displayText = `${years} year${years !== 1 ? 's' : ''}${monthsInYear > 0 ? ` ${monthsInYear} month${monthsInYear !== 1 ? 's' : ''}` : ''}`;
                } else {
                  displayText = monthsInYear > 0 ? `${monthsInYear} month${monthsInYear !== 1 ? 's' : ''}` : `${remainingDaysInYear} day${remainingDaysInYear !== 1 ? 's' : ''}`;
                }
                break;
              default:
                timeLeft = totalDays;
                timeUnit = 'days';
                displayText = `${totalDays} day${totalDays !== 1 ? 's' : ''}`;
            }
            
            return (
              <div 
                key={ev.id} 
                className="group flex flex-col items-start border border-gray-200 rounded-lg shadow-sm px-4 py-3 min-w-[220px] max-w-xs h-40 cursor-pointer hover:shadow-md transition-shadow" 
                style={{ backgroundColor: ev.bgColor || '#ffffff' }}
                onClick={toggleDisplayMode}
                title={`Click to cycle through days, weeks, months, years (currently showing ${timeUnit})`}
              >
                <div className="text-2xl font-bold text-gray-600">{displayText}</div>
                <div className="text-sm text-gray-500">until</div>
                <div className="font-medium text-gray-900 w-full break-words leading-relaxed" style={{ wordBreak: 'break-word', lineHeight: '1.6' }}>{ev.name}</div>
                <div className="text-sm text-gray-500">on {new Date(ev.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</div>
                {ev.endDate && (
                  <div className="text-xs text-gray-500 mt-1">to {new Date(ev.endDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                )}
                <div className="flex gap-2 mt-2 self-end opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Color Options */}
                  <div className="flex gap-1 mr-2">
                    {colorOptions.map(color => (
                      <button
                        key={color}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleColorChange(ev.id, color);
                        }}
                        className={`w-5 h-5 rounded-full border-2 transition-all hover:scale-110 ${ev.bgColor === color ? 'border-gray-700' : 'border-gray-300'}`}
                        style={{ backgroundColor: color }}
                        title={`Set color to ${color}`}
                      />
                    ))}
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditEvent(ev);
                    }} 
                    className="text-blue-500 hover:text-blue-700 p-1"
                    title="Edit"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteEvent(ev.id);
                    }} 
                    className="text-red-500 hover:text-red-700 p-1"
                    title="Delete"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          });
        })()}

        {/* Note Cards */}
        {(type === 'all' || type === 'notes') && (() => {
          const noteItems = events.filter(ev => ev.type === 'note');
          
          // Meeting Countdown Card (only show when type is 'notes')
          const meetingCountdownCard = type === 'notes' ? (
            <div key="meeting-countdown" className="min-w-[220px] max-w-xs h-40">
              <Countdown />
            </div>
          ) : null;
          
          const allCards = [];
          if (meetingCountdownCard) {
            allCards.push(meetingCountdownCard);
          }
          allCards.push(...noteItems.map(ev => {
            const [header, ...bodyLines] = (ev.name || '').split('\n');
            return (
              <div key={ev.id} className="group flex flex-col items-start border border-gray-200 rounded-lg shadow-sm px-4 py-3 min-w-[220px] max-w-xs h-40" style={{ backgroundColor: ev.bgColor || '#ffffff' }}>
                <div className="font-bold text-gray-900 w-full break-words" style={{ wordBreak: 'break-word' }}>
                  {header}
                </div>
                {bodyLines.length > 0 && (
                  <div className="text-sm text-gray-700 w-full break-words whitespace-pre-line mt-1" style={{ wordBreak: 'break-word' }}>
                    {bodyLines.join('\n')}
                  </div>
                )}
                <div className="flex gap-2 mt-2 self-end opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Color Options */}
                  <div className="flex gap-1 mr-2">
                    {colorOptions.map(color => (
                      <button
                        key={color}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleColorChange(ev.id, color);
                        }}
                        className={`w-5 h-5 rounded-full border-2 transition-all hover:scale-110 ${ev.bgColor === color ? 'border-gray-700' : 'border-gray-300'}`}
                        style={{ backgroundColor: color }}
                        title={`Set color to ${color}`}
                      />
                    ))}
                  </div>
                  <button 
                    onClick={() => handleEditEvent(ev)} 
                    className="text-blue-500 hover:text-blue-700 p-1"
                    title="Edit"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteEvent(ev.id)} 
                    className="text-red-500 hover:text-red-700 p-1"
                    title="Delete"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          }));
          return allCards;
        })()}

        {/* Event Notes - Third Line */}
        {(type === 'all' || type === 'eventNotes') && (() => {
          const eventNotes = getEventNotes();
          
          return eventNotes.map(note => {
            // Use the calculated next occurrence instead of the original date
            const eventDate = note.nextOccurrence ? new Date(note.nextOccurrence) : new Date(note.dateTime);
            const now = new Date();
            // Zero out time for accurate day diff
            now.setHours(0, 0, 0, 0);
            eventDate.setHours(0, 0, 0, 0);
            const totalDays = Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24));
            
            let timeLeft, timeUnit, displayText;
            switch (displayMode) {
              case 'weeks':
                const weeks = Math.floor(totalDays / 7);
                const remainingDays = totalDays % 7;
                timeLeft = weeks;
                timeUnit = 'weeks';
                displayText = weeks > 0 ? `${weeks} week${weeks !== 1 ? 's' : ''}${remainingDays > 0 ? ` ${remainingDays} day${remainingDays !== 1 ? 's' : ''}` : ''}` : `${remainingDays} day${remainingDays !== 1 ? 's' : ''}`;
                break;
              case 'months':
                const months = Math.floor(totalDays / 30.44);
                const remainingDaysInMonth = Math.floor(totalDays % 30.44);
                timeLeft = months;
                timeUnit = 'months';
                displayText = months > 0 ? `${months} month${months !== 1 ? 's' : ''}${remainingDaysInMonth > 0 ? ` ${remainingDaysInMonth} day${remainingDaysInMonth !== 1 ? 's' : ''}` : ''}` : `${remainingDaysInMonth} day${remainingDaysInMonth !== 1 ? 's' : ''}`;
                break;
              case 'years':
                const years = Math.floor(totalDays / 365.25);
                const remainingDaysInYear = Math.floor(totalDays % 365.25);
                const monthsInYear = Math.floor(remainingDaysInYear / 30.44);
                timeLeft = years;
                timeUnit = 'years';
                if (years > 0) {
                  displayText = `${years} year${years !== 1 ? 's' : ''}${monthsInYear > 0 ? ` ${monthsInYear} month${monthsInYear !== 1 ? 's' : ''}` : ''}`;
                } else {
                  displayText = monthsInYear > 0 ? `${monthsInYear} month${monthsInYear !== 1 ? 's' : ''}` : `${remainingDaysInYear} day${remainingDaysInYear !== 1 ? 's' : ''}`;
                }
                break;
              default:
                timeLeft = totalDays;
                timeUnit = 'days';
                displayText = `${totalDays} day${totalDays !== 1 ? 's' : ''}`;
            }
            
            return (
              <div 
                key={note.id} 
                className="group flex flex-col items-start border border-gray-200 rounded-lg shadow-sm px-4 py-3 min-w-[220px] max-w-xs h-40 cursor-pointer hover:shadow-md transition-shadow" 
                style={{ backgroundColor: note.bgColor || '#ffffff' }}
                onClick={toggleDisplayMode}
                title={`Click to cycle through days, weeks, months, years (currently showing ${timeUnit})`}
              >
                <div className={`text-2xl font-bold ${note.bgColor === '#f3e8ff' ? 'text-purple-800' : 'text-gray-600'}`}>{displayText}</div>
                <div className={`text-sm ${note.bgColor === '#f3e8ff' ? 'text-purple-600' : 'text-gray-500'}`}>until</div>
                <div className={`font-medium w-full break-words leading-relaxed ${note.bgColor === '#f3e8ff' ? 'text-purple-900' : 'text-gray-900'}`} style={{ wordBreak: 'break-word', lineHeight: '1.6' }}>{note.description}</div>
                <div className={`text-sm ${note.bgColor === '#f3e8ff' ? 'text-purple-600' : 'text-gray-500'}`}>on {eventDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</div>
                <div className="flex gap-2 mt-2 self-end opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Color Options */}
                  <div className="flex gap-1 mr-2">
                    {colorOptions.map(color => (
                      <button
                        key={color}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleColorChange(note.id, color);
                        }}
                        className={`w-5 h-5 rounded-full border-2 transition-all hover:scale-110 ${(note.bgColor || '#ffffff') === color ? 'border-gray-700' : 'border-gray-300'}`}
                        style={{ backgroundColor: color }}
                        title={`Set color to ${color}`}
                      />
                    ))}
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onEditEvent) {
                        onEditEvent(note);
                      }
                    }} 
                    className="text-blue-500 hover:text-blue-700 p-1"
                    title="Edit Event"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          });
        })()}


      {/* Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
            <h2 className="text-lg font-semibold mb-4">{isEditMode ? 'Edit Event' : 'Add Event'}</h2>
            <form onSubmit={handleEventSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    className={`px-3 py-1 rounded-md border ${eventForm.type === 'event' ? 'bg-gray-700 text-white border-gray-700' : 'bg-white text-gray-700 border-gray-300'}`}
                    onClick={() => setEventForm(prev => ({ ...prev, type: 'event' }))}
                  >
                    Event
                  </button>
                  <button
                    type="button"
                    className={`px-3 py-1 rounded-md border ${eventForm.type === 'note' ? 'bg-gray-700 text-white border-gray-700' : 'bg-white text-gray-700 border-gray-300'}`}
                    onClick={() => setEventForm(prev => ({ ...prev, type: 'note' }))}
                  >
                    Note Card
                  </button>
                </div>
              </div>
              {eventForm.type === 'note' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Note Content</label>
                  <textarea
                    name="name"
                    value={eventForm.name}
                    onChange={handleEventInput}
                    className="mt-1 block w-full border border-gray-300 rounded-md p-2 min-h-[80px]"
                    required
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Event Name</label>
                    <input 
                      type="text" 
                      name="name" 
                      value={eventForm.name} 
                      onChange={handleEventInput} 
                      className="mt-1 block w-full border border-gray-300 rounded-md p-2" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Event Date</label>
                    <input 
                      type="date" 
                      name="date" 
                      value={eventForm.date} 
                      onChange={handleEventInput} 
                      className="mt-1 block w-full border border-gray-300 rounded-md p-2" 
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Event End Date (optional)</label>
                    <input 
                      type="date" 
                      name="endDate" 
                      value={eventForm.endDate} 
                      onChange={handleEventInput} 
                      className="mt-1 block w-full border border-gray-300 rounded-md p-2" 
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Background Color</label>
                <div className="flex gap-2 mb-2">
                  {colorOptions.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`w-7 h-7 rounded-full border-2 ${eventForm.bgColor === color ? 'border-gray-700' : 'border-gray-200'}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setEventForm(prev => ({ ...prev, bgColor: color }))}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={handleCloseModal} 
                  className="px-4 py-2 bg-gray-200 rounded-md text-gray-700"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  {isEditMode ? 'Save Changes' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {pendingDeleteId && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-xs shadow-lg flex flex-col items-center">
            <div className="text-lg font-semibold mb-4 text-center">Are you sure you want to delete this item?</div>
            <div className="flex gap-4 mt-2">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 bg-gray-200 rounded-md text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventManager; 