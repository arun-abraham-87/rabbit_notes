import React, { useState, useEffect, useRef } from "react";
import { getTodaysDateInYYYYMMDDFormat, getNextOrPrevDateStr, getAge } from '../utils/DateUtils.js'
import { ChevronRightIcon, ChevronLeftIcon, CalendarIcon, ArrowPathIcon } from '@heroicons/react/24/solid';

const DateSelectorBar = ({ setNoteDate, defaultCollapsed = true }) => {
  const [selectedDate, setSelectedDate] = useState(getTodaysDateInYYYYMMDDFormat());
  const [showCalendar, setShowCalendar] = useState(false);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const calendarRef = useRef(null);

  useEffect(() => {
    setSelectedDate(getTodaysDateInYYYYMMDDFormat());
    setNoteDate(getTodaysDateInYYYYMMDDFormat());
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updateDate = (nextDay) => {
    const nextDateStr = getNextOrPrevDateStr(selectedDate, nextDay);
    setSelectedDate(nextDateStr);
    setNoteDate(nextDateStr);
  };

  const handleDateChange = (dateStr) => {
    setSelectedDate(dateStr);
    setNoteDate(dateStr);
  };

  const getDateCardStyle = (offset) => {
    const dateObj = new Date(selectedDate);
    dateObj.setDate(dateObj.getDate() + offset);
    const isoDate = dateObj.toISOString().split('T')[0];
    const isActive = isoDate === selectedDate;
    const isToday = isoDate === getTodaysDateInYYYYMMDDFormat();

    return {
      container: `
        relative cursor-pointer rounded-xl overflow-hidden shadow-sm transition-all duration-300
        ${isActive ? 'bg-black scale-105 shadow-lg' : 'bg-white hover:shadow-md'}
        ${!isActive && isToday ? 'border-2 border-green-500' : 'border border-gray-200'}
      `,
      month: `text-xs font-semibold py-1 text-center ${isActive ? 'text-white/90' : 'text-gray-600'} bg-opacity-10`,
      day: `text-xl font-bold ${isActive ? 'text-white' : 'text-gray-800'}`,
      weekday: `text-[10px] font-light ${isActive ? 'text-white/80' : 'text-gray-500'}`,
      topLabel: `text-[10px] font-light ${isActive ? 'text-white/80' : 'text-gray-500'}`
    };
  };

  const getDateLabel = (dateObj) => {
    const isoDate = dateObj.toISOString().split('T')[0];
    if (isoDate === getTodaysDateInYYYYMMDDFormat()) {
      return '(Today)';
    }
    const diffTime = dateObj.getTime() - new Date(getTodaysDateInYYYYMMDDFormat()).getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 
      ? `(+${diffDays})`
      : `(${diffDays})`;
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCollapsed(prev => !prev)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronRightIcon 
              className={`h-5 w-5 text-gray-600 transition-transform duration-200 ${!collapsed ? 'rotate-90' : ''}`}
            />
          </button>
          {collapsed && (
            <button
              onClick={() => updateDate(false)}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              title="Previous day"
            >
              <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <h2 className={`text-lg font-semibold ${selectedDate === getTodaysDateInYYYYMMDDFormat() ? 'text-gray-800' : 'text-red-600'}`}>
              {collapsed ? selectedDate : 'Date Selection'}
            </h2>
            {collapsed && (
              <button
                onClick={() => updateDate(true)}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                title="Next day"
              >
                <ChevronRightIcon className="h-5 w-5 text-gray-600" />
              </button>
            )}
            {collapsed && selectedDate !== getTodaysDateInYYYYMMDDFormat() && (
              <button
                onClick={() => handleDateChange(getTodaysDateInYYYYMMDDFormat())}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                title="Reset to Today"
              >
                <ArrowPathIcon className="h-5 w-5 text-gray-600" />
              </button>
            )}
            {collapsed && (
              <span className="text-sm font-light text-gray-500">
                {selectedDate === getTodaysDateInYYYYMMDDFormat() 
                  ? '(Today)' 
                  : (() => {
                      const diffTime = new Date(selectedDate).getTime() - new Date(getTodaysDateInYYYYMMDDFormat()).getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      return diffDays > 0 
                        ? `(+${diffDays})`
                        : `(${diffDays})`;
                    })()
                }
              </span>
            )}
          </div>
        </div>
        
        {collapsed && (
          <button
            onClick={() => setShowCalendar(true)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            title="Choose date"
          >
            <CalendarIcon className="h-5 w-5 text-gray-600" />
          </button>
        )}
      </div>

      {!collapsed && (
        <div className="space-y-4">
          <div className="flex justify-center text-sm text-gray-500">
            {selectedDate === getTodaysDateInYYYYMMDDFormat() ? 'Today' : getAge(new Date(selectedDate))}
          </div>
          
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => updateDate(false)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Previous day"
            >
              <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
            </button>
            
            <div className="flex gap-2 overflow-x-auto py-2 px-1 max-w-[calc(100vw-200px)]">
              {Array.from({ length: 7 }, (_, i) => i - 3).map((offset) => {
                const dateObj = new Date(selectedDate);
                dateObj.setDate(dateObj.getDate() + offset);
                const day = dateObj.getDate();
                const month = dateObj.toLocaleString('default', { month: 'short' });
                const isoDate = dateObj.toISOString().split('T')[0];
                const dayOfWeekLabel = dateObj.toLocaleDateString('en-AU', { weekday: 'short' });
                const styles = getDateCardStyle(offset);

                return (
                  <div
                    key={offset}
                    onClick={() => handleDateChange(isoDate)}
                    className={styles.container}
                  >
                    <div className="w-20 h-24 flex flex-col items-center justify-between p-2">
                      <div className={styles.topLabel}>{getDateLabel(dateObj)}</div>
                      <div className={styles.month}>{month}</div>
                      <div className={styles.day}>{day}</div>
                      <div className={styles.weekday}>{dayOfWeekLabel}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <button
              onClick={() => updateDate(true)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              title="Next day"
            >
              <ChevronRightIcon className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          <div className="flex justify-center gap-4">
            <button
              onClick={() => setShowCalendar(true)}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              Choose Date
            </button>
            {selectedDate !== getTodaysDateInYYYYMMDDFormat() && (
              <button
                onClick={() => handleDateChange(getTodaysDateInYYYYMMDDFormat())}
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
              >
                Reset To Today
              </button>
            )}
          </div>
        </div>
      )}

      {showCalendar && (
        <div 
          ref={calendarRef} 
          className="fixed inset-0 flex items-center justify-center bg-black/50 z-50"
        >
          <div className="bg-white p-4 rounded-xl shadow-xl">
            <input
              type="date"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
              value={selectedDate}
              onChange={(e) => {
                handleDateChange(e.target.value);
                setShowCalendar(false);
              }}
            />
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowCalendar(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateSelectorBar;
