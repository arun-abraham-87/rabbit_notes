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
    <div className="flex items-center mb-4">
      <button
        onClick={(x) => updateDate(false)}
        className="bg-blue-500 text-white px-2 py-1 rounded flex items-center"
      >
        &#60; {/* Unicode for '<' */}
      </button>
      <div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => handleDateChange(e.target.value)}
          className="border px-2 py-1 rounded"
        />
      </div>
      <button
        onClick={() => updateDate(true)}
        className="bg-blue-500 text-white px-2 py-1 rounded flex items-center"
      >
        &#62; {/* Unicode for '>' */}
      </button>
    </div>
  );

};

export default DateSelectorBar;
