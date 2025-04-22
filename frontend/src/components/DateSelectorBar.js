import React, { useState, useEffect, useRef } from "react";
import { getAustralianDate, getNextOrPrevDate, getAge } from '../utils/DateUtils.js'
import { ChevronRightIcon, ChevronDownIcon } from '@heroicons/react/24/solid';


const DateSelectorBar = ({ setNoteDate }) => {
  //STATE
  const [selectedDate, setSelectedDate] = useState(getAustralianDate()); // Default to today's date in Australia
  const [showCalendar, setShowCalendar] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const calendarRef = useRef(null);

  //EFFECTS
  useEffect(() => {
    setSelectedDate(getAustralianDate());
    setNoteDate(getAustralianDate())
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target)
      ) {
        setShowCalendar(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  //HELPERS
  const updateDate = (nextDay) => {
    const nextDateStr = getNextOrPrevDate(selectedDate, nextDay)
    console.log(`Next / Prev Date: ${nextDateStr}`)
    setSelectedDate(nextDateStr);
    setNoteDate(nextDateStr)
  }

  // HANDLERS
  const handleDateChange = (dateStr) => {
    setSelectedDate(dateStr);
    setNoteDate(dateStr);
  };

  return (
    <div>
      <div
        role="button"
        onClick={() => setCollapsed(prev => !prev)}
        className="mb-2 inline-flex items-center space-x-1 cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900"
      >
        {collapsed ? (
          <>
            <ChevronRightIcon className="h-4 w-4 text-gray-700" />
            <span className="italic">Date Selection</span>
          </>
        ) : (
          <>
            <ChevronDownIcon className="h-4 w-4 text-gray-700" />
            <span className="italic">Date Selection</span>
          </>
        )}
      </div>
      {!collapsed && (
        <div>
          {/* Begin original DateSelectorBar content */}
          <div className="flex justify-center mb-1 text-xs text-gray-400">
            {selectedDate === getAustralianDate() ? 'Today' : getAge(new Date(selectedDate))}
          </div>
          <div className="flex items-center justify-center space-x-4 mb-2">
            <button
              onClick={() => updateDate(false)}
              className="text-white bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
            >
              &lt;
            </button>
            <div className="flex space-x-4 overflow-hidden">
              {Array.from({ length: 13 }, (_, i) => i - 6).map((offset) => {
                const dateObj = new Date(selectedDate);
                dateObj.setDate(dateObj.getDate() + offset);
                const day = dateObj.getDate();
                const month = dateObj.toLocaleString('default', { month: 'short' });
                const isoDate = dateObj.toISOString().split('T')[0];
                const isActive = isoDate === selectedDate;
                const todayIso = getAustralianDate();
                const isToday = isoDate === todayIso;
                const dayOfWeekLabel = dateObj.toLocaleDateString('en-AU', { weekday: 'short' });

                return (
                  <div
                    key={offset}
                    onClick={() => handleDateChange(isoDate)}
                    onDoubleClick={() => setShowCalendar(true)}
                    className={`cursor-pointer w-16 h-20 flex flex-col items-center rounded-lg overflow-hidden shadow-md ${
                      !isActive ? 'opacity-25' : ''
                    }`}
                    style={{ backgroundColor: '#ffffff' }}
                  >
                    <div className="w-full text-center text-xs font-bold text-white bg-red-500 py-1 uppercase">{month}</div>
                    <div className={`flex-1 flex flex-col items-center justify-center text-2xl font-bold ${isToday && !isActive ? 'text-green-500' : 'text-black'}`}>
                      <div>{day}</div>
                      <div className="text-[10px] text-gray-500">{dayOfWeekLabel}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => updateDate(true)}
              className="text-white bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
            >
              &gt;
            </button>
          </div>
          <div className="flex justify-center mb-1">
            <button
              onClick={() => setShowCalendar(!showCalendar)}
              className="text-xs text-gray-400 hover:underline"
            >
              Choose Date
            </button>
          </div>
          {showCalendar && (
            <div ref={calendarRef} className="flex justify-center mt-1">
              <input
                type="date"
                className="border px-2 py-1 rounded bg-white text-black"
                value={selectedDate}
                onChange={(e) => {
                  handleDateChange(e.target.value);
                  setShowCalendar(false);
                }}
              />
            </div>
          )}
          {selectedDate !== getAustralianDate() && (
            <div className="flex justify-center">
              <button
                onClick={() => handleDateChange(getAustralianDate())}
                className="text-xs text-gray-400 hover:underline"
              >
                Reset To Today
              </button>
            </div>
          )}
          {/* End original DateSelectorBar content */}
        </div>
      )}
    </div>
  );

};

export default DateSelectorBar;
