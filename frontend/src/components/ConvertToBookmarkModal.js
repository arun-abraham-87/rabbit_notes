import React, { useState, useEffect } from 'react';
import { XMarkIcon, GlobeAltIcon, DocumentTextIcon } from '@heroicons/react/24/outline';

const ConvertToBookmarkModal = ({ isOpen, onClose, note, onConvert }) => {
  const [selectedTitle, setSelectedTitle] = useState('');
  const [selectedUrl, setSelectedUrl] = useState('');
  const [availableTitles, setAvailableTitles] = useState([]);
  const [availableUrls, setAvailableUrls] = useState([]);

  // Extract URLs from note content
  const extractUrls = (content) => {
    const urlRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s)]+)/g;
    const urls = [];
    let match;
    
    while ((match = urlRegex.exec(content)) !== null) {
      const url = match[2] || match[3];
      const label = match[1] || url;
      urls.push({ url, label });
    }
    
    return urls;
  };

  // Extract text lines from note content (excluding meta tags)
  const extractTextLines = (content) => {
    return content
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        return trimmed && !trimmed.startsWith('meta::') && !trimmed.startsWith('title:') && !trimmed.startsWith('url:') && !trimmed.startsWith('create_date:');
      })
      .map(line => line.trim())
      .filter(line => line.length > 0);
  };

  useEffect(() => {
    if (isOpen && note) {
      // Extract available titles (text lines)
      const textLines = extractTextLines(note.content);
      setAvailableTitles(textLines);
      
      // Extract available URLs
      const urls = extractUrls(note.content);
      setAvailableUrls(urls);
      
      // Set default selections
      if (textLines.length > 0) {
        setSelectedTitle(textLines[0]);
      }
      if (urls.length > 0) {
        setSelectedUrl(urls[0].url);
      }
    }
  }, [isOpen, note]);

  const handleConvert = () => {
    if (!selectedTitle || !selectedUrl) {
      alert('Please select both a title and URL');
      return;
    }

    const currentDate = new Date().toISOString();
    const bookmarkContent = `title:${selectedTitle}
url:${selectedUrl}
create_date:${currentDate}
meta::web_bookmark`;

    onConvert(bookmarkContent);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <GlobeAltIcon className="h-5 w-5 text-blue-500" />
            Convert to Web Bookmark
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Title Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title
            </label>
            {availableTitles.length > 0 ? (
              <select
                value={selectedTitle}
                onChange={(e) => setSelectedTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {availableTitles.map((title, index) => (
                  <option key={index} value={title}>
                    {title}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={selectedTitle}
                onChange={(e) => setSelectedTitle(e.target.value)}
                placeholder="Enter bookmark title"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            )}
          </div>

          {/* URL Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL
            </label>
            {availableUrls.length > 0 ? (
              <select
                value={selectedUrl}
                onChange={(e) => setSelectedUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {availableUrls.map((urlObj, index) => (
                  <option key={index} value={urlObj.url}>
                    {urlObj.label} ({urlObj.url})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="url"
                value={selectedUrl}
                onChange={(e) => setSelectedUrl(e.target.value)}
                placeholder="Enter URL"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            )}
          </div>

          {/* Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preview
            </label>
            <div className="bg-gray-50 rounded-md p-3 border border-gray-200">
              <div className="text-sm font-mono text-gray-700 space-y-1">
                <div>title:{selectedTitle || 'Selected title will appear here'}</div>
                <div>url:{selectedUrl || 'Selected URL will appear here'}</div>
                <div>create_date:{new Date().toISOString()}</div>
                <div>meta::web_bookmark</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConvert}
            disabled={!selectedTitle || !selectedUrl}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Convert to Bookmark
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConvertToBookmarkModal; 