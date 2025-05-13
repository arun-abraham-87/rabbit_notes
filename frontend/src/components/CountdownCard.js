import React from 'react';

function daysDiff(targetDate) {
  const now = new Date();
  // Zero out time for accurate day diff
  now.setHours(0, 0, 0, 0);
  const date = new Date(targetDate);
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date - now) / (1000 * 60 * 60 * 24));
}

export default function CountdownCard({ title, date, highlight }) {
  const diff = daysDiff(date);
  const isPast = diff < 0;
  const cardColor = highlight ? 'bg-rose-300' : 'bg-white';
  const borderColor = highlight ? 'border-4 border-rose-400' : 'border border-gray-200';
  const textColor = highlight ? 'text-rose-900' : 'text-gray-900';

  return (
    <div className={`rounded-xl shadow-md p-6 w-64 ${cardColor} ${borderColor} flex flex-col items-center`}>
      <div className={`text-lg font-bold mb-2 ${textColor}`}>{title}</div>
      <div className={`text-5xl font-extrabold mb-2 ${textColor}`}>{Math.abs(diff)}</div>
      <div className="text-gray-700">
        {isPast
          ? `Days since ${date.toLocaleDateString('en-GB')}`
          : `Days until ${date.toLocaleDateString('en-GB')}`}
      </div>
    </div>
  );
} 