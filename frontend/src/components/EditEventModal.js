import React, { useState, useEffect } from 'react';
import { getAllUniqueTags } from '../utils/EventUtils';
import { deleteNoteById, updateNoteById, getNoteById } from '../utils/ApiUtils';
import ConfirmationModal from './ConfirmationModal';

const EditEventModal = ({ isOpen, note, onSave, onCancel, onSwitchToNormalEdit, onDelete, notes, isAddDeadline = false, prePopulatedTags = '', onTimelineUpdated }) => {
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [showEndDate, setShowEndDate] = useState(false);
  const [tags, setTags] = useState(prePopulatedTags);
  const [tagInput, setTagInput] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [eventNotes, setEventNotes] = useState('');
  const [isDeadline, setIsDeadline] = useState(isAddDeadline);
  const [price, setPrice] = useState('');
  const [normalEditMode, setNormalEditMode] = useState(false);
  const [normalEditContent, setNormalEditContent] = useState('');
  const [selectedTimeline, setSelectedTimeline] = useState('');
  const [timelines, setTimelines] = useState([]);
  const [validationErrors, setValidationErrors] = useState({ description: false, eventDate: false });

  const existingTags = getAllUniqueTags(notes || []);

  useEffect(() => {
    if (!note || !note.content) {
      // If no note is provided (new event), set deadline based on isAddDeadline prop
      setIsDeadline(isAddDeadline);
      // Set pre-populated tags for new events
      setTags(prePopulatedTags);
      // Reset normal edit mode
      setNormalEditMode(false);
      setNormalEditContent('');
      // Show validation errors for empty required fields on new event
      setValidationErrors({ description: true, eventDate: true });
      return;
    }
    
    // Reset normal edit mode when note changes
    setNormalEditMode(false);
    setNormalEditContent('');
    setValidationErrors({ description: false, eventDate: false });
    
    const lines = note.content.split('\n');

    // Find the description
    const descriptionLine = lines.find(line => line.startsWith('event_description:'));
    if (descriptionLine) {
      setDescription(descriptionLine.replace('event_description:', '').trim());
    }

    // Find the event date
    const eventDateLine = lines.find(line => line.startsWith('event_date:'));
    if (eventDateLine) {
      const dateStr = eventDateLine.replace('event_date:', '').trim();
      setEventDate(dateStr.split('T')[0]);
    }

    // Find end date if exists
    const endDateLine = lines.find(line => line.startsWith('event_end_date:'));
    if (endDateLine) {
      const dateStr = endDateLine.replace('event_end_date:', '').trim();
      setEndDate(dateStr.split('T')[0]);
    }

    // Parse location
    const locationLine = lines.find(line => line.startsWith('event_location:'));
    if (locationLine) {
      setLocation(locationLine.replace('event_location:', '').trim());
    }

    // Parse tags
    const tagsLine = lines.find(line => line.startsWith('event_tags:'));
    if (tagsLine) {
      setTags(tagsLine.replace('event_tags:', '').trim());
    }

    // Parse notes
    const notesLine = lines.find(line => line.startsWith('event_notes:'));
    if (notesLine) {
      setEventNotes(notesLine.replace('event_notes:', '').trim());
    }

    // Parse deadline status
    const isDeadlineLine = lines.find(line => line.startsWith('meta::event_deadline:'));
    if (isDeadlineLine) {
      setIsDeadline(isDeadlineLine.includes('true'));
    }

    // Parse price if exists
    const priceLine = lines.find(line => line.startsWith('event_$:'));
    if (priceLine) {
      setPrice(priceLine.replace('event_$:', '').trim());
    }

    // Parse timeline link if exists
    const timelineLinkLine = lines.find(line => line.startsWith('meta::linked_to_timeline::'));
    if (timelineLinkLine) {
      const timelineId = timelineLinkLine.replace('meta::linked_to_timeline::', '').trim();
      setSelectedTimeline(timelineId);
    }

    // Set validation errors based on loaded data
    const parsedDescription = descriptionLine ? descriptionLine.replace('event_description:', '').trim() : '';
    const parsedEventDate = eventDateLine ? eventDateLine.replace('event_date:', '').trim() : '';
    setValidationErrors({
      description: !parsedDescription,
      eventDate: !parsedEventDate
    });
  }, [note]);

  // Load timelines when modal opens
  useEffect(() => {
    if (isOpen && notes) {
      // Filter notes that contain meta::timeline tag
      const timelineNotes = notes.filter(note => 
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
  }, [isOpen, notes]);

  const formatDateWithNoonTime = (dateStr) => {
    if (!dateStr) return '';
    return `${dateStr}T12:00`;
  };

  // Helper function to link event to timeline
  const linkEventToTimeline = async (eventIdToLink, timelineId) => {
    console.log('[EditEventModal] linkEventToTimeline called:', { eventIdToLink, timelineId });
    console.log('[EditEventModal] Available timelines:', timelines.map(t => ({ id: t.id, title: t.title })));
    
    if (!eventIdToLink || !timelineId) {
      console.error('[EditEventModal] Cannot link: missing eventId or timelineId', { eventIdToLink, timelineId });
      return;
    }
    
    // First, try to find the timeline in the local timelines list
    const localTimeline = timelines.find(t => t.id === timelineId);
    console.log('[EditEventModal] Found timeline in local list?', !!localTimeline);
    
    let timelineNote = null;
    
    try {
      console.log('[EditEventModal] Step 1: Linking event to timeline:', { eventIdToLink, timelineId });
      console.log('[EditEventModal] Step 2: Fetching timeline note from server...');
      
      // Get the latest timeline note from server
      try {
        timelineNote = await getNoteById(timelineId);
        console.log('[EditEventModal] Step 3: Fetched timeline note from server:', timelineNote);
      } catch (fetchError) {
        console.warn('[EditEventModal] Failed to fetch timeline from server, trying local copy:', fetchError);
        // If fetch fails, try to use the local timeline if available
        if (localTimeline && localTimeline.content) {
          timelineNote = {
            id: localTimeline.id,
            content: localTimeline.content
          };
          console.log('[EditEventModal] Using local timeline copy:', timelineNote);
        } else {
          throw fetchError; // Re-throw if we don't have a local copy
        }
      }
      
      console.log('[EditEventModal] Step 3a: Timeline note exists?', !!timelineNote);
      console.log('[EditEventModal] Step 3b: Timeline note has content?', !!timelineNote?.content);
      
      if (timelineNote && timelineNote.content) {
        console.log('[EditEventModal] Step 4: Parsing timeline content...');
        console.log('[EditEventModal] Step 4a: Timeline content length:', timelineNote.content.length);
        console.log('[EditEventModal] Step 4b: Timeline content preview:', timelineNote.content.substring(0, 200));
        
        const lines = timelineNote.content.split('\n');
        console.log('[EditEventModal] Step 5: Split into lines, total lines:', lines.length);
        
        const otherLines = [];
        const allLinkedEventIds = new Set();
        
        // Process existing linked events
        console.log('[EditEventModal] Step 6: Processing existing linked events...');
        lines.forEach((line, index) => {
          if (line.trim().startsWith('meta::linked_from_events::')) {
            console.log('[EditEventModal] Step 6a: Found linked event line at index', index, ':', line);
            const eventIdsString = line.replace('meta::linked_from_events::', '').trim();
            const eventIds = eventIdsString.split(',').map(id => id.trim()).filter(id => id);
            console.log('[EditEventModal] Step 6b: Parsed event IDs from line:', eventIds);
            eventIds.forEach(id => {
              console.log('[EditEventModal] Step 6c: Adding existing event ID to set:', id);
              allLinkedEventIds.add(id);
            });
          } else {
            otherLines.push(line);
          }
        });
        
        console.log('[EditEventModal] Step 7: Existing linked event IDs:', Array.from(allLinkedEventIds));
        console.log('[EditEventModal] Step 8: Event ID to add:', eventIdToLink, 'Type:', typeof eventIdToLink);
        console.log('[EditEventModal] Step 9: Other lines count:', otherLines.length);
        
        // Convert eventId to string for comparison
        const eventIdStr = String(eventIdToLink);
        console.log('[EditEventModal] Step 10: Event ID as string:', eventIdStr);
        
        // Check if event is already linked
        const alreadyLinked = Array.from(allLinkedEventIds).some(id => String(id) === eventIdStr);
        console.log('[EditEventModal] Step 11: Event already linked?', alreadyLinked);
        
        if (!alreadyLinked) {
          console.log('[EditEventModal] Step 12: Adding event ID to set...');
          allLinkedEventIds.add(eventIdStr);
          console.log('[EditEventModal] Step 13: Updated linked event IDs:', Array.from(allLinkedEventIds));
          
          // Build updated content with each event on its own line
          console.log('[EditEventModal] Step 14: Building updated timeline content...');
          let updatedTimelineContent = otherLines.join('\n').trim();
          console.log('[EditEventModal] Step 14a: Base content length:', updatedTimelineContent.length);
          
          if (allLinkedEventIds.size > 0) {
            const linkedEventLines = Array.from(allLinkedEventIds).map(eId => 
              `meta::linked_from_events::${eId}`
            );
            console.log('[EditEventModal] Step 14b: Linked event lines to add:', linkedEventLines);
            updatedTimelineContent = updatedTimelineContent + '\n' + linkedEventLines.join('\n');
            console.log('[EditEventModal] Step 14c: Updated content length:', updatedTimelineContent.length);
            console.log('[EditEventModal] Step 14d: Updated content preview:', updatedTimelineContent.substring(Math.max(0, updatedTimelineContent.length - 200)));
          }
          
          console.log('[EditEventModal] Step 15: Calling updateNoteById...');
          console.log('[EditEventModal] Step 15a: Timeline ID:', timelineId);
          console.log('[EditEventModal] Step 15b: Content length:', updatedTimelineContent.length);
          
          const updateResult = await updateNoteById(timelineId, updatedTimelineContent);
          console.log('[EditEventModal] Step 16: updateNoteById result:', updateResult);
          console.log('[EditEventModal] Step 16a: Update result content preview:', updateResult?.content?.substring(Math.max(0, updateResult.content.length - 200)));
          
          // Notify parent component that timeline was updated
          if (onTimelineUpdated) {
            console.log('[EditEventModal] Step 17: Calling onTimelineUpdated callback...');
            // Use the content from the update result if available, otherwise use the updated content we sent
            const finalContent = updateResult?.content || updatedTimelineContent;
            console.log('[EditEventModal] Step 17a: Final content to pass to callback:', finalContent.substring(Math.max(0, finalContent.length - 200)));
            onTimelineUpdated(timelineId, finalContent);
            console.log('[EditEventModal] Step 17b: onTimelineUpdated callback completed');
          } else {
            console.log('[EditEventModal] Step 17: No onTimelineUpdated callback provided');
          }
          console.log('[EditEventModal] Step 18: Timeline updated successfully');
        } else {
          console.log('[EditEventModal] Step 12: Event already linked to timeline, skipping update');
        }
      } else {
        console.error('[EditEventModal] Step 4: Timeline note not found or has no content', {
          timelineNote,
          hasContent: !!timelineNote?.content,
          contentLength: timelineNote?.content?.length
        });
      }
    } catch (error) {
      console.error('[EditEventModal] Error updating timeline note:', error);
      console.error('[EditEventModal] Error details:', {
        message: error.message,
        stack: error.stack,
        eventIdToLink,
        timelineId,
        localTimelineExists: !!localTimeline
      });
      // Don't fail the save if timeline update fails
      // But log a warning so user knows
      alert(`Warning: Could not link event to timeline. The timeline may have been deleted. Error: ${error.message}`);
    }
  };

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    const newTags = tags ? `${tags},${tagInput.trim()}` : tagInput.trim();
    setTags(newTags);
    setTagInput('');
  };

  const handleAddExistingTag = (tag) => {
    if (!tags) {
      setTags(tag);
    } else if (!tags.split(',').includes(tag)) {
      setTags(`${tags},${tag}`);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async () => {
    // Validate required fields
    const errors = {
      description: !description.trim(),
      eventDate: !eventDate
    };
    setValidationErrors(errors);

    if (errors.description || errors.eventDate) {
      return; // Don't submit if there are validation errors
    }

    if (!description.trim() || !eventDate) return;

    let content = `event_description:${description.trim()}\n`;
    content += `event_date:${formatDateWithNoonTime(eventDate)}`;

    if (endDate) {
      content += `\nevent_end_date:${formatDateWithNoonTime(endDate)}`;
    }
    if (location) {
      content += `\nevent_location:${location}`;
    }
    if (eventNotes) {
      content += `\nevent_notes:${eventNotes}`;
    }

    // Add tags if any (including deadline tag if needed)
    let finalTags = tags || '';
    if (isDeadline && !finalTags.includes('deadline')) {
      finalTags = finalTags ? `${finalTags},deadline` : 'deadline';
    }
    if (finalTags) {
      content += `\nevent_tags:${finalTags}`;
    }

    // Add price if it exists (always, not just for purchases)
    if (price && price.trim()) {
      content += `\nevent_$:${price.trim()}`;
    }

    // Track timeline link changes
    const isNewTimelineLink = selectedTimeline && (!note || !note.content || !note.content.includes(`meta::linked_to_timeline::${selectedTimeline}`));
    const previousTimelineLink = note && note.content 
      ? note.content.split('\n').find(line => line.startsWith('meta::linked_to_timeline::'))
      : null;
    const previousTimelineId = previousTimelineLink ? previousTimelineLink.replace('meta::linked_to_timeline::', '').trim() : null;
    const timelineChanged = selectedTimeline !== previousTimelineId;

    // Add timeline link if selected
    if (selectedTimeline) {
      content += `\nmeta::linked_to_timeline::${selectedTimeline}`;
    }

    // Add meta information as the last lines
    content += `\nmeta::event::${new Date().toISOString()}`;
    if (isDeadline) {
      content += `\nmeta::event_deadline:true`;
    }

    // Save the event and get the result
    const savedEvent = await onSave(content);
    
    // Extract eventId - for new events, savedEvent should be the note object from createNote
    // For existing events, note.id should be available
    let eventId = savedEvent?.id || note?.id;
    
    console.log('[EditEventModal] Event saved:', { 
      savedEvent, 
      savedEventType: typeof savedEvent,
      savedEventKeys: savedEvent ? Object.keys(savedEvent) : [],
      savedEventId: savedEvent?.id,
      noteId: note?.id,
      eventId, 
      selectedTimeline, 
      isNewTimelineLink, 
      timelineChanged 
    });

    // If timeline is selected, update the timeline note (whether new or existing event)
    if (selectedTimeline) {
      if (!eventId) {
        console.error('[EditEventModal] Cannot link to timeline: eventId is missing', { savedEvent, note });
        // Wait a bit and try again in case the ID hasn't propagated yet
        setTimeout(async () => {
          const retryEventId = savedEvent?.id;
          if (retryEventId) {
            console.log('[EditEventModal] Retrying timeline link with extracted eventId:', retryEventId);
            await linkEventToTimeline(retryEventId, selectedTimeline);
          } else {
            console.error('[EditEventModal] Could not extract eventId even after retry', savedEvent);
          }
        }, 100);
      } else {
        console.log('[EditEventModal] Linking event to timeline with eventId:', eventId);
        await linkEventToTimeline(eventId, selectedTimeline);
      }
    } else {
      console.log('[EditEventModal] No timeline selected, skipping timeline link');
    }

    // If timeline link was removed, update the timeline note
    if (previousTimelineId && previousTimelineId !== selectedTimeline && eventId) {
      try {
        const timelineNote = await getNoteById(previousTimelineId);
        if (timelineNote && timelineNote.content) {
          const lines = timelineNote.content.split('\n');
          const otherLines = [];
          const allLinkedEventIds = new Set();
          
          // Process existing linked events
          lines.forEach((line) => {
            if (line.trim().startsWith('meta::linked_from_events::')) {
              const eventIdsString = line.replace('meta::linked_from_events::', '').trim();
              const eventIds = eventIdsString.split(',').map(id => id.trim()).filter(id => id);
              eventIds.forEach(id => allLinkedEventIds.add(id));
            } else {
              otherLines.push(line);
            }
          });
          
          // Remove the event ID
          allLinkedEventIds.delete(eventId);
          
          // Build updated content
          let updatedTimelineContent = otherLines.join('\n').trim();
          if (allLinkedEventIds.size > 0) {
            const linkedEventLines = Array.from(allLinkedEventIds).map(eId => 
              `meta::linked_from_events::${eId}`
            );
            updatedTimelineContent = updatedTimelineContent + '\n' + linkedEventLines.join('\n');
          }
          
          await updateNoteById(previousTimelineId, updatedTimelineContent);
          
          // Notify parent component that timeline was updated
          if (onTimelineUpdated) {
            const updatedTimeline = await getNoteById(previousTimelineId);
            onTimelineUpdated(previousTimelineId, updatedTimeline.content || updatedTimelineContent);
          }
        }
      } catch (error) {
        console.error('[EditEventModal] Error removing event from timeline:', error);
        // Don't fail the save if timeline update fails
      }
    }

    // Reset form
    setDescription('');
    setEventDate('');
    setEndDate('');
    setLocation('');
    setShowEndDate(false);
    setTags('');
    setTagInput('');
    setEventNotes('');
    setIsDeadline(false);
    setPrice('');
    setSelectedTimeline('');
    setNormalEditMode(false);
    setNormalEditContent('');
    setValidationErrors({ description: false, eventDate: false });
  };

  const handleDelete = async () => {
    if (!note || !onDelete) {
      console.error('[EditEventModal] Cannot delete: note or onDelete missing', { note: !!note, onDelete: !!onDelete });
      return;
    }
    
    const eventId = note.id;
    console.log('[EditEventModal] Deleting event with ID:', eventId, 'Type:', typeof eventId);
    
    try {
      // Call the backend API to delete the note
      await deleteNoteById(eventId);
      console.log('[EditEventModal] Delete successful from backend');
    } catch (error) {
      console.error('[EditEventModal] Error deleting from backend:', error);
      // If it's a 404, the note might already be deleted - continue anyway
      if (error.message && !error.message.includes('404')) {
        // Only stop if it's not a 404 (already deleted)
        return;
      }
      console.log('[EditEventModal] Continuing with state update despite backend error');
    }
    
    // Always update state, even if backend delete failed (note might already be deleted)
    console.log('[EditEventModal] Updating state via onDelete callback');
    if (onDelete && typeof onDelete === 'function') {
      try {
        console.log('[EditEventModal] Calling onDelete with eventId:', eventId);
        onDelete(eventId);
        console.log('[EditEventModal] onDelete callback completed');
      } catch (callbackError) {
        console.error('[EditEventModal] Error in onDelete callback:', callbackError);
      }
    } else {
      console.error('[EditEventModal] onDelete is not a function:', typeof onDelete, onDelete);
    }
    
    setShowDeleteConfirm(false);
    onCancel();
  };

  // Close modal when clicking outside
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  // Update end date min value when start date changes
  const handleDateChange = (e) => {
    setEventDate(e.target.value);
    if (new Date(endDate) <= new Date(e.target.value)) {
      setEndDate(e.target.value);
    }
  };

  // Handle cancel button click
  const handleCancel = () => {
    // Reset form state
    setDescription('');
    setEventDate('');
    setEndDate('');
    setLocation('');
    setShowEndDate(false);
    setTags('');
    setTagInput('');
    setEventNotes('');
    setIsDeadline(false);
    setPrice('');
    setSelectedTimeline('');
    setNormalEditMode(false);
    setNormalEditContent('');
    setValidationErrors({ description: false, eventDate: false });

    // Call the onCancel prop
    if (typeof onCancel === 'function') {
      onCancel();
    }
  };

  // Handle switching to normal edit mode
  const handleSwitchToNormalEdit = () => {
    if (note && note.content) {
      setNormalEditContent(note.content);
      setNormalEditMode(true);
    } else if (onSwitchToNormalEdit) {
      // Fallback to navigation if no note content
      onSwitchToNormalEdit();
    }
  };

  // Handle saving in normal edit mode
  const handleNormalEditSave = () => {
    if (normalEditContent.trim()) {
      onSave(normalEditContent.trim());
      setNormalEditMode(false);
      setNormalEditContent('');
    }
  };

  // Handle canceling normal edit mode
  const handleNormalEditCancel = () => {
    setNormalEditMode(false);
    setNormalEditContent('');
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleBackdropClick}
        >
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {normalEditMode ? 'Normal Edit Mode' : (note ? 'Edit Event' : 'Add Event')}
              </h2>
              {!normalEditMode && (
                <button
                  onClick={handleSwitchToNormalEdit}
                  className="text-sm text-gray-600 hover:text-gray-800 underline"
                >
                  Switch to Normal Edit
                </button>
              )}
            </div>

            {normalEditMode ? (
              // Normal edit mode: show textarea with full content
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Content
                  </label>
                  <textarea
                    value={normalEditContent}
                    onChange={(e) => setNormalEditContent(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder="Edit event content..."
                    rows="15"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={handleNormalEditCancel}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleNormalEditSave}
                    disabled={!normalEditContent.trim()}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              // Form edit mode: show structured form
              <>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isDeadline"
                  checked={isDeadline}
                  onChange={(e) => setIsDeadline(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="isDeadline" className="text-sm text-gray-600">
                  Mark as deadline
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (validationErrors.description && e.target.value.trim()) {
                      setValidationErrors(prev => ({ ...prev, description: false }));
                    }
                  }}
                  onBlur={() => {
                    if (!description.trim()) {
                      setValidationErrors(prev => ({ ...prev, description: true }));
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                    validationErrors.description 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  placeholder="Event description..."
                  autoFocus
                />
                {validationErrors.description && (
                  <p className="mt-1 text-sm text-red-600">Description is required</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location (optional)
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Event location..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Date
                </label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => {
                    handleDateChange(e);
                    if (validationErrors.eventDate && e.target.value) {
                      setValidationErrors(prev => ({ ...prev, eventDate: false }));
                    }
                  }}
                  onBlur={() => {
                    if (!eventDate) {
                      setValidationErrors(prev => ({ ...prev, eventDate: true }));
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                    validationErrors.eventDate 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                />
                {validationErrors.eventDate && (
                  <p className="mt-1 text-sm text-red-600">Event date is required</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date (optional)
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={eventDate}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price ($) (optional)
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter price..."
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link to Timeline (optional)
                </label>
                <select
                  value={selectedTimeline}
                  onChange={(e) => setSelectedTimeline(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No timeline</option>
                  {timelines.map(timeline => (
                    <option key={timeline.id} value={timeline.id}>
                      {timeline.title}
                    </option>
                  ))}
                </select>
                {timelines.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    No timelines found. Create a timeline by adding <code className="bg-gray-200 px-1 rounded">meta::timeline</code> to a note.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={eventNotes}
                  onChange={(e) => setEventNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add any additional notes..."
                  rows="3"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                </label>
                {existingTags.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs text-gray-500 mb-1">Existing tags:</p>
                    <div className="flex flex-wrap gap-1">
                      {existingTags.map((tag, index) => (
                        <button
                          key={index}
                          onClick={() => handleAddExistingTag(tag)}
                          className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Add tags (press Enter)"
                  />
                  <button
                    onClick={handleAddTag}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Add
                  </button>
                </div>
                {tags && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {tags.split(',').map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                      >
                        {tag}
                        <button
                          onClick={() => {
                            const updatedTags = tags.split(',')
                              .filter((_, i) => i !== index)
                              .join(',');
                            setTags(updatedTags);
                          }}
                          className="ml-1 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              {note && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100"
                >
                  Delete Event
                </button>
              )}
              {!note && <div></div>}
              <div className="flex space-x-3">
                <button
                  onClick={handleSubmit}
                  disabled={!description.trim() || !eventDate}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {note ? 'Save Changes' : 'Add Event'}
                </button>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
              </>
            )}
          </div>

          <ConfirmationModal
            isOpen={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            onConfirm={handleDelete}
          />
        </div>
      )}
    </>
  );
};

export default EditEventModal; 