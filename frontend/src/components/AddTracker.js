import React, { useState, useEffect } from 'react';
import { addNewNoteCommon, updateNoteById, deleteNoteById } from '../utils/ApiUtils';
import { toast } from 'react-toastify';
import {
  ExclamationCircleIcon
} from '@heroicons/react/24/solid';
import { getAllUniqueTags } from '../utils/EventUtils';

const AddTracker = ({ onTrackerAdded, onTrackerUpdated, editingTracker, onCancel, onTrackerDeleted, notes }) => {
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState([]); // Store as array
  const [tagInput, setTagInput] = useState('');
  const [question, setQuestion] = useState('');
  const [type, setType] = useState('Yes,No');
  const [cadence, setCadence] = useState('Daily');
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState('');
  const [trackFromYesterday, setTrackFromYesterday] = useState(false);
  const [overdueDays, setOverdueDays] = useState('');
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

  // Populate form fields when editing
  useEffect(() => {
    if (editingTracker) {
      setTitle(editingTracker.title || '');
      setTags(Array.isArray(editingTracker.tags) ? editingTracker.tags : (editingTracker.tags ? editingTracker.tags.split(',').map(t => t.trim()) : []));
      setQuestion(editingTracker.question || '');
      setType(editingTracker.type || 'Yes,No');
      setCadence(editingTracker.cadence || 'Daily');
      setStartDate(editingTracker.startDate || new Date().toISOString().split('T')[0]);
      setEndDate(editingTracker.endDate || '');
      setTrackFromYesterday(editingTracker.trackFromYesterday || false);
      setOverdueDays(editingTracker.overdueDays || '');

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

  const existingTags = getAllUniqueTags(notes || [], 'tracker');

  const handleDayChange = (day) => {
    setSelectedDays(prev => ({
      ...prev,
      [day]: !prev[day]
    }));
  };

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    const tag = tagInput.trim();
    const t = tag.startsWith('#') ? tag : `#${tag}`;
    if (!tags.includes(t)) {
      setTags([...tags, t]);
    }
    setTagInput('');
  };

  const handleAddExistingTag = (tag) => {
    const t = tag.startsWith('#') ? tag : `#${tag}`;
    if (!tags.includes(t)) {
      setTags([...tags, t]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
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
      // Process tags into an array
      const tagArray = tags
        .map(t => t.trim())
        .filter(t => t.length > 0)
        .map(t => t.startsWith('#') ? t : `#${t}`);

      // Format the note content
      let content = `Title: ${title}
Question: ${question}
Type: ${type}
Cadence: ${cadence}
Start Date: ${startDate}`;

      // Add tags if provided
      if (tagArray.length > 0) {
        content += `\nTags: ${tagArray.join(', ')}`;
      }

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

      // Add tracking_as_of if checkbox is selected
      if (trackFromYesterday) {
        content += '\ntracking_as_of:yesterday';
      }

      // Add overdue days if provided
      if (overdueDays && overdueDays.trim() && !isNaN(parseInt(overdueDays))) {
        content += `\noverdue:${overdueDays.trim()}`;
      }

      content += '\nmeta::tracker';

      if (editingTracker) {
        // Update existing tracker
        await updateNoteById(editingTracker.id, content, tagArray);
        onTrackerUpdated({
          ...editingTracker,
          title,
          question,
          type,
          cadence,
          tags,
          startDate,
          endDate,
          trackFromYesterday,
          overdueDays: overdueDays.trim() || undefined,
          days: cadence === 'Weekly' ? Object.entries(selectedDays)
            .filter(([_, selected]) => selected)
            .map(([day]) => day) : []
        });
        toast.success('Tracker updated successfully');
        // Close the modal after successful update
        if (onCancel) onCancel();
      } else {
        // Add new tracker
        const response = await addNewNoteCommon(content, tagArray, null);
        onTrackerAdded({
          id: response.id,
          title,
          question,
          type,
          cadence,
          tags,
          startDate,
          endDate,
          trackFromYesterday,
          overdueDays: overdueDays.trim() || undefined,
          days: cadence === 'Weekly' ? Object.entries(selectedDays)
            .filter(([_, selected]) => selected)
            .map(([day]) => day) : [],
          createdAt: new Date().toISOString()
        });
        toast.success('Tracker added successfully');

        // Only reset form when adding a new tracker
        setTitle('');
        setTags([]);
        setQuestion('');
        setType('Yes,No');
        setCadence('Daily');
        setStartDate(new Date().toISOString().split('T')[0]);
        setEndDate('');
        setTrackFromYesterday(false);
        setOverdueDays('');
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

        {/* Tags Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tags
          </label>

          {/* Existing Tag Suggestions */}
          {existingTags.length > 0 && (
            <div className="mb-2">
              <p className="text-xs text-gray-500 mb-1">Suggestions:</p>
              <div className="flex flex-wrap gap-1">
                {existingTags.map((tag, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleAddExistingTag(tag)}
                    className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tag Input Field */}
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              placeholder="Add tags (press Enter)..."
            />
            <button
              type="button"
              onClick={handleAddTag}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Add
            </button>
          </div>

          {/* Added Tag Pills */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                >
                  {tag.trim()}
                  <button
                    type="button"
                    onClick={() => {
                      const updatedTags = tags.filter((_, i) => i !== index);
                      setTags(updatedTags);
                    }}
                    className="ml-1 text-indigo-600 hover:text-indigo-800 focus:outline-none"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
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
            <option value="adhoc_date">Adhoc Date</option>
            <option value="adhoc_value">Adhoc Value</option>
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

        {/* Track From Yesterday Checkbox */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="trackFromYesterday"
            checked={trackFromYesterday}
            onChange={(e) => setTrackFromYesterday(e.target.checked)}
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
          <label htmlFor="trackFromYesterday" className="text-sm text-gray-700">
            Track as of yesterday
          </label>
        </div>

        {/* Overdue Days Input */}
        <div>
          <label htmlFor="overdueDays" className="block text-sm font-medium text-gray-700 mb-1">
            Overdue Days (Optional)
          </label>
          <input
            type="number"
            id="overdueDays"
            value={overdueDays}
            onChange={(e) => setOverdueDays(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            placeholder="Enter number of days for overdue threshold"
            min="1"
          />
          <p className="mt-1 text-xs text-gray-500">
            Number of days since last entry before tracker is considered overdue
          </p>
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
          {editingTracker ? (
            <>
              <button
                type="button"
                className="mr-auto px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                onClick={async () => {
                  if (window.confirm('Are you sure you want to delete this tracker and all its data?')) {
                    try {
                      await deleteNoteById(editingTracker.id);
                      if (onTrackerDeleted) {
                        onTrackerDeleted(editingTracker.id);
                      }
                      if (onCancel) {
                        onCancel();
                      }
                    } catch (error) {
                      console.error('Error deleting tracker:', error);
                      setError('Failed to delete tracker. Please try again.');
                    }
                  }
                }}
              >
                Delete
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                disabled={isSubmitting}
              >
                Update
              </button>
              <button
                type="button"
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => {
                  if (onCancel) {
                    onCancel();
                  }
                }}
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                onClick={() => {
                  if (onCancel) {
                    onCancel();
                  }
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                disabled={isSubmitting}
              >
                Add Tracker
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
};

export default AddTracker; 