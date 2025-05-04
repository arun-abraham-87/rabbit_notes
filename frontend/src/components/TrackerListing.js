import React, { useState, useEffect } from 'react';
import { loadNotes } from '../utils/ApiUtils';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  ExclamationCircleIcon,
  CalendarIcon,
  ClockIcon,
  PlusIcon
} from '@heroicons/react/24/solid';
import AddTracker from './AddTracker';

const TrackerListing = () => {
  const [trackers, setTrackers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddTracker, setShowAddTracker] = useState(false);
  const [filterCadence, setFilterCadence] = useState('all');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    loadTrackers();
  }, []);

  const loadTrackers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const notes = await loadNotes();
      const trackerNotes = (Array.isArray(notes) ? notes : notes?.notes || [])
        .filter(note => note.content && note.content.includes('meta::tracker'))
        .map(note => {
          const lines = note.content.split('\n');
          const title = lines.find(line => line.startsWith('Title:'))?.replace('Title:', '').trim();
          const question = lines.find(line => line.startsWith('Question:'))?.replace('Question:', '').trim();
          const type = lines.find(line => line.startsWith('Type:'))?.replace('Type:', '').trim();
          const cadence = lines.find(line => line.startsWith('Cadence:'))?.replace('Cadence:', '').trim();
          const days = lines.find(line => line.startsWith('Days:'))?.replace('Days:', '').trim();
          
          return {
            id: note.id,
            title,
            question,
            type,
            cadence,
            days: days ? days.split(',') : [],
            createdAt: note.createdAt
          };
        });
      setTrackers(trackerNotes);
    } catch (err) {
      setError('Failed to load trackers. Please try again.');
      console.error('Error loading trackers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrackerAdded = (newTracker) => {
    setTrackers(prevTrackers => [...prevTrackers, newTracker]);
    setShowAddTracker(false);
  };

  const filteredTrackers = trackers.filter(tracker => {
    const matchesSearch = tracker.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tracker.question.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCadence = filterCadence === 'all' || tracker.cadence === filterCadence;
    const matchesType = filterType === 'all' || tracker.type === filterType;
    return matchesSearch && matchesCadence && matchesType;
  });

  if (isLoading) {
    return (
      <div className="w-full rounded-lg border bg-card text-card-foreground shadow-sm p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-lg border bg-card text-card-foreground shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Trackers</h1>
        <button
          onClick={() => setShowAddTracker(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Add Tracker
        </button>
      </div>

      {showAddTracker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Add New Tracker</h2>
              <button
                onClick={() => setShowAddTracker(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <AddTracker onTrackerAdded={handleTrackerAdded} />
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
          <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
          <span>{error}</span>
        </div>
      )}
      
      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search trackers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-8 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        <div className="flex gap-4">
          <select
            value={filterCadence}
            onChange={(e) => setFilterCadence(e.target.value)}
            className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="all">All Cadences</option>
            <option value="Daily">Daily</option>
            <option value="Weekly">Weekly</option>
            <option value="Monthly">Monthly</option>
            <option value="Yearly">Yearly</option>
            <option value="Custom">Custom</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="all">All Types</option>
            <option value="Yes,No">Yes/No</option>
            <option value="Value">Value</option>
          </select>
        </div>
      </div>

      {/* Trackers List */}
      <div className="space-y-4">
        {filteredTrackers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm || filterCadence !== 'all' || filterType !== 'all' ? (
              <p>No trackers match your filters</p>
            ) : (
              <p>No trackers found. Create one to get started.</p>
            )}
          </div>
        ) : (
          filteredTrackers.map((tracker) => (
            <div
              key={tracker.id}
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors duration-150"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900 mb-1">
                    {tracker.title}
                  </h3>
                  <p className="text-gray-600 mb-2">{tracker.question}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <ClockIcon className="h-4 w-4" />
                      <span>{tracker.type}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="h-4 w-4" />
                      <span>{tracker.cadence}</span>
                      {tracker.days.length > 0 && (
                        <span className="ml-1">({tracker.days.join(', ')})</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TrackerListing; 