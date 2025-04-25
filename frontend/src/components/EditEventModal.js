import React, { useState, useEffect } from 'react';

const EditEventModal = ({ note, onSave, onCancel, onSwitchToNormalEdit }) => {
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [showEndDate, setShowEndDate] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState('daily');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');

  useEffect(() => {
    if (note) {
      const lines = note.content.split('\n');
      
      // Find the description
      const descriptionLine = lines.find(line => line.startsWith('event_description:'));
      if (descriptionLine) {
        setDescription(descriptionLine.replace('event_description:', '').trim());
      }
      
      // Find the event date
      const eventDateLine = lines.find(line => line.startsWith('event_date:'));
      if (eventDateLine) {
        const dateStr = eventDateLine.replace('event_date:', '').trim();
        setEventDate(dateStr.split('T')[0]);
      }
      
      // Find end date if exists
      const endDateLine = lines.find(line => line.startsWith('event_end_date:'));
      if (endDateLine) {
        const dateStr = endDateLine.replace('event_end_date:', '').trim();
        setEndDate(dateStr.split('T')[0]);
        setShowEndDate(true);
      }
      
      // Parse location
      const locationLine = lines.find(line => line.startsWith('event_location:'));
      if (locationLine) {
        setLocation(locationLine.replace('event_location:', '').trim());
      }

      // Parse recurring info
      const recurringLine = lines.find(line => line.startsWith('event_recurring_type:'));
      if (recurringLine) {
        setIsRecurring(true);
        setRecurrenceType(recurringLine.replace('event_recurring_type:', '').trim());
      }

      // Parse recurring end date
      const recurringEndLine = lines.find(line => line.startsWith('event_recurring_end:'));
      if (recurringEndLine) {
        setRecurrenceEndDate(recurringEndLine.replace('event_recurring_end:', '').trim());
      }
    }
  }, [note]);

  const formatDateWithNoonTime = (dateStr) => {
    if (!dateStr) return '';
    return `${dateStr}T12:00`;
  };

  const handleSubmit = () => {
    if (!description.trim() || !eventDate) return;
    
    let content = `meta::event::${new Date().toISOString()}\n`;
    content += `event_description:${description.trim()}\n`;
    content += `event_date:${formatDateWithNoonTime(eventDate)}`;
    
    if (showEndDate && endDate) {
      content += `\nevent_end_date:${formatDateWithNoonTime(endDate)}`;
    }
    if (location) {
      content += `\nevent_location:${location}`;
    }
    if (isRecurring) {
      content += `\nevent_recurring_type:${recurrenceType}`;
      if (recurrenceEndDate) {
        content += `\nevent_recurring_end:${recurrenceEndDate}`;
      }
    }
    
    onSave({ ...note, content });

    // Reset form
    setDescription('');
    setEventDate('');
    setEndDate('');
    setLocation('');
    setShowEndDate(false);
    setIsRecurring(false);
    setRecurrenceType('daily');
    setRecurrenceEndDate('');
  };

  // Close modal when clicking outside
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  // Update end date min value when start date changes
  const handleDateChange = (e) => {
    setEventDate(e.target.value);
    if (new Date(endDate) <= new Date(e.target.value)) {
      setEndDate(e.target.value);
    }
    if (new Date(recurrenceEndDate) <= new Date(e.target.value)) {
      setRecurrenceEndDate(e.target.value);
    }
  };

  // Handle cancel button click
  const handleCancel = () => {
    // Reset form state
    setDescription('');
    setEventDate('');
    setEndDate('');
    setLocation('');
    setShowEndDate(false);
    setIsRecurring(false);
    setRecurrenceType('daily');
    setRecurrenceEndDate('');
    
    // Call the onCancel prop
    if (typeof onCancel === 'function') {
      onCancel();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Edit Event</h2>
          <button
            onClick={onSwitchToNormalEdit}
            className="text-sm text-gray-600 hover:text-gray-800 underline"
          >
            Switch to Normal Edit
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Event description..."
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location (optional)
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Event location..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Event Date
            </label>
            <input
              type="date"
              value={eventDate}
              onChange={handleDateChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="showEndDate"
              checked={showEndDate}
              onChange={(e) => {
                setShowEndDate(e.target.checked);
                if (!e.target.checked) {
                  setEndDate('');
                }
              }}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="showEndDate" className="text-sm text-gray-600">
              Add end date
            </label>
          </div>

          {showEndDate && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={eventDate}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isRecurring"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isRecurring" className="text-sm text-gray-600">
              Recurring event
            </label>
          </div>

          {isRecurring && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recurrence Type
                </label>
                <select
                  value={recurrenceType}
                  onChange={(e) => setRecurrenceType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recurrence End Date (optional)
                </label>
                <input
                  type="date"
                  value={recurrenceEndDate}
                  onChange={(e) => setRecurrenceEndDate(e.target.value)}
                  min={eventDate}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!description.trim() || !eventDate}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditEventModal; 