import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { loadAllNotes, updateNoteById } from '../utils/ApiUtils';

const Manage = () => {
  const [activeTab, setActiveTab] = useState('notes');
  const [activeSubTab, setActiveSubTab] = useState('search-replace');
  const [searchText, setSearchText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [notes, setNotes] = useState([]);
  const [matchingNotes, setMatchingNotes] = useState([]);
  const [totalMatches, setTotalMatches] = useState(0);

  useEffect(() => {
    const fetchNotes = async () => {
      const data = await loadAllNotes('', null);
      setNotes(data.notes);
    };
    fetchNotes();
  }, []);

  useEffect(() => {
    if (searchText.trim()) {
      const matches = notes.filter(note => 
        note.content.toLowerCase().includes(searchText.toLowerCase())
      );
      setMatchingNotes(matches);
      
      // Count total occurrences
      const count = matches.reduce((total, note) => {
        const regex = new RegExp(searchText, 'gi');
        const matches = note.content.match(regex);
        return total + (matches ? matches.length : 0);
      }, 0);
      setTotalMatches(count);
    } else {
      setMatchingNotes([]);
      setTotalMatches(0);
    }
  }, [searchText, notes]);

  const handleReplace = async () => {
    if (!searchText.trim() || !replaceText.trim()) {
      toast.error('Please enter both search and replace text');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to replace "${searchText}" with "${replaceText}" in ${matchingNotes.length} notes (${totalMatches} occurrences)?`
    );

    if (confirmed) {
      try {
        for (const note of matchingNotes) {
          const updatedContent = note.content.replace(
            new RegExp(searchText, 'gi'),
            replaceText
          );
          await updateNoteById(note.id, updatedContent);
        }
        toast.success(`Successfully replaced text in ${matchingNotes.length} notes`);
        // Refresh notes after replacement
        const data = await loadAllNotes('', null);
        setNotes(data.notes);
        setSearchText('');
        setReplaceText('');
      } catch (error) {
        toast.error('Error replacing text: ' + error.message);
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow">
        {/* Main Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('notes')}
              className={`py-4 px-6 text-sm font-medium ${
                activeTab === 'notes'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Notes
            </button>
            <button
              onClick={() => setActiveTab('bulk-actions')}
              className={`py-4 px-6 text-sm font-medium ${
                activeTab === 'bulk-actions'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Bulk Actions
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'notes' && (
            <div>
              {/* Notes Sub-tabs */}
              <div className="border-b border-gray-200 mb-6">
                <nav className="flex -mb-px">
                  <button
                    onClick={() => setActiveSubTab('search-replace')}
                    className={`py-2 px-4 text-sm font-medium ${
                      activeSubTab === 'search-replace'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Search & Replace
                  </button>
                </nav>
              </div>

              {/* Notes Sub-tab Content */}
              {activeSubTab === 'search-replace' && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Search Text
                      </label>
                      <input
                        type="text"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter text to search for..."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Replace With
                      </label>
                      <input
                        type="text"
                        value={replaceText}
                        onChange={(e) => setReplaceText(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter replacement text..."
                      />
                    </div>

                    {searchText && (
                      <div className="text-sm text-gray-600">
                        Found {totalMatches} occurrences in {matchingNotes.length} notes
                      </div>
                    )}

                    <button
                      onClick={handleReplace}
                      disabled={!searchText || !replaceText || matchingNotes.length === 0}
                      className={`px-4 py-2 rounded-md text-white ${
                        !searchText || !replaceText || matchingNotes.length === 0
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      Replace All
                    </button>
                  </div>

                  {matchingNotes.length > 0 && (
                    <div className="mt-6">
                      <h2 className="text-lg font-semibold text-gray-800 mb-4">
                        Matching Notes
                      </h2>
                      <div className="space-y-4">
                        {matchingNotes.map((note) => (
                          <div
                            key={note.id}
                            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                          >
                            <div className="text-sm text-gray-600 mb-2">
                              Note ID: {note.id}
                            </div>
                            <div className="text-gray-800 whitespace-pre-wrap">
                              {note.content.split('\n').map((line, index) => {
                                if (line.toLowerCase().includes(searchText.toLowerCase())) {
                                  const parts = line.split(new RegExp(`(${searchText})`, 'gi'));
                                  return (
                                    <div key={index} className="mb-1">
                                      {parts.map((part, i) => (
                                        <span
                                          key={i}
                                          className={
                                            part.toLowerCase() === searchText.toLowerCase()
                                              ? 'bg-yellow-200'
                                              : ''
                                          }
                                        >
                                          {part}
                                        </span>
                                      ))}
                                    </div>
                                  );
                                }
                                return <div key={index} className="mb-1">{line}</div>;
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'bulk-actions' && (
            <div className="text-center py-12">
              <p className="text-gray-500">Bulk actions coming soon...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Manage; 