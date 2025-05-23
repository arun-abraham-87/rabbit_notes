import React, { useState, useEffect } from 'react';
import { getAllUniqueTags } from '../utils/EventUtils';

const AddEventModal = ({ isOpen, onClose, onAdd, notes, isAddDeadline, initialValues }) => {
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [showEndDate, setShowEndDate] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState('daily');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [tags, setTags] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [isDeadline, setIsDeadline] = useState(isAddDeadline || false);
  const [eventNotes, setEventNotes] = useState('');

  // Initialize form with initialValues if provided
  useEffect(() => {
    if (initialValues) {
      setDescription(initialValues.description || '');
      setEventDate(initialValues.date ? new Date(initialValues.date).toISOString().split('T')[0] : '');
      setLocation(initialValues.location || '');
      setIsRecurring(!!initialValues.recurrenceType);
      setRecurrenceType(initialValues.recurrenceType || 'daily');
      setIsDeadline(isAddDeadline || false);
      
      // Extract notes from the content if it exists
      if (initialValues.content) {
        const lines = initialValues.content.split('\n');
        const notesLine = lines.find(line => line.startsWith('event_notes:'));
        if (notesLine) {
          setEventNotes(notesLine.replace('event_notes:', '').trim());
        }
      }
    }
  }, [initialValues, isAddDeadline]);

  const existingTags = getAllUniqueTags(notes || []);

  if (!isOpen) return null;

  const formatDateWithNoonTime = (dateStr) => {
    if (!dateStr) return '';
    return `${dateStr}T12:00`;
  };

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    const newTags = tags ? `${tags},${tagInput.trim()}` : tagInput.trim();
    setTags(newTags);
    setTagInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleAddExistingTag = (tag) => {
    if (!tags) {
      setTags(tag);
    } else if (!tags.split(',').includes(tag)) {
      setTags(`${tags},${tag}`);
    }
  };

  const handleSubmit = () => {
    if (!description.trim() || !eventDate) return;
    
    let content = `event_description:${description.trim()}\n`;
    content += `event_date:${formatDateWithNoonTime(eventDate)}`;
    
    if (!isDeadline) {
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
      
      // Add tags if any
      if (tags) {
        content += `\nevent_tags:${tags}`;
      }

      // Add notes if any
      if (eventNotes) {
        content += `\nevent_notes:${eventNotes}`;
      }
    }
    
    // Add meta information as the last lines
    content += `\nmeta::event::${new Date().toISOString()}`;
    if (isDeadline) {
      content += `\nmeta::event_deadline`;
    }
    console.log("Calling add event",content) 
    onAdd(content);
    console.log("Called add event")
    
    // Reset form
    setDescription('');
    setEventDate('');
    setEndDate('');
    setLocation('');
    setShowEndDate(false);
    setIsRecurring(false);
    setRecurrenceType('daily');
    setRecurrenceEndDate('');
    setTags('');
    setTagInput('');
    setIsDeadline(isAddDeadline || false);
    setEventNotes('');
    onClose();
  };

  // Close modal when clicking outside
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
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

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">{isDeadline ? 'Add Deadline' : 'Add Event'}</h2>
        
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDeadline"
              checked={isDeadline}
              onChange={(e) => setIsDeadline(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="isDeadline" className="text-sm text-gray-600">
              Is Deadline
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={isDeadline ? "Deadline description..." : "Event description..."}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isDeadline ? 'Deadline Date' : 'Event Date'}
            </label>
            <input
              type="date"
              value={eventDate}
              onChange={handleDateChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {!isDeadline && (
            <>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={eventNotes}
                  onChange={(e) => setEventNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add any additional notes..."
                  rows="3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                </label>
                {existingTags.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs text-gray-500 mb-1">Existing tags:</p>
                    <div className="flex flex-wrap gap-1">
                      {existingTags.map((tag, index) => (
                        <button
                          key={index}
                          onClick={() => handleAddExistingTag(tag)}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add tags..."
                  />
                  <button
                    onClick={handleAddTag}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                  >
                    Add
                  </button>
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {isDeadline ? 'Create Deadline' : 'Create Event'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddEventModal; 