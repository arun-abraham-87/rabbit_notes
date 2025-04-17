import React, { useState, useEffect, useRef } from "react";
import { getAustralianDate, getNextOrPrevDate, getAge } from '../utils/DateUtils.js'


const DateSelectorBar = ({ setNoteDate }) => {
  //STATE
  const [selectedDate, setSelectedDate] = useState(getAustralianDate()); // Default to today's date in Australia
  const [showCalendar, setShowCalendar] = useState(false);
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
            const activeBorderClass = isActive
              ? (isoDate === todayIso ? 'border-4 border-green-500' : 'border-4 border-red-500')
              : 'opacity-25';

            return (
              <div
                key={offset}
                onClick={() => handleDateChange(isoDate)}
                onDoubleClick={() => setShowCalendar(true)}
                className={`cursor-pointer w-16 h-16 flex flex-col justify-center items-center rounded-lg bg-gray-800 text-white ${activeBorderClass}`}
              >
                <div className={`text-lg font-bold ${isToday && !isActive ? 'text-green-400' : ''}`}>{day}</div>
                <div className={`text-xs uppercase ${isToday && !isActive ? 'text-green-400' : ''}`}>{month}</div>
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
    </div>
  );

};

export default DateSelectorBar;
