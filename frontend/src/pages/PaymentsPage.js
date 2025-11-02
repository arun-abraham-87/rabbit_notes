import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon, XMarkIcon, DocumentTextIcon, PlusIcon, CalendarIcon, PencilIcon } from '@heroicons/react/24/outline';
import EditEventModal from '../components/EditEventModal';
import { createNote, updateNoteById, deleteNoteById } from '../utils/ApiUtils';
import { addNoteToIndex } from '../utils/SearchUtils';

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
  
  // Find tags
  const tagsLine = lines.find(line => line.startsWith('event_tags:'));
  const tags = tagsLine ? tagsLine.replace('event_tags:', '').trim().split(',').map(tag => tag.trim()) : [];
  
  // Find custom fields (like event_$:5.4)
  const customFields = {};
  lines.forEach(line => {
    if (line.startsWith('event_') && line.includes(':')) {
      const [key, value] = line.split(':');
      if (key !== 'event_description' && key !== 'event_date' && key !== 'event_notes' && key !== 'event_recurring_type' && key !== 'event_tags') {
        const fieldName = key.replace('event_', '');
        customFields[fieldName] = value.trim();
      }
    }
  });
  
  return { description, dateTime, tags, customFields, recurrence };
};

// Helper function to extract dollar amount from event data
const extractDollarAmount = (description, customFields = {}) => {
  // First check for event_$ custom field
  if (customFields['$']) {
    const value = parseFloat(customFields['$']);
    if (!isNaN(value)) {
      return value;
    }
  }
  
  // Fall back to parsing dollar amounts from description text
  if (!description) return 0;
  const matches = description.match(/\$[\d,]+(?:\.\d{2})?/g);
  if (!matches) return 0;
  
  return matches.reduce((total, match) => {
    const value = parseFloat(match.replace(/[$,]/g, ''));
    return total + (isNaN(value) ? 0 : value);
  }, 0);
};

// Helper function to extract day from date
const extractDay = (dateTime) => {
  if (!dateTime) return null;
  const date = new Date(dateTime);
  return date.getDate(); // Returns day of month (1-31)
};

// Helper function to calculate next occurrence for payment events
// For payments, we use the day of the month from the original date
const getNextOccurrence = (dateTime, recurrence) => {
  if (!dateTime) return null;
  
  const eventDate = new Date(dateTime);
  const dayOfMonth = eventDate.getDate(); // Extract day (1-31)
  const now = new Date();
  
  // For payment tags, we always treat them as monthly recurring based on the day
  // If recurrence is set to 'none' or not specified, default to monthly for payments
  const effectiveRecurrence = recurrence === 'none' || !recurrence ? 'monthly' : recurrence;
  
  if (effectiveRecurrence === 'monthly') {
    // Use the day of month from the original date
    // Calculate the next occurrence for this month or next month
    const todayDay = now.getDate();
    const currentMonthTry = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
    const nextMonthTry = new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth);
    
    // Check if the date rolled over to next month (indicates day doesn't exist in target month)
    // If month changed, use last day of target month instead
    let currentMonth;
    if (currentMonthTry.getMonth() !== now.getMonth()) {
      // Day doesn't exist in current month, use last day of current month
      currentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of current month
    } else {
      currentMonth = currentMonthTry;
    }
    
    let nextMonth;
    const targetNextMonth = now.getMonth() + 1;
    if (nextMonthTry.getMonth() !== targetNextMonth % 12) {
      // Day doesn't exist in next month, use last day of next month
      nextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0); // Last day of next month
    } else {
      nextMonth = nextMonthTry;
    }
    
    // If payment day matches today's day, show it for today
    if (dayOfMonth === todayDay) {
      // Return today's date at the start of day
      const today = new Date(now.getFullYear(), now.getMonth(), todayDay);
      today.setHours(0, 0, 0, 0);
      return today;
    }
    
    // Return the next occurrence (this month if day hasn't passed, else next month)
    if (currentMonth >= now) {
      return currentMonth;
    } else {
      return nextMonth;
    }
  } else if (effectiveRecurrence === 'yearly') {
    // For yearly, use the same day and month each year
    const thisYear = new Date(now.getFullYear(), eventDate.getMonth(), dayOfMonth);
    const nextYear = new Date(now.getFullYear() + 1, eventDate.getMonth(), dayOfMonth);
    
    // Adjust for invalid dates (e.g., Feb 29 in non-leap year)
    if (thisYear.getDate() !== dayOfMonth) {
      thisYear.setDate(0);
    }
    if (nextYear.getDate() !== dayOfMonth) {
      nextYear.setDate(0);
    }
    
    if (thisYear >= now) {
      return thisYear;
    } else {
      return nextYear;
    }
  } else if (effectiveRecurrence === 'weekly') {
    // For weekly, calculate days until next occurrence
    const daysSinceEvent = Math.floor((now - eventDate) / (1000 * 60 * 60 * 24));
    const weeksSince = Math.floor(daysSinceEvent / 7);
    const nextOccurrence = new Date(eventDate);
    nextOccurrence.setDate(eventDate.getDate() + (weeksSince + 1) * 7);
    return nextOccurrence >= now ? nextOccurrence : new Date(nextOccurrence.getTime() + 7 * 24 * 60 * 60 * 1000);
  } else if (effectiveRecurrence === 'daily') {
    // For daily, next occurrence is tomorrow
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    return tomorrow;
  }
  
  // Fallback: treat as monthly
  const currentMonthTry = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
  const nextMonthTry = new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth);
  
  let currentMonth;
  if (currentMonthTry.getMonth() !== now.getMonth()) {
    currentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  } else {
    currentMonth = currentMonthTry;
  }
  
  let nextMonth;
  const targetNextMonth = now.getMonth() + 1;
  if (nextMonthTry.getMonth() !== targetNextMonth % 12) {
    nextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0);
  } else {
    nextMonth = nextMonthTry;
  }
  
  return currentMonth >= now ? currentMonth : nextMonth;
};

// Helper function to format date
const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { 
    weekday: 'short',
    month: 'short', 
    day: 'numeric',
    year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  });
};

// Helper function to calculate days until payment
const getDaysUntil = (date) => {
  if (!date) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const paymentDate = new Date(date);
  paymentDate.setHours(0, 0, 0, 0);
  const diff = Math.floor((paymentDate - today) / (1000 * 60 * 60 * 24));
  return diff;
};

const PaymentsPage = ({ allNotes, onCreateNote, setAllNotes }) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showEditEventModal, setShowEditEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showPastPayments, setShowPastPayments] = useState(false);

  const handleViewNote = (eventId) => {
    navigate(`/notes?note=${eventId}`);
  };

  const handleEditEvent = (event) => {
    // Find the original note by ID
    const originalNote = allNotes.find(n => n.id === event.note.id);
    if (originalNote) {
      setEditingEvent(originalNote);
      setShowEditEventModal(true);
    }
  };

  // Handle adding a new payment via EditEventModal
  const handleAddPayment = async (content) => {
    try {
      const response = await createNote(content);
      console.log('[PaymentsPage] handleAddPayment response:', response);
      
      if (setAllNotes) {
        setAllNotes(prevNotes => [...prevNotes, response]);
      }
      
      if (response && response.content) {
        addNoteToIndex(response);
      }
      
      return response;
    } catch (error) {
      console.error('Error adding payment:', error);
      throw error;
    }
  };

  // Get all payment events with their next occurrence
  const paymentEvents = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    const events = allNotes
      .filter(note => note?.content && note.content.includes('meta::event'))
      .map(note => {
        const eventDetails = getEventDetails(note.content);
        const { dateTime, recurrence } = eventDetails;
        
        // Get next occurrence for this payment
        const nextOccurrence = getNextOccurrence(dateTime, recurrence || 'none');
        
        return {
          note,
          ...eventDetails,
          nextOccurrence,
          daysUntil: nextOccurrence ? getDaysUntil(nextOccurrence) : null
        };
      })
      .filter(event => event.tags.some(tag => tag.toLowerCase() === 'payment'));

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return events.filter(event => {
        const description = event.description.toLowerCase();
        const amount = extractDollarAmount(event.description, event.customFields).toString();
        const dateStr = event.nextOccurrence ? formatDate(event.nextOccurrence).toLowerCase() : '';
        
        return description.includes(query) || 
               amount.includes(query) || 
               dateStr.includes(query);
      });
    }
    
    return events;
  }, [allNotes, searchQuery]);

  // Filter upcoming payments for this month
  const upcomingThisMonth = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    return paymentEvents
      .filter(event => {
        if (!event.nextOccurrence) return false;
        const occurrenceDate = new Date(event.nextOccurrence);
        const occurrenceYear = occurrenceDate.getFullYear();
        const occurrenceMonth = occurrenceDate.getMonth();
        
        // Include payments happening this month or upcoming
        return (occurrenceYear === currentYear && occurrenceMonth === currentMonth && occurrenceDate.getDate() >= now.getDate()) ||
               (occurrenceYear === currentYear && occurrenceMonth > currentMonth) ||
               (occurrenceYear > currentYear);
      })
      .sort((a, b) => {
        // Sort by next occurrence date (earliest first)
        if (!a.nextOccurrence && !b.nextOccurrence) return 0;
        if (!a.nextOccurrence) return 1;
        if (!b.nextOccurrence) return -1;
        return new Date(a.nextOccurrence) - new Date(b.nextOccurrence);
      });
  }, [paymentEvents]);

  // Filter past payments
  const pastPayments = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    return paymentEvents
      .filter(event => {
        if (!event.nextOccurrence) return false;
        const occurrenceDate = new Date(event.nextOccurrence);
        occurrenceDate.setHours(0, 0, 0, 0);
        return occurrenceDate < now;
      })
      .sort((a, b) => {
        // Sort by date (most recent first)
        if (!a.nextOccurrence && !b.nextOccurrence) return 0;
        if (!a.nextOccurrence) return 1;
        if (!b.nextOccurrence) return -1;
        return new Date(b.nextOccurrence) - new Date(a.nextOccurrence);
      });
  }, [paymentEvents]);

  // Calculate estimated total for this month
  const estimatedMonthlyTotal = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    return upcomingThisMonth
      .filter(event => {
        if (!event.nextOccurrence) return false;
        const occurrenceDate = new Date(event.nextOccurrence);
        return occurrenceDate.getFullYear() === currentYear && occurrenceDate.getMonth() === currentMonth;
      })
      .reduce((total, event) => {
        return total + extractDollarAmount(event.description, event.customFields);
      }, 0);
  }, [upcomingThisMonth]);

  // Calculate total for all upcoming payments
  const totalUpcoming = useMemo(() => {
    return upcomingThisMonth.reduce((total, event) => {
      return total + extractDollarAmount(event.description, event.customFields);
    }, 0);
  }, [upcomingThisMonth]);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-600 mt-1">Track your upcoming monthly payments</p>
        </div>
        <button
          onClick={() => {
            setEditingEvent(null);
            setShowEditEventModal(true);
          }}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
        >
          <PlusIcon className="h-5 w-5" />
          Add Payment
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <div className="text-sm text-gray-600 font-medium mb-2">This Month</div>
          <div className="text-3xl font-bold text-green-600">
            ${estimatedMonthlyTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {upcomingThisMonth.filter(e => {
              if (!e.nextOccurrence) return false;
              const d = new Date(e.nextOccurrence);
              return d.getFullYear() === new Date().getFullYear() && d.getMonth() === new Date().getMonth();
            }).length} payment{upcomingThisMonth.filter(e => {
              if (!e.nextOccurrence) return false;
              const d = new Date(e.nextOccurrence);
              return d.getFullYear() === new Date().getFullYear() && d.getMonth() === new Date().getMonth();
            }).length !== 1 ? 's' : ''} due
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <div className="text-sm text-gray-600 font-medium mb-2">Total Upcoming</div>
          <div className="text-3xl font-bold text-blue-600">
            ${totalUpcoming.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {upcomingThisMonth.length} payment{upcomingThisMonth.length !== 1 ? 's' : ''} scheduled
          </div>
        </div>
        
        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <div className="text-sm text-gray-600 font-medium mb-2">Next Payment</div>
          {upcomingThisMonth.length > 0 && upcomingThisMonth[0].nextOccurrence ? (
            <>
              <div className="text-2xl font-bold text-purple-600">
                {formatDate(upcomingThisMonth[0].nextOccurrence)}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {upcomingThisMonth[0].daysUntil === 0 ? 'Today' : 
                 upcomingThisMonth[0].daysUntil === 1 ? 'Tomorrow' :
                 upcomingThisMonth[0].daysUntil > 0 ? `in ${upcomingThisMonth[0].daysUntil} days` : ''}
              </div>
            </>
          ) : (
            <div className="text-2xl font-bold text-gray-400">No payments</div>
          )}
        </div>
      </div>

      {/* Search Box */}
      <div className="mb-6">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search payments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Upcoming Payments This Month */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <CalendarIcon className="h-6 w-6 text-blue-600" />
          Upcoming Payments This Month
        </h2>
        
        {upcomingThisMonth.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-500">
            <p>No upcoming payments found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingThisMonth.map((event) => {
              const amount = extractDollarAmount(event.description, event.customFields);
              const daysUntil = event.daysUntil;
              
              // Determine if it's this month or future month
              const now = new Date();
              const occurrenceDate = event.nextOccurrence ? new Date(event.nextOccurrence) : null;
              const isThisMonth = occurrenceDate && 
                occurrenceDate.getFullYear() === now.getFullYear() && 
                occurrenceDate.getMonth() === now.getMonth();
              
              return (
                <div
                  key={event.note.id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {occurrenceDate && (
                          <span className={`text-sm font-medium px-3 py-1 rounded ${
                            daysUntil === 0 ? 'bg-red-100 text-red-700' :
                            daysUntil !== null && daysUntil <= 3 ? 'bg-orange-100 text-orange-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {formatDate(occurrenceDate)}
                          </span>
                        )}
                        {daysUntil !== null && (
                          <span className="text-sm text-gray-600">
                            {daysUntil === 0 ? 'Due today' : 
                             daysUntil === 1 ? 'Due tomorrow' :
                             daysUntil > 0 ? `${daysUntil} days away` : ''}
                          </span>
                        )}
                        {!isThisMonth && occurrenceDate && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {occurrenceDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {event.description || 'Untitled Payment'}
                      </h3>
                      <div className="flex items-center gap-4 mt-2">
                        <span className={`text-xl font-bold ${amount > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                          ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        {event.recurrence && event.recurrence !== 'none' && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {event.recurrence === 'monthly' ? 'Monthly' :
                             event.recurrence === 'weekly' ? 'Weekly' :
                             event.recurrence === 'daily' ? 'Daily' :
                             event.recurrence === 'yearly' ? 'Yearly' : event.recurrence}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditEvent(event)}
                        className="flex-shrink-0 p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit Payment"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleViewNote(event.note.id)}
                        className="flex-shrink-0 p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View in Notes"
                      >
                        <DocumentTextIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Past Payments (Collapsible) */}
      {pastPayments.length > 0 && (
        <div className="mb-8">
          <button
            onClick={() => setShowPastPayments(!showPastPayments)}
            className="flex items-center gap-2 text-lg font-semibold text-gray-700 mb-4 hover:text-gray-900 transition-colors"
          >
            <span className={`transform transition-transform ${showPastPayments ? 'rotate-90' : ''}`}>▶</span>
            Past Payments ({pastPayments.length})
          </button>
          
          {showPastPayments && (
            <div className="space-y-3">
              {pastPayments.map((event) => {
                const amount = extractDollarAmount(event.description, event.customFields);
                
                return (
                  <div
                    key={event.note.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 opacity-75 hover:opacity-100 transition-opacity"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {event.nextOccurrence && (
                            <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded font-medium">
                              {formatDate(event.nextOccurrence)}
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-1">
                          {event.description || 'Untitled Payment'}
                        </h3>
                        <span className={`text-xl font-bold ${amount > 0 ? 'text-gray-600' : 'text-gray-400'}`}>
                          ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditEvent(event)}
                          className="flex-shrink-0 p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit Payment"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleViewNote(event.note.id)}
                          className="flex-shrink-0 p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View in Notes"
                        >
                          <DocumentTextIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* EditEventModal for adding/editing payments */}
      <EditEventModal
        isOpen={showEditEventModal}
        note={editingEvent}
        onSave={async (content) => {
          if (editingEvent) {
            // Update existing event
            try {
              const updatedNote = await updateNoteById(editingEvent.id, content);
              if (setAllNotes) {
                setAllNotes(prevNotes => prevNotes.map(note => 
                  note.id === editingEvent.id ? updatedNote : note
                ));
              }
              setShowEditEventModal(false);
              setEditingEvent(null);
              return updatedNote;
            } catch (error) {
              console.error('Error updating payment:', error);
              throw error;
            }
          } else {
            // Create new payment
            const result = await handleAddPayment(content);
            setShowEditEventModal(false);
            setEditingEvent(null);
            return result;
          }
        }}
        onCancel={() => {
          setShowEditEventModal(false);
          setEditingEvent(null);
        }}
        onSwitchToNormalEdit={() => {
          if (editingEvent) {
            navigate(`/notes?note=${editingEvent.id}`);
          }
          setShowEditEventModal(false);
          setEditingEvent(null);
        }}
        onDelete={async (eventId) => {
          // Handle deletion if needed
          try {
            await deleteNoteById(eventId);
            if (setAllNotes) {
              setAllNotes(prevNotes => prevNotes.filter(note => note.id !== eventId));
            }
            setShowEditEventModal(false);
            setEditingEvent(null);
          } catch (error) {
            console.error('Error deleting payment:', error);
          }
        }}
        notes={allNotes}
        prePopulatedTags={editingEvent ? undefined : "payment"}
      />
    </div>
  );
};

export default PaymentsPage;
