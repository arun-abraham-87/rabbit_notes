// src/components/TimeZoneDisplay.js
import React, { useState, useEffect } from 'react';

const TimeZoneDisplay = ({ selectedTimezones = [] }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Get base timezone from localStorage, default to AEST if not set
  const baseTimezone = localStorage.getItem('baseTimezone') || 'Australia/Sydney';

  // Default timezones if none are selected
  const defaultTimezones = [
    { label: baseTimezone.split('/').pop().replace('_', ' '), timeZone: baseTimezone },
    { label: 'IST', timeZone: 'Asia/Kolkata' },
    { label: 'EST', timeZone: 'America/New_York' },
    { label: 'PST', timeZone: 'America/Los_Angeles' },
    { label: 'GMT', timeZone: 'Europe/London' },
  ];

  // Map zone labels to flag emojis
  const flagMap = {
    'Australia/Sydney': '🇦🇺',
    'Asia/Kolkata': '🇮🇳',
    'America/New_York': '🇺🇸',
    'America/Los_Angeles': '🇺🇸',
    'Europe/London': '🇬🇧',
    'Europe/Paris': '🇫🇷',
    'Asia/Tokyo': '🇯🇵',
    'Asia/Singapore': '🇸🇬',
    'Asia/Hong_Kong': '🇭🇰',
    'Asia/Shanghai': '🇨🇳',
    'Europe/Moscow': '🇷🇺',
    'Africa/Johannesburg': '🇿🇦',
    'America/Sao_Paulo': '🇧🇷',
    'Pacific/Auckland': '🇳🇿',
  };

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
   * Compute the hour‑difference between base timezone and any other zone.
   */
  const getTimeDiffFromBase = (targetZone) => {
    try {
      const now = new Date();
      
      // Use Intl.DateTimeFormat to get timezone offsets
      const baseFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: baseTimezone,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false
      });
      
      const targetFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: targetZone,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false
      });
      
      const baseParts = baseFormatter.formatToParts(now);
      const targetParts = targetFormatter.formatToParts(now);
      
      const baseHour = parseInt(baseParts.find(p => p.type === 'hour').value);
      const targetHour = parseInt(targetParts.find(p => p.type === 'hour').value);
      
      let diffHrs = targetHour - baseHour;
      
      // Adjust for date differences
      const baseDay = parseInt(baseParts.find(p => p.type === 'day').value);
      const targetDay = parseInt(targetParts.find(p => p.type === 'day').value);
      
      if (targetDay > baseDay) diffHrs += 24;
      else if (targetDay < baseDay) diffHrs -= 24;
      
      if (diffHrs === 0) return '';
      return diffHrs > 0
        ? `${Math.abs(diffHrs)}h ahead`
        : `${Math.abs(diffHrs)}h behind`;
    } catch (error) {
      console.warn('Error calculating timezone difference:', error);
      return '';
    }
  };

  /**
   * Returns the numeric hour-difference between base timezone and the given zone.
   */
  const getTimeDiffHours = (targetZone) => {
    try {
      const now = new Date();
      
      // Use Intl.DateTimeFormat to get timezone offsets
      const baseFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: baseTimezone,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false
      });
      
      const targetFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: targetZone,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false
      });
      
      const baseParts = baseFormatter.formatToParts(now);
      const targetParts = targetFormatter.formatToParts(now);
      
      const baseHour = parseInt(baseParts.find(p => p.type === 'hour').value);
      const targetHour = parseInt(targetParts.find(p => p.type === 'hour').value);
      
      let diffHrs = targetHour - baseHour;
      
      // Adjust for date differences
      const baseDay = parseInt(baseParts.find(p => p.type === 'day').value);
      const targetDay = parseInt(targetParts.find(p => p.type === 'day').value);
      
      if (targetDay > baseDay) diffHrs += 24;
      else if (targetDay < baseDay) diffHrs -= 24;
      
      return diffHrs;
    } catch (error) {
      console.warn('Error calculating timezone difference:', error);
      return 0;
    }
  };

  /**
   * Get time-based description based on hour
   */
  const getTimeDescription = (hour) => {
    if (hour >= 0 && hour < 6) return 'pre-dawn';
    if (hour >= 6 && hour < 8) return 'early morning';
    if (hour >= 8 && hour < 10) return 'mid-morning';
    if (hour >= 10 && hour < 12) return 'late morning';
    if (hour >= 12 && hour < 14) return 'early afternoon';
    if (hour >= 14 && hour < 16) return 'mid-afternoon';
    if (hour >= 16 && hour < 18) return 'early evening';
    if (hour >= 18 && hour < 20) return 'evening';
    if (hour >= 20 && hour < 21) return 'late evening';
    if (hour >= 21 && hour < 24) return 'night';
    return 'night';
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
      : 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 text-white';

    // Compute offset relative to base timezone
    const baseLabel = baseTimezone.split('/').pop().replace('_', ' ');
    const diff = label === baseLabel ? null : getTimeDiffFromBase(timeZone);

    // Determine if this zone's date is before/after base timezone date
    const zoneYMD = formatYMD(now, timeZone);
    const baseYMD = formatYMD(now, baseTimezone);
    let dayLabel ='Today';
    let relativeDayText = 'Today';
    if (zoneYMD < baseYMD) {
      dayLabel = 'Previous Day';
      relativeDayText = 'yesterday';
    } else if (zoneYMD > baseYMD) {
      dayLabel = 'Next Day';
      relativeDayText = 'tomorrow';
    }

    // Get time-based description
    const timeDescription = getTimeDescription(hourNum);
    const enhancedRelativeDayText = `${relativeDayText} ${timeDescription}`;

    const formattedDate = new Intl.DateTimeFormat('en-US', {
      timeZone,
      month: 'short',
      day: 'numeric',
    }).format(now);

    // Color code AM vs. PM
    const color = ampm === 'AM' ? 'text-green-500' : 'text-orange-500';

    return (
      <div className={`${cardBgClasses} shadow-md rounded-lg p-4 w-auto`}>
        <div className="flex justify-between items-center mb-2">
          <div className="text-lg font-bold">
            {label} {flagMap[timeZone] || ''}
          </div>
          <span className={animation}>{icon}</span>
        </div>

        <div className="text-xs text-gray-500">
        <span className="block italic mb-1">{enhancedRelativeDayText}</span>
        </div>

        <div className={`text-lg font-semibold ${color} whitespace-nowrap`}>
          {timeStr} {ampm}
        </div>

        <div className="text-xs text-gray-500">
          {formattedDate}
          
        </div>
        <div className="text-xs text-gray-500">
          {diff && (
            <span className="inline-block mt-0 text-sm text-gray-400 whitespace-nowrap">
              {diff}
            </span>
          )}
        </div> 
  
      </div>
    );
  };

  // Use selected timezones or default ones
  const timezonesToShow = selectedTimezones.length > 0
    ? selectedTimezones.map(tz => ({
        label: tz.split('/').pop().replace('_', ' '),
        timeZone: tz
      }))
    : defaultTimezones;

  // Enrich with numeric diff, dayLabel, and sort by absolute distance from base timezone (nearest to farthest)
  const sortedZones = timezonesToShow
    .map(z => {
      const diffHrs = getTimeDiffHours(z.timeZone);
      const now = new Date();
      const zoneYMD = formatYMD(now, z.timeZone);
      const baseYMD = formatYMD(now, baseTimezone);
      const dayLabel =
        zoneYMD < baseYMD
          ? 'Previous Day'
          : zoneYMD > baseYMD
            ? 'Next Day'
            : 'Same Day';
      return { ...z, diffHrs, dayLabel };
    })
    .sort((a, b) => Math.abs(a.diffHrs) - Math.abs(b.diffHrs));

  return (
    <div className="bg-gray-100 p-4 rounded-lg">
      <div className="flex flex-row space-x-4 overflow-x-auto">
        {sortedZones.map(({ label, timeZone, dayLabel }, index) => (
          <React.Fragment key={label}>
            {index > 0 && sortedZones[index - 1].dayLabel !== dayLabel && (
              <div className="w-2 h-full bg-black mx-2" />
            )}
            <ZoneCard label={label} timeZone={timeZone} />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default TimeZoneDisplay;