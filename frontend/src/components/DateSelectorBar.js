import React, { useState,useEffect } from "react";

const DateSelectorBar = ({ setNoteDate }) => {
  // Get today's date in the Australian timezone and format as YYYY-MM-DD
  const getAustralianDate = () => {
    const ausDate = new Date().toLocaleDateString("en-AU", {
      timeZone: "Australia/Sydney",
    });
    const [day, month, year] = ausDate.split("/");
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  };

  const [selectedDate, setSelectedDate] = useState(getAustralianDate()); // Default to today's date in Australia


  useEffect(() => {
    setSelectedDate(getAustralianDate());
    setNoteDate(getAustralianDate())
  }, []);

  const handleDateChange = (event) => {
    const updatedDate= event.target.value
    if(updatedDate){
      setSelectedDate(updatedDate);
    }
    console.log(selectedDate)
    setNoteDate(selectedDate); // Update parent state if provided
  };

  return (
    <div className="flex justify-between items-center mb-4">
      <div>
        <input
          type="date"
          value={selectedDate}
          onChange={handleDateChange}
          className="border px-2 py-1 rounded"
        />
      </div>
    </div>
  );
};

export default DateSelectorBar;
