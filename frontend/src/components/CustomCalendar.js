import React, { useState, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from '@heroicons/react/24/solid';
import { loadAllNotes } from '../utils/ApiUtils';
import EventManager from './EventManager';

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
      <EventManager />
      
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