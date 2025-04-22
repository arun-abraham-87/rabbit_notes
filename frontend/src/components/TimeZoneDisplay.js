// src/components/TimeZoneDisplay.js
import React from 'react';

/**
 * List of zones to display.
 */
const timeZones = [
  { label: 'AEST', timeZone: 'Australia/Sydney' },
  { label: 'IST',  timeZone: 'Asia/Kolkata' },
  { label: 'EST',  timeZone: 'America/New_York' },
  { label: 'PST',  timeZone: 'America/Los_Angeles' },
];

/**
 * Compute the hour‑difference between AEST and any other zone.
 */
const getTimeDiffFromAEST = (targetZone) => {
  const aestDate   = new Date(new Date().toLocaleString('en-US', { timeZone: 'Australia/Sydney' }));
  const targetDate = new Date(new Date().toLocaleString('en-US', { timeZone: targetZone }));
  const diffMs     = aestDate - targetDate;
  const diffHrs    = Math.round(diffMs / 3600000);
  if (diffHrs === 0) return '';
  return diffHrs > 0
    ? `${Math.abs(diffHrs)}h behind`
    : `${Math.abs(diffHrs)}h ahead`;
};

/**
 * Returns the numeric hour-difference between AEST and the given zone.
 */
const getTimeDiffHours = (targetZone) => {
  const aestDate   = new Date(new Date().toLocaleString('en-US', { timeZone: 'Australia/Sydney' }));
  const targetDate = new Date(new Date().toLocaleString('en-US', { timeZone: targetZone }));
  return Math.round((aestDate - targetDate) / 3600000);
};

/**
 * A single card showing the time in one zone.
 */
const ZoneCard = ({ label, timeZone }) => {
  // Build a Date object scoped to that zone
  const zoneDate = new Date(
    new Date().toLocaleString('en-US', { timeZone })
  );

  // Determine day vs. night for icon + animation
  const hour      = zoneDate.getHours();
  const isDay     = hour >= 6 && hour < 18;
  const icon      = isDay ? '☀️' : '🌙';
  const animation = isDay ? 'animate-bounce' : 'animate-pulse';

  // Format HH:MM AM/PM
  const [timeStr, ampm] = zoneDate
    .toLocaleString('en-US', {
      timeZone,
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
    })
    .split(' ');

  // Color code AM vs. PM
  const color = ampm === 'AM' ? 'text-green-500' : 'text-orange-500';

  // Compute offset relative to AEST
  const diff = label === 'AEST' ? null : getTimeDiffFromAEST(timeZone);

  return (
    <div className="bg-white shadow-md rounded-lg p-8 border border-gray-200 w-auto">
      <div className="flex justify-between text-sm text-gray-500 mb-1">
        <span className="font-bold">{label}</span>
        <span className={animation}>{icon}</span>
      </div>

      <div className={`text-xl font-semibold ${color} whitespace-nowrap`}>
        {timeStr} {ampm}
      </div>

      <div className="text-sm text-gray-500">
        {zoneDate.toLocaleDateString('en-US', {
          timeZone,
          month: 'short',
          day: 'numeric',
        })}
        {diff && (
          <span className="block mt-1 text-2xl text-gray-400">
            {diff}
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * Renders the full grid of ZoneCards.
 */
const TimeZoneDisplay = () => {
  // Enrich with numeric diff and sort by diffHrs ascending (least behind first)
  const sortedZones = timeZones
    .map(z => ({ ...z, diffHrs: getTimeDiffHours(z.timeZone) }))
    .sort((a, b) => a.diffHrs - b.diffHrs);

  return (
    <div className="bg-gray-100 p-8 rounded-lg">
      <div className="flex flex-col space-y-4">
        {sortedZones.map(({ label, timeZone }) => (
          <ZoneCard key={label} label={label} timeZone={timeZone} />
        ))}
      </div>
    </div>
  );
};

export default TimeZoneDisplay;