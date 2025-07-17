import React, { useState, useMemo } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, MapPinIcon, LinkIcon } from '@heroicons/react/24/solid';
import { useLocation } from 'react-router-dom';

const RightPanel = ({ notes, setNotes, setActivePage }) => {
  const [isCollapsed, setIsCollapsed] = useState(true); // Start collapsed by default
  const [hoveredNote, setHoveredNote] = useState(null);
  const location = useLocation();

  // Extract pinned notes (notes with meta::notes_pinned tag)
  const pinnedNotes = useMemo(() => {
    return notes.filter(note => 
      note.content && note.content.includes('meta::notes_pinned')
    );
  }, [notes]);

  const handleNavigateToNote = (noteId) => {
    setActivePage('notes');
    // Navigate to notes page with search query to filter by note ID
    // Use the same approach as SearchModalContext to navigate with state
    const searchQuery = `id:${noteId}`;
    // Set the search query in localStorage to be picked up by the notes page
    localStorage.setItem('tempSearchQuery', searchQuery);
    window.location.href = '/#/notes';
  };

  const handleMouseEnter = () => {
    if (isCollapsed) {
      setIsCollapsed(false);
    }
  };

  const handleMouseLeave = () => {
    setIsCollapsed(true);
  };

  // Function to parse and format content with URLs
  const formatContent = (content) => {
    if (!content) return '';
    
    // Remove meta tags for display
    const cleanContent = content.split('\n').filter(line => !line.trim().startsWith('meta::')).join('\n');
    
    // URL regex patterns
    const urlRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s)]+)/g;
    
    // Replace URLs with clickable links
    const formattedContent = cleanContent.replace(urlRegex, (match, label, url1, url2) => {
      const url = url1 || url2;
      const displayText = label || url;
      return `[${displayText}](${url})`;
    });
    
    return formattedContent;
  };

  // Function to extract URLs from content
  const extractUrls = (content) => {
    if (!content) return [];
    
    const urls = [];
    const urlRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s)]+)/g;
    let match;
    
    while ((match = urlRegex.exec(content)) !== null) {
      const url = match[2] || match[3];
      const label = match[1] || url;
      urls.push({ url, label });
    }
    
    return urls;
  };

  // Only show on dashboard page
  const isDashboard = location.pathname === '/' || location.pathname === '/dashboard';
  if (!isDashboard || pinnedNotes.length === 0) {
    return null;
  }

  return (
    <div 
      className={`fixed right-0 top-0 h-full bg-white border-l border-gray-200 shadow-lg transition-all duration-300 z-40 ${
        isCollapsed ? 'w-8' : 'w-80'
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -left-3 top-4 bg-white border border-gray-200 rounded-full p-1 shadow-md hover:shadow-lg transition-shadow"
      >
        {isCollapsed ? (
          <ChevronLeftIcon className="h-4 w-4 text-gray-600" />
        ) : (
          <ChevronRightIcon className="h-4 w-4 text-gray-600" />
        )}
      </button>

      {!isCollapsed && (
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              <MapPinIcon className="h-5 w-5 text-red-500" />
              <h2 className="text-lg font-semibold text-gray-800">Pinned Notes</h2>
              <span className="ml-auto text-sm text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                {pinnedNotes.length}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {pinnedNotes.map((note) => {
                const urls = extractUrls(note.content);
                const formattedContent = formatContent(note.content);
                
                return (
                  <div
                    key={note.id}
                    className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                    onMouseEnter={() => setHoveredNote(note.id)}
                    onMouseLeave={() => setHoveredNote(null)}
                  >
                    {/* Note Header */}
                    <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50 rounded-t-lg">
                      <div className="flex items-center gap-2">
                        <MapPinIcon className="h-4 w-4 text-red-500" />
                        <span className="text-sm font-medium text-gray-700">
                          {new Date(note.created_datetime).toLocaleDateString()}
                        </span>
                        {urls.length > 0 && (
                          <div className="flex items-center gap-1">
                            <LinkIcon className="h-3 w-3 text-blue-500" />
                            <span className="text-xs text-gray-500">{urls.length} link{urls.length !== 1 ? 's' : ''}</span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleNavigateToNote(note.id)}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                      >
                        View Full
                      </button>
                    </div>

                    {/* Note Content */}
                    <div className="p-3">
                      <div className="text-sm text-gray-800 whitespace-pre-wrap break-words leading-relaxed">
                        {formattedContent}
                      </div>
                      
                      {/* URLs Section */}
                      {urls.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="space-y-1">
                            {urls.map((urlObj, index) => (
                              <div key={index} className="flex items-center gap-2 text-xs">
                                <LinkIcon className="h-3 w-3 text-blue-500 flex-shrink-0" />
                                <a
                                  href={urlObj.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 hover:underline truncate"
                                  title={urlObj.url}
                                >
                                  {urlObj.label}
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RightPanel;

 