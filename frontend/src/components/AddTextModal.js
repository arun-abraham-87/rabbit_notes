import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

const AddTextModal = ({ isOpen, onClose, onSave, noteId, url }) => {
  const [customText, setCustomText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (customText.trim()) {
      onSave(noteId, url, customText.trim());
      setCustomText('');
      onClose();
    }
  };

  const handleClose = () => {
    setCustomText('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-96 max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Add Custom Text</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label htmlFor="customText" className="block text-sm font-medium text-gray-700 mb-2">
              Custom Text
            </label>
            <input
              type="text"
              id="customText"
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Enter custom text for the link"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              autoFocus
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL
            </label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm text-gray-600">
              {url}
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Add Text
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTextModal; 