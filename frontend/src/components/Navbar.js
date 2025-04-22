import React, { useState, useEffect } from 'react';
import TimeZoneDisplay from './TimeZoneDisplay';

const Navbar = ({ activePage, setActivePage }) => {
  const [time, setTime] = useState(new Date());
  const [showTimezones, setShowTimezones] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = time.toLocaleTimeString(undefined, {
    hour12: true,
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <nav className="border-b py-4 px-8 bg-background hover:shadow-sm transition-shadow">
      <div className="max-w-[80%] mx-auto flex justify-between items-center">
        {/* Left: Brand */}
        <div className="flex items-center gap-2 cursor-pointer">
          <div>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-rabbit h-6 w-6 text-primary"><path d="M13 16a3 3 0 0 1 2.24 5"></path><path d="M18 12h.01"></path><path d="M18 21h-8a4 4 0 0 1-4-4 7 7 0 0 1 7-7h.2L9.6 6.4a1 1 0 1 1 2.8-2.8L15.8 7h.2c3.3 0 6 2.7 6 6v1a2 2 0 0 1-2 2h-1a3 3 0 0 0-3 3"></path><path d="M20 8.54V4a2 2 0 1 0-4 0v3"></path><path d="M7.612 12.524a3 3 0 1 0-1.6 4.3"></path></svg>
          </div>
          <h1 className="text-xl font-bold">Rabbit Notes</h1>
        </div>

        {/* Center: Clock */}
        <div
          className="relative text-base font-medium"
          onMouseEnter={() => setShowTimezones(true)}
          onMouseLeave={() => setShowTimezones(false)}
        >
          {formattedTime}
          {showTimezones && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50">
              <TimeZoneDisplay />
            </div>
          )}
        </div>

        {/* Right: Navigation Buttons */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setActivePage('notes')}
            className={`text-base font-medium hover:text-blue-600 transition ${
              activePage === 'notes' ? 'text-blue-600 underline' : 'text-gray-700'
            }`}
          >
            Notes
          </button>
          <button
            onClick={() => setActivePage('tags')}
            className={`text-base font-medium hover:text-blue-600 transition ${
              activePage === 'tags' ? 'text-blue-600 underline' : 'text-gray-700'
            }`}
          >
            Tags
          </button>
          <button
            onClick={() => setActivePage('todos')}
            className={`text-base font-medium hover:text-blue-600 transition ${
              activePage === 'todos' ? 'text-blue-600 underline' : 'text-gray-700'
            }`}
          >
            Todos
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
