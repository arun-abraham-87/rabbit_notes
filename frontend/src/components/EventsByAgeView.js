import React, { useState } from 'react';
import { getDateInDDMMYYYYFormatWithAgeInParentheses } from '../utils/DateUtils';
import { updateNoteById, getNoteById } from '../utils/ApiUtils';
import { 
  PencilIcon,
  EyeIcon,
  EyeSlashIcon,
  FlagIcon,
  CodeBracketIcon,
  XMarkIcon,
  LinkIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/solid';
import TimelineLinkModal from './TimelineLinkModal';

const EventsByAgeView = ({ events, onEventUpdated, onDelete, notes, onEdit, onTimelineUpdated }) => {
  const [rawNote, setRawNote] = useState(null);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [selectedEventForTimeline, setSelectedEventForTimeline] = useState(null);
  const [expandedYears, setExpandedYears] = useState(new Set()); // By default, all years are collapsed
  const [showUnlinkConfirmation, setShowUnlinkConfirmation] = useState(false);
  const [unlinkEventId, setUnlinkEventId] = useState(null);
  const [unlinkTimelineId, setUnlinkTimelineId] = useState(null);
  const [unlinkTimelineTitle, setUnlinkTimelineTitle] = useState('');

  // Helper function to get timeline info from event content
  const getTimelineInfo = (eventContent) => {
    const lines = eventContent.split('\n');
    const timelineLinkLine = lines.find(line => line.trim().startsWith('meta::linked_to_timeline::'));
    
    if (timelineLinkLine) {
      const timelineId = timelineLinkLine.replace('meta::linked_to_timeline::', '').trim();
      const timelineNote = notes.find(note => note.id === timelineId);
      
      if (timelineNote) {
        // Extract timeline title (first non-meta line)
        const timelineLines = timelineNote.content.split('\n');
        const firstLine = timelineLines.find(line => 
          line.trim() && !line.trim().startsWith('meta::') && line.trim() !== 'Closed'
        );
        return {
          id: timelineId,
          title: firstLine || 'Untitled Timeline'
        };
      }
    }
    return null;
  };

  // Function to calculate age in years, months, and days
  const calculateAge = (date) => {
    const today = new Date();
    const birthDate = new Date(date);
    
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    let days = today.getDate() - birthDate.getDate();

    // Adjust for negative days
    if (days < 0) {
      months--;
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, birthDate.getDate());
      days = Math.floor((today - lastMonth) / (1000 * 60 * 60 * 24));
    }

    // Adjust for negative months
    if (months < 0) {
      years--;
      months += 12;
    }

    const parts = [];
    if (years > 0) parts.push(`${years} year${years !== 1 ? 's' : ''}`);
    if (months > 0) parts.push(`${months} month${months !== 1 ? 's' : ''}`);
    if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);

    return parts.join(', ');
  };

  // Function to extract event details from note content
  const getEventDetails = (content) => {
    const lines = content.split('\n');
    
    // Find the description
    const descriptionLine = lines.find(line => line.startsWith('event_description:'));
    const description = descriptionLine ? descriptionLine.replace('event_description:', '').trim() : '';
    
    // Find the event date
    const eventDateLine = lines.find(line => line.startsWith('event_date:'));
    const dateTime = eventDateLine ? eventDateLine.replace('event_date:', '').trim() : '';
    
    // Find recurring info
    const recurringLine = lines.find(line => line.startsWith('event_recurring_type:'));
    const recurrence = recurringLine ? recurringLine.replace('event_recurring_type:', '').trim() : 'none';
    
    // Find meta information
    const metaLine = lines.find(line => line.startsWith('meta::event::'));
    const metaDate = metaLine ? metaLine.replace('meta::event::', '').trim() : '';

    // Find tags
    const tagsLine = lines.find(line => line.startsWith('event_tags:'));
    const tags = tagsLine ? tagsLine.replace('event_tags:', '').trim().split(',').map(tag => tag.trim()) : [];

    return {
      description,
      dateTime,
      recurrence,
      metaDate,
      tags
    };
  };

  // Process and group events by year
  const processedEvents = events.map(event => {
    const details = getEventDetails(event.content);
    const age = calculateAge(details.dateTime);
    const ageInDays = Math.floor((new Date() - new Date(details.dateTime)) / (1000 * 60 * 60 * 24));
    const eventYear = details.dateTime ? new Date(details.dateTime).getFullYear() : null;
    
    return {
      ...event,
      ...details,
      age,
      ageInDays,
      eventYear
    };
  }).sort((a, b) => b.ageInDays - a.ageInDays);

  // Group events by year
  const eventsByYear = processedEvents.reduce((acc, event) => {
    const year = event.eventYear || 'Unknown';
    if (!acc[year]) {
      acc[year] = [];
    }
    acc[year].push(event);
    return acc;
  }, {});

  // Sort years in descending order (most recent first)
  const sortedYears = Object.keys(eventsByYear).sort((a, b) => {
    if (a === 'Unknown') return 1;
    if (b === 'Unknown') return -1;
    return parseInt(b) - parseInt(a);
  });

  const handleToggleDeadline = async (event) => {
    const hasDeadline = event.content.includes('meta::event_deadline');
    let updatedContent;
    
    if (hasDeadline) {
      updatedContent = event.content.replace('\nmeta::event_deadline', '');
    } else {
      updatedContent = event.content.trim() + '\nmeta::event_deadline';
    }
    
    onEventUpdated(event.id, updatedContent);
  };

  const handleToggleHidden = async (event) => {
    const isHidden = event.content.includes('meta::event_hidden');
    const updatedContent = isHidden
      ? event.content.replace('\nmeta::event_hidden', '')
      : event.content.trim() + '\nmeta::event_hidden';
    
    await onEventUpdated(event.id, updatedContent);
  };

  const handleOpenTimelineModal = (event) => {
    setSelectedEventForTimeline(event);
    setShowTimelineModal(true);
  };

  const handleCloseTimelineModal = () => {
    setShowTimelineModal(false);
    setSelectedEventForTimeline(null);
  };

  // Handler to unlink event from timeline
  const handleUnlinkFromTimeline = async (eventId, timelineId) => {
    try {
      // Find the event note
      const eventNote = notes.find(note => note.id === eventId);
      if (!eventNote) {
        console.error('[EventsByAgeView] Event note not found:', eventId);
        alert('Event note not found. Please try again.');
        return;
      }

      // 1. Remove meta::linked_to_timeline::<timelineId> from the event note
      const eventLines = eventNote.content.split('\n');
      const filteredEventLines = eventLines.filter(line => 
        !line.trim().startsWith(`meta::linked_to_timeline::${timelineId}`)
      );
      const updatedEventContent = filteredEventLines.join('\n').trim();
      
      const updatedEventResponse = await updateNoteById(eventId, updatedEventContent);
      
      // Notify parent component that event was updated
      if (onEventUpdated && updatedEventResponse) {
        onEventUpdated(eventId, updatedEventResponse.content || updatedEventContent);
      }

      // 2. Remove meta::linked_from_events::<eventId> from the timeline note
      let latestTimelineNote;
      try {
        latestTimelineNote = await getNoteById(timelineId);
        console.log('[EventsByAgeView] Fetched latest timeline note:', latestTimelineNote.id);
      } catch (fetchError) {
        console.error('[EventsByAgeView] Error fetching latest timeline note:', fetchError);
        const timelineNote = notes.find(note => note.id === timelineId);
        if (!timelineNote) {
          console.error('[EventsByAgeView] Timeline note not found:', timelineId);
          alert('Timeline note not found. Please try again.');
          return;
        }
        latestTimelineNote = timelineNote;
      }

      const timelineLines = latestTimelineNote.content.split('\n');
      const filteredTimelineLines = timelineLines.filter(line => 
        !line.trim().startsWith(`meta::linked_from_events::${eventId}`)
      );
      const updatedTimelineContent = filteredTimelineLines.join('\n').trim();
      const updatedTimelineResponse = await updateNoteById(timelineId, updatedTimelineContent);

      console.log('[EventsByAgeView] Successfully unlinked event from timeline');
      
      // Notify parent component that timeline was updated
      if (onTimelineUpdated && updatedTimelineResponse) {
        onTimelineUpdated(timelineId, updatedTimelineResponse.content || updatedTimelineContent);
      }

      setShowUnlinkConfirmation(false);
      setUnlinkEventId(null);
      setUnlinkTimelineId(null);
      setUnlinkTimelineTitle('');
    } catch (error) {
      console.error('[EventsByAgeView] Error unlinking event from timeline:', error);
      alert(`Failed to unlink event from timeline: ${error.message || 'Unknown error'}. Please check the console for details.`);
    }
  };

  // Handler to initiate unlink (opens confirmation modal)
  const handleInitiateUnlink = (eventId, timelineId, timelineTitle) => {
    setUnlinkEventId(eventId);
    setUnlinkTimelineId(timelineId);
    setUnlinkTimelineTitle(timelineTitle);
    setShowUnlinkConfirmation(true);
  };

  const toggleYear = (year) => {
    setExpandedYears(prev => {
      const newSet = new Set(prev);
      if (newSet.has(year)) {
        newSet.delete(year);
      } else {
        newSet.add(year);
      }
      return newSet;
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Events by Age</h2>
        <div className="space-y-8">
          {sortedYears.map((year) => {
            const isExpanded = expandedYears.has(year);
            return (
              <div key={year} className="space-y-4">
                <button
                  onClick={() => toggleYear(year)}
                  className="w-full flex items-center justify-between text-left text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2 hover:text-gray-900 transition-colors"
                >
                  <span>{year}</span>
                  <span className="text-sm text-gray-500 font-normal">
                    ({eventsByYear[year].length} event{eventsByYear[year].length !== 1 ? 's' : ''})
                  </span>
                  {isExpanded ? (
                    <ChevronUpIcon className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                  )}
                </button>
                {isExpanded && (
                  <div className="space-y-4">
                    {eventsByYear[year].map((event) => (
                      <div
                        key={event.id}
                        className="p-4 rounded-lg border bg-white hover:bg-gray-50 transition-all duration-200"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <h3 className="text-lg font-medium text-gray-900">
                                {event.content.includes('meta::event_hidden') ? (
                                  <div className="flex items-center gap-2">
                                    <span>XXXXXXXXXXXX</span>
                                    <button
                                      onClick={() => handleToggleHidden(event)}
                                      className="text-xs text-indigo-600 hover:text-indigo-700 underline"
                                    >
                                      Reveal
                                    </button>
                                  </div>
                                ) : (
                                  event.description
                                )}
                              </h3>
                              {event.content.includes('meta::event_deadline') && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Deadline
                                </span>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-[120px_1fr] gap-x-2 text-sm">
                              <p className="text-gray-600">
                                <span className="font-medium">Age:</span>
                              </p>
                              <p className="text-gray-900">
                                {event.age}
                              </p>
                              
                              <p className="text-gray-600">
                                <span className="font-medium">Original date:</span>
                              </p>
                              <p className="text-gray-600">
                                {new Date(event.dateTime).toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </p>

                              {event.recurrence !== 'none' && (
                                <>
                                  <p className="text-gray-600">
                                    <span className="font-medium">Recurrence:</span>
                                  </p>
                                  <p className="text-gray-600">
                                    {event.recurrence.charAt(0).toUpperCase() + event.recurrence.slice(1)}
                                  </p>
                                </>
                              )}
                            </div>

                            {event.tags && event.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {event.tags.map(tag => (
                                  <span
                                    key={tag}
                                    className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Timeline Info */}
                            {(() => {
                              const timelineInfo = getTimelineInfo(event.content);
                              return timelineInfo && (
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 border border-indigo-200">
                                    <LinkIcon className="h-3 w-3" />
                                    <span>Timeline: {timelineInfo.title}</span>
                                    <button
                                      onClick={() => handleInitiateUnlink(event.id, timelineInfo.id, timelineInfo.title)}
                                      className="ml-1 hover:bg-red-200 rounded-full p-0.5 transition-colors flex items-center justify-center"
                                      title="Unlink from timeline"
                                    >
                                      <XMarkIcon className="h-3 w-3 text-gray-600 hover:text-red-600" />
                                    </button>
                                  </span>
                                </div>
                              );
                            })()}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onEdit && onEdit(event)}
                              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Edit event"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleToggleHidden(event)}
                              className={`p-2 rounded-lg transition-colors ${
                                event.content.includes('meta::event_hidden')
                                  ? 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                              }`}
                              title={event.content.includes('meta::event_hidden') ? "Show event" : "Hide event"}
                            >
                              {event.content.includes('meta::event_hidden') ? (
                                <EyeSlashIcon className="h-5 w-5" />
                              ) : (
                                <EyeIcon className="h-5 w-5" />
                              )}
                            </button>
                            <button
                              onClick={() => handleToggleDeadline(event)}
                              className={`p-2 rounded-lg transition-colors ${
                                event.content.includes('meta::event_deadline')
                                  ? 'text-red-500 hover:text-red-600 hover:bg-red-50'
                                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                              }`}
                              title={event.content.includes('meta::event_deadline') ? "Remove deadline" : "Mark as deadline"}
                            >
                              <FlagIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => setRawNote(event)}
                              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                              title="View raw note"
                            >
                              <CodeBracketIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleOpenTimelineModal(event)}
                              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Link to timeline"
                            >
                              <LinkIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Raw Note Modal */}
      {rawNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Raw Note Content</h2>
              <button
                onClick={() => setRawNote(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <pre className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded-lg">
              {rawNote.content}
            </pre>
          </div>
        </div>
      )}
      {/* Timeline Link Modal */}
      <TimelineLinkModal
        isOpen={showTimelineModal}
        onClose={handleCloseTimelineModal}
        event={selectedEventForTimeline}
        allNotes={notes}
        onTimelineUpdated={onTimelineUpdated}
      />

      {/* Unlink Confirmation Modal */}
      {showUnlinkConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Unlink from Timeline</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to unlink this event from "{unlinkTimelineTitle}"? This will remove the link from both the event and the timeline.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowUnlinkConfirmation(false);
                  setUnlinkEventId(null);
                  setUnlinkTimelineId(null);
                  setUnlinkTimelineTitle('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (unlinkEventId && unlinkTimelineId) {
                    handleUnlinkFromTimeline(unlinkEventId, unlinkTimelineId);
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Unlink
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsByAgeView; 