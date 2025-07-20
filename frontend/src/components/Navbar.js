import React, { useEffect, useState } from 'react';
import { Cog6ToothIcon, ChevronDownIcon } from '@heroicons/react/24/solid';
import QuickPasteToggle from './QuickPasteToggle';
import StockInfoPanel from './StockInfoPanel';
import { useLeftPanel } from '../contexts/LeftPanelContext';

const Navbar = ({ activePage, setActivePage }) => {
  const [navbarPagesVisibility, setNavbarPagesVisibility] = useState({});
  const [showDropdown, setShowDropdown] = useState(false);
  const { isVisible } = useLeftPanel();

  useEffect(() => {
    const saved = localStorage.getItem('navbarPagesVisibility');
    if (saved) {
      setNavbarPagesVisibility(JSON.parse(saved));
    } else {
      // Default: all true
      setNavbarPagesVisibility({
        dashboard: true, notes: true, todos: true, watch: true, tags: true, journals: true, events: true, countdowns: true, people: true, news: true, expense: true, trackers: true, calendar: true, bookmarks: true, assets: true, 'stock-vesting': true, pomodoro: true
      });
    }
  }, []);

  const navigationButtons = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'notes', label: 'Notes' },
    { id: 'todos', label: 'Todos' },
    { id: 'watch', label: 'Watch' },
    { id: 'tags', label: 'Tags' },
    { id: 'journals', label: 'Journals' },
    { id: 'events', label: 'Events' },
    { id: 'countdowns', label: 'Countdowns' },
    { id: 'people', label: 'People' },
    { id: 'news', label: 'News' },
    { id: 'expense', label: 'Expense' },
    { id: 'trackers', label: 'Trackers' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'bookmarks', label: 'Bookmarks' },
    { id: 'assets', label: 'Assets' },
    { id: 'stock-vesting', label: 'Stock Vesting' },
    { id: 'pomodoro', label: 'Pomodoro' },
  ].filter(button => navbarPagesVisibility[button.id]);

  // Split navigation buttons: first 10 in main menu, rest in dropdown
  const mainMenuButtons = navigationButtons.slice(0, 10);
  const dropdownButtons = navigationButtons.slice(10);

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

  const DropdownButton = ({ id, label }) => (
    <button
      onClick={() => {
        setActivePage(id);
        setShowDropdown(false);
      }}
      className={`w-full text-left px-4 py-2 text-sm ${
        activePage === id ? 'bg-gray-100 text-black font-medium' : 'text-gray-600'
      } hover:bg-gray-50 hover:text-black transition`}
    >
      {label}
    </button>
  );

  return (
    <nav className={`border-b py-4 px-8 bg-background hover:shadow-sm transition-all duration-300 ease-in-out ${
      isVisible ? 'ml-80' : 'ml-0'
    }`}>
      <div className="w-full mx-auto flex justify-between items-center">
        {/* Left: Brand */}
        <div className="flex items-center gap-2 cursor-pointer">
          <div>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-rabbit h-6 w-6 text-primary"><path d="M13 16a3 3 0 0 1 2.24 5"></path><path d="M18 12h.01"></path><path d="M18 21h-8a4 4 0 0 1-4-4 7 7 0 0 1 7-7h.2L9.6 6.4a1 1 0 1 1 2.8-2.8L15.8 7h.2c3.3 0 6 2.7 6 6v1a2 2 0 0 1-2 2h-1a3 3 0 0 0-3 3"></path><path d="M20 8.54V4a2 2 0 1 0-4 0v3"></path><path d="M7.612 12.524a3 3 0 1 0-1.6 4.3"></path></svg>
          </div>
          <h1 className="text-xl font-bold">Rabbit Notes</h1>
        </div>

        {/* Right: Navigation Buttons */}
        <div className="flex items-center space-x-4">
          {/* Main menu navigation buttons (max 10) */}
          <div className="flex items-center space-x-4 overflow-x-auto">
            {mainMenuButtons.map(button => (
              <NavButton key={button.id} id={button.id} label={button.label} />
            ))}
          </div>

          {/* Dropdown for additional navigation buttons */}
          {dropdownButtons.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center space-x-1 text-sm text-gray-600 hover:text-black transition"
              >
                <span>More</span>
                <ChevronDownIcon className="h-4 w-4" />
              </button>
              
              {showDropdown && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                  <div className="py-1">
                    {dropdownButtons.map(button => (
                      <DropdownButton key={button.id} id={button.id} label={button.label} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stock Info Panel */}
          <StockInfoPanel />

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
      
      {/* Click outside to close dropdown */}
      {showDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowDropdown(false)}
        />
      )}
    </nav>
  );
};

export default Navbar;
