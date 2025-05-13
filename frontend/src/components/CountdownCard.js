import React from 'react';
import { getAgeInStringFmt } from '../utils/DateUtils';

function daysDiff(targetDate) {
  const now = new Date();
  // Zero out time for accurate day diff
  now.setHours(0, 0, 0, 0);
  const date = new Date(targetDate);
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date - now) / (1000 * 60 * 60 * 24));
}

function getThisYearDate(date) {
  const d = new Date(date);
  const now = new Date();
  return new Date(now.getFullYear(), d.getMonth(), d.getDate());
}

export default function CountdownCard({ title, date, useThisYear }) {
  const displayDate = useThisYear ? getThisYearDate(date) : date;
  const diff = daysDiff(displayDate);
  const isPast = diff < 0;
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
    <div className={`rounded-xl shadow-md p-6 w-64 ${cardColor} ${borderColor} flex flex-col items-center`}>
      <div className={`text-lg font-bold mb-2 ${textColor}`}>{title}</div>
      <div className={`text-5xl font-extrabold mb-2 ${textColor}`}>{Math.abs(diff)}</div>
      <div className="text-gray-700">
        {isPast
          ? `Days since ${displayDate.toLocaleDateString('en-GB')}`
          : `Days until ${displayDate.toLocaleDateString('en-GB')}`}
      </div>
      <div className="text-xs text-gray-500 mt-1">{getAgeInStringFmt(displayDate)}</div>
      {useThisYear && (
        <div className="mt-2 text-xs text-gray-500 text-center">
          <div>
            <span className="font-semibold">Original:</span> {originalIsPast ? `Days since ${date.toLocaleDateString('en-GB')}` : `Days until ${date.toLocaleDateString('en-GB')}`} ({Math.abs(originalDiff)})
          </div>
        </div>
      )}
      {!useThisYear && (
        <div className="mt-2 text-xs text-gray-500 text-center">
          <div>
            <span className="font-semibold">This Year:</span> {thisYearIsPast ? `Days since ${thisYearDate.toLocaleDateString('en-GB')}` : `Days until ${thisYearDate.toLocaleDateString('en-GB')}`} ({Math.abs(thisYearDiff)})
          </div>
        </div>
      )}
    </div>
  );
} 