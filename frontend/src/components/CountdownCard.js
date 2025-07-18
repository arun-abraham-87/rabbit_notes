import React, { useState, useEffect } from 'react';
import { getAgeInStringFmt } from '../utils/DateUtils';

function daysDiff(targetDate) {
  const now = new Date();
  // Zero out time for accurate day diff
  now.setHours(0, 0, 0, 0);
  const date = new Date(targetDate);
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date - now) / (1000 * 60 * 60 * 24));
}

function weeksDiff(targetDate) {
  const now = new Date();
  // Zero out time for accurate week diff
  now.setHours(0, 0, 0, 0);
  const date = new Date(targetDate);
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date - now) / (1000 * 60 * 60 * 24 * 7));
}

function monthsDiff(targetDate) {
  const now = new Date();
  // Zero out time for accurate month diff
  now.setHours(0, 0, 0, 0);
  const date = new Date(targetDate);
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date - now) / (1000 * 60 * 60 * 24 * 30.44)); // Average days per month
}

function yearsDiff(targetDate) {
  const now = new Date();
  // Zero out time for accurate year diff
  now.setHours(0, 0, 0, 0);
  const date = new Date(targetDate);
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date - now) / (1000 * 60 * 60 * 24 * 365.25)); // Average days per year
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
  const d = new Date(date);
  const now = new Date();
  return new Date(now.getFullYear(), d.getMonth(), d.getDate());
}

export default function CountdownCard({ title, date, useThisYear }) {
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
  
  return (
    <div 
      className={`rounded-xl shadow-md p-6 w-64 ${cardColor} ${borderColor} flex flex-col items-center cursor-pointer hover:shadow-lg transition-shadow`}
      onClick={toggleDisplayMode}
      title={`Click to cycle through days, weeks, months, years (currently showing ${timeUnit})`}
    >
      <div className={`text-lg font-bold mb-2 ${textColor}`}>{title}</div>
      <div className={`text-3xl font-bold text-center mb-2 ${textColor}`}>
        {displayText}
      </div>
      <div className="text-gray-700 text-center">
        {isPast
          ? `${displayText} since ${displayDate.toLocaleDateString('en-GB')}`
          : `${displayText} until ${displayDate.toLocaleDateString('en-GB')}`}
      </div>
      <div className="text-xs text-gray-500 text-center mt-1">
        {Math.abs(totalDays)} days
      </div>
      <div className="text-xs text-gray-500 mt-1">{getAgeInStringFmt(displayDate)}</div>
      {useThisYear && (
        <div className="mt-2 text-xs text-gray-500 text-center">
          <div>
            <span className="font-semibold">Original:</span> {originalIsPast ? `${getTimeUnitValue(originalDiff, displayMode)} since ${date.toLocaleDateString('en-GB')}` : `${getTimeUnitValue(originalDiff, displayMode)} until ${date.toLocaleDateString('en-GB')}`}
          </div>
        </div>
      )}
      {!useThisYear && (
        <div className="mt-2 text-xs text-gray-500 text-center">
          <div>
            <span className="font-semibold">This Year:</span> {thisYearIsPast ? `${getTimeUnitValue(thisYearDiff, displayMode)} since ${thisYearDate.toLocaleDateString('en-GB')}` : `${getTimeUnitValue(thisYearDiff, displayMode)} until ${thisYearDate.toLocaleDateString('en-GB')}`}
          </div>
        </div>
      )}
    </div>
  );
} 