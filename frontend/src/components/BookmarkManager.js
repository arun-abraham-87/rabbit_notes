import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { BookmarkIcon, MagnifyingGlassIcon, ChartBarIcon, XMarkIcon, FolderIcon, ExclamationTriangleIcon, GlobeAltIcon, PlayIcon, CalendarIcon, ChevronRightIcon, DocumentPlusIcon } from '@heroicons/react/24/outline';
import { createNote } from '../utils/ApiUtils';

const WebsitePreview = ({ url, isVisible }) => {
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  if (!isVisible) return null;

  const handleIframeError = () => {
    setIsUnavailable(true);
    setIsLoading(false);
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  if (isUnavailable) {
    return (
      <div 
        className="fixed z-50 bg-white rounded-lg shadow-xl overflow-hidden top-4 right-4 p-6"
        style={{
          width: '640px',
          height: '360px'
        }}
      >
        <div className="flex flex-col items-center justify-center h-full text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-yellow-500 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Preview Unavailable</h3>
          <p className="text-gray-600 mb-4">This website cannot be previewed due to security restrictions.</p>
          <div className="text-sm text-gray-500">
            <p>Possible reasons:</p>
            <ul className="list-disc list-inside mt-2">
              <li>Website blocks iframe embedding</li>
              <li>Cross-origin restrictions</li>
              <li>Security policies prevent preview</li>
            </ul>
          </div>
          <a 
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 text-blue-600 hover:text-blue-800 flex items-center gap-2"
          >
            <GlobeAltIcon className="h-5 w-5" />
            Open website in new tab
          </a>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed z-50 bg-white rounded-lg shadow-xl overflow-hidden top-4 right-4"
      style={{
        width: '640px',
        height: '360px'
      }}
    >
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      )}
      <iframe
        width="640"
        height="360"
        src={url}
        title="Website preview"
        frameBorder="0"
        onError={handleIframeError}
        onLoad={handleIframeLoad}
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
      />
    </div>
  );
};

const YouTubePreview = ({ url, isVisible, position }) => {
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  if (!isVisible) return null;

  // Extract video ID from YouTube URL
  const getYouTubeId = (url) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const videoId = getYouTubeId(url);
  if (!videoId) return null;

  const handleIframeError = () => {
    setIsUnavailable(true);
    setIsLoading(false);
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
  };

  if (isUnavailable) {
    return (
      <div 
        className="fixed z-50 bg-white rounded-lg shadow-xl overflow-hidden top-4 right-4 p-6"
        style={{
          width: '640px',
          height: '360px'
        }}
      >
        <div className="flex flex-col items-center justify-center h-full text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-yellow-500 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Video Unavailable</h3>
          <p className="text-gray-600 mb-4">This video is no longer available on YouTube.</p>
          <div className="text-sm text-gray-500">
            <p>Possible reasons:</p>
            <ul className="list-disc list-inside mt-2">
              <li>Video was deleted by the uploader</li>
              <li>Video was made private</li>
              <li>Video was removed due to copyright issues</li>
              <li>Channel was terminated</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed z-50 bg-white rounded-lg shadow-xl overflow-hidden top-4 right-4"
      style={{
        width: '640px',
        height: '360px'
      }}
    >
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500"></div>
        </div>
      )}
      <iframe
        width="640"
        height="360"
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`}
        title="YouTube video preview"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        onError={handleIframeError}
        onLoad={handleIframeLoad}
      />
    </div>
  );
};

const BookmarkManager = ({ allNotes }) => {
  const [bookmarks, setBookmarks] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHostname, setSelectedHostname] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [expandedYears, setExpandedYears] = useState(new Set());
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [bookmarkCounts, setBookmarkCounts] = useState(() => {
    const savedCounts = localStorage.getItem('bookmarkCounts');
    return savedCounts ? JSON.parse(savedCounts) : {};
  });
  const [previewState, setPreviewState] = useState({
    isVisible: false,
    url: null,
    position: { x: 0, y: 0 }
  });

  // Load web bookmarks from notes
  useEffect(() => {
    const loadWebBookmarks = () => {
      try {
        if (!allNotes || !Array.isArray(allNotes)) {
          console.error('allNotes is not a valid array:', allNotes);
          setIsLoading(false);
          return;
        }

        const webBookmarks = allNotes
          .filter(note => note.content.includes('meta::web_bookmark'))
          .map(note => {
            const lines = note.content.split('\n');
            const title = lines.find(line => line.startsWith('title:'))?.slice(6) || '';
            const url = lines.find(line => line.startsWith('url:'))?.slice(4) || '';
            const createDate = lines.find(line => line.startsWith('create_date:'))?.slice(12);
            const folderPath = lines.find(line => line.startsWith('Folder:'))?.slice(7) || 'Uncategorized';

            return {
              id: note.id,
              title,
              url,
              dateAdded: createDate ? new Date(createDate) : new Date(note.created_datetime),
              folderPath,
              icon: null, // We don't store icons in notes
              created_datetime: note.created_datetime
            };
          });

        setBookmarks(webBookmarks);
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading web bookmarks:', error);
        setIsLoading(false);
      }
    };

    loadWebBookmarks();
  }, [allNotes]);

  // Save counts to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('bookmarkCounts', JSON.stringify(bookmarkCounts));
  }, [bookmarkCounts]);

  const incrementCount = useCallback((url) => {
    setBookmarkCounts(prev => ({
      ...prev,
      [url]: (prev[url] || 0) + 1
    }));
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (!file || file.type !== 'text/html') {
      alert('Please drop a valid Chrome bookmarks HTML file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const parser = new DOMParser();
      const doc = parser.parseFromString(event.target.result, 'text/html');
      const bookmarkElements = doc.querySelectorAll('a');
      
      const parsedBookmarks = Array.from(bookmarkElements).map(link => {
        // Get the folder path by traversing up the DOM tree
        const folderPath = [];
        let parent = link.parentElement;
        while (parent && parent.tagName === 'DL') {
          const heading = parent.previousElementSibling;
          if (heading && heading.tagName === 'H3') {
            folderPath.unshift(heading.textContent);
          }
          parent = parent.parentElement;
        }

        return {
          title: link.textContent,
          url: link.href,
          dateAdded: link.getAttribute('add_date') ? new Date(parseInt(link.getAttribute('add_date')) * 1000) : null,
          icon: link.getAttribute('icon'),
          folderPath: folderPath.join(' > ')
        };
      });

      setBookmarks(parsedBookmarks);
    };

    reader.readAsText(file);
  }, []);

  // Calculate all hostnames
  const hostnameStats = useMemo(() => {
    const hostnameCounts = bookmarks.reduce((acc, bookmark) => {
      try {
        const url = new URL(bookmark.url);
        const hostname = url.hostname.replace('www.', '');
        acc[hostname] = (acc[hostname] || 0) + 1;
      } catch (e) {
        // Skip invalid URLs
      }
      return acc;
    }, {});

    return Object.entries(hostnameCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([hostname, count]) => ({ hostname, count }));
  }, [bookmarks]);

  // Calculate folder statistics
  const folderStats = useMemo(() => {
    const folderCounts = bookmarks.reduce((acc, bookmark) => {
      const folder = bookmark.folderPath || 'Uncategorized';
      acc[folder] = (acc[folder] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(folderCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([folder, count]) => ({ folder, count }));
  }, [bookmarks]);

  // Calculate yearly statistics
  const yearlyStats = useMemo(() => {
    const yearCounts = bookmarks.reduce((acc, bookmark) => {
      if (bookmark.dateAdded) {
        const year = bookmark.dateAdded.getFullYear();
        acc[year] = (acc[year] || 0) + 1;
      }
      return acc;
    }, {});

    return Object.entries(yearCounts)
      .sort(([a], [b]) => b - a) // Sort years in descending order
      .map(([year, count]) => ({ year, count }));
  }, [bookmarks]);

  // Calculate duplicate bookmarks
  const duplicateStats = useMemo(() => {
    const urlMap = new Map();
    const titleMap = new Map();

    bookmarks.forEach(bookmark => {
      // Check URL duplicates
      const url = bookmark.url.toLowerCase();
      if (!urlMap.has(url)) {
        urlMap.set(url, []);
      }
      urlMap.get(url).push(bookmark);

      // Check title duplicates
      const title = bookmark.title?.toLowerCase();
      if (title) {
        if (!titleMap.has(title)) {
          titleMap.set(title, []);
        }
        titleMap.get(title).push(bookmark);
      }
    });

    const duplicateUrls = Array.from(urlMap.entries())
      .filter(([_, bookmarks]) => bookmarks.length > 1)
      .map(([url, bookmarks]) => ({
        type: 'url',
        value: url,
        count: bookmarks.length,
        bookmarks
      }));

    const duplicateTitles = Array.from(titleMap.entries())
      .filter(([_, bookmarks]) => bookmarks.length > 1)
      .map(([title, bookmarks]) => ({
        type: 'title',
        value: title,
        count: bookmarks.length,
        bookmarks
      }));

    return {
      urlDuplicates: duplicateUrls,
      titleDuplicates: duplicateTitles,
      totalDuplicates: duplicateUrls.length + duplicateTitles.length
    };
  }, [bookmarks]);

  // Filter bookmarks based on search, selected hostname, selected year, and duplicates
  const filteredBookmarks = useMemo(() => {
    let filtered = bookmarks;

    // Filter by selected hostname
    if (selectedHostname) {
      filtered = filtered.filter(bookmark => {
        try {
          const url = new URL(bookmark.url);
          return url.hostname.replace('www.', '') === selectedHostname;
        } catch (e) {
          return false;
        }
      });
    }

    // Filter by selected year
    if (selectedYear) {
      filtered = filtered.filter(bookmark => {
        if (!bookmark.dateAdded) return false;
        const bookmarkYear = bookmark.dateAdded.getFullYear();
        return bookmarkYear === parseInt(selectedYear);
      });
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const searchWords = searchQuery.toLowerCase().split(/\s+/).filter(word => word.length > 0);
      
      filtered = filtered.filter(bookmark => {
        const title = (bookmark.title?.toLowerCase() || '');
        const url = (bookmark.url?.toLowerCase() || '');
        
        return searchWords.every(word => {
          const titleWords = title.split(/\s+/);
          const urlWords = url.split(/[/\-_?=&.]+/);
          
          const hasTitleMatch = titleWords.some(titleWord => titleWord === word);
          const hasUrlMatch = urlWords.some(urlWord => urlWord === word);
          
          return hasTitleMatch || hasUrlMatch || title.includes(word) || url.includes(word);
        });
      });
    }

    return filtered;
  }, [bookmarks, searchQuery, selectedHostname, selectedYear]);

  // Get grouped duplicates for display
  const groupedDuplicates = useMemo(() => {
    if (!showDuplicates) return null;

    const groups = [
      ...duplicateStats.urlDuplicates.map(group => ({
        type: 'url',
        value: group.value,
        count: group.count,
        bookmarks: group.bookmarks
      })),
      ...duplicateStats.titleDuplicates.map(group => ({
        type: 'title',
        value: group.value,
        count: group.count,
        bookmarks: group.bookmarks
      }))
    ].sort((a, b) => b.count - a.count);

    return groups;
  }, [showDuplicates, duplicateStats]);

  const handleMouseEnter = useCallback((e, url) => {
    setPreviewState({
      isVisible: true,
      url,
      position: { x: 0, y: 0 }
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setPreviewState(prev => ({ ...prev, isVisible: false }));
  }, []);

  const isYouTubeUrl = (url) => {
    return url.includes('youtube.com') || url.includes('youtu.be');
  };

  const isPreviewableUrl = (url) => {
    return url.includes('youtube.com') || url.includes('youtu.be') || url.startsWith('http');
  };

  const toggleYear = useCallback((year) => {
    setExpandedYears(prev => {
      const newSet = new Set(prev);
      if (newSet.has(year)) {
        newSet.delete(year);
      } else {
        newSet.add(year);
      }
      return newSet;
    });
  }, []);

  const saveBookmarksAsNotes = useCallback(async () => {
    try {
      const notes = bookmarks.map(bookmark => {
        const content = [
          `title:${bookmark.title || bookmark.url}`,
          `url:${bookmark.url}`,
          `create_date:${bookmark.dateAdded ? bookmark.dateAdded.toISOString() : new Date().toISOString()}`,
          'meta::web_bookmark',
          '', // Empty line to separate meta from content
          bookmark.folderPath ? `Folder: ${bookmark.folderPath}` : ''
        ].join('\n');

        return {
          content,
          tags: ['web_bookmark'],
          folder: bookmark.folderPath || 'Uncategorized'
        };
      });

      // Save each note using createNote from apiUtils
      for (const note of notes) {
        await createNote(note.content);
      }

      alert(`Successfully saved ${notes.length} bookmarks as notes!`);
    } catch (error) {
      console.error('Error saving bookmarks as notes:', error);
      alert('Error saving bookmarks as notes. Please try again.');
    }
  }, [bookmarks]);

  const renderBookmarkCard = (bookmark, index) => {
    const isPreviewable = isPreviewableUrl(bookmark.url);
    const count = bookmarkCounts[bookmark.url] || 0;
    
    return (
      <div
        key={index}
        className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
      >
        {bookmark.icon && (
          <img
            src={bookmark.icon}
            alt=""
            className="w-4 h-4"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        )}
        <div className="flex-1 min-w-0">
          <a
            href={bookmark.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 truncate block"
            onClick={() => incrementCount(bookmark.url)}
          >
            {bookmark.title || bookmark.url}
          </a>
          <p className="text-sm text-gray-500 truncate">{bookmark.url}</p>
          {bookmark.folderPath && (
            <p className="text-xs text-gray-400 mt-1">
              <FolderIcon className="h-3 w-3 inline mr-1" />
              {bookmark.folderPath}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {count > 0 && (
            <div className="flex flex-col items-center bg-blue-50 px-3 py-1 rounded-lg">
              <span className="text-2xl font-bold text-blue-600">{count}</span>
              <span className="text-xs text-blue-500">visits</span>
            </div>
          )}
          {bookmark.dateAdded && (
            <div className="text-xs text-gray-400">
              {bookmark.dateAdded.toLocaleDateString()}
            </div>
          )}
          {isPreviewable && (
            <div
              className="w-8 h-8 flex items-center justify-center bg-gray-900 rounded-lg cursor-pointer hover:bg-gray-800 transition-colors"
              onMouseEnter={(e) => handleMouseEnter(e, bookmark.url)}
              onMouseLeave={handleMouseLeave}
              title="Preview"
            >
              <PlayIcon className="h-4 w-4 text-white" />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-700">Bookmarks</h2>
        {bookmarks.length > 0 && (
          <button
            onClick={saveBookmarksAsNotes}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <DocumentPlusIcon className="h-5 w-5" />
            Save as Notes
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : bookmarks.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <BookmarkIcon className="h-5 w-5 text-blue-500" />
                <h3 className="text-md font-medium text-gray-700">Total Bookmarks</h3>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{bookmarks.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <FolderIcon className="h-5 w-5 text-green-500" />
                <h3 className="text-md font-medium text-gray-700">Total Folders</h3>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{folderStats.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <ChartBarIcon className="h-5 w-5 text-purple-500" />
                <h3 className="text-md font-medium text-gray-700">Unique Websites</h3>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{hostnameStats.length}</p>
            </div>
            <div 
              className={`bg-white rounded-lg shadow-sm p-4 cursor-pointer transition-colors ${
                showDuplicates ? 'bg-red-50 border-2 border-red-500' : 'hover:bg-gray-50'
              }`}
              onClick={() => setShowDuplicates(!showDuplicates)}
            >
              <div className="flex items-center gap-2 mb-2">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                <h3 className="text-md font-medium text-gray-700">Duplicate Bookmarks</h3>
              </div>
              <p className="text-2xl font-semibold text-gray-900">{duplicateStats.totalDuplicates}</p>
              {duplicateStats.totalDuplicates > 0 && (
                <div className="mt-2 text-sm text-gray-500">
                  {duplicateStats.urlDuplicates.length} URL duplicates
                  {duplicateStats.titleDuplicates.length > 0 && (
                    <span>, {duplicateStats.titleDuplicates.length} title duplicates</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {yearlyStats.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-orange-500" />
                  <h3 className="text-md font-medium text-gray-700">Bookmarks by Year</h3>
                </div>
                {selectedYear && (
                  <button
                    onClick={() => setSelectedYear(null)}
                    className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  >
                    <XMarkIcon className="h-4 w-4" />
                    Clear year filter
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {yearlyStats.map(({ year, count }) => (
                  <div
                    key={year}
                    onClick={() => setSelectedYear(selectedYear === year ? null : year)}
                    className={`bg-gray-50 rounded-lg p-3 cursor-pointer transition-colors ${
                      selectedYear === year
                        ? 'bg-orange-100 border-2 border-orange-500'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <div className="text-sm font-medium text-gray-500">{year}</div>
                    <div className="text-xl font-semibold text-gray-900">{count}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ChartBarIcon className="h-5 w-5 text-gray-500" />
                <h3 className="text-md font-medium text-gray-700">Website Statistics</h3>
              </div>
              <span className="text-sm text-gray-500">{hostnameStats.length} unique websites</span>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              <div className="space-y-2">
                {hostnameStats.map(({ hostname, count }, index) => (
                  <div
                    key={hostname}
                    onClick={() => setSelectedHostname(hostname)}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                      selectedHostname === hostname
                        ? 'bg-blue-50 hover:bg-blue-100'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-500">{index + 1}.</span>
                      <span className="text-sm text-gray-700">{hostname}</span>
                    </div>
                    <span className="text-sm text-gray-500">{count} bookmarks</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search bookmarks (space-separated words)..."
                  className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    title="Clear search"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                )}
              </div>
              {searchQuery.trim() && (
                <p className="text-sm text-gray-500 mt-1">
                  Searching for: {searchQuery.split(/\s+/).filter(word => word.length > 0).join(', ')}
                </p>
              )}
            </div>

            {(selectedHostname || selectedYear) && (
              <div className="mb-4 flex items-center justify-between bg-blue-50 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">Showing bookmarks:</span>
                  {selectedHostname && (
                    <span className="text-sm font-medium text-blue-700">from {selectedHostname}</span>
                  )}
                  {selectedHostname && selectedYear && (
                    <span className="text-sm text-gray-700">and</span>
                  )}
                  {selectedYear && (
                    <span className="text-sm font-medium text-blue-700">from {selectedYear}</span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSelectedHostname(null);
                    setSelectedYear(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            )}

            <h3 className="text-md font-medium text-gray-700 mb-3">
              {filteredBookmarks.length === bookmarks.length 
                ? `All Bookmarks (${bookmarks.length})`
                : `Filtered Bookmarks (${filteredBookmarks.length} of ${bookmarks.length})`
              }
            </h3>
            
            <div className="space-y-6">
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    const allYears = Object.entries(
                      filteredBookmarks.reduce((groups, bookmark) => {
                        const year = bookmark.dateAdded ? bookmark.dateAdded.getFullYear() : 'No Date';
                        if (!groups[year]) {
                          groups[year] = [];
                        }
                        groups[year].push(bookmark);
                        return groups;
                      }, {})
                    ).map(([year]) => year);
                    setExpandedYears(new Set(allYears));
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <ChevronRightIcon className="h-4 w-4 text-gray-500" />
                  Expand All
                </button>
              </div>

              {showDuplicates ? (
                <div className="space-y-6">
                  {groupedDuplicates?.map((group, groupIndex) => (
                    <div key={`${group.type}-${group.value}`} className="bg-white rounded-lg shadow-sm overflow-hidden">
                      <div className="bg-gray-50 p-4 border-b">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                            <h3 className="text-lg font-semibold text-gray-900">
                              {group.type === 'url' ? 'Duplicate URL' : 'Duplicate Title'}
                            </h3>
                          </div>
                          <span className="text-sm text-gray-500">
                            {group.count} {group.count === 1 ? 'occurrence' : 'occurrences'}
                          </span>
                        </div>
                        <div className="mt-2 text-sm text-gray-600 break-all">
                          {group.value}
                        </div>
                      </div>
                      <div className="divide-y">
                        {group.bookmarks.map((bookmark, index) => renderBookmarkCard(bookmark, index))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(
                    filteredBookmarks.reduce((groups, bookmark) => {
                      const year = bookmark.dateAdded ? bookmark.dateAdded.getFullYear() : 'No Date';
                      if (!groups[year]) {
                        groups[year] = [];
                      }
                      groups[year].push(bookmark);
                      return groups;
                    }, {})
                  )
                  .sort(([yearA], [yearB]) => {
                    if (yearA === 'No Date') return 1;
                    if (yearB === 'No Date') return -1;
                    return parseInt(yearB) - parseInt(yearA);
                  })
                  .map(([year, yearBookmarks]) => (
                    <div key={year} className="space-y-2">
                      <div 
                        className="flex items-center gap-2 mb-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                        onClick={() => toggleYear(year)}
                      >
                        <ChevronRightIcon 
                          className={`h-5 w-5 text-orange-500 transition-transform ${
                            expandedYears.has(year) ? 'transform rotate-90' : ''
                          }`} 
                        />
                        <CalendarIcon className="h-5 w-5 text-orange-500" />
                        <h4 className="text-lg font-semibold text-gray-700">
                          {year === 'No Date' ? 'No Date' : year}
                          <span className="ml-2 text-sm font-normal text-gray-500">
                            ({yearBookmarks.length} {yearBookmarks.length === 1 ? 'bookmark' : 'bookmarks'})
                          </span>
                        </h4>
                      </div>
                      {expandedYears.has(year) && (
                        <div className="space-y-2 pl-8">
                          {yearBookmarks.map((bookmark, index) => renderBookmarkCard(bookmark, index))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {filteredBookmarks.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No bookmarks match your search
              </div>
            )}
          </div>
        </>
      ) : (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <BookmarkIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-2">No bookmarks found in notes</p>
          <p className="text-sm text-gray-500 mb-4">Drag and drop your Chrome bookmarks file here to import them</p>
          <p className="text-sm text-gray-500">The file should be named "bookmarks.html"</p>
        </div>
      )}

      {previewState.isVisible && (
        isYouTubeUrl(previewState.url) ? (
          <YouTubePreview
            isVisible={previewState.isVisible}
            url={previewState.url}
            position={previewState.position}
          />
        ) : (
          <WebsitePreview
            isVisible={previewState.isVisible}
            url={previewState.url}
          />
        )
      )}
    </div>
  );
};

export default BookmarkManager; 