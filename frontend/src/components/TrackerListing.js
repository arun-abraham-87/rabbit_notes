import React, { useState, useEffect } from 'react';
import { loadNotes, updateNoteById, deleteNoteById } from '../utils/ApiUtils';
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
  const [trackers, setTrackers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddTracker, setShowAddTracker] = useState(false);
  const [editingTracker, setEditingTracker] = useState(null);
  const [filterCadence, setFilterCadence] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [trackerStats, setTrackerStats] = useState({});
  const [showAnswers, setShowAnswers] = useState(null);
  const [trackerAnswers, setTrackerAnswers] = useState({});
  const [showRawNote, setShowRawNote] = useState(null);
  const [rawNotes, setRawNotes] = useState({});
  const [showGraph, setShowGraph] = useState(null);
  const [graphData, setGraphData] = useState({});
  const [deletingAnswerId, setDeletingAnswerId] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [completedCollapsed, setCompletedCollapsed] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);

  useEffect(() => {
    loadTrackers();
  }, []);

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
          if (!stats[link]) {
            stats[link] = { yes: 0, no: 0, total: 0 };
          }
          if (answerValue.toLowerCase() === 'yes') {
            stats[link].yes++;
          } else if (answerValue.toLowerCase() === 'no') {
            stats[link].no++;
          }
          stats[link].total++;

          if (!answersByTracker[link]) {
            answersByTracker[link] = [];
          }
          answersByTracker[link].push({
            id: answer.id,
            date,
            answer: answerValue,
            age: getAgeInStringFmt(new Date(date))
          });
          rawNotesByAnswer[answer.id] = answer.content;

          // Set completions for the tracker
          const tracker = trackerNotes.find(t => t.id === link);
          if (tracker) {
            tracker.completions[date] = true; // Mark as completed if there's an answer
          }

          // Prepare graph data
          if (!graphDataByTracker[link]) {
            graphDataByTracker[link] = {
              dates: [],
              yesCounts: [],
              noCounts: []
            };
          }
          graphDataByTracker[link].dates.push(date);
          graphDataByTracker[link].yesCounts.push(
            answerValue.toLowerCase() === 'yes' ? 1 : 0
          );
          graphDataByTracker[link].noCounts.push(
            answerValue.toLowerCase() === 'no' ? 1 : 0
          );
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

  const filteredTrackers = trackers.filter(tracker => {
    const matchesSearch = (!tracker.title || tracker.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (!tracker.question || tracker.question.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCadence = filterCadence === 'all' || tracker.cadence === filterCadence;
    const matchesType = filterType === 'all' || tracker.type === filterType;
    return matchesSearch && matchesCadence && matchesType;
  });

  // Toggle completion for a tracker on a given date
  const handleToggleDay = async (trackerId, dateStr, value = null) => {
    const tracker = trackers.find(t => t.id === trackerId);
    if (!tracker) return;

    let answer;
    if (tracker.type.toLowerCase() === 'value') {
      answer = value;
    } else if (tracker.type.toLowerCase().includes('yes')) {
      answer = value; // value should be 'yes' or 'no' from TrackerCard
    } else {
      answer = 'no';
    }
    try {
      const response = await createTrackerAnswerNote(trackerId, answer, dateStr);
      if (response && response.id) {
        setTrackers(prev => prev.map(t => {
          if (t.id !== trackerId) return t;
          const completions = { ...t.completions };
          completions[dateStr] = !completions[dateStr];
          return { ...t, completions };
        }));
        // Update trackerAnswers for immediate UI feedback
        setTrackerAnswers(prev => {
          const prevAnswers = prev[trackerId] || [];
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
          }
          return { ...prev, [trackerId]: newAnswers };
        });
        toast.success('Answer recorded successfully');
      } else {
        throw new Error('Failed to create answer note');
      }
    } catch (error) {
      console.error('Error recording answer:', error);
      toast.error('Failed to record answer: ' + error.message);
    }
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

  const pendingTrackers = trackers.filter(tracker => {
    let relevantDateStr = todayStr;
    if (tracker.cadence && tracker.cadence.toLowerCase() === 'monthly') {
      relevantDateStr = currentMonthStr + '-01';
      if (!isOnOrAfterStartDate(tracker, relevantDateStr)) return false;
      return !isMonthlyCompleted(tracker);
    }
    if (tracker.cadence && tracker.cadence.toLowerCase() === 'yearly') {
      relevantDateStr = currentYearStr + '-01-01';
      if (!isOnOrAfterStartDate(tracker, relevantDateStr)) return false;
      return !isYearlyCompleted(tracker);
    }
    if (tracker.cadence && tracker.cadence.toLowerCase() === 'weekly') {
      const lastRelevant = getLastRelevantWeeklyDate(tracker);
      if (!lastRelevant || !isOnOrAfterStartDate(tracker, lastRelevant)) return false;
      return !isWeeklyCompleted(tracker);
    }
    // Daily or default
    if (!isOnOrAfterStartDate(tracker, todayStr)) return false;
    return !(tracker.completions && tracker.completions[todayStr]);
  });

  const completedTrackers = trackers.filter(tracker => {
    let relevantDateStr = todayStr;
    if (tracker.cadence && tracker.cadence.toLowerCase() === 'monthly') {
      relevantDateStr = currentMonthStr + '-01';
      if (!isOnOrAfterStartDate(tracker, relevantDateStr)) return false;
      return isMonthlyCompleted(tracker);
    }
    if (tracker.cadence && tracker.cadence.toLowerCase() === 'yearly') {
      relevantDateStr = currentYearStr + '-01-01';
      if (!isOnOrAfterStartDate(tracker, relevantDateStr)) return false;
      return isYearlyCompleted(tracker);
    }
    if (tracker.cadence && tracker.cadence.toLowerCase() === 'weekly') {
      const lastRelevant = getLastRelevantWeeklyDate(tracker);
      if (!lastRelevant || !isOnOrAfterStartDate(tracker, lastRelevant)) return false;
      return isWeeklyCompleted(tracker);
    }
    // Daily or default
    if (!isOnOrAfterStartDate(tracker, todayStr)) return false;
    return tracker.completions && tracker.completions[todayStr];
  });

  // Helper to group trackers by cadence
  const groupByCadence = (trackers) => {
    const groups = { yearly: [], monthly: [], weekly: [], daily: [], custom: [] };
    trackers.forEach(tracker => {
      const cadence = tracker.cadence ? tracker.cadence.toLowerCase() : 'daily';
      if (cadence === 'yearly') groups.yearly.push(tracker);
      else if (cadence === 'monthly') groups.monthly.push(tracker);
      else if (cadence === 'weekly') {
        // If you want to distinguish custom, you can add logic here
        groups.weekly.push(tracker);
      } else {
        groups.daily.push(tracker);
      }
    });
    return groups;
  };

  const pendingGroups = groupByCadence(pendingTrackers);
  const completedGroups = groupByCadence(completedTrackers);

  const renderGroupedTrackers = (groups, sectionType) => {
    // sectionType: 'pending' or 'completed' for different shades
    const sectionBg = sectionType === 'pending' ? 'bg-blue-50' : 'bg-green-50';
    return (
      <div className={`${sectionBg} rounded-lg p-4 mb-6`}>
        {groups.yearly.length > 0 && (
          <div className="ml-8">
            <h3 className="text-lg font-semibold mt-4 mb-2">Yearly</h3>
            <TrackerGrid 
              trackers={groups.yearly} 
              onToggleDay={handleToggleDay} 
              trackerAnswers={trackerAnswers} 
              onEdit={handleEditTracker}
              isFocusMode={isFocusMode}
            />
          </div>
        )}
        {groups.monthly.length > 0 && (
          <div className="ml-8">
            <h3 className="text-lg font-semibold mt-4 mb-2">Monthly</h3>
            <TrackerGrid 
              trackers={groups.monthly} 
              onToggleDay={handleToggleDay} 
              trackerAnswers={trackerAnswers} 
              onEdit={handleEditTracker}
              isFocusMode={isFocusMode}
            />
          </div>
        )}
        {groups.weekly.length > 0 && (
          <div className="ml-8">
            <h3 className="text-lg font-semibold mt-4 mb-2">Weekly</h3>
            <TrackerGrid 
              trackers={groups.weekly} 
              onToggleDay={handleToggleDay} 
              trackerAnswers={trackerAnswers} 
              onEdit={handleEditTracker}
              isFocusMode={isFocusMode}
            />
          </div>
        )}
        {groups.daily.length > 0 && (
          <div className="ml-8">
            <h3 className="text-lg font-semibold mt-4 mb-2">Daily</h3>
            <TrackerGrid 
              trackers={groups.daily} 
              onToggleDay={handleToggleDay} 
              trackerAnswers={trackerAnswers} 
              onEdit={handleEditTracker}
              isFocusMode={isFocusMode}
            />
        </div>
        )}
      </div>
    );
  };

  const totalCount = pendingTrackers.length + completedTrackers.length;

  // Remove grouping for pending section
  const renderPendingTrackers = () => {
    return (
      <div className={`bg-blue-50 rounded-lg p-4 mb-6`}>
        <TrackerGrid 
          trackers={pendingTrackers} 
          onToggleDay={handleToggleDay} 
          trackerAnswers={trackerAnswers} 
          onEdit={handleEditTracker}
          isFocusMode={isFocusMode}
        />
      </div>
    );
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Trackers</h1>
        <div className="flex gap-3">
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
      <div className="bg-blue-50 rounded-t-lg px-4 pt-4 pb-2 border-b-2 border-blue-200">
        <h2 className="text-xl font-semibold">
          Check-in Pending ({pendingTrackers.length}/{totalCount})
        </h2>
      </div>
      {renderPendingTrackers()}
      <div className="bg-green-50 rounded-t-lg px-4 pt-4 pb-2 border-b-2 border-green-200 mt-8 flex items-center justify-between cursor-pointer" onClick={() => setCompletedCollapsed(c => !c)}>
        <h2 className="text-xl font-semibold">
          Check-in Completed ({completedTrackers.length}/{totalCount})
        </h2>
        <button className="ml-2 text-lg focus:outline-none" aria-label="Toggle Completed Section">
          {completedCollapsed ? '▼' : '▲'}
        </button>
      </div>
      {!completedCollapsed && renderGroupedTrackers(completedGroups, 'completed')}
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