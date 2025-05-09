import React, { useState, useEffect } from 'react';
import JournalList from '../components/JournalList';
import JournalEditor from '../components/JournalEditor';
import JournalStats from '../components/JournalStats';
import LoadJournalsModal from '../components/LoadJournalsModal';
import { ChartBarIcon, XMarkIcon, ArrowUpTrayIcon } from '@heroicons/react/24/solid';
import { listJournals } from '../utils/ApiUtils';

const Journals = () => {
  const [currentView, setCurrentView] = useState('list');
  const [selectedDate, setSelectedDate] = useState(null);
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLoadModal, setShowLoadModal] = useState(false);

  useEffect(() => {
    loadJournals();
  }, []);

  const loadJournals = async () => {
    try {
      const journalData = await listJournals();
      setJournals(journalData);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load journals:', error);
      setLoading(false);
    }
  };

  const handleEditJournal = (date) => {
    setSelectedDate(date);
    setCurrentView('edit');
  };

  const handleNewJournal = (date) => {
    setSelectedDate(date);
    setCurrentView('edit');
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedDate(null);
    loadJournals(); // Refresh journals after editing
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {currentView === 'list' && (
        <>
          <div className="flex justify-end p-4 gap-2">
            <button
              onClick={() => setShowLoadModal(true)}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
              title="Load Journals"
            >
              <ArrowUpTrayIcon className="h-5 w-5" />
              <span>Load Journals</span>
            </button>
            <button
              onClick={() => setCurrentView('stats')}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
              title="View Statistics"
            >
              <ChartBarIcon className="h-5 w-5" />
              <span>Analytics</span>
            </button>
          </div>
          <JournalList
            onEditJournal={handleEditJournal}
            onNewJournal={handleNewJournal}
            initialJournals={journals}
            onJournalsUpdate={setJournals}
          />
        </>
      )}
      
      {currentView === 'edit' && (
        <div className="w-full">
          <div className="pl-4 pt-4">
            <button
              onClick={handleBackToList}
              className="mb-4 flex items-center text-gray-600 hover:text-gray-900"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Journal List
            </button>
          </div>
          <JournalEditor date={selectedDate} onSaved={handleBackToList} />
        </div>
      )}

      {currentView === 'stats' && (
        <>
          <div className="flex justify-end p-4">
            <button
              onClick={() => setCurrentView('list')}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
            >
              <XMarkIcon className="h-5 w-5" />
              <span>Close Analytics</span>
            </button>
          </div>
          <JournalStats journals={journals} />
        </>
      )}

      <LoadJournalsModal
        isOpen={showLoadModal}
        onClose={() => setShowLoadModal(false)}
        onJournalsLoaded={loadJournals}
      />
    </div>
  );
};

export default Journals; 