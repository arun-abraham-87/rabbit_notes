import React, { useState, useEffect } from 'react';
import { getAgeInStringFmt } from '../utils/DateUtils';

function daysDiff(targetDate) {
  const now = new Date();
  // Zero out time for accurate day diff
  now.setHours(0, 0, 0, 0);
  const date = new Date(targetDate);
  date.setHours(0, 0, 0, 0);
  const diff = Math.round((date - now) / (1000 * 60 * 60 * 24));
  
  // Debug logging for date calculations
  console.log('daysDiff Debug:', {
    targetDate,
    date,
    now,
    diff,
    rawDiff: (date - now) / (1000 * 60 * 60 * 24)
  });
  
  return diff;
}

function weeksDiff(targetDate) {
  const now = new Date();
  // Zero out time for accurate week diff
  now.setHours(0, 0, 0, 0);
  const date = new Date(targetDate);
  date.setHours(0, 0, 0, 0);
  return Math.round((date - now) / (1000 * 60 * 60 * 24 * 7));
}

function monthsDiff(targetDate) {
  const now = new Date();
  // Zero out time for accurate month diff
  now.setHours(0, 0, 0, 0);
  const date = new Date(targetDate);
  date.setHours(0, 0, 0, 0);
  return Math.round((date - now) / (1000 * 60 * 60 * 24 * 30.44)); // Average days per month
}

function yearsDiff(targetDate) {
  const now = new Date();
  // Zero out time for accurate year diff
  now.setHours(0, 0, 0, 0);
  const date = new Date(targetDate);
  date.setHours(0, 0, 0, 0);
  return Math.round((date - now) / (1000 * 60 * 60 * 24 * 365.25)); // Average days per year
}

function getTimeUnitValue(daysDiff, displayMode) {
  switch (displayMode) {
    case 'weeks':
      const weeks = Math.floor(daysDiff / 7);
      const remainingDays = daysDiff % 7;
      return weeks > 0 ? `${weeks} week${weeks !== 1 ? 's' : ''}${remainingDays > 0 ? ` ${remainingDays} day${remainingDays !== 1 ? 's' : ''}` : ''}` : `${remainingDays} day${remainingDays !== 1 ? 's' : ''}`;
    case 'months':
      const months = Math.floor(daysDiff / 30.44);
      const remainingDaysInMonth = Math.floor(daysDiff % 30.44);
      return months > 0 ? `${months} month${months !== 1 ? 's' : ''}${remainingDaysInMonth > 0 ? ` ${remainingDaysInMonth} day${remainingDaysInMonth !== 1 ? 's' : ''}` : ''}` : `${remainingDaysInMonth} day${remainingDaysInMonth !== 1 ? 's' : ''}`;
    case 'years':
      const years = Math.floor(daysDiff / 365.25);
      const remainingDaysInYear = Math.floor(daysDiff % 365.25);
      const monthsInYear = Math.floor(remainingDaysInYear / 30.44);
      if (years > 0) {
        return `${years} year${years !== 1 ? 's' : ''}${monthsInYear > 0 ? ` ${monthsInYear} month${monthsInYear !== 1 ? 's' : ''}` : ''}`;
      } else {
        return monthsInYear > 0 ? `${monthsInYear} month${monthsInYear !== 1 ? 's' : ''}` : `${remainingDaysInYear} day${remainingDaysInYear !== 1 ? 's' : ''}`;
      }
    default:
      return `${daysDiff} day${daysDiff !== 1 ? 's' : ''}`;
  }
}

function getThisYearDate(date) {
  const originalDate = new Date(date);
  const now = new Date();
  
  // If the original date is in the future, keep it as is
  if (originalDate > now) {
    return originalDate;
  }
  
  // If the original date is in the past, use this year's date
  return new Date(now.getFullYear(), originalDate.getMonth(), originalDate.getDate());
}

export default function CountdownCard({ title, date, useThisYear, isPinned = false, onTogglePin }) {
  const [displayMode, setDisplayMode] = useState(() => {
    try {
      const stored = localStorage.getItem('countdownDisplayMode');
      return stored || 'days';
    } catch (error) {
      console.error('Error loading countdown display mode:', error);
      return 'days';
    }
  });

  const toggleDisplayMode = () => {
    const modes = ['days', 'weeks', 'months', 'years'];
    const currentIndex = modes.indexOf(displayMode);
    const newIndex = (currentIndex + 1) % modes.length;
    const newMode = modes[newIndex];
    setDisplayMode(newMode);
    try {
      localStorage.setItem('countdownDisplayMode', newMode);
    } catch (error) {
      console.error('Error saving countdown display mode:', error);
    }
  };

  const displayDate = useThisYear ? getThisYearDate(date) : date;
  const totalDays = daysDiff(displayDate);
  
  // Debug logging
  console.log('CountdownCard Debug:', {
    title,
    originalDate: date,
    displayDate,
    useThisYear,
    totalDays,
    now: new Date()
  });
  
  let diff, timeUnit, displayText;
  switch (displayMode) {
    case 'weeks':
      const weeks = Math.floor(totalDays / 7);
      const remainingDays = totalDays % 7;
      diff = weeks;
      timeUnit = 'weeks';
      displayText = weeks > 0 ? `${weeks} week${weeks !== 1 ? 's' : ''}${remainingDays > 0 ? ` ${remainingDays} day${remainingDays !== 1 ? 's' : ''}` : ''}` : `${remainingDays} day${remainingDays !== 1 ? 's' : ''}`;
      break;
    case 'months':
      const months = Math.floor(totalDays / 30.44);
      const remainingDaysInMonth = Math.floor(totalDays % 30.44);
      diff = months;
      timeUnit = 'months';
      displayText = months > 0 ? `${months} month${months !== 1 ? 's' : ''}${remainingDaysInMonth > 0 ? ` ${remainingDaysInMonth} day${remainingDaysInMonth !== 1 ? 's' : ''}` : ''}` : `${remainingDaysInMonth} day${remainingDaysInMonth !== 1 ? 's' : ''}`;
      break;
    case 'years':
      const years = Math.floor(totalDays / 365.25);
      const remainingDaysInYear = Math.floor(totalDays % 365.25);
      const monthsInYear = Math.floor(remainingDaysInYear / 30.44);
      diff = years;
      timeUnit = 'years';
      if (years > 0) {
        displayText = `${years} year${years !== 1 ? 's' : ''}${monthsInYear > 0 ? ` ${monthsInYear} month${monthsInYear !== 1 ? 's' : ''}` : ''}`;
      } else {
        displayText = monthsInYear > 0 ? `${monthsInYear} month${monthsInYear !== 1 ? 's' : ''}` : `${remainingDaysInYear} day${remainingDaysInYear !== 1 ? 's' : ''}`;
      }
      break;
    default:
      diff = totalDays;
      timeUnit = 'days';
      displayText = `${totalDays} day${totalDays !== 1 ? 's' : ''}`;
  }
  
  const isPast = totalDays < 0;
  const cardColor = 'bg-white';
  const borderColor = 'border border-gray-200';
  const textColor = 'text-gray-900';

  // For alternate display
  const originalDiff = daysDiff(date);
  const originalIsPast = originalDiff < 0;
  const thisYearDate = getThisYearDate(date);
  const thisYearDiff = daysDiff(thisYearDate);
  const thisYearIsPast = thisYearDiff < 0;
  
  const handlePinClick = (e) => {
    e.stopPropagation();
    if (onTogglePin) {
      onTogglePin();
    }
  };

  return (
    <div 
      className={`rounded-xl shadow-md p-6 w-64 ${cardColor} ${borderColor} flex flex-col items-center cursor-pointer hover:shadow-lg transition-shadow relative`}
      onClick={toggleDisplayMode}
      title={`Click to cycle through days, weeks, months, years (currently showing ${timeUnit})`}
    >
      {/* Pin Button */}
      {onTogglePin && (
        <button
          onClick={handlePinClick}
          className={`absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100 transition-colors ${
            isPinned ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
          }`}
          title={isPinned ? 'Unpin event' : 'Pin event'}
        >
          {isPinned ? '📌' : '📍'}
        </button>
      )}
      
      <div className={`text-lg font-bold mb-2 ${textColor} ${isPinned ? 'pr-8' : ''}`}>{title}</div>
      <div className={`text-3xl font-bold text-center mb-2 ${textColor}`}>
        {displayText}
      </div>
      <div className="text-gray-700 text-center">
        {isPast
          ? `since ${displayDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
          : `until ${displayDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}
      </div>
    </div>
  );
} 