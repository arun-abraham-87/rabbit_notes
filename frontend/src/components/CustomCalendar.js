import React, { useState, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, PencilIcon } from '@heroicons/react/24/solid';
import { loadAllNotes, updateNoteById, deleteNoteById, createNote } from '../utils/ApiUtils';
import EditEventModal from './EditEventModal';

const CalendarStats = ({ currentDate }) => {
  const today = new Date();
  const endOfYear = new Date(today.getFullYear(), 11, 31);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  // Calculate days until end of year
  const daysUntilEndOfYear = Math.ceil((endOfYear - today) / (1000 * 60 * 60 * 24));
  
  // Calculate weeks until end of year
  const weeksUntilEndOfYear = Math.ceil(daysUntilEndOfYear / 7);
  
  // Calculate days until end of month
  const daysUntilEndOfMonth = Math.ceil((endOfMonth - today) / (1000 * 60 * 60 * 24));
  
  // Calculate months left
  const monthsLeft = 12 - today.getMonth();

  // Calculate days completed in year
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const daysCompleted = Math.ceil((today - startOfYear) / (1000 * 60 * 60 * 24));
  const totalDaysInYear = 365 + (today.getFullYear() % 4 === 0 ? 1 : 0); // Account for leap year
  const daysCompletedPercentage = Math.round((daysCompleted / totalDaysInYear) * 100);

  // Calculate months with 5 weeks
  const getMonthsWith5Weeks = () => {
    const monthsWith5Weeks = [];
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Start from current month
    for (let month = today.getMonth(); month < 12; month++) {
      const firstDay = new Date(today.getFullYear(), month, 1);
      const lastDay = new Date(today.getFullYear(), month + 1, 0);
      const firstWeek = Math.ceil(firstDay.getDate() / 7);
      const lastWeek = Math.ceil(lastDay.getDate() / 7);
      
      if (firstWeek + lastWeek > 5) {
        monthsWith5Weeks.push(monthNames[month]);
      }
    }
    return monthsWith5Weeks;
  };

  const monthsWith5Weeks = getMonthsWith5Weeks();

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Time Statistics</h3>
      
      {/* Months Stats Row */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white p-3 rounded-lg shadow-sm">
          <div className="text-sm text-gray-500">Months Left in Year</div>
          <div className="text-2xl font-bold text-blue-600">{monthsLeft}</div>
        </div>
        <div className="bg-white p-3 rounded-lg shadow-sm">
          <div className="text-sm text-gray-500">5-Week Months Remaining</div>
          <div className="text-sm font-medium text-blue-600 mt-1">
            {monthsWith5Weeks.length > 0 ? (
              monthsWith5Weeks.join(', ')
            ) : (
              'None'
            )}
          </div>
        </div>
      </div>

      {/* Days Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="bg-white p-3 rounded-lg shadow-sm">
          <div className="text-sm text-gray-500">Days Until Year End</div>
          <div className="text-2xl font-bold text-blue-600">{daysUntilEndOfYear}</div>
        </div>
        <div className="bg-white p-3 rounded-lg shadow-sm">
          <div className="text-sm text-gray-500">Weeks Until Year End</div>
          <div className="text-2xl font-bold text-blue-600">{weeksUntilEndOfYear}</div>
        </div>
        <div className="bg-white p-3 rounded-lg shadow-sm">
          <div className="text-sm text-gray-500">Days Until Month End</div>
          <div className="text-2xl font-bold text-blue-600">{daysUntilEndOfMonth}</div>
        </div>
        <div className="bg-white p-3 rounded-lg shadow-sm">
          <div className="text-sm text-gray-500">Days Completed</div>
          <div className="text-2xl font-bold text-blue-600">{daysCompleted}</div>
          <div className="text-xs text-gray-500 mt-1">
            {daysCompletedPercentage}% of year
          </div>
        </div>
      </div>

      {/* Daylight Saving Info */}
      {(() => {
        const now = new Date();
        const currentYear = now.getFullYear();
        const nextYear = currentYear + 1;

        const getFirstSundayOfMonth = (year, month) => {
          const firstDay = new Date(year, month, 1);
          const dayOfWeek = firstDay.getDay();
          const daysToAdd = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
          return new Date(year, month, 1 + daysToAdd);
        };

        const dstEndCurrent = getFirstSundayOfMonth(currentYear, 3);
        dstEndCurrent.setHours(3, 0, 0, 0);
        const dstEndNext = getFirstSundayOfMonth(nextYear, 3);
        dstEndNext.setHours(3, 0, 0, 0);
        const dstStartCurrent = getFirstSundayOfMonth(currentYear, 9);
        dstStartCurrent.setHours(2, 0, 0, 0);
        const dstStartNext = getFirstSundayOfMonth(nextYear, 9);
        dstStartNext.setHours(2, 0, 0, 0);

        let nextChange = null;
        let changeType = '';
        if (now < dstEndCurrent) { nextChange = dstEndCurrent; changeType = 'ends'; }
        else if (now < dstStartCurrent) { nextChange = dstStartCurrent; changeType = 'starts'; }
        else if (now < dstEndNext) { nextChange = dstEndNext; changeType = 'ends'; }
        else { nextChange = dstStartNext; changeType = 'starts'; }

        const formatDstDate = (date) => {
          const dateStr = new Intl.DateTimeFormat('en-AU', {
            timeZone: 'Australia/Melbourne', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          }).format(date);
          const timeStr = new Intl.DateTimeFormat('en-AU', {
            timeZone: 'Australia/Melbourne', hour: 'numeric', minute: '2-digit', hour12: true,
          }).format(date);
          return `${dateStr} (${timeStr})`;
        };

        return (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-3 rounded">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-blue-800">
                  Next Daylight Saving Change - Melbourne
                </h3>
                <div className="mt-1 text-sm text-blue-700">
                  <p>
                    Daylight Saving {changeType === 'starts' ? 'starts' : 'ends'} on{' '}
                    <span className="font-semibold">{formatDstDate(nextChange)}</span>
                  </p>
                  <p className="text-xs mt-1 text-blue-600">
                    {changeType === 'starts'
                      ? 'Clocks will go forward 1 hour (2:00 AM → 3:00 AM)'
                      : 'Clocks will go back 1 hour (3:00 AM → 2:00 AM)'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

const CustomCalendar = ({ allNotes }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [trackerEntries, setTrackerEntries] = useState([]);
  const [showAnniversary, setShowAnniversary] = useState(false);
  const [filters, setFilters] = useState({ deadlines: true, holidays: true, events: true, trackers: false });
  const [trackerFilters, setTrackerFilters] = useState({}); // { trackerTitle: true/false }
  const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0, date: null, event: null });
  const [editingEventNote, setEditingEventNote] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showDatePopup, setShowDatePopup] = useState(false);
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [addEventDate, setAddEventDate] = useState(null);
  const [localNotes, setLocalNotes] = useState(allNotes);

  // Sync local notes with prop
  useEffect(() => { setLocalNotes(allNotes); }, [allNotes]);

  // Fetch events from allNotes
  useEffect(() => {
    try {
      const eventNotes = localNotes.filter(note =>
        note.content.split('\n').some(line => line.trim().startsWith('event_date:'))
      );

      const currentYear = new Date().getFullYear();

      const parsedEvents = eventNotes.map(note => {
        const lines = note.content.split('\n');

        const eventDateLine = lines.find(line => line.trim().startsWith('event_date:'));
        const rawDateStr = eventDateLine?.replace('event_date:', '').trim().split('T')[0];
        const originalDate = rawDateStr ? new Date(rawDateStr) : null;
        let eventDate = originalDate ? new Date(originalDate) : null;

        const descLine = lines.find(l => l.startsWith('event_description:'));
        const title = descLine ? descLine.replace('event_description:', '').trim() : lines[0].trim();

        const tagsLine = lines.find(l => l.startsWith('event_tags:'));
        const tags = tagsLine ? tagsLine.replace('event_tags:', '').trim().split(',').map(t => t.trim().toLowerCase()) : [];

        if (eventDate && showAnniversary) {
          eventDate.setFullYear(currentYear);
        }

        return {
          id: note.id,
          title,
          date: eventDate,
          originalDate,
          tags,
          content: note.content,
          type: 'event',
        };
      }).filter(event => event.date !== null);

      setEvents(parsedEvents);

      // Parse tracker entries
      const trackerAnswerNotes = localNotes.filter(note =>
        note.content && note.content.includes('meta::tracker_answer')
      );

      // Build a map of tracker id -> { title, type }
      const trackerMap = {};
      localNotes.forEach(note => {
        if (note.content && note.content.includes('meta::tracker') && !note.content.includes('meta::tracker_answer')) {
          const lines = note.content.split('\n');
          let title = lines[0]?.trim() || '';
          if (title.startsWith('Title:')) title = title.replace('Title:', '').trim();
          const typeLine = lines.find(l => l.startsWith('Type:'));
          const trackerType = typeLine ? typeLine.replace('Type:', '').trim().toLowerCase() : '';
          if (title) trackerMap[note.id] = { title, type: trackerType };
        }
      });

      const parsedTrackerEntries = trackerAnswerNotes.map(note => {
        const lines = note.content.split('\n');
        const dateLine = lines.find(l => l.startsWith('recorded_on_date:'));
        const dateStr = dateLine ? dateLine.replace('recorded_on_date:', '').trim().split('T')[0] : null;
        const entryDate = dateStr ? new Date(dateStr) : null;

        const linkLine = lines.find(l => l.startsWith('meta::link:'));
        const trackerId = linkLine ? linkLine.replace('meta::link:', '').trim() : null;
        const trackerInfo = trackerId && trackerMap[trackerId] ? trackerMap[trackerId] : { title: 'Tracker', type: '' };

        const answerLine = lines.find(l => l.startsWith('Answer:'));
        const answer = answerLine ? answerLine.replace('Answer:', '').trim() : '';

        const isYesNo = ['yes,no', 'yesno', 'yes/no'].includes(trackerInfo.type);

        return {
          id: note.id,
          title: trackerInfo.title,
          answer,
          date: entryDate,
          originalDate: entryDate,
          tags: ['tracker'],
          content: note.content,
          type: 'tracker',
          isYesNo,
        };
      }).filter(e => {
        if (!e.date) return false;
        // For yes/no trackers, only include "Yes" answers
        if (e.isYesNo && e.answer.toLowerCase() !== 'yes') return false;
        return true;
      });

      setTrackerEntries(parsedTrackerEntries);

      // Build tracker filter state for unique tracker titles (preserve existing selections)
      // All tracker titles stored, visibility computed per-month in render
      const uniqueTrackerTitles = [...new Set(parsedTrackerEntries.map(e => e.title))];
      setTrackerFilters(prev => {
        const updated = {};
        uniqueTrackerTitles.forEach(t => { updated[t] = prev[t] !== undefined ? prev[t] : true; });
        return updated;
      });
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  }, [localNotes, showAnniversary]);

  const daysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const firstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    setShowDatePopup(true);
  };

  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const isSelected = (date) => {
    if (!selectedDate) return false;
    return date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear();
  };

  const getEventsForDate = (date) => {
    const matchDate = (d) => d.getDate() === date.getDate() && d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear();

    const filtered = events.filter(event => {
      if (!matchDate(new Date(event.date))) return false;
      const isDeadline = event.tags?.includes('deadline');
      const isHoliday = event.tags?.includes('holiday');
      if (isDeadline) return filters.deadlines;
      if (isHoliday) return filters.holidays;
      return filters.events;
    });

    const trackers = filters.trackers ? trackerEntries.filter(e => matchDate(new Date(e.date)) && trackerFilters[e.title] !== false) : [];

    return [...filtered, ...trackers];
  };

  const handleContextMenu = (e, date, event = null) => {
    e.preventDefault();
    setContextMenu({
      show: true,
      x: e.clientX,
      y: e.clientY,
      date: date,
      event: event
    });
  };

  const handleContextMenuClose = () => {
    setContextMenu({ show: false, x: 0, y: 0, date: null, event: null });
  };

  const handleAddEvent = (e) => {
    e.preventDefault();
    setSelectedDate(contextMenu.date);
    setContextMenu({ show: false, x: 0, y: 0 });
  };

  const handleEditEvent = (e) => {
    e.preventDefault();
    setEditingEventNote(contextMenu.event);
    setContextMenu({ show: false, x: 0, y: 0, date: null, event: null });
  };

  const handleEventClick = (e, event) => {
    e.stopPropagation();
    setSelectedEvent(event);
  };

  const handleCloseEventPopup = () => {
    setSelectedEvent(null);
  };

  const handleCloseDatePopup = () => {
    setShowDatePopup(false);
  };

  const handleEditEventFromDatePopup = (event) => {
    setShowDatePopup(false);
    setEditingEventNote(event);
  };

  // Add event listener for closing context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (contextMenu.show) {
        handleContextMenuClose();
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [contextMenu.show]);

  const renderCalendarDays = () => {
    const days = [];
    const totalDays = daysInMonth(currentDate);
    const firstDay = firstDayOfMonth(currentDate);

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div key={`empty-${i}`} className="h-24 border border-gray-100 bg-gray-50"></div>
      );
    }

    // Add cells for each day of the month
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const isCurrentDay = isToday(date);
      const isCurrentSelected = isSelected(date);
      const dayEvents = getEventsForDate(date);

      days.push(
        <div
          key={day}
          onClick={() => handleDateClick(date)}
          onContextMenu={(e) => handleContextMenu(e, date)}
          className={`h-24 border border-gray-100 p-2 cursor-pointer transition-colors relative
            ${isCurrentDay ? 'bg-blue-50 border-2 border-black' : 'hover:bg-gray-50'}
            ${isCurrentSelected ? 'ring-2 ring-blue-500' : ''}
            ${date.getDay() === 0 || date.getDay() === 6 ? 'bg-yellow-50' : ''}
          `}
        >
          <div className={`text-sm font-medium ${isCurrentDay ? 'text-blue-600' : 'text-gray-900'}`}>
            {day}
            {isCurrentDay && <span className="ml-1 text-xs text-blue-500">Today</span>}
          </div>
          <div className="mt-1 space-y-0.5 overflow-hidden">
            {dayEvents.slice(0, 3).map(event => {
              const isTracker  = event.type === 'tracker';
              const isDeadline = event.tags?.includes('deadline');
              const isHoliday  = event.tags?.includes('holiday');
              const chipClass  = isTracker
                ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                : isDeadline
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : isHoliday
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200';
              const displayTitle = isTracker ? (event.isYesNo ? event.title : event.answer || event.title) : event.title;
              return (
                <div
                  key={event.id}
                  onClick={(e) => { if (!isTracker) handleEventClick(e, event); }}
                  className={`text-xs px-1.5 py-0.5 rounded truncate cursor-pointer ${chipClass}`}
                  title={displayTitle}
                >
                  {displayTitle}
                </div>
              );
            })}
            {dayEvents.length > 3 && (
              <div className="text-xs text-gray-400 px-1">+{dayEvents.length - 3} more</div>
            )}
          </div>
        </div>
      );
    }

    return days;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {editingEventNote && (
        <EditEventModal
          isOpen={true}
          note={editingEventNote}
          onClose={() => setEditingEventNote(null)}
          onSave={async (updatedNote) => {
            try {
              await updateNoteById(editingEventNote.id, updatedNote);
              setLocalNotes(prev => prev.map(n =>
                n.id === editingEventNote.id ? { ...n, content: updatedNote } : n
              ));
              setEditingEventNote(null);
            } catch (error) {
              console.error('Error updating event:', error);
            }
          }}
          onCancel={() => setEditingEventNote(null)}
          onSwitchToNormalEdit={() => setEditingEventNote(null)}
          onDelete={async () => {
            await deleteNoteById(editingEventNote.id);
            setLocalNotes(prev => prev.filter(n => n.id !== editingEventNote.id));
            setEditingEventNote(null);
          }}
          notes={localNotes}
        />
      )}

      {/* Add Event Modal */}
      {showAddEventModal && (
        <EditEventModal
          isOpen={showAddEventModal}
          note={addEventDate ? { content: `event_description:\nevent_date:${addEventDate.getFullYear()}-${String(addEventDate.getMonth() + 1).padStart(2, '0')}-${String(addEventDate.getDate()).padStart(2, '0')}T12:00` } : null}
          onSave={async (content) => {
            try {
              const newNote = await createNote(content);
              if (newNote) setLocalNotes(prev => [...prev, newNote]);
            } catch (error) {
              console.error('Error creating event:', error);
            }
            setShowAddEventModal(false);
            setAddEventDate(null);
          }}
          onCancel={() => { setShowAddEventModal(false); setAddEventDate(null); }}
          onSwitchToNormalEdit={() => { setShowAddEventModal(false); setAddEventDate(null); }}
          onDelete={() => { setShowAddEventModal(false); setAddEventDate(null); }}
          notes={localNotes}
        />
      )}

      {/* Context Menu */}
      {contextMenu.show && (
        <div 
          className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-2"
          style={{ 
            top: contextMenu.y, 
            left: contextMenu.x,
            minWidth: '150px'
          }}
        >
          {contextMenu.event ? (
            <button
              onClick={handleEditEvent}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Edit Event
            </button>
          ) : (
            <button
              onClick={handleAddEvent}
              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Event
            </button>
          )}
        </div>
      )}

      {/* Event Details Popup */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">{selectedEvent.title}</h2>
              <button
                onClick={handleCloseEventPopup}
                className="text-gray-500 hover:text-gray-700"
              >
                <PlusIcon className="h-5 w-5 transform rotate-45" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                <div className="font-medium mb-2">Event Details:</div>
                <div>Original Date: {new Date(selectedEvent.originalDate).toLocaleDateString()}</div>
                <div>Age: {new Date().getFullYear() - new Date(selectedEvent.originalDate).getFullYear()} years</div>
                <div>Days from today: {Math.ceil(Math.abs(new Date() - new Date(selectedEvent.originalDate)) / (1000 * 60 * 60 * 24))}</div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setSelectedEvent(null);
                    setEditingEventNote(selectedEvent);
                  }}
                  className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
                >
                  Edit Event
                </button>
                <button
                  onClick={handleCloseEventPopup}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Date Events Popup */}
      {showDatePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Events for {selectedDate.toLocaleDateString()}
              </h2>
              <button
                onClick={handleCloseDatePopup}
                className="text-gray-500 hover:text-gray-700"
              >
                <PlusIcon className="h-5 w-5 transform rotate-45" />
              </button>
            </div>
            <div className="space-y-4">
              {getEventsForDate(selectedDate).length > 0 ? (
                <div className="space-y-3">
                  {getEventsForDate(selectedDate).map(event => {
                    const originalDate = new Date(event.originalDate);
                    const today = new Date();
                    const age = today.getFullYear() - originalDate.getFullYear();
                    const diffTime = Math.abs(today - originalDate);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    const isTracker = event.type === 'tracker';

                    return (
                      <div key={event.id} className={`p-3 rounded-lg ${isTracker ? 'bg-amber-50' : 'bg-gray-50'}`}>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">
                              {isTracker && <span className="text-xs text-amber-600 font-normal mr-1">[Tracker]</span>}
                              {event.title}
                            </h3>
                            {isTracker ? (
                              <div className="text-sm text-gray-600 mt-1">
                                <div>Answer: {event.answer}</div>
                              </div>
                            ) : (
                              <div className="text-sm text-gray-600 mt-1">
                                <div>Original Date: {originalDate.toLocaleDateString()}</div>
                                <div>Age: {age} years</div>
                                <div>Days from today: {diffDays}</div>
                              </div>
                            )}
                          </div>
                          {!isTracker && (
                            <button
                              onClick={() => handleEditEventFromDatePopup(event)}
                              className="ml-3 p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-4">
                  No events for this date
                </div>
              )}
              <div className="flex justify-between mt-4">
                <button
                  onClick={() => {
                    setShowDatePopup(false);
                    setAddEventDate(selectedDate);
                    setShowAddEventModal(true);
                  }}
                  className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
                >
                  + Add Event
                </button>
                <button
                  onClick={handleCloseDatePopup}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Header */}
      <div className="bg-white p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button
              onClick={handleToday}
              className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md transition-colors"
            >
              Today
            </button>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="showAnniversary"
                checked={showAnniversary}
                onChange={(e) => setShowAnniversary(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <label htmlFor="showAnniversary" className="text-sm text-gray-700">
                Show Anniversary
              </label>
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handlePrevMonth}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
            </button>
            <button
              onClick={handleNextMonth}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <ChevronRightIcon className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-1 mt-2 pt-2 border-t border-gray-100">
          {[
            { key: 'events',    label: 'Events',    on: 'bg-blue-100 text-blue-700 border border-blue-300' },
            { key: 'deadlines', label: 'Deadlines', on: 'bg-red-100 text-red-700 border border-red-300' },
            { key: 'holidays',  label: 'Holidays',  on: 'bg-green-100 text-green-700 border border-green-300' },
            { key: 'trackers',  label: 'Trackers',  on: 'bg-amber-100 text-amber-700 border border-amber-300' },
          ].map(({ key, label, on }) => (
            <button
              key={key}
              onClick={() => setFilters(prev => ({ ...prev, [key]: !prev[key] }))}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                filters[key] ? on : 'bg-gray-100 text-gray-400 border border-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
          {filters.trackers && (() => {
            // Only show tracker filters for trackers with entries in the current displayed month
            const currentMonth = currentDate.getMonth();
            const currentYear = currentDate.getFullYear();
            const monthTrackerTitles = [...new Set(
              trackerEntries
                .filter(e => {
                  const d = new Date(e.date);
                  return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                })
                .map(e => e.title)
            )];
            if (monthTrackerTitles.length === 0) return null;
            return (
              <>
                <span className="text-gray-300 mx-1">|</span>
                <button
                  onClick={() => {
                    const updated = { ...trackerFilters };
                    monthTrackerTitles.forEach(k => { updated[k] = true; });
                    setTrackerFilters(updated);
                  }}
                  className="px-2 py-1 text-[10px] text-gray-500 hover:text-gray-700 underline"
                >
                  All
                </button>
                <button
                  onClick={() => {
                    const updated = { ...trackerFilters };
                    monthTrackerTitles.forEach(k => { updated[k] = false; });
                    setTrackerFilters(updated);
                  }}
                  className="px-2 py-1 text-[10px] text-gray-500 hover:text-gray-700 underline"
                >
                  None
                </button>
                {monthTrackerTitles.map(title => (
                  <button
                    key={title}
                    onClick={() => setTrackerFilters(prev => ({ ...prev, [title]: !prev[title] }))}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      trackerFilters[title] !== false
                        ? 'bg-amber-50 text-amber-700 border border-amber-300'
                        : 'bg-gray-100 text-gray-400 border border-gray-200'
                    }`}
                    title={title}
                  >
                    {title.length > 20 ? title.slice(0, 20) + '...' : title}
                  </button>
                ))}
              </>
            );
          })()}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Day names header */}
        <div className="grid grid-cols-7 gap-px mb-2">
          {dayNames.map(day => (
            <div
              key={day}
              className="text-center text-sm font-medium text-gray-500 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days grid */}
        <div className="grid grid-cols-7 gap-px">
          {renderCalendarDays()}
        </div>
      </div>

      {/* Calendar Stats */}
      <CalendarStats currentDate={currentDate} />
    </div>
  );
};

export default CustomCalendar; 