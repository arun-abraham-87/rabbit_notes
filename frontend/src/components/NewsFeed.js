// src/components/NewsFeed.js
import React, { useEffect, useState } from 'react';
import { InformationCircleIcon, ExclamationCircleIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { loadAllNotes } from '../utils/ApiUtils';

const NewsFeed = () => {
  const [articles, setArticles] = useState([]);
  const [error, setError] = useState(null);
  const [apiCalls, setApiCalls] = useState(0);
  const [apiKey, setApiKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('org');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentQuery, setCurrentQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState([]);

  // Load search history from localStorage on component mount
  useEffect(() => {
    const storedHistory = localStorage.getItem('newsSearchHistory');
    if (storedHistory) {
      setSearchHistory(JSON.parse(storedHistory));
    }
  }, []);

  // Save search history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('newsSearchHistory', JSON.stringify(searchHistory));
  }, [searchHistory]);

  // Fetch API key from notes
  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const response = await loadAllNotes();
        const notes = response.notes || [];
        console.log('Total notes:', notes.length);
        
        const apiKeyNote = notes.find(note => {
          if (!note?.content) {
            console.log('Note has no content:', note.id);
            return false;
          }
          const lines = note.content.split('\n');
          
          const hasMetaTag = lines.some(line => {
            const trimmed = line.trim();
            const found = trimmed.includes('meta::api_key');
            if (found) console.log('Found meta tag in line:', trimmed);
            return found;
          });
          
          const hasApiKey = lines.some(line => {
            const trimmed = line.trim();
            const found = trimmed.startsWith('newsapikey:');
            if (found) console.log('Found API key in line:', trimmed);
            return found;
          });
          
          console.log('Note check result:', {
            id: note.id,
            hasMetaTag,
            hasApiKey,
            matches: hasMetaTag && hasApiKey
          });
          
          return hasMetaTag && hasApiKey;
        });

        if (apiKeyNote) {
          console.log('apiKeyNote:', apiKeyNote);
          if (!apiKeyNote.content) {
            console.log('Note found but has no content');
            setError("API key not found. Please add a line starting with 'newsapikey:' to the note with meta::api_key");
            return;
          }
          const apiKeyLine = apiKeyNote.content.split('\n').find(line => line.trim().startsWith('newsapikey:'));
          console.log('apiKeyLine:', apiKeyLine);
          if (apiKeyLine) {
            const key = apiKeyLine.split('newsapikey:')[1].trim();
            console.log('Found NewsAPI key in note:', apiKeyNote.id);
            console.log('API key:', key);
            setApiKey(key);
          } else {
            console.log('Note with meta::api_key found but no newsapikey: line');
            setError("API key not found. Please add a line starting with 'newsapikey:' to the note with meta::api_key");
          }
        } else {
          console.log('No note found with both meta::api_key and newsapikey:');
          setError("API key not found. Please create a note with meta::api_key and a line starting with 'newsapikey:'");
        }
      } catch (err) {
        setError("Failed to load API key. Please check your connection and try again.");
        console.error('Error loading API key:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchApiKey();
  }, []);

  // Initialize or update API call count
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const storedData = localStorage.getItem('newsApiCalls');
    let apiCallData = { date: today, count: 0 };

    if (storedData) {
      const parsedData = JSON.parse(storedData);
      if (parsedData.date === today) {
        apiCallData = parsedData;
      }
    }

    setApiCalls(apiCallData.count);
  }, []);

  const handleSearch = async (e, query = null) => {
    e?.preventDefault();
    const searchTerm = query || searchQuery.trim();
    if (!searchTerm || !apiKey) return;
    
    setCurrentQuery(searchTerm);
    setLoading(true);
    try {
      const res = await fetch(
        `https://newsapi.org/v2/everything?q=${searchTerm}&language=en&sortBy=publishedAt&pageSize=5&apiKey=${apiKey}`
      );
      const data = await res.json();
      if (data.status === "ok") {
        setArticles(data.articles);
        
        // Update search history
        const newHistory = [searchTerm, ...searchHistory.filter(item => item !== searchTerm)].slice(0, 10);
        setSearchHistory(newHistory);
        
        // Update API call count
        const today = new Date().toISOString().split('T')[0];
        const storedData = localStorage.getItem('newsApiCalls');
        let apiCallData = { date: today, count: 0 };

        if (storedData) {
          const parsedData = JSON.parse(storedData);
          if (parsedData.date === today) {
            apiCallData = parsedData;
          }
        }

        apiCallData.count += 1;
        localStorage.setItem('newsApiCalls', JSON.stringify(apiCallData));
        setApiCalls(apiCallData.count);
      } else {
        setError(data.message || "Failed to fetch news");
      }
    } catch (err) {
      console.error(err);
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const removeFromHistory = (query, e) => {
    e.stopPropagation();
    setSearchHistory(prev => prev.filter(item => item !== query));
  };

  if (loading && !articles.length) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 max-w-4xl mx-auto">
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
          <div>
            <p className="text-sm text-red-700">{error}</p>
            <p className="text-xs text-red-600">
              To fix this, create a note with meta::api_key and add a line starting with 'newsapikey:'
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* API Usage Card */}
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
        <InformationCircleIcon className="h-5 w-5 text-blue-500" />
        <div>
          <p className="text-sm text-blue-700">
            API calls today: <span className="font-semibold">{apiCalls}</span>
          </p>
          <p className="text-xs text-blue-600">
            Resets daily at midnight
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('org')}
            className={`${
              activeTab === 'org'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            News Feed Org
          </button>
          {/* Add more tabs here as needed */}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'org' && (
        <>
          <form onSubmit={handleSearch} className="mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for news..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <MagnifyingGlassIcon className="h-5 w-5" />
              </button>
            </div>
          </form>

          {/* Search History Pills */}
          {searchHistory.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {searchHistory.map((query, index) => (
                <button
                  key={index}
                  onClick={(e) => handleSearch(e, query)}
                  className="flex items-center gap-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm transition-colors"
                >
                  <span>{query}</span>
                  <XMarkIcon 
                    className="h-4 w-4 text-gray-500 hover:text-gray-700"
                    onClick={(e) => removeFromHistory(query, e)}
                  />
                </button>
              ))}
            </div>
          )}

          {currentQuery && (
            <h2 className="text-xl font-semibold mb-4">News on "{currentQuery}"</h2>
          )}
          
          {loading && articles.length > 0 && (
            <div className="flex items-center justify-center mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          )}

          {articles.map((article, i) => (
            <div key={i} className="mb-4 pb-4 border-b border-gray-200">
              <a 
                href={article.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-blue-600 hover:text-blue-800"
              >
                <h4 className="text-lg font-medium">{article.title}</h4>
              </a>
              <p className="text-sm text-gray-500">
                {article.source.name} - {new Date(article.publishedAt).toLocaleString()}
              </p>
              <p className="mt-2 text-gray-700">{article.description}</p>
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default NewsFeed;
