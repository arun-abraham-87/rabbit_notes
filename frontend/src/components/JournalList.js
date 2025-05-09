import React, { useState, useEffect } from 'react';
import { listJournals, loadJournal } from '../utils/ApiUtils';
import { format, isWithinInterval, startOfDay, endOfDay, parseISO, startOfMonth, differenceInDays, getMonth } from 'date-fns';
import { FunnelIcon, XMarkIcon, BookOpenIcon, CalendarIcon, ClockIcon, EyeIcon, XCircleIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/solid';

const JournalList = ({ onEditJournal, onNewJournal, initialJournals, onJournalsUpdate }) => {
  // Get default date range (start of current month to today)
  const today = new Date();
  const startOfCurrentMonth = startOfMonth(today);
  const defaultDateRange = {
    start: startOfCurrentMonth.toISOString().split('T')[0],
    end: today.toISOString().split('T')[0]
  };

  const [journals, setJournals] = useState(initialJournals);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [showYearStats, setShowYearStats] = useState(false);
  const [filters, setFilters] = useState({
    dateRange: defaultDateRange,
    searchText: ''
  });
  const [selectedJournal, setSelectedJournal] = useState(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState(null);
  const [expandedYear, setExpandedYear] = useState(null);

  useEffect(() => {
    setJournals(initialJournals);
  }, [initialJournals]);

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return format(date, 'MMMM d, yyyy • EEEE');
    } catch (error) {
      return dateString;
    }
  };

  const filterJournals = (journals) => {
    return journals.filter(journal => {
      // Filter out empty journals
      if (!journal.preview?.trim() && !journal.metadata?.tags?.length) {
        return false;
      }

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

  const clearFilters = () => {
    setFilters({
      dateRange: defaultDateRange,
      searchText: ''
    });
  };

  const handleViewJournal = async (date) => {
    setViewLoading(true);
    try {
      const journalData = await loadJournal(date);
      setSelectedJournal(journalData);
      setViewModalOpen(true);
    } catch (error) {
      console.error('Failed to load journal:', error);
    }
    setViewLoading(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading journals...</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white text-card-foreground shadow-sm">
      <div className="flex justify-between items-center p-6">
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
        <div className="mx-6 mb-6 p-4 bg-[rgb(249_250_251)] rounded-lg border border-gray-200">
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
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[rgb(31_41_55)] focus:ring-[rgb(31_41_55)] text-base py-2.5 px-4"
                />
                <input
                  type="date"
                  value={filters.dateRange.end}
                  onChange={(e) => handleDateRangeChange('end', e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[rgb(31_41_55)] focus:ring-[rgb(31_41_55)] text-base py-2.5 px-4"
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
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[rgb(31_41_55)] focus:ring-[rgb(31_41_55)] text-base py-2.5 px-4"
              />
            </div>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mx-6 mb-6">
        <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[rgb(31_41_55_/_0.1)] rounded-full">
              <BookOpenIcon className="h-5 w-5 text-[rgb(31_41_55)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Journals</p>
              <p className="text-2xl font-bold text-gray-900">
                {journals.filter(journal => journal.preview?.trim()).length}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[rgb(31_41_55_/_0.1)] rounded-full">
              <CalendarIcon className="h-5 w-5 text-[rgb(31_41_55)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">This Month</p>
              <p className="text-2xl font-bold text-gray-900">
                {journals.filter(journal => {
                  const journalDate = parseISO(journal.date);
                  return journal.preview?.trim() && isWithinInterval(journalDate, {
                    start: startOfCurrentMonth,
                    end: today
                  });
                }).length}
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[rgb(31_41_55_/_0.1)] rounded-full">
              <ClockIcon className="h-5 w-5 text-[rgb(31_41_55)]" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Last Entry</p>
              <p className="text-2xl font-bold text-gray-900">
                {journals.some(j => j.preview?.trim()) 
                  ? `${differenceInDays(
                      today,
                      parseISO(
                        journals
                          .filter(j => j.preview?.trim())
                          .reduce((latest, journal) =>
                            latest.date > journal.date ? latest : journal
                          ).date
                      )
                    )} days ago`
                  : 'No entries'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Year-wise Statistics */}
      <div className="mx-6 mb-6">
        <div 
          className="flex items-center justify-between cursor-pointer p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
          onClick={() => setShowYearStats(!showYearStats)}
        >
          <h2 className="text-lg font-semibold text-gray-700">Journals by Year</h2>
          <button 
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setShowYearStats(!showYearStats);
            }}
          >
            {showYearStats ? (
              <ChevronUpIcon className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDownIcon className="h-5 w-5 text-gray-500" />
            )}
          </button>
        </div>
        
        {showYearStats && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Object.entries(
              journals.reduce((acc, journal) => {
                if (journal.preview?.trim()) {
                  const year = new Date(journal.date).getFullYear();
                  acc[year] = (acc[year] || 0) + 1;
                }
                return acc;
              }, {})
            )
              .sort(([yearA], [yearB]) => Number(yearB) - Number(yearA))
              .map(([year, count]) => {
                const isSelected = selectedYear === Number(year);
                const isExpanded = expandedYear === Number(year);
                
                // Calculate monthly breakdown
                const monthlyBreakdown = journals.reduce((acc, journal) => {
                  if (journal.preview?.trim()) {
                    const journalDate = new Date(journal.date);
                    if (journalDate.getFullYear() === Number(year)) {
                      const month = getMonth(journalDate);
                      acc[month] = (acc[month] || 0) + 1;
                    }
                  }
                  return acc;
                }, {});

                return (
                  <div key={year}>
                    <div 
                      className={`p-4 rounded-lg bg-white border border-slate-200 shadow-sm cursor-pointer transition-all ${
                        isSelected ? 'ring-2 ring-[rgb(31_41_55)]' : 'hover:shadow-md'
                      }`}
                      onClick={() => {
                        setSelectedYear(isSelected ? null : Number(year));
                        setExpandedYear(isExpanded ? null : Number(year));
                        if (!isSelected) {
                          setFilters(prev => ({
                            ...prev,
                            dateRange: {
                              start: `${year}-01-01`,
                              end: `${year}-12-31`
                            }
                          }));
                        } else {
                          setFilters(prev => ({
                            ...prev,
                            dateRange: defaultDateRange
                          }));
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-[rgb(31_41_55_/_0.1)] rounded-full">
                            <CalendarIcon className="h-5 w-5 text-[rgb(31_41_55)]" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-500">{year}</p>
                            <p className="text-2xl font-bold text-gray-900">{count}</p>
                          </div>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedYear(isExpanded ? null : Number(year));
                          }}
                          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronUpIcon className="h-5 w-5 text-gray-500" />
                          ) : (
                            <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                          )}
                        </button>
                      </div>
                    </div>
                    
                    {/* Monthly Breakdown */}
                    {isExpanded && (
                      <div className="mt-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h3 className="text-sm font-medium text-gray-700 mb-3">Monthly Breakdown</h3>
                        <div className="grid grid-cols-3 gap-2">
                          {Array.from({ length: 12 }, (_, i) => (
                            <div key={i} className="text-center p-2 bg-white rounded border border-gray-200">
                              <p className="text-xs text-gray-500">{format(new Date(2000, i), 'MMM')}</p>
                              <p className="text-sm font-semibold text-gray-900">{monthlyBreakdown[i] || 0}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Alert for Last Entry */}
      {journals.some(j => j.preview?.trim()) && 
        differenceInDays(
          today,
          parseISO(
            journals
              .filter(j => j.preview?.trim())
              .reduce((latest, journal) =>
                latest.date > journal.date ? latest : journal
              ).date
          )
        ) > 1 && (
        <div className="mx-6 mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
          <div className="p-2 bg-amber-100 rounded-full">
            <ClockIcon className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="text-amber-800 font-medium">
              It's been a while since your last journal entry
            </p>
            <p className="text-amber-600 text-sm">
              Consider taking a moment to reflect and write about your recent experiences
            </p>
          </div>
        </div>
      )}

      {filteredJournals.length === 0 ? (
        <div className="text-center py-12 mx-6">
          <p className="text-gray-500">
            {journals.length === 0
              ? "No journal entries yet. Start writing today!"
              : "No journals match your filters."}
          </p>
        </div>
      ) : (
        <div className="space-y-4 mx-6 mb-6">
          {filteredJournals.map((journal) => (
            <div
              key={journal.date}
              className="group flex flex-col p-6 rounded-lg bg-neutral-50 border border-slate-200 ring-1 ring-slate-100 relative hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div className="flex-grow">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {formatDate(journal.date)}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {journal.metadata?.wordCount || 0} words
                    {journal.metadata?.lastModified && (
                      <> • Last modified {format(new Date(journal.metadata.lastModified), 'h:mm a')}</>
                    )}
                  </p>
                  {journal.preview && (
                    <div className="mt-3">
                      <p className="text-gray-600 line-clamp-3">{journal.preview}</p>
                      {journal.preview.split('\n').length > 3 && (
                        <span className="text-gray-400">...</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewJournal(journal.date)}
                    className="px-3 py-1 text-sm text-[rgb(31_41_55)] hover:bg-[rgb(31_41_55_/_0.1)] rounded-md transition-colors flex items-center gap-1"
                    disabled={viewLoading}
                  >
                    <EyeIcon className="h-4 w-4" />
                    View
                  </button>
                  <button
                    onClick={() => onEditJournal(journal.date)}
                    className="px-3 py-1 text-sm text-[rgb(31_41_55)] hover:bg-[rgb(31_41_55_/_0.1)] rounded-md transition-colors"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Journal Modal */}
      {viewModalOpen && selectedJournal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-[90%] max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {formatDate(selectedJournal.date)}
                </h2>
              </div>
              <button
                onClick={() => {
                  setViewModalOpen(false);
                  setSelectedJournal(null);
                }}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-grow">
              <div className="whitespace-pre-wrap text-gray-700">
                {selectedJournal.content}
              </div>
            </div>
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-500">
                Last modified: {selectedJournal.metadata?.lastModified && 
                  format(new Date(selectedJournal.metadata.lastModified), 'MMMM d, yyyy h:mm a')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JournalList;