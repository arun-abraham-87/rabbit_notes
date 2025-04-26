import React, { useState, useEffect } from 'react';
import { listJournals } from '../utils/ApiUtils';
import { format } from 'date-fns';

const JournalList = ({ onEditJournal, onNewJournal }) => {
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return format(date, 'MMMM d, yyyy');
    } catch (error) {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Loading journals...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Your Journals</h1>
        <button
          onClick={() => onNewJournal(new Date().toISOString().split('T')[0])}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          New Journal
        </button>
      </div>

      {journals.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No journal entries yet. Start writing today!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {journals.map((journal) => (
            <div
              key={journal.date}
              className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {formatDate(journal.date)}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {journal.metadata.wordCount} words • Last modified {format(new Date(journal.metadata.lastModified), 'h:mm a')}
                  </p>
                  {journal.metadata.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {journal.metadata.tags.map((tag, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-700">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="mt-3 text-gray-600 line-clamp-2">{journal.preview}</p>
                </div>
                <button
                  onClick={() => onEditJournal(journal.date)}
                  className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                >
                  Edit
                </button>
              </div>
              {journal.metadata.mood && (
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