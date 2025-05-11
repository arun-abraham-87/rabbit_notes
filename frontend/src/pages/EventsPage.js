import React, { useState, useMemo, useEffect } from 'react';
import { getDateInDDMMYYYYFormatWithAgeInParentheses } from '../utils/DateUtils';
import { PencilIcon, TrashIcon, MagnifyingGlassIcon, XMarkIcon, ExclamationTriangleIcon, CalendarIcon, ListBulletIcon, TagIcon, PlusIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { updateNoteById, deleteNoteById, createNote } from '../utils/ApiUtils';
import EditEventModal from '../components/EditEventModal';
import CalendarView from '../components/CalendarView';
import AddEventModal from '../components/AddEventModal';

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
  let recurrence = recurringLine ? recurringLine.replace('event_recurring_type:', '').trim() : 'none';
  // Find meta information
  const metaLine = lines.find(line => line.startsWith('meta::event::'));
  const metaDate = metaLine ? metaLine.replace('meta::event::', '').trim() : '';

  // Find tags
  const tagsLine = lines.find(line => line.startsWith('event_tags:'));
  const tags = tagsLine ? tagsLine.replace('event_tags:', '').trim().split(',').map(tag => tag.trim()) : [];

  // Calculate next occurrence for recurring events
  let nextOccurrence = null;
  let lastOccurrence = null;
  if (recurrence === 'none') {
    recurrence = "yearly"
  }
  else if (recurrence !== 'none' && dateTime) {
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

const EventsPage = ({ allNotes, setAllNotes }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [daily, setDaily] = useState(0);
  const [weekly, setWeekly] = useState(0);
  const [monthly, setMonthly] = useState(0);
  const [none, setNone] = useState(0);
  // Get all unique tags from events
  const uniqueTags = useMemo(() => {
    const tags = new Set();
    allNotes
      .filter(note => note?.content && note.content.includes('meta::event::'))
      .forEach(note => {
        const { tags: eventTags } = getEventDetails(note.content);
        eventTags.forEach(tag => tags.add(tag));
      });
    return Array.from(tags).sort();
  }, [allNotes]);

  useEffect(() => {
    setCalendarEvents(getCalendarEvents());
    setTotal(getCalendarEvents().length);
  }, [allNotes, searchQuery]);

  const getCalendarEvents = () => {
    // Filter and group events
    const events = allNotes
      .filter(note => note?.content && note.content.includes('meta::event::'))
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
    setTotal(total);
    setDaily(daily);
    setWeekly(weekly);
    setMonthly(monthly);
    setNone(none);

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
    return calendarEvents;
  };



  const handleDelete = async (eventId) => {
    const deletingEvent = allNotes.find(note => note.id === eventId);
    if (!deletingEvent) return;
    try {
      await deleteNoteById(deletingEvent.id);
      await setAllNotes(allNotes.filter(note => note.id !== deletingEvent.id));
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };



  const handleAcknowledgeEvent = async (eventId, year) => {
    const event = allNotes.find(note => note.id === eventId);
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
      const response = await updateNoteById(eventId, updatedContent);
      setAllNotes(allNotes.map(note =>
        note.id === eventId ? { ...note, content: response.content } : note
      ));
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

  const handleEventUpdated = async (id, updatedNote) => {
    await updateNoteById(id, updatedNote);
    setAllNotes(allNotes.map(note => note.id === id ? { ...note, content: updatedNote } : note));
    setIsAddEventModalOpen(false);
  };

  const handleAddEvent = async (content) => {
    try {
      const response = await createNote(content);
      console.log('API Response:', response);
      setAllNotes(prevNotes => [...prevNotes, response]); // Add the entire response object
      return response;
    } catch (error) {
      console.error('Error adding event:', error);
      throw error;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Events</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsAddEventModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Add Event</span>
          </button>

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
              className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${selectedTags.includes(tag)
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

      <div className="bg-white rounded-lg border p-6 shadow-sm">
        <CalendarView
          events={calendarEvents}
          onAcknowledgeEvent={handleAcknowledgeEvent}
          onEventUpdated={handleEventUpdated}
          notes={allNotes}
          onDelete={handleDelete}
        />
      </div>


      {/* Add Event Modal */}
      <AddEventModal
        isOpen={isAddEventModalOpen}
        onClose={() => setIsAddEventModalOpen(false)}
        onAdd={handleAddEvent}
        notes={allNotes}
      />




    </div>
  );
};

export default EventsPage; 