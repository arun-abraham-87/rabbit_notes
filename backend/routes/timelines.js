const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const moment = require('moment');

const NOTES_DIR = path.join(__dirname, '../notes');

// Helper function to load all notes from files
function loadAllNotes() {
  try {
    if (!fs.existsSync(NOTES_DIR)) {
      console.error(`Notes directory does not exist: ${NOTES_DIR}`);
      return [];
    }
    
    const files = fs.readdirSync(NOTES_DIR)
      .filter(file => file.endsWith('.md') && file !== 'objects.md');
    
    let allNotes = [];
    files.forEach((file) => {
      try {
        const filePath = path.join(NOTES_DIR, file);
        if (fs.lstatSync(filePath).isDirectory()) return;
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const notesInFile = JSON.parse(fileContent);
        if (Array.isArray(notesInFile)) {
          // Normalize note content - handle cases where content might be an object
          const normalizedNotes = notesInFile.map(note => {
            if (note && typeof note.content === 'object' && note.content !== null) {
              // If content is an object, try to extract the string content
              return {
                ...note,
                content: note.content.content || JSON.stringify(note.content) || ''
              };
            }
            return note;
          });
          allNotes = allNotes.concat(normalizedNotes);
        }
      } catch (err) {
        // Only log errors for actual .md files, not .DS_Store or other files
        if (file.endsWith('.md')) {
          console.error(`Failed to process file: ${file}`, err.message);
        }
      }
    });
    return allNotes;
  } catch (error) {
    console.error('Error loading notes:', error);
    return [];
  }
}

// Helper function to get content as string from a note
function getNoteContent(note) {
  if (!note) return '';
  if (typeof note.content === 'string') return note.content;
  if (note.content && typeof note.content === 'object' && note.content.content) {
    return note.content.content;
  }
  return String(note.content || '');
}

// Extract dollar values from text
function extractDollarValues(text) {
  const dollarRegex = /\$[\d,]+(?:\.\d{2})?/g;
  const matches = text.match(dollarRegex);
  if (!matches) return [];
  return matches.map(match => {
    const value = parseFloat(match.replace(/[$,]/g, ''));
    return isNaN(value) ? 0 : value;
  });
}

// Parse timeline data from content (similar to frontend parseTimelineData)
function parseTimelineData(content, allNotes = []) {
  try {
    if (!content || typeof content !== 'string') {
      return {
        timeline: '',
        events: [],
        isClosed: false,
        totalDollarAmount: 0
      };
    }
    
    const lines = content.split('\n');
    const timelineData = {
      timeline: '',
      events: [],
      isClosed: false,
      totalDollarAmount: 0
    };
    
    // Check if timeline is closed
    timelineData.isClosed = lines.some(line => line.trim() === 'Closed');
    
    // Get content lines (non-meta lines, excluding 'Closed')
    const contentLines = lines.filter(line => 
      !line.trim().startsWith('meta::') && line.trim() !== '' && line.trim() !== 'Closed'
    );
    
    // First line is the title
    if (contentLines.length > 0) {
      timelineData.timeline = contentLines[0].trim();
    }
    
    // Parse events from remaining content lines (skip first line which is title)
    contentLines.slice(1).forEach((line, index) => {
      try {
        const trimmedLine = line.trim();
        if (trimmedLine) {
          const eventMatch = trimmedLine.match(/^(.+?)\s*:\s*(.+)$/);
          if (eventMatch) {
            const [, event, rest] = eventMatch;
            
            const dateLinkMatch = rest.match(/^(.+?)\s*:\s*(.+)$/);
            let dateStr, link;
            
            if (dateLinkMatch) {
              dateStr = dateLinkMatch[1].trim();
              link = dateLinkMatch[2].trim();
            } else {
              dateStr = rest.trim();
              link = null;
            }
            
            const dollarValues = extractDollarValues(event);
            const eventDollarAmount = dollarValues.reduce((sum, value) => sum + value, 0);
            
            const dateParts = dateStr.split('/');
            let parsedDate;
            
            if (dateParts.length === 3) {
              const day = parseInt(dateParts[0], 10);
              const month = parseInt(dateParts[1], 10) - 1;
              const year = parseInt(dateParts[2], 10);
              parsedDate = moment([year, month, day]);
            } else {
              parsedDate = moment(dateStr, 'DD/MM/YYYY', true);
              if (!parsedDate.isValid()) {
                parsedDate = moment(dateStr, ['DD-MM-YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'], true);
              }
            }
            
            if (parsedDate.isValid()) {
              timelineData.events.push({
                event: event.trim(),
                date: parsedDate.format('YYYY-MM-DD'),
                dateStr: dateStr.trim(),
                lineIndex: index + 1,
                dollarAmount: eventDollarAmount,
                link: link || null
              });
            } else {
              timelineData.events.push({
                event: trimmedLine,
                date: null,
                dateStr: '',
                lineIndex: index + 1,
                dollarAmount: eventDollarAmount,
                link: null
              });
            }
          } else {
            const dollarValues = extractDollarValues(trimmedLine);
            const eventDollarAmount = dollarValues.reduce((sum, value) => sum + value, 0);
            
            timelineData.events.push({
              event: trimmedLine,
              date: null,
              dateStr: '',
              lineIndex: index + 1,
              dollarAmount: eventDollarAmount,
              link: null
            });
          }
        }
      } catch (err) {
        console.error(`Error parsing event line: ${line}`, err.message);
        // Continue processing other lines
      }
    });
    
    // Process linked events from meta::linked_from_events
    const allLinkedEventIds = new Set();
    
    lines.forEach(line => {
      if (line.trim().startsWith('meta::linked_from_events::')) {
        const eventIdsString = line.replace('meta::linked_from_events::', '').trim();
        const eventIds = eventIdsString.split(',').map(id => id.trim()).filter(id => id);
        eventIds.forEach(id => allLinkedEventIds.add(id));
      }
    });
    
    // Process all linked event IDs
    if (allLinkedEventIds.size > 0 && allNotes && allNotes.length > 0) {
      Array.from(allLinkedEventIds).forEach(eventId => {
        try {
          const linkedEventNote = allNotes.find(note => note && note.id === eventId);
          if (!linkedEventNote || !linkedEventNote.content) return;
          
          const eventLines = linkedEventNote.content.split('\n');
          const descriptionLine = eventLines.find(line => line.startsWith('event_description:'));
          let description = descriptionLine ? descriptionLine.replace('event_description:', '').trim() : '';
          
          const dateLine = eventLines.find(line => line.startsWith('event_date:'));
          const eventDate = dateLine ? dateLine.replace('event_date:', '').trim() : '';
          
          const notesLine = eventLines.find(line => line.startsWith('event_notes:'));
          const eventNotes = notesLine ? notesLine.replace('event_notes:', '').trim() : '';
          
          const priceLine = eventLines.find(line => line.trim().startsWith('event_$:'));
          if (priceLine) {
            const priceValue = priceLine.replace('event_$:', '').trim();
            if (priceValue) {
              description = description ? `${description} $${priceValue}` : `$${priceValue}`;
            }
          }
          
          if (description && eventDate) {
            const parsedEventDate = moment(eventDate);
            if (parsedEventDate.isValid()) {
              const dollarValues = extractDollarValues(description);
              const eventDollarAmount = dollarValues.reduce((sum, value) => sum + value, 0);
              
              timelineData.events.push({
                event: description,
                date: parsedEventDate.format('YYYY-MM-DD'),
                dateStr: parsedEventDate.format('DD/MM/YYYY'),
                lineIndex: -1,
                dollarAmount: eventDollarAmount,
                isLinkedEvent: true,
                linkedEventId: eventId,
                link: null,
                notes: eventNotes || null
              });
            }
          }
        } catch (err) {
          console.error(`Error processing linked event ${eventId}:`, err.message);
          // Continue processing other linked events
        }
      });
    }
    
    // Calculate total dollar amount
    timelineData.totalDollarAmount = timelineData.events.reduce((sum, event) => sum + (event.dollarAmount || 0), 0);
    
    return timelineData;
  } catch (error) {
    console.error('Error in parseTimelineData:', error);
    console.error('Error stack:', error.stack);
    return {
      timeline: '',
      events: [],
      isClosed: false,
      totalDollarAmount: 0
    };
  }
}

// GET /api/timelines/master/events - Get master timeline events for a year
// NOTE: This route must be defined BEFORE /:id route to avoid route conflicts
router.get('/master/events', (req, res) => {
  try {
    const { year } = req.query;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    const allNotes = loadAllNotes();
    
    // Filter notes that contain meta::timeline tag
    const timelineNotes = allNotes.filter(note => 
      note.content && note.content.includes('meta::timeline')
    );
    
    // Collect all events from all timelines for the target year
    const allEvents = [];
    
    timelineNotes.forEach((note) => {
      const content = getNoteContent(note);
      const timelineData = parseTimelineData(content, allNotes);
      const timelineName = timelineData.timeline || 'Untitled Timeline';
      
      timelineData.events.forEach((event) => {
        if (event.date) {
          const eventYear = moment(event.date).year();
          if (eventYear === targetYear) {
            allEvents.push({
              ...event,
              sourceTimelineId: note.id,
              sourceTimelineName: timelineName
            });
          }
        }
      });
    });
    
    // Sort events by date
    allEvents.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return moment(a.date).diff(moment(b.date));
    });
    
    res.json({ events: allEvents, count: allEvents.length, year: targetYear });
  } catch (error) {
    console.error('Error fetching master timeline events:', error);
    res.status(500).json({ error: 'Failed to fetch master timeline events' });
  }
});

// GET /api/timelines - Get all timelines with optional filtering
router.get('/', (req, res) => {
  try {
    console.log('[Timelines API] GET /api/timelines called');
    console.log('[Timelines API] Query params:', req.query);
    console.log('[Timelines API] NOTES_DIR:', NOTES_DIR);
    
    const { status, search, searchTitlesOnly } = req.query;
    const allNotes = loadAllNotes();
    console.log('[Timelines API] Loaded notes count:', allNotes.length);
    
    // Filter notes that contain meta::timeline tag
    let timelineNotes = allNotes.filter(note => {
      if (!note) return false;
      // Handle content that might be an object or not a string
      const content = typeof note.content === 'string' 
        ? note.content 
        : (note.content && typeof note.content === 'object' && note.content.content 
          ? note.content.content 
          : String(note.content || ''));
      return content && content.includes('meta::timeline');
    });
    console.log('[Timelines API] Timeline notes count:', timelineNotes.length);
    
    // Filter by status if provided
    if (status) {
      timelineNotes = timelineNotes.filter(note => {
        try {
          const content = getNoteContent(note);
          const timelineData = parseTimelineData(content, allNotes);
          const isFlagged = content.includes('meta::flagged_timeline');
          
          if (status === 'flagged') {
            return isFlagged;
          } else if (status === 'closed') {
            return timelineData.isClosed && !isFlagged;
          } else if (status === 'open') {
            return !timelineData.isClosed && !isFlagged;
          }
          return true;
        } catch (err) {
          console.error(`Error parsing timeline for note ${note.id}:`, err.message);
          return false;
        }
      });
    }
    
    // Search filtering
    if (search && search.trim()) {
      const query = search.toLowerCase().trim();
      timelineNotes = timelineNotes.filter(note => {
        try {
          const content = getNoteContent(note);
          const timelineData = parseTimelineData(content, allNotes);
          
          // Search in timeline title
          if (timelineData.timeline.toLowerCase().includes(query)) {
            return true;
          }
          
          // If "search only titles" is checked, don't search in events
          if (searchTitlesOnly === 'true') {
            return false;
          }
          
          // Search in events
          const hasMatchingEvent = timelineData.events.some(event => {
            if (event.event && typeof event.event === 'string') {
              return event.event.toLowerCase().includes(query);
            }
            return false;
          });
          
          return hasMatchingEvent;
        } catch (err) {
          console.error(`Error searching timeline for note ${note.id}:`, err.message);
          return false;
        }
      });
    }
    
    // Sort by timeline name
    timelineNotes.sort((a, b) => {
      try {
        const aContent = getNoteContent(a);
        const bContent = getNoteContent(b);
        const aData = parseTimelineData(aContent, allNotes);
        const bData = parseTimelineData(bContent, allNotes);
        const aName = aData.timeline || 'Untitled Timeline';
        const bName = bData.timeline || 'Untitled Timeline';
        return aName.localeCompare(bName);
      } catch (err) {
        console.error('Error sorting timelines:', err.message);
        return 0;
      }
    });
    
    // Return simplified timeline data (without full events)
    const timelines = timelineNotes.map(note => {
      try {
        const content = getNoteContent(note);
        const timelineData = parseTimelineData(content, allNotes);
        return {
          id: note.id,
          timeline: timelineData.timeline,
          isClosed: timelineData.isClosed,
          isFlagged: content.includes('meta::flagged_timeline'),
          isTracked: content.includes('meta::tracked'),
          eventCount: timelineData.events.length,
          totalDollarAmount: timelineData.totalDollarAmount,
          created_datetime: note.created_datetime
        };
      } catch (err) {
        console.error(`Error processing timeline ${note.id}:`, err.message);
        return {
          id: note.id,
          timeline: 'Error parsing timeline',
          isClosed: false,
          isFlagged: false,
          isTracked: false,
          eventCount: 0,
          totalDollarAmount: 0,
          created_datetime: note.created_datetime
        };
      }
    });
    
    console.log('[Timelines API] Final timelines count:', timelines.length);
    res.json({ timelines, count: timelines.length });
  } catch (error) {
    console.error('[Timelines API] Error fetching timelines:', error);
    console.error('[Timelines API] Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to fetch timelines', details: error.message });
  }
});

// GET /api/timelines/:id - Get a specific timeline with full details
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const allNotes = loadAllNotes();
    
    const timelineNote = allNotes.find(note => note && note.id === id);
    if (!timelineNote) {
      return res.status(404).json({ error: 'Timeline not found' });
    }
    
    const content = getNoteContent(timelineNote);
    if (!content || !content.includes('meta::timeline')) {
      return res.status(404).json({ error: 'Note is not a timeline' });
    }
    
    const timelineData = parseTimelineData(content, allNotes);
    
    res.json({
      id: timelineNote.id,
      content: content,
      created_datetime: timelineNote.created_datetime,
      ...timelineData
    });
  } catch (error) {
    console.error('Error fetching timeline:', error);
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
});

// GET /api/timelines/:id/events - Get events for a specific timeline
router.get('/:id/events', (req, res) => {
  try {
    const { id } = req.params;
    const { search } = req.query;
    const allNotes = loadAllNotes();
    
    const timelineNote = allNotes.find(note => note && note.id === id);
    if (!timelineNote) {
      return res.status(404).json({ error: 'Timeline not found' });
    }
    
    const content = getNoteContent(timelineNote);
    const timelineData = parseTimelineData(content, allNotes);
    
    let events = timelineData.events;
    
    // Filter by search if provided
    if (search && search.trim()) {
      const query = search.toLowerCase().trim();
      events = events.filter(event => {
        if (!event.event) return false;
        const eventText = typeof event.event === 'string' ? event.event : String(event.event);
        return eventText.toLowerCase().includes(query);
      });
    }
    
    // Sort events by date
    events.sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return moment(a.date).diff(moment(b.date));
    });
    
    res.json({ events, count: events.length });
  } catch (error) {
    console.error('Error fetching timeline events:', error);
    res.status(500).json({ error: 'Failed to fetch timeline events' });
  }
});

module.exports = router;
