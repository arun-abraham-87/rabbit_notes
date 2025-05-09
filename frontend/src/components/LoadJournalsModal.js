import React, { useState, useCallback } from 'react';
import { XMarkIcon, ArrowUpTrayIcon } from '@heroicons/react/24/solid';
import { saveJournal } from '../utils/ApiUtils';

const LoadJournalsModal = ({ isOpen, onClose, onJournalsLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setIsDragging(false);
    setLoading(true);
    setError(null);

    const file = e.dataTransfer.files[0];
    if (!file) {
      setError('No file selected');
      setLoading(false);
      return;
    }

    if (file.type !== 'text/plain') {
      setError('Please upload a text file');
      setLoading(false);
      return;
    }

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      // Process each line as a journal entry
      for (const line of lines) {
        // Try to extract date from the line (assuming format: YYYY-MM-DD: content)
        const dateMatch = line.match(/^(\d{4}-\d{2}-\d{2}):\s*(.*)/);
        if (dateMatch) {
          const [_, date, content] = dateMatch;
          await saveJournal(date, {
            content: content.trim(),
            metadata: {
              created: new Date().toISOString(),
              lastModified: new Date().toISOString(),
              tags: [],
              wordCount: content.trim().split(/\s+/).filter(Boolean).length,
              charCount: content.length
            }
          });
        }
      }

      onJournalsLoaded();
      onClose();
    } catch (error) {
      console.error('Error loading journals:', error);
      setError('Failed to load journals. Please check the file format.');
    } finally {
      setLoading(false);
    }
  }, [onClose, onJournalsLoaded]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-700">Load Journals</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <ArrowUpTrayIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-2">Drag and drop your journal text file here</p>
          <p className="text-sm text-gray-500">
            Each line should be in the format: YYYY-MM-DD: Journal content
          </p>
          {loading && (
            <div className="mt-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="text-sm text-gray-600 mt-2">Loading journals...</p>
            </div>
          )}
          {error && (
            <p className="text-sm text-red-600 mt-2">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoadJournalsModal; 