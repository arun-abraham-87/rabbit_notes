import React, { useState, useEffect } from 'react';
import { XMarkIcon, LinkIcon } from '@heroicons/react/24/outline';
import { updateNoteById, getNoteById } from '../utils/ApiUtils';

const TimelineLinkModal = ({ isOpen, onClose, event, allNotes, onEventUpdated, onTimelineUpdated }) => {
  const [selectedTimeline, setSelectedTimeline] = useState('');
  const [timelines, setTimelines] = useState([]);
  const [isLinking, setIsLinking] = useState(false);

  useEffect(() => {
    if (isOpen && allNotes) {
      // Reset state when modal opens
      setSelectedTimeline('');
      setIsLinking(false);
      
      // Filter notes that contain meta::timeline tag
      const timelineNotes = allNotes.filter(note => 
        note.content && note.content.includes('meta::timeline')
      );
      
      // Extract timeline titles (first line of each note)
      const timelineList = timelineNotes.map(note => {
        const lines = note.content.split('\n');
        const firstLine = lines.find(line => 
          line.trim() && !line.trim().startsWith('meta::') && line.trim() !== 'Closed'
        );
        return {
          id: note.id,
          title: firstLine || 'Untitled Timeline',
          content: note.content
        };
      });
      
      setTimelines(timelineList);
    }
  }, [isOpen, allNotes]);

  const handleLink = async () => {
    if (selectedTimeline && event && !isLinking) {
      setIsLinking(true);
      try {
        // Find the timeline note
        const timelineNote = allNotes.find(note => note.id === selectedTimeline);
        if (!timelineNote) {
          console.error('[TimelineLinkModal] Timeline note not found:', selectedTimeline);
          alert('Timeline note not found. Please try again.');
          setIsLinking(false);
          return;
        }

        // 1. Add meta::linked_to_timeline::<timeline_note_id> to the event note
        const eventNote = allNotes.find(note => note.id === event.id);
        if (!eventNote) {
          console.error('[TimelineLinkModal] Event note not found:', event.id);
          alert('Event note not found. Please try again.');
          setIsLinking(false);
          return;
        }

        // Check if already linked to avoid duplicates
        const existingEventLink = `meta::linked_to_timeline::${selectedTimeline}`;
        if (eventNote.content.includes(existingEventLink)) {
          console.log('[TimelineLinkModal] Event already linked to this timeline');
          onClose();
          setIsLinking(false);
          return;
        }

        // Add the link tag to event note
        const updatedEventContent = eventNote.content.trim() + '\n' + existingEventLink;
        const updatedEventResponse = await updateNoteById(event.id, updatedEventContent);
        
        // Notify parent component that event was updated
        if (onEventUpdated && updatedEventResponse) {
          onEventUpdated(event.id, updatedEventResponse.content || updatedEventContent);
        }

        // 2. Add meta::linked_from_events::<note_id> to the timeline note
        // Each event gets its own separate line
        // IMPORTANT: Fetch the latest timeline note from server to avoid stale data
        // when linking multiple events quickly
        let latestTimelineNote;
        try {
          latestTimelineNote = await getNoteById(selectedTimeline);
          console.log('[TimelineLinkModal] Fetched latest timeline note:', latestTimelineNote.id);
        } catch (fetchError) {
          console.error('[TimelineLinkModal] Error fetching latest timeline note:', fetchError);
          // Fall back to using the note from allNotes prop if fetch fails
          console.warn('[TimelineLinkModal] Falling back to timeline note from allNotes prop');
          latestTimelineNote = timelineNote;
        }
        
        const latestTimelineContent = latestTimelineNote?.content || timelineNote.content;
        
        console.log('[TimelineLinkModal] Using latest timeline content (length):', latestTimelineContent.length);
        
        let updatedTimelineContent;
        const lines = latestTimelineContent.split('\n');
        
        // Process all lines: split comma-separated linked_from_events lines and collect unique event IDs
        const otherLines = [];
        const allLinkedEventIds = new Set();
        
        lines.forEach((line) => {
          if (line.trim().startsWith('meta::linked_from_events::')) {
            // Split comma-separated event IDs (for backward compatibility)
            const eventIdsString = line.replace('meta::linked_from_events::', '').trim();
            const eventIds = eventIdsString.split(',').map(id => id.trim()).filter(id => id);
            eventIds.forEach(id => allLinkedEventIds.add(id));
          } else {
            // Keep non-linked_from_events lines as-is
            otherLines.push(line);
          }
        });
        
        console.log('[TimelineLinkModal] Currently linked event IDs:', Array.from(allLinkedEventIds));
        console.log('[TimelineLinkModal] Adding event ID:', event.id);
        
        // Check if this event is already linked
        if (allLinkedEventIds.has(event.id)) {
          console.log('[TimelineLinkModal] Event already linked to this timeline');
          onClose();
          setIsLinking(false);
          return;
        }
        
        // Add the new event ID
        allLinkedEventIds.add(event.id);
        
        // Build the updated content with each event ID on its own line
        updatedTimelineContent = otherLines.join('\n').trim();
        if (allLinkedEventIds.size > 0) {
          const linkedEventLines = Array.from(allLinkedEventIds).map(eventId => 
            `meta::linked_from_events::${eventId}`
          );
          updatedTimelineContent = updatedTimelineContent + '\n' + linkedEventLines.join('\n');
        }

        const updatedTimelineResponse = await updateNoteById(selectedTimeline, updatedTimelineContent);
        console.log('[TimelineLinkModal] Timeline updated with', allLinkedEventIds.size, 'linked events');
        
        // Notify parent component that timeline was updated
        if (onTimelineUpdated && updatedTimelineResponse) {
          onTimelineUpdated(selectedTimeline, updatedTimelineResponse.content || updatedTimelineContent);
        }

        console.log('Successfully linked event to timeline');
        onClose();
      } catch (error) {
        console.error('[TimelineLinkModal] Error linking event to timeline:', error);
        console.error('[TimelineLinkModal] Error details:', {
          message: error.message,
          stack: error.stack,
          eventId: event?.id,
          timelineId: selectedTimeline
        });
        alert(`Failed to link event to timeline: ${error.message || 'Unknown error'}. Please check the console for details.`);
      } finally {
        setIsLinking(false);
      }
    }
  };

  const handleCancel = () => {
    setSelectedTimeline('');
    setIsLinking(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Link to Timeline</h3>
          <button
            onClick={handleCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event
            </label>
            <div className="p-3 bg-gray-50 rounded-md border">
              <p className="text-sm text-gray-900 font-medium">{event?.description}</p>
              <p className="text-xs text-gray-500 mt-1">
                {event?.dateTime ? new Date(event.dateTime).toLocaleDateString() : 'No date'}
              </p>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Timeline
            </label>
            <select
              value={selectedTimeline}
              onChange={(e) => setSelectedTimeline(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Choose a timeline...</option>
              {timelines.map(timeline => (
                <option key={timeline.id} value={timeline.id}>
                  {timeline.title}
                </option>
              ))}
            </select>
          </div>
          
          {timelines.length === 0 && (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500">
                No timelines found. Create a timeline by adding <code className="bg-gray-200 px-1 rounded">meta::timeline</code> to a note.
              </p>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            onClick={handleLink}
            disabled={!selectedTimeline || isLinking}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <LinkIcon className="h-4 w-4" />
            {isLinking ? 'Linking...' : 'Link'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimelineLinkModal;
