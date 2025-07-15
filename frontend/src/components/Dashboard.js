import React, { useState, useEffect, useRef } from 'react';
import { AlertsProvider } from './Alerts';
import { loadAllNotes } from '../utils/ApiUtils';
import { ChevronDownIcon, ChevronUpIcon, ChevronLeftIcon, ChevronRightIcon, PlusIcon } from '@heroicons/react/24/solid';
import TimeZoneDisplay from './TimeZoneDisplay';
import BookmarkedLinks from './BookmarkedLinks';
import EventManager from './EventManager';
import Pomodoro from './Pomodoro';

const Dashboard = ({notes,setNotes}) => {
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
  // Horizontal scroll functions for events
  const scrollEventsLeft = () => {
    if (eventsScrollRef.current) {
      eventsScrollRef.current.scrollLeft -= 300;
    }
  };

  const scrollEventsRight = () => {
    if (eventsScrollRef.current) {
      eventsScrollRef.current.scrollLeft += 300;
    }
  };

  // Horizontal scroll functions for notes
  const scrollNotesLeft = () => {
    if (notesScrollRef.current) {
      notesScrollRef.current.scrollLeft -= 300;
    }
  };

  const scrollNotesRight = () => {
    if (notesScrollRef.current) {
      notesScrollRef.current.scrollLeft += 300;
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

  const getCompactTimezones = () => {
    const timezonesToShow = selectedTimezones.length > 0 ? selectedTimezones : [
      'Australia/Sydney',
      'Asia/Kolkata', 
      'America/New_York',
      'Europe/London'
    ];

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

    const timezoneData = timezonesToShow.map(timeZone => {
      const label = timeZone.split('/').pop().replace('_', ' ');
      const flag = flagMap[timeZone] || '';
      const time = formatTimezoneTime(timeZone);
      
      // Determine if this zone's date is before AEST date
      const zoneYMD = formatYMD(new Date(), timeZone);
      const aestYMD = formatYMD(new Date(), 'Australia/Sydney');
      const isPreviousDay = zoneYMD < aestYMD;
      
      // Calculate date difference (0 = same day, -1 = previous day, 1 = next day)
      const dateDiff = zoneYMD === aestYMD ? 0 : (zoneYMD < aestYMD ? -1 : 1);
      
      return { label, flag, time, timeZone, isPreviousDay, dateDiff };
    });

    // Sort by date difference: next day first, then previous day, then same day (farthest to nearest)
    return timezoneData.sort((a, b) => b.dateDiff - a.dateDiff);
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

  return (
    <div className="container mx-auto px-4 py-8">
      {/* First Row: Date and Timezone Display (Full Width) */}
      <div className="mb-8">
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
                  <span>🇦🇺</span>
                  <span>AEST</span>
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
            {getCompactTimezones().map(({ label, flag, time, isPreviousDay }, index) => (
              <div key={label} className="flex items-center gap-1">
                <span>{flag}</span>
                <span className="font-medium">{label}:</span>
                <span className="text-gray-800">{time}</span>
                {isPreviousDay && (
                  <span className="text-gray-500 text-xs">(P)</span>
                )}
                {index < getCompactTimezones().length - 1 && (
                  <span className="mx-2 text-gray-400">•</span>
                )}
              </div>
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
              {eventsHasOverflow && (
                <button
                  onClick={scrollEventsLeft}
                  className="flex-shrink-0 bg-white/80 hover:bg-white text-gray-600 hover:text-gray-800 p-2 rounded-full shadow-md transition-all"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
              )}
              
              {/* Events Container */}
              <div 
                ref={eventsScrollRef}
                className="flex-1 overflow-x-auto scrollbar-hide"
                style={{ scrollBehavior: 'smooth' }}
              >
                <div className="inline-flex gap-4 pb-4 px-4" style={{ minWidth: 'max-content' }}>
                  <EventManager type="events" />
                </div>
              </div>
              
              {/* Right Arrow */}
              {eventsHasOverflow && (
                <button
                  onClick={scrollEventsRight}
                  className="flex-shrink-0 bg-white/80 hover:bg-white text-gray-600 hover:text-gray-800 p-2 rounded-full shadow-md transition-all"
                >
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Notes Row */}
            <div className="flex items-center gap-2">
              {/* Left Arrow */}
              {notesHasOverflow && (
                <button
                  onClick={scrollNotesLeft}
                  className="flex-shrink-0 bg-white/80 hover:bg-white text-gray-600 hover:text-gray-800 p-2 rounded-full shadow-md transition-all"
                >
                  <ChevronLeftIcon className="h-5 w-5" />
                </button>
              )}
              
              {/* Notes Container */}
              <div 
                ref={notesScrollRef}
                className="flex-1 overflow-x-auto scrollbar-hide"
                style={{ scrollBehavior: 'smooth' }}
              >
                <div className="inline-flex gap-4 pb-4 px-4" style={{ minWidth: 'max-content' }}>
                  <EventManager type="notes" />
                </div>
              </div>
              
              {/* Right Arrow */}
              {notesHasOverflow && (
                <button
                  onClick={scrollNotesRight}
                  className="flex-shrink-0 bg-white/80 hover:bg-white text-gray-600 hover:text-gray-800 p-2 rounded-full shadow-md transition-all"
                >
                  <ChevronRightIcon className="h-5 w-5" />
              </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Third Row: Pomodoro Button */}
      <div className="mb-8 flex justify-center">
        <Pomodoro />
      </div>

      {/* Bookmarked Links */}
      <div className="mb-8">
        <BookmarkedLinks notes={notes} setNotes={setNotes} />
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