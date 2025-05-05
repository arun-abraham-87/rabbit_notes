import React, { useState, useEffect } from 'react';
import { AlertsProvider } from './Alerts';
import { loadAllNotes } from '../utils/ApiUtils';

const Dashboard = () => {
  const [notes, setNotes] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

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
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Dashboard</h1>
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