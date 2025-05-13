import React, { useState, useEffect } from 'react';
import { addNewNoteCommon, updateNoteById, deleteNoteById } from '../utils/ApiUtils';
import { toast } from 'react-toastify';
import {
  XMarkIcon,
  CheckIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/solid';

const AddTracker = ({ onTrackerAdded, onTrackerUpdated, editingTracker, onCancel, onTrackerDeleted }) => {
  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [type, setType] = useState('Yes,No');
  const [cadence, setCadence] = useState('Daily');
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState('');
  const [selectedDays, setSelectedDays] = useState({
    Monday: false,
    Tuesday: false,
    Wednesday: false,
    Thursday: false,
    Friday: false,
    Saturday: false,
    Sunday: false
  });
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Populate form fields when editing
  useEffect(() => {
    if (editingTracker) {
      setTitle(editingTracker.title || '');
      setQuestion(editingTracker.question || '');
      setType(editingTracker.type || 'Yes,No');
      setCadence(editingTracker.cadence || 'Daily');
      setStartDate(editingTracker.startDate || new Date().toISOString().split('T')[0]);
      setEndDate(editingTracker.endDate || '');
      
      // Set selected days for weekly cadence
      if (editingTracker.days) {
        const daysState = {
          Monday: false,
          Tuesday: false,
          Wednesday: false,
          Thursday: false,
          Friday: false,
          Saturday: false,
          Sunday: false
        };
        editingTracker.days.forEach(day => {
          if (daysState.hasOwnProperty(day)) {
            daysState[day] = true;
          }
        });
        setSelectedDays(daysState);
      }
    }
  }, [editingTracker]);

  const handleDayChange = (day) => {
    setSelectedDays(prev => ({
      ...prev,
      [day]: !prev[day]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !question.trim()) {
      setError('Title and question are required');
      return;
    }

    if (cadence === 'Weekly' && !Object.values(selectedDays).some(day => day)) {
      setError('Please select at least one day for weekly cadence');
      return;
    }

    setIsSubmitting(true);

    try {
      // Format the note content
      let content = `Title: ${title}
Question: ${question}
Type: ${type}
Cadence: ${cadence}
Start Date: ${startDate}`;

      // Add end date if selected
      if (endDate) {
        content += `\nEnd Date: ${endDate}`;
      }

      // Add selected days if weekly cadence
      if (cadence === 'Weekly') {
        const days = Object.entries(selectedDays)
          .filter(([_, selected]) => selected)
          .map(([day]) => day)
          .join(',');
        content += `\nDays: ${days}`;
      }

      content += '\nmeta::tracker';

      if (editingTracker) {
        // Update existing tracker
        await updateNoteById(editingTracker.id, content);
        onTrackerUpdated({
          ...editingTracker,
          title,
          question,
          type,
          cadence,
          startDate,
          endDate,
          days: cadence === 'Weekly' ? Object.entries(selectedDays)
            .filter(([_, selected]) => selected)
            .map(([day]) => day) : []
        });
        toast.success('Tracker updated successfully');
      } else {
        // Add new tracker
        const response = await addNewNoteCommon(content, undefined, null);
        onTrackerAdded({
          id: response.id,
          title,
          question,
          type,
          cadence,
          startDate,
          endDate,
          days: cadence === 'Weekly' ? Object.entries(selectedDays)
            .filter(([_, selected]) => selected)
            .map(([day]) => day) : [],
          createdAt: new Date().toISOString()
        });
        toast.success('Tracker added successfully');
        
        // Only reset form when adding a new tracker
        setTitle('');
        setQuestion('');
        setType('Yes,No');
        setCadence('Daily');
        setStartDate(new Date().toISOString().split('T')[0]);
        setEndDate('');
        setSelectedDays({
          Monday: false,
          Tuesday: false,
          Wednesday: false,
          Thursday: false,
          Friday: false,
          Saturday: false,
          Sunday: false
        });
      }
    } catch (err) {
      setError('Failed to save tracker. Please try again.');
      console.error('Error saving tracker:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingTracker) return;
    try {
      setIsSubmitting(true);
      await deleteNoteById(editingTracker.id);
      if (onTrackerDeleted) onTrackerDeleted(editingTracker.id);
      if (onCancel) onCancel();
      toast.success('Tracker deleted successfully');
    } catch (error) {
      console.error('Error deleting tracker:', error);
      toast.error('Failed to delete tracker');
    } finally {
      setIsSubmitting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="w-full rounded-lg border bg-card text-card-foreground shadow-sm p-6">
      <h2 className="text-xl font-bold mb-4">
        {editingTracker ? 'Edit Tracker' : 'Add New Tracker'}
      </h2>
      
      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
          <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
          <span>{error}</span>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title Input */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            placeholder="Enter tracker title"
            required
          />
        </div>

        {/* Question Input */}
        <div>
          <label htmlFor="question" className="block text-sm font-medium text-gray-700 mb-1">
            Question
          </label>
          <input
            type="text"
            id="question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            placeholder="Enter the question to track"
            required
          />
        </div>

        {/* Type Selection */}
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
            Type
          </label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="Yes,No">Yes/No</option>
            <option value="value">Value</option>
            <option value="value_time">Time</option>
          </select>
        </div>

        {/* Cadence Selection */}
        <div>
          <label htmlFor="cadence" className="block text-sm font-medium text-gray-700 mb-1">
            Cadence
          </label>
          <select
            id="cadence"
            value={cadence}
            onChange={(e) => setCadence(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="Daily">Daily</option>
            <option value="Weekly">Weekly</option>
            <option value="Monthly">Monthly</option>
            <option value="Yearly">Yearly</option>
            <option value="Custom">Custom</option>
          </select>
        </div>

        {/* Start Date Input */}
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <input
            type="date"
            id="startDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            required
          />
        </div>

        {/* End Date Input */}
        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
            End Date (Optional)
          </label>
          <input
            type="date"
            id="endDate"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            min={startDate}
          />
        </div>

        {/* Week Days Selection - Only shown when cadence is Weekly */}
        {cadence === 'Weekly' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Days
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {Object.keys(selectedDays).map((day) => (
                <label
                  key={day}
                  className="flex items-center space-x-2 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedDays[day]}
                    onChange={() => handleDayChange(day)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">{day}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-4 mt-6">
          {editingTracker && (
            <>
              <button
                type="button"
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                onClick={() => setShowDeleteConfirm(true)}
              >
                Delete
              </button>
              {showDeleteConfirm && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                  <div className="bg-white rounded-lg p-6 max-w-sm w-full flex flex-col items-center">
                    <ExclamationCircleIcon className="h-10 w-10 text-red-500 mb-2" />
                    <div className="mb-4 text-center">Are you sure you want to delete this tracker?</div>
                    <div className="flex gap-4">
                      <button
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                        onClick={() => setShowDeleteConfirm(false)}
                      >
                        Cancel
                      </button>
                      <button
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                        onClick={handleDelete}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <button
            type="button"
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {editingTracker ? 'Update Tracker' : 'Add Tracker'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddTracker; 