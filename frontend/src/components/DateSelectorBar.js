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
    <div className="flex items-center justify-between bg-white border border-gray-300 rounded shadow-sm p-3 mb-4">
      <button
        onClick={(x) => updateDate(false)}
        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded shadow-sm"
      >
        &#60; {/* Unicode for '<' */}
      </button>
      <div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => handleDateChange(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <button
        onClick={() => updateDate(true)}
        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded shadow-sm"
      >
        &#62; {/* Unicode for '>' */}
      </button>
    </div>
  );

};

export default DateSelectorBar;
