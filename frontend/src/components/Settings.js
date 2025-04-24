import React from 'react';

const Settings = ({ onClose }) => {
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