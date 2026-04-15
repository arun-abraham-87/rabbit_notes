import React, { useState, useMemo } from 'react';
import { PencilIcon, PlusIcon, MagnifyingGlassIcon, XMarkIcon, TagIcon, DocumentDuplicateIcon, EyeIcon, EyeSlashIcon, HashtagIcon } from '@heroicons/react/24/outline';
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
        fullContent: note.content,
        tracked: note.content.includes('meta::info_tracked'),
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

  const handleToggleTrack = async (event) => {
    const note = allNotes.find(n => n.id === event.id);
    if (!note) return;
    const isTracked = note.content.includes('meta::info_tracked');
    const updatedContent = isTracked
      ? note.content.split('\n').filter(l => l.trim() !== 'meta::info_tracked').join('\n')
      : note.content.trim() + '\nmeta::info_tracked';
    await updateNoteById(note.id, updatedContent);
    setAllNotes(allNotes.map(n => n.id === note.id ? { ...n, content: updatedContent } : n));
  };

  // Handle cancel
  const handleCancel = () => {
    setEditingEvent(null);
    setIsAddModalOpen(false);
  };


  // Assign consistent colors to tags
  const tagColors = useMemo(() => {
    const palette = [
      { bg: 'bg-indigo-50', border: 'border-indigo-200', accent: 'bg-indigo-500', text: 'text-indigo-700', pill: 'bg-indigo-100 text-indigo-700', hover: 'hover:bg-indigo-100' },
      { bg: 'bg-emerald-50', border: 'border-emerald-200', accent: 'bg-emerald-500', text: 'text-emerald-700', pill: 'bg-emerald-100 text-emerald-700', hover: 'hover:bg-emerald-100' },
      { bg: 'bg-amber-50', border: 'border-amber-200', accent: 'bg-amber-500', text: 'text-amber-700', pill: 'bg-amber-100 text-amber-700', hover: 'hover:bg-amber-100' },
      { bg: 'bg-rose-50', border: 'border-rose-200', accent: 'bg-rose-500', text: 'text-rose-700', pill: 'bg-rose-100 text-rose-700', hover: 'hover:bg-rose-100' },
      { bg: 'bg-cyan-50', border: 'border-cyan-200', accent: 'bg-cyan-500', text: 'text-cyan-700', pill: 'bg-cyan-100 text-cyan-700', hover: 'hover:bg-cyan-100' },
      { bg: 'bg-violet-50', border: 'border-violet-200', accent: 'bg-violet-500', text: 'text-violet-700', pill: 'bg-violet-100 text-violet-700', hover: 'hover:bg-violet-100' },
      { bg: 'bg-orange-50', border: 'border-orange-200', accent: 'bg-orange-500', text: 'text-orange-700', pill: 'bg-orange-100 text-orange-700', hover: 'hover:bg-orange-100' },
      { bg: 'bg-teal-50', border: 'border-teal-200', accent: 'bg-teal-500', text: 'text-teal-700', pill: 'bg-teal-100 text-teal-700', hover: 'hover:bg-teal-100' },
    ];
    const map = {};
    allTags.forEach((tag, i) => {
      map[tag] = palette[i % palette.length];
    });
    map['Untagged'] = { bg: 'bg-gray-50', border: 'border-gray-200', accent: 'bg-gray-400', text: 'text-gray-600', pill: 'bg-gray-100 text-gray-600', hover: 'hover:bg-gray-100' };
    return map;
  }, [allTags]);

  const getTagColor = (tag) => tagColors[tag] || tagColors['Untagged'];

  // Render a single info card
  const renderCard = (event, accentColor) => {
    const isPinned = isCardPinned(event.id);
    const color = accentColor || getTagColor(event.tags?.[0] || 'Untagged');

    return (
      <div
        key={event.id}
        className={`group/card relative bg-white rounded-xl border ${isPinned ? 'border-blue-300 ring-2 ring-blue-100' : 'border-gray-200'} hover:shadow-lg transition-all duration-200 flex flex-col overflow-hidden`}
      >
        {/* Accent bar */}
        <div className={`h-1 ${color.accent} w-full`} />

        <div className="p-5 flex flex-col flex-1">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <h3 className="text-base font-semibold text-gray-900 leading-snug flex-1">
              {event.title || 'Untitled'}
            </h3>
            <div className="flex items-center gap-0.5 flex-shrink-0">
              {/* Pin - always visible */}
              <button
                onClick={() => togglePinCard(event.id)}
                className={`p-1 rounded-md transition-colors ${isPinned
                  ? 'text-blue-600 hover:text-red-500'
                  : 'text-gray-300 hover:text-blue-600'
                }`}
                title={isPinned ? 'Unpin' : 'Pin'}
              >
                <MapPinIcon className="h-4 w-4" />
              </button>
              {/* Track toggle */}
              <button
                onClick={() => handleToggleTrack(event)}
                className={`p-1 rounded-md transition-colors ${
                  event.tracked
                    ? 'text-blue-600 hover:text-red-500'
                    : 'text-gray-300 hover:text-blue-600'
                }`}
                title={event.tracked ? 'Untrack from dashboard' : 'Show on dashboard'}
              >
                {event.tracked ? <EyeIcon className="h-4 w-4" /> : <EyeSlashIcon className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 mb-4 text-gray-600 text-sm leading-relaxed overflow-hidden" style={{ maxHeight: '120px', overflowY: 'auto' }}>
            {event.content ? (
              <div className="whitespace-pre-wrap break-words">
                {event.content.split('\n').map((line, lineIndex) => (
                  <div key={lineIndex} className={line.trim() ? 'mb-0.5' : 'mb-2'}>
                    {renderTextWithLinks(line)}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-300 italic text-xs">No content</div>
            )}
          </div>

          {/* Footer: tags + hover actions */}
          <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1 min-h-[24px] flex-1">
              {event.tags && event.tags.length > 0 && event.tags.map((tag, index) => {
                const tc = getTagColor(tag);
                return (
                  <span
                    key={index}
                    className={`px-2 py-0.5 text-[11px] font-medium ${tc.pill} rounded-full`}
                  >
                    {tag}
                  </span>
                );
              })}
            </div>
            {/* Action buttons - visible on hover */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover/card:opacity-100 transition-opacity flex-shrink-0">
              <button onClick={() => handleEditEvent(event)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-md transition-colors" title="Edit">
                <PencilIcon className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => handleDuplicateEvent(event)} className="p-1.5 text-gray-400 hover:text-green-600 rounded-md transition-colors" title="Duplicate">
                <DocumentDuplicateIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Events to display
  const eventsToShow = groupByTag ? [] : filteredEvents;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-gray-900">Information</h1>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="px-2 py-0.5 bg-gray-100 rounded-full">{allEvents.length} items</span>
                <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full">{allTags.length} tags</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative w-72">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                )}
              </div>
              {/* Group toggle */}
              <button
                onClick={() => setGroupByTag(!groupByTag)}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-colors ${groupByTag
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <HashtagIcon className="h-4 w-4" />
                Groups
              </button>
              {/* Add */}
              <button
                onClick={handleAddEvent}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 shadow-sm transition-colors"
              >
                <PlusIcon className="h-4 w-4" />
                Add
              </button>
            </div>
          </div>
          {searchQuery && (
            <p className="mt-2 text-xs text-gray-500">
              {filteredEvents.length} of {allEvents.length} items
            </p>
          )}
        </div>
      </div>

      <div className="px-8 py-6">
        {/* Grouped by Tag View */}
        {groupByTag && (
          <>
            {groupedEventsByTag && groupedEventsByTag.length > 0 ? (
              <div className="space-y-8">
                {groupedEventsByTag.map((group) => {
                  const color = getTagColor(group.tag);
                  return (
                    <div key={group.tag}>
                      {/* Group header */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-3 h-3 rounded-full ${color.accent}`} />
                        <h2 className={`text-lg font-semibold ${color.text}`}>{group.tag}</h2>
                        <span className="text-xs text-gray-400">{group.events.length}</span>
                        <div className="flex-1 h-px bg-gray-200" />
                      </div>
                      {/* Cards grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {group.events.map((event) => renderCard(event, color))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <TagIcon className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">{searchQuery ? 'No matches found.' : 'No information yet. Click Add to get started.'}</p>
              </div>
            )}
          </>
        )}

        {/* Flat view (ungrouped) */}
        {!groupByTag && (
          <>
            {eventsToShow.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {eventsToShow.map((event) => renderCard(event))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <TagIcon className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">{searchQuery ? 'No matches found.' : 'No information yet. Click Add to get started.'}</p>
              </div>
            )}
          </>
        )}
      </div>

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

    </div>
  );
}

