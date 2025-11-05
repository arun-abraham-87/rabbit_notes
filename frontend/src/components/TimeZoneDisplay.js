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
    let relativeDayText = 'today';
    if (zoneYMD < baseYMD) {
      relativeDayText = 'yesterday';
    } else if (zoneYMD > baseYMD) {
      relativeDayText = 'tomorrow';
    }

    // Format time as HH:mm (24-hour format)
    const formattedTime24 = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    }).format(now);

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
    const color = (hourNum >= 6 && hourNum < 18) ? 'text-green-500' : 'text-orange-500';

    return (
      <div className={`${cardBgClasses} shadow-md rounded-lg p-2 sm:p-3 w-fit overflow-hidden`}>
        <div className="flex justify-between items-center mb-1 gap-3">
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-xs sm:text-sm font-bold whitespace-nowrap">
              {label}
            </span>
            <span className="text-sm whitespace-nowrap">{flagMap[timeZone] || ''}</span>
            <span className={`${animation} text-xs flex-shrink-0`}>{icon}</span>
          </div>
          <div className={`text-sm sm:text-base font-semibold ${color} whitespace-nowrap flex-shrink-0`}>
            {formattedTime12}
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] sm:text-xs text-gray-500 flex-wrap gap-1">
          <span className="whitespace-nowrap">{formattedDate}</span>
          {diff && (
            <span className="text-[10px] sm:text-xs text-gray-400 whitespace-nowrap ml-2">
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

  // Enrich with numeric diff, dayLabel, hour, tier, and formatted date
  const enrichedZones = timezonesToShow
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
      
      // Get formatted date for grouping
      const formattedDate = new Intl.DateTimeFormat('en-US', {
        timeZone: z.timeZone,
        month: 'short',
        day: 'numeric',
      }).format(now);
      
      // Get hour in the timezone
      const hour = new Intl.DateTimeFormat('en-US', {
        timeZone: z.timeZone,
        hour12: false,
        hour: 'numeric',
      }).format(now);
      const hourNum = parseInt(hour, 10);
      const tier = getTimeTier(hourNum);
      
      return { ...z, diffHrs, dayLabel, hourNum, tier, zoneYMD, formattedDate };
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

  // Group zones by date and tier
  const zonesByDateAndTier = {};
  enrichedZones.forEach(z => {
    const key = `${z.zoneYMD}-${z.tier}`;
    if (!zonesByDateAndTier[key]) {
      zonesByDateAndTier[key] = {
        date: z.zoneYMD,
        formattedDate: z.formattedDate,
        tier: z.tier,
        zones: []
      };
    }
    zonesByDateAndTier[key].zones.push(z);
  });

  // Convert to array and sort by date, then tier
  const groupedSections = Object.values(zonesByDateAndTier).sort((a, b) => {
    // Sort by date first
    const dateDiff = a.date.localeCompare(b.date);
    if (dateDiff !== 0) return dateDiff;
    
    // Then by tier order
    const tierOrder = { earlyMorning: 0, morning: 1, afternoon: 2, lateNight: 3 };
    return tierOrder[a.tier] - tierOrder[b.tier];
  });

  const tierLabels = {
    morning: 'Morning (6 AM - 12 PM)',
    afternoon: 'Afternoon (12 PM - 6 PM)',
    lateNight: 'Late Night (6 PM - 12 AM)',
    earlyMorning: 'Early Morning (12 AM - 6 AM)',
  };

  // Get base date for comparison
  const now = new Date();
  const baseYMD = formatYMD(now, baseTimezone);
  const baseFormattedDate = new Intl.DateTimeFormat('en-US', {
    timeZone: baseTimezone,
    month: 'short',
    day: 'numeric',
  }).format(now);

  return (
    <div className="bg-gray-100 p-2 sm:p-3 rounded-lg">
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {enrichedZones.map(({ label, timeZone }) => (
          <ZoneCard key={label} label={label} timeZone={timeZone} />
        ))}
      </div>
    </div>
  );
};

export default TimeZoneDisplay;