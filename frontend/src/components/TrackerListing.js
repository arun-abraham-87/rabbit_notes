import React, { useState, useEffect } from 'react';
import { loadAllNotes, updateNoteById, deleteNoteById } from '../utils/ApiUtils';
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
import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
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
import TrackerTable from './TrackerTable';
import { createTrackerAnswerNote, getTrackerOverdueThreshold, isCustomXDaysTrackerCadence } from '../utils/TrackerQuestionUtils';
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

const TrackerListing = ({ setAllNotes: setGlobalNotes } = {}) => {
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
  const [filterOverdue, setFilterOverdue] = useState(() => {
    const saved = localStorage.getItem('trackerPageFilterOverdue');
    return saved === 'true';
  });
  const [filterUnmarked, setFilterUnmarked] = useState(() => {
    const saved = localStorage.getItem('trackerPageFilterUnmarked');
    return saved === 'true';
  });
  const [filterMarked, setFilterMarked] = useState(() => {
    const saved = localStorage.getItem('trackerPageFilterMarked');
    return saved === 'true';
  });
  const [groupBy, setGroupBy] = useState(() => {
    const saved = localStorage.getItem('trackerPageGroupBy');
    return saved || 'none'; // 'none', 'cadence', or 'type'
  });
  const [collapsedGroups, setCollapsedGroups] = useState(() => {
    const saved = localStorage.getItem('trackerPageCollapsedGroups');
    return saved ? JSON.parse(saved) : {};
  });
  const [viewMode, setViewMode] = useState(() => {
    const saved = localStorage.getItem('trackerPageViewMode');
    return saved || 'table'; // 'grid' or 'table'
  });
  const [showPastSeven, setShowPastSeven] = useState(() => {
    const saved = localStorage.getItem('trackerPageShowPastSeven');
    return saved !== 'false';
  });
  const [showOverdueAlert, setShowOverdueAlert] = useState(true);
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
  const [allNotes, setAllNotes] = useState([]);
  const [flipQueue, setFlipQueue] = useState([]);
  const [showFlipModal, setShowFlipModal] = useState(false);
  const [flipValue, setFlipValue] = useState('');

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

  // Save groupBy to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('trackerPageGroupBy', groupBy);
  }, [groupBy]);

  // Save filterOverdue to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('trackerPageFilterOverdue', filterOverdue.toString());
  }, [filterOverdue]);

  // Save filterUnmarked to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('trackerPageFilterUnmarked', filterUnmarked.toString());
  }, [filterUnmarked]);

  useEffect(() => {
    localStorage.setItem('trackerPageFilterMarked', filterMarked.toString());
  }, [filterMarked]);

  // Save collapsedGroups to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('trackerPageCollapsedGroups', JSON.stringify(collapsedGroups));
  }, [collapsedGroups]);

  useEffect(() => {
    localStorage.setItem('trackerPageShowPastSeven', showPastSeven.toString());
  }, [showPastSeven]);

  // Save viewMode to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('trackerPageViewMode', viewMode);
  }, [viewMode]);

  // Toggle collapse state for a group
  const toggleGroupCollapse = (groupKey) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupKey]: !prev[groupKey]
    }));
  };

  const loadTrackers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await loadAllNotes();
      const notes = Array.isArray(response) ? response : (response?.notes || []);
      setAllNotes(notes);

      const trackerNotes = notes
        .filter(note => note.content && note.content.split('\n').some(line => line === 'meta::tracker'))
        .map(note => {
          const lines = note.content.split('\n');
          const title = lines.find(line => line.startsWith('Title:'))?.replace('Title:', '').trim();
          const question = lines.find(line => line.startsWith('Question:'))?.replace('Question:', '').trim();
          const rawType = lines.find(line => line.startsWith('Type:'))?.replace('Type:', '').trim();
          const rawCadence = lines.find(line => line.startsWith('Cadence:'))?.replace('Cadence:', '').trim();
          const legacyCustomXType = String(rawType || '').trim().toLowerCase() === 'custom_x_days'
            || String(rawType || '').trim().toLowerCase() === 'custom x days';
          const type = legacyCustomXType ? 'value' : rawType;
          const cadence = legacyCustomXType ? 'Custom X Days' : rawCadence;
          const daysStr = lines.find(line => line.startsWith('Days:'))?.replace('Days:', '').trim();
          const days = daysStr ? daysStr.split(',').map(day => day.trim()) : [];
          const startDate = lines.find(line => line.startsWith('Start Date:'))?.replace('Start Date:', '').trim();
          const endDate = lines.find(line => line.startsWith('End Date:'))?.replace('End Date:', '').trim();
          const overdueDays = lines.find(line => line.startsWith('overdue:'))?.replace('overdue:', '').trim();
          const tagsStr = lines.find(line => line.startsWith('Tags:'))?.replace('Tags:', '').trim();

          return {
            id: note.id,
            title,
            question,
            type,
            cadence,
            days,
            startDate,
            endDate,
            tags: tagsStr ? tagsStr.split(',').map(tag => tag.trim()).filter(tag => tag !== '') : [],
            overdueDays: overdueDays || undefined,
            createdAt: note.createdAt,
            watched: lines.some(line => line.trim() === 'meta::tracker_watched'),
            important: lines.some(line => line.trim() === 'meta::tracker_important'),
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
        const notes = lines.find(line => line.startsWith('Notes:'))?.replace('Notes:', '').trim() || '';

        if (link && answerValue && date) {
          // Find the tracker by ID, handling type mismatches (string vs number)
          let tracker = trackerNotes.find(t => {
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
              notes: notes, // Include notes
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

  const handleTrackerConverted = (trackerId, newType) => {
    // Reload trackers to get the updated type
    loadTrackers();
  };

  const handleTrackerDeleted = (trackerId) => {
    // Remove the tracker from state immediately
    setTrackers(prevTrackers => prevTrackers.filter(tracker => tracker.id !== trackerId));
    // Also reload trackers to ensure consistency
    loadTrackers();
  };

  const handleEditTracker = (tracker) => {
    setEditingTracker(tracker);
    setShowAddTracker(true);
  };

  const handleWatchToggle = async (tracker) => {
    try {
      const freshNotes = await loadAllNotes();
      const allNotesList = Array.isArray(freshNotes) ? freshNotes : (freshNotes?.notes || []);
      const note = allNotesList.find(n => String(n.id) === String(tracker.id));
      if (!note) return;
      const lines = note.content.split('\n');
      const isWatched = lines.some(l => l.trim() === 'meta::tracker_watched');
      const updatedContent = isWatched
        ? lines.filter(l => l.trim() !== 'meta::tracker_watched').join('\n')
        : [...lines, 'meta::tracker_watched'].join('\n');
      await updateNoteById(note.id, updatedContent);
      setTrackers(prev => prev.map(t =>
        String(t.id) === String(tracker.id) ? { ...t, watched: !isWatched } : t
      ));
      // Keep global notes state in sync so dashboard reflects the change immediately.
      if (setGlobalNotes) {
        setGlobalNotes(prev => prev.map(n =>
          String(n.id) === String(note.id) ? { ...n, content: updatedContent } : n
        ));
      }
    } catch (err) {
      console.error('Error toggling tracker watch:', err);
    }
  };

  const handleImportantToggle = async (tracker) => {
    try {
      const freshNotes = await loadAllNotes();
      const allNotesList = Array.isArray(freshNotes) ? freshNotes : (freshNotes?.notes || []);
      const note = allNotesList.find(n => String(n.id) === String(tracker.id));
      if (!note) return;
      const lines = note.content.split('\n');
      const isImportant = lines.some(l => l.trim() === 'meta::tracker_important');
      const updatedContent = isImportant
        ? lines.filter(l => l.trim() !== 'meta::tracker_important').join('\n')
        : [...lines, 'meta::tracker_important'].join('\n');
      await updateNoteById(note.id, updatedContent);
      setTrackers(prev => prev.map(t =>
        String(t.id) === String(tracker.id) ? { ...t, important: !isImportant } : t
      ));
      setAllNotes(prev => prev.map(n =>
        String(n.id) === String(note.id) ? { ...n, content: updatedContent } : n
      ));
      if (setGlobalNotes) {
        setGlobalNotes(prev => prev.map(n =>
          String(n.id) === String(note.id) ? { ...n, content: updatedContent } : n
        ));
      }
    } catch (err) {
      console.error('Error toggling tracker importance:', err);
    }
  };

  const handleSaveTags = async (trackerId, newTags) => {
    const note = allNotes.find(n => String(n.id) === String(trackerId));
    if (!note) return;
    const lines = note.content.split('\n');
    const tagsLineIdx = lines.findIndex(l => l.startsWith('Tags:'));
    let updated;
    if (newTags.length === 0) {
      updated = tagsLineIdx !== -1 ? lines.filter((_, i) => i !== tagsLineIdx) : lines;
    } else {
      const newTagsLine = `Tags: ${newTags.join(', ')}`;
      updated = tagsLineIdx !== -1
        ? lines.map((l, i) => i === tagsLineIdx ? newTagsLine : l)
        : [...lines, newTagsLine];
    }
    const updatedContent = updated.join('\n');
    await updateNoteById(note.id, updatedContent);
    // Update in-memory state so tracker.tags reflects change immediately
    setAllNotes(prev => prev.map(n => String(n.id) === String(note.id) ? { ...n, content: updatedContent } : n));
    if (setGlobalNotes) {
      setGlobalNotes(prev => prev.map(n => String(n.id) === String(note.id) ? { ...n, content: updatedContent } : n));
    }
    loadTrackers();
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
        const response = await loadAllNotes();
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
    if (tracker.type.toLowerCase() === 'value' || tracker.type.toLowerCase() === 'adhoc_value') {
      answer = value;
    } else if (tracker.type.toLowerCase().includes('date')) {
      answer = value || dateStr;
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
        const response = await loadAllNotes();
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
          response = await createTrackerAnswerNote(trackerId, answer, dateStr, '', tracker?.title || '');
          console.log('[handleToggleDay] Created new note as fallback', { response });
        } else {
          // Update the Answer line in the existing content
          const lines = existingContent.split('\n');
          let hasAnswerForLine = false;
          const updatedLines = lines.map(line => {
            if (line.startsWith('Answer:')) {
              return `Answer: ${answer}`;
            }
            if (line.startsWith('answer for')) {
              hasAnswerForLine = true;
              // Update the answer for line if tracker name is available
              if (tracker?.title) {
                return `answer for ${tracker.title}`;
              }
            }
            return line;
          });

          // Add answer for line if it doesn't exist and tracker name is available
          let updatedContent = updatedLines.join('\n');
          if (!hasAnswerForLine && tracker?.title) {
            // Find the position after meta::tracker_answer
            const metaTrackerIndex = updatedLines.findIndex(line => line === 'meta::tracker_answer');
            if (metaTrackerIndex >= 0) {
              updatedLines.splice(metaTrackerIndex + 1, 0, `answer for ${tracker.title}`);
              updatedContent = updatedLines.join('\n');
            }
          }

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
        response = await createTrackerAnswerNote(trackerId, answer, dateStr, '', tracker?.title || '');
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
        const idx = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(d.toLowerCase().slice(0, 3));
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

  const getTrackerTargetDate = (tracker) => {
    const today = moment().startOf('day');
    const endDate = tracker.endDate && moment(tracker.endDate).isValid()
      ? moment.min(today, moment(tracker.endDate).startOf('day'))
      : today;

    if (isCustomXDaysTrackerCadence(tracker.cadence)) {
      const lastAnswer = getLatestTrackerAnswer(tracker);
      if (!lastAnswer?.date) return endDate.format('YYYY-MM-DD');
      const { days } = getTrackerOverdueThreshold(tracker);
      const dueDate = moment(lastAnswer.date).startOf('day').add(days, 'days');
      return moment.min(dueDate, endDate).format('YYYY-MM-DD');
    }

    if (!tracker.days || tracker.days.length === 0) {
      return endDate.format('YYYY-MM-DD');
    }

    const selectedDays = tracker.days.map(d => {
      if (typeof d === 'string') {
        const idx = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(d.toLowerCase().slice(0, 3));
        return idx >= 0 ? idx : d;
      }
      return d;
    });

    const cursor = moment(endDate);
    for (let i = 0; i < 14; i++) {
      const dateStr = cursor.format('YYYY-MM-DD');
      if (selectedDays.includes(cursor.day()) && isOnOrAfterStartDate(tracker, dateStr)) {
        return dateStr;
      }
      cursor.subtract(1, 'days');
    }

    return endDate.format('YYYY-MM-DD');
  };

  const isTrackerMarkedForCurrentTarget = (tracker) => {
    const cadence = tracker.cadence ? tracker.cadence.toLowerCase() : '';

    if (isCustomXDaysTrackerCadence(tracker.cadence)) {
      return !isCustomXDaysDue(tracker);
    }

    if (cadence === 'monthly') {
      return isMonthlyCompleted(tracker);
    }

    if (cadence === 'yearly') {
      return isYearlyCompleted(tracker);
    }

    if (cadence === 'weekly' && tracker.days && tracker.days.length > 0) {
      return isWeeklyCompleted(tracker);
    }

    const targetDate = getTrackerTargetDate(tracker);
    return Boolean(tracker.completions && tracker.completions[targetDate]);
  };

  const getDateAgeLabel = (date) => {
    const days = moment().startOf('day').diff(moment(date).startOf('day'), 'days');
    if (days === 0) return 'today';
    if (days > 0) return `${days} day${days !== 1 ? 's' : ''} ago`;
    const daysAhead = Math.abs(days);
    return `in ${daysAhead} day${daysAhead !== 1 ? 's' : ''}`;
  };

  const formatDateWithWeekday = (date) => moment(date).format('YYYY-MM-DD (ddd)');

  const getUnmarkedTrackersForFlip = () => (
    [...trackers]
      .filter(tracker => !isTrackerMarkedForCurrentTarget(tracker))
      .sort(compareTrackersByImportanceThenTitle)
  );

  const getLatestTrackerAnswer = (tracker) => {
    const answers = trackerAnswers[String(tracker.id)] || [];
    if (answers.length === 0) return null;
    return [...answers].sort((a, b) => moment(b.date).valueOf() - moment(a.date).valueOf())[0];
  };

  const isCustomXDaysDue = (tracker) => {
    const lastAnswer = getLatestTrackerAnswer(tracker);
    if (!lastAnswer?.date) return true;
    const { days } = getTrackerOverdueThreshold(tracker);
    const daysSince = moment().startOf('day').diff(moment(lastAnswer.date).startOf('day'), 'days');
    return daysSince >= days;
  };

  const getTrackerFromFlipItem = (item) => item?.type === 'tracker' ? item.tracker : null;

  const getInitialFlipValue = (item) => {
    const tracker = getTrackerFromFlipItem(item);
    const trackerType = tracker?.type ? tracker.type.toLowerCase() : '';
    return trackerType.includes('date') && tracker ? getTrackerTargetDate(tracker) : '';
  };

  const buildFlipQueue = () => {
    const todayKey = moment().format('YYYY-MM-DD');
    const unmarkedTrackers = getUnmarkedTrackersForFlip();
    const todaysTrackers = unmarkedTrackers.filter(tracker => getTrackerTargetDate(tracker) === todayKey);
    const overdueTrackers = unmarkedTrackers.filter(tracker => getTrackerTargetDate(tracker) < todayKey);
    const queue = [];

    if (todaysTrackers.length > 0) {
      queue.push({
        type: 'intro',
        title: "Today's trackers",
        body: `Asking for today's ones first.`,
        count: todaysTrackers.length
      });
      todaysTrackers.forEach(tracker => queue.push({ type: 'tracker', tracker, section: 'today' }));
    }

    if (overdueTrackers.length > 0) {
      queue.push({
        type: 'intro',
        title: 'Overdue trackers',
        body: 'Now asking for yesterday and before.',
        count: overdueTrackers.length
      });
      overdueTrackers.forEach(tracker => queue.push({ type: 'tracker', tracker, section: 'overdue' }));
    }

    return queue;
  };

  const startFlipSession = () => {
    const queue = buildFlipQueue();
    setFlipQueue(queue);
    setShowFlipModal(true);
    setFlipValue(getInitialFlipValue(queue[0]));
  };

  const closeFlipSession = () => {
    setShowFlipModal(false);
    setFlipQueue([]);
    setFlipValue('');
  };

  const advanceFlipSession = () => {
    setFlipQueue(prev => {
      const nextQueue = prev.slice(1);
      setFlipValue(getInitialFlipValue(nextQueue[0]));
      if (nextQueue.length === 0) {
        setShowFlipModal(false);
      }
      return nextQueue;
    });
  };

  const submitFlipAnswer = async (answer) => {
    const tracker = getTrackerFromFlipItem(flipQueue[0]);
    if (!tracker) return;
    const targetDate = getTrackerTargetDate(tracker);
    await handleToggleDay(tracker.id, targetDate, answer);
    advanceFlipSession();
  };

  // Helper function to check if a tracker is overdue
  const isTrackerOverdue = (tracker) => {
    const trackerId = String(tracker.id);
    const answers = trackerAnswers[trackerId] || [];
    if (answers.length === 0) return false; // No entries, not overdue

    // Find the most recent answer
    const sortedAnswers = [...answers].sort((a, b) => new Date(b.date) - new Date(a.date));
    const lastAnswer = sortedAnswers[0];
    if (!lastAnswer || !lastAnswer.date) return false;

    // Calculate days since last entry
    const today = moment().startOf('day');
    const lastDate = moment(lastAnswer.date).startOf('day');
    const daysSince = today.diff(lastDate, 'days');

    const { days: overdueThreshold } = getTrackerOverdueThreshold(tracker);
    return daysSince >= overdueThreshold;
  };

  // Filter trackers based on search term, cadence, type, and overdue status
  const compareTrackersByImportanceThenTitle = (a, b) => {
    if (Boolean(a.important) !== Boolean(b.important)) {
      return a.important ? -1 : 1;
    }
    const nameA = (a.title || '').toLowerCase();
    const nameB = (b.title || '').toLowerCase();
    return nameA.localeCompare(nameB);
  };

  const filteredTrackers = trackers.filter(tracker => {
    // Fuzzy search on title and question
    const matchesSearch = fuzzyMatch(tracker.title || '', searchTerm) ||
      fuzzyMatch(tracker.question || '', searchTerm);
    const matchesCadence = filterCadence === 'all' || tracker.cadence === filterCadence;
    const matchesType = filterType === 'all' || tracker.type === filterType;
    const matchesOverdue = !filterOverdue || isTrackerOverdue(tracker);
    const isMarked = isTrackerMarkedForCurrentTarget(tracker);
    const matchesUnmarked = !filterUnmarked || !isMarked;
    const matchesMarked = !filterMarked || isMarked;
    return matchesSearch && matchesCadence && matchesType && matchesOverdue && matchesUnmarked && matchesMarked;
  }).sort(compareTrackersByImportanceThenTitle);

  // Show all trackers in one unified section - removed pending/completed separation

  // Helper to group trackers by cadence
  // Collect all unique tags used across all trackers for suggestions
  const allTags = [...new Set(trackers.flatMap(t => Array.isArray(t.tags) ? t.tags.filter(Boolean) : []))].sort();

  const groupByCadence = (trackers) => {
    const groups = { yearly: [], monthly: [], weekly: [], daily: [], customXDays: [], custom: [] };
    trackers.forEach(tracker => {
      const cadence = tracker.cadence ? tracker.cadence.toLowerCase() : 'daily';
      if (cadence === 'yearly') groups.yearly.push(tracker);
      else if (cadence === 'monthly') groups.monthly.push(tracker);
      else if (cadence === 'weekly') {
        groups.weekly.push(tracker);
      } else if (isCustomXDaysTrackerCadence(cadence)) {
        groups.customXDays.push(tracker);
      } else if (cadence === 'custom') {
        groups.custom.push(tracker);
      } else {
        groups.daily.push(tracker);
      }
    });
    // Sort each group by name
    Object.keys(groups).forEach(key => {
      groups[key].sort(compareTrackersByImportanceThenTitle);
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
      groups[key].sort(compareTrackersByImportanceThenTitle);
    });
    return groups;
  };

  // Helper to group trackers by tags
  const groupByTags = (trackers) => {
    const groups = {};
    trackers.forEach(tracker => {
      const tags = Array.isArray(tracker.tags) ? tracker.tags : [];

      if (tags.length === 0) {
        if (!groups['untagged']) groups['untagged'] = [];
        groups['untagged'].push(tracker);
      } else {
        tags.forEach(tag => {
          if (!groups[tag]) groups[tag] = [];
          groups[tag].push(tracker);
        });
      }
    });

    // Sort each group by name
    Object.keys(groups).forEach(key => {
      groups[key].sort(compareTrackersByImportanceThenTitle);
    });
    return groups;
  };

  // Use the selected grouping option for all trackers
  const getGroups = () => {
    if (groupBy === 'none') return { _flat: filteredTrackers };
    if (groupBy === 'type') return groupByType(filteredTrackers);
    if (groupBy === 'tags') return groupByTags(filteredTrackers);
    return groupByCadence(filteredTrackers);
  };

  const groups = getGroups();

  const renderGroupedTrackers = (groups) => {
    // Unified section styling
    const sectionBg = 'tracker-list-panel bg-blue-50';

    const renderTrackerCollection = (trackerList) => (
      viewMode === 'grid' ? (
        <TrackerGrid
          trackers={trackerList}
          onToggleDay={handleToggleDay}
          trackerAnswers={trackerAnswers}
          onEdit={handleEditTracker}
          isFocusMode={isFocusMode}
          isDevMode={isDevMode}
          onRefresh={loadTrackers}
          onTrackerConverted={handleTrackerConverted}
          onTrackerDeleted={handleTrackerDeleted}
          onWatch={handleWatchToggle}
          onImportant={handleImportantToggle}
          allTags={allTags}
          onSaveTags={handleSaveTags}
        />
      ) : (
        <TrackerTable
          trackers={trackerList}
          trackerAnswers={trackerAnswers}
          onEdit={handleEditTracker}
          onTrackerDeleted={handleTrackerDeleted}
          onToggleDay={handleToggleDay}
          isFocusMode={isFocusMode}
          groupBy={groupBy}
          showPastSeven={showPastSeven}
        />
      )
    );

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
      } else if (groupBy === 'tags') {
        return key === 'untagged' ? 'Untagged' : key;
      } else {
        // Cadence-based grouping
        const cadenceMap = {
          'yearly': 'Yearly',
          'monthly': 'Monthly',
          'weekly': 'Weekly',
          'daily': 'Daily',
          'custom': 'Custom',
          'custom x days': 'Custom X Days',
          'custom_x_days': 'Custom X Days'
        };
        return cadenceMap[key] || key.charAt(0).toUpperCase() + key.slice(1);
      }
    };

    return (
      <div className={`${sectionBg} rounded-lg p-4 mb-6`}>
        {groupBy === 'none' ? (
          // Render flat list (no grouping)
          renderTrackerCollection(groups._flat || [])
        ) : groupBy === 'cadence' ? (
          // Render cadence-based groups
          <>
            {groups.yearly && groups.yearly.length > 0 && (
              <div className="ml-8">
                <button
                  onClick={() => toggleGroupCollapse('yearly')}
                  className="flex items-center gap-2 text-lg font-semibold mt-4 mb-2 hover:text-blue-600 transition-colors"
                >
                  {collapsedGroups['yearly'] ? (
                    <ChevronRightIcon className="h-5 w-5" />
                  ) : (
                    <ChevronDownIcon className="h-5 w-5" />
                  )}
                  Yearly ({groups.yearly.length})
                </button>
                {!collapsedGroups['yearly'] && renderTrackerCollection(groups.yearly)}
              </div>
            )}
            {groups.monthly && groups.monthly.length > 0 && (
              <div className="ml-8">
                <button
                  onClick={() => toggleGroupCollapse('monthly')}
                  className="flex items-center gap-2 text-lg font-semibold mt-4 mb-2 hover:text-blue-600 transition-colors"
                >
                  {collapsedGroups['monthly'] ? (
                    <ChevronRightIcon className="h-5 w-5" />
                  ) : (
                    <ChevronDownIcon className="h-5 w-5" />
                  )}
                  Monthly ({groups.monthly.length})
                </button>
                {!collapsedGroups['monthly'] && renderTrackerCollection(groups.monthly)}
              </div>
            )}
            {groups.weekly && groups.weekly.length > 0 && (
              <div className="ml-8">
                <button
                  onClick={() => toggleGroupCollapse('weekly')}
                  className="flex items-center gap-2 text-lg font-semibold mt-4 mb-2 hover:text-blue-600 transition-colors"
                >
                  {collapsedGroups['weekly'] ? (
                    <ChevronRightIcon className="h-5 w-5" />
                  ) : (
                    <ChevronDownIcon className="h-5 w-5" />
                  )}
                  Weekly ({groups.weekly.length})
                </button>
                {!collapsedGroups['weekly'] && renderTrackerCollection(groups.weekly)}
              </div>
            )}
            {groups.daily && groups.daily.length > 0 && (
              <div className="ml-8">
                <button
                  onClick={() => toggleGroupCollapse('daily')}
                  className="flex items-center gap-2 text-lg font-semibold mt-4 mb-2 hover:text-blue-600 transition-colors"
                >
                  {collapsedGroups['daily'] ? (
                    <ChevronRightIcon className="h-5 w-5" />
                  ) : (
                    <ChevronDownIcon className="h-5 w-5" />
                  )}
                  Daily ({groups.daily.length})
                </button>
                {!collapsedGroups['daily'] && renderTrackerCollection(groups.daily)}
              </div>
            )}
            {groups.customXDays && groups.customXDays.length > 0 && (
              <div className="ml-8">
                <button
                  onClick={() => toggleGroupCollapse('customXDays')}
                  className="flex items-center gap-2 text-lg font-semibold mt-4 mb-2 hover:text-blue-600 transition-colors"
                >
                  {collapsedGroups['customXDays'] ? (
                    <ChevronRightIcon className="h-5 w-5" />
                  ) : (
                    <ChevronDownIcon className="h-5 w-5" />
                  )}
                  Custom X Days ({groups.customXDays.length})
                </button>
                {!collapsedGroups['customXDays'] && renderTrackerCollection(groups.customXDays)}
              </div>
            )}
            {groups.custom && groups.custom.length > 0 && (
              <div className="ml-8">
                <button
                  onClick={() => toggleGroupCollapse('custom')}
                  className="flex items-center gap-2 text-lg font-semibold mt-4 mb-2 hover:text-blue-600 transition-colors"
                >
                  {collapsedGroups['custom'] ? (
                    <ChevronRightIcon className="h-5 w-5" />
                  ) : (
                    <ChevronDownIcon className="h-5 w-5" />
                  )}
                  Custom ({groups.custom.length})
                </button>
                {!collapsedGroups['custom'] && renderTrackerCollection(groups.custom)}
              </div>
            )}
          </>
        ) : groupBy === 'type' || groupBy === 'tags' ? (
          // Render type-based or tag-based groups
          Object.keys(groups).sort().map(groupKey => {
            const groupTrackers = groups[groupKey];
            if (groupTrackers && groupTrackers.length > 0) {
              const isCollapsed = collapsedGroups[groupKey];
              return (
                <div key={groupKey} className="ml-8">
                  <button
                    onClick={() => toggleGroupCollapse(groupKey)}
                    className="flex items-center gap-2 text-lg font-semibold mt-4 mb-2 hover:text-blue-600 transition-colors"
                  >
                    {isCollapsed ? (
                      <ChevronRightIcon className="h-5 w-5" />
                    ) : (
                      <ChevronDownIcon className="h-5 w-5" />
                    )}
                    {formatGroupTitle(groupKey)} ({groupTrackers.length})
                  </button>
                  {!isCollapsed && renderTrackerCollection(groupTrackers)}
                </div>
              );
            }
            return null;
          })
        ) : (
          null
        )}
      </div>
    );
  };

  const totalCount = filteredTrackers.length;

  // Calculate number of overdue trackers
  const overdueCount = trackers.filter(tracker => isTrackerOverdue(tracker)).length;
  const unmarkedFlipCount = getUnmarkedTrackersForFlip().length;
  const flipItem = flipQueue[0];
  const flipTracker = getTrackerFromFlipItem(flipItem);
  const flipTrackerCount = flipQueue.filter(item => item.type === 'tracker').length;
  const flipTrackerType = flipTracker?.type ? flipTracker.type.toLowerCase() : '';
  const flipTargetDate = flipTracker ? getTrackerTargetDate(flipTracker) : '';
  const isFlipYesNo = flipTrackerType === 'yes,no' || flipTrackerType === 'yesno' || flipTrackerType === 'yes/no';
  const isFlipValue = flipTrackerType === 'value' || flipTrackerType === 'adhoc_value';
  const isFlipDate = flipTrackerType.includes('date');
  const flipQuestion = flipTracker?.question
    ? flipTracker.question.replace(/#date#/g, `${formatDateWithWeekday(flipTargetDate)} (${getDateAgeLabel(flipTargetDate)})`)
    : '';

  return (
    <div className="trackers-page p-8">
      {/* Overdue Trackers Alert */}
      {showOverdueAlert && overdueCount > 0 && (
        <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg shadow-sm relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
              <p className="text-sm font-medium text-red-800">
                There {overdueCount === 1 ? 'is' : 'are'} <span className="font-bold">{overdueCount}</span> overdue tracker{overdueCount !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={() => setShowOverdueAlert(false)}
              className="text-red-400 hover:text-red-600 transition-colors"
              aria-label="Dismiss alert"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Trackers</h1>
        <div className="flex gap-3">
          <button
            onClick={startFlipSession}
            disabled={unmarkedFlipCount === 0}
            className={`px-4 py-2 rounded-lg transition-colors ${unmarkedFlipCount === 0
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
              }`}
          >
            Flip & Record ({unmarkedFlipCount})
          </button>
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
            className={`px-4 py-2 rounded-lg transition-colors ${isFocusMode
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

        {/* Filter Options */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Overdue Filter */}
          <label className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={filterOverdue}
              onChange={(e) => setFilterOverdue(e.target.checked)}
              className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-gray-700">Show Overdue Only</span>
          </label>

          <label className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={filterUnmarked}
              onChange={(e) => {
                setFilterUnmarked(e.target.checked);
                if (e.target.checked) setFilterMarked(false);
              }}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-gray-700">Show Unmarked Only</span>
          </label>

          <label className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="checkbox"
              checked={filterMarked}
              onChange={(e) => {
                setFilterMarked(e.target.checked);
                if (e.target.checked) setFilterUnmarked(false);
              }}
              className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-gray-700">Show Marked Only</span>
          </label>

          {(filterMarked || filterUnmarked) && (
            <button
              type="button"
              onClick={() => {
                setFilterMarked(false);
                setFilterUnmarked(false);
              }}
              className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Exit marked filter
            </button>
          )}

          {/* Group By Buttons */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Group by:</label>
            <div className="flex gap-2">
              <button
                onClick={() => setGroupBy('none')}
                className={`px-3 py-2 rounded-lg transition-colors ${groupBy === 'none'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
              >
                None
              </button>
              <button
                onClick={() => setGroupBy('cadence')}
                className={`px-3 py-2 rounded-lg transition-colors ${groupBy === 'cadence'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
              >
                Cadence
              </button>
              <button
                onClick={() => setGroupBy('type')}
                className={`px-3 py-2 rounded-lg transition-colors ${groupBy === 'type'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
              >
                Type
              </button>
              <button
                onClick={() => setGroupBy('tags')}
                className={`px-3 py-2 rounded-lg transition-colors ${groupBy === 'tags'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
              >
                Tags
              </button>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">View:</label>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'grid'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                  Grid
                </div>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${viewMode === 'table'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  Table
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="tracker-list-header bg-blue-50 rounded-t-lg px-4 pt-4 pb-2 border-b-2 border-blue-200 flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">
          Trackers ({totalCount})
        </h2>
        {viewMode === 'table' && (
          <button
            type="button"
            onClick={() => setShowPastSeven(prev => !prev)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {showPastSeven ? 'Hide Past 7' : 'Show Past 7'}
          </button>
        )}
      </div>
      {renderGroupedTrackers(groups)}
      {showFlipModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-xl w-full relative shadow-xl">
            <button
              type="button"
              onClick={closeFlipSession}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-700 transition-colors"
              aria-label="Close flip tracker modal"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>

            {flipItem?.type === 'intro' ? (
              <div className="flex flex-col gap-5 pr-8">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {flipItem.count} tracker{flipItem.count !== 1 ? 's' : ''}
                  </div>
                  <h2 className="mt-1 text-xl font-bold text-gray-900">{flipItem.title}</h2>
                  <p className="mt-2 text-sm text-gray-600">{flipItem.body}</p>
                </div>
                <button
                  type="button"
                  onClick={advanceFlipSession}
                  className="self-start px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
                >
                  Continue
                </button>
              </div>
            ) : flipTracker ? (
              <div className="flex flex-col gap-5">
                <div className="pr-8">
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {flipTrackerCount} remaining
                  </div>
                  <h2 className="mt-1 text-xl font-bold text-gray-900">{flipTracker.title}</h2>
                  {flipQuestion && (
                    <p className="mt-2 text-sm text-gray-600">{flipQuestion}</p>
                  )}
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="text-sm font-semibold text-gray-900">{formatDateWithWeekday(flipTargetDate)}</div>
                  <div className="text-xs text-gray-500">{getDateAgeLabel(flipTargetDate)}</div>
                </div>

                {isFlipYesNo ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => submitFlipAnswer('yes')}
                      className="px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors"
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => submitFlipAnswer('no')}
                      className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
                    >
                      No
                    </button>
                    <button
                      type="button"
                      onClick={advanceFlipSession}
                      className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                    >
                      Skip for now
                    </button>
                  </div>
                ) : (isFlipValue || isFlipDate) ? (
                  <div className="flex flex-col gap-3">
                    <input
                      type={isFlipDate ? 'date' : 'text'}
                      value={flipValue}
                      onChange={(event) => setFlipValue(event.target.value)}
                      placeholder={isFlipDate ? 'Date' : 'Value'}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const value = flipValue.trim();
                          if (!value) return;
                          submitFlipAnswer(value);
                        }}
                        className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={advanceFlipSession}
                        className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                      >
                        Skip for now
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => submitFlipAnswer('yes')}
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
                    >
                      Done
                    </button>
                    <button
                      type="button"
                      onClick={advanceFlipSession}
                      className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
                    >
                      Skip for now
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-900">All caught up</h2>
                <button
                  type="button"
                  onClick={closeFlipSession}
                  className="mt-4 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {showAddTracker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full relative">
            <AddTracker
              onTrackerAdded={handleTrackerAdded}
              onTrackerUpdated={handleTrackerUpdated}
              editingTracker={editingTracker}
              onCancel={() => { setShowAddTracker(false); setEditingTracker(null); }}
              onTrackerDeleted={handleTrackerDeleted}
                    onWatch={handleWatchToggle}
                    allTags={allTags}
                    onSaveTags={handleSaveTags}
              notes={allNotes}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackerListing; 
