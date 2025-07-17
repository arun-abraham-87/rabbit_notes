import React, { useState, useEffect, useRef } from 'react';
import { AlertsProvider } from './Alerts';
import { loadAllNotes } from '../utils/ApiUtils';
import { ChevronDownIcon, ChevronUpIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon } from '@heroicons/react/24/solid';
import TimeZoneDisplay from './TimeZoneDisplay';
import BookmarkedLinks from './BookmarkedLinks';
import EventManager from './EventManager';
import Pomodoro from './Pomodoro';
import { useLeftPanel } from '../contexts/LeftPanelContext';
import { useNoteEditor } from '../contexts/NoteEditorContext';

const Dashboard = ({notes, setNotes, setActivePage}) => {
  const { isPinned } = useLeftPanel();
  const { openEditor } = useNoteEditor();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(new Date());
  const [showTimezones, setShowTimezones] = useState(false);
  const [selectedTimezones, setSelectedTimezones] = useState([]);
  const [isEventManagerCollapsed, setIsEventManagerCollapsed] = useState(false);
  const [eventScrollPosition, setEventScrollPosition] = useState(0);
  const [notesScrollPosition, setNotesScrollPosition] = useState(0);
  const [eventsHasOverflow, setEventsHasOverflow] = useState(false);
  const [notesHasOverflow, setNotesHasOverflow] = useState(false);
  
  // Refs for scroll containers
  const eventsScrollRef = useRef(null);
  const notesScrollRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Load selected timezones from localStorage on component mount
  useEffect(() => {
    const savedTimezones = localStorage.getItem('selectedTimezones');
    if (savedTimezones) {
      setSelectedTimezones(JSON.parse(savedTimezones));
    }
  }, []);

  const formattedTime = time.toLocaleTimeString(undefined, {
    hour12: true,
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });

  const formattedDate = time.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Calculate fun facts and countdowns
  const getFunFacts = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDay = now.getDate();
    
    // End of year
    const endOfYear = new Date(currentYear, 11, 31);
    const daysToEndOfYear = Math.ceil((endOfYear - now) / (1000 * 60 * 60 * 24));
    const weeksToEndOfYear = Math.ceil(daysToEndOfYear / 7);
    const monthsToEndOfYear = 12 - currentMonth - 1; // -1 because we're in current month
    
    // End of month
    const endOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const daysToEndOfMonth = endOfMonth.getDate() - currentDay;
    
    // End of week (Sunday)
    const daysToSunday = 7 - now.getDay();
    const daysToEndOfWeek = daysToSunday === 7 ? 0 : daysToSunday;
    
    // Progress through year
    const startOfYear = new Date(currentYear, 0, 1);
    const daysSinceStartOfYear = Math.ceil((now - startOfYear) / (1000 * 60 * 60 * 24));
    const totalDaysInYear = new Date(currentYear, 11, 31).getDate() + 
                           new Date(currentYear, 11, 0).getDate() * 11; // Approximate
    const yearProgress = Math.round((daysSinceStartOfYear / totalDaysInYear) * 100);
    
    return {
      daysToEndOfYear,
      weeksToEndOfYear,
      monthsToEndOfYear,
      daysToEndOfMonth,
      daysToEndOfWeek,
      yearProgress
    };
  };

  // Function to format timezone time in compact form
  const formatTimezoneTime = (timeZone) => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour12: true,
        hour: '2-digit',
        minute: '2-digit',
      }).format(time);
    } catch (error) {
      return '--:--';
    }
  };

  // Get compact timezone display
  // Smooth scroll function with easing
  const smoothScroll = (element, targetScrollLeft, duration = 600) => {
    const startScrollLeft = element.scrollLeft;
    const distance = targetScrollLeft - startScrollLeft;
    const startTime = performance.now();

    const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

    const animateScroll = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutQuart(progress);
      
      element.scrollLeft = startScrollLeft + (distance * easedProgress);
      
      if (progress < 1) {
        requestAnimationFrame(animateScroll);
      }
    };

    requestAnimationFrame(animateScroll);
  };

  // Horizontal scroll functions for events
  const scrollEventsLeft = () => {
    if (eventsScrollRef.current) {
      const currentScroll = eventsScrollRef.current.scrollLeft;
      const targetScroll = Math.max(0, currentScroll - 300);
      smoothScroll(eventsScrollRef.current, targetScroll);
    }
  };

  const scrollEventsRight = () => {
    if (eventsScrollRef.current) {
      const currentScroll = eventsScrollRef.current.scrollLeft;
      const maxScroll = eventsScrollRef.current.scrollWidth - eventsScrollRef.current.clientWidth;
      const targetScroll = Math.min(maxScroll, currentScroll + 300);
      smoothScroll(eventsScrollRef.current, targetScroll);
    }
  };

  // Horizontal scroll functions for notes
  const scrollNotesLeft = () => {
    if (notesScrollRef.current) {
      const currentScroll = notesScrollRef.current.scrollLeft;
      const targetScroll = Math.max(0, currentScroll - 300);
      smoothScroll(notesScrollRef.current, targetScroll);
    }
  };

  const scrollNotesRight = () => {
    if (notesScrollRef.current) {
      const currentScroll = notesScrollRef.current.scrollLeft;
      const maxScroll = notesScrollRef.current.scrollWidth - notesScrollRef.current.clientWidth;
      const targetScroll = Math.min(maxScroll, currentScroll + 300);
      smoothScroll(notesScrollRef.current, targetScroll);
    }
  };

  // Check for overflow in containers
  const checkOverflow = () => {
    if (eventsScrollRef.current) {
      const hasOverflow = eventsScrollRef.current.scrollWidth > eventsScrollRef.current.clientWidth;
      setEventsHasOverflow(hasOverflow);
    }
    if (notesScrollRef.current) {
      const hasOverflow = notesScrollRef.current.scrollWidth > notesScrollRef.current.clientWidth;
      setNotesHasOverflow(hasOverflow);
    }
  };

  // Check overflow when component mounts and when events/notes change
  useEffect(() => {
    checkOverflow();
    // Add a small delay to ensure content is rendered
    const timer = setTimeout(checkOverflow, 100);
    return () => clearTimeout(timer);
  }, [events, notes]);

  // Add keyboard shortcut for 'c' key to open note editor without watch option
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle 'c' key when not in an input/textarea and no modifier keys
      if (!e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey &&
          e.target.tagName !== 'INPUT' && 
          e.target.tagName !== 'TEXTAREA' &&
          e.target.contentEditable !== 'true' &&
          e.key === 'c') {
        e.preventDefault();
        openEditor('add', '', null, []); // No meta tags, so watch option is not selected
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [openEditor]);

  const getCompactTimezones = () => {
    const timezonesToShow = selectedTimezones.length > 0 ? selectedTimezones : [
      'Australia/Sydney',
      'Asia/Kolkata', 
      'America/New_York',
      'Europe/London'
    ];

    // Get base timezone from localStorage, default to AEST if not set
    const baseTimezone = localStorage.getItem('baseTimezone') || 'Australia/Sydney';

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

    // Helper function to format date as YYYY-MM-DD in a given timezone
    const formatYMD = (date, tz) =>
      new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(date);

    // Helper function to get time difference from base timezone
    const getTimeDiffHours = (targetZone) => {
      const baseDate = new Date(new Date().toLocaleString('en-US', { timeZone: baseTimezone }));
      const targetDate = new Date(new Date().toLocaleString('en-US', { timeZone: targetZone }));
      return Math.round((baseDate - targetDate) / 3600000);
    };

    // Helper function to get time-based description
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

    const timezoneData = timezonesToShow.map(timeZone => {
      const label = timeZone.split('/').pop().replace('_', ' ');
      const flag = flagMap[timeZone] || '';
      const time = formatTimezoneTime(timeZone);
      
      // Determine if this zone's date is before/after base timezone date
      const zoneYMD = formatYMD(new Date(), timeZone);
      const baseYMD = formatYMD(new Date(), baseTimezone);
      const isPreviousDay = zoneYMD < baseYMD;
      const isNextDay = zoneYMD > baseYMD;
      
      // Calculate relative day text
      let relativeDayText = 'today';
      if (isPreviousDay) {
        relativeDayText = 'yesterday';
      } else if (isNextDay) {
        relativeDayText = 'tomorrow';
      }
      
      // Get hour in the timezone for time description
      const timeInZone = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour12: false,
        hour: 'numeric',
      }).format(new Date());
      const hourNum = parseInt(timeInZone, 10);
      
      // Get time-based description and combine with day
      const timeDescription = getTimeDescription(hourNum);
      const enhancedRelativeDayText = `${relativeDayText} ${timeDescription}`;
      
      // Calculate time difference from base timezone
      const timeDiffHours = getTimeDiffHours(timeZone);
      
      return { label, flag, time, timeZone, timeDiffHours, relativeDayText: enhancedRelativeDayText };
    });

    // Sort by absolute distance from base timezone (nearest to farthest)
    return timezoneData.sort((a, b) => Math.abs(a.timeDiffHours) - Math.abs(b.timeDiffHours));
  };

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const response = await loadAllNotes();
        if (response && response.notes) {
          setNotes(response.notes);
          
          // Extract events from notes
          const eventNotes = response.notes.filter(note => note && note.content && note.content.includes('meta::event::'));
          setEvents(eventNotes);
        }
      } catch (error) {
        console.error('Error loading notes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, [setNotes]);

  if (loading) {
    return (
      <div className="p-4 w-full">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  // Get base timezone for display
  const baseTimezone = localStorage.getItem('baseTimezone') || 'Australia/Sydney';
  const baseTimezoneLabel = baseTimezone.split('/').pop().replace('_', ' ');
  const baseTimezoneFlag = {
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
  }[baseTimezone] || '🌐';

  return (
    <div className="container mx-auto px-4 pb-8">
      {/* Bookmarked Links - Topmost Item */}
      {!isPinned && (
        <div className="mb-8">
          <BookmarkedLinks 
            key={`bookmarks-${notes.length}-${notes.reduce((acc, note) => acc + (note.content.includes('meta::bookmark_pinned') ? 1 : 0), 0)}`}
            notes={notes} 
            setNotes={setNotes} 
          />
        </div>
      )}

      {/* First Row: Date and Timezone Display (Full Width) */}
      <div className={`mb-8 ${isPinned ? 'pt-8' : ''}`}>
        <div className="flex flex-col items-center">
          {/* First Row: Date and Current Time */}
          <div className="flex items-center gap-6 mb-4">
            <h1 className="text-3xl font-bold">{formattedDate}</h1>
            <div
              className="relative group"
              onMouseEnter={() => setShowTimezones(true)}
              onMouseLeave={() => setShowTimezones(false)}
            >
              <div className="flex items-center gap-4 cursor-pointer">
                <div className="text-base font-medium">{formattedTime}</div>
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <span>{baseTimezoneFlag}</span>
                  <span>{baseTimezoneLabel}</span>
                  <ChevronDownIcon className="h-4 w-4 text-gray-400" />
                </div>
              </div>
              {showTimezones && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50">
                  <TimeZoneDisplay selectedTimezones={selectedTimezones} />
                </div>
              )}
            </div>
          </div>
          
          {/* Fun Facts Line */}
          <div className="text-sm text-gray-600 mb-4 text-center">
            {(() => {
              const facts = getFunFacts();
              const factItems = [];
              
              // End of year countdown (days/weeks/months)
              if (facts.daysToEndOfYear > 0) {
                let yearCountdown = `${facts.daysToEndOfYear} days`;
                if (facts.weeksToEndOfYear > 0) {
                  yearCountdown += ` / ${facts.weeksToEndOfYear} weeks`;
                }
                if (facts.monthsToEndOfYear > 0) {
                  yearCountdown += ` / ${facts.monthsToEndOfYear} months`;
                }
                factItems.push(`${yearCountdown} to end of year`);
              }
              
              // End of month countdown
              if (facts.daysToEndOfMonth > 0) {
                factItems.push(`${facts.daysToEndOfMonth} days to end of month`);
              }
              
              // End of week countdown
              if (facts.daysToEndOfWeek > 0) {
                factItems.push(`${facts.daysToEndOfWeek} days to end of week`);
              }
              
              // Year progress
              factItems.push(`${facts.yearProgress}% through the year`);
              
              return factItems.join(' • ');
            })()}
          </div>
          
          {/* Compact Timezone Display Line */}
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
            {getCompactTimezones().map(({ label, flag, time, relativeDayText }, index) => (
              <React.Fragment key={label}>
                <div className="flex flex-col items-center gap-1">
                                  <div className="flex items-center gap-1">
                  <span>{flag}</span>
                  <span className="font-medium">{label}:</span>
                  <span className="text-gray-800">{time}</span>
                </div>
                  <div className="text-xs text-gray-400">
                    {relativeDayText}
                  </div>
                </div>
                {index < getCompactTimezones().length - 1 && (
                  <span className="mx-2 text-gray-400">•</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {/* Second Row: Event Manager Cards */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => setIsEventManagerCollapsed(!isEventManagerCollapsed)}
            className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            {isEventManagerCollapsed ? (
              <>
                <ChevronDownIcon className="h-4 w-4" />
                Show Events
              </>
            ) : (
              <>
                <ChevronUpIcon className="h-4 w-4" />
                Hide Events
              </>
            )}
          </button>
          
          {!isEventManagerCollapsed && (
            <button
              onClick={() => {
                // This will trigger the add event functionality
                // We need to pass this through to EventManager
                const event = new CustomEvent('addEvent');
                document.dispatchEvent(event);
              }}
              className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              Add Event
            </button>
          )}
        </div>
        {!isEventManagerCollapsed && (
          <>
            {/* Events Row */}
            <div className="flex items-center gap-2 mb-6">
              {/* Left Arrow */}
              <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
                {eventsHasOverflow && (
                  <button
                    onClick={scrollEventsLeft}
                    className="bg-white/80 hover:bg-white text-gray-600 hover:text-gray-800 p-2 rounded-full shadow-md transition-all"
                  >
                    <ChevronLeftIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
              
              {/* Events Container */}
              <div 
                ref={eventsScrollRef}
                className="flex-1 overflow-x-auto"
                style={{ 
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
                onScroll={(e) => {
                  // Prevent manual scrolling, only allow programmatic scrolling
                  e.preventDefault();
                }}
              >
                <div className="inline-flex gap-4 pb-4 px-4" style={{ minWidth: 'max-content' }}>
                  <EventManager type="events" notes={notes} setActivePage={setActivePage} />
                </div>
              </div>
              
              {/* Right Arrow */}
              <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
                {eventsHasOverflow && (
                  <button
                    onClick={scrollEventsRight}
                    className="bg-white/80 hover:bg-white text-gray-600 hover:text-gray-800 p-2 rounded-full shadow-md transition-all"
                  >
                    <ChevronRightIcon className="h-5 w-5" />
                </button>
                )}
              </div>
            </div>

            {/* Notes Row */}
            <div className="flex items-center gap-2">
              {/* Left Arrow */}
              <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
                {notesHasOverflow && (
                  <button
                    onClick={scrollNotesLeft}
                    className="bg-white/80 hover:bg-white text-gray-600 hover:text-gray-800 p-2 rounded-full shadow-md transition-all"
                  >
                    <ChevronLeftIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
              
              {/* Notes Container */}
              <div 
                ref={notesScrollRef}
                className="flex-1 overflow-x-auto"
                style={{ 
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none'
                }}
              >
                <div className="inline-flex gap-4 pb-4 px-4" style={{ minWidth: 'max-content' }}>
                  <EventManager type="notes" notes={notes} setActivePage={setActivePage} />
                </div>
              </div>
              
              {/* Right Arrow */}
              <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center">
                {notesHasOverflow && (
                  <button
                    onClick={scrollNotesRight}
                    className="bg-white/80 hover:bg-white text-gray-600 hover:text-gray-800 p-2 rounded-full shadow-md transition-all"
                  >
                    <ChevronRightIcon className="h-5 w-5" />
                </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Third Row: Pomodoro */}
      <div className="mb-8 flex justify-center">
        <Pomodoro />
      </div>

      {/* Alerts Section */}
      <div className="mb-8">
        <AlertsProvider 
          notes={notes} 
          events={events}
          setNotes={setNotes}
        >
          {/* Additional dashboard content can be added here */}
        </AlertsProvider>
      </div>
    </div>
  );
};

export default Dashboard; 