// src/components/TimeZoneDisplay.js
import React from 'react';

/**
 * List of zones to display.
 */
const timeZones = [
  { label: 'AEST',    timeZone: 'Australia/Sydney' },
  { label: 'IST',     timeZone: 'Asia/Kolkata' },
  { label: 'EST',     timeZone: 'Etc/GMT+5' },
  { label: 'EDT',     timeZone: 'America/New_York' },
  { label: 'PST',     timeZone: 'America/Los_Angeles' },
  { label: 'Bristol', timeZone: 'Etc/GMT-1' },
];

/**
 * Helper to format a date as YYYY-MM-DD in a given timezone.
 */
const formatYMD = (date, tz) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);

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
  const now = new Date();

  // Properly format time in target timezone
  const formattedTime = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: true,
    hour: '2-digit',
    minute: '2-digit',
  }).format(now);
  const [timeStr, ampm] = formattedTime.split(' ');

  // Determine day vs. night for icon + animation
  const hour = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    hour: 'numeric',
  }).format(now);
  const hourNum = parseInt(hour, 10);
  const isDay = hourNum >= 6 && hourNum < 18;
  const icon = isDay ? '☀️' : '🌙';
  const animation = isDay ? 'animate-bounce' : 'animate-pulse';

  // Conditional background: gradient at night
  const cardBgClasses = isDay
    ? 'bg-gradient-to-br from-yellow-100 via-white to-blue-100 text-gray-700'
    : 'bg-gradient-to-br from-blue-900 via-black to-blue-800 text-white';

  // Compute offset relative to AEST
  const diff = label === 'AEST' ? null : getTimeDiffFromAEST(timeZone);

  // Determine if this zone’s date is before/after AEST date
  const zoneYMD = formatYMD(now, timeZone);
  const aestYMD = formatYMD(now, 'Australia/Sydney');
  let dayLabel = 'Same Day';
  if (zoneYMD < aestYMD) dayLabel = 'Previous Day';
  else if (zoneYMD > aestYMD) dayLabel = 'Next Day';

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    timeZone,
    month: 'short',
    day: 'numeric',
  }).format(now);

  // Color code AM vs. PM
  const color = ampm === 'AM' ? 'text-green-500' : 'text-orange-500';

  return (
    <div className={`${cardBgClasses} shadow-md rounded-lg p-8 w-auto`}>
      <div className="flex justify-between text-sm text-gray-500 mb-1">
        <span className="font-bold">{label}</span>
        <span className={animation}>{icon}</span>
      </div>

      <div className={`text-xl font-semibold ${color} whitespace-nowrap`}>
        {timeStr} {ampm}
      </div>

      <div className="text-sm text-gray-500">
        <span className="block italic mb-1">{dayLabel}</span>
        {formattedDate}
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