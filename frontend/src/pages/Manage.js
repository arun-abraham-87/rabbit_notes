import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { loadAllNotes, updateNoteById, listJournals, loadJournal } from '../utils/ApiUtils';
import JSZip from 'jszip';

const Manage = () => {
  const [activeTab, setActiveTab] = useState('notes');
  const [activeSubTab, setActiveSubTab] = useState('search-replace');
  const [searchText, setSearchText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [addText, setAddText] = useState('');
  const [useRegex, setUseRegex] = useState(false);
  const [notes, setNotes] = useState([]);
  const [matchingNotes, setMatchingNotes] = useState([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [regexError, setRegexError] = useState('');

  useEffect(() => {
    const fetchNotes = async () => {
      const data = await loadAllNotes('', null);
      setNotes(data.notes);
    };
    fetchNotes();
  }, []);

  useEffect(() => {
    if (searchText.trim()) {
      try {
        let matches;
        if (useRegex) {
          // Test if the regex is valid
          try {
            new RegExp(searchText);
            setRegexError('');
          } catch (e) {
            setRegexError('Invalid regular expression');
            return;
          }
          
          const regex = new RegExp(searchText, 'g');
          matches = notes.filter(note => regex.test(note.content));
          
          // Reset regex lastIndex for next test
          regex.lastIndex = 0;
        } else {
          matches = notes.filter(note => 
            note.content.toLowerCase().includes(searchText.toLowerCase())
          );
        }
        setMatchingNotes(matches);
        
        // Count total occurrences
        const count = matches.reduce((total, note) => {
          if (useRegex) {
            const regex = new RegExp(searchText, 'g');
            const matches = note.content.match(regex);
            return total + (matches ? matches.length : 0);
          } else {
            const regex = new RegExp(searchText, 'gi');
            const matches = note.content.match(regex);
            return total + (matches ? matches.length : 0);
          }
        }, 0);
        setTotalMatches(count);
      } catch (error) {
        setRegexError('Error processing search: ' + error.message);
      }
    } else {
      setMatchingNotes([]);
      setTotalMatches(0);
      setRegexError('');
    }
  }, [searchText, notes, useRegex]);

  const handleReplace = async () => {
    if (!searchText.trim() || !replaceText.trim()) {
      toast.error('Please enter both search and replace text');
      return;
    }

    if (useRegex) {
      try {
        new RegExp(searchText);
      } catch (e) {
        toast.error('Invalid regular expression');
        return;
      }
    }

    const confirmed = window.confirm(
      `Are you sure you want to replace "${searchText}" with "${replaceText}" in ${matchingNotes.length} notes (${totalMatches} occurrences)?`
    );

    if (confirmed) {
      try {
        for (const note of matchingNotes) {
          let updatedContent;
          if (useRegex) {
            const regex = new RegExp(searchText, 'g');
            updatedContent = note.content.replace(regex, replaceText);
          } else {
            const regex = new RegExp(searchText, 'gi');
            updatedContent = note.content.replace(regex, replaceText);
          }
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

  const handleAdd = async () => {
    if (!searchText.trim() || !addText.trim()) {
      toast.error('Please enter both search text and text to add');
      return;
    }

    if (useRegex) {
      try {
        new RegExp(searchText);
      } catch (e) {
        toast.error('Invalid regular expression');
        return;
      }
    }

    const confirmed = window.confirm(
      `Are you sure you want to add text below matching lines in ${matchingNotes.length} notes (${totalMatches} occurrences)?`
    );

    if (confirmed) {
      try {
        for (const note of matchingNotes) {
          let updatedContent;
          if (useRegex) {
            const regex = new RegExp(searchText, 'g');
            updatedContent = note.content.split('\n').map(line => {
              if (regex.test(line)) {
                regex.lastIndex = 0; // Reset regex state
                return `${line}\n${addText}`;
              }
              return line;
            }).join('\n');
          } else {
            const regex = new RegExp(searchText, 'gi');
            updatedContent = note.content.split('\n').map(line => {
              if (line.toLowerCase().includes(searchText.toLowerCase())) {
                return `${line}\n${addText}`;
              }
              return line;
            }).join('\n');
          }
          await updateNoteById(note.id, updatedContent);
        }
        toast.success(`Successfully added text in ${matchingNotes.length} notes`);
        // Refresh notes after adding
        const data = await loadAllNotes('', null);
        setNotes(data.notes);
        setSearchText('');
        setAddText('');
      } catch (error) {
        toast.error('Error adding text: ' + error.message);
      }
    }
  };

  const handleExport = async () => {
    try {
      // Create a new ZIP file
      const zip = new JSZip();
      
      // Create folders for notes and journals
      const notesFolder = zip.folder('notes');
      const journalsFolder = zip.folder('journals');

      // Fetch all notes and journals metadata
      const [notesData, journalsMetadata] = await Promise.all([
        loadAllNotes('', null),
        listJournals()
      ]);

      // Add notes to the ZIP
      notesData.notes.forEach((note, index) => {
        const fileName = `note_${note.id || index}.txt`;
        notesFolder.file(fileName, note.content);
      });

      // Load and add each journal's full content to the ZIP
      for (const journal of journalsMetadata) {
        try {
          const fullJournal = await loadJournal(journal.date);
          if (fullJournal) {
            const fileName = `journal_${journal.date}.txt`;
            journalsFolder.file(fileName, fullJournal.content);
          }
        } catch (error) {
          console.error(`Error loading journal ${journal.date}:`, error);
        }
      }

      // Generate the ZIP file
      const content = await zip.generateAsync({ type: 'blob' });

      // Create a download link
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rabbit_notes_export_${new Date().toISOString().split('T')[0]}.zip`;
      
      // Trigger the download
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Export completed successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Error during export: ' + error.message);
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
              onClick={handleExport}
              className="ml-auto py-2 px-4 text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              Export All
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
                  <button
                    onClick={() => setActiveSubTab('search-add')}
                    className={`py-2 px-4 text-sm font-medium ${
                      activeSubTab === 'search-add'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Search & Add
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
                      <div className="flex items-center gap-4">
                        <input
                          type="text"
                          value={searchText}
                          onChange={(e) => setSearchText(e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={useRegex ? "Enter regular expression..." : "Enter text to search for..."}
                        />
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={useRegex}
                            onChange={(e) => setUseRegex(e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-700">Use Regex</span>
                        </label>
                      </div>
                      {regexError && (
                        <p className="mt-1 text-sm text-red-600">{regexError}</p>
                      )}
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

                    {searchText && !regexError && (
                      <div className="text-sm text-gray-600">
                        Found {totalMatches} occurrences in {matchingNotes.length} notes
                      </div>
                    )}

                    <button
                      onClick={handleReplace}
                      disabled={!searchText || !replaceText || matchingNotes.length === 0 || regexError}
                      className={`px-4 py-2 rounded-md text-white ${
                        !searchText || !replaceText || matchingNotes.length === 0 || regexError
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      Replace All
                    </button>
                  </div>

                  {matchingNotes.length > 0 && !regexError && (
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
                                if (useRegex) {
                                  try {
                                    const regex = new RegExp(searchText, 'g');
                                    if (regex.test(line)) {
                                      const parts = line.split(new RegExp(`(${searchText})`, 'g'));
                                      return (
                                        <div key={index} className="mb-1">
                                          {parts.map((part, i) => (
                                            <span
                                              key={i}
                                              className={
                                                regex.test(part)
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
                                  } catch (e) {
                                    return <div key={index} className="mb-1">{line}</div>;
                                  }
                                } else if (line.toLowerCase().includes(searchText.toLowerCase())) {
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

              {activeSubTab === 'search-add' && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Search Text
                      </label>
                      <div className="flex items-center gap-4">
                        <input
                          type="text"
                          value={searchText}
                          onChange={(e) => setSearchText(e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={useRegex ? "Enter regular expression..." : "Enter text to search for..."}
                        />
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={useRegex}
                            onChange={(e) => setUseRegex(e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-700">Use Regex</span>
                        </label>
                      </div>
                      {regexError && (
                        <p className="mt-1 text-sm text-red-600">{regexError}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Text to Add Below Matching Lines
                      </label>
                      <input
                        type="text"
                        value={addText}
                        onChange={(e) => setAddText(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter text to add below matching lines..."
                      />
                    </div>

                    {searchText && !regexError && (
                      <div className="text-sm text-gray-600">
                        Found {totalMatches} matching lines in {matchingNotes.length} notes
                      </div>
                    )}

                    <button
                      onClick={handleAdd}
                      disabled={!searchText || !addText || matchingNotes.length === 0 || regexError}
                      className={`px-4 py-2 rounded-md text-white ${
                        !searchText || !addText || matchingNotes.length === 0 || regexError
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      Add Below All Matches
                    </button>
                  </div>

                  {matchingNotes.length > 0 && !regexError && (
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
                                if (useRegex) {
                                  try {
                                    const regex = new RegExp(searchText, 'g');
                                    if (regex.test(line)) {
                                      return (
                                        <div key={index} className="mb-1">
                                          <span className="bg-yellow-200">{line}</span>
                                          <div className="ml-4 text-gray-500 italic">
                                            (Will add: {addText})
                                          </div>
                                        </div>
                                      );
                                    }
                                  } catch (e) {
                                    return <div key={index} className="mb-1">{line}</div>;
                                  }
                                } else if (line.toLowerCase().includes(searchText.toLowerCase())) {
                                  return (
                                    <div key={index} className="mb-1">
                                      <span className="bg-yellow-200">{line}</span>
                                      <div className="ml-4 text-gray-500 italic">
                                        (Will add: {addText})
                                      </div>
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
        </div>
      </div>
    </div>
  );
};

export default Manage; 