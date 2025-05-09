import React, { useState, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from '@heroicons/react/24/solid';
import { loadAllNotes } from '../utils/ApiUtils';

const CustomTooltip = ({ event, currentDate }) => {
  const originalDate = new Date(event.originalDate);
  const today = new Date();
  const age = today.getFullYear() - originalDate.getFullYear();
  
  // Calculate days difference
  const diffTime = Math.abs(today - originalDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return (
    <div className="absolute z-50 bg-white p-3 rounded-lg shadow-lg border border-gray-200 min-w-[200px]">
      <div className="text-sm font-medium text-gray-900 mb-1">{event.title}</div>
      <div className="text-xs text-gray-600 space-y-1">
        <div>Original Date: {originalDate.toLocaleDateString()}</div>
        <div>Age: {age} years</div>
        <div>Days from today: {diffDays}</div>
      </div>
    </div>
  );
};

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

const CustomCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [showAnniversary, setShowAnniversary] = useState(false);
  const [hoveredEvent, setHoveredEvent] = useState(null);
  const [tempEvents, setTempEvents] = useState(() => {
    try {
      const stored = localStorage.getItem('tempEvents');
      console.log('Initial load from localStorage:', stored);
      if (stored && stored !== '[]') {
        const parsed = JSON.parse(stored);
        console.log('Parsed initial events:', parsed);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.error('Error loading initial temp events:', error);
    }
    return [];
  });
  const [isTempEventModalOpen, setIsTempEventModalOpen] = useState(false);
  const [tempEventForm, setTempEventForm] = useState({ name: '', date: '', endDate: '' });

  // Save temp events to localStorage when changed
  useEffect(() => {
    if (tempEvents.length > 0) {
      console.log('Saving temp events to localStorage:', tempEvents);
      try {
        const serialized = JSON.stringify(tempEvents);
        console.log('Serialized data being saved:', serialized);
        localStorage.setItem('tempEvents', serialized);
      } catch (error) {
        console.error('Error saving temp events to localStorage:', error);
      }
    }
  }, [tempEvents]);

  const handleTempEventInput = (e) => {
    const { name, value } = e.target;
    setTempEventForm(f => ({ ...f, [name]: value }));
  };

  const handleTempEventSubmit = (e) => {
    e.preventDefault();
    if (!tempEventForm.name || !tempEventForm.date) return;
    
    const newEvent = { ...tempEventForm, id: Date.now() };
    console.log('Adding new temp event:', newEvent);
    
    setTempEvents(prev => {
      const updatedEvents = [...prev, newEvent];
      console.log('Updated temp events:', updatedEvents);
      // Immediately save to localStorage
      try {
        localStorage.setItem('tempEvents', JSON.stringify(updatedEvents));
      } catch (error) {
        console.error('Error saving temp events to localStorage:', error);
      }
      return updatedEvents;
    });
    
    setTempEventForm({ name: '', date: '', endDate: '' });
    setIsTempEventModalOpen(false);
  };

  const handleDeleteTempEvent = (id) => {
    console.log('Deleting temp event with id:', id);
    setTempEvents(prev => {
      const updatedEvents = prev.filter(ev => ev.id !== id);
      console.log('Updated temp events after deletion:', updatedEvents);
      // Immediately save to localStorage
      try {
        localStorage.setItem('tempEvents', JSON.stringify(updatedEvents));
      } catch (error) {
        console.error('Error saving temp events to localStorage:', error);
      }
      return updatedEvents;
    });
  };

  // Fetch events from notes
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await loadAllNotes('', null);
        const eventNotes = data.notes.filter(note => 
          note.content.split('\n').some(line => line.trim().startsWith('event_date:'))
        );

        const currentYear = new Date().getFullYear();

        const parsedEvents = eventNotes.map(note => {
          const lines = note.content.split('\n');
          const eventDateLine = lines.find(line => line.trim().startsWith('event_date:'));
          const originalDate = eventDateLine ? new Date(eventDateLine.split(':')[1].trim().split("T")[0]) : null;
          const eventDate = originalDate ? new Date(originalDate) : null;
          
          // Get the first line as the event title and remove 'event_description:'
          const title = lines[0].trim().replace('event_description:', '').trim();
          
          // If anniversary mode is on, set the year to current year
          if (eventDate && showAnniversary) {
            eventDate.setFullYear(currentYear);
          }
          
          let obj = {
            id: note.id,
            title,
            date: eventDate,
            originalDate: originalDate,
            content: note.content
          };
          return obj;
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
  }, [showAnniversary]);

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
  };

  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
  };

  const isSelected = (date) => {
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
                  className="group relative"
                >
                  <div className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded truncate">
                    {event.title}
                  </div>
                  <div className="hidden group-hover:block absolute z-50 left-0 top-full mt-1 bg-white p-3 rounded-lg shadow-lg border border-gray-200 min-w-[200px]">
                    <div className="text-sm font-medium text-gray-900 mb-1">{event.title}</div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>Original Date: {originalDate.toLocaleDateString()}</div>
                      <div>Age: {age} years</div>
                      <div>Days from today: {diffDays}</div>
                    </div>
                  </div>
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
      {/* Temp Event Cards Section - visually highlighted */}
      <div className="flex flex-col gap-2 mb-6 bg-indigo-50 border-2 border-indigo-300 rounded-xl p-4 shadow-lg">
        <div className="flex justify-between items-center mb-2">
          <button
            onClick={() => setIsTempEventModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium shadow-lg border border-indigo-700"
          >
            <PlusIcon className="h-5 w-5" />
            Add Temp Event
          </button>
        </div>
        <div className="flex flex-wrap gap-3">
          {tempEvents.map(ev => {
            const eventDate = new Date(ev.date + 'T' + (ev.start || '00:00'));
            const now = new Date();
            const daysLeft = Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24));
            return (
              <div key={ev.id} className="flex flex-col items-start bg-white border border-gray-200 rounded-lg shadow-sm px-4 py-3 min-w-[220px] max-w-xs">
                <div className="text-2xl font-bold text-indigo-600">{daysLeft > 0 ? daysLeft : 0}</div>
                <div className="text-xs text-gray-400 -mt-1 mb-1">days</div>
                <div className="font-medium text-gray-900 truncate w-full">{ev.name}</div>
                <div className="text-sm text-gray-500">{new Date(ev.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</div>
                {ev.endDate && (
                  <div className="text-xs text-gray-500">to {new Date(ev.endDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                )}
                <button onClick={() => handleDeleteTempEvent(ev.id)} className="mt-2 text-xs text-red-500 hover:underline self-end">Delete</button>
              </div>
            );
          })}
        </div>
      </div>
      {/* Temp Event Modal */}
      {isTempEventModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
            <h2 className="text-lg font-semibold mb-4">Add Temp Event</h2>
            <form onSubmit={handleTempEventSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Event Name</label>
                <input type="text" name="name" value={tempEventForm.name} onChange={handleTempEventInput} className="mt-1 block w-full border border-gray-300 rounded-md p-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Event Start Date</label>
                <input type="date" name="date" value={tempEventForm.date} onChange={handleTempEventInput} className="mt-1 block w-full border border-gray-300 rounded-md p-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Event End Date (optional)</label>
                <input type="date" name="endDate" value={tempEventForm.endDate} onChange={handleTempEventInput} className="mt-1 block w-full border border-gray-300 rounded-md p-2" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setIsTempEventModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-md text-gray-700">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">Save</button>
              </div>
            </form>
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