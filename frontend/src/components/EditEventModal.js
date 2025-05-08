import React, { useState, useEffect } from 'react';
import { getAllUniqueTags } from '../utils/EventUtils';
import { deleteNoteById } from '../utils/ApiUtils';
import ConfirmationModal from './ConfirmationModal';

const EditEventModal = ({ note, onSave, onCancel, onSwitchToNormalEdit, onDelete, notes }) => {
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [showEndDate, setShowEndDate] = useState(false);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState('daily');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [tags, setTags] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const existingTags = getAllUniqueTags(notes || []);

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

      // Parse tags
      const tagsLine = lines.find(line => line.startsWith('event_tags:'));
      if (tagsLine) {
        setTags(tagsLine.replace('event_tags:', '').trim());
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

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    const newTags = tags ? `${tags},${tagInput.trim()}` : tagInput.trim();
    setTags(newTags);
    setTagInput('');
  };

  const handleAddExistingTag = (tag) => {
    if (!tags) {
      setTags(tag);
    } else if (!tags.split(',').includes(tag)) {
      setTags(`${tags},${tag}`);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = () => {
    if (!description.trim() || !eventDate) return;
    
    let content = `event_description:${description.trim()}\n`;
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
    
    // Add tags if any
    if (tags) {
      content += `\nevent_tags:${tags}`;
    }
    
    // Add meta information as the last lines
    content += `\nmeta::event::${new Date().toISOString()}`;
    
    onSave(content);

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
  };

  const handleDelete = async () => {
    try {
      await deleteNoteById(note.id);
      // Only call onDelete if the deletion was successful
      onDelete({ ...note, content: '' });
    } catch (error) {
      console.error('Error deleting event:', error);
      // Don't call onDelete if the deletion failed
      onCancel();
    }
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
    setTags('');
    setTagInput('');
    
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
                      className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
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
                placeholder="Add tags (press Enter)"
              />
              <button
                onClick={handleAddTag}
                className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Add
              </button>
            </div>
            {tags && (
              <div className="mt-2 flex flex-wrap gap-2">
                {tags.split(',').map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {tag}
                    <button
                      onClick={() => {
                        const updatedTags = tags.split(',')
                          .filter((_, i) => i !== index)
                          .join(',');
                        setTags(updatedTags);
                      }}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-between">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100"
          >
            Delete Event
          </button>
          <div className="flex space-x-3">
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

      <ConfirmationModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
};

export default EditEventModal; 