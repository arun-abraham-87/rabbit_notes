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

  const getZonedTimeParts = (date, timeZone) => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(date);

    const valueByType = parts.reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});

    return {
      hour: parseInt(valueByType.hour, 10) % 24,
      minute: parseInt(valueByType.minute, 10),
      second: parseInt(valueByType.second, 10),
    };
  };

  const AnalogClock = ({ hour, minute, second, isDay }) => {
    const hourAngle = ((hour % 12) + minute / 60) * 30;
    const minuteAngle = (minute + second / 60) * 6;
    const secondAngle = second * 6;
    const tickColor = isDay ? '#475569' : '#cbd5e1';
    const faceFill = isDay ? 'rgba(255, 255, 255, 0.78)' : 'rgba(15, 23, 42, 0.64)';
    const faceStroke = isDay ? 'rgba(148, 163, 184, 0.55)' : 'rgba(226, 232, 240, 0.32)';
    const handColor = isDay ? '#111827' : '#f8fafc';
    const accentColor = isDay ? '#2563eb' : '#38bdf8';
    const secondColor = isDay ? '#ef4444' : '#fb7185';

    return (
      <svg
        className="h-24 w-24 sm:h-28 sm:w-28 flex-shrink-0 drop-shadow-sm"
        viewBox="0 0 120 120"
        role="img"
        aria-label={`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} analog clock`}
      >
        <circle cx="60" cy="60" r="55" fill={faceFill} stroke={faceStroke} strokeWidth="3" />
        <circle cx="60" cy="60" r="48" fill="none" stroke={faceStroke} strokeWidth="1" />
        {Array.from({ length: 12 }).map((_, index) => {
          const angle = index * 30;
          const isQuarter = index % 3 === 0;
          return (
            <line
              key={index}
              x1="60"
              y1={isQuarter ? '10' : '14'}
              x2="60"
              y2={isQuarter ? '20' : '18'}
              stroke={tickColor}
              strokeWidth={isQuarter ? '3' : '1.5'}
              strokeLinecap="round"
              transform={`rotate(${angle} 60 60)`}
            />
          );
        })}
        {[12, 3, 6, 9].map((number) => {
          const angle = (number % 12) * 30 - 90;
          const radius = 36;
          const x = 60 + Math.cos((angle * Math.PI) / 180) * radius;
          const y = 60 + Math.sin((angle * Math.PI) / 180) * radius + 4;
          return (
            <text
              key={number}
              x={x}
              y={y}
              textAnchor="middle"
              fontSize="12"
              fontWeight="700"
              fill={tickColor}
            >
              {number}
            </text>
          );
        })}
        <line
          x1="60"
          y1="64"
          x2="60"
          y2="33"
          stroke={handColor}
          strokeWidth="5"
          strokeLinecap="round"
          transform={`rotate(${hourAngle} 60 60)`}
        />
        <line
          x1="60"
          y1="66"
          x2="60"
          y2="23"
          stroke={accentColor}
          strokeWidth="3.5"
          strokeLinecap="round"
          transform={`rotate(${minuteAngle} 60 60)`}
        />
        <line
          x1="60"
          y1="70"
          x2="60"
          y2="18"
          stroke={secondColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          transform={`rotate(${secondAngle} 60 60)`}
        />
        <circle cx="60" cy="60" r="5" fill={accentColor} />
        <circle cx="60" cy="60" r="2" fill={secondColor} />
      </svg>
    );
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
   * A single card showing the time in one zone.
   */
  const ZoneCard = ({ label, timeZone }) => {
    const now = time;
    const { hour, minute, second } = getZonedTimeParts(now, timeZone);

    // Determine day vs. night for icon + animation
    const hourNum = hour;
    const isDay = hourNum >= 6 && hourNum < 18;
    const icon = isDay ? '☀️' : '🌙';
    const animation = isDay ? 'animate-bounce' : 'animate-pulse';

    // Conditional background: gradient at night
    const cardBgClasses = isDay
      ? 'bg-gradient-to-br from-yellow-100 via-white to-blue-100 text-gray-700 border border-yellow-200/70'
      : 'bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 text-white border border-gray-700';

    // Compute offset relative to base timezone
    const baseLabel = baseTimezone.split('/').pop().replace('_', ' ');
    const diff = label === baseLabel ? null : getTimeDiffFromBase(timeZone);

    // Format time as 12-hour format for display in brackets
    const formattedTime12 = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
    }).format(now);

    const formattedDate = new Intl.DateTimeFormat('en-US', {
      timeZone,
      month: 'short',
      day: 'numeric',
    }).format(now);

    // Color code based on hour: morning/afternoon green, evening/night orange
    const color = isDay ? 'text-green-600' : 'text-orange-300';
    const mutedText = isDay ? 'text-gray-500' : 'text-gray-300';
    const quietText = isDay ? 'text-gray-400' : 'text-gray-400';

    return (
      <div className={`${cardBgClasses} shadow-md rounded-lg p-3 sm:p-4 flex min-w-[176px] flex-1 flex-col items-center overflow-hidden`}>
        <div className="mb-2 flex w-full items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-xs font-bold sm:text-sm" title={label}>
              {label}
            </span>
            <span className="text-sm flex-shrink-0">{flagMap[timeZone] || ''}</span>
            <span className={`${animation} text-xs flex-shrink-0`}>{icon}</span>
          </div>
          <div className={`text-sm font-semibold sm:text-base ${color} whitespace-nowrap flex-shrink-0`}>
            {formattedTime12}
          </div>
        </div>

        <AnalogClock hour={hour} minute={minute} second={second} isDay={isDay} />

        <div className={`mt-2 flex w-full items-center justify-between gap-2 text-[10px] sm:text-xs ${mutedText}`}>
          <span className="whitespace-nowrap">{formattedDate}</span>
          {diff && (
            <span className={`text-[10px] sm:text-xs ${quietText} whitespace-nowrap`}>
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

  // Function to get time tier based on hour (morning, afternoon, late night, early morning)
  const getTimeTier = (hour) => {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 24) return 'lateNight'; // 6 PM - midnight
    return 'earlyMorning'; // midnight - 6 AM
  };

  // Enrich with numeric diff/date/tier for stable display ordering.
  const enrichedZones = timezonesToShow
    .map(z => {
      const diffHrs = getTimeDiffHours(z.timeZone);
      const zoneYMD = formatYMD(time, z.timeZone);
      const { hour } = getZonedTimeParts(time, z.timeZone);
      const hourNum = hour;
      const tier = getTimeTier(hourNum);
      
      return { ...z, diffHrs, tier, zoneYMD };
    })
    .sort((a, b) => {
      // First sort by date (YMD): earlier dates first
      const dateDiff = a.zoneYMD.localeCompare(b.zoneYMD);
      if (dateDiff !== 0) return dateDiff;
      
      // Then sort by tier order within same date
      const tierOrder = { earlyMorning: 0, morning: 1, afternoon: 2, lateNight: 3 };
      const tierDiff = tierOrder[a.tier] - tierOrder[b.tier];
      if (tierDiff !== 0) return tierDiff;
      
      // Then sort by diffHrs: most negative (trailing) first, most positive (forward) last
      return a.diffHrs - b.diffHrs;
    });

  return (
    <div className="bg-gray-100 p-2 sm:p-3 rounded-lg">
      <div className="flex gap-2 overflow-x-auto pb-1 sm:gap-3">
        {enrichedZones.map(({ label, timeZone }) => (
          <ZoneCard key={label} label={label} timeZone={timeZone} />
        ))}
      </div>
    </div>
  );
};

export default TimeZoneDisplay;
