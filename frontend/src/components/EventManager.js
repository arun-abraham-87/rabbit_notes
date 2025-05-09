import React, { useState, useEffect } from 'react';
import { PlusIcon } from '@heroicons/react/24/solid';
import { createNote, updateNoteById } from '../utils/ApiUtils';

const EventManager = ({ selectedDate, onClose, onEventAdded, notes, setNotes, eventToEdit }) => {
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
    endDate: '' 
  });

  // Initialize form with event data if editing
  useEffect(() => {
    if (eventToEdit) {
      const lines = eventToEdit.content.split('\n');
      const title = lines[0].trim().replace('event_description:', '').trim();
      const eventDateLine = lines.find(line => line.trim().startsWith('event_date:'));
      const date = eventDateLine ? new Date(eventDateLine.split(':')[1].trim().split("T")[0]) : null;
      
      setEventForm({
        name: title,
        date: date ? formatDate(date) : formatDate(selectedDate),
        endDate: ''
      });
      setIsEditMode(true);
      setIsModalOpen(true);
    } else {
      setEventForm({
        name: '',
        date: selectedDate ? formatDate(selectedDate) : '',
        endDate: ''
      });
      setIsEditMode(false);
    }
  }, [eventToEdit, selectedDate]);

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

  const handleEventSubmit = async (e) => {
    e.preventDefault();
    if (!eventForm.name || !eventForm.date) return;
    
    try {
      // Create the event content with required metadata
      const eventContent = `event_description:${eventForm.name}\nevent_date:${eventForm.date}T12:00\nmeta::event::${eventForm.date}`;
      
      if (isEditMode && eventToEdit) {
        // Update existing note
        const response = await updateNoteById(eventToEdit.id, eventContent);
        if (response && response.note) {
          // Update the notes array
          if (setNotes && notes) {
            setNotes(notes.map(note => 
              note.id === eventToEdit.id ? response.note : note
            ));
          }
        }
      } else {
        // Create new note
        const response = await createNote(eventContent);
        if (response && response.note) {
          // Add the new note to the notes array
          if (setNotes && notes) {
            setNotes([...notes, response.note]);
          }
        }
      }
      
      // Reset form and close modal
      setEventForm({ name: '', date: '', endDate: '' });
      setIsModalOpen(false);
      setIsEditMode(false);
      
      // Notify parent component that an event was added/edited
      if (onEventAdded) {
        onEventAdded();
      }
    } catch (error) {
      console.error('Error creating/updating event:', error);
    }
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
    if (onClose) {
      onClose();
    }
  };

  return (
    <div className="flex flex-col gap-2 mb-6 bg-gray-50 rounded-xl">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold text-gray-900">Events</h2>
        <button
          onClick={() => {
            setEventForm({
              name: '',
              date: selectedDate ? formatDate(selectedDate) : formatDate(new Date()),
              endDate: ''
            });
            setIsEditMode(false);
            setIsModalOpen(true);
          }}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
        </button>
      </div>
      <div className="flex flex-wrap gap-3 items-start">
        {events.map(ev => {
          const eventDate = new Date(ev.date + 'T' + (ev.start || '00:00'));
          const now = new Date();
          const daysLeft = Math.ceil((eventDate - now) / (1000 * 60 * 60 * 24));
          return (
            <div key={ev.id} className="flex flex-col items-start bg-white border border-gray-200 rounded-lg shadow-sm px-4 py-3 min-w-[220px] max-w-xs">
              <div className="text-2xl font-bold text-gray-600">{daysLeft > 0 ? daysLeft : 0}</div>
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
    </div>
  );
};

export default EventManager; 