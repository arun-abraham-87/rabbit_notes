import React, { useState, useEffect } from 'react';

// Common timezones with their offsets and locations
const timeZones = [
  { label: 'AEST (Sydney, +10:00)', value: 'Australia/Sydney' },
  { label: 'AEDT (Sydney, +11:00)', value: 'Australia/Sydney' },
  { label: 'IST (Mumbai, +5:30)', value: 'Asia/Kolkata' },
  { label: 'EST (New York, -5:00)', value: 'America/New_York' },
  { label: 'EDT (New York, -4:00)', value: 'America/New_York' },
  { label: 'PST (Los Angeles, -8:00)', value: 'America/Los_Angeles' },
  { label: 'PDT (Los Angeles, -7:00)', value: 'America/Los_Angeles' },
  { label: 'GMT (London, +0:00)', value: 'Europe/London' },
  { label: 'BST (London, +1:00)', value: 'Europe/London' },
  { label: 'CET (Paris, +1:00)', value: 'Europe/Paris' },
  { label: 'CEST (Paris, +2:00)', value: 'Europe/Paris' },
  { label: 'JST (Tokyo, +9:00)', value: 'Asia/Tokyo' },
  { label: 'SGT (Singapore, +8:00)', value: 'Asia/Singapore' },
  { label: 'HKT (Hong Kong, +8:00)', value: 'Asia/Hong_Kong' },
  { label: 'CST (Beijing, +8:00)', value: 'Asia/Shanghai' },
  { label: 'MSK (Moscow, +3:00)', value: 'Europe/Moscow' },
  { label: 'SAST (Johannesburg, +2:00)', value: 'Africa/Johannesburg' },
  { label: 'BRT (São Paulo, -3:00)', value: 'America/Sao_Paulo' },
  { label: 'BRST (São Paulo, -2:00)', value: 'America/Sao_Paulo' },
  { label: 'NZST (Auckland, +12:00)', value: 'Pacific/Auckland' },
  { label: 'NZDT (Auckland, +13:00)', value: 'Pacific/Auckland' },
];

const Settings = ({ onClose }) => {
  const [selectedTimezones, setSelectedTimezones] = useState([]);

  // Load saved timezones on component mount
  useEffect(() => {
    const savedTimezones = localStorage.getItem('selectedTimezones');
    if (savedTimezones) {
      setSelectedTimezones(JSON.parse(savedTimezones));
    }
  }, []);

  const handleTimezoneChange = (index, value) => {
    const newTimezones = [...selectedTimezones];
    newTimezones[index] = value;
    setSelectedTimezones(newTimezones);
  };

  const addTimezone = () => {
    if (selectedTimezones.length < 6) {
      setSelectedTimezones([...selectedTimezones, '']);
    }
  };

  const removeTimezone = (index) => {
    const newTimezones = selectedTimezones.filter((_, i) => i !== index);
    setSelectedTimezones(newTimezones);
  };

  const handleSave = () => {
    // Save selected timezones to localStorage
    localStorage.setItem('selectedTimezones', JSON.stringify(selectedTimezones));
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 m-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* Theme Settings */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-3 text-gray-700">Theme</h3>
            <div className="flex items-center space-x-4">
              <button className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200">
                Light
              </button>
              <button className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200">
                Dark
              </button>
              <button className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200">
                System
              </button>
            </div>
          </div>

          <div className="border-b pb-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-700">Timezones</h3>
              {selectedTimezones.length < 6 && (
                <button
                  onClick={addTimezone}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  + Add Timezone
                </button>
              )}
            </div>
            <div className="space-y-3">
              {selectedTimezones.map((timezone, index) => (
                <div key={index} className="flex items-center gap-2">
                  <select
                    value={timezone}
                    onChange={(e) => handleTimezoneChange(index, e.target.value)}
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Select a timezone</option>
                    {timeZones.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeTimezone(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Editor Settings */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-3 text-gray-700">Editor</h3>
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="autoSave"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="autoSave" className="ml-2 text-gray-700">
                  Enable auto-save
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="spellCheck"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="spellCheck" className="ml-2 text-gray-700">
                  Enable spell check
                </label>
              </div>
            </div>
          </div>

          {/* Shortcuts */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-700">Keyboard Shortcuts</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">New Note</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded">⌘ + N</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Save Note</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded">⌘ + S</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Search</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded">⌘ + F</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Toggle Sidebar</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded">⌘ + B</kbd>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings; 