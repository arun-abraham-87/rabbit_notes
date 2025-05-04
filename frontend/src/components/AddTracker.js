import React, { useState } from 'react';
import { addNewNoteCommon } from '../utils/ApiUtils';
import { toast } from 'react-toastify';
import {
  XMarkIcon,
  CheckIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/solid';

const AddTracker = ({ onTrackerAdded }) => {
  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [type, setType] = useState('Yes,No');
  const [cadence, setCadence] = useState('Daily');
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
Cadence: ${cadence}`;

      // Add selected days if weekly cadence
      if (cadence === 'Weekly') {
        const days = Object.entries(selectedDays)
          .filter(([_, selected]) => selected)
          .map(([day]) => day)
          .join(',');
        content += `\nDays: ${days}`;
      }

      content += '\nmeta::tracker';

      // Add the new note
      await addNewNoteCommon(content, undefined, null);
      
      // Reset form
      setTitle('');
      setQuestion('');
      setType('Yes,No');
      setCadence('Daily');
      setSelectedDays({
        Monday: false,
        Tuesday: false,
        Wednesday: false,
        Thursday: false,
        Friday: false,
        Saturday: false,
        Sunday: false
      });
      
      // Show success message
      toast.success('Tracker added successfully');
      
      // Notify parent component
      if (onTrackerAdded) {
        onTrackerAdded();
      }
    } catch (err) {
      setError('Failed to add tracker. Please try again.');
      console.error('Error adding tracker:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full rounded-lg border bg-card text-card-foreground shadow-sm p-6">
      <h2 className="text-xl font-bold mb-4">Add New Tracker</h2>
      
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
            <option value="Value">Value</option>
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

        {/* Submit Button */}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setTitle('');
              setQuestion('');
              setType('Yes,No');
              setCadence('Daily');
              setSelectedDays({
                Monday: false,
                Tuesday: false,
                Wednesday: false,
                Thursday: false,
                Friday: false,
                Saturday: false,
                Sunday: false
              });
              setError(null);
            }}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
            disabled={isSubmitting}
          >
            <XMarkIcon className="h-5 w-5 inline-block mr-1" />
            Clear
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Adding...
              </>
            ) : (
              <>
                <CheckIcon className="h-5 w-5 inline-block mr-1" />
                Add Tracker
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddTracker; 