import React, { useState, useMemo, useEffect } from 'react';
import { getDateInDDMMYYYYFormatWithAgeInParentheses } from '../utils/DateUtils';
import { PencilIcon, TrashIcon, MagnifyingGlassIcon, XMarkIcon, ExclamationTriangleIcon, CalendarIcon, ListBulletIcon, TagIcon, PlusIcon, EyeIcon, EyeSlashIcon, ArrowsRightLeftIcon, FlagIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import { updateNoteById, deleteNoteById, createNote } from '../utils/ApiUtils';
import EditEventModal from '../components/EditEventModal';
import CalendarView from '../components/CalendarView';
import CompareEventsModal from '../components/CompareEventsModal';
import BulkLoadExpenses from '../components/BulkLoadExpenses';

// Function to extract event details from note content
const getEventDetails = (content) => {
  const lines = content.split('\n');

  // Find the description
  const descriptionLine = lines.find(line => line.startsWith('event_description:'));
  const description = descriptionLine ? descriptionLine.replace('event_description:', '').trim() : '';

  // Find the event date
  const eventDateLine = lines.find(line => line.startsWith('event_date:'));
  const dateTime = eventDateLine ? eventDateLine.replace('event_date:', '').trim() : '';

  // Find event notes
  const notesLine = lines.find(line => line.startsWith('event_notes:'));
  const notes = notesLine ? notesLine.replace('event_notes:', '').trim() : '';

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

  return { description, dateTime, recurrence, metaDate, nextOccurrence, lastOccurrence, tags, notes };
};

const EventsPage = ({ allNotes, setAllNotes }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [daily, setDaily] = useState(0);
  const [weekly, setWeekly] = useState(0);
  const [monthly, setMonthly] = useState(0);
  const [none, setNone] = useState(0);
  const [showOnlyDeadlines, setShowOnlyDeadlines] = useState(false);
  const [isBulkLoadOpen, setIsBulkLoadOpen] = useState(false);
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [pastEventsCount, setPastEventsCount] = useState(0);
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

  // Get unique years from events
  const uniqueYears = useMemo(() => {
    const years = new Set();
    allNotes
      .filter(note => note?.content && note.content.includes('meta::event::'))
      .forEach(note => {
        const { dateTime } = getEventDetails(note.content);
        if (dateTime) {
          years.add(new Date(dateTime).getFullYear());
        }
      });
    return Array.from(years).sort((a, b) => b - a); // Sort years in descending order
  }, [allNotes]);

  useEffect(() => {
    const events = getCalendarEvents();
    setCalendarEvents(events);
    setTotal(events.length);

    // Calculate past events count
    if (!showOnlyDeadlines) {
      const pastEvents = allNotes
        .filter(note => note?.content && note.content.includes('meta::event::'))
        .filter(note => {
          const { dateTime, description, tags } = getEventDetails(note.content);
          if (!dateTime) return false;
          
          const eventDate = new Date(dateTime);
          const now = new Date();
          const isPast = eventDate < now;

          // Check if event matches current filters
          const matchesSearch = searchQuery === '' || description.toLowerCase().includes(searchQuery.toLowerCase());
          const matchesTags = selectedTags.length === 0 || 
            selectedTags.every(tag => tags.includes(tag));
          
          let matchesDate = true;
          if (selectedYear) {
            matchesDate = matchesDate && (eventDate.getFullYear() === parseInt(selectedYear));
          }
          if (selectedMonth) {
            matchesDate = matchesDate && (eventDate.getMonth() + 1 === parseInt(selectedMonth));
          }
          if (selectedDay) {
            matchesDate = matchesDate && (eventDate.getDate() === parseInt(selectedDay));
          }

          return isPast && matchesSearch && matchesTags && matchesDate;
        }).length;
      
      setPastEventsCount(pastEvents);
    } else {
      setPastEventsCount(0);
    }
  }, [allNotes, searchQuery, selectedTags, showOnlyDeadlines, selectedMonth, selectedDay, selectedYear]);

  const getCalendarEvents = () => {
    // Filter and group events
    const events = allNotes
      .filter(note => note?.content && note.content.includes('meta::event::'))
      .filter(note => {
        const { description, tags, dateTime } = getEventDetails(note.content);
        const matchesSearch = searchQuery === '' || description.toLowerCase().includes(searchQuery.toLowerCase());
        
        // Check if any filter is active
        const hasActiveFilters = searchQuery || selectedTags.length > 0 || selectedYear || selectedMonth || selectedDay;
        
        // Only apply deadline filter if no filters are active
        const matchesDeadline = hasActiveFilters ? true : (!showOnlyDeadlines || note.content.includes('meta::event_deadline'));
        
        // Month, day, and year filtering
        let matchesDate = true;
        if (dateTime) {
          const eventDate = new Date(dateTime);
          if (selectedYear && selectedYear !== '') {
            matchesDate = matchesDate && (eventDate.getFullYear() === parseInt(selectedYear));
          }
          if (selectedMonth && selectedMonth !== '') {
            matchesDate = matchesDate && (eventDate.getMonth() + 1 === parseInt(selectedMonth));
          }
          if (selectedDay && selectedDay !== '') {
            matchesDate = matchesDate && (eventDate.getDate() === parseInt(selectedDay));
          }
        }

        // If no tags are selected, show all events
        if (selectedTags.length === 0) {
          return matchesSearch && matchesDeadline && matchesDate;
        }
        // If tags are selected, show only events that have ALL selected tags
        const matchesTags = selectedTags.every(tag => tags.includes(tag));
        return matchesSearch && matchesTags && matchesDeadline && matchesDate;
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
      const { description, dateTime, recurrence, metaDate, nextOccurrence, lastOccurrence, notes } = getEventDetails(event.content);
      return {
        id: event.id,
        description,
        dateTime,
        recurrence,
        metaDate,
        nextOccurrence,
        lastOccurrence,
        notes,
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

  const handleEditEvent = (event) => {
    const originalNote = allNotes.find(n => n.id === event.id);
    if (originalNote) {
      const lines = originalNote.content.split('\n');
      const description = lines.find(line => line.startsWith('event_description:'))?.replace('event_description:', '').trim() || '';
      const eventDate = lines.find(line => line.startsWith('event_date:'))?.replace('event_date:', '').trim() || '';
      const location = lines.find(line => line.startsWith('event_location:'))?.replace('event_location:', '').trim() || '';
      const recurrenceType = lines.find(line => line.startsWith('event_recurring_type:'))?.replace('event_recurring_type:', '').trim() || '';

      setEditingEvent({
        id: event.id,
        description,
        date: eventDate,
        location,
        recurrenceType
      });
      setShowEditEventModal(true);
    }
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    setEditingEvent(null);
    setShowEditEventModal(true);
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

  const handleBulkCreate = async (expenseList) => {
    try {
      for (const expense of expenseList) {
        // Convert dd/mm/yyyy to YYYY-MM-DDThh:mm format
        const [day, month, year] = expense.date.split('/');
        const eventDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T12:00`;
        const metaDate = new Date(year, month - 1, day).toISOString();
        
        const content = `event_description:${expense.description}
event_date:${eventDate}
event_tags:${expense.tag}
meta::event::${metaDate}${expense.isDeadline ? '\nmeta::deadline\nmeta::event_deadline' : ''}`;
        
        await handleAddEvent(content);
      }
    } catch (error) {
      console.error('Error bulk creating events:', error);
    }
  };

  const handleEventUpdated = (eventId, updatedContent) => {
    updateNoteById(eventId, updatedContent);
    setAllNotes(allNotes.map(note => 
      note.id === eventId ? { ...note, content: updatedContent } : note
    ));
  };

  // Helper function to check if any filters are active
  const hasActiveFilters = () => {
    return searchQuery || selectedTags.length > 0 || selectedYear || selectedMonth || selectedDay;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Events</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsBulkLoadOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <ArrowUpTrayIcon className="h-5 w-5" />
            <span>Bulk Load</span>
          </button>
          <button
            onClick={() => setIsCompareModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <ArrowsRightLeftIcon className="h-5 w-5" />
            <span>Compare Events</span>
          </button>
          <button
            onClick={() => {
              setEditingEvent(null);
              setSelectedDate(null);
              setShowEditEventModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Add Event</span>
          </button>
        </div>
      </div>

      {/* Search and Tag Filter */}
      <div className="flex flex-col space-y-4">
        <div className="flex flex-col space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-full"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              )}
            </div>
            {(searchQuery || selectedTags.length > 0 || showOnlyDeadlines || selectedMonth || selectedDay || selectedYear) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedTags([]);
                  setShowOnlyDeadlines(false);
                  setSelectedMonth('');
                  setSelectedDay('');
                  setSelectedYear('');
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200 flex items-center gap-2 whitespace-nowrap"
              >
                <XMarkIcon className="h-4 w-4" />
                Clear All Filters
              </button>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowOnlyDeadlines(!showOnlyDeadlines)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 w-fit ${
                showOnlyDeadlines
                  ? 'bg-red-100 text-red-700 border border-red-200 hover:bg-red-200'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <FlagIcon className="h-5 w-5" />
              {showOnlyDeadlines ? 'Show All Events' : 'Show Deadlines Only'}
            </button>

            {/* Year Filter */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <option value="">All Years</option>
              {uniqueYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            {/* Month Filter */}
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <option value="">All Months</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                <option key={month} value={month}>
                  {new Date(2000, month - 1).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>

            {/* Day Filter */}
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <option value="">All Days</option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Past Events Note */}
        {showOnlyDeadlines && pastEventsCount > 0 && hasActiveFilters() && (
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-md border border-gray-200">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
            <span>
              {pastEventsCount} past event{pastEventsCount !== 1 ? 's' : ''} match{pastEventsCount !== 1 ? '' : 'es'} your filter{pastEventsCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Tag Pills */}
        <div className="flex flex-wrap gap-2 items-center">
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
          onDateClick={handleDateClick}
          notes={allNotes}
          onDelete={handleDelete}
          onAddEvent={handleAddEvent}
        />
      </div>

      {/* Add Event Modal */}
      <EditEventModal
        isOpen={showEditEventModal}
        note={editingEvent}
        onSave={(content) => {
          if (editingEvent) {
            handleEventUpdated(editingEvent.id, content);
          } else {
            handleAddEvent(content);
          }
          setShowEditEventModal(false);
          setEditingEvent(null);
          setSelectedDate(null);
        }}
        onCancel={() => {
          setShowEditEventModal(false);
          setEditingEvent(null);
          setSelectedDate(null);
        }}
        onSwitchToNormalEdit={() => {
          setShowEditEventModal(false);
          setEditingEvent(null);
          setSelectedDate(null);
        }}
        onDelete={(eventId) => {
          setAllNotes(allNotes.filter(note => note.id !== eventId));
          setShowEditEventModal(false);
          setEditingEvent(null);
          setSelectedDate(null);
        }}
        notes={allNotes}
      />

      {/* Compare Events Modal */}
      <CompareEventsModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        events={allNotes.filter(note => note?.content && note.content.includes('meta::event::'))}
      />

      {/* Add BulkLoadExpenses Modal */}
      <BulkLoadExpenses
        isOpen={isBulkLoadOpen}
        onClose={() => setIsBulkLoadOpen(false)}
        onBulkCreate={handleBulkCreate}
      />
    </div>
  );
};

export default EventsPage; 