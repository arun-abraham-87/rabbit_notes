import React, { useState, useEffect, useRef } from 'react';
import { XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const TimezonePopup = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeFilter, setActiveFilter] = useState('all');
  const searchInputRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Focus search input when popup opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Top 10 timezones per continent + Colombia
  const allTimezones = [
    // North America (10)
    { name: 'New York', zone: 'America/New_York', flag: '🇺🇸', continent: 'North America', country: 'United States' },
    { name: 'Los Angeles', zone: 'America/Los_Angeles', flag: '🇺🇸', continent: 'North America', country: 'United States' },
    { name: 'Chicago', zone: 'America/Chicago', flag: '🇺🇸', continent: 'North America', country: 'United States' },
    { name: 'Toronto', zone: 'America/Toronto', flag: '🇨🇦', continent: 'North America', country: 'Canada' },
    { name: 'Mexico City', zone: 'America/Mexico_City', flag: '🇲🇽', continent: 'North America', country: 'Mexico' },
    { name: 'Vancouver', zone: 'America/Vancouver', flag: '🇨🇦', continent: 'North America', country: 'Canada' },
    { name: 'Montreal', zone: 'America/Montreal', flag: '🇨🇦', continent: 'North America', country: 'Canada' },
    { name: 'Miami', zone: 'America/New_York', flag: '🇺🇸', continent: 'North America', country: 'United States' },
    { name: 'Denver', zone: 'America/Denver', flag: '🇺🇸', continent: 'North America', country: 'United States' },
    { name: 'Phoenix', zone: 'America/Phoenix', flag: '🇺🇸', continent: 'North America', country: 'United States' },
    
    // South America (10 + Colombia)
    { name: 'São Paulo', zone: 'America/Sao_Paulo', flag: '🇧🇷', continent: 'South America', country: 'Brazil' },
    { name: 'Buenos Aires', zone: 'America/Argentina/Buenos_Aires', flag: '🇦🇷', continent: 'South America', country: 'Argentina' },
    { name: 'Lima', zone: 'America/Lima', flag: '🇵🇪', continent: 'South America', country: 'Peru' },
    { name: 'Santiago', zone: 'America/Santiago', flag: '🇨🇱', continent: 'South America', country: 'Chile' },
    { name: 'Caracas', zone: 'America/Caracas', flag: '🇻🇪', continent: 'South America', country: 'Venezuela' },
    { name: 'Bogotá', zone: 'America/Bogota', flag: '🇨🇴', continent: 'South America', country: 'Colombia' },
    { name: 'Rio de Janeiro', zone: 'America/Sao_Paulo', flag: '🇧🇷', continent: 'South America', country: 'Brazil' },
    { name: 'Brasília', zone: 'America/Sao_Paulo', flag: '🇧🇷', continent: 'South America', country: 'Brazil' },
    { name: 'Quito', zone: 'America/Guayaquil', flag: '🇪🇨', continent: 'South America', country: 'Ecuador' },
    { name: 'Montevideo', zone: 'America/Montevideo', flag: '🇺🇾', continent: 'South America', country: 'Uruguay' },
    { name: 'Asunción', zone: 'America/Asuncion', flag: '🇵🇾', continent: 'South America', country: 'Paraguay' },
    
    // Europe (10)
    { name: 'London', zone: 'Europe/London', flag: '🇬🇧', continent: 'Europe', country: 'United Kingdom' },
    { name: 'Paris', zone: 'Europe/Paris', flag: '🇫🇷', continent: 'Europe', country: 'France' },
    { name: 'Berlin', zone: 'Europe/Berlin', flag: '🇩🇪', continent: 'Europe', country: 'Germany' },
    { name: 'Moscow', zone: 'Europe/Moscow', flag: '🇷🇺', continent: 'Europe', country: 'Russia' },
    { name: 'Rome', zone: 'Europe/Rome', flag: '🇮🇹', continent: 'Europe', country: 'Italy' },
    { name: 'Madrid', zone: 'Europe/Madrid', flag: '🇪🇸', continent: 'Europe', country: 'Spain' },
    { name: 'Amsterdam', zone: 'Europe/Amsterdam', flag: '🇳🇱', continent: 'Europe', country: 'Netherlands' },
    { name: 'Stockholm', zone: 'Europe/Stockholm', flag: '🇸🇪', continent: 'Europe', country: 'Sweden' },
    { name: 'Vienna', zone: 'Europe/Vienna', flag: '🇦🇹', continent: 'Europe', country: 'Austria' },
    { name: 'Warsaw', zone: 'Europe/Warsaw', flag: '🇵🇱', continent: 'Europe', country: 'Poland' },
    
    // Asia (10)
    { name: 'Tokyo', zone: 'Asia/Tokyo', flag: '🇯🇵', continent: 'Asia', country: 'Japan' },
    { name: 'Beijing', zone: 'Asia/Shanghai', flag: '🇨🇳', continent: 'Asia', country: 'China' },
    { name: 'Mumbai', zone: 'Asia/Kolkata', flag: '🇮🇳', continent: 'Asia', country: 'India' },
    { name: 'Singapore', zone: 'Asia/Singapore', flag: '🇸🇬', continent: 'Asia', country: 'Singapore' },
    { name: 'Seoul', zone: 'Asia/Seoul', flag: '🇰🇷', continent: 'Asia', country: 'South Korea' },
    { name: 'Hong Kong', zone: 'Asia/Hong_Kong', flag: '🇭🇰', continent: 'Asia', country: 'Hong Kong' },
    { name: 'Bangkok', zone: 'Asia/Bangkok', flag: '🇹🇭', continent: 'Asia', country: 'Thailand' },
    { name: 'Jakarta', zone: 'Asia/Jakarta', flag: '🇮🇩', continent: 'Asia', country: 'Indonesia' },
    { name: 'Manila', zone: 'Asia/Manila', flag: '🇵🇭', continent: 'Asia', country: 'Philippines' },
    { name: 'Kuala Lumpur', zone: 'Asia/Kuala_Lumpur', flag: '🇲🇾', continent: 'Asia', country: 'Malaysia' },
    
    // Africa (10)
    { name: 'Cairo', zone: 'Africa/Cairo', flag: '🇪🇬', continent: 'Africa', country: 'Egypt' },
    { name: 'Johannesburg', zone: 'Africa/Johannesburg', flag: '🇿🇦', continent: 'Africa', country: 'South Africa' },
    { name: 'Lagos', zone: 'Africa/Lagos', flag: '🇳🇬', continent: 'Africa', country: 'Nigeria' },
    { name: 'Nairobi', zone: 'Africa/Nairobi', flag: '🇰🇪', continent: 'Africa', country: 'Kenya' },
    { name: 'Casablanca', zone: 'Africa/Casablanca', flag: '🇲🇦', continent: 'Africa', country: 'Morocco' },
    { name: 'Algiers', zone: 'Africa/Algiers', flag: '🇩🇿', continent: 'Africa', country: 'Algeria' },
    { name: 'Tunis', zone: 'Africa/Tunis', flag: '🇹🇳', continent: 'Africa', country: 'Tunisia' },
    { name: 'Addis Ababa', zone: 'Africa/Addis_Ababa', flag: '🇪🇹', continent: 'Africa', country: 'Ethiopia' },
    { name: 'Dar es Salaam', zone: 'Africa/Dar_es_Salaam', flag: '🇹🇿', continent: 'Africa', country: 'Tanzania' },
    { name: 'Accra', zone: 'Africa/Accra', flag: '🇬🇭', continent: 'Africa', country: 'Ghana' },
    
    // Oceania (10)
    { name: 'Sydney', zone: 'Australia/Sydney', flag: '🇦🇺', continent: 'Oceania', country: 'Australia' },
    { name: 'Melbourne', zone: 'Australia/Melbourne', flag: '🇦🇺', continent: 'Oceania', country: 'Australia' },
    { name: 'Auckland', zone: 'Pacific/Auckland', flag: '🇳🇿', continent: 'Oceania', country: 'New Zealand' },
    { name: 'Honolulu', zone: 'Pacific/Honolulu', flag: '🇺🇸', continent: 'Oceania', country: 'United States' },
    { name: 'Fiji', zone: 'Pacific/Fiji', flag: '🇫🇯', continent: 'Oceania', country: 'Fiji' },
    { name: 'Brisbane', zone: 'Australia/Brisbane', flag: '🇦🇺', continent: 'Oceania', country: 'Australia' },
    { name: 'Perth', zone: 'Australia/Perth', flag: '🇦🇺', continent: 'Oceania', country: 'Australia' },
    { name: 'Adelaide', zone: 'Australia/Adelaide', flag: '🇦🇺', continent: 'Oceania', country: 'Australia' },
    { name: 'Wellington', zone: 'Pacific/Auckland', flag: '🇳🇿', continent: 'Oceania', country: 'New Zealand' },
    { name: 'Port Moresby', zone: 'Pacific/Port_Moresby', flag: '🇵🇬', continent: 'Oceania', country: 'Papua New Guinea' }
  ];

  // Filter timezones based on search query and continent filter
  const filteredTimezones = allTimezones.filter(tz => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (
      tz.name.toLowerCase().includes(query) ||
      tz.continent.toLowerCase().includes(query) ||
      tz.country.toLowerCase().includes(query)
    );
    
    const matchesFilter = activeFilter === 'all' || tz.continent === activeFilter;
    
    return matchesSearch && matchesFilter;
  });

  // Group timezones by continent
  const groupedTimezones = filteredTimezones.reduce((groups, timezone) => {
    const continent = timezone.continent;
    if (!groups[continent]) {
      groups[continent] = [];
    }
    groups[continent].push(timezone);
    return groups;
  }, {});

  // Order of continents to display
  const continentOrder = ['North America', 'South America', 'Europe', 'Asia', 'Africa', 'Oceania'];

  // Format time for a timezone
  const formatTimezoneTime = (timeZone) => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour12: true,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(currentTime);
    } catch (error) {
      return '--:--:--';
    }
  };

  // Get time difference from base timezone
  const getTimeDiffHours = (targetZone) => {
    const baseTimezone = localStorage.getItem('baseTimezone') || 'Australia/Sydney';
    
    // Get current time in base timezone
    const baseTime = new Date();
    const baseTimeInZone = new Date(baseTime.toLocaleString('en-US', { timeZone: baseTimezone }));
    
    // Get current time in target timezone
    const targetTimeInZone = new Date(baseTime.toLocaleString('en-US', { timeZone: targetZone }));
    
    // Calculate difference in hours
    const diffMs = baseTimeInZone.getTime() - targetTimeInZone.getTime();
    return Math.round(diffMs / (1000 * 60 * 60));
  };

  // Get time description
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

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredTimezones.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : 0);
      } else if (e.key === 'Enter' && selectedIndex >= 0) {
        e.preventDefault();
        const selectedTimezone = filteredTimezones[selectedIndex];
        if (selectedTimezone) {
          localStorage.setItem('baseTimezone', selectedTimezone.zone);
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredTimezones, selectedIndex, onClose]);

  // Reset selected index when search or filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery, activeFilter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">World Timezones</h2>
            <p className="text-sm text-gray-600 mt-1">
              Times relative to: {localStorage.getItem('baseTimezone') || 'Australia/Sydney'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-gray-200">
          <div className="relative mb-4">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search timezones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          {/* Continent Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setActiveFilter('all');
                setSearchQuery('');
              }}
              className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                activeFilter === 'all'
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              All
            </button>
            {continentOrder.map(continent => (
              <button
                key={continent}
                onClick={() => {
                  setActiveFilter(continent);
                  setSearchQuery('');
                }}
                className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                  activeFilter === continent
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {continent}
              </button>
            ))}
          </div>
        </div>

        {/* Timezone List */}
        <div className="overflow-y-auto max-h-[60vh]">
          {filteredTimezones.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No timezones found matching "{searchQuery}"
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {continentOrder.map(continent => {
                const continentTimezones = groupedTimezones[continent];
                if (!continentTimezones || continentTimezones.length === 0) return null;

                return (
                  <div key={continent} className="space-y-3">
                    <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                      {continent}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {continentTimezones.map((timezone, index) => {
                        const time = formatTimezoneTime(timezone.zone);
                        const timeDiffHours = getTimeDiffHours(timezone.zone);
                        
                        // Get hour for time description
                        const timeInZone = new Intl.DateTimeFormat('en-US', {
                          timeZone: timezone.zone,
                          hour12: false,
                          hour: 'numeric',
                        }).format(currentTime);
                        const hourNum = parseInt(timeInZone, 10);
                        const timeDescription = getTimeDescription(hourNum);

                        // Get date info
                        const zoneDate = new Intl.DateTimeFormat('en-US', {
                          timeZone: timezone.zone,
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        }).format(currentTime);

                        return (
                          <div
                            key={timezone.zone}
                            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                              selectedIndex === filteredTimezones.findIndex(tz => tz.zone === timezone.zone)
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                            onClick={() => {
                              localStorage.setItem('baseTimezone', timezone.zone);
                              onClose();
                            }}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className="text-2xl flex-shrink-0">{timezone.flag}</span>
                                <div className="min-w-0 flex-1">
                                  <div className="font-semibold text-gray-900 truncate">{timezone.name}</div>
                                  <div className="text-sm text-gray-500 truncate">{timezone.country}</div>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0 ml-2">
                                <div className="text-lg font-mono font-semibold text-gray-900">{time}</div>
                                <div className="text-xs text-gray-500">{zoneDate}</div>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">{timeDescription}</span>
                              {timeDiffHours !== 0 && (
                                <span className={`font-medium ${
                                  timeDiffHours > 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {timeDiffHours > 0 ? '+' : ''}{timeDiffHours}h
                                </span>
                              )}
                              {timeDiffHours === 0 && (
                                <span className="text-gray-400 font-medium">current</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            <span className="font-medium">Navigation:</span> Use ↑↓ arrows to navigate, Enter to select, Escape to close
          </div>
        </div>
      </div>
    </div>
  );
};

export default TimezonePopup; 