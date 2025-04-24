import React, { useState } from 'react';

const AddMeetingModal = ({ isOpen, onClose, onAdd }) => {
  const [description, setDescription] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [duration, setDuration] = useState('30'); // Default 30 minutes

  // Generate duration options: 15 min increments from 15 mins to 2 hours
  const durationOptions = Array.from({ length: 8 }, (_, i) => ({
    value: String((i + 1) * 15),
    label: `${(i + 1) * 15} minutes`
  }));

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!description.trim() || !dateTime) return;
    
    const content = `${description.trim()}\n${dateTime}\nmeta::meeting::${new Date().toISOString()}\nmeta::meeting_duration::${duration}`;
    onAdd(content);
    
    // Reset form
    setDescription('');
    setDateTime('');
    setDuration('30'); // Reset to default
    onClose();
  };

  // Close modal when clicking outside
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Add Meeting</h2>
        
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
              placeholder="Meeting description..."
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date & Time
              </label>
              <input
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {durationOptions.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!description.trim() || !dateTime}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Meeting
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddMeetingModal; 