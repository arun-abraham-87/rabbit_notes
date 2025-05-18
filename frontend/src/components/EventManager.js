import React, { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/solid';

const EventManager = ({ selectedDate, onClose }) => {
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
  const [pendingDeleteId, setPendingDeleteId] = useState(null);
  
  // Format date to YYYY-MM-DD without timezone conversion
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [eventForm, setEventForm] = useState({ 
    name: '', 
    date: selectedDate ? formatDate(selectedDate) : '', 
    endDate: '',
    type: 'event', // Add type field with default value 'event'
    bgColor: '#ffffff' // Default background color
  });

  // Update eventForm when selectedDate changes
  useEffect(() => {
    if (selectedDate) {
      setEventForm(prev => ({
        ...prev,
        date: formatDate(selectedDate)
      }));
    }
  }, [selectedDate]);

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
    setEventForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEventSubmit = (e) => {
    e.preventDefault();
    if (!eventForm.name || (eventForm.type === 'event' && !eventForm.date)) return;
    
    if (isEditMode && eventForm.id) {
      // Update existing event/note
      setEvents(prev => prev.map(ev => ev.id === eventForm.id ? { ...eventForm } : ev));
    } else {
      // Add new event/note
      const newEvent = {
        id: Date.now(),
        ...eventForm
      };
      setEvents(prev => [...prev, newEvent]);
    }
    // Reset form and close modal
    setEventForm({ name: '', date: '', endDate: '', type: 'event', bgColor: '#ffffff' });
    setIsModalOpen(false);
    setIsEditMode(false);
  };

  const handleEditEvent = (event) => {
    setEventForm(event);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleDeleteEvent = (id) => {
    setPendingDeleteId(id);
  };

  const confirmDelete = () => {
    setEvents(prev => {
      const updatedEvents = prev.filter(ev => ev.id !== pendingDeleteId);
      try {
        localStorage.setItem('tempEvents', JSON.stringify(updatedEvents));
      } catch (error) {
        console.error('Error saving events to localStorage:', error);
      }
      return updatedEvents;
    });
    setPendingDeleteId(null);
  };

  const cancelDelete = () => {
    setPendingDeleteId(null);
  };

  const handleCloseModal = () => {
    setEventForm({ name: '', date: '', endDate: '', type: 'event', bgColor: '#ffffff' });
    setIsModalOpen(false);
    setIsEditMode(false);
    if (onClose) {
      onClose();
    }
  };

  const colorOptions = [
    '#ffffff', // white
    '#fef9c3', // yellow
    '#d1fae5', // green
    '#e0e7ff', // blue
    '#fee2e2', // red
    '#f3e8ff', // purple
    '#f1f5f9'  // gray
  ];

  return (
    <div className="flex flex-col gap-2 mb-6 bg-gray-50 rounded-xl">
      <div className="flex flex-row flex-wrap gap-3 items-stretch relative">
        {events.map(ev => {
          if (ev.type === 'note') {
            const [header, ...bodyLines] = (ev.name || '').split('\n');
            return (
              <div key={ev.id} className="group flex flex-col items-start border border-gray-200 rounded-lg shadow-sm px-4 py-3 min-w-[220px] max-w-xs h-40" style={{ backgroundColor: ev.bgColor || '#ffffff' }}>
                <div className="font-bold text-gray-900 w-full break-words" style={{ wordBreak: 'break-word' }}>
                  {header}
                </div>
                {bodyLines.length > 0 && (
                  <div className="text-sm text-gray-700 w-full break-words whitespace-pre-line mt-1" style={{ wordBreak: 'break-word' }}>
                    {bodyLines.join('\n')}
                  </div>
                )}
                <div className="flex gap-2 mt-2 self-end opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleEditEvent(ev)} 
                    className="text-blue-500 hover:text-blue-700 p-1"
                    title="Edit"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteEvent(ev.id)} 
                    className="text-red-500 hover:text-red-700 p-1"
                    title="Delete"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          }

          const eventDate = new Date(ev.date + 'T' + (ev.start || '00:00'));
          const now = new Date();
          const daysLeft = Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24));
          return (
            <div key={ev.id} className="group flex flex-col items-start border border-gray-200 rounded-lg shadow-sm px-4 py-3 min-w-[220px] max-w-xs h-40" style={{ backgroundColor: ev.bgColor || '#ffffff' }}>
              <div className="text-2xl font-bold text-gray-600">{daysLeft > 0 ? daysLeft : 0}</div>
              <div className="text-xs text-gray-400 -mt-1 mb-1">days</div>
              <div className="font-medium text-gray-900 w-full break-words truncate" style={{ wordBreak: 'break-word' }}>{ev.name}</div>
              <div className="text-sm text-gray-500">{new Date(ev.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</div>
              {ev.endDate && (
                <div className="text-xs text-gray-500">to {new Date(ev.endDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</div>
              )}
              <div className="flex gap-2 mt-2 self-end opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleEditEvent(ev)} 
                  className="text-blue-500 hover:text-blue-700 p-1"
                  title="Edit"
                >
                  <PencilIcon className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => handleDeleteEvent(ev.id)} 
                  className="text-red-500 hover:text-red-700 p-1"
                  title="Delete"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
        <button
          onClick={() => {
            setEventForm({
              name: '',
              date: selectedDate ? formatDate(selectedDate) : formatDate(new Date()),
              endDate: '',
              type: 'event',
              bgColor: '#ffffff'
            });
            setIsEditMode(false);
            setIsModalOpen(true);
          }}
          className="w-8 h-8 bg-gray-200/60 text-gray-400 rounded-full shadow-sm hover:bg-gray-300/80 transition-colors flex items-center justify-center self-center"
        >
          <PlusIcon className="h-3 w-3" />
        </button>
      </div>

      {/* Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-lg">
            <h2 className="text-lg font-semibold mb-4">{isEditMode ? 'Edit Event' : 'Add Event'}</h2>
            <form onSubmit={handleEventSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    className={`px-3 py-1 rounded-md border ${eventForm.type === 'event' ? 'bg-gray-700 text-white border-gray-700' : 'bg-white text-gray-700 border-gray-300'}`}
                    onClick={() => setEventForm(prev => ({ ...prev, type: 'event' }))}
                  >
                    Event
                  </button>
                  <button
                    type="button"
                    className={`px-3 py-1 rounded-md border ${eventForm.type === 'note' ? 'bg-gray-700 text-white border-gray-700' : 'bg-white text-gray-700 border-gray-300'}`}
                    onClick={() => setEventForm(prev => ({ ...prev, type: 'note' }))}
                  >
                    Note Card
                  </button>
                </div>
              </div>
              {eventForm.type === 'note' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Note Content</label>
                  <textarea
                    name="name"
                    value={eventForm.name}
                    onChange={handleEventInput}
                    className="mt-1 block w-full border border-gray-300 rounded-md p-2 min-h-[80px]"
                    required
                  />
                </div>
              ) : (
                <>
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
                    <label className="block text-sm font-medium text-gray-700">Event Date</label>
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
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Background Color</label>
                <div className="flex gap-2 mb-2">
                  {colorOptions.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`w-7 h-7 rounded-full border-2 ${eventForm.bgColor === color ? 'border-gray-700' : 'border-gray-200'}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setEventForm(prev => ({ ...prev, bgColor: color }))}
                    />
                  ))}
                </div>
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
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  {isEditMode ? 'Save Changes' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {pendingDeleteId && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-xs shadow-lg flex flex-col items-center">
            <div className="text-lg font-semibold mb-4 text-center">Are you sure you want to delete this item?</div>
            <div className="flex gap-4 mt-2">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 bg-gray-200 rounded-md text-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventManager; 