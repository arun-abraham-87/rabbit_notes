import React, { useState, useEffect } from 'react';
import { PlusIcon } from '@heroicons/react/24/solid';

const EventManager = () => {
  const [events, setEvents] = useState(() => {
    try {
      const stored = localStorage.getItem('tempEvents');
      if (stored && stored !== '[]') {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.error('Error loading initial events:', error);
    }
    return [];
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [eventForm, setEventForm] = useState({ name: '', date: '', endDate: '' });

  // Save events to localStorage when changed
  useEffect(() => {
    if (events.length > 0) {
      try {
        localStorage.setItem('tempEvents', JSON.stringify(events));
      } catch (error) {
        console.error('Error saving events to localStorage:', error);
      }
    }
  }, [events]);

  const handleEventInput = (e) => {
    const { name, value } = e.target;
    setEventForm(f => ({ ...f, [name]: value }));
  };

  const handleEventSubmit = (e) => {
    e.preventDefault();
    if (!eventForm.name || !eventForm.date) return;
    
    if (isEditMode) {
      setEvents(prev => {
        const updatedEvents = prev.map(ev => 
          ev.id === eventForm.id ? eventForm : ev
        );
        try {
          localStorage.setItem('tempEvents', JSON.stringify(updatedEvents));
        } catch (error) {
          console.error('Error saving events to localStorage:', error);
        }
        return updatedEvents;
      });
    } else {
      const newEvent = { ...eventForm, id: Date.now() };
      setEvents(prev => {
        const updatedEvents = [...prev, newEvent];
        try {
          localStorage.setItem('tempEvents', JSON.stringify(updatedEvents));
        } catch (error) {
          console.error('Error saving events to localStorage:', error);
        }
        return updatedEvents;
      });
    }
    
    setEventForm({ name: '', date: '', endDate: '' });
    setIsModalOpen(false);
    setIsEditMode(false);
  };

  const handleEditEvent = (event) => {
    setEventForm(event);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleDeleteEvent = (id) => {
    setEvents(prev => {
      const updatedEvents = prev.filter(ev => ev.id !== id);
      try {
        localStorage.setItem('tempEvents', JSON.stringify(updatedEvents));
      } catch (error) {
        console.error('Error saving events to localStorage:', error);
      }
      return updatedEvents;
    });
  };

  const handleCloseModal = () => {
    setEventForm({ name: '', date: '', endDate: '' });
    setIsModalOpen(false);
    setIsEditMode(false);
  };

  return (
    <div className="flex flex-col gap-2 mb-6 bg-indigo-50 border-2 border-indigo-300 rounded-xl p-4 shadow-lg">
      <div className="flex justify-between items-center mb-2">
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium shadow-lg border border-indigo-700"
        >
          <PlusIcon className="h-5 w-5" />
          Add Event
        </button>
      </div>
      <div className="flex flex-wrap gap-3">
        {events.map(ev => {
          const eventDate = new Date(ev.date + 'T' + (ev.start || '00:00'));
          const now = new Date();
          const daysLeft = Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24));
          return (
            <div key={ev.id} className="flex flex-col items-start bg-white border border-gray-200 rounded-lg shadow-sm px-4 py-3 min-w-[220px] max-w-xs">
              <div className="text-2xl font-bold text-indigo-600">{daysLeft > 0 ? daysLeft : 0}</div>
              <div className="text-xs text-gray-400 -mt-1 mb-1">days</div>
              <div className="font-medium text-gray-900 truncate w-full">{ev.name}</div>
              <div className="text-sm text-gray-500">{new Date(ev.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</div>
              {ev.endDate && (
                <div className="text-xs text-gray-500">to {new Date(ev.endDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</div>
              )}
              <div className="flex gap-2 mt-2 self-end">
                <button 
                  onClick={() => handleEditEvent(ev)} 
                  className="text-xs text-blue-500 hover:underline"
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDeleteEvent(ev.id)} 
                  className="text-xs text-red-500 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
            <h2 className="text-lg font-semibold mb-4">{isEditMode ? 'Edit Event' : 'Add Event'}</h2>
            <form onSubmit={handleEventSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Event Name</label>
                <input 
                  type="text" 
                  name="name" 
                  value={eventForm.name} 
                  onChange={handleEventInput} 
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2" 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Event Start Date</label>
                <input 
                  type="date" 
                  name="date" 
                  value={eventForm.date} 
                  onChange={handleEventInput} 
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2" 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Event End Date (optional)</label>
                <input 
                  type="date" 
                  name="endDate" 
                  value={eventForm.endDate} 
                  onChange={handleEventInput} 
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2" 
                />
              </div>
              <div className="flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={handleCloseModal} 
                  className="px-4 py-2 bg-gray-200 rounded-md text-gray-700"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  {isEditMode ? 'Save Changes' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventManager; 