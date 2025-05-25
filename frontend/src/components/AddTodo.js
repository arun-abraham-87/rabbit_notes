import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';

const AddTodo = ({ isOpen, onClose, onAdd }) => {
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState('low');

  const handleSubmit = () => {
    if (content.trim()) {
      onAdd(content, priority);
      setContent('');
      setPriority('low');
      onClose();
    }
  };

  // Close modal when clicking outside
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Add Todo</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Content Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Todo Content *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
              placeholder="Enter todo content..."
            />
          </div>

          {/* Priority Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => setPriority('critical')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  priority === 'critical'
                    ? 'bg-red-100 text-red-700 border-2 border-red-500'
                    : 'bg-white border border-gray-300 hover:bg-red-50 text-gray-700'
                }`}
              >
                Critical
              </button>
              <button
                onClick={() => setPriority('high')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  priority === 'high'
                    ? 'bg-rose-100 text-rose-700 border-2 border-rose-500'
                    : 'bg-white border border-gray-300 hover:bg-rose-50 text-gray-700'
                }`}
              >
                High
              </button>
              <button
                onClick={() => setPriority('medium')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  priority === 'medium'
                    ? 'bg-amber-100 text-amber-700 border-2 border-amber-500'
                    : 'bg-white border border-gray-300 hover:bg-amber-50 text-gray-700'
                }`}
              >
                Medium
              </button>
              <button
                onClick={() => setPriority('low')}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  priority === 'low'
                    ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-500'
                    : 'bg-white border border-gray-300 hover:bg-emerald-50 text-gray-700'
                }`}
              >
                Low
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!content.trim()}
              className={`px-4 py-2 text-sm font-medium text-white rounded-md ${
                content.trim()
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              Add Todo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddTodo; 