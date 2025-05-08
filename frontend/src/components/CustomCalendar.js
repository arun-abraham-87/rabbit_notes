import React, { useState, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { loadAllNotes } from '../utils/ApiUtils';

const CustomCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState([]);

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
          console.log(eventDateLine);
          const eventDate = eventDateLine ? new Date(eventDateLine.split(':')[1].trim().split("T")[0]) : null;
          
          // Get the first line as the event title and remove 'event_description:'
          const title = lines[0].trim().replace('event_description:', '').trim();
          
          let obj= {
            id: note.id,
            title,
            date: eventDate,
            content: note.content
          };
          console.log(obj.date);
          return obj;
        }).filter(event => {
          // Filter out events without valid dates and events not from current year
          if (!event.date) return false;
          return event.date.getFullYear() === currentYear;
        });
        console.log(parsedEvents.length);
        setEvents(parsedEvents);
      } catch (error) {
        console.error('Error fetching events:', error);
      }
    };

    fetchEvents();
  }, []);

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
          className={`h-24 border border-gray-100 p-2 cursor-pointer transition-colors
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
            {dayEvents.map(event => (
              <div
                key={event.id}
                className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded truncate"
                title={event.title}
              >
                {event.title}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return days;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
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
    </div>
  );
};

export default CustomCalendar; 