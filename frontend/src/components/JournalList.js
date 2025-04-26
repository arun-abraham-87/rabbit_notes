import React, { useState, useEffect } from 'react';
import { listJournals } from '../utils/ApiUtils';
import { format, isWithinInterval, startOfDay, endOfDay, parseISO, startOfMonth } from 'date-fns';
import { FunnelIcon, XMarkIcon } from '@heroicons/react/24/solid';

const JournalList = ({ onEditJournal, onNewJournal }) => {
  // Get default date range (start of current month to today)
  const today = new Date();
  const startOfCurrentMonth = startOfMonth(today);
  const defaultDateRange = {
    start: startOfCurrentMonth.toISOString().split('T')[0],
    end: today.toISOString().split('T')[0]
  };

  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(true); // Show filters by default
  const [filters, setFilters] = useState({
    dateRange: defaultDateRange,
    tags: [],
    mood: '',
    searchText: ''
  });

  useEffect(() => {
    loadJournals();
  }, []);

  const loadJournals = async () => {
    try {
      const journalData = await listJournals();
      console.log('Loaded journals:', journalData);
      setJournals(journalData);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load journals:', error);
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return format(date, 'MMMM d, yyyy');
    } catch (error) {
      return dateString;
    }
  };

  // Get unique tags from all journals
  const allTags = [...new Set(journals.flatMap(journal => journal.metadata?.tags || []))];
  
  // Get unique moods from all journals
  const allMoods = [...new Set(journals.map(journal => journal.metadata?.mood).filter(Boolean))];

  const filterJournals = (journals) => {
    return journals.filter(journal => {
      // Date range filter
      if (filters.dateRange.start || filters.dateRange.end) {
        const journalDate = parseISO(journal.date);
        const start = filters.dateRange.start ? startOfDay(parseISO(filters.dateRange.start)) : null;
        const end = filters.dateRange.end ? endOfDay(parseISO(filters.dateRange.end)) : null;
        
        if (start && end && !isWithinInterval(journalDate, { start, end })) {
          return false;
        } else if (start && !end && journalDate < start) {
          return false;
        } else if (!start && end && journalDate > end) {
          return false;
        }
      }

      // Tags filter
      if (filters.tags.length > 0) {
        const journalTags = journal.metadata?.tags || [];
        if (!filters.tags.some(tag => journalTags.includes(tag))) {
          return false;
        }
      }

      // Mood filter
      if (filters.mood && journal.metadata?.mood !== filters.mood) {
        return false;
      }

      // Search text filter
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        const contentLower = (journal.preview || '').toLowerCase();
        if (!contentLower.includes(searchLower)) {
          return false;
        }
      }

      return true;
    });
  };

  const filteredJournals = filterJournals(journals);

  const handleFilterChange = (type, value) => {
    setFilters(prev => ({
      ...prev,
      [type]: value
    }));
  };

  const handleDateRangeChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [field]: value
      }
    }));
  };

  const handleTagToggle = (tag) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  const clearFilters = () => {
    setFilters({
      dateRange: defaultDateRange, // Reset to default date range instead of empty
      tags: [],
      mood: '',
      searchText: ''
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading journals...</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm max-w-[80%] mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-900">Your Journals</h1>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition-colors ${
              showFilters ? 'bg-[rgb(31_41_55_/_0.1)] text-gray-700' : 'hover:bg-gray-100'
            }`}
            title="Toggle filters"
          >
            <FunnelIcon className="h-5 w-5" />
          </button>
        </div>
        <button
          onClick={() => onNewJournal(new Date().toISOString().split('T')[0])}
          className="px-4 py-2 bg-[rgb(31_41_55)] text-white rounded-lg hover:bg-[rgb(31_41_55_/_0.9)] transition-colors"
        >
          New Journal
        </button>
      </div>

      {/* Filters Section */}
      {showFilters && (
        <div className="mb-6 p-4 bg-[rgb(249_250_251)] rounded-lg border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-700">Filters</h2>
            <button
              onClick={clearFilters}
              className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1 px-3 py-1 rounded-full hover:bg-gray-200 transition-colors"
            >
              <XMarkIcon className="h-4 w-4" />
              Clear all
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date Range */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Date Range</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={filters.dateRange.start}
                  onChange={(e) => handleDateRangeChange('start', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[rgb(31_41_55)] focus:ring-[rgb(31_41_55)] sm:text-sm"
                />
                <input
                  type="date"
                  value={filters.dateRange.end}
                  onChange={(e) => handleDateRangeChange('end', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[rgb(31_41_55)] focus:ring-[rgb(31_41_55)] sm:text-sm"
                />
              </div>
            </div>

            {/* Search */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Search</label>
              <input
                type="text"
                value={filters.searchText}
                onChange={(e) => handleFilterChange('searchText', e.target.value)}
                placeholder="Search in journal content..."
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[rgb(31_41_55)] focus:ring-[rgb(31_41_55)] sm:text-sm"
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Tags</label>
              <div className="flex flex-wrap gap-2">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => handleTagToggle(tag)}
                    className={`px-3 py-1 rounded-full text-sm transition-colors ${
                      filters.tags.includes(tag)
                        ? 'bg-[rgb(31_41_55_/_0.1)] text-gray-700 border border-gray-300'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Mood */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Mood</label>
              <select
                value={filters.mood}
                onChange={(e) => handleFilterChange('mood', e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[rgb(31_41_55)] focus:ring-[rgb(31_41_55)] sm:text-sm"
              >
                <option value="">All moods</option>
                {allMoods.map(mood => (
                  <option key={mood} value={mood}>{mood}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {filteredJournals.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">
            {journals.length === 0
              ? "No journal entries yet. Start writing today!"
              : "No journals match your filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredJournals.map((journal) => (
            <div
              key={journal.date}
              className="group flex flex-col p-6 rounded-lg bg-neutral-50 border border-slate-200 ring-1 ring-slate-100 relative hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {formatDate(journal.date)}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {journal.metadata?.wordCount || 0} words
                    {journal.metadata?.lastModified && (
                      <> • Last modified {format(new Date(journal.metadata.lastModified), 'h:mm a')}</>
                    )}
                  </p>
                  {journal.metadata?.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {journal.metadata.tags.map((tag, index) => (
                        <span key={index} className="px-2 py-1 bg-[rgb(31_41_55_/_0.1)] rounded-full text-xs text-gray-700">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {journal.preview && (
                    <p className="mt-3 text-gray-600 line-clamp-2">{journal.preview}</p>
                  )}
                </div>
                <button
                  onClick={() => onEditJournal(journal.date)}
                  className="px-3 py-1 text-sm text-[rgb(31_41_55)] hover:bg-[rgb(31_41_55_/_0.1)] rounded-md transition-colors"
                >
                  Edit
                </button>
              </div>
              {journal.metadata?.mood && (
                <div className="mt-2 text-sm text-gray-500">
                  Mood: {journal.metadata.mood}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default JournalList;