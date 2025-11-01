import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { loadNotes } from '../utils/ApiUtils';
import { getAgeInStringFmt } from '../utils/DateUtils';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import moment from 'moment';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// EnhancedStats component (same as in TrackerCard)
function EnhancedStats({ answers, tracker }) {
  const [timeFilter, setTimeFilter] = useState('all'); // 'all', 'lastMonth', 'last3Months', 'ytd', 'last365Days'
  
  // Check if this is a yes/no tracker
  const isYesNoTracker = tracker.type && tracker.type.toLowerCase().includes('yes');
  
  // Filter answers based on time filter
  const getFilteredAnswers = () => {
    const now = moment();
    let filterStartDate = null;
    
    if (timeFilter === 'all') {
      // When "all" is selected, use tracker's start date or earliest answer date
      if (tracker.startDate) {
        filterStartDate = moment(tracker.startDate);
      } else if (answers.length > 0) {
        const earliestAnswer = answers.reduce((earliest, ans) => {
          return moment(ans.date).isBefore(moment(earliest)) ? ans.date : earliest;
        }, answers[0].date);
        filterStartDate = moment(earliestAnswer);
      } else {
        return answers;
      }
    } else {
      switch (timeFilter) {
        case 'lastMonth':
          filterStartDate = moment().subtract(1, 'months').startOf('month');
          break;
        case 'last3Months':
          filterStartDate = moment().subtract(3, 'months').startOf('month');
          break;
        case 'ytd':
          filterStartDate = moment().startOf('year');
          break;
        case 'last365Days':
          filterStartDate = moment().subtract(365, 'days');
          break;
        default:
          return answers;
      }
    }
    
    return answers.filter(ans => moment(ans.date).isSameOrAfter(filterStartDate));
  };
  
  const filteredAnswers = getFilteredAnswers();
  
  if (!answers || answers.length === 0) {
    return (
      <div>
        <div className="flex flex-wrap gap-2 mb-3">
          {['all', 'lastMonth', 'last3Months', 'ytd', 'last365Days'].map(filter => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                timeFilter === filter
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {filter === 'all' ? 'All Events' :
               filter === 'lastMonth' ? 'Last Month' :
               filter === 'last3Months' ? 'Last 3 Months' :
               filter === 'ytd' ? 'YTD' :
               'Last 365 Days'}
            </button>
          ))}
        </div>
        <div className="text-gray-400 italic text-center">No check-ins yet.</div>
      </div>
    );
  }
  
  if (!filteredAnswers || filteredAnswers.length === 0) {
    return (
      <div>
        <div className="flex flex-wrap gap-2 mb-3">
          {['all', 'lastMonth', 'last3Months', 'ytd', 'last365Days'].map(filter => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                timeFilter === filter
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {filter === 'all' ? 'All Events' :
               filter === 'lastMonth' ? 'Last Month' :
               filter === 'last3Months' ? 'Last 3 Months' :
               filter === 'ytd' ? 'YTD' :
               'Last 365 Days'}
            </button>
          ))}
        </div>
        <div className="text-gray-400 italic text-center">No check-ins in selected period.</div>
      </div>
    );
  }

  // Sort answers by date ascending
  const sorted = [...filteredAnswers].sort((a, b) => new Date(a.date) - new Date(b.date));
  const firstDate = sorted[0]?.date;
  const lastDate = sorted[sorted.length - 1]?.date;
  const total = sorted.length;

  // Calculate unmarked count for yes/no trackers
  // Unmarked = dates between first and last check-in that don't have an answer
  let unmarkedCount = null;
  if (isYesNoTracker && firstDate && lastDate) {
    const firstMoment = moment(firstDate);
    const lastMoment = moment(lastDate);
    const totalDays = lastMoment.diff(firstMoment, 'days') + 1;
    const answeredDates = new Set(sorted.map(ans => moment(ans.date).format('YYYY-MM-DD')));
    unmarkedCount = totalDays - answeredDates.size;
  }

  // Calculate ages
  const firstDateAge = firstDate ? getAgeInStringFmt(new Date(firstDate)) : null;
  const lastDateAge = lastDate ? getAgeInStringFmt(new Date(lastDate)) : null;
  
  // Calculate total duration from first check-in to today
  let totalDuration = null;
  if (firstDate) {
    const firstMoment = moment(firstDate);
    const todayMoment = moment();
    const years = todayMoment.diff(firstMoment, 'years');
    const months = moment(todayMoment).subtract(years, 'years').diff(firstMoment, 'months');
    const days = moment(todayMoment).subtract(years, 'years').subtract(months, 'months').diff(firstMoment, 'days');
    
    const parts = [];
    if (years > 0) parts.push(`${years} ${years === 1 ? 'year' : 'years'}`);
    if (months > 0) parts.push(`${months} ${months === 1 ? 'month' : 'months'}`);
    if (days > 0 || parts.length === 0) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
    totalDuration = parts.join(', ');
  }

  // Yes/No breakdown
  let yes = 0, no = 0, valueCount = 0;
  const yesAnswers = [];
  const noAnswers = [];
  sorted.forEach(ans => {
    if (typeof ans.answer === 'string') {
      if (ans.answer.toLowerCase() === 'yes') {
        yes++;
        yesAnswers.push(ans);
      } else if (ans.answer.toLowerCase() === 'no') {
        no++;
        noAnswers.push(ans);
      } else {
        valueCount++;
      }
    } else if (ans.value !== undefined) {
      valueCount++;
    }
  });

  // Calculate first and last check-in for yes/no events
  let firstYesDate = null, lastYesDate = null, firstYesDateAge = null, lastYesDateAge = null;
  let firstNoDate = null, lastNoDate = null, firstNoDateAge = null, lastNoDateAge = null;
  
  if (isYesNoTracker) {
    if (yesAnswers.length > 0) {
      const sortedYes = [...yesAnswers].sort((a, b) => new Date(a.date) - new Date(b.date));
      firstYesDate = sortedYes[0].date;
      lastYesDate = sortedYes[sortedYes.length - 1].date;
      firstYesDateAge = firstYesDate ? getAgeInStringFmt(new Date(firstYesDate)) : null;
      lastYesDateAge = lastYesDate ? getAgeInStringFmt(new Date(lastYesDate)) : null;
    }
    
    if (noAnswers.length > 0) {
      const sortedNo = [...noAnswers].sort((a, b) => new Date(a.date) - new Date(b.date));
      firstNoDate = sortedNo[0].date;
      lastNoDate = sortedNo[sortedNo.length - 1].date;
      firstNoDateAge = firstNoDate ? getAgeInStringFmt(new Date(firstNoDate)) : null;
      lastNoDateAge = lastNoDate ? getAgeInStringFmt(new Date(lastNoDate)) : null;
    }
  }

  // Check if this is a value-based tracker
  const isValueTracker = tracker.type && tracker.type.toLowerCase() === 'value';
  
  // Calculate total range for value-based trackers
  let firstValue = null;
  let lastValue = null;
  let valueDifference = null;
  
  if (isValueTracker && sorted.length > 0) {
    // Extract numeric values from answers
    const values = sorted
      .map(ans => {
        if (ans.value !== undefined) {
          return parseFloat(ans.value);
        } else if (typeof ans.answer === 'string') {
          return parseFloat(ans.answer);
        }
        return null;
      })
      .filter(val => val !== null && !isNaN(val));
    
    if (values.length > 0) {
      firstValue = values[0];
      lastValue = values[values.length - 1];
      valueDifference = lastValue - firstValue;
    }
  }

  // Completion rate (for daily trackers)
  let completionRate = null;
  if (tracker.cadence && tracker.cadence.toLowerCase() === 'daily' && firstDate) {
    const daysBetween = Math.max(1, Math.ceil((new Date(lastDate) - new Date(firstDate)) / (1000*60*60*24)) + 1);
    completionRate = (total / daysBetween) * 100;
  }

  // Prepare chart data - include all dates from start date to last check-in (or today)
  const chartStartDate = timeFilter === 'all' && tracker.startDate 
    ? moment(tracker.startDate)
    : (sorted.length > 0 ? moment(sorted[0].date) : moment());
  const chartEndDate = sorted.length > 0 ? moment(sorted[sorted.length - 1].date) : moment();
  
  // Generate all dates in range
  const allDates = [];
  const currentDate = moment(chartStartDate);
  while (currentDate.isSameOrBefore(chartEndDate)) {
    allDates.push(currentDate.format('YYYY-MM-DD'));
    currentDate.add(1, 'day');
  }
  
  // Create a map of answered dates
  const answeredDatesMap = new Map();
  sorted.forEach(ans => {
    const dateKey = moment(ans.date).format('YYYY-MM-DD');
    answeredDatesMap.set(dateKey, ans);
  });
  
  // Prepare chart data with all dates
  // For "All Events", show all dates; for other filters, limit to last 200 days if too many
  const maxDaysToShow = timeFilter === 'all' ? Infinity : 200;
  const datesToShow = allDates.length > maxDaysToShow ? allDates.slice(-maxDaysToShow) : allDates;
  const chartLabels = datesToShow.map(date => moment(date).format('DD MMM YYYY'));
  
  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        label: isYesNoTracker ? 'Yes' : 'Value',
        data: datesToShow.map(date => {
          const answer = answeredDatesMap.get(date);
          if (answer) {
            if (typeof answer.answer === 'string') {
              // For yes/no: yes = 1 (above), no = -1 (below)
              if (answer.answer.toLowerCase() === 'yes') return 1;
              if (answer.answer.toLowerCase() === 'no') return -1;
              return parseFloat(answer.answer) || 0;
            }
            if (answer.value !== undefined) return parseFloat(answer.value) || 0;
          }
          // For unmarked dates in yes/no trackers, show as 0 (yellow indicator)
          // For other trackers, show as null (gap in line)
          return isYesNoTracker ? 0 : null;
        }),
        // For yes/no trackers, use conditional colors per bar
        backgroundColor: isYesNoTracker
          ? datesToShow.map(date => {
              const answer = answeredDatesMap.get(date);
              if (!answer) return 'rgba(234, 179, 8, 0.3)'; // Yellow for unmarked
              const answerValue = typeof answer.answer === 'string' ? answer.answer.toLowerCase() : '';
              return answerValue === 'yes' ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)';
            })
          : datesToShow.map(date => {
              return answeredDatesMap.has(date) ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 179, 8, 0.3)';
            }),
        borderColor: isYesNoTracker
          ? datesToShow.map(date => {
              const answer = answeredDatesMap.get(date);
              if (!answer) return 'rgba(234, 179, 8, 0.8)'; // Yellow border for unmarked
              const answerValue = typeof answer.answer === 'string' ? answer.answer.toLowerCase() : '';
              return answerValue === 'yes' ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)';
            })
          : datesToShow.map(date => {
              return answeredDatesMap.has(date) ? 'rgb(34, 197, 94)' : 'rgba(234, 179, 8, 0.8)';
            }),
        borderWidth: isYesNoTracker ? 1 : 1,
        // Line chart specific properties
        tension: isYesNoTracker ? undefined : 0.2,
        fill: isYesNoTracker ? false : true,
        pointRadius: isYesNoTracker ? undefined : 2,
      },
    ],
  };
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function(context) {
            if (tracker.type && tracker.type.toLowerCase().includes('yes')) {
              if (context.parsed.y === 1) return 'Yes';
              if (context.parsed.y === -1) return 'No';
              if (context.parsed.y === 0 || context.parsed.y === null) return 'Unmarked';
              return '';
            }
            if (context.parsed.y === null) return 'Unmarked';
            return context.parsed.y;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: tracker.type && tracker.type.toLowerCase().includes('yes') ? false : true,
        ticks: {
          stepSize: tracker.type && tracker.type.toLowerCase().includes('yes') ? 1 : undefined,
          callback: function(value) {
            if (tracker.type && tracker.type.toLowerCase().includes('yes')) {
              if (value === 1) return 'Yes';
              if (value === -1) return 'No';
              if (value === 0) return '';
              return '';
            }
            return value;
          }
        },
        min: tracker.type && tracker.type.toLowerCase().includes('yes') ? -1 : undefined,
        max: tracker.type && tracker.type.toLowerCase().includes('yes') ? 1 : undefined,
      }
    }
  };

  return (
    <div>
      {/* Time Filter Buttons */}
      <div className="flex flex-wrap gap-2 mb-3">
        {['all', 'lastMonth', 'last3Months', 'ytd', 'last365Days'].map(filter => (
          <button
            key={filter}
            onClick={() => setTimeFilter(filter)}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              timeFilter === filter
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {filter === 'all' ? 'All Events' :
             filter === 'lastMonth' ? 'Last Month' :
             filter === 'last3Months' ? 'Last 3 Months' :
             filter === 'ytd' ? 'YTD' :
             'Last 365 Days'}
          </button>
        ))}
      </div>
      
      {/* Stats Section */}
      <div className="text-sm mb-4 space-y-1">
        <div className="flex items-center gap-4 flex-wrap">
          {tracker.type && (
            <div><span className="font-semibold">Type:</span> {tracker.type}</div>
          )}
          {tracker.cadence && (
            <div><span className="font-semibold">Cadence:</span> {tracker.cadence}</div>
          )}
          {tracker.startDate && (
            <div>
              <span className="font-semibold">Start Date:</span> {moment(tracker.startDate).format('DD MMM YYYY')}
            </div>
          )}
        </div>
        <div><span className="font-semibold">Total Check-ins:</span> {total}</div>
        {!isYesNoTracker && (
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <span className="font-semibold">First Check-in:</span> {firstDate ? new Date(firstDate).toLocaleDateString() : 'N/A'}
              {firstDateAge && <span className="text-gray-500"> ({firstDateAge})</span>}
            </div>
            <div>
              <span className="font-semibold">Last Check-in:</span> {lastDate ? new Date(lastDate).toLocaleDateString() : 'N/A'}
              {lastDateAge && <span className="text-gray-500"> ({lastDateAge})</span>}
            </div>
          </div>
        )}
        {isYesNoTracker && (
          <>
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <span className="font-semibold">First Check-in:</span> {firstDate ? new Date(firstDate).toLocaleDateString() : 'N/A'}
                {firstDateAge && <span className="text-gray-500"> ({firstDateAge})</span>}
              </div>
              <div>
                <span className="font-semibold">Last Check-in:</span> {lastDate ? new Date(lastDate).toLocaleDateString() : 'N/A'}
                {lastDateAge && <span className="text-gray-500"> ({lastDateAge})</span>}
              </div>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <span className="font-semibold">First Yes:</span> {firstYesDate ? new Date(firstYesDate).toLocaleDateString() : 'N/A'}
                {firstYesDateAge && <span className="text-gray-500"> ({firstYesDateAge})</span>}
              </div>
              <div>
                <span className="font-semibold">Last Yes:</span> {lastYesDate ? new Date(lastYesDate).toLocaleDateString() : 'N/A'}
                {lastYesDateAge && <span className="text-gray-500"> ({lastYesDateAge})</span>}
              </div>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <div>
                <span className="font-semibold">First No:</span> {firstNoDate ? new Date(firstNoDate).toLocaleDateString() : 'N/A'}
                {firstNoDateAge && <span className="text-gray-500"> ({firstNoDateAge})</span>}
              </div>
              <div>
                <span className="font-semibold">Last No:</span> {lastNoDate ? new Date(lastNoDate).toLocaleDateString() : 'N/A'}
                {lastNoDateAge && <span className="text-gray-500"> ({lastNoDateAge})</span>}
              </div>
            </div>
          </>
        )}
        {totalDuration && (
          <div>
            <span className="font-semibold">Total Duration:</span> {totalDuration} (from first check-in to today)
          </div>
        )}
        {isValueTracker && firstValue !== null && lastValue !== null && (
          <div>
            <span className="font-semibold">Total Range:</span> {firstValue} to {lastValue} ({valueDifference >= 0 ? '+' : ''}{valueDifference.toFixed(2)})
          </div>
        )}
        {tracker.type && tracker.type.toLowerCase().includes('yes') && (
          <div className="flex items-center gap-4 flex-wrap">
            <div><span className="font-semibold">Yes:</span> {yes}</div>
            <div><span className="font-semibold">No:</span> {no}</div>
            {unmarkedCount !== null && (
              <div><span className="font-semibold">Unmarked:</span> {unmarkedCount}</div>
            )}
          </div>
        )}
        {completionRate !== null && (
          <div><span className="font-semibold">Completion Rate:</span> {completionRate.toFixed(1)}%</div>
        )}
      </div>
      
      {/* Chart */}
      <div className="mb-4">
        {isYesNoTracker ? (
          <Bar data={chartData} options={chartOptions} height={120} />
        ) : (
          <Line data={chartData} options={chartOptions} height={120} />
        )}
      </div>
    </div>
  );
}

const TrackerStatsAnalysisPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [trackers, setTrackers] = useState([]);
  const [trackerAnswers, setTrackerAnswers] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTrackers, setSelectedTrackers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingTrackerId, setPendingTrackerId] = useState(null);

  // Store tracker ID from URL when component mounts or URL changes
  useEffect(() => {
    let trackerId = null;
    
    // Try location.search first
    if (location.search) {
      const searchParams = new URLSearchParams(location.search);
      trackerId = searchParams.get('tracker');
      console.log('[TrackerStatsAnalysis] Storing tracker ID from location.search:', trackerId);
    }
    
    // If not in search, try location.hash (HashRouter uses hash for query params)
    if (!trackerId && location.hash) {
      console.log('[TrackerStatsAnalysis] Checking location.hash for tracker ID:', location.hash);
      const hashParts = location.hash.split('?');
      if (hashParts.length > 1) {
        const searchParams = new URLSearchParams(hashParts[1]);
        trackerId = searchParams.get('tracker');
        console.log('[TrackerStatsAnalysis] Storing tracker ID from location.hash:', trackerId);
      }
    }
    
    if (trackerId) {
      console.log('[TrackerStatsAnalysis] Setting pending tracker ID:', trackerId);
      setPendingTrackerId(trackerId);
    }
  }, [location.search, location.hash]);

  useEffect(() => {
    loadTrackers();
  }, []);

  // Auto-select tracker from URL parameter once trackers are loaded
  useEffect(() => {
    console.log('[TrackerStatsAnalysis] Auto-select useEffect triggered', {
      trackersLength: trackers.length,
      pendingTrackerId: pendingTrackerId,
      currentSelectedTrackers: selectedTrackers
    });
    
    if (!pendingTrackerId) {
      console.log('[TrackerStatsAnalysis] No pending tracker ID');
      return;
    }
    
    if (trackers.length === 0) {
      console.log('[TrackerStatsAnalysis] Trackers not loaded yet, returning');
      return;
    }
    
    const trackerId = pendingTrackerId;
    console.log('[TrackerStatsAnalysis] Looking for tracker with ID:', trackerId);
    console.log('[TrackerStatsAnalysis] Available tracker IDs:', trackers.map(t => ({ id: t.id, type: typeof t.id, title: t.title })));
    
    // Check if tracker exists (handle both string and number IDs)
    const trackerExists = trackers.find(t => {
      // Try exact match first
      if (String(t.id) === String(trackerId)) {
        console.log('[TrackerStatsAnalysis] Found exact match:', t.id, '===', trackerId);
        return true;
      }
      // Try numeric comparison
      const tId = typeof t.id === 'number' ? t.id : parseInt(t.id);
      const urlId = parseInt(trackerId);
      if (!isNaN(tId) && !isNaN(urlId)) {
        if (tId === urlId) {
          console.log('[TrackerStatsAnalysis] Found numeric match:', tId, '===', urlId);
          return true;
        }
      }
      return false;
    });
    
    if (!trackerExists) {
      console.log('[TrackerStatsAnalysis] Tracker not found with ID:', trackerId);
      return;
    }
    
    console.log('[TrackerStatsAnalysis] Tracker found:', {
      trackerId: trackerExists.id,
      trackerTitle: trackerExists.title,
      trackerIdType: typeof trackerExists.id
    });
    
    const idToUse = trackerExists.id;
    console.log('[TrackerStatsAnalysis] ID to use:', idToUse, 'Type:', typeof idToUse);
    
    // Check if already selected (compare as strings to avoid type issues)
    const isAlreadySelected = selectedTrackers.some(selectedId => {
      const match = String(selectedId) === String(idToUse);
      if (match) {
        console.log('[TrackerStatsAnalysis] Already selected:', selectedId, '===', idToUse);
      }
      return match;
    });
    
    if (isAlreadySelected) {
      console.log('[TrackerStatsAnalysis] Tracker already selected, skipping');
      return;
    }
    
    console.log('[TrackerStatsAnalysis] Setting selected trackers to:', [idToUse]);
    setSelectedTrackers([idToUse]);
    // Clear pending tracker ID after successful selection
    setPendingTrackerId(null);
  }, [pendingTrackerId, trackers, selectedTrackers]);

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
            completions: {}
          };
        });
      setTrackers(trackerNotes);

      // Load tracker answers
      const answers = notes.filter(note => note.content.split('\n').some(line => line === 'meta::tracker_answer'));
      const answersByTracker = {};
      
      answers.forEach(answer => {
        const lines = answer.content.split('\n');
        const link = lines.find(line => line.startsWith('meta::link:'))?.replace('meta::link:', '').trim();
        const answerValue = lines.find(line => line.startsWith('Answer:'))?.replace('Answer:', '').trim();
        const date = lines.find(line => line.startsWith('Date:'))?.replace('Date:', '').trim();
        
        if (link && answerValue && date) {
          if (!answersByTracker[link]) {
            answersByTracker[link] = [];
          }
          answersByTracker[link].push({
            id: answer.id,
            date,
            answer: answerValue,
            value: answerValue, // For value trackers, answer and value are the same
            age: getAgeInStringFmt(new Date(date))
          });
        }
      });

      setTrackerAnswers(answersByTracker);
    } catch (err) {
      setError('Failed to load trackers. Please try again.');
      console.error('Error loading trackers:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrackerClick = (trackerId) => {
    setSelectedTrackers(prev => {
      if (prev.includes(trackerId)) {
        return prev.filter(id => id !== trackerId);
      } else {
        return [...prev, trackerId];
      }
    });
  };

  const selectedTrackersList = trackers.filter(t => {
    return selectedTrackers.some(selectedId => 
      String(selectedId) === String(t.id) || selectedId === t.id
    );
  });
  
  // Filter trackers based on search query
  const filteredTrackers = trackers.filter(tracker => 
    tracker.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (tracker.question && tracker.question.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/trackers')}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Back to Trackers"
        >
          <ArrowLeftIcon className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold">Tracker Stats Analysis</h1>
      </div>
      
      {/* Tracker Selection Buttons */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-3">
          <h2 className="text-lg font-semibold text-gray-700">Select Trackers:</h2>
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search trackers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
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
        </div>
        <div className="flex flex-wrap gap-2">
          {filteredTrackers.map(tracker => {
            const isSelected = selectedTrackers.some(selectedId => 
              String(selectedId) === String(tracker.id) || selectedId === tracker.id
            );
            return (
              <button
                key={tracker.id}
                onClick={() => handleTrackerClick(tracker.id)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${
                  isSelected
                    ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
                }`}
              >
                {tracker.title}
              </button>
            );
          })}
        </div>
        {trackers.length === 0 && (
          <div className="text-gray-400 italic">No trackers found.</div>
        )}
        {trackers.length > 0 && filteredTrackers.length === 0 && (
          <div className="text-gray-400 italic">No trackers match your search.</div>
        )}
      </div>

      {/* Stats Display for Selected Trackers */}
      {selectedTrackersList.length > 0 && (
        <div className="space-y-8">
          {selectedTrackersList.map(tracker => (
            <div key={tracker.id} className="bg-white rounded-lg shadow-sm p-6 border">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">{tracker.title}</h2>
              <EnhancedStats 
                answers={trackerAnswers[tracker.id] || []} 
                tracker={tracker} 
              />
            </div>
          ))}
        </div>
      )}
      
      {selectedTrackersList.length === 0 && trackers.length > 0 && (
        <div className="text-center text-gray-400 py-8 bg-white rounded-lg border">
          Select trackers above to view their stats.
        </div>
      )}
    </div>
  );
};

export default TrackerStatsAnalysisPage;

