import React, { useState, useEffect } from "react";
import { getAustralianDate, getNextOrPrevDate } from '../utils/DateUtils.js'


const DateSelectorBar = ({ setNoteDate }) => {
  //STATE
  const [selectedDate, setSelectedDate] = useState(getAustralianDate()); // Default to today's date in Australia


  //EFFECTS
  useEffect(() => {
    setSelectedDate(getAustralianDate());
    setNoteDate(getAustralianDate())
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
      <div className="flex items-center justify-center space-x-4 mb-2 overflow-hidden">
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
            const activeBorderClass = isActive
              ? (isoDate === todayIso ? 'border-4 border-green-500' : 'border-4 border-red-500')
              : 'opacity-25';

            return (
              <div
                key={offset}
                onClick={() => handleDateChange(isoDate)}
                className={`cursor-pointer w-16 h-16 flex flex-col justify-center items-center rounded-lg bg-gray-800 text-white ${activeBorderClass}`}
              >
                <div className="text-lg font-bold">{day}</div>
                <div className="text-xs uppercase">{month}</div>
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
      {selectedDate !== getAustralianDate() && (
        <div className="flex justify-center">
          <button
            onClick={() => handleDateChange(getAustralianDate())}
            className="text-sm text-green-600 hover:underline"
          >
            Today
          </button>
        </div>
      )}
    </div>
  );

};

export default DateSelectorBar;
