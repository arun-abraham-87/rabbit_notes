import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { loadAllNotes, updateNoteById, listJournals, loadJournal, createNote, exportAllNotes } from '../utils/ApiUtils';
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
          // Split search text by commas and trim whitespace
          const searchTerms = searchText.split(',').map(term => term.trim()).filter(term => term);
          
          if (searchTerms.length > 1) {
            // AND condition: all terms must be present
            matches = notes.filter(note => 
              searchTerms.every(term => 
                note.content.toLowerCase().includes(term.toLowerCase())
              )
            );
          } else {
            // Single term search
            matches = notes.filter(note => 
              note.content.toLowerCase().includes(searchText.toLowerCase())
            );
          }
        }
        setMatchingNotes(matches);
        
        // Count total occurrences
        const count = matches.reduce((total, note) => {
          if (useRegex) {
            const regex = new RegExp(searchText, 'g');
            const matches = note.content.match(regex);
            return total + (matches ? matches.length : 0);
          } else {
            const searchTerms = searchText.split(',').map(term => term.trim()).filter(term => term);
            return total + searchTerms.reduce((termTotal, term) => {
              // Escape special characters for regex
              const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const regex = new RegExp(escapedTerm, 'gi');
              const termMatches = note.content.match(regex);
              return termTotal + (termMatches ? termMatches.length : 0);
            }, 0);
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
      `Are you sure you want to add text ${activeSubTab === 'search-add' ? 'below matching lines' : 
        activeSubTab === 'add-end' ? 'at the end of notes' : 'above matching lines'} in ${matchingNotes.length} notes?`
    );

    if (confirmed) {
      try {
        for (const note of matchingNotes) {
          let updatedContent;
          if (activeSubTab === 'add-end') {
            // Add text at the end of the note
            updatedContent = note.content.trim() + '\n' + addText;
          } else {
            // Add text above or below matching lines
            const lines = note.content.split('\n');
            const newLines = [];
            
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              let matches = false;
              
              if (useRegex) {
                const regex = new RegExp(searchText, 'g');
                matches = regex.test(line);
                regex.lastIndex = 0; // Reset regex state
              } else {
                matches = line.toLowerCase().includes(searchText.toLowerCase());
              }

              if (matches) {
                if (activeSubTab === 'add-above') {
                  newLines.push(addText);
                }
                newLines.push(line);
                if (activeSubTab === 'search-add') {
                  newLines.push(addText);
                }
              } else {
                newLines.push(line);
              }
            }
            
            updatedContent = newLines.join('\n');
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

  // Helper function to reverse a string
  const reverseString = (str) => {
    return str.split('').reverse().join('');
  };

  // Helper function to find and reverse URLs in text
  const reverseUrlsInText = (text) => {
    // Regular expression to match URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    
    // Regular expression to match markdown links [text](url)
    const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    
    let result = text;
    
    // First, handle markdown links
    result = result.replace(markdownLinkRegex, (match, text, url) => {
      const reversedUrl = reverseString(url);
      return `[${text}](${reversedUrl})`;
    });
    
    // Then, handle plain URLs
    result = result.replace(urlRegex, (url) => {
      return reverseString(url);
    });
    
    return result;
  };

  // Helper function to check if text has unreversed URLs (starting with http)
  const hasUnreversedUrls = (text) => {
    // Regular expression to match URLs starting with http
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    
    // Regular expression to match markdown links [text](url) where url starts with http
    const markdownLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
    
    // Check for plain URLs starting with http
    const plainUrls = text.match(urlRegex);
    if (plainUrls && plainUrls.some(url => url.startsWith('http'))) {
      return true;
    }
    
    // Check for markdown links with URLs starting with http
    const markdownMatches = text.match(markdownLinkRegex);
    if (markdownMatches && markdownMatches.some(match => match.includes('http'))) {
      return true;
    }
    
    return false;
  };

  // Function to find sensitive notes and reverse their URLs
  const handleReverseUrls = async () => {
    // Find all notes with meta::sensitive:: tag that have unreversed URLs
    const sensitiveNotes = notes.filter(note => 
      note.content.includes('meta::sensitive::') && hasUnreversedUrls(note.content)
    );

    if (sensitiveNotes.length === 0) {
      toast.info('No sensitive notes with unreversed URLs found');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to reverse URLs in ${sensitiveNotes.length} sensitive notes?`
    );

    if (confirmed) {
      try {
        let processedCount = 0;
        for (const note of sensitiveNotes) {
          const reversedContent = reverseUrlsInText(note.content);
          if (reversedContent !== note.content) {
            // Add meta::url_reversed tag to the reversed content
            const contentWithTag = reversedContent + '\nmeta::url_reversed';
            await updateNoteById(note.id, contentWithTag);
            processedCount++;
          }
        }
        toast.success(`Successfully reversed URLs in ${processedCount} sensitive notes`);
        
        // Refresh notes after processing
        const data = await loadAllNotes('', null);
        setNotes(data.notes);
      } catch (error) {
        toast.error('Error reversing URLs: ' + error.message);
      }
    }
  };

  const handleExport = async () => {
    try {
      await exportAllNotes();
      toast.success('Backup Performed');
    } catch (error) {
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
                    Add Below Matches
                  </button>
                  <button
                    onClick={() => setActiveSubTab('add-above')}
                    className={`py-2 px-4 text-sm font-medium ${
                      activeSubTab === 'add-above'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Add Above Matches
                  </button>
                  <button
                    onClick={() => setActiveSubTab('add-end')}
                    className={`py-2 px-4 text-sm font-medium ${
                      activeSubTab === 'add-end'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Add at End
                  </button>
                  <button
                    onClick={() => setActiveSubTab('reverse-urls')}
                    className={`py-2 px-4 text-sm font-medium ${
                      activeSubTab === 'reverse-urls'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Reverse URLs (Sensitive)
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
                          placeholder={useRegex ? "Enter regular expression..." : "Enter text to search for (comma-separated for AND condition)..."}
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
                      {!useRegex && searchText.includes(',') && (
                        <p className="mt-1 text-sm text-gray-600">
                          Searching for notes containing ALL of: {searchText.split(',').map(term => term.trim()).filter(term => term).join(', ')}
                        </p>
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
                        Matching Notes (Preview)
                      </h2>
                      <div className="space-y-4">
                        {matchingNotes.map((note) => {
                          // Create a preview of the replacement
                          let previewContent = note.content;
                          if (useRegex) {
                            try {
                              const regex = new RegExp(searchText, 'g');
                              previewContent = note.content.replace(regex, replaceText);
                            } catch (e) {
                              previewContent = note.content;
                            }
                          } else {
                            const searchTerms = searchText.split(',').map(term => term.trim()).filter(term => term);
                            searchTerms.forEach(term => {
                              const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                              const regex = new RegExp(escapedTerm, 'gi');
                              previewContent = previewContent.replace(regex, replaceText);
                            });
                          }

                          return (
                            <div
                              key={note.id}
                              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                            >
                              <div className="text-sm text-gray-600 mb-2">
                                Note ID: {note.id}
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                {/* Original Content */}
                                <div>
                                  <div className="text-sm font-medium text-gray-700 mb-2">Original:</div>
                                  <div className="text-gray-800 whitespace-pre-wrap bg-gray-50 p-2 rounded">
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
                                      } else {
                                        const searchTerms = searchText.split(',').map(term => term.trim()).filter(term => term);
                                        let lineToShow = line;
                                        let hasMatch = false;

                                        searchTerms.forEach(term => {
                                          if (line.toLowerCase().includes(term.toLowerCase())) {
                                            hasMatch = true;
                                            const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                            const regex = new RegExp(`(${escapedTerm})`, 'gi');
                                            lineToShow = lineToShow.replace(regex, '<span class="bg-yellow-200">$1</span>');
                                          }
                                        });

                                        if (hasMatch) {
                                          return (
                                            <div 
                                              key={index} 
                                              className="mb-1"
                                              dangerouslySetInnerHTML={{ __html: lineToShow }}
                                            />
                                          );
                                        }
                                      }
                                      return <div key={index} className="mb-1">{line}</div>;
                                    })}
                                  </div>
                                </div>

                                {/* Preview Content */}
                                <div>
                                  <div className="text-sm font-medium text-gray-700 mb-2">After Replacement:</div>
                                  <div className="text-gray-800 whitespace-pre-wrap bg-gray-50 p-2 rounded">
                                    {previewContent.split('\n').map((line, index) => {
                                      // Highlight the replaced text
                                      if (useRegex) {
                                        try {
                                          const regex = new RegExp(replaceText, 'g');
                                          if (regex.test(line)) {
                                            const parts = line.split(new RegExp(`(${replaceText})`, 'g'));
                                            return (
                                              <div key={index} className="mb-1">
                                                {parts.map((part, i) => (
                                                  <span
                                                    key={i}
                                                    className={
                                                      regex.test(part)
                                                        ? 'bg-green-200'
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
                                      } else {
                                        const searchTerms = searchText.split(',').map(term => term.trim()).filter(term => term);
                                        let lineToShow = line;
                                        let hasMatch = false;

                                        searchTerms.forEach(term => {
                                          if (line.toLowerCase().includes(replaceText.toLowerCase())) {
                                            hasMatch = true;
                                            const escapedTerm = replaceText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                            const regex = new RegExp(`(${escapedTerm})`, 'gi');
                                            lineToShow = lineToShow.replace(regex, '<span class="bg-green-200">$1</span>');
                                          }
                                        });

                                        if (hasMatch) {
                                          return (
                                            <div 
                                              key={index} 
                                              className="mb-1"
                                              dangerouslySetInnerHTML={{ __html: lineToShow }}
                                            />
                                          );
                                        }
                                      }
                                      return <div key={index} className="mb-1">{line}</div>;
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {(activeSubTab === 'search-add' || activeSubTab === 'add-above' || activeSubTab === 'add-end') && (
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
                        Text to Add
                      </label>
                      <input
                        type="text"
                        value={addText}
                        onChange={(e) => setAddText(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder={`Enter text to add ${activeSubTab === 'add-end' ? 'at the end of matching notes' : 
                          activeSubTab === 'add-above' ? 'above matching lines' : 'below matching lines'}...`}
                      />
                    </div>

                    {searchText && !regexError && (
                      <div className="text-sm text-gray-600">
                        Found {totalMatches} matching lines in {matchingNotes.length} notes
                      </div>
                    )}

                    <button
                      onClick={handleAdd}
                      disabled={!addText || !searchText || matchingNotes.length === 0 || regexError}
                      className={`px-4 py-2 rounded-md text-white ${
                        !addText || !searchText || matchingNotes.length === 0 || regexError
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-blue-600 hover:bg-blue-700'
                      }`}
                    >
                      {activeSubTab === 'add-end' ? 'Add to Matching Notes' : 
                       activeSubTab === 'add-above' ? 'Add Above All Matches' : 
                       'Add Below All Matches'}
                    </button>
                  </div>

                  {matchingNotes.length > 0 && !regexError && (
                    <div className="mt-6">
                      <h2 className="text-lg font-semibold text-gray-800 mb-4">
                        Matching Notes (Preview)
                      </h2>
                      <div className="space-y-4">
                        {matchingNotes.map((note) => {
                          // Create a preview of the addition
                          let previewContent = note.content;
                          if (activeSubTab === 'add-end') {
                            previewContent = note.content.trim() + '\n' + addText;
                          } else {
                            const lines = note.content.split('\n');
                            const newLines = [];
                            
                            for (let i = 0; i < lines.length; i++) {
                              const line = lines[i];
                              let matches = false;
                              
                              if (useRegex) {
                                const regex = new RegExp(searchText, 'g');
                                matches = regex.test(line);
                                regex.lastIndex = 0; // Reset regex state
                              } else {
                                matches = line.toLowerCase().includes(searchText.toLowerCase());
                              }

                              if (matches) {
                                if (activeSubTab === 'add-above') {
                                  newLines.push(addText);
                                }
                                newLines.push(line);
                                if (activeSubTab === 'search-add') {
                                  newLines.push(addText);
                                }
                              } else {
                                newLines.push(line);
                              }
                            }
                            
                            previewContent = newLines.join('\n');
                          }

                          return (
                            <div
                              key={note.id}
                              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                            >
                              <div className="text-sm text-gray-600 mb-2">
                                Note ID: {note.id}
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                {/* Original Content */}
                                <div>
                                  <div className="text-sm font-medium text-gray-700 mb-2">Current:</div>
                                  <div className="text-gray-800 whitespace-pre-wrap bg-gray-50 p-2 rounded">
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
                                      } else {
                                        const searchTerms = searchText.split(',').map(term => term.trim()).filter(term => term);
                                        let lineToShow = line;
                                        let hasMatch = false;

                                        searchTerms.forEach(term => {
                                          if (line.toLowerCase().includes(term.toLowerCase())) {
                                            hasMatch = true;
                                            const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                            const regex = new RegExp(`(${escapedTerm})`, 'gi');
                                            lineToShow = lineToShow.replace(regex, '<span class="bg-yellow-200">$1</span>');
                                          }
                                        });

                                        if (hasMatch) {
                                          return (
                                            <div 
                                              key={index} 
                                              className="mb-1"
                                              dangerouslySetInnerHTML={{ __html: lineToShow }}
                                            />
                                          );
                                        }
                                      }
                                      return <div key={index} className="mb-1">{line}</div>;
                                    })}
                                  </div>
                                </div>

                                {/* Preview Content */}
                                <div>
                                  <div className="text-sm font-medium text-gray-700 mb-2">After Adding:</div>
                                  <div className="text-gray-800 whitespace-pre-wrap bg-gray-50 p-2 rounded">
                                    {previewContent.split('\n').map((line, index) => {
                                      // Highlight the added text
                                      if (line === addText) {
                                        return (
                                          <div key={index} className="mb-1">
                                            <span className="bg-green-200">{line}</span>
                                          </div>
                                        );
                                      }
                                      
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
                                      } else {
                                        const searchTerms = searchText.split(',').map(term => term.trim()).filter(term => term);
                                        let lineToShow = line;
                                        let hasMatch = false;

                                        searchTerms.forEach(term => {
                                          if (line.toLowerCase().includes(term.toLowerCase())) {
                                            hasMatch = true;
                                            const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                                            const regex = new RegExp(`(${escapedTerm})`, 'gi');
                                            lineToShow = lineToShow.replace(regex, '<span class="bg-yellow-200">$1</span>');
                                          }
                                        });

                                        if (hasMatch) {
                                          return (
                                            <div 
                                              key={index} 
                                              className="mb-1"
                                              dangerouslySetInnerHTML={{ __html: lineToShow }}
                                            />
                                          );
                                        }
                                      }
                                      return <div key={index} className="mb-1">{line}</div>;
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeSubTab === 'reverse-urls' && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-blue-800 mb-2">
                        Reverse URLs in Sensitive Notes
                      </h3>
                      <p className="text-blue-700 mb-4">
                        This feature will find all notes with the <code className="bg-blue-100 px-1 rounded">meta::sensitive::</code> tag 
                        that contain URLs starting with "http" (unreversed URLs). Notes with already reversed URLs (ending in "ptth") 
                        will be excluded. Reversed notes will have the <code className="bg-blue-100 px-1 rounded">meta::url_reversed</code> tag added. This includes:
                      </p>
                      <ul className="list-disc list-inside text-blue-700 space-y-1">
                        <li>Plain URLs: <code className="bg-blue-100 px-1 rounded">https://example.com</code> → <code className="bg-blue-100 px-1 rounded">moc.elpmaxe//:sptth</code></li>
                        <li>Markdown links: <code className="bg-blue-100 px-1 rounded">[Link Text](https://example.com)</code> → <code className="bg-blue-100 px-1 rounded">[Link Text](moc.elpmaxe//:sptth)</code></li>
                      </ul>
                    </div>

                    {/* Find sensitive notes */}
                    {(() => {
                      const sensitiveNotes = notes.filter(note => 
                        note.content.includes('meta::sensitive::') && hasUnreversedUrls(note.content)
                      );
                      
                      return (
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-800">
                              Sensitive Notes with Unreversed URLs: {sensitiveNotes.length}
                            </h3>
                            <button
                              onClick={handleReverseUrls}
                              disabled={sensitiveNotes.length === 0}
                              className={`px-4 py-2 rounded-md text-white ${
                                sensitiveNotes.length === 0
                                  ? 'bg-gray-400 cursor-not-allowed'
                                  : 'bg-red-600 hover:bg-red-700'
                              }`}
                            >
                              Reverse URLs in All Sensitive Notes
                            </button>
                          </div>

                          {sensitiveNotes.length > 0 && (
                            <div className="space-y-4">
                              <h4 className="text-md font-medium text-gray-700 mb-2">
                                Preview of Sensitive Notes:
                              </h4>
                              {sensitiveNotes.map((note) => {
                                const reversedContent = reverseUrlsInText(note.content);
                                const hasUrls = reversedContent !== note.content;
                                const contentWithTag = hasUrls ? reversedContent + '\nmeta::url_reversed' : note.content;
                                
                                return (
                                  <div
                                    key={note.id}
                                    className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                                  >
                                    <div className="text-sm text-gray-600 mb-2">
                                      Note ID: {note.id}
                                      {hasUrls && (
                                        <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                                          Contains URLs
                                        </span>
                                      )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      {/* Original Content */}
                                      <div>
                                        <div className="text-sm font-medium text-gray-700 mb-2">Original:</div>
                                        <div className="text-gray-800 whitespace-pre-wrap bg-gray-50 p-2 rounded text-sm max-h-40 overflow-y-auto">
                                          {note.content}
                                        </div>
                                      </div>

                                      {/* Reversed Content */}
                                      <div>
                                        <div className="text-sm font-medium text-gray-700 mb-2">After URL Reversal:</div>
                                        <div className="text-gray-800 whitespace-pre-wrap bg-gray-50 p-2 rounded text-sm max-h-40 overflow-y-auto">
                                          {contentWithTag}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {sensitiveNotes.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                              <p>No sensitive notes with unreversed URLs found.</p>
                              <p className="mt-2 text-sm">Notes with <code className="bg-gray-100 px-1 rounded">meta::sensitive::</code> tag and URLs starting with "http" will appear here.</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
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