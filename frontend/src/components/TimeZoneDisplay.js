// src/components/TimeZoneDisplay.js
import React, { useState, useEffect } from 'react';

const TimeZoneDisplay = ({ selectedTimezones = [], showAnalogClock = true, showTimeBuddy = true, clockFace = 'classic' }) => {
  const [time, setTime] = useState(new Date());
  const [referenceMinuteOverride, setReferenceMinuteOverride] = useState(null);
  const [referenceTimezone, setReferenceTimezone] = useState(() => {
    try {
      return localStorage.getItem('timeBuddyReferenceTimezone') || 'Australia/Melbourne';
    } catch {
      return 'Australia/Melbourne';
    }
  });

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Get base timezone from localStorage, default to AEST if not set
  const baseTimezone = localStorage.getItem('baseTimezone') || 'Australia/Sydney';

  // Default timezones if none are selected
  const defaultTimezones = [
    { label: getCityLabel(baseTimezone), timeZone: baseTimezone },
    { label: 'Mumbai', timeZone: 'Asia/Kolkata' },
    { label: 'New York', timeZone: 'America/New_York' },
    { label: 'San Francisco', timeZone: 'America/Los_Angeles' },
    { label: 'London', timeZone: 'Europe/London' },
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

  const getZonedDateTimeParts = (date, timeZone) => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(date);

    return parts.reduce((acc, part) => {
      if (part.type !== 'literal') acc[part.type] = part.value;
      return acc;
    }, {});
  };

  const getMinutesInZone = (date, timeZone) => {
    const parts = getZonedDateTimeParts(date, timeZone);
    return (parseInt(parts.hour, 10) * 60) + parseInt(parts.minute, 10);
  };

  const formatSliderTime = (minutes) => {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${String(displayHour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${suffix}`;
  };

  function getCityLabel(timeZone) {
    const cityLabelMap = {
      'America/Los_Angeles': 'San Francisco',
      'America/New_York': 'New York',
      'Europe/London': 'London',
      'Asia/Kolkata': 'Mumbai',
      'Australia/Sydney': 'Sydney',
    };

    return cityLabelMap[timeZone] || timeZone.split('/').pop().replace('_', ' ');
  }

  const getNewYorkMarketTimer = (date) => {
    const nyParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      weekday: 'short',
      hourCycle: 'h23',
      hour: '2-digit',
      minute: '2-digit',
    }).formatToParts(date);

    const valueByType = nyParts.reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});

    const weekday = valueByType.weekday;
    const minutes = parseInt(valueByType.hour, 10) * 60 + parseInt(valueByType.minute, 10);
    const marketOpenMinutes = 9 * 60 + 30;
    const marketCloseMinutes = 16 * 60;
    const weekdayIndex = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].indexOf(weekday);
    const isWeekday = weekdayIndex !== -1;

    const formatDuration = (totalMinutes) => {
      const days = Math.floor(totalMinutes / (24 * 60));
      const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
      const mins = totalMinutes % 60;

      if (days > 0) return `${days}d ${hours}h ${mins}m`;
      if (hours > 0) return `${hours}h ${mins}m`;
      return `${mins}m`;
    };

    if (isWeekday && minutes >= marketOpenMinutes && minutes < marketCloseMinutes) {
      return {
        label: 'Market closes in',
        duration: formatDuration(marketCloseMinutes - minutes),
        isOpen: true
      };
    }

    let minutesUntilOpen;
    if (isWeekday && minutes < marketOpenMinutes) {
      minutesUntilOpen = marketOpenMinutes - minutes;
    } else if (isWeekday && weekdayIndex < 4) {
      minutesUntilOpen = (24 * 60 - minutes) + marketOpenMinutes;
    } else {
      const daysUntilMonday = weekday === 'Fri' ? 3 : weekday === 'Sat' ? 2 : 1;
      minutesUntilOpen = (24 * 60 - minutes) + ((daysUntilMonday - 1) * 24 * 60) + marketOpenMinutes;
    }

    return {
      label: 'Market opens in',
      duration: formatDuration(minutesUntilOpen),
      isOpen: false
    };
  };

  const AnalogClock = ({ hour, minute, second, isDay, face = 'classic' }) => {
    const hourAngle = ((hour % 12) + minute / 60) * 30;
    const minuteAngle = (minute + second / 60) * 6;
    const secondAngle = second * 6;
    const palettes = {
      classic: {
        tickColor: isDay ? '#475569' : '#cbd5e1',
        faceFill: isDay ? 'rgba(255, 255, 255, 0.78)' : 'rgba(15, 23, 42, 0.64)',
        faceStroke: isDay ? 'rgba(148, 163, 184, 0.55)' : 'rgba(226, 232, 240, 0.32)',
        handColor: isDay ? '#111827' : '#f8fafc',
        accentColor: isDay ? '#2563eb' : '#38bdf8',
        secondColor: isDay ? '#ef4444' : '#fb7185',
      },
      minimal: {
        tickColor: isDay ? '#94a3b8' : '#94a3b8',
        faceFill: isDay ? 'rgba(248, 250, 252, 0.7)' : 'rgba(2, 6, 23, 0.24)',
        faceStroke: isDay ? 'rgba(203, 213, 225, 0.75)' : 'rgba(148, 163, 184, 0.26)',
        handColor: isDay ? '#334155' : '#e2e8f0',
        accentColor: isDay ? '#64748b' : '#93c5fd',
        secondColor: isDay ? '#94a3b8' : '#bfdbfe',
      },
      numbers: {
        tickColor: isDay ? '#0f766e' : '#99f6e4',
        faceFill: isDay ? 'rgba(240, 253, 250, 0.86)' : 'rgba(19, 78, 74, 0.46)',
        faceStroke: isDay ? 'rgba(20, 184, 166, 0.38)' : 'rgba(153, 246, 228, 0.3)',
        handColor: isDay ? '#134e4a' : '#ecfeff',
        accentColor: isDay ? '#0d9488' : '#5eead4',
        secondColor: isDay ? '#f97316' : '#fdba74',
      },
    };
    const { tickColor, faceFill, faceStroke, handColor, accentColor, secondColor } = palettes[face] || palettes.classic;
    const showTicks = face !== 'minimal';
    const numbersToShow = face === 'numbers' ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] : [12, 3, 6, 9];

    return (
      <svg
        className="h-24 w-24 sm:h-28 sm:w-28 flex-shrink-0 drop-shadow-sm"
        viewBox="0 0 120 120"
        role="img"
        aria-label={`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} analog clock`}
      >
        <circle cx="60" cy="60" r="55" fill={faceFill} stroke={faceStroke} strokeWidth="3" />
        <circle cx="60" cy="60" r="48" fill="none" stroke={faceStroke} strokeWidth="1" />
        {showTicks && Array.from({ length: 12 }).map((_, index) => {
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
        {numbersToShow.map((number) => {
          const angle = (number % 12) * 30 - 90;
          const radius = face === 'numbers' ? 39 : 36;
          const x = 60 + Math.cos((angle * Math.PI) / 180) * radius;
          const y = 60 + Math.sin((angle * Math.PI) / 180) * radius + 4;
          return (
            <text
              key={number}
              x={x}
              y={y}
              textAnchor="middle"
              fontSize={face === 'numbers' ? '10' : '12'}
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
  const getTimeDiffFromBase = (targetZone, date = time, compareTimezone = baseTimezone) => {
    try {
      // Use Intl.DateTimeFormat to get timezone offsets
      const baseFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: compareTimezone,
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
      
      const baseParts = baseFormatter.formatToParts(date);
      const targetParts = targetFormatter.formatToParts(date);
      
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
  const getTimeDiffHours = (targetZone, date = time, compareTimezone = baseTimezone) => {
    try {
      // Use Intl.DateTimeFormat to get timezone offsets
      const baseFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: compareTimezone,
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
      
      const baseParts = baseFormatter.formatToParts(date);
      const targetParts = targetFormatter.formatToParts(date);
      
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
    const now = displayTime;
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

    // Compute offset relative to the active reference timezone.
    const compareTimezone = showTimeBuddy ? referenceTimezone : baseTimezone;
    const isReference = timeZone === compareTimezone;
    const diff = isReference ? null : getTimeDiffFromBase(timeZone, now, compareTimezone);

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
    const marketTimer = timeZone === 'America/New_York' ? getNewYorkMarketTimer(now) : null;

    return (
      <button
        type="button"
        onClick={() => {
          if (!showTimeBuddy) return;
          setReferenceTimezone(timeZone);
          setReferenceMinuteOverride(getMinutesInZone(displayTime, timeZone));
          try {
            localStorage.setItem('timeBuddyReferenceTimezone', timeZone);
          } catch { /* ignore */ }
        }}
        className={`${cardBgClasses} shadow-md rounded-lg p-3 sm:p-4 flex min-w-[176px] flex-1 flex-col items-center overflow-hidden text-left transition ${showTimeBuddy ? 'cursor-pointer hover:ring-2 hover:ring-blue-300' : 'cursor-default'} ${isReference && showTimeBuddy ? 'ring-2 ring-blue-500 ring-offset-2' : ''}`}
        title={showTimeBuddy ? `Use ${label} as Time Buddy reference` : label}
      >
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

        {showAnalogClock && (
          <AnalogClock hour={hour} minute={minute} second={second} isDay={isDay} face={clockFace} />
        )}

        <div className={`mt-2 flex w-full items-center justify-between gap-2 text-[10px] sm:text-xs ${mutedText}`}>
          <span className="whitespace-nowrap">{formattedDate}</span>
          {diff && (
            <span className={`text-[10px] sm:text-xs ${quietText} whitespace-nowrap`}>
              {diff}
            </span>
          )}
        </div>

        {marketTimer && (
          <div className={`mt-2 w-full rounded px-2 py-1 text-center text-[10px] font-semibold sm:text-xs ${
            marketTimer.isOpen
              ? 'bg-green-100 text-green-700'
              : isDay ? 'bg-blue-100 text-blue-700' : 'bg-slate-700 text-blue-200'
          }`}>
            {marketTimer.label}: {marketTimer.duration}
          </div>
        )}
  
      </button>
    );
  };

  // Use selected timezones or default ones
  const timezonesToShow = selectedTimezones.length > 0
    ? selectedTimezones.map(tz => ({
        label: getCityLabel(tz),
        timeZone: tz
      }))
    : defaultTimezones;

  const activeReferenceTimezone = showTimeBuddy ? referenceTimezone : baseTimezone;
  const currentReferenceMinutes = getMinutesInZone(time, activeReferenceTimezone);
  const effectiveReferenceMinuteOverride = showTimeBuddy ? referenceMinuteOverride : null;
  const selectedReferenceMinutes = effectiveReferenceMinuteOverride ?? currentReferenceMinutes;
  const displayTime = new Date(time.getTime() + ((selectedReferenceMinutes - currentReferenceMinutes) * 60000));
  const isViewingCurrentTime = effectiveReferenceMinuteOverride === null || effectiveReferenceMinuteOverride === currentReferenceMinutes;

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
      const diffHrs = getTimeDiffHours(z.timeZone, displayTime, activeReferenceTimezone);
      const zoneYMD = formatYMD(displayTime, z.timeZone);
      const { hour } = getZonedTimeParts(displayTime, z.timeZone);
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
      {showTimeBuddy && (
      <div className="mt-3 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm">
        <div className="mb-2 flex items-center justify-between gap-3 text-xs">
          <div className="min-w-0 font-semibold text-gray-700">
            {getCityLabel(activeReferenceTimezone)} time
            <span className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-blue-700">
              {formatSliderTime(selectedReferenceMinutes)}
            </span>
          </div>
          {!isViewingCurrentTime && (
            <button
              type="button"
              onClick={() => setReferenceMinuteOverride(null)}
              className="flex-shrink-0 rounded-full border border-gray-200 px-2 py-0.5 font-semibold text-gray-500 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
              Now
            </button>
          )}
        </div>
        <div className="mb-1 flex items-end gap-2">
          <span className="w-5" aria-hidden="true" />
          <div className="relative h-4 flex-1" aria-hidden="true">
            {[
              { hour: 0, label: '12 AM' },
              { hour: 6, label: '6 AM' },
              { hour: 12, label: '12 PM' },
              { hour: 18, label: '6 PM' },
              { hour: 24, label: '12 AM' },
            ].map(({ hour, label }) => (
              <span
                key={`${hour}-${label}`}
                className="absolute top-0 -translate-x-1/2 text-[10px] font-semibold text-gray-500"
                style={{ left: `${(hour / 24) * 100}%` }}
              >
                {label}
              </span>
            ))}
          </div>
          <span className="w-5" aria-hidden="true" />
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 text-right text-[10px] font-semibold text-gray-400">00</span>
          <input
            type="range"
            min="0"
            max="1439"
            step="5"
            value={selectedReferenceMinutes}
            onChange={(event) => setReferenceMinuteOverride(parseInt(event.target.value, 10))}
            className="h-2 w-full cursor-pointer accent-blue-600"
            aria-label={`${getCityLabel(activeReferenceTimezone)} time`}
          />
          <span className="w-5 text-[10px] font-semibold text-gray-400">24</span>
        </div>
        <div className="mt-1 flex items-start gap-2">
          <span className="w-5" aria-hidden="true" />
          <div className="relative h-7 flex-1" aria-hidden="true">
            {Array.from({ length: 25 }, (_, hour) => {
              const isMajor = hour % 6 === 0;
              return (
                <div
                  key={hour}
                  className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
                  style={{ left: `${(hour / 24) * 100}%` }}
                >
                  <span className={`${isMajor ? 'h-3 bg-gray-400' : 'h-2 bg-gray-300'} w-px`} />
                  {isMajor && (
                    <span className="mt-1 text-[10px] font-semibold text-gray-400">
                      {String(hour).padStart(2, '0')}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <span className="w-5" aria-hidden="true" />
        </div>
      </div>
      )}
    </div>
  );
};

export default TimeZoneDisplay;
