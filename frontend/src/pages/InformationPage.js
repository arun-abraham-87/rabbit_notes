import React, { useState, useMemo } from 'react';
import { PencilIcon, PlusIcon, MagnifyingGlassIcon, XMarkIcon, TagIcon, DocumentDuplicateIcon } from '@heroicons/react/24/outline';
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

      // Extract event_info_tags
      const tagsLine = lines.find(line => line.startsWith('event_info_tags:'));
      const tags = tagsLine ? tagsLine.replace('event_info_tags:', '').trim() : '';
      const tagsArray = tags ? tags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

      return {
        id: note.id,
        title,
        content,
        date,
        tags: tagsArray,
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
  const [editingTags, setEditingTags] = useState({ eventId: null, tags: '' });
  const [groupByTag, setGroupByTag] = useState(true);
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

  // Group events by tags
  const groupedEventsByTag = useMemo(() => {
    if (!groupByTag) return null;

    const groups = {};
    const untagged = [];

    filteredEvents.forEach(event => {
      if (event.tags && event.tags.length > 0) {
        event.tags.forEach(tag => {
          if (!groups[tag]) {
            groups[tag] = [];
          }
          // Only add event once per tag group (avoid duplicates)
          if (!groups[tag].find(e => e.id === event.id)) {
            groups[tag].push(event);
          }
        });
      } else {
        untagged.push(event);
      }
    });

    // Sort groups by tag name
    const sortedGroups = Object.keys(groups)
      .sort()
      .map(tag => ({ tag, events: groups[tag] }));

    // Add untagged group at the end if it has events
    if (untagged.length > 0) {
      sortedGroups.push({ tag: 'Untagged', events: untagged });
    }

    return sortedGroups;
  }, [filteredEvents, groupByTag]);

  // Get all unique tags from all events
  const allTags = useMemo(() => {
    const tagSet = new Set();
    allEvents.forEach(event => {
      if (event.tags && event.tags.length > 0) {
        event.tags.forEach(tag => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).sort();
  }, [allEvents]);

  // Handle adding a tag to an event
  const handleAddTagToEvent = async (eventId, tagToAdd) => {
    try {
      const eventNote = notes.find(n => n.id === eventId);
      if (!eventNote) {
        alert('Event not found');
        return;
      }

      const lines = eventNote.content.split('\n');
      const tagsLineIndex = lines.findIndex(line => line.startsWith('event_info_tags:'));

      let updatedContent;
      if (tagsLineIndex !== -1) {
        // Update existing tags line
        const tagLine = lines[tagsLineIndex];
        const existingTags = tagLine.replace('event_info_tags:', '').trim();
        const tagsArray = existingTags ? existingTags.split(',').map(tag => tag.trim()).filter(tag => tag) : [];

        // Add new tag if not already present
        if (!tagsArray.includes(tagToAdd)) {
          tagsArray.push(tagToAdd);
          lines[tagsLineIndex] = `event_info_tags:${tagsArray.join(',')}`;
        }
        updatedContent = lines.join('\n');
      } else {
        // Add new tags line
        updatedContent = eventNote.content.trim() + '\nevent_info_tags:' + tagToAdd;
      }

      // Update the note
      await updateNoteById(eventId, updatedContent);

      // Update the notes array
      const updatedNote = { ...eventNote, content: updatedContent };
      setAllNotes(allNotes.map(note => note.id === eventId ? updatedNote : note));
    } catch (error) {
      console.error('Error adding tag to event:', error);
      alert('Failed to add tag. Please try again.');
    }
  };

  // Separate pinned and unpinned events (only when not grouping by tag)
  const pinnedEvents = groupByTag ? [] : filteredEvents.filter(event => isCardPinned(event.id));
  const unpinnedEvents = groupByTag ? [] : filteredEvents.filter(event => !isCardPinned(event.id));

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

  // Handle duplicate event
  const handleDuplicateEvent = async (event) => {
    try {
      const fullNote = notes.find(n => n.id === event.id);
      if (!fullNote) {
        alert('Original note not found');
        return;
      }

      const result = await createNote(fullNote.content);
      setAllNotes([result, ...allNotes]);
    } catch (error) {
      console.error('Error duplicating event:', error);
      alert('Failed to duplicate event. Please try again.');
    }
  };

  // Handle delete event
  const handleDeleteEvent = (eventId) => {
    setAllNotes(allNotes.filter(note => note.id !== eventId));
  };

  // Handle cancel
  const handleCancel = () => {
    setEditingEvent(null);
    setIsAddModalOpen(false);
  };

  // Handle open tag editor
  const handleOpenTagEditor = (event) => {
    const currentTags = event.tags ? event.tags.join(', ') : '';
    setEditingTags({ eventId: event.id, tags: currentTags });
  };

  // Handle save tags
  const handleSaveTags = async () => {
    if (!editingTags.eventId) return;

    try {
      const eventNote = notes.find(n => n.id === editingTags.eventId);
      if (!eventNote) {
        alert('Event not found');
        return;
      }

      const lines = eventNote.content.split('\n');
      const tagsLineIndex = lines.findIndex(line => line.startsWith('event_info_tags:'));

      // Clean and format tags (remove empty tags, trim spaces)
      const tagsArray = editingTags.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag);
      const tagsString = tagsArray.join(',');

      let updatedContent;
      if (tagsLineIndex !== -1) {
        // Update existing tags line
        if (tagsString) {
          lines[tagsLineIndex] = `event_info_tags:${tagsString}`;
        } else {
          // Remove tags line if empty
          lines.splice(tagsLineIndex, 1);
        }
        updatedContent = lines.join('\n');
      } else {
        // Add new tags line
        if (tagsString) {
          updatedContent = eventNote.content.trim() + '\nevent_info_tags:' + tagsString;
        } else {
          updatedContent = eventNote.content;
        }
      }

      // Update the note
      await updateNoteById(editingTags.eventId, updatedContent);

      // Update the notes array
      const updatedNote = { ...eventNote, content: updatedContent };
      setAllNotes(allNotes.map(note => note.id === editingTags.eventId ? updatedNote : note));

      // Close tag editor
      setEditingTags({ eventId: null, tags: '' });
    } catch (error) {
      console.error('Error saving tags:', error);
      alert('Failed to save tags. Please try again.');
    }
  };

  // Handle cancel tag editing
  const handleCancelTagEditing = () => {
    setEditingTags({ eventId: null, tags: '' });
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
          Add Information
        </button>
      </div>

      {/* Search Bar and Filters */}
      <div className="mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative max-w-md flex-1 min-w-[200px]">
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
          <button
            onClick={() => setGroupByTag(!groupByTag)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${groupByTag
              ? 'bg-purple-600 text-white hover:bg-purple-700'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            title="Group events by tags"
          >
            <TagIcon className="h-5 w-5" />
            <span className="text-sm font-medium">Group by Tag</span>
          </button>
        </div>
        {searchQuery && (
          <p className="mt-2 text-sm text-gray-600">
            Showing {filteredEvents.length} of {allEvents.length} events
          </p>
        )}
      </div>

      {/* Grouped by Tag Section */}
      {groupByTag && (
        <>
          {groupedEventsByTag && groupedEventsByTag.length > 0 ? (
            <div className="mb-8">
              {groupedEventsByTag.map((group) => (
                <div key={group.tag} className="mb-8">
                  <h2 className="text-xl font-semibold mb-4 text-purple-600 flex items-center gap-2">
                    <TagIcon className="h-5 w-5" />
                    {group.tag} ({group.events.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {group.events.map((event) => (
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
                              className={`p-1.5 rounded transition-colors ${isCardPinned(event.id)
                                ? 'text-blue-600 hover:text-blue-800 hover:bg-blue-50'
                                : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                                }`}
                              title={isCardPinned(event.id) ? 'Unpin' : 'Pin'}
                            >
                              <MapPinIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDuplicateEvent(event)}
                              className="p-1.5 text-green-500 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                              title="Duplicate Event"
                            >
                              <DocumentDuplicateIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleOpenTagEditor(event)}
                              className="p-1.5 text-purple-500 hover:text-purple-700 hover:bg-purple-50 rounded transition-colors"
                              title="Edit Tags"
                            >
                              <TagIcon className="h-4 w-4" />
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

                        {/* Tags Footer */}
                        <div className="mt-auto pt-3 border-t border-gray-200">
                          {event.tags && event.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {event.tags.map((tag, index) => (
                                <button
                                  key={index}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenTagEditor(event);
                                  }}
                                  className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 hover:text-purple-800 transition-colors cursor-pointer"
                                  title="Click to edit tags"
                                >
                                  {tag}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              {searchQuery ? 'No events found matching your search.' : 'No information events found. Add one to get started!'}
            </div>
          )}
        </>
      )}

      {/* Pinned Cards Section */}
      {!groupByTag && pinnedEvents.length > 0 && (
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
                      onClick={() => handleDuplicateEvent(event)}
                      className="p-1.5 text-green-500 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                      title="Duplicate Event"
                    >
                      <DocumentDuplicateIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleOpenTagEditor(event)}
                      className="p-1.5 text-purple-500 hover:text-purple-700 hover:bg-purple-50 rounded transition-colors"
                      title="Edit Tags"
                    >
                      <TagIcon className="h-4 w-4" />
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

                {/* Tags Footer */}
                <div className="mt-auto pt-3 border-t border-gray-200">
                  {event.tags && event.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {event.tags.map((tag, index) => (
                        <button
                          key={index}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenTagEditor(event);
                          }}
                          className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 hover:text-purple-800 transition-colors cursor-pointer"
                          title="Click to edit tags"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unpinned Cards Section */}
      {!groupByTag && (
        <>
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
                          onClick={() => handleDuplicateEvent(event)}
                          className="p-1.5 text-green-500 hover:text-green-700 hover:bg-green-50 rounded transition-colors"
                          title="Duplicate Event"
                        >
                          <DocumentDuplicateIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleOpenTagEditor(event)}
                          className="p-1.5 text-purple-500 hover:text-purple-700 hover:bg-purple-50 rounded transition-colors"
                          title="Edit Tags"
                        >
                          <TagIcon className="h-4 w-4" />
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

                    {/* Tags Footer */}
                    <div className="mt-auto pt-3 border-t border-gray-200">
                      {event.tags && event.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {event.tags.map((tag, index) => (
                            <button
                              key={index}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenTagEditor(event);
                              }}
                              className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 hover:text-purple-800 transition-colors cursor-pointer"
                              title="Click to edit tags"
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
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
          isInformationPage={true}
          onDelete={handleDeleteEvent}
        />
      )}

      {/* Tag Editing Modal */}
      {editingTags.eventId && (() => {
        // Get current event to check existing tags
        const currentEvent = allEvents.find(e => e.id === editingTags.eventId);
        const currentTagsArray = editingTags.tags
          ? editingTags.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
          : [];

        // Get tags from other cards (exclude current card's tags)
        const otherTags = allTags.filter(tag => !currentTagsArray.includes(tag));

        // Function to add tag to current tags
        const handleAddTag = (tagToAdd) => {
          if (!currentTagsArray.includes(tagToAdd)) {
            const updatedTags = currentTagsArray.length > 0
              ? [...currentTagsArray, tagToAdd].join(', ')
              : tagToAdd;
            setEditingTags({ ...editingTags, tags: updatedTags });
          }
        };

        // Function to remove tag from current tags
        const handleRemoveTag = (tagToRemove) => {
          const updatedTagsArray = currentTagsArray.filter(tag => tag !== tagToRemove);
          const updatedTags = updatedTagsArray.join(', ');
          setEditingTags({ ...editingTags, tags: updatedTags });
        };

        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Edit Tags</h3>
                <button
                  onClick={handleCancelTagEditing}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={editingTags.tags}
                  onChange={(e) => setEditingTags({ ...editingTags, tags: e.target.value })}
                  placeholder="e.g., tag1, tag2, tag3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-400"
                  autoFocus
                />
                <p className="mt-2 text-xs text-gray-500">
                  Enter tags separated by commas. Tags will be saved as <code className="bg-gray-100 px-1 rounded">event_info_tags:tag1,tag2,tag3</code>
                </p>
              </div>

              {/* Current Tags */}
              {currentTagsArray.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Tags
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {currentTagsArray.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium bg-purple-100 text-purple-700 rounded-full"
                      >
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 text-purple-700 hover:text-red-600 hover:bg-purple-200 rounded-full p-0.5 transition-colors"
                          title={`Remove "${tag}"`}
                        >
                          <XMarkIcon className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags from Other Cards */}
              {otherTags.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags from Other Cards (click to add)
                  </label>
                  <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 border border-gray-200 rounded-lg bg-gray-50">
                    {otherTags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => handleAddTag(tag)}
                        className="px-3 py-1 text-sm font-medium bg-white text-gray-700 border border-gray-300 rounded-full hover:bg-purple-50 hover:border-purple-400 hover:text-purple-700 transition-colors cursor-pointer"
                        title={`Click to add "${tag}"`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={handleCancelTagEditing}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTags}
                  className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  Save Tags
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

