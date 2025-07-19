import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { BookmarkIcon, MagnifyingGlassIcon, ChartBarIcon, XMarkIcon, FolderIcon, ExclamationTriangleIcon, GlobeAltIcon, PlayIcon, CalendarIcon, ChevronRightIcon, DocumentPlusIcon, ArrowUpTrayIcon, DocumentTextIcon, EyeIcon, EyeSlashIcon, LockClosedIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { createNote, updateNoteById, deleteNoteById } from '../utils/ApiUtils';

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

const LoadBookmarksModal = ({ isOpen, onClose, onDrop }) => {
  const [isDragging, setIsDragging] = useState(false);

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
    onDrop(e);
  }, [onDrop]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-700">Load Bookmarks</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <ArrowUpTrayIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 mb-2">Drag and drop your Chrome bookmarks file here</p>
          <p className="text-sm text-gray-500">The file should be named "bookmarks.html"</p>
        </div>
      </div>
    </div>
  );
};

const LoadBookmarksTextModal = ({ isOpen, onClose, allNotes }) => {
  const [text, setText] = useState('');
  const [error, setError] = useState(null);
  const [parsedNotes, setParsedNotes] = useState([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [duplicates, setDuplicates] = useState([]);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [loadWithoutDuplicates, setLoadWithoutDuplicates] = useState(false);
  const [markAsHidden, setMarkAsHidden] = useState(false);

  const validateUrl = (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const parseUrl = (url) => {
    // Remove trailing slash if present
    url = url.replace(/\/$/, '');
    
    // Handle Instagram URLs
    if (url.startsWith('https://www.instagram.com/')) {
      const parts = url.split('/');
      const username = parts[parts.length - 1];
      return `instagram:${username}`;
    }

    // Handle other URLs
    let processedUrl = url
      .replace(/^https?:\/\//, '') // Remove http(s)://
      .replace(/_/g, '/') // Replace underscores with slashes
      .replace(/[^a-zA-Z0-9\/]/g, '_'); // Replace special characters with underscore

    return processedUrl;
  };

  const handleSubmit = () => {
    setError(null);
    setDuplicates([]);
    setLoadWithoutDuplicates(false);
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      setError('Please enter at least one URL');
      return;
    }

    // Get existing bookmarks from allNotes
    const existingBookmarks = allNotes
      .filter(note => note.content.includes('meta::web_bookmark'))
      .map(note => {
        const lines = note.content.split('\n');
        const url = lines.find(line => line.startsWith('url:'))?.slice(4) || '';
        return url.toLowerCase();
      });

    const notes = [];
    const invalidUrls = [];
    const urlMap = new Map(); // To track duplicates
    const titleMap = new Map(); // To track title duplicates
    const existingDuplicates = []; // To track duplicates with existing bookmarks

    lines.forEach(line => {
      const url = line.trim();
      if (!validateUrl(url)) {
        invalidUrls.push(url);
      } else {
        const title = parseUrl(url);
        const normalizedUrl = url.toLowerCase();
        
        // Check for URL duplicates in the input
        if (urlMap.has(normalizedUrl)) {
          urlMap.get(normalizedUrl).count++;
        } else {
          urlMap.set(normalizedUrl, { url, count: 1 });
        }

        // Check for title duplicates in the input
        if (titleMap.has(title)) {
          titleMap.get(title).count++;
        } else {
          titleMap.set(title, { title, count: 1 });
        }

        // Check for duplicates with existing bookmarks
        if (existingBookmarks.includes(normalizedUrl)) {
          existingDuplicates.push({
            type: 'existing',
            value: url,
            count: 1
          });
        }

        notes.push({
          url,
          title,
          isHidden: markAsHidden
        });
      }
    });

    if (invalidUrls.length > 0) {
      setError(`Invalid URLs found:\n${invalidUrls.join('\n')}`);
      return;
    }

    // Find duplicates in the input
    const inputDuplicates = [];
    urlMap.forEach((value, key) => {
      if (value.count > 1) {
        inputDuplicates.push({
          type: 'url',
          value: value.url,
          count: value.count
        });
      }
    });

    titleMap.forEach((value, key) => {
      if (value.count > 1) {
        inputDuplicates.push({
          type: 'title',
          value: value.title,
          count: value.count
        });
      }
    });

    // Combine all duplicates
    const allDuplicates = [...inputDuplicates, ...existingDuplicates];
    setDuplicates(allDuplicates);
    setParsedNotes(notes);
    setShowDuplicates(true);
  };

  const handleContinue = () => {
    setShowDuplicates(false);
    if (loadWithoutDuplicates) {
      // Filter out duplicates
      const duplicateUrls = new Set(duplicates.map(d => d.value.toLowerCase()));
      const filteredNotes = parsedNotes.filter(note => !duplicateUrls.has(note.url.toLowerCase()));
      setParsedNotes(filteredNotes);
    }
    setShowConfirmation(true);
  };

  const handleConfirm = async () => {
    try {
      for (const note of parsedNotes) {
        const content = [
          `title:${note.title}`,
          `url:${note.url}`,
          `create_date:${new Date().toISOString()}`,
          'meta::web_bookmark',
          note.isHidden ? 'meta::bookmark_hidden' : '',
          '', // Empty line to separate meta from content
        ].filter(line => line).join('\n');

        await createNote(content);
      }
      onClose();
    } catch (error) {
      setError('Error creating notes: ' + error.message);
    }
  };

  if (!isOpen) return null;

  if (showDuplicates) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-4xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-700">Duplicate Check</h3>
            <button
              onClick={() => {
                setShowDuplicates(false);
                setDuplicates([]);
                setParsedNotes([]);
                setLoadWithoutDuplicates(false);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <div className="space-y-4">
            {duplicates.length > 0 ? (
              <>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="text-yellow-800 font-medium mb-2">Found {duplicates.length} duplicates:</h4>
                  <div className="space-y-2">
                    {duplicates.map((dup, index) => (
                      <div key={index} className="text-sm text-yellow-700">
                        {dup.type === 'url' ? 'URL' : dup.type === 'title' ? 'Title' : 'Existing'} duplicate: "{dup.value}" {dup.type === 'existing' ? '(already exists in notes)' : `(${dup.count} occurrences)`}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <input
                    type="checkbox"
                    id="loadWithoutDuplicates"
                    checked={loadWithoutDuplicates}
                    onChange={(e) => setLoadWithoutDuplicates(e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="loadWithoutDuplicates" className="text-sm text-gray-700">
                    Load without duplicates ({parsedNotes.length - duplicates.length} unique URLs)
                  </label>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setShowDuplicates(false);
                      setDuplicates([]);
                      setParsedNotes([]);
                      setLoadWithoutDuplicates(false);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleContinue}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {loadWithoutDuplicates ? 'Load Without Duplicates' : 'Continue Anyway'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-700">No duplicates found!</p>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setShowDuplicates(false);
                      setDuplicates([]);
                      setParsedNotes([]);
                      setLoadWithoutDuplicates(false);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleContinue}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Continue
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (showConfirmation) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-4xl">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-700">Confirm Notes Creation</h3>
            <button
              onClick={() => {
                setShowConfirmation(false);
                setParsedNotes([]);
                setDuplicates([]);
                setLoadWithoutDuplicates(false);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          <div className="space-y-4">
            <div className="max-h-96 overflow-y-auto">
              {parsedNotes.map((note, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg mb-2">
                  <div className="font-medium text-gray-900">{note.title}</div>
                  <div className="text-sm text-gray-500 break-all">{note.url}</div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowConfirmation(false);
                  setParsedNotes([]);
                  setDuplicates([]);
                  setLoadWithoutDuplicates(false);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create {parsedNotes.length} Notes
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-700">Load Bookmarks from Text</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="space-y-4">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 whitespace-pre-line">{error}</p>
            </div>
          )}
          <div className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              id="markAsHidden"
              checked={markAsHidden}
              onChange={(e) => setMarkAsHidden(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="markAsHidden" className="text-sm text-gray-700">
              Mark bookmarks as hidden
            </label>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your bookmarks text here (one URL per line)..."
            className="w-full h-96 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Submit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SummaryModal = ({ isOpen, onClose, newBookmarks, existingCount, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-700">Import Summary</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="space-y-4">
          <p className="text-gray-600">
            Found {newBookmarks.length} new bookmarks to import
            {existingCount > 0 && (
              <span className="text-gray-500"> ({existingCount} duplicates skipped)</span>
            )}
          </p>
          <div className="max-h-96 overflow-y-auto">
            {newBookmarks.map((bookmark, index) => (
              <div key={index} className="p-2 hover:bg-gray-50 rounded">
                <div className="font-medium text-gray-900">{bookmark.title}</div>
                <div className="text-sm text-gray-500">{bookmark.url}</div>
                {bookmark.folderPath && (
                  <div className="text-xs text-gray-400 mt-1">
                    <FolderIcon className="h-3 w-3 inline mr-1" />
                    {bookmark.folderPath}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm(newBookmarks);
                onClose();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Import {newBookmarks.length} Bookmarks
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const PinVerificationModal = ({ isOpen, onClose, onVerify }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pin === '0000') {
      onVerify(true);
      setPin('');
      setError('');
      onClose();
    } else {
      setError('Incorrect PIN');
      setPin('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-700">Enter PIN</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-1">
              Enter PIN to view hidden bookmarks
            </label>
            <div className="relative">
              <input
                type="password"
                id="pin"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter PIN"
                maxLength={4}
                pattern="[0-9]*"
                inputMode="numeric"
              />
              <LockClosedIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            </div>
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Verify
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const BookmarkEdit = ({ isOpen, onClose, bookmark, onSave }) => {
  const [title, setTitle] = useState(bookmark?.title || '');
  const [url, setUrl] = useState(bookmark?.url || '');
  const [folderPath, setFolderPath] = useState(bookmark?.folderPath || '');
  const [isHidden, setIsHidden] = useState(bookmark?.isHidden || false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (bookmark) {
      setTitle(bookmark.title || '');
      setUrl(bookmark.url || '');
      setFolderPath(bookmark.folderPath || '');
      setIsHidden(bookmark.isHidden || false);
    }
  }, [bookmark]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!url.trim()) {
      setError('URL is required');
      return;
    }

    try {
      const updatedBookmark = {
        ...bookmark,
        title: title.trim(),
        url: url.trim(),
        folderPath: folderPath.trim(),
        isHidden
      };

      await onSave(updatedBookmark);
      onClose();
    } catch (err) {
      setError('Failed to save bookmark: ' + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-700">Edit Bookmark</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter bookmark title"
            />
          </div>
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
              URL
            </label>
            <input
              type="url"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter URL"
              required
            />
          </div>
          <div>
            <label htmlFor="folderPath" className="block text-sm font-medium text-gray-700 mb-1">
              Folder Path
            </label>
            <input
              type="text"
              id="folderPath"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter folder path"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isHidden"
              checked={isHidden}
              onChange={(e) => setIsHidden(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isHidden" className="text-sm text-gray-700">
              Mark as hidden
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const DeleteConfirmationModal = ({ isOpen, onClose, onConfirm, bookmark }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-700">Delete Bookmark</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-500 mb-2" />
            <p className="text-red-700">
              Are you sure you want to delete this bookmark?
            </p>
            <p className="text-sm text-red-600 mt-2">
              {bookmark?.title || bookmark?.url}
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const BookmarkManager = ({ allNotes }) => {
  const [bookmarks, setBookmarks] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);
  const [focusedBookmarkIndex, setFocusedBookmarkIndex] = useState(-1);
  const [showOpenAllModal, setShowOpenAllModal] = useState(false);
  const [selectedHostname, setSelectedHostname] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [expandedYears, setExpandedYears] = useState(new Set());
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isWebStatsExpanded, setIsWebStatsExpanded] = useState(false);
  const [isYearlyStatsExpanded, setIsYearlyStatsExpanded] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [bookmarkCounts, setBookmarkCounts] = useState(() => {
    const savedCounts = localStorage.getItem('bookmarkCounts');
    return savedCounts ? JSON.parse(savedCounts) : {};
  });
  const [previewState, setPreviewState] = useState({
    isVisible: false,
    url: null,
    position: { x: 0, y: 0 }
  });
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [newBookmarks, setNewBookmarks] = useState([]);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [groupByMonth, setGroupByMonth] = useState(false);
  const [isLoadTextModalOpen, setIsLoadTextModalOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [editingBookmark, setEditingBookmark] = useState(null);
  const [deletingBookmark, setDeletingBookmark] = useState(null);

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
            const isHidden = note.content.includes('meta::bookmark_hidden');

            return {
              id: note.id,
              title,
              url,
              dateAdded: createDate ? new Date(createDate) : new Date(note.created_datetime),
              folderPath,
              icon: null, // We don't store icons in notes
              created_datetime: note.created_datetime,
              isHidden
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

  // Focus search input on component mount and when route changes
  useEffect(() => {
    // Add a small delay to ensure the component is fully rendered
    const timer = setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
        // Move cursor to end of text
        const length = searchInputRef.current.value.length;
        searchInputRef.current.setSelectionRange(length, length);
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);



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

      // Compare with existing bookmarks
      const existingUrls = new Set(bookmarks.map(b => b.url));
      const duplicates = parsedBookmarks.filter(b => existingUrls.has(b.url));
      const uniqueNewBookmarks = parsedBookmarks.filter(b => !existingUrls.has(b.url));

      setNewBookmarks(uniqueNewBookmarks);
      setDuplicateCount(duplicates.length);
      setIsLoadModalOpen(false);
      setIsSummaryModalOpen(true);
    };

    reader.readAsText(file);
  }, [bookmarks]);

  const handleImportConfirm = useCallback(async (bookmarksToImport) => {
    try {
      // Save each bookmark as a note
      for (const bookmark of bookmarksToImport) {
        const content = [
          `title:${bookmark.title || bookmark.url}`,
          `url:${bookmark.url}`,
          `create_date:${bookmark.dateAdded ? bookmark.dateAdded.toISOString() : new Date().toISOString()}`,
          'meta::web_bookmark',
          '', // Empty line to separate meta from content
          bookmark.folderPath ? `Folder: ${bookmark.folderPath}` : ''
        ].join('\n');

        await createNote(content);
      }

      // Update the bookmarks list
      setBookmarks(prev => [...prev, ...bookmarksToImport]);
      
      // Show success message
      alert(`Successfully imported ${bookmarksToImport.length} bookmarks as notes!`);
    } catch (error) {
      console.error('Error saving bookmarks as notes:', error);
      alert('Error saving bookmarks as notes. Please try again.');
    }
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

  // Calculate yearly and monthly statistics
  const yearlyStats = useMemo(() => {
    const yearCounts = bookmarks.reduce((acc, bookmark) => {
      if (bookmark.dateAdded) {
        const year = bookmark.dateAdded.getFullYear();
        if (!acc[year]) {
          acc[year] = {
            count: 0,
            months: {}
          };
        }
        acc[year].count++;

        if (groupByMonth) {
          const month = bookmark.dateAdded.getMonth();
          if (!acc[year].months[month]) {
            acc[year].months[month] = 0;
          }
          acc[year].months[month]++;
        }
      }
      return acc;
    }, {});

    return Object.entries(yearCounts)
      .sort(([a], [b]) => b - a)
      .map(([year, data]) => ({
        year,
        count: data.count,
        months: data.months
      }));
  }, [bookmarks, groupByMonth]);

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

  // Filter bookmarks based on search, selected hostname, selected year, selected month, and duplicates
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

    // Filter by selected year and month
    if (selectedYear || selectedMonth !== null) {
      filtered = filtered.filter(bookmark => {
        if (!bookmark.dateAdded) return false;
        const bookmarkYear = bookmark.dateAdded.getFullYear();
        const bookmarkMonth = bookmark.dateAdded.getMonth();
        
        if (selectedYear && selectedMonth !== null) {
          return bookmarkYear === parseInt(selectedYear) && bookmarkMonth === selectedMonth;
        } else if (selectedYear) {
          return bookmarkYear === parseInt(selectedYear);
        } else if (selectedMonth !== null) {
          return bookmarkMonth === selectedMonth;
        }
        return false;
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

    // Sort by created date (newest first)
    filtered.sort((a, b) => {
      const dateA = a.dateAdded || new Date(a.created_datetime);
      const dateB = b.dateAdded || new Date(b.created_datetime);
      return dateB - dateA;
    });

    // If no filters are applied, show only the first 100 bookmarks
    if (!searchQuery.trim() && !selectedHostname && !selectedYear && selectedMonth === null) {
      filtered = filtered.slice(0, 100);
    }

    return filtered;
  }, [bookmarks, searchQuery, selectedHostname, selectedYear, selectedMonth]);

  // Keyboard navigation for bookmarks
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle arrow keys when not in an input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
      }

      if (focusedBookmarkIndex >= 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          e.stopPropagation();
          setFocusedBookmarkIndex(prev => 
            prev < filteredBookmarks.length - 1 ? prev + 1 : prev
          );
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          e.stopPropagation();
          if (focusedBookmarkIndex === 0) {
            // Return focus to search input
            setFocusedBookmarkIndex(-1);
            searchInputRef.current?.focus();
          } else {
            setFocusedBookmarkIndex(prev => prev - 1);
          }
        } else if (e.key === 'Enter' && focusedBookmarkIndex >= 0) {
          e.preventDefault();
          e.stopPropagation();
          const bookmark = filteredBookmarks[focusedBookmarkIndex];
          if (bookmark) {
            window.open(bookmark.url, '_blank');
          }
        } else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          setFocusedBookmarkIndex(-1);
          searchInputRef.current?.focus();
        }
      } else if (e.key === 'a') {
        // Open all bookmarks when 'a' is pressed and search is not focused
        e.preventDefault();
        e.stopPropagation();
        const bookmarksToOpen = filteredBookmarks.length > 0 ? filteredBookmarks : bookmarks;
        if (bookmarksToOpen.length > 10) {
          setShowOpenAllModal(true);
        } else {
          // Open all bookmarks directly
          bookmarksToOpen.forEach(bookmark => {
            window.open(bookmark.url, '_blank');
          });
        }
      } else if (e.key === 'c') {
        // Focus the search bar when 'c' is pressed and cursor is not in focus
        e.preventDefault();
        e.stopPropagation();
        setFocusedBookmarkIndex(-1);
        searchInputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [focusedBookmarkIndex, filteredBookmarks]);

  // Scroll focused bookmark into view
  useEffect(() => {
    if (focusedBookmarkIndex >= 0) {
      const focusedElement = document.querySelector(`[data-bookmark-index="${focusedBookmarkIndex}"]`);
      if (focusedElement) {
        focusedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [focusedBookmarkIndex]);

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

  const handleSaveBookmark = async (updatedBookmark) => {
    try {
      const content = [
        `title:${updatedBookmark.title}`,
        `url:${updatedBookmark.url}`,
        `create_date:${updatedBookmark.dateAdded ? updatedBookmark.dateAdded.toISOString() : new Date().toISOString()}`,
        'meta::web_bookmark',
        updatedBookmark.isHidden ? 'meta::bookmark_hidden' : '',
        '', // Empty line to separate meta from content
        updatedBookmark.folderPath ? `Folder: ${updatedBookmark.folderPath}` : ''
      ].filter(line => line).join('\n');

      // Update the existing note instead of creating a new one
      await updateNoteById(updatedBookmark.id, content);
      
      // Update the bookmarks list
      setBookmarks(prev => prev.map(b => 
        b.id === updatedBookmark.id ? updatedBookmark : b
      ));
    } catch (error) {
      console.error('Error updating bookmark:', error);
      throw error;
    }
  };

  const handleDeleteBookmark = async (bookmark) => {
    try {
      await deleteNoteById(bookmark.id);
      setBookmarks(prev => prev.filter(b => b.id !== bookmark.id));
      setDeletingBookmark(null);
    } catch (error) {
      console.error('Error deleting bookmark:', error);
      alert('Failed to delete bookmark. Please try again.');
    }
  };

  const renderBookmarkCard = (bookmark, index) => {
    const isPreviewable = isPreviewableUrl(bookmark.url);
    const count = bookmarkCounts[bookmark.url] || 0;
    const isHidden = bookmark.isHidden;
    const shouldMask = isHidden && !showHidden;
    const isFocused = focusedBookmarkIndex === index;
    
    return (
      <div
        key={index}
        data-bookmark-index={index}
        className={`flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow ${
          isFocused ? 'ring-2 ring-blue-500 bg-blue-50' : ''
        }`}
        tabIndex={isFocused ? 0 : -1}
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
          {shouldMask ? (
            <div className="text-gray-400 truncate cursor-not-allowed">
              XXXXXXXXXXXXXXXXXX
            </div>
          ) : (
            <a
              href={bookmark.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 truncate block"
              onClick={() => incrementCount(bookmark.url)}
            >
              {bookmark.title || bookmark.url}
            </a>
          )}
          <p className="text-sm text-gray-500 truncate">
            {shouldMask ? 'XXXXXXXXXXXXXXXXXX' : bookmark.url}
          </p>
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
          <button
            onClick={() => setEditingBookmark(bookmark)}
            className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200 transition-colors"
            title="Edit bookmark"
          >
            <PencilIcon className="h-4 w-4 text-gray-600" />
          </button>
          <button
            onClick={() => setDeletingBookmark(bookmark)}
            className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg cursor-pointer hover:bg-red-100 transition-colors"
            title="Delete bookmark"
          >
            <TrashIcon className="h-4 w-4 text-red-600" />
          </button>
          {isPreviewable && !shouldMask && (
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

  const clearFilters = useCallback(() => {
    setSelectedYear(null);
    setSelectedMonth(null);
    setSelectedHostname(null);
  }, []);

  const renderBookmarkList = () => {
    if (showDuplicates) {
      return (
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
      );
    }

    // If any grouping filter is active, show grouped view
    if (selectedYear || selectedMonth !== null) {
      return (
        <div className="space-y-6">
          {Object.entries(
            filteredBookmarks.reduce((groups, bookmark) => {
              const year = bookmark.dateAdded ? bookmark.dateAdded.getFullYear() : 'No Date';
              const month = groupByMonth && bookmark.dateAdded ? bookmark.dateAdded.getMonth() : null;
              const key = month !== null ? `${year}-${month}` : year;
              if (!groups[key]) {
                groups[key] = [];
              }
              groups[key].push(bookmark);
              return groups;
            }, {})
          )
            .sort(([keyA], [keyB]) => {
              if (keyA === 'No Date') return 1;
              if (keyB === 'No Date') return -1;
              return keyB.localeCompare(keyA);
            })
            .map(([key, yearBookmarks]) => (
              <div key={key} className="space-y-2">
                <div 
                  className="flex items-center gap-2 mb-2 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                  onClick={() => toggleYear(key)}
                >
                  <ChevronRightIcon 
                    className={`h-5 w-5 text-orange-500 transition-transform ${
                      expandedYears.has(key) ? 'transform rotate-90' : ''
                    }`} 
                  />
                  <CalendarIcon className="h-5 w-5 text-orange-500" />
                  <h4 className="text-lg font-semibold text-gray-700">
                    {key === 'No Date' ? 'No Date' : (
                      key.includes('-') 
                        ? `${new Date(2000, parseInt(key.split('-')[1]), 1).toLocaleString('default', { month: 'long' })} ${key.split('-')[0]}`
                        : key
                    )}
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      ({yearBookmarks.length} {yearBookmarks.length === 1 ? 'bookmark' : 'bookmarks'})
                    </span>
                  </h4>
                </div>
                {expandedYears.has(key) && (
                  <div className="space-y-2 pl-8">
                    {yearBookmarks.map((bookmark, index) => renderBookmarkCard(bookmark, index))}
                  </div>
                )}
              </div>
            ))}
        </div>
      );
    }

    // Default ungrouped view
    return (
      <div className="space-y-2">
        {filteredBookmarks.map((bookmark, index) => renderBookmarkCard(bookmark, index))}
      </div>
    );
  };

  const handleShowHiddenClick = () => {
    if (!showHidden) {
      setIsPinModalOpen(true);
    } else {
      setShowHidden(false);
    }
  };

  const handlePinVerify = (success) => {
    if (success) {
      setShowHidden(true);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-700">Bookmarks</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setIsLoadTextModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <DocumentTextIcon className="h-5 w-5" />
            Load Bookmarks (Text)
          </button>
          <button
            onClick={() => setIsLoadModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <ArrowUpTrayIcon className="h-5 w-5" />
            Load Bookmarks
          </button>
        </div>
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
              <div 
                className="flex items-center justify-between mb-3 cursor-pointer"
                onClick={() => setIsYearlyStatsExpanded(!isYearlyStatsExpanded)}
              >
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-orange-500" />
                  <h3 className="text-md font-medium text-gray-700">Bookmarks by Year</h3>
                </div>
                <div className="flex items-center gap-2">
                  {(selectedYear || selectedMonth !== null) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearFilters();
                      }}
                      className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                    >
                      <XMarkIcon className="h-4 w-4" />
                      Clear filters
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setGroupByMonth(!groupByMonth);
                    }}
                    className={`text-sm px-3 py-1 rounded-lg transition-colors ${
                      groupByMonth 
                        ? 'bg-orange-100 text-orange-700 hover:bg-orange-200' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {groupByMonth ? 'Show by Year' : 'Show by Month'}
                  </button>
                  <ChevronRightIcon 
                    className={`h-5 w-5 text-gray-500 transition-transform ${
                      isYearlyStatsExpanded ? 'transform rotate-90' : ''
                    }`} 
                  />
                </div>
              </div>
              {isYearlyStatsExpanded && (
                <div className="space-y-4">
                  {yearlyStats.map(({ year, count, months }) => (
                    <div key={year} className="space-y-2">
                      <div
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
                      {groupByMonth && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 pl-4">
                          {Object.entries(months)
                            .sort(([a], [b]) => b - a)
                            .map(([month, monthCount]) => (
                              <div
                                key={month}
                                onClick={() => setSelectedMonth(selectedMonth === parseInt(month) ? null : parseInt(month))}
                                className={`bg-gray-50 rounded-lg p-2 cursor-pointer transition-colors ${
                                  selectedMonth === parseInt(month)
                                    ? 'bg-orange-100 border-2 border-orange-500'
                                    : 'hover:bg-gray-100'
                                }`}
                              >
                                <div className="text-xs font-medium text-gray-500">
                                  {new Date(2000, month, 1).toLocaleString('default', { month: 'short' })}
                                </div>
                                <div className="text-lg font-semibold text-gray-900">{monthCount}</div>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm p-4">
            <div 
              className="flex items-center justify-between mb-3 cursor-pointer"
              onClick={() => setIsWebStatsExpanded(!isWebStatsExpanded)}
            >
              <div className="flex items-center gap-2">
                <ChartBarIcon className="h-5 w-5 text-gray-500" />
                <h3 className="text-md font-medium text-gray-700">Website Statistics</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">{hostnameStats.length} unique websites</span>
                <ChevronRightIcon 
                  className={`h-5 w-5 text-gray-500 transition-transform ${
                    isWebStatsExpanded ? 'transform rotate-90' : ''
                  }`} 
                />
              </div>
            </div>
            {isWebStatsExpanded && (
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
            )}
          </div>

          <div className="mt-4">
            <div className="mb-4">
              <div className="relative">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      if (filteredBookmarks.length > 0) {
                        setFocusedBookmarkIndex(0);
                        // Remove focus from search input
                        searchInputRef.current?.blur();
                      }
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      // Clear search and move focus out of search input
                      setSearchQuery('');
                      setFocusedBookmarkIndex(-1);
                      searchInputRef.current?.blur();
                    }
                  }}
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

            {(selectedHostname || selectedYear || selectedMonth) && (
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
                  {selectedHostname && selectedMonth !== null && (
                    <span className="text-sm text-gray-700">and</span>
                  )}
                  {selectedMonth !== null && (
                    <span className="text-sm font-medium text-blue-700">from {selectedMonth}</span>
                  )}
                </div>
                <button
                  onClick={() => {
                    clearFilters();
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            )}

            <div className="flex items-center justify-between mb-3">
              <h3 className="text-md font-medium text-gray-700">
                {filteredBookmarks.length === bookmarks.length 
                  ? `All Bookmarks (${bookmarks.length})`
                  : `Filtered Bookmarks (${filteredBookmarks.length} of ${bookmarks.length})`
                }
                {!searchQuery.trim() && !selectedHostname && !selectedYear && selectedMonth === null && (
                  <span className="text-sm text-gray-500 ml-2">
                    (showing most recent 100)
                  </span>
                )}
              </h3>
              <button
                onClick={handleShowHiddenClick}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                {showHidden ? (
                  <>
                    <EyeSlashIcon className="h-5 w-5" />
                    Hide Hidden Bookmarks
                  </>
                ) : (
                  <>
                    <EyeIcon className="h-5 w-5" />
                    Show Hidden Bookmarks
                  </>
                )}
              </button>
            </div>
            
            <div className="space-y-6">
              {renderBookmarkList()}
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

      <LoadBookmarksModal
        isOpen={isLoadModalOpen}
        onClose={() => setIsLoadModalOpen(false)}
        onDrop={handleDrop}
      />

      <LoadBookmarksTextModal
        isOpen={isLoadTextModalOpen}
        onClose={() => setIsLoadTextModalOpen(false)}
        allNotes={allNotes}
      />

      <SummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        newBookmarks={newBookmarks}
        existingCount={duplicateCount}
        onConfirm={handleImportConfirm}
      />

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

      <PinVerificationModal
        isOpen={isPinModalOpen}
        onClose={() => setIsPinModalOpen(false)}
        onVerify={handlePinVerify}
      />

      <BookmarkEdit
        isOpen={!!editingBookmark}
        onClose={() => setEditingBookmark(null)}
        bookmark={editingBookmark}
        onSave={handleSaveBookmark}
      />

      <DeleteConfirmationModal
        isOpen={!!deletingBookmark}
        onClose={() => setDeletingBookmark(null)}
        onConfirm={() => handleDeleteBookmark(deletingBookmark)}
        bookmark={deletingBookmark}
      />

      {/* Open All Bookmarks Confirmation Modal */}
      {showOpenAllModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-96 max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Open All Bookmarks
              </h3>
              <button
                onClick={() => setShowOpenAllModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-4">
                <p className="text-gray-700 mb-2">
                  You're about to open {filteredBookmarks.length > 0 ? filteredBookmarks.length : bookmarks.length} bookmarks in new tabs.
                </p>
                <p className="text-sm text-gray-500">
                  This may slow down your browser. Are you sure you want to continue?
                </p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowOpenAllModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const bookmarksToOpen = filteredBookmarks.length > 0 ? filteredBookmarks : bookmarks;
                    bookmarksToOpen.forEach(bookmark => {
                      window.open(bookmark.url, '_blank');
                    });
                    setShowOpenAllModal(false);
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Open All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookmarkManager; 