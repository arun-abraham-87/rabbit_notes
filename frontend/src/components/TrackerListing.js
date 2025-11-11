import React, { useState, useEffect } from 'react';
import { loadNotes, updateNoteById, deleteNoteById } from '../utils/ApiUtils';
import { useNavigate } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  ExclamationCircleIcon,
  CalendarIcon,
  ClockIcon,
  PlusIcon,
  PencilIcon,
  DocumentTextIcon,
  EyeIcon,
  ChartBarIcon,
  TrashIcon
} from '@heroicons/react/24/solid';
import AddTracker from './AddTracker';
import { getAgeInStringFmt } from '../utils/DateUtils';
import { Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import TrackerGrid from './TrackerGrid';
import { createTrackerAnswerNote } from '../utils/TrackerQuestionUtils';
import { toast } from 'react-hot-toast';
import moment from 'moment';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const TrackerListing = () => {
  const navigate = useNavigate();
  const [trackers, setTrackers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Load search term from localStorage on mount
  const [searchTerm, setSearchTerm] = useState(() => {
    const savedSearchTerm = localStorage.getItem('trackerPageSearchTerm');
    return savedSearchTerm || '';
  });
  const [showAddTracker, setShowAddTracker] = useState(false);
  const [editingTracker, setEditingTracker] = useState(null);
  const [filterCadence, setFilterCadence] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [groupBy, setGroupBy] = useState('none'); // 'none', 'cadence', or 'type'
  const [trackerStats, setTrackerStats] = useState({});
  const [showAnswers, setShowAnswers] = useState(null);
  const [trackerAnswers, setTrackerAnswers] = useState({});
  const [showRawNote, setShowRawNote] = useState(null);
  const [rawNotes, setRawNotes] = useState({});
  const [showGraph, setShowGraph] = useState(null);
  const [graphData, setGraphData] = useState({});
  const [deletingAnswerId, setDeletingAnswerId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);

  useEffect(() => {
    loadTrackers();
  }, []);

  // Save search term to localStorage whenever it changes
  useEffect(() => {
    if (searchTerm) {
      localStorage.setItem('trackerPageSearchTerm', searchTerm);
    } else {
      // Remove from localStorage if search is cleared
      localStorage.removeItem('trackerPageSearchTerm');
    }
  }, [searchTerm]);

  const loadTrackers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await loadNotes();
      const notes = Array.isArray(response) ? response : (response?.notes || []);
      
      const trackerNotes = notes
        .filter(note => note.content && note.content.split('\n').some(line => line === 'meta::tracker'))
        .map(note => {
          const lines = note.content.split('\n');
          const title = lines.find(line => line.startsWith('Title:'))?.replace('Title:', '').trim();
          const question = lines.find(line => line.startsWith('Question:'))?.replace('Question:', '').trim();
          const type = lines.find(line => line.startsWith('Type:'))?.replace('Type:', '').trim();
          const cadence = lines.find(line => line.startsWith('Cadence:'))?.replace('Cadence:', '').trim();
          const daysStr = lines.find(line => line.startsWith('Days:'))?.replace('Days:', '').trim();
          const days = daysStr ? daysStr.split(',').map(day => day.trim()) : [];
          const startDate = lines.find(line => line.startsWith('Start Date:'))?.replace('Start Date:', '').trim();
          const endDate = lines.find(line => line.startsWith('End Date:'))?.replace('End Date:', '').trim();
          
          return {
            id: note.id,
            title,
            question,
            type,
            cadence,
            days,
            startDate,
            endDate,
            createdAt: note.createdAt,
            completions: {} // Initialize completions
          };
        });
      setTrackers(trackerNotes);

      // Load tracker answers and calculate statistics
      const answers = notes.filter(note => note.content.split('\n').some(line => line === 'meta::tracker_answer'));
      const stats = {};
      const answersByTracker = {};
      const rawNotesByAnswer = {};
      const graphDataByTracker = {};
      
      answers.forEach(answer => {
        const lines = answer.content.split('\n');
        const link = lines.find(line => line.startsWith('meta::link:'))?.replace('meta::link:', '').trim();
        const answerValue = lines.find(line => line.startsWith('Answer:'))?.replace('Answer:', '').trim();
        const date = lines.find(line => line.startsWith('Date:'))?.replace('Date:', '').trim();
        
        if (link && answerValue && date) {
          // Find the tracker by ID, handling type mismatches (string vs number)
          const tracker = trackerNotes.find(t => {
            const tId = String(t.id);
            const linkId = String(link);
            return tId === linkId;
          });
          
          if (!tracker) {
            // Check if the link ID matches any tracker ID (case-insensitive)
            const normalizedLinkId = String(link).toLowerCase();
            const matchingTracker = trackerNotes.find(t => {
              const normalizedTrackerId = String(t.id).toLowerCase();
              return normalizedTrackerId === normalizedLinkId;
            });
            
            if (matchingTracker) {
              // Use the matching tracker found with normalization
              tracker = matchingTracker;
              console.log('[loadTrackers] Found tracker with normalization', {
                linkId: String(link),
                trackerId: String(matchingTracker.id),
                trackerTitle: matchingTracker.title
              });
            } else {
              console.log('[loadTrackers] Tracker not found for answer', { 
                linkId: String(link), 
                linkIdType: typeof link,
                normalizedLinkId,
                trackerCount: trackerNotes.length,
                sampleTrackerIds: trackerNotes.slice(0, 5).map(t => ({ 
                  id: String(t.id), 
                  idType: typeof t.id, 
                  normalizedId: String(t.id).toLowerCase(),
                  title: t.title 
                }))
              });
            }
          }
          
          if (tracker) {
            // Use tracker.id for consistent key usage (handle type conversion)
            const trackerId = String(tracker.id);
            
            if (!stats[trackerId]) {
              stats[trackerId] = { yes: 0, no: 0, total: 0 };
            }
            if (answerValue.toLowerCase() === 'yes') {
              stats[trackerId].yes++;
            } else if (answerValue.toLowerCase() === 'no') {
              stats[trackerId].no++;
            }
            stats[trackerId].total++;

            if (!answersByTracker[trackerId]) {
              answersByTracker[trackerId] = [];
            }
            answersByTracker[trackerId].push({
              id: answer.id,
              date,
              answer: answerValue,
              value: answerValue, // Also set value for consistency
              age: getAgeInStringFmt(new Date(date))
            });
            rawNotesByAnswer[answer.id] = answer.content;

            // Set completions for the tracker
            tracker.completions[date] = true; // Mark as completed if there's an answer

            // Prepare graph data (only if tracker was found)
            if (!graphDataByTracker[trackerId]) {
              graphDataByTracker[trackerId] = {
                dates: [],
                yesCounts: [],
                noCounts: []
              };
            }
            graphDataByTracker[trackerId].dates.push(date);
            graphDataByTracker[trackerId].yesCounts.push(
              answerValue.toLowerCase() === 'yes' ? 1 : 0
            );
            graphDataByTracker[trackerId].noCounts.push(
              answerValue.toLowerCase() === 'no' ? 1 : 0
            );
          }
        }
      });

      // Sort graph data by date
      Object.keys(graphDataByTracker).forEach(trackerId => {
        const { dates, yesCounts, noCounts } = graphDataByTracker[trackerId];
        const sortedIndices = dates.map((_, i) => i)
          .sort((a, b) => new Date(dates[a]) - new Date(dates[b]));
        
        graphDataByTracker[trackerId] = {
          dates: sortedIndices.map(i => dates[i]),
          yesCounts: sortedIndices.map(i => yesCounts[i]),
          noCounts: sortedIndices.map(i => noCounts[i])
        };
      });

      setTrackerStats(stats);
      setTrackerAnswers(answersByTracker);
      setRawNotes(rawNotesByAnswer);
      setGraphData(graphDataByTracker);
      
      // Debug: Log loaded answers for verification
      console.log('[loadTrackers] Loaded answers summary', {
        totalAnswers: answers.length,
        answersByTracker: Object.keys(answersByTracker).map(k => ({
          trackerId: k,
          count: answersByTracker[k].length,
          sampleAnswer: answersByTracker[k][0],
          allDates: answersByTracker[k].map(a => a.date).sort()
        }))
      });
      
      // Debug: Specifically check "Merlin Go for Work" tracker
      const merlinTracker = trackerNotes.find(t => t.title === 'Merlin Go for Work');
      if (merlinTracker) {
        const merlinId = String(merlinTracker.id);
        const merlinAnswers = answersByTracker[merlinId] || [];
        
        // Also check all answers in the backend to see if any have the merlin tracker ID
        const allMerlinAnswersInBackend = answers.filter(answer => {
          const lines = answer.content.split('\n');
          const link = lines.find(line => line.startsWith('meta::link:'))?.replace('meta::link:', '').trim();
          return String(link) === merlinId;
        });
        
        console.log('[loadTrackers] Merlin Go for Work tracker details', {
          trackerId: merlinId,
          trackerIdType: typeof merlinTracker.id,
          answersCount: merlinAnswers.length,
          backendAnswersCount: allMerlinAnswersInBackend.length,
          answers: merlinAnswers.map(a => ({ date: a.date, answer: a.answer, id: a.id })).sort((a, b) => a.date.localeCompare(b.date)),
          hasNov2: merlinAnswers.some(a => a.date === '2025-11-02'),
          nov2Answer: merlinAnswers.find(a => a.date === '2025-11-02'),
          recentDates: merlinAnswers.slice(-10).map(a => a.date),
          allBackendAnswersDates: allMerlinAnswersInBackend.map(answer => {
            const lines = answer.content.split('\n');
            const date = lines.find(line => line.startsWith('Date:'))?.replace('Date:', '').trim();
            const answerValue = lines.find(line => line.startsWith('Answer:'))?.replace('Answer:', '').trim();
            const link = lines.find(line => line.startsWith('meta::link:'))?.replace('meta::link:', '').trim();
            return { id: answer.id, date, answer: answerValue, linkId: String(link), linkMatches: String(link) === merlinId };
          }).filter(a => a.date && a.date >= '2025-11-01').sort((a, b) => a.date.localeCompare(b.date))
        });
      }
    } catch (err) {
      setError('Failed to load trackers. Please try again.');
      console.error('Error loading trackers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrackerAdded = (newTracker) => {
    setTrackers(prevTrackers => [...prevTrackers, newTracker]);
    setShowAddTracker(false);
  };

  const handleTrackerUpdated = (updatedTracker) => {
    setTrackers(prevTrackers => 
      prevTrackers.map(tracker => 
        tracker.id === updatedTracker.id ? updatedTracker : tracker
      )
    );
    setEditingTracker(null);
    setShowAddTracker(false);
  };

  const handleEditTracker = (tracker) => {
    setEditingTracker(tracker);
    setShowAddTracker(true);
  };

  const handleShowAnswers = (trackerId) => {
    setShowAnswers(trackerId);
  };

  const handleShowRawNote = (answerId) => {
    setShowRawNote(answerId);
  };

  const handleShowGraph = (trackerId) => {
    setShowGraph(trackerId);
  };

  const handleDeleteAnswer = async (answerId) => {
    try {
      await deleteNoteById(answerId);
      // Remove the answer from the trackerAnswers state
      const trackerId = Object.keys(trackerAnswers).find(tId => 
        trackerAnswers[tId].some(answer => answer.id === answerId)
      );
      if (trackerId) {
        setTrackerAnswers(prev => ({
          ...prev,
          [trackerId]: prev[trackerId].filter(answer => answer.id !== answerId)
        }));
        // Remove from rawNotes
        setRawNotes(prev => {
          const newRawNotes = { ...prev };
          delete newRawNotes[answerId];
          return newRawNotes;
        });
        // Update stats
        const answer = trackerAnswers[trackerId].find(a => a.id === answerId);
        if (answer) {
          setTrackerStats(prev => {
            const stats = { ...prev[trackerId] };
            if (answer.answer.toLowerCase() === 'yes') {
              stats.yes--;
            } else if (answer.answer.toLowerCase() === 'no') {
              stats.no--;
            }
            stats.total--;
            return { ...prev, [trackerId]: stats };
          });
        }
      }
      setShowDeleteConfirm(false);
      setDeletingAnswerId(null);
    } catch (error) {
      console.error('Error deleting answer:', error);
      setError('Failed to delete answer. Please try again.');
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getLineChartData = (trackerId) => {
    const data = graphData[trackerId];
    if (!data) return null;

    return {
      labels: data.dates.map(date => new Date(date).toLocaleDateString()),
      datasets: [
        {
          label: 'Yes',
          data: data.yesCounts,
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.5)',
          tension: 0.1
        },
        {
          label: 'No',
          data: data.noCounts,
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'rgba(239, 68, 68, 0.5)',
          tension: 0.1
        }
      ]
    };
  };

  const getPieChartData = (trackerId) => {
    const stats = trackerStats[trackerId];
    if (!stats) return null;

    return {
      labels: ['Yes', 'No'],
      datasets: [
        {
          data: [stats.yes, stats.no],
          backgroundColor: [
            'rgba(34, 197, 94, 0.5)',
            'rgba(239, 68, 68, 0.5)'
          ],
          borderColor: [
            'rgb(34, 197, 94)',
            'rgb(239, 68, 68)'
          ],
          borderWidth: 1
        }
      ]
    };
  };

  // Fuzzy search function
  const fuzzyMatch = (text, pattern) => {
    if (!pattern) return true;
    if (!text) return false;
    
    const textLower = text.toLowerCase();
    const patternLower = pattern.toLowerCase();
    
    // First try exact substring match
    if (textLower.includes(patternLower)) return true;
    
    // Fuzzy match: check if all pattern characters appear in order
    let patternIndex = 0;
    for (let i = 0; i < textLower.length && patternIndex < patternLower.length; i++) {
      if (textLower[i] === patternLower[patternIndex]) {
        patternIndex++;
      }
    }
    return patternIndex === patternLower.length;
  };

  // Toggle completion for a tracker on a given date
  const handleToggleDay = async (trackerId, dateStr, value = null) => {
    console.log('[handleToggleDay] START', { trackerId, dateStr, value, timestamp: new Date().toISOString() });
    
    // Normalize trackerId to string for consistent key usage
    const trackerIdStr = String(trackerId);
    
    const tracker = trackers.find(t => String(t.id) === trackerIdStr);
    if (!tracker) {
      console.log('[handleToggleDay] ERROR: Tracker not found', { trackerId, trackerIdStr });
      return;
    }

    console.log('[handleToggleDay] Tracker found', { trackerId: trackerIdStr, trackerTitle: tracker.title });

    // Check if this is a removal (value is null)
    const isRemoval = value === null;
    console.log('[handleToggleDay] Is removal?', { isRemoval, value });

    if (isRemoval) {
      // Handle removal - find and delete ALL notes for this date, then update state
      console.log('[handleToggleDay] Handling removal', { trackerId, dateStr });
      
      // Collect all note IDs to delete from state
      const notesToDeleteFromState = trackerAnswers[trackerIdStr]?.filter(a => a.date === dateStr).map(a => a.id) || [];
      
      // Also search rawNotes for all notes with matching date
      const notesToDeleteFromCache = [];
      for (const [noteId, content] of Object.entries(rawNotes)) {
        const lines = content.split('\n');
        const noteDate = lines.find(line => line.startsWith('Date:'))?.replace('Date:', '').trim();
        const noteLink = lines.find(line => line.startsWith('meta::link:'))?.replace('meta::link:', '').trim();
        if (noteDate === dateStr && String(noteLink) === trackerIdStr) {
          notesToDeleteFromCache.push(noteId);
        }
      }
      
      // Combine and deduplicate note IDs
      const allNotesToDelete = [...new Set([...notesToDeleteFromState, ...notesToDeleteFromCache])];
      
      // Also check API for any additional notes
      try {
        const response = await loadNotes();
        const notes = Array.isArray(response) ? response : (response?.notes || []);
        
        const matchingNotesFromAPI = notes.filter(note => {
          if (!note.content) return false;
          const lines = note.content.split('\n');
          const hasTrackerAnswer = lines.some(line => line === 'meta::tracker_answer');
          if (!hasTrackerAnswer) return false;
          
          const noteDate = lines.find(line => line.startsWith('Date:'))?.replace('Date:', '').trim();
          const noteLink = lines.find(line => line.startsWith('meta::link:'))?.replace('meta::link:', '').trim();
          return noteDate === dateStr && String(noteLink) === trackerIdStr;
        });
        
        matchingNotesFromAPI.forEach(note => {
          if (!allNotesToDelete.includes(note.id)) {
            allNotesToDelete.push(note.id);
          }
        });
      } catch (error) {
        console.error('[handleToggleDay] Error searching API for notes to delete', { error });
      }
      
      // Delete all matching notes from backend
      if (allNotesToDelete.length > 0) {
        console.log('[handleToggleDay] Deleting notes', { count: allNotesToDelete.length, noteIds: allNotesToDelete });
        
        // Delete all notes in parallel
        const deletePromises = allNotesToDelete.map(async (noteId) => {
          try {
            await deleteNoteById(noteId);
            console.log('[handleToggleDay] Deleted note from backend', { noteId, dateStr });
            return { noteId, success: true };
          } catch (error) {
            // Note might already be deleted (e.g., by TrackerCard), which is fine
            if ((error.message && error.message.includes('404')) || (error.message && error.message.includes('not found'))) {
              console.log('[handleToggleDay] Note already deleted (expected)', { noteId, dateStr });
              return { noteId, success: true }; // Consider it successful
            } else {
              console.error('[handleToggleDay] ERROR deleting note', { noteId, error });
              return { noteId, success: false };
            }
          }
        });
        
        await Promise.all(deletePromises);
        
        // Remove all deleted notes from rawNotes
        setRawNotes(prev => {
          const updated = { ...prev };
          allNotesToDelete.forEach(noteId => {
            delete updated[noteId];
          });
          return updated;
        });
      }
      
      setTrackers(prev => {
        const currentTracker = prev.find(t => t.id === trackerId);
        console.log('[handleToggleDay] Current tracker completions before removal', { 
          trackerId, 
          dateStr, 
          hasCompletion: !!(currentTracker?.completions?.[dateStr]),
          allCompletions: currentTracker?.completions 
        });
        
        return prev.map(t => {
          if (t.id !== trackerId) return t;
          const completions = { ...t.completions };
          delete completions[dateStr]; // Remove the completion
          console.log('[handleToggleDay] Removed completion from tracker state', { 
            trackerId, 
            dateStr, 
            completionsAfter: completions 
          });
          return { ...t, completions };
        });
      });

      // Update trackerAnswers to remove the answer
      setTrackerAnswers(prev => {
        const prevAnswers = prev[trackerIdStr] || [];
        console.log('[handleToggleDay] Current trackerAnswers before removal', { 
          trackerId, 
          dateStr, 
          prevAnswersCount: prevAnswers.length,
          hasAnswer: prevAnswers.some(a => a.date === dateStr),
          allAnswers: prevAnswers.map(a => ({ date: a.date, answer: a.answer }))
        });

        const filteredAnswers = prevAnswers.filter(a => a.date !== dateStr);
        console.log('[handleToggleDay] Filtered answers after removal', { 
          trackerId, 
          dateStr, 
          filteredAnswersCount: filteredAnswers.length,
          filteredAnswers: filteredAnswers.map(a => ({ date: a.date, answer: a.answer }))
        });

        const newState = { ...prev, [trackerIdStr]: filteredAnswers };
        console.log('[handleToggleDay] New trackerAnswers state', { 
          trackerId, 
          newState: Object.keys(newState).map(k => ({ 
            key: k, 
            count: newState[k]?.length || 0 
          }))
        });

        return newState;
      });

      console.log('[handleToggleDay] Removal complete', { trackerId, dateStr });
      return; // Exit early for removals
    }

    // Handle addition/update
    let answer;
    if (tracker.type.toLowerCase() === 'value') {
      answer = value;
    } else if (tracker.type.toLowerCase().includes('yes')) {
      answer = value; // value should be 'yes' or 'no' from TrackerCard
    } else {
      answer = 'no';
    }

    console.log('[handleToggleDay] Creating/updating answer', { trackerId, dateStr, answer });

    // Check if answer already exists in state - find the latest one if multiple exist
    const existingAnswersInState = trackerAnswers[trackerIdStr]?.filter(a => a.date === dateStr) || [];
    let existingAnswer = existingAnswersInState.length > 0 
      ? existingAnswersInState.sort((a, b) => {
          // Sort by ID (assuming newer notes have higher IDs or use createdAt if available)
          // For now, just take the last one in the array (most recently added to state)
          return existingAnswersInState.indexOf(b) - existingAnswersInState.indexOf(a);
        })[0]
      : null;
    
    // If not found in state, search through rawNotes to find all existing notes with this date
    let existingNoteId = null;
    if (existingAnswer && existingAnswer.id) {
      existingNoteId = existingAnswer.id;
    } else {
      // Collect all matching notes from rawNotes
      const matchingNotesFromCache = [];
      for (const [noteId, content] of Object.entries(rawNotes)) {
        const lines = content.split('\n');
        const noteDate = lines.find(line => line.startsWith('Date:'))?.replace('Date:', '').trim();
        const noteLink = lines.find(line => line.startsWith('meta::link:'))?.replace('meta::link:', '').trim();
        if (noteDate === dateStr && String(noteLink) === trackerIdStr) {
          matchingNotesFromCache.push({ id: noteId, content });
        }
      }
      
      // If found in cache, use the one with the highest ID (assuming newer notes have higher IDs)
      if (matchingNotesFromCache.length > 0) {
        // Sort by ID (assuming newer = higher ID) or use note creation order
        // For now, just take the first one found, but we'll check API for the latest
        existingNoteId = matchingNotesFromCache[0].id;
        existingAnswer = { id: existingNoteId, date: dateStr, answer: '', value: '' };
      }
      
      // Always check the API to find the latest note (even if found in cache)
      try {
        console.log('[handleToggleDay] Searching API for existing notes', { trackerId, dateStr });
        const response = await loadNotes();
        const notes = Array.isArray(response) ? response : (response?.notes || []);
        
        // Find ALL tracker answer notes with matching date and tracker link
        const matchingNotes = notes.filter(note => {
          if (!note.content) return false;
          const lines = note.content.split('\n');
          const hasTrackerAnswer = lines.some(line => line === 'meta::tracker_answer');
          if (!hasTrackerAnswer) return false;
          
          const noteDate = lines.find(line => line.startsWith('Date:'))?.replace('Date:', '').trim();
          const noteLink = lines.find(line => line.startsWith('meta::link:'))?.replace('meta::link:', '').trim();
          return noteDate === dateStr && String(noteLink) === trackerIdStr;
        });
        
        if (matchingNotes.length > 0) {
          // Sort by createdAt (newest first) or by ID (assuming newer = higher ID)
          const sortedNotes = matchingNotes.sort((a, b) => {
            // Prefer createdAt if available
            if (a.createdAt && b.createdAt) {
              return new Date(b.createdAt) - new Date(a.createdAt);
            }
            // Fallback to ID comparison (assuming newer notes have higher IDs)
            return String(b.id).localeCompare(String(a.id));
          });
          
          // Use the most recent note
          const latestNote = sortedNotes[0];
          existingNoteId = latestNote.id;
          existingAnswer = { id: latestNote.id, date: dateStr, answer: '', value: '' };
          
          // Add all matching notes to rawNotes for future lookups
          setRawNotes(prev => {
            const updated = { ...prev };
            matchingNotes.forEach(note => {
              if (note.content) {
                updated[note.id] = note.content;
              }
            });
            return updated;
          });
          
          console.log('[handleToggleDay] Found existing notes in API', { 
            totalMatches: matchingNotes.length,
            latestNoteId: existingNoteId,
            dateStr,
            allNoteIds: matchingNotes.map(n => n.id)
          });
          
          // If there are multiple notes, log a warning
          if (matchingNotes.length > 1) {
            console.warn('[handleToggleDay] Multiple notes found for same date, using latest', {
              dateStr,
              trackerId,
              totalNotes: matchingNotes.length,
              latestNoteId: existingNoteId,
              allNoteIds: matchingNotes.map(n => n.id)
            });
          }
        }
      } catch (error) {
        console.error('[handleToggleDay] Error searching API for existing note', { error });
      }
    }
    
    console.log('[handleToggleDay] Existing answer check', { 
      trackerId, 
      dateStr, 
      hasExistingAnswer: !!existingAnswer,
      existingAnswerId: existingAnswer?.id,
      foundInRawNotes: !!existingNoteId && !trackerAnswers[trackerIdStr]?.find(a => a.date === dateStr)
    });

    try {
      let response;
      if (existingNoteId) {
        // Update existing note
        console.log('[handleToggleDay] Updating existing note', { 
          noteId: existingNoteId, 
          newAnswer: answer 
        });
        
        // Get the existing note content from rawNotes
        const existingContent = rawNotes[existingNoteId];
        if (!existingContent) {
          console.error('[handleToggleDay] ERROR: Cannot find existing note content', { 
            noteId: existingNoteId,
            availableIds: Object.keys(rawNotes).slice(0, 5)
          });
          // Fallback: try to create a new note instead
          response = await createTrackerAnswerNote(trackerId, answer, dateStr);
          console.log('[handleToggleDay] Created new note as fallback', { response });
        } else {
          // Update the Answer line in the existing content
          const lines = existingContent.split('\n');
          const updatedLines = lines.map(line => {
            if (line.startsWith('Answer:')) {
              return `Answer: ${answer}`;
            }
            return line;
          });
          const updatedContent = updatedLines.join('\n');
          
          console.log('[handleToggleDay] Updating note with full content', { 
            noteId: existingNoteId,
            oldContentPreview: existingContent.substring(0, 100),
            newContentPreview: updatedContent.substring(0, 100)
          });
          
          await updateNoteById(existingNoteId, updatedContent);
          response = { id: existingNoteId }; // Use existing ID
          
          // Update rawNotes to reflect the new content immediately
          setRawNotes(prev => ({
            ...prev,
            [existingNoteId]: updatedContent
          }));
          
          console.log('[handleToggleDay] Note updated successfully', { 
            noteId: existingNoteId 
          });
        }
      } else {
        // Create new note
        console.log('[handleToggleDay] Creating new note', { trackerId, dateStr, answer });
        response = await createTrackerAnswerNote(trackerId, answer, dateStr);
        console.log('[handleToggleDay] createTrackerAnswerNote response', { response });
        
        // Add newly created note to rawNotes for future lookups
        if (response && response.id && response.content) {
          setRawNotes(prev => ({
            ...prev,
            [response.id]: response.content
          }));
          console.log('[handleToggleDay] Added new note to rawNotes', { noteId: response.id });
        }
      }
      
      if (response && response.id) {
        setTrackers(prev => prev.map(t => {
          if (t.id !== trackerId) return t;
          const completions = { ...t.completions };
          completions[dateStr] = !completions[dateStr];
          console.log('[handleToggleDay] Updated tracker completions', { 
            trackerId, 
            dateStr, 
            completionValue: completions[dateStr] 
          });
          return { ...t, completions };
        }));
        
        // Update trackerAnswers for immediate UI feedback
        setTrackerAnswers(prev => {
          const prevAnswers = prev[trackerIdStr] || [];
          console.log('[handleToggleDay] Current trackerAnswers before update', { 
            trackerId, 
            dateStr, 
            prevAnswersCount: prevAnswers.length,
            existingAnswerIndex: prevAnswers.findIndex(a => a.date === dateStr)
          });

          // Check if answer for this date already exists
          const idx = prevAnswers.findIndex(a => a.date === dateStr);
          let newAnswers;
          if (idx !== -1) {
            // Update existing answer
            newAnswers = [...prevAnswers];
            newAnswers[idx] = {
              ...newAnswers[idx],
              answer,
              value: answer,
              date: dateStr,
              id: response.id
            };
            console.log('[handleToggleDay] Updated existing answer in state', { 
              trackerId, 
              dateStr, 
              index: idx,
              updatedAnswer: newAnswers[idx]
            });
          } else {
            // Add new answer
            newAnswers = [
              ...prevAnswers,
              {
                answer,
                value: answer,
                date: dateStr,
                id: response.id
              }
            ];
            console.log('[handleToggleDay] Added new answer to state', { 
              trackerId, 
              dateStr, 
              newAnswer: newAnswers[newAnswers.length - 1],
              totalAnswers: newAnswers.length
            });
          }
          
          const newState = { ...prev, [trackerIdStr]: newAnswers };
          console.log('[handleToggleDay] New trackerAnswers state after update', { 
            trackerId, 
            newAnswersCount: newAnswers.length,
            newState: Object.keys(newState).map(k => ({ 
              key: k, 
              count: newState[k]?.length || 0 
            }))
          });

          return newState;
        });
        toast.success('Answer recorded successfully');
        console.log('[handleToggleDay] Success - Answer recorded', { trackerId, dateStr });
      } else {
        console.log('[handleToggleDay] ERROR: No response ID', { response });
        throw new Error('Failed to create/update answer note');
      }
    } catch (error) {
      console.error('[handleToggleDay] ERROR:', error);
      toast.error('Failed to record answer: ' + error.message);
    }
    
    console.log('[handleToggleDay] END', { trackerId, dateStr, value });
  };

  if (isLoading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  const today = moment();
  const todayStr = today.format('YYYY-MM-DD');
  const currentMonthStr = today.format('YYYY-MM'); // 'YYYY-MM'
  const currentYearStr = today.format('YYYY');

  const isMonthlyCompleted = (tracker) => {
    if (!tracker.completions) return false;
    // If any completion for this month exists, consider completed
    return Object.keys(tracker.completions).some(date => date.startsWith(currentMonthStr));
  };

  const isYearlyCompleted = (tracker) => {
    if (!tracker.completions) return false;
    // If any completion for this year exists, consider completed
    return Object.keys(tracker.completions).some(date => date.startsWith(currentYearStr));
  };

  // Helper for weekly cadence: get last relevant date (most recent selected day)
  function getLastRelevantWeeklyDate(tracker) {
    if (!tracker.days || tracker.days.length === 0) return null;
    // Convert days to weekday indices (0=Sun, 1=Mon, ...)
    const selectedDays = tracker.days.map(d => {
      if (typeof d === 'string') {
        const idx = ['sun','mon','tue','wed','thu','fri','sat'].indexOf(d.toLowerCase().slice(0,3));
        return idx >= 0 ? idx : d;
      }
      return d;
    });
    let d = moment();
    for (let i = 0; i < 7; i++) {
      if (selectedDays.includes(d.day())) {
        return d.format('YYYY-MM-DD');
      }
      d = d.subtract(1, 'days');
    }
    return null;
  }

  const isWeeklyCompleted = (tracker) => {
    const lastRelevant = getLastRelevantWeeklyDate(tracker);
    if (!lastRelevant) return false;
    return tracker.completions && tracker.completions[lastRelevant];
  };

  // Helper to check if a date is on or after the start date
  function isOnOrAfterStartDate(tracker, relevantDateStr) {
    if (!tracker.startDate) return true;
    // Compare as YYYY-MM-DD strings
    return relevantDateStr >= tracker.startDate;
  }

  // Filter trackers based on search term, cadence, and type
  const filteredTrackers = trackers.filter(tracker => {
    // Fuzzy search on title and question
    const matchesSearch = fuzzyMatch(tracker.title || '', searchTerm) ||
                         fuzzyMatch(tracker.question || '', searchTerm);
    const matchesCadence = filterCadence === 'all' || tracker.cadence === filterCadence;
    const matchesType = filterType === 'all' || tracker.type === filterType;
    return matchesSearch && matchesCadence && matchesType;
  }).sort((a, b) => {
    // Sort by name (title)
    const nameA = (a.title || '').toLowerCase();
    const nameB = (b.title || '').toLowerCase();
    return nameA.localeCompare(nameB);
  });

  // Show all trackers in one unified section - removed pending/completed separation

  // Helper to group trackers by cadence
  const groupByCadence = (trackers) => {
    const groups = { yearly: [], monthly: [], weekly: [], daily: [], custom: [] };
    trackers.forEach(tracker => {
      const cadence = tracker.cadence ? tracker.cadence.toLowerCase() : 'daily';
      if (cadence === 'yearly') groups.yearly.push(tracker);
      else if (cadence === 'monthly') groups.monthly.push(tracker);
      else if (cadence === 'weekly') {
        groups.weekly.push(tracker);
      } else if (cadence === 'custom') {
        groups.custom.push(tracker);
      } else {
        groups.daily.push(tracker);
      }
    });
    // Sort each group by name
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        const nameA = (a.title || '').toLowerCase();
        const nameB = (b.title || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
    });
    return groups;
  };

  // Helper to group trackers by type
  const groupByType = (trackers) => {
    const groups = {};
    trackers.forEach(tracker => {
      const type = tracker.type ? tracker.type.toLowerCase() : 'other';
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(tracker);
    });
    // Sort each group by name
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => {
        const nameA = (a.title || '').toLowerCase();
        const nameB = (b.title || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
    });
    return groups;
  };

  // Use the selected grouping option for all trackers
  const getGroups = () => {
    if (groupBy === 'none') return { _flat: filteredTrackers };
    return groupBy === 'type' ? groupByType(filteredTrackers) : groupByCadence(filteredTrackers);
  };

  const groups = getGroups();

  const renderGroupedTrackers = (groups) => {
    // Unified section styling
    const sectionBg = 'bg-blue-50';
    
    // Format group title for display
    const formatGroupTitle = (key) => {
      if (groupBy === 'type') {
        // Capitalize first letter and handle common types
        const typeMap = {
          'value': 'Value',
          'yes/no': 'Yes/No',
          'yes,no': 'Yes/No',
          'yesno': 'Yes/No',
          'other': 'Other'
        };
        return typeMap[key] || key.charAt(0).toUpperCase() + key.slice(1);
      } else {
        // Cadence-based grouping
        const cadenceMap = {
          'yearly': 'Yearly',
          'monthly': 'Monthly',
          'weekly': 'Weekly',
          'daily': 'Daily',
          'custom': 'Custom'
        };
        return cadenceMap[key] || key.charAt(0).toUpperCase() + key.slice(1);
      }
    };
    
    return (
      <div className={`${sectionBg} rounded-lg p-4 mb-6`}>
        {groupBy === 'none' ? (
          // Render flat list (no grouping)
          <TrackerGrid 
            trackers={groups._flat || []} 
            onToggleDay={handleToggleDay} 
            trackerAnswers={trackerAnswers} 
            onEdit={handleEditTracker}
            isFocusMode={isFocusMode}
            isDevMode={isDevMode}
          />
        ) : groupBy === 'cadence' ? (
          // Render cadence-based groups
          <>
            {groups.yearly && groups.yearly.length > 0 && (
              <div className="ml-8">
                <h3 className="text-lg font-semibold mt-4 mb-2">Yearly</h3>
                <TrackerGrid 
                  trackers={groups.yearly} 
                  onToggleDay={handleToggleDay} 
                  trackerAnswers={trackerAnswers} 
                  onEdit={handleEditTracker}
                  isFocusMode={isFocusMode}
                  isDevMode={isDevMode}
                />
              </div>
            )}
            {groups.monthly && groups.monthly.length > 0 && (
              <div className="ml-8">
                <h3 className="text-lg font-semibold mt-4 mb-2">Monthly</h3>
                <TrackerGrid 
                  trackers={groups.monthly} 
                  onToggleDay={handleToggleDay} 
                  trackerAnswers={trackerAnswers} 
                  onEdit={handleEditTracker}
                  isFocusMode={isFocusMode}
                  isDevMode={isDevMode}
                />
              </div>
            )}
            {groups.weekly && groups.weekly.length > 0 && (
              <div className="ml-8">
                <h3 className="text-lg font-semibold mt-4 mb-2">Weekly</h3>
                <TrackerGrid 
                  trackers={groups.weekly} 
                  onToggleDay={handleToggleDay} 
                  trackerAnswers={trackerAnswers} 
                  onEdit={handleEditTracker}
                  isFocusMode={isFocusMode}
                  isDevMode={isDevMode}
                />
              </div>
            )}
            {groups.daily && groups.daily.length > 0 && (
              <div className="ml-8">
                <h3 className="text-lg font-semibold mt-4 mb-2">Daily</h3>
                <TrackerGrid 
                  trackers={groups.daily} 
                  onToggleDay={handleToggleDay} 
                  trackerAnswers={trackerAnswers} 
                  onEdit={handleEditTracker}
                  isFocusMode={isFocusMode}
                  isDevMode={isDevMode}
                />
              </div>
            )}
            {groups.custom && groups.custom.length > 0 && (
              <div className="ml-8">
                <h3 className="text-lg font-semibold mt-4 mb-2">Custom</h3>
                <TrackerGrid 
                  trackers={groups.custom} 
                  onToggleDay={handleToggleDay} 
                  trackerAnswers={trackerAnswers} 
                  onEdit={handleEditTracker}
                  isFocusMode={isFocusMode}
                  isDevMode={isDevMode}
                />
              </div>
            )}
          </>
        ) : (
          // Render type-based groups
          Object.keys(groups).sort().map(typeKey => {
            const typeTrackers = groups[typeKey];
            if (typeTrackers && typeTrackers.length > 0) {
              return (
                <div key={typeKey} className="ml-8">
                  <h3 className="text-lg font-semibold mt-4 mb-2">{formatGroupTitle(typeKey)}</h3>
                  <TrackerGrid 
                    trackers={typeTrackers} 
                    onToggleDay={handleToggleDay} 
                    trackerAnswers={trackerAnswers} 
                    onEdit={handleEditTracker}
                    isFocusMode={isFocusMode}
                    isDevMode={isDevMode}
                  />
                </div>
              );
            }
            return null;
          })
        )}
      </div>
    );
  };

  const totalCount = filteredTrackers.length;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Trackers</h1>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/tracker-stats-analysis')}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            View Stats Analysis
          </button>
          <label className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={isDevMode}
              onChange={(e) => setIsDevMode(e.target.checked)}
              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-gray-700">Dev mode</span>
          </label>
          <button
            className={`px-4 py-2 rounded-lg transition-colors ${
              isFocusMode 
                ? 'bg-green-600 text-white hover:bg-green-700' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
            onClick={() => setIsFocusMode(!isFocusMode)}
          >
            {isFocusMode ? 'Focus Mode: On' : 'Focus Mode: Off'}
          </button>
        <button
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          onClick={() => setShowAddTracker(true)}
          >
            + Add Tracker
          </button>
        </div>
      </div>
      
      {/* Search Box and Grouping Option */}
      <div className="mb-6 flex items-center gap-4 flex-wrap">
        <div className="relative max-w-md">
          <input
            type="text"
            placeholder="Search trackers (fuzzy search)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        {/* Group By Buttons */}
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Group by:</label>
          <div className="flex gap-2">
            <button
              onClick={() => setGroupBy('none')}
              className={`px-3 py-2 rounded-lg transition-colors ${
                groupBy === 'none'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              None
            </button>
            <button
              onClick={() => setGroupBy('cadence')}
              className={`px-3 py-2 rounded-lg transition-colors ${
                groupBy === 'cadence'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Cadence
            </button>
            <button
              onClick={() => setGroupBy('type')}
              className={`px-3 py-2 rounded-lg transition-colors ${
                groupBy === 'type'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Type
            </button>
          </div>
        </div>
      </div>
      <div className="bg-blue-50 rounded-t-lg px-4 pt-4 pb-2 border-b-2 border-blue-200">
        <h2 className="text-xl font-semibold">
          Trackers ({totalCount})
        </h2>
      </div>
      {renderGroupedTrackers(groups)}
      {showAddTracker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={() => { setShowAddTracker(false); setEditingTracker(null); }}
              aria-label="Close"
            >
              &times;
            </button>
            <AddTracker onTrackerAdded={handleTrackerAdded} onTrackerUpdated={handleTrackerUpdated} editingTracker={editingTracker} />
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackerListing; 