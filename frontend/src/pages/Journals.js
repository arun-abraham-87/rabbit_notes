import React, { useState } from 'react';
import JournalList from '../components/JournalList';
import JournalEditor from '../components/JournalEditor';

const Journals = () => {
  const [currentView, setCurrentView] = useState('list');
  const [selectedDate, setSelectedDate] = useState(null);

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
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {currentView === 'list' ? (
        <JournalList
          onEditJournal={handleEditJournal}
          onNewJournal={handleNewJournal}
        />
      ) : (
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
    </div>
  );
};

export default Journals; 