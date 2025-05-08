import React, { useState, useEffect } from 'react';
import { AlertsProvider } from './Alerts';
import { loadAllNotes } from '../utils/ApiUtils';
import { ChevronDownIcon } from '@heroicons/react/24/solid';
import TimeZoneDisplay from './TimeZoneDisplay';

const Dashboard = ({notes,setNotes}) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [time, setTime] = useState(new Date());
  const [showTimezones, setShowTimezones] = useState(false);
  const [selectedTimezones, setSelectedTimezones] = useState([]);

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

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const response = await loadAllNotes();
        setNotes(response.notes);
        
        // Extract events from notes
        const eventNotes = response.notes.filter(note => note.content.includes('meta::event::'));
        setEvents(eventNotes);
      } catch (error) {
        console.error('Error loading notes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, []);

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
      {/* Date and Time Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">{formattedDate}</h1>
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