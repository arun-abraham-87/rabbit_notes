import React, { useState, useMemo } from 'react';
import { getFormattedDateWithAge } from '../utils/DateUtils';
import { PencilIcon, TrashIcon, MagnifyingGlassIcon, XMarkIcon, ExclamationTriangleIcon, CalendarIcon, ListBulletIcon, TagIcon } from '@heroicons/react/24/outline';
import { updateNoteById, deleteNoteById } from '../utils/ApiUtils';
import EditEventModal from '../components/EditEventModal';
import CalendarView from '../components/CalendarView';

// Function to extract event details from note content
const getEventDetails = (content) => {
  const lines = content.split('\n');
  
  // Find the description
  const descriptionLine = lines.find(line => line.startsWith('event_description:'));
  const description = descriptionLine ? descriptionLine.replace('event_description:', '').trim() : '';
  
  // Find the event date
  const eventDateLine = lines.find(line => line.startsWith('event_date:'));
  const dateTime = eventDateLine ? eventDateLine.replace('event_date:', '').trim() : '';
  
  // Find recurring info
  const recurringLine = lines.find(line => line.startsWith('event_recurring_type:'));
  const recurrence = recurringLine ? recurringLine.replace('event_recurring_type:', '').trim() : 'none';
  
  // Find meta information
  const metaLine = lines.find(line => line.startsWith('meta::event::'));
  const metaDate = metaLine ? metaLine.replace('meta::event::', '').trim() : '';

  // Find tags
  const tagsLine = lines.find(line => line.startsWith('event_tags:'));
  const tags = tagsLine ? tagsLine.replace('event_tags:', '').trim().split(',').map(tag => tag.trim()) : [];

  // Calculate next occurrence for recurring events
  let nextOccurrence = null;
  let lastOccurrence = null;
  if (recurrence !== 'none' && dateTime) {
    const eventDate = new Date(dateTime);
    const now = new Date();
    
    // Calculate last occurrence
    lastOccurrence = new Date(eventDate);
    if (recurrence === 'daily') {
      // For daily events, last occurrence is today or yesterday
      while (lastOccurrence > now) {
        lastOccurrence.setDate(lastOccurrence.getDate() - 1);
      }
    } 
    else if (recurrence === 'weekly') {
      // For weekly events, last occurrence is this week or last week
      while (lastOccurrence > now) {
        lastOccurrence.setDate(lastOccurrence.getDate() - 7);
      }
    } 
    else if (recurrence === 'monthly') {
      // For monthly events, last occurrence is this month or last month
      while (lastOccurrence > now) {
        lastOccurrence.setMonth(lastOccurrence.getMonth() - 1);
      }
    }
    else if (recurrence === 'yearly') {
      // For yearly events, last occurrence is this year or last year
      while (lastOccurrence > now) {
        lastOccurrence.setFullYear(lastOccurrence.getFullYear() - 1);
      }
    }

    // Calculate next occurrence
    if (recurrence === 'daily') {
      nextOccurrence = new Date(lastOccurrence);
      nextOccurrence.setDate(lastOccurrence.getDate() + 1);
      while (nextOccurrence <= now) {
        nextOccurrence.setDate(nextOccurrence.getDate() + 1);
      }
    } 
    else if (recurrence === 'weekly') {
      nextOccurrence = new Date(lastOccurrence);
      nextOccurrence.setDate(lastOccurrence.getDate() + 7);
      while (nextOccurrence <= now) {
        nextOccurrence.setDate(nextOccurrence.getDate() + 7);
      }
    } 
    else if (recurrence === 'monthly') {
      nextOccurrence = new Date(lastOccurrence);
      nextOccurrence.setMonth(lastOccurrence.getMonth() + 1);
      while (nextOccurrence <= now) {
        nextOccurrence.setMonth(nextOccurrence.getMonth() + 1);
      }
    }
    else if (recurrence === 'yearly') {
      nextOccurrence = new Date(lastOccurrence);
      nextOccurrence.setFullYear(lastOccurrence.getFullYear() + 1);
      while (nextOccurrence <= now) {
        nextOccurrence.setFullYear(nextOccurrence.getFullYear() + 1);
      }
    }
  }

  return { description, dateTime, recurrence, metaDate, nextOccurrence, lastOccurrence, tags };
};

const EventsPage = ({ notes, onUpdate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [editingEvent, setEditingEvent] = useState(null);
  const [deletingEvent, setDeletingEvent] = useState(null);
  const [viewMode, setViewMode] = useState('calendar');
  const [editForm, setEditForm] = useState({
    description: '',
    dateTime: '',
    recurrence: 'none',
    days: []
  });

  // Get all unique tags from events
  const uniqueTags = useMemo(() => {
    const tags = new Set();
    notes
      .filter(note => note.content.includes('meta::event::'))
      .forEach(note => {
        const { tags: eventTags } = getEventDetails(note.content);
        eventTags.forEach(tag => tags.add(tag));
      });
    return Array.from(tags).sort();
  }, [notes]);

  // Filter and group events
  const events = notes
    .filter(note => note.content.includes('meta::event::'))
    .filter(note => {
      const { description, tags } = getEventDetails(note.content);
      const matchesSearch = description.toLowerCase().includes(searchQuery.toLowerCase());
      // If no tags are selected, show all events
      if (selectedTags.length === 0) {
        return matchesSearch;
      }
      // If tags are selected, show only events that have ALL selected tags
      const matchesTags = selectedTags.every(tag => tags.includes(tag));
      return matchesSearch && matchesTags;
    });

  // Calculate totals for different recurrence types
  const { total, daily, weekly, monthly, none } = events.reduce(
    (acc, event) => {
      const { recurrence } = getEventDetails(event.content);
      acc.total++;
      acc[recurrence]++;
      return acc;
    },
    { total: 0, daily: 0, weekly: 0, monthly: 0, none: 0 }
  );

  // Prepare events for calendar view
  const calendarEvents = events.map(event => {
    const { description, dateTime, recurrence, metaDate, nextOccurrence, lastOccurrence } = getEventDetails(event.content);
    return {
      id: event.id,
      description,
      dateTime,
      recurrence,
      metaDate,
      nextOccurrence,
      lastOccurrence,
      content: event.content
    };
  });

  const handleEdit = (event) => {
    setEditingEvent(event);
  };

  const handleDelete = async (eventId) => {
    const eventToDelete = notes.find(note => note.id === eventId);
    setDeletingEvent(eventToDelete);
  };

  const confirmDelete = async () => {
    if (!deletingEvent) return;

    try {
      await deleteNoteById(deletingEvent.id);
      // Update the notes list by removing the deleted event
      const updatedNotes = notes.filter(note => note.id !== deletingEvent.id);
      // Call the onUpdate prop directly
      onUpdate(updatedNotes);
      setDeletingEvent(null);
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const handleSave = async (updatedNote) => {
    try {
      await updateNoteById(updatedNote.id, updatedNote.content);
      // Update the notes list by updating the edited event
      const updatedNotes = notes.map(note => 
        note.id === updatedNote.id ? { ...note, content: updatedNote.content } : note
      );
      onUpdate(updatedNotes);
      setEditingEvent(null);
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  const handleAcknowledgeEvent = async (eventId, year) => {
    const event = notes.find(note => note.id === eventId);
    if (!event) return;

    // Add the acknowledgment meta tag with correct format
    const metaTag = `meta::acknowledged::${year}`;
    
    // Check if the tag already exists
    if (event.content.includes(metaTag)) {
      return; // Already acknowledged
    }

    // Add the meta tag to the content
    const updatedContent = event.content.trim() + '\n' + metaTag;

    try {
      // Update the note with the new content
      await updateNoteById(eventId, updatedContent);
      
      // Update the notes array with the new content
      const updatedNotes = notes.map(note => 
        note.id === eventId ? { ...note, content: updatedContent } : note
      );
      
      // Pass the updated notes array to onUpdate
      onUpdate(updatedNotes);
    } catch (error) {
      console.error('Error acknowledging event:', error);
    }
  };

  const handleTagClick = (tag) => {
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        // Remove the tag if it's already selected
        return prev.filter(t => t !== tag);
      } else {
        // Add the tag if it's not selected
        return [...prev, tag];
      }
    });
  };

  const handleEventUpdated = async (updatedNote) => {
    try {
      // If the note content is empty, it means the note was deleted
      if (!updatedNote.content) {
        // Update the notes list by removing the deleted event
        const updatedNotes = notes.filter(note => note.id !== updatedNote.id);
        onUpdate(updatedNotes);
        return;
      }

      await updateNoteById(updatedNote.id, updatedNote.content);
      // Update the notes list by updating the edited event
      const updatedNotes = notes.map(note => 
        note.id === updatedNote.id ? { ...note, content: updatedNote.content } : note
      );
      onUpdate(updatedNotes);
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Events</h1>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all duration-200 ${
                viewMode === 'list'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              title="List View"
            >
              <ListBulletIcon className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`p-2 rounded-lg transition-all duration-200 ${
                viewMode === 'calendar'
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              title="Calendar View"
            >
              <CalendarIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Search and Tag Filter */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-full"
            />
          </div>
        </div>
        
        {/* Tag Pills */}
        <div className="flex flex-wrap gap-2">
          {uniqueTags.map(tag => (
            <button
              key={tag}
              onClick={() => handleTagClick(tag)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
                selectedTags.includes(tag)
                  ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
              }`}
            >
              {tag}
            </button>
          ))}
          {selectedTags.length > 0 && (
            <button
              onClick={() => setSelectedTags([])}
              className="px-3 py-1 rounded-full text-sm font-medium text-gray-600 hover:text-gray-700 hover:bg-gray-200 border border-gray-200"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4 bg-white rounded-xl border p-4 shadow-sm">
        <div className="flex flex-col items-center p-3 rounded-lg border transition-all duration-200">
          <div className="text-xs font-medium text-gray-500">Total</div>
          <div className="text-2xl font-bold text-gray-900">{total}</div>
        </div>
        <div className="flex flex-col items-center p-3 rounded-lg border transition-all duration-200">
          <div className="text-xs font-medium text-indigo-600">Daily</div>
          <div className="text-2xl font-bold text-indigo-700">{daily}</div>
        </div>
        <div className="flex flex-col items-center p-3 rounded-lg border transition-all duration-200">
          <div className="text-xs font-medium text-indigo-600">Weekly</div>
          <div className="text-2xl font-bold text-indigo-700">{weekly}</div>
        </div>
        <div className="flex flex-col items-center p-3 rounded-lg border transition-all duration-200">
          <div className="text-xs font-medium text-indigo-600">Monthly</div>
          <div className="text-2xl font-bold text-indigo-700">{monthly}</div>
        </div>
        <div className="flex flex-col items-center p-3 rounded-lg border transition-all duration-200">
          <div className="text-xs font-medium text-gray-500">One-time</div>
          <div className="text-2xl font-bold text-gray-900">{none}</div>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <div className="bg-white rounded-lg border p-6 shadow-sm">
          <CalendarView 
            events={calendarEvents} 
            onAcknowledgeEvent={handleAcknowledgeEvent}
            onEventUpdated={handleEventUpdated}
            notes={notes}
          />
        </div>
      ) : (
        <div className="grid gap-4">
          {events.map((event) => {
            const { description, dateTime, recurrence, metaDate, nextOccurrence, lastOccurrence, tags } = getEventDetails(event.content);
            const eventDate = new Date(dateTime);
            const isToday = eventDate.toDateString() === new Date().toDateString();
            
            return (
              <div 
                key={event.id} 
                className={`bg-white rounded-lg border p-4 shadow-sm ${
                  isToday ? 'border-2 border-indigo-500 bg-indigo-50' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`text-lg font-medium ${
                      isToday ? 'text-indigo-900' : 'text-gray-900'
                    }`}>
                      {description}
                      {isToday && (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          Today
                        </span>
                      )}
                    </h3>
                    <p className={`text-sm ${
                      isToday ? 'text-indigo-700' : 'text-gray-500'
                    }`}>
                      {getFormattedDateWithAge(eventDate)}
                    </p>
                    {recurrence !== 'none' && (
                      <div className="mt-1 space-y-1">
                        {lastOccurrence && (
                          <p className="text-xs text-gray-600">
                            Last occurrence: {getFormattedDateWithAge(lastOccurrence)}
                          </p>
                        )}
                        {nextOccurrence && (
                          <p className="text-xs text-indigo-600">
                            Next occurrence: {getFormattedDateWithAge(nextOccurrence)}
                          </p>
                        )}
                      </div>
                    )}
                    {/* Tags display */}
                    {tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {tags.map(tag => (
                          <span
                            key={tag}
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              isToday 
                                ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                                : 'bg-gray-100 text-gray-600 border border-gray-200'
                            }`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {recurrence !== 'none' && (
                        <span className="px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-full">
                          {recurrence.charAt(0).toUpperCase() + recurrence.slice(1)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(event)}
                        className={`p-1 ${
                          isToday ? 'text-indigo-600 hover:text-indigo-700' : 'text-gray-500 hover:text-indigo-600'
                        }`}
                        title="Edit event"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(event.id)}
                        className={`p-1 ${
                          isToday ? 'text-indigo-600 hover:text-red-600' : 'text-gray-500 hover:text-red-600'
                        }`}
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
      )}

      {/* Edit Event Modal */}
      {editingEvent && (
        <EditEventModal
          note={editingEvent}
          onSave={handleSave}
          onCancel={() => setEditingEvent(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
              <h2 className="text-xl font-semibold text-gray-900">Delete Event</h2>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this event? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeletingEvent(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
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

export default EventsPage; 