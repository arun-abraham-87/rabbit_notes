import React, { useState, useCallback, useMemo } from 'react';
import { BookmarkIcon, MagnifyingGlassIcon, ChartBarIcon, XMarkIcon, FolderIcon, ExclamationTriangleIcon, GlobeAltIcon, PlayIcon } from '@heroicons/react/24/outline';

const WebsitePreview = ({ url, isVisible }) => {
  const [isUnavailable, setIsUnavailable] = useState(false);

  if (!isVisible) return null;

  const handleIframeError = () => {
    setIsUnavailable(true);
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
      <iframe
        width="640"
        height="360"
        src={url}
        title="Website preview"
        frameBorder="0"
        onError={handleIframeError}
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
      />
    </div>
  );
};

const YouTubePreview = ({ url, isVisible, position }) => {
  const [isUnavailable, setIsUnavailable] = useState(false);

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
      <iframe
        width="640"
        height="360"
        src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`}
        title="YouTube video preview"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        onError={handleIframeError}
      />
    </div>
  );
};

const BookmarkManager = () => {
  const [bookmarks, setBookmarks] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHostname, setSelectedHostname] = useState(null);
  const [previewState, setPreviewState] = useState({
    isVisible: false,
    url: null,
    position: { x: 0, y: 0 }
  });

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

  // Filter bookmarks based on search and selected hostname
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

    // Apply search filter
    if (searchQuery.trim()) {
      const searchWords = searchQuery.toLowerCase().split(/\s+/).filter(word => word.length > 0);
      
      filtered = filtered.filter(bookmark => {
        const title = (bookmark.title?.toLowerCase() || '');
        const url = (bookmark.url?.toLowerCase() || '');
        
        // Check if all search words are found in either title or URL
        return searchWords.every(word => {
          // Split title and URL into words for full word matching
          const titleWords = title.split(/\s+/);
          const urlWords = url.split(/[/\-_?=&.]+/);
          
          // Check for full word matches
          const hasTitleMatch = titleWords.some(titleWord => titleWord === word);
          const hasUrlMatch = urlWords.some(urlWord => urlWord === word);
          
          // If no full word match, fall back to includes for partial matches
          return hasTitleMatch || hasUrlMatch || title.includes(word) || url.includes(word);
        });
      });
    }

    return filtered;
  }, [bookmarks, searchQuery, selectedHostname]);

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-700">Bookmarks</h2>
      </div>

      {bookmarks.length > 0 && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          </div>

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
        </>
      )}

      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <BookmarkIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <p className="text-gray-600 mb-2">Drag and drop your Chrome bookmarks file here</p>
        <p className="text-sm text-gray-500">The file should be named "bookmarks.html"</p>
      </div>

      {bookmarks.length > 0 && (
        <div className="mt-4">
          <div className="mb-4">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search bookmarks (space-separated words)..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            </div>
            {searchQuery.trim() && (
              <p className="text-sm text-gray-500 mt-1">
                Searching for: {searchQuery.split(/\s+/).filter(word => word.length > 0).join(', ')}
              </p>
            )}
          </div>

          {selectedHostname && (
            <div className="mb-4 flex items-center justify-between bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Showing bookmarks from:</span>
                <span className="text-sm font-medium text-blue-700">{selectedHostname}</span>
              </div>
              <button
                onClick={() => setSelectedHostname(null)}
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
          
          <div className="space-y-2">
            {filteredBookmarks.map((bookmark, index) => {
              const isPreviewable = isPreviewableUrl(bookmark.url);
              
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
            })}
          </div>

          {filteredBookmarks.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No bookmarks match your search
            </div>
          )}
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