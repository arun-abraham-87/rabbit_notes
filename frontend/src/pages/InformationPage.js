import React, { useState, useMemo } from 'react';
import { PencilIcon, PlusIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { MapPinIcon } from '@heroicons/react/24/solid';
import EditEventModal from '../components/EditEventModal';
import { createNote, updateNoteById } from '../utils/ApiUtils';

// Fuzzy search function
const fuzzySearch = (text, query) => {
  if (!query || !query.trim()) return true;
  
  const normalizedText = text.toLowerCase().trim();
  const normalizedQuery = query.toLowerCase().trim();
  
  // Exact match
  if (normalizedText.includes(normalizedQuery)) return true;
  
  // Fuzzy match: check if all characters in query appear in order in text
  let textIndex = 0;
  for (let i = 0; i < normalizedQuery.length; i++) {
    const char = normalizedQuery[i];
    const foundIndex = normalizedText.indexOf(char, textIndex);
    if (foundIndex === -1) return false;
    textIndex = foundIndex + 1;
  }
  return true;
};

// Parse event notes to extract information
const parseEventNotes = (notes) => {
  return notes
    .filter(note => {
      if (!note.content) return false;
      const lines = note.content.split('\n');
      const tagsLine = lines.find(line => line.startsWith('event_tags:'));
      if (!tagsLine) return false;
      const tags = tagsLine.replace('event_tags:', '').trim().toLowerCase();
      return tags.includes('life_info');
    })
    .map(note => {
      const lines = note.content.split('\n');
      
      // Extract event description (title)
      const descriptionLine = lines.find(line => line.startsWith('event_description:'));
      const title = descriptionLine ? descriptionLine.replace('event_description:', '').trim() : 'Untitled';
      
      // Extract event notes (content) - handle multi-line content
      const notesLineIndex = lines.findIndex(line => line.startsWith('event_notes:'));
      let content = '';
      if (notesLineIndex !== -1) {
        const notesParts = [];
        // Get the content after 'event_notes:' on the first line
        const firstLine = lines[notesLineIndex];
        const firstLineContent = firstLine.replace('event_notes:', '').trim();
        if (firstLineContent) {
          notesParts.push(firstLineContent);
        }
        
        // Collect subsequent lines until we hit another field
        for (let i = notesLineIndex + 1; i < lines.length; i++) {
          const line = lines[i];
          // Stop if we hit another field (event_* or meta::)
          if (line.startsWith('event_') || line.startsWith('meta::')) {
            break;
          }
          // Add the line to notes (even if it's empty, preserve structure)
          notesParts.push(line);
        }
        
        // Join all lines, preserving newlines
        content = notesParts.join('\n');
      }
      
      // Extract event date
      const dateLine = lines.find(line => line.startsWith('event_date:'));
      const date = dateLine ? dateLine.replace('event_date:', '').trim() : '';
      
      return {
        id: note.id,
        title,
        content,
        date,
        fullContent: note.content
      };
    });
};

// Function to render text with clickable URLs
const renderTextWithLinks = (text) => {
  if (!text) return null;
  
  // URL regex pattern - matches http://, https://, www., and common domains
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+[^\s]*)/gi;
  
  const parts = [];
  let lastIndex = 0;
  let match;
  
  // Find all URLs and split text around them
  while ((match = urlRegex.exec(text)) !== null) {
    // Add text before the URL
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.substring(lastIndex, match.index) });
    }
    
    // Add the URL as a link
    let url = match[0];
    // Add https:// if it starts with www.
    if (url.startsWith('www.')) {
      url = 'https://' + url;
    }
    
    parts.push({ type: 'link', url, text: match[0] });
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text after the last URL
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.substring(lastIndex) });
  }
  
  // If no URLs found, return original text
  if (parts.length === 0) {
    return text;
  }
  
  // Render with React elements
  return (
    <>
      {parts.map((part, index) => {
        if (part.type === 'link') {
          return (
            <a
              key={index}
              href={part.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline break-all"
            >
              {part.text}
            </a>
          );
        }
        return <span key={index}>{part.content}</span>;
      })}
    </>
  );
};

export default function InformationPage({ notes = [], setAllNotes, allNotes }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingEvent, setEditingEvent] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [pinnedCards, setPinnedCards] = useState(() => {
    try {
      const stored = localStorage.getItem('pinnedInformationCards');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error loading pinned cards:', error);
      return [];
    }
  });

  // Parse and filter events
  const allEvents = useMemo(() => parseEventNotes(notes), [notes]);

  // Filter events based on fuzzy search
  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return allEvents;
    
    return allEvents.filter(event => {
      const searchableText = `${event.title} ${event.content}`.toLowerCase();
      return fuzzySearch(searchableText, searchQuery);
    });
  }, [allEvents, searchQuery]);

  // Functions to handle pinning/unpinning
  const togglePinCard = (cardId) => {
    setPinnedCards(prev => {
      const isPinned = prev.includes(cardId);
      const newPinned = isPinned 
        ? prev.filter(id => id !== cardId)
        : [...prev, cardId];
      
      try {
        localStorage.setItem('pinnedInformationCards', JSON.stringify(newPinned));
      } catch (error) {
        console.error('Error saving pinned cards:', error);
      }
      
      return newPinned;
    });
  };

  const isCardPinned = (cardId) => pinnedCards.includes(cardId);

  // Separate pinned and unpinned events
  const pinnedEvents = filteredEvents.filter(event => isCardPinned(event.id));
  const unpinnedEvents = filteredEvents.filter(event => !isCardPinned(event.id));

  // Handle edit event
  const handleEditEvent = (event) => {
    const fullNote = notes.find(n => n.id === event.id);
    setEditingEvent(fullNote || null);
    setIsAddModalOpen(false);
  };

  // Handle add event
  const handleAddEvent = () => {
    // Create a dummy note with default date of 1/1/2100
    const defaultDate = '2100-01-01';
    const dummyNote = {
      id: null,
      content: `event_date:${defaultDate}T12:00\nevent_tags:life_info`
    };
    setEditingEvent(dummyNote);
    setIsAddModalOpen(true);
  };

  // Handle save event (for both add and edit)
  const handleSaveEvent = async (content) => {
    try {
      let result;
      if (editingEvent && editingEvent.id) {
        // Update existing event (has an ID)
        await updateNoteById(editingEvent.id, content);
        result = { ...editingEvent, content };
        setAllNotes(allNotes.map(note => note.id === editingEvent.id ? result : note));
      } else {
        // Create new event - ensure life_info tag is included
        // Check if content already has event_tags
        let eventContent = content;
        if (!content.includes('event_tags:')) {
          eventContent += '\nevent_tags:life_info';
        } else {
          // Add life_info to existing tags if not already present
          const lines = content.split('\n');
          const tagLineIndex = lines.findIndex(line => line.startsWith('event_tags:'));
          if (tagLineIndex !== -1) {
            const tagLine = lines[tagLineIndex];
            const tags = tagLine.replace('event_tags:', '').trim();
            if (!tags.toLowerCase().includes('life_info')) {
              lines[tagLineIndex] = `event_tags:${tags},life_info`;
              eventContent = lines.join('\n');
            }
          }
        }
        
        result = await createNote(eventContent);
        setAllNotes([result, ...allNotes]);
      }
      
      setEditingEvent(null);
      setIsAddModalOpen(false);
      return result;
    } catch (error) {
      console.error('Error saving event:', error);
      throw error;
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setEditingEvent(null);
    setIsAddModalOpen(false);
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Information</h1>
        <button
          onClick={handleAddEvent}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Add Event
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search information (fuzzy search)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>
        {searchQuery && (
          <p className="mt-2 text-sm text-gray-600">
            Showing {filteredEvents.length} of {allEvents.length} events
          </p>
        )}
      </div>

      {/* Pinned Cards Section */}
      {pinnedEvents.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-blue-600 flex items-center gap-2">
            <MapPinIcon className="h-5 w-5" />
            Pinned Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {pinnedEvents.map((event) => (
              <div
                key={event.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow flex flex-col border-2 border-blue-200"
              >
                {/* Title with Edit and Pin Icons */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 flex-1">
                    {event.title || 'Untitled'}
                  </h3>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => togglePinCard(event.id)}
                      className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                      title="Unpin"
                    >
                      <MapPinIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleEditEvent(event)}
                      className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Edit Event"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                {/* Content */}
                <div className="flex-1 mb-4 text-gray-700 text-sm overflow-hidden" style={{ maxHeight: '144px', overflowY: 'auto' }}>
                  {event.content ? (
                    <div className="whitespace-pre-wrap break-words">
                      {event.content.split('\n').map((line, lineIndex) => (
                        <div key={lineIndex} className="mb-1">
                          {renderTextWithLinks(line)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-400 italic">No content</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unpinned Cards Section */}
      {unpinnedEvents.length === 0 && pinnedEvents.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          {searchQuery ? 'No events found matching your search.' : 'No information events found. Add one to get started!'}
        </div>
      ) : unpinnedEvents.length > 0 && (
        <div>
          {pinnedEvents.length > 0 && (
            <h2 className="text-xl font-semibold mb-4 text-gray-700">All Information</h2>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {unpinnedEvents.map((event) => (
              <div
                key={event.id}
                className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow flex flex-col"
              >
                {/* Title with Edit and Pin Icons */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 flex-1">
                    {event.title || 'Untitled'}
                  </h3>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => togglePinCard(event.id)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Pin"
                    >
                      <MapPinIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleEditEvent(event)}
                      className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Edit Event"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                {/* Content */}
                <div className="flex-1 mb-4 text-gray-700 text-sm overflow-hidden" style={{ maxHeight: '144px', overflowY: 'auto' }}>
                  {event.content ? (
                    <div className="whitespace-pre-wrap break-words">
                      {event.content.split('\n').map((line, lineIndex) => (
                        <div key={lineIndex} className="mb-1">
                          {renderTextWithLinks(line)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-gray-400 italic">No content</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit/Add Event Modal */}
      {(editingEvent || isAddModalOpen) && (
        <EditEventModal
          isOpen={!!editingEvent || isAddModalOpen}
          note={editingEvent}
          onSave={handleSaveEvent}
          onCancel={handleCancel}
          notes={allNotes}
          prePopulatedTags="life_info"
        />
      )}
    </div>
  );
}

