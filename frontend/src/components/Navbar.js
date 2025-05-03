import React, { useState, useEffect } from 'react';
import TimeZoneDisplay from './TimeZoneDisplay';
import { ChevronDownIcon, Cog6ToothIcon } from '@heroicons/react/24/solid';

const Navbar = ({ activePage, setActivePage, settings }) => {
  const [time, setTime] = useState(new Date());
  const [showTimezones, setShowTimezones] = useState(false);
  const [selectedTimezones, setSelectedTimezones] = useState([]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load selected timezones from localStorage on component mount
  useEffect(() => {
    const savedTimezones = localStorage.getItem('selectedTimezones');
    if (savedTimezones) {
      setSelectedTimezones(JSON.parse(savedTimezones));
    }
  }, []);

  const formattedTime = time.toLocaleTimeString(undefined, {
    hour12: true,
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });

  const formattedDate = time.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <nav className="border-b py-4 px-8 bg-background hover:shadow-sm transition-shadow">
      <div className="w-full mx-auto flex justify-between items-center">
        {/* Left: Brand */}
        <div className="flex items-center gap-2 cursor-pointer">
          <div>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-rabbit h-6 w-6 text-primary"><path d="M13 16a3 3 0 0 1 2.24 5"></path><path d="M18 12h.01"></path><path d="M18 21h-8a4 4 0 0 1-4-4 7 7 0 0 1 7-7h.2L9.6 6.4a1 1 0 1 1 2.8-2.8L15.8 7h.2c3.3 0 6 2.7 6 6v1a2 2 0 0 1-2 2h-1a3 3 0 0 0-3 3"></path><path d="M20 8.54V4a2 2 0 1 0-4 0v3"></path><path d="M7.612 12.524a3 3 0 1 0-1.6 4.3"></path></svg>
          </div>
          <h1 className="text-xl font-bold">Rabbit Notes</h1>
        </div>

        {/* Center: Date and Time */}
        <div
          className="relative group"
          onMouseEnter={() => setShowTimezones(true)}
          onMouseLeave={() => setShowTimezones(false)}
        >
          <div className="flex items-center gap-4 cursor-pointer">
            <div className="text-sm text-gray-600">{formattedDate}</div>
            <div className="text-base font-medium">{formattedTime}</div>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <span>🇦🇺</span>
              <span>AEST</span>
              <ChevronDownIcon className="h-4 w-4 text-gray-400" />
            </div>
          </div>
          {showTimezones && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50">
              <TimeZoneDisplay selectedTimezones={selectedTimezones} />
            </div>
          )}
        </div>

        {/* Right: Navigation Buttons */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setActivePage('notes')}
            className={`px-3 py-1 rounded-full border ${
              activePage === 'notes' ? 'bg-[rgb(31_41_55_/_var(--tw-bg-opacity,1))] text-white' : 'bg-white text-gray-700'
            } hover:bg-[rgb(31_41_55_/_0.1)] transition`}
          >
            Notes
          </button>
          <button
            onClick={() => setActivePage('watch')}
            className={`px-3 py-1 rounded-full border ${
              activePage === 'watch' ? 'bg-[rgb(31_41_55_/_var(--tw-bg-opacity,1))] text-white' : 'bg-white text-gray-700'
            } hover:bg-[rgb(31_41_55_/_0.1)] transition`}
          >
            Watch
          </button>
          {settings?.showTagsPage !== false && (
            <button
              onClick={() => setActivePage('tags')}
              className={`px-3 py-1 rounded-full border ${
                activePage === 'tags' ? 'bg-[rgb(31_41_55_/_var(--tw-bg-opacity,1))] text-white' : 'bg-white text-gray-700'
              } hover:bg-[rgb(31_41_55_/_0.1)] transition`}
            >
              Tags
            </button>
          )}
          {settings?.showTodosPage !== false && (
            <button
              onClick={() => setActivePage('todos')}
              className={`px-3 py-1 rounded-full border ${
                activePage === 'todos' ? 'bg-[rgb(31_41_55_/_var(--tw-bg-opacity,1))] text-white' : 'bg-white text-gray-700'
              } hover:bg-[rgb(31_41_55_/_0.1)] transition`}
            >
              Todos
            </button>
          )}
          {settings?.showJournalsPage !== false && (
            <button
              onClick={() => setActivePage('journals')}
              className={`px-3 py-1 rounded-full border ${
                activePage === 'journals' ? 'bg-[rgb(31_41_55_/_var(--tw-bg-opacity,1))] text-white' : 'bg-white text-gray-700'
              } hover:bg-[rgb(31_41_55_/_0.1)] transition`}
            >
              Journals
            </button>
          )}
          {settings?.showEventsPage !== false && (
            <button
              onClick={() => setActivePage('events')}
              className={`px-3 py-1 rounded-full border ${
                activePage === 'events' ? 'bg-[rgb(31_41_55_/_var(--tw-bg-opacity,1))] text-white' : 'bg-white text-gray-700'
              } hover:bg-[rgb(31_41_55_/_0.1)] transition`}
            >
              Events
            </button>
          )}
          {settings?.showPeoplePage !== false && (
            <button
              onClick={() => setActivePage('people')}
              className={`px-3 py-1 rounded-full border ${
                activePage === 'people' ? 'bg-[rgb(31_41_55_/_var(--tw-bg-opacity,1))] text-white' : 'bg-white text-gray-700'
              } hover:bg-[rgb(31_41_55_/_0.1)] transition`}
            >
              People
            </button>
          )}
          {settings?.showNewsPage !== false && (
            <button
              onClick={() => setActivePage('news')}
              className={`px-3 py-1 rounded-full border ${
                activePage === 'news' ? 'bg-[rgb(31_41_55_/_var(--tw-bg-opacity,1))] text-white' : 'bg-white text-gray-700'
              } hover:bg-[rgb(31_41_55_/_0.1)] transition`}
            >
              News
            </button>
          )}
          {settings?.showExpensePage !== false && (
            <button
              onClick={() => setActivePage('expense')}
              className={`px-3 py-1 rounded-full border ${
                activePage === 'expense' ? 'bg-[rgb(31_41_55_/_var(--tw-bg-opacity,1))] text-white' : 'bg-white text-gray-700'
              } hover:bg-[rgb(31_41_55_/_0.1)] transition`}
            >
              Expense
            </button>
          )}
          <button
            onClick={() => setActivePage('manage-notes')}
            className={`p-2 rounded-full ${
              activePage === 'manage-notes' 
                ? 'bg-[rgb(31_41_55_/_var(--tw-bg-opacity,1))] text-white' 
                : 'text-gray-700 hover:bg-gray-100'
            } transition`}
            title="Manage Notes"
          >
            <Cog6ToothIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
