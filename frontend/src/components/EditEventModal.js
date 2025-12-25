import React, { useState, useEffect, useRef } from 'react';
import { getAllUniqueTags } from '../utils/EventUtils';
import { deleteNoteById, updateNoteById, getNoteById } from '../utils/ApiUtils';
import ConfirmationModal from './ConfirmationModal';

// Module-level refs that persist across component unmounts/remounts
// This ensures timeline data persists when modal closes and reopens
const persistentTimelinesRef = { current: [] };
const persistentTimelineLinkQueues = { current: new Map() };

const EditEventModal = ({ isOpen, note, onSave, onCancel, onSwitchToNormalEdit, onDelete, notes, isAddDeadline = false, prePopulatedTags = '', onTimelineUpdated, initialTimelineId = null, focusOnNotesField = false, isInformationPage = false }) => {
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

  // Use module-level refs that persist across component lifecycle
  const timelineLinkQueues = persistentTimelineLinkQueues;
  const timelinesRef = persistentTimelinesRef;

  // Ref for the notes textarea to enable auto-focus
  const notesTextareaRef = useRef(null);

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
      // For Information page, set default date to 1/1/2100
      if (isInformationPage) {
        setEventDate('2100-01-01');
        setValidationErrors({ description: true, eventDate: false });
      } else {
        // Show validation errors for empty required fields on new event
        setValidationErrors({ description: true, eventDate: true });
      }
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

    // Parse notes - handle multi-line content
    const notesLineIndex = lines.findIndex(line => line.startsWith('event_notes:'));
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
      setEventNotes(notesParts.join('\n'));
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
  }, [note, isInformationPage]);

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

      // CRITICAL: Only sync ref if it's empty or if the modal just opened
      // Don't overwrite ref if it already has newer data from previous operations
      // Check if ref is empty or if this is a fresh initialization
      if (timelinesRef.current.length === 0 || !timelinesRef.current.some(t => t.id === timelineList[0]?.id)) {
        timelinesRef.current = timelineList;
        console.log('[EditEventModal] Initial timelines loaded and synced to ref:', timelineList.length);
      } else {
        // Ref already has data - merge new timelines with existing ref data
        // Preserve ref content for timelines that exist in both, use new content for new timelines
        console.log('[EditEventModal] Ref already has data, merging with prop data...');
        console.log('[EditEventModal] Ref timelines count:', timelinesRef.current.length);
        console.log('[EditEventModal] Prop timelines count:', timelineList.length);

        const mergedTimelines = timelineList.map(newTimeline => {
          const existingInRef = timelinesRef.current.find(t => t.id === newTimeline.id);
          if (existingInRef) {
            // Keep existing ref content (which may have been updated by previous operations)
            // Always prefer ref content since it has the latest manual updates
            const refLinkedEvents = (existingInRef.content.match(/meta::linked_from_events::/g) || []).length;
            const newLinkedEvents = (newTimeline.content.match(/meta::linked_from_events::/g) || []).length;

            console.log(`[EditEventModal] Timeline ${newTimeline.id}: ref has ${refLinkedEvents} linked events, prop has ${newLinkedEvents}`);
            console.log(`[EditEventModal] Timeline ${newTimeline.id}: ref content length ${existingInRef.content.length}, prop content length ${newTimeline.content.length}`);

            // Always prefer ref version - it has the latest manual updates
            console.log(`[EditEventModal] Preserving ref version for timeline ${newTimeline.id}`);
            return existingInRef; // Keep ref version which has latest updates
          }
          console.log(`[EditEventModal] New timeline found: ${newTimeline.id}, using prop version`);
          return newTimeline; // New timeline, use it
        });
        timelinesRef.current = mergedTimelines;
        console.log('[EditEventModal] Merged timelines with ref (preserving manual updates):', mergedTimelines.length);
      }

      // Pre-select timeline if initialTimelineId is provided (for adding events from timelines page)
      if (initialTimelineId && !note) {
        setSelectedTimeline(initialTimelineId);
      } else if (!initialTimelineId && !note) {
        // Reset timeline selection if no initial timeline provided (for new events)
        setSelectedTimeline('');
      }
    }
  }, [isOpen, notes, initialTimelineId, note]);

  // Auto-focus on notes field when focusOnNotesField is true
  useEffect(() => {
    if (isOpen && focusOnNotesField && notesTextareaRef.current) {
      // Use setTimeout to ensure the modal is fully rendered before focusing
      setTimeout(() => {
        notesTextareaRef.current?.focus();
        // Scroll to the notes field
        notesTextareaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [isOpen, focusOnNotesField]);

  const formatDateWithNoonTime = (dateStr) => {
    if (!dateStr) return '';
    return `${dateStr}T12:00`;
  };

  // Helper function to link event to timeline with queue-based serialization
  const linkEventToTimeline = async (eventIdToLink, timelineId) => {
    const debugPrefix = `[🔗 LINK QUEUE] [${new Date().toISOString()}]`;
    console.log(`${debugPrefix} ========== START LINK OPERATION ==========`);
    console.log(`${debugPrefix} Event ID: ${eventIdToLink}`);
    console.log(`${debugPrefix} Timeline ID: ${timelineId}`);
    console.log(`${debugPrefix} Current queue state:`, Array.from(timelineLinkQueues.current.keys()));

    if (!eventIdToLink || !timelineId) {
      console.error(`${debugPrefix} ❌ ERROR: Missing eventId or timelineId`, { eventIdToLink, timelineId });
      return;
    }

    // Get or create queue for this timeline
    if (!timelineLinkQueues.current.has(timelineId)) {
      console.log(`${debugPrefix} 📝 Creating new queue for timeline ${timelineId}`);
      timelineLinkQueues.current.set(timelineId, Promise.resolve());
    } else {
      console.log(`${debugPrefix} ⏳ Queue already exists for timeline ${timelineId}`);
    }

    // Queue this operation - wait for previous operations to complete
    const previousOperation = timelineLinkQueues.current.get(timelineId);
    console.log(`${debugPrefix} 🔄 Previous operation exists:`, !!previousOperation);

    const currentOperation = previousOperation.then(async () => {
      console.log(`${debugPrefix} ✅ Previous operation completed, starting link operation for event ${eventIdToLink}`);
      const startTime = Date.now();
      try {
        const result = await performLinkOperation(eventIdToLink, timelineId);
        const duration = Date.now() - startTime;
        console.log(`${debugPrefix} ✅ Link operation completed for event ${eventIdToLink} in ${duration}ms`);
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`${debugPrefix} ❌ Link operation FAILED for event ${eventIdToLink} after ${duration}ms:`, error);
        throw error;
      }
    });

    // Update the queue with the current operation
    timelineLinkQueues.current.set(timelineId, currentOperation);
    console.log(`${debugPrefix} 📝 Updated queue with new operation for timeline ${timelineId}`);

    // Wait for this operation to complete
    console.log(`${debugPrefix} ⏳ Waiting for operation to complete...`);
    try {
      const result = await currentOperation;
      console.log(`${debugPrefix} ✅ Operation completed successfully, returning result`);
      return result;
    } catch (error) {
      console.error(`${debugPrefix} ❌ Operation failed:`, error);
      throw error;
    }
  };

  // Actual linking operation (extracted to be used in queue)
  const performLinkOperation = async (eventIdToLink, timelineId) => {
    const debugPrefix = `[🔗 PERFORM LINK] [${new Date().toISOString()}]`;
    console.log(`${debugPrefix} ========== PERFORMING LINK OPERATION ==========`);
    console.log(`${debugPrefix} Event ID: ${eventIdToLink} (${typeof eventIdToLink})`);
    console.log(`${debugPrefix} Timeline ID: ${timelineId} (${typeof timelineId})`);
    console.log('[EditEventModal] Available timelines:', timelines.map(t => ({ id: t.id, title: t.title })));

    // First, try to find the timeline in the local timelines list
    const localTimeline = timelines.find(t => t.id === timelineId);
    console.log(`${debugPrefix} Local timeline found:`, !!localTimeline);

    let timelineNote = null;

    try {
      console.log(`${debugPrefix} Step 1: Fetching FRESH timeline note from server...`);
      const fetchStartTime = Date.now();

      try {
        timelineNote = await getNoteById(timelineId);
        const fetchDuration = Date.now() - fetchStartTime;
        console.log(`${debugPrefix} ✅ Fetched timeline note in ${fetchDuration}ms`);
        console.log(`${debugPrefix} Timeline note ID: ${timelineNote?.id}`);
        console.log(`${debugPrefix} Timeline note content length: ${timelineNote?.content?.length}`);
        console.log(`${debugPrefix} Timeline note content preview (first 300 chars):`, timelineNote?.content?.substring(0, 300));
        console.log(`${debugPrefix} Timeline note content preview (last 300 chars):`, timelineNote?.content?.substring(Math.max(0, timelineNote?.content?.length - 300)));
      } catch (fetchError) {
        console.warn(`${debugPrefix} ⚠️ Failed to fetch timeline from server, trying latest local copy...`, fetchError);
        // If fetch fails, try to use the LATEST local timeline from state (which may have been updated by previous operations)
        // Use ref to get the latest value since state updates are asynchronous
        // CRITICAL: Read from ref.current directly (not from closure) to get the absolute latest value
        const currentTimelines = timelinesRef.current;
        console.log(`${debugPrefix}   Reading from ref - current ref length: ${currentTimelines.length}`);
        const latestLocalTimeline = currentTimelines.find(t => t.id === timelineId);
        if (latestLocalTimeline && latestLocalTimeline.content) {
          timelineNote = {
            id: latestLocalTimeline.id,
            content: latestLocalTimeline.content
          };
          console.log(`${debugPrefix} Using latest local timeline copy from ref (length: ${timelineNote.content.length})`);
          console.log(`${debugPrefix} Local timeline content preview (last 300 chars):`, timelineNote.content.substring(Math.max(0, timelineNote.content.length - 300)));
        } else {
          console.error(`${debugPrefix} ❌ No local timeline copy available either!`);
          throw fetchError; // Re-throw if we don't have a local copy
        }
      }

      console.log(`${debugPrefix} Step 2: Parsing timeline content...`);
      if (!timelineNote || !timelineNote.content) {
        console.error(`${debugPrefix} ❌ ERROR: Timeline note is null or has no content`, {
          timelineNote,
          hasContent: !!timelineNote?.content,
          contentLength: timelineNote?.content?.length
        });
        throw new Error('Timeline note not found or has no content');
      }

      const lines = timelineNote.content.split('\n');
      console.log(`${debugPrefix} Total lines in timeline: ${lines.length}`);

      const otherLines = [];
      const allLinkedEventIds = new Set();

      // Process existing linked events
      console.log(`${debugPrefix} Step 3: Processing existing linked events...`);
      let linkedEventLineCount = 0;
      lines.forEach((line, index) => {
        if (line.trim().startsWith('meta::linked_from_events::')) {
          linkedEventLineCount++;
          const eventIdsString = line.replace('meta::linked_from_events::', '').trim();
          const eventIds = eventIdsString.split(',').map(id => id.trim()).filter(id => id);
          console.log(`${debugPrefix}   Found linked event line ${linkedEventLineCount} at index ${index}: "${line}"`);
          console.log(`${debugPrefix}   Parsed event IDs from this line:`, eventIds);
          eventIds.forEach(id => {
            allLinkedEventIds.add(id);
            console.log(`${debugPrefix}   ➕ Added existing event ID to set: ${id}`);
          });
        } else {
          otherLines.push(line);
        }
      });

      console.log(`${debugPrefix} Step 4: Summary of existing linked events:`);
      console.log(`${debugPrefix}   Total linked event lines found: ${linkedEventLineCount}`);
      console.log(`${debugPrefix}   Total unique event IDs in set: ${allLinkedEventIds.size}`);
      console.log(`${debugPrefix}   Existing event IDs:`, Array.from(allLinkedEventIds));
      console.log(`${debugPrefix}   Event ID to add: ${eventIdToLink} (${typeof eventIdToLink})`);

      // Convert eventId to string for comparison
      const eventIdStr = String(eventIdToLink);
      console.log(`${debugPrefix}   Event ID as string: "${eventIdStr}"`);

      // Check if event is already linked
      const alreadyLinked = Array.from(allLinkedEventIds).some(id => String(id) === eventIdStr);
      console.log(`${debugPrefix}   Event already linked? ${alreadyLinked}`);

      if (!alreadyLinked) {
        console.log(`${debugPrefix} Step 5: Adding new event ID to set...`);
        allLinkedEventIds.add(eventIdStr);
        console.log(`${debugPrefix}   ➕ Added event ID ${eventIdStr} to set`);
        console.log(`${debugPrefix}   Updated linked event IDs (${allLinkedEventIds.size} total):`, Array.from(allLinkedEventIds));

        // Build updated content with each event on its own line
        console.log(`${debugPrefix} Step 6: Building updated timeline content...`);
        let updatedTimelineContent = otherLines.join('\n').trim();
        console.log(`${debugPrefix}   Base content length: ${updatedTimelineContent.length}`);

        if (allLinkedEventIds.size > 0) {
          const linkedEventLines = Array.from(allLinkedEventIds).map(eId =>
            `meta::linked_from_events::${eId}`
          );
          console.log(`${debugPrefix}   Linked event lines to add (${linkedEventLines.length} lines):`, linkedEventLines);
          updatedTimelineContent = updatedTimelineContent + '\n' + linkedEventLines.join('\n');
          console.log(`${debugPrefix}   Updated content length: ${updatedTimelineContent.length}`);
          console.log(`${debugPrefix}   Updated content preview (last 500 chars):`, updatedTimelineContent.substring(Math.max(0, updatedTimelineContent.length - 500)));
        }

        console.log(`${debugPrefix} Step 7: Calling updateNoteById...`);
        const updateStartTime = Date.now();
        const updateResult = await updateNoteById(timelineId, updatedTimelineContent);
        const updateDuration = Date.now() - updateStartTime;
        console.log(`${debugPrefix} ✅ updateNoteById completed in ${updateDuration}ms`);
        console.log(`${debugPrefix}   Update result ID: ${updateResult?.id}`);
        console.log(`${debugPrefix}   Update result content length: ${updateResult?.content?.length}`);
        console.log(`${debugPrefix}   Update result content preview (last 500 chars):`, updateResult?.content?.substring(Math.max(0, updateResult.content.length - 500)));

        // Verify the update actually contains our event ID
        const verifyEventIdPresent = updateResult?.content?.includes(eventIdStr);
        console.log(`${debugPrefix}   ✅ VERIFICATION: Event ID ${eventIdStr} present in updated content? ${verifyEventIdPresent}`);
        if (!verifyEventIdPresent) {
          console.error(`${debugPrefix} ❌ CRITICAL ERROR: Event ID ${eventIdStr} is NOT in the updated content!`);
          console.error(`${debugPrefix}   Expected to find: ${eventIdStr}`);
          console.error(`${debugPrefix}   Content last 500 chars:`, updateResult?.content?.substring(Math.max(0, updateResult.content.length - 500)));
        }

        // CRITICAL: Update ref IMMEDIATELY after API update completes (before any other operations)
        // This ensures the next queued operation will see the latest data
        // IMPORTANT: Use the updateResult content directly - don't read from ref to avoid stale data
        console.log(`${debugPrefix} Step 7a: Updating ref IMMEDIATELY after API update...`);
        const finalContent = updateResult?.content || updatedTimelineContent;

        // Update ref by finding the timeline and updating its content directly
        // We MUST read from ref.current at THIS moment to get the absolute latest value
        const currentRefTimelines = [...timelinesRef.current]; // Copy array to avoid mutation issues
        console.log(`${debugPrefix}   Current ref has ${currentRefTimelines.length} timelines`);
        const timelineIndex = currentRefTimelines.findIndex(t => t.id === timelineId);

        if (timelineIndex !== -1) {
          console.log(`${debugPrefix}   🔄 Updating timeline ${timelineId} in ref`);
          console.log(`${debugPrefix}   Old content length: ${currentRefTimelines[timelineIndex].content?.length || 0}`);
          console.log(`${debugPrefix}   New content length: ${finalContent.length}`);
          currentRefTimelines[timelineIndex] = {
            ...currentRefTimelines[timelineIndex],
            content: finalContent
          };
          // Update ref with new array (ensures React sees the change)
          timelinesRef.current = currentRefTimelines;
          console.log(`${debugPrefix}   ✅ Ref updated immediately with content length ${finalContent.length}`);
        } else {
          console.error(`${debugPrefix}   ❌ ERROR: Timeline ${timelineId} not found in ref!`);
        }

        // Notify parent component that timeline was updated
        if (onTimelineUpdated) {
          console.log(`${debugPrefix} Step 8: Calling onTimelineUpdated callback...`);
          onTimelineUpdated(timelineId, finalContent);
          console.log(`${debugPrefix} ✅ onTimelineUpdated callback completed`);
        } else {
          console.log(`${debugPrefix} ⚠️ No onTimelineUpdated callback provided`);
        }

        // Update state (ref already updated, so this is just for UI)
        setTimelines(currentRefTimelines);
        console.log(`${debugPrefix} Step 9: State update queued (ref already updated)`);

        console.log(`${debugPrefix} ✅ Timeline updated successfully for event ${eventIdToLink}`);
      } else {
        console.log(`${debugPrefix} ⏭️ Event ${eventIdToLink} already linked to timeline, skipping update`);
      }
    } catch (error) {
      console.error(`${debugPrefix} ❌ ERROR in performLinkOperation:`, error);
      console.error(`${debugPrefix}   Error message:`, error.message);
      console.error(`${debugPrefix}   Error stack:`, error.stack);
      console.error(`${debugPrefix}   Event ID: ${eventIdToLink}`);
      console.error(`${debugPrefix}   Timeline ID: ${timelineId}`);
      console.error(`${debugPrefix}   Local timeline exists: ${!!localTimeline}`);
      alert(`Warning: Could not link event to timeline. The timeline may have been deleted. Error: ${error.message}`);
      throw error; // Re-throw so the queue knows the operation failed
    }

    console.log(`${debugPrefix} ========== LINK OPERATION COMPLETE ==========`);
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
    // For Information page, add meta::info:: tag
    if (isInformationPage) {
      content += `\nmeta::info::`;
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
      const submitDebugPrefix = `[📝 HANDLE SUBMIT] [${new Date().toISOString()}]`;
      console.log(`${submitDebugPrefix} ========== TIMELINE LINKING FROM handleSubmit ==========`);
      console.log(`${submitDebugPrefix} Selected timeline: ${selectedTimeline}`);
      console.log(`${submitDebugPrefix} Event ID: ${eventId} (${typeof eventId})`);
      console.log(`${submitDebugPrefix} Saved event:`, savedEvent);
      console.log(`${submitDebugPrefix} Note ID: ${note?.id}`);

      if (!eventId) {
        console.error(`${submitDebugPrefix} ❌ ERROR: eventId is missing, will retry...`);
        console.error(`${submitDebugPrefix}   Saved event:`, savedEvent);
        console.error(`${submitDebugPrefix}   Note:`, note);
        // Wait a bit and try again in case the ID hasn't propagated yet
        setTimeout(async () => {
          const retryEventId = savedEvent?.id;
          console.log(`${submitDebugPrefix} 🔄 Retry attempt - Event ID: ${retryEventId}`);
          if (retryEventId) {
            console.log(`${submitDebugPrefix} ✅ Retrying timeline link with extracted eventId: ${retryEventId}`);
            await linkEventToTimeline(retryEventId, selectedTimeline);
          } else {
            console.error(`${submitDebugPrefix} ❌ Could not extract eventId even after retry`, savedEvent);
          }
        }, 100);
      } else {
        console.log(`${submitDebugPrefix} ✅ Event ID available, calling linkEventToTimeline immediately...`);
        console.log(`${submitDebugPrefix}   Event ID: ${eventId}`);
        console.log(`${submitDebugPrefix}   Timeline ID: ${selectedTimeline}`);
        try {
          await linkEventToTimeline(eventId, selectedTimeline);
          console.log(`${submitDebugPrefix} ✅ linkEventToTimeline completed successfully`);
        } catch (error) {
          console.error(`${submitDebugPrefix} ❌ linkEventToTimeline failed:`, error);
        }
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
  const handleNormalEditSave = async () => {
    if (normalEditContent.trim()) {
      try {
        await onSave(normalEditContent.trim());
        setNormalEditMode(false);
        setNormalEditContent('');
      } catch (error) {
        console.error('[EditEventModal] Error saving in normal edit mode:', error);
        // Don't close the modal if save fails
        alert(`Failed to save changes: ${error.message}`);
      }
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
                {normalEditMode ? 'Normal Edit Mode' : (note?.id ? (isInformationPage ? 'Edit Information' : 'Edit Event') : (isInformationPage ? 'Add Information' : 'Add Event'))}
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
                  {!(isInformationPage) && (
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
                  )}

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
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${validationErrors.description
                        ? 'border-red-500 focus:ring-red-500'
                        : 'border-gray-300 focus:ring-blue-500'
                        }`}
                      placeholder={isInformationPage ? "Description..." : "Event description..."}
                      autoFocus
                    />
                    {validationErrors.description && (
                      <p className="mt-1 text-sm text-red-600">Description is required</p>
                    )}
                  </div>

                  {!(isInformationPage) && (
                    <>
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
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-sm font-medium text-gray-700">
                            Event Date
                          </label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const today = new Date();
                                const formattedDate = today.toISOString().split('T')[0];
                                setEventDate(formattedDate);
                                if (validationErrors.eventDate) {
                                  setValidationErrors(prev => ({ ...prev, eventDate: false }));
                                }
                              }}
                              className="px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded hover:bg-blue-100 border border-blue-200 transition-colors"
                              title="Set to today's date"
                            >
                              Today
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const yesterday = new Date();
                                yesterday.setDate(yesterday.getDate() - 1);
                                const formattedDate = yesterday.toISOString().split('T')[0];
                                setEventDate(formattedDate);
                                if (validationErrors.eventDate) {
                                  setValidationErrors(prev => ({ ...prev, eventDate: false }));
                                }
                              }}
                              className="px-2 py-1 text-xs font-medium bg-gray-50 text-gray-700 rounded hover:bg-gray-100 border border-gray-200 transition-colors"
                              title="Set to yesterday's date"
                            >
                              Yesterday
                            </button>
                          </div>
                        </div>
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
                          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${validationErrors.eventDate
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
                    </>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes (optional)
                    </label>
                    <textarea
                      ref={notesTextareaRef}
                      value={eventNotes}
                      onChange={(e) => setEventNotes(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Add any additional notes..."
                      rows="3"
                    />
                  </div>

                  {!(isInformationPage) && (
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
                  )}
                </div>

                <div className="mt-6 flex justify-between">
                  {note?.id && (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100"
                    >
                      {isInformationPage ? 'Delete Information' : 'Delete Event'}
                    </button>
                  )}
                  {!note && <div></div>}
                  <div className="flex space-x-3">
                    <button
                      onClick={handleSubmit}
                      disabled={!description.trim() || !eventDate}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {note?.id ? 'Save Changes' : (isInformationPage ? 'Add Information' : 'Add Event')}
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