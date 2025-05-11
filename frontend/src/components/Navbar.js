import React from 'react';
import { Cog6ToothIcon } from '@heroicons/react/24/solid';
import QuickPasteToggle from './QuickPasteToggle';
import StockInfoPanel from './StockInfoPanel';

const Navbar = ({ activePage, setActivePage, settings }) => {
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
    { id: 'calendar', label: 'Calendar', show: settings?.navigation?.showCalendarPage !== false },
    { id: 'bookmarks', label: 'Bookmarks', show: settings?.navigation?.showBookmarksPage !== false },
    { id: 'assets', label: 'Assets', show: true },
  ].filter(button => button.show);

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
        {/* Left: Brand */}
        <div className="flex items-center gap-2 cursor-pointer">
          <div>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-rabbit h-6 w-6 text-primary"><path d="M13 16a3 3 0 0 1 2.24 5"></path><path d="M18 12h.01"></path><path d="M18 21h-8a4 4 0 0 1-4-4 7 7 0 0 1 7-7h.2L9.6 6.4a1 1 0 1 1 2.8-2.8L15.8 7h.2c3.3 0 6 2.7 6 6v1a2 2 0 0 1-2 2h-1a3 3 0 0 0-3 3"></path><path d="M20 8.54V4a2 2 0 1 0-4 0v3"></path><path d="M7.612 12.524a3 3 0 1 0-1.6 4.3"></path></svg>
          </div>
          <h1 className="text-xl font-bold">Rabbit Notes</h1>
        </div>

        {/* Right: Navigation Buttons */}
        <div className="flex items-center space-x-4">
          {/* All navigation buttons */}
          <div className="flex items-center space-x-4 overflow-x-auto">
            {navigationButtons.map(button => (
              <NavButton key={button.id} id={button.id} label={button.label} />
            ))}
          </div>

          {/* Stock Info Panel */}
          <StockInfoPanel />

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
