import React, { useState, useEffect } from 'react';

const EditMeetingModal = ({ note, onSave, onCancel, onSwitchToNormalEdit }) => {
  const [description, setDescription] = useState('');
  const [dateTime, setDateTime] = useState('');
  const [duration, setDuration] = useState('30');
  const [recurrence, setRecurrence] = useState('none');
  const [selectedDays, setSelectedDays] = useState({
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: true,
    sunday: true
  });

  // Generate duration options: 15 min increments from 15 mins to 2 hours
  const durationOptions = Array.from({ length: 8 }, (_, i) => ({
    value: String((i + 1) * 15),
    label: `${(i + 1) * 15} minutes`
  }));

  const recurrenceOptions = [
    { value: 'none', label: 'No Recurrence' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'yearly', label: 'Yearly' },
    { value: 'custom', label: 'Custom' }
  ];

  const daysOfWeek = [
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
    { value: 'sunday', label: 'Sunday' }
  ];

  useEffect(() => {
    if (note) {
      const lines = note.content.split('\n');
      setDescription(lines[0] || '');
      setDateTime(lines[1] || '');
      
      // Extract duration from meta tag
      const durationMatch = note.content.match(/meta::meeting_duration::(\d+)/);
      if (durationMatch) {
        setDuration(durationMatch[1]);
      }

      // Extract recurrence from meta tag
      const recurrenceMatch = note.content.match(/meta::meeting_recurrence::([^:]+)(?::(.+))?/);
      if (recurrenceMatch) {
        const [_, type, days] = recurrenceMatch;
        setRecurrence(type);
        
        if ((type === 'weekly' || type === 'custom') && days) {
          const selectedDaysList = days.split(',');
          setSelectedDays({
            monday: selectedDaysList.includes('monday'),
            tuesday: selectedDaysList.includes('tuesday'),
            wednesday: selectedDaysList.includes('wednesday'),
            thursday: selectedDaysList.includes('thursday'),
            friday: selectedDaysList.includes('friday'),
            saturday: selectedDaysList.includes('saturday'),
            sunday: selectedDaysList.includes('sunday')
          });
        }
      }
    }
  }, [note]);

  const handleDayToggle = (day) => {
    setSelectedDays(prev => ({
      ...prev,
      [day]: !prev[day]
    }));
  };

  const handleSelectAllDays = () => {
    const allSelected = Object.values(selectedDays).every(Boolean);
    setSelectedDays({
      monday: !allSelected,
      tuesday: !allSelected,
      wednesday: !allSelected,
      thursday: !allSelected,
      friday: !allSelected,
      saturday: !allSelected,
      sunday: !allSelected
    });
  };

  const handleSubmit = () => {
    if (!description.trim() || !dateTime) return;
    
    let content = `${description.trim()}\n${dateTime}\nmeta::meeting::${new Date().toISOString()}\nmeta::meeting_duration::${duration}`;
    
    if (recurrence !== 'none') {
      if (recurrence === 'weekly' || recurrence === 'custom') {
        const selectedDaysList = Object.entries(selectedDays)
          .filter(([_, isSelected]) => isSelected)
          .map(([day]) => day);
        content += `\nmeta::meeting_recurrence::${recurrence}:${selectedDaysList.join(',')}`;
      } else {
        content += `\nmeta::meeting_recurrence::${recurrence}`;
      }
    }
    
    onSave({ ...note, content });
  };

  // Close modal when clicking outside
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
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
          <h2 className="text-xl font-semibold">Edit Meeting</h2>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recurrence
            </label>
            <select
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {recurrenceOptions.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {(recurrence === 'weekly' || recurrence === 'custom') && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-gray-700">
                  Days of Week
                </label>
                <button
                  type="button"
                  onClick={handleSelectAllDays}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {Object.values(selectedDays).every(Boolean) ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {daysOfWeek.map(({ value, label }) => (
                  <label key={value} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedDays[value]}
                      onChange={() => handleDayToggle(value)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!description.trim() || !dateTime}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditMeetingModal; 