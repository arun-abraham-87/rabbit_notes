import React, { useState, useEffect } from 'react';
import TimeZoneDisplay from './TimeZoneDisplay';
import { ChevronDownIcon, Cog6ToothIcon, Bars3Icon } from '@heroicons/react/24/solid';
import QuickPasteToggle from './QuickPasteToggle';

const Navbar = ({ activePage, setActivePage, settings }) => {
  const [time, setTime] = useState(new Date());
  const [showTimezones, setShowTimezones] = useState(false);
  const [selectedTimezones, setSelectedTimezones] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

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

  const navigationButtons = [
    { id: 'dashboard', label: 'Dashboard', show: settings?.navigation?.showDashboardPage !== false },
    { id: 'notes', label: 'Notes', show: true },
    { id: 'todos', label: 'Todos', show: settings?.navigation?.showTodosPage !== false },
    { id: 'watch', label: 'Watch', show: settings?.navigation?.showWatchPage !== false },
    { id: 'tags', label: 'Tags', show: settings?.navigation?.showTagsPage !== false },
    { id: 'journals', label: 'Journals', show: settings?.navigation?.showJournalsPage !== false },
    { id: 'events', label: 'Events', show: settings?.navigation?.showEventsPage !== false },
    { id: 'people', label: 'People', show: settings?.navigation?.showPeoplePage !== false },
    { id: 'news', label: 'News', show: settings?.navigation?.showNewsPage !== false },
    { id: 'expense', label: 'Expense', show: settings?.navigation?.showExpensePage !== false },
    { id: 'trackers', label: 'Trackers', show: settings?.navigation?.showTrackersPage !== false },
  ].filter(button => button.show);

  const visibleButtons = navigationButtons.slice(0, 4);
  const dropdownButtons = navigationButtons.slice(4);

  const NavButton = ({ id, label }) => (
    <button
      onClick={() => setActivePage(id)}
      className={`text-sm ${
        activePage === id ? 'text-black font-medium' : 'text-gray-600'
      } hover:text-black transition`}
    >
      {label}
    </button>
  );

  return (
    <nav className="border-b py-4 px-8 bg-background hover:shadow-sm transition-shadow">
      <div className="w-full mx-auto flex justify-between items-center">
        {/* Left: Brand and Time */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 cursor-pointer">
            <div>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-rabbit h-6 w-6 text-primary"><path d="M13 16a3 3 0 0 1 2.24 5"></path><path d="M18 12h.01"></path><path d="M18 21h-8a4 4 0 0 1-4-4 7 7 0 0 1 7-7h.2L9.6 6.4a1 1 0 1 1 2.8-2.8L15.8 7h.2c3.3 0 6 2.7 6 6v1a2 2 0 0 1-2 2h-1a3 3 0 0 0-3 3"></path><path d="M20 8.54V4a2 2 0 1 0-4 0v3"></path><path d="M7.612 12.524a3 3 0 1 0-1.6 4.3"></path></svg>
            </div>
            <h1 className="text-xl font-bold">Rabbit Notes</h1>
          </div>

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
        </div>

        {/* Right: Navigation Buttons */}
        <div className="flex items-center space-x-4">
          {/* Always visible first four buttons */}
          <div className="flex items-center space-x-4">
            {visibleButtons.map(button => (
              <NavButton key={button.id} id={button.id} label={button.label} />
            ))}
          </div>
          
          {/* Dropdown menu for remaining buttons */}
          {dropdownButtons.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="p-2 rounded-full text-gray-700 hover:bg-gray-100 transition"
                title="More options"
              >
                <Bars3Icon className="h-5 w-5" />
              </button>
              
              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                  {dropdownButtons.map(button => (
                    <button
                      key={button.id}
                      onClick={() => {
                        setActivePage(button.id);
                        setShowDropdown(false);
                      }}
                      className={`block w-full text-left px-4 py-2 text-sm ${
                        activePage === button.id ? 'bg-gray-100 text-gray-900' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {button.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Quick Paste Toggle */}
          <QuickPasteToggle />

          {/* Settings button */}
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
