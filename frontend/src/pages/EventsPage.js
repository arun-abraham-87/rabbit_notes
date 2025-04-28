import React, { useState } from 'react';
import { formatDate } from '../utils/DateUtils';
import { PencilIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { updateNoteById, deleteNoteById } from '../utils/ApiUtils';

// Function to extract event details from note content
const getEventDetails = (content) => {
  const lines = content.split('\n');
  const description = lines[0];
  const dateTime = lines[1];
  const recurrenceMatch = content.match(/meta::event_recurrence::([^:]+)(?::(.+))?/);
  const recurrence = recurrenceMatch ? recurrenceMatch[1] : 'none';
  const days = recurrenceMatch && recurrenceMatch[2] ? recurrenceMatch[2].split(',') : [];

  return { description, dateTime, recurrence, days };
};

const EventsPage = ({ notes }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingEvent, setEditingEvent] = useState(null);
  const [editForm, setEditForm] = useState({
    description: '',
    dateTime: '',
    recurrence: 'none',
    days: []
  });

  // Filter notes to only show events and apply search filter
  const events = notes
    .filter(note => note.content.includes('meta::event::'))
    .filter(note => {
      const { description } = getEventDetails(note.content);
      return description.toLowerCase().includes(searchQuery.toLowerCase());
    });

  const handleEdit = (event) => {
    const details = getEventDetails(event.content);
    setEditingEvent(event);
    setEditForm({
      description: details.description,
      dateTime: details.dateTime,
      recurrence: details.recurrence,
      days: details.days
    });
  };

  const handleDelete = async (eventId) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await deleteNoteById(eventId);
        // Refresh the page or update the notes list
        window.location.reload();
      } catch (error) {
        console.error('Error deleting event:', error);
      }
    }
  };

  const handleSave = async () => {
    if (!editingEvent) return;

    const content = [
      editForm.description,
      editForm.dateTime,
      `meta::event::`,
      `meta::event_recurrence::${editForm.recurrence}${editForm.days.length ? '::' + editForm.days.join(',') : ''}`
    ].join('\n');

    try {
      await updateNoteById(editingEvent.id, content);
      setEditingEvent(null);
      // Refresh the page or update the notes list
      window.location.reload();
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Events</h1>
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {editingEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Edit Event</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <input
                  type="text"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date & Time</label>
                <input
                  type="datetime-local"
                  value={editForm.dateTime}
                  onChange={(e) => setEditForm({ ...editForm, dateTime: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Recurrence</label>
                <select
                  value={editForm.recurrence}
                  onChange={(e) => setEditForm({ ...editForm, recurrence: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="none">None</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setEditingEvent(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {events.map((event) => {
          const { description, dateTime, recurrence, days } = getEventDetails(event.content);
          const eventDate = new Date(dateTime);
          
          return (
            <div key={event.id} className="bg-white rounded-lg border p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{description}</h3>
                  <p className="text-sm text-gray-500">
                    {formatDate(eventDate)}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    {recurrence !== 'none' && (
                      <span className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
                        {recurrence.charAt(0).toUpperCase() + recurrence.slice(1)}
                      </span>
                    )}
                    {days.length > 0 && (
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                        {days.join(', ')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(event)}
                      className="p-1 text-gray-500 hover:text-indigo-600"
                      title="Edit event"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(event.id)}
                      className="p-1 text-gray-500 hover:text-red-600"
                      title="Delete event"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {events.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No events found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventsPage; 