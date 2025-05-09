import React, { useState, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon, PencilIcon } from '@heroicons/react/24/solid';
import { loadAllNotes, updateNoteById, deleteNoteById } from '../utils/ApiUtils';
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

  // Calculate days until next salary
  const getNextSalaryDate = () => {
    const currentDay = today.getDate();
    const nextSalary = new Date(today);
    
    if (currentDay >= 15) {
      // If we're past the 15th, get the 15th of next month
      nextSalary.setMonth(nextSalary.getMonth() + 1);
    }
    nextSalary.setDate(15);
    return nextSalary;
  };

  const nextSalaryDate = getNextSalaryDate();
  const daysUntilSalary = Math.ceil((nextSalaryDate - today) / (1000 * 60 * 60 * 24));

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

      {/* Salary Stats Row */}
      <div>
        <div className="bg-white p-3 rounded-lg shadow-sm">
          <div className="text-sm text-gray-500">Days Until Next Salary</div>
          <div className="text-2xl font-bold text-green-600">{daysUntilSalary}</div>
          <div className="text-xs text-gray-500 mt-1">
            Next salary date: {nextSalaryDate.toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
};

const CustomCalendar = ({ allNotes }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [showAnniversary, setShowAnniversary] = useState(false);
  const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0, date: null, event: null });
  const [editingEventNote, setEditingEventNote] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showDatePopup, setShowDatePopup] = useState(false);

  // Fetch events from allNotes
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const eventNotes = allNotes.filter(note => 
          note.content.split('\n').some(line => line.trim().startsWith('event_date:'))
        );

        const currentYear = new Date().getFullYear();

        const parsedEvents = eventNotes.map(note => {
          const lines = note.content.split('\n');
          const eventDateLine = lines.find(line => line.trim().startsWith('event_date:'));
          const originalDate = eventDateLine ? new Date(eventDateLine.split(':')[1].trim().split("T")[0]) : null;
          const eventDate = originalDate ? new Date(originalDate) : null;
          
          const title = lines[0].trim().replace('event_description:', '').trim();
          
          if (eventDate && showAnniversary) {
            eventDate.setFullYear(currentYear);
          }
          
          return {
            id: note.id,
            title,
            date: eventDate,
            originalDate: originalDate,
            content: note.content
          };
        }).filter(event => {
          if (!event.date) return false;
          return showAnniversary ? true : event.date.getFullYear() === currentYear;
        });

        setEvents(parsedEvents);
      } catch (error) {
        console.error('Error fetching events:', error);
      }
    };

    fetchEvents();
  }, [allNotes, showAnniversary]);

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
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear();
    });
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
          <div className="mt-1 space-y-1">
            {dayEvents.map(event => {
              const originalDate = new Date(event.originalDate);
              const today = new Date();
              const age = today.getFullYear() - originalDate.getFullYear();
              const diffTime = Math.abs(today - originalDate);
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

              return (
                <div
                  key={event.id}
                  onClick={(e) => handleEventClick(e, event)}
                  className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded truncate cursor-pointer hover:bg-blue-200"
                >
                  {event.title}
                </div>
              );
            })}
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
          note={editingEventNote}
          onClose={() => setEditingEventNote(null)}
          onSave={async (updatedNote) => {
            try {
              // Update the note in the backend
              await updateNoteById(editingEventNote.id, updatedNote);
              
              allNotes = allNotes.map(note =>
                note.id === editingEventNote.id ? { ...note, content: updatedNote } : note
              );
              setEditingEventNote(null);
              
            } catch (error) {
              console.error('Error updating event:', error);
            }
          }}
          onCancel={() => setEditingEventNote(null)}
          onSwitchToNormalEdit={() => setEditingEventNote(null)}
          onDelete={async () => {
            await deleteNoteById(editingEventNote.id);
            setEditingEventNote(null);
          }}
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

                    return (
                      <div key={event.id} className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">{event.title}</h3>
                            <div className="text-sm text-gray-600 mt-1">
                              <div>Original Date: {originalDate.toLocaleDateString()}</div>
                              <div>Age: {age} years</div>
                              <div>Days from today: {diffDays}</div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleEditEventFromDatePopup(event)}
                            className="ml-3 p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
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
              <div className="flex justify-end space-x-3 mt-4">
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