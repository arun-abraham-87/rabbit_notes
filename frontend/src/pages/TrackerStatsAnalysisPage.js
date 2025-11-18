import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { loadNotes, updateNoteById, deleteNoteById } from '../utils/ApiUtils';
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
import { ArrowLeftIcon, CalendarIcon } from '@heroicons/react/24/solid';
import { createTrackerAnswerNote } from '../utils/TrackerQuestionUtils';
import { toast } from 'react-hot-toast';

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
  const [excludeUnmarked, setExcludeUnmarked] = useState(true);
  
  // Check if this is a yes/no tracker
  const isYesNoTracker = tracker.type && tracker.type.toLowerCase().includes('yes');
  
  // Check if this is an adhoc tracker
  const isAdhocDate = tracker.type && tracker.type.toLowerCase() === 'adhoc_date';
  const isAdhocValue = tracker.type && tracker.type.toLowerCase() === 'adhoc_value';
  
  // Filter answers based on time filter
  const getFilteredAnswers = () => {
    // When "all" is selected, return all answers without date filtering
    if (timeFilter === 'all') {
        return answers;
      }
    
    let filterStartDate = null;
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
  
  // For adhoc trackers, treat them as value trackers for chart purposes
  const shouldUseValueChart = isValueTracker || isAdhocValue;
  
  // Calculate total range for value-based trackers (including adhoc_value)
  let firstValue = null;
  let lastValue = null;
  let valueDifference = null;
  
  if ((isValueTracker || isAdhocValue) && sorted.length > 0) {
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

  // Prepare chart data - include all dates from first check-in to last check-in (or today)
  const chartStartDate = sorted.length > 0 ? moment(sorted[0].date) : moment();
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
  
  // For adhoc trackers, only show dates that have answers (no need for all dates in range)
  let datesToShow;
  if (isAdhocDate || isAdhocValue) {
    // For adhoc trackers, only show the dates that have events
    datesToShow = sorted.map(ans => moment(ans.date).format('YYYY-MM-DD'));
  } else {
    // For regular trackers, prepare chart data with all dates
    // For "All Events", show all dates; for other filters, limit to last 200 days if too many
    const maxDaysToShow = timeFilter === 'all' ? Infinity : 200;
    datesToShow = allDates.length > maxDaysToShow ? allDates.slice(-maxDaysToShow) : allDates;
    
    // If excludeUnmarked is true, filter out dates that don't have answers
    if (excludeUnmarked) {
      datesToShow = datesToShow.filter(date => answeredDatesMap.has(date));
    }
  }
  
  const chartLabels = datesToShow.map(date => moment(date).format('DD MMM YYYY'));
  
  const chartData = {
    labels: chartLabels,
    datasets: [
      {
        label: isYesNoTracker ? 'Yes' : (isAdhocDate ? 'Event' : 'Value'),
        data: datesToShow.map(date => {
          const answer = answeredDatesMap.get(date);
          if (answer) {
            if (typeof answer.answer === 'string') {
              // For yes/no: yes = 1 (above), no = -1 (below)
              if (answer.answer.toLowerCase() === 'yes') return 1;
              if (answer.answer.toLowerCase() === 'no') return -1;
              // For adhoc_date, just return 1 to show a bar
              if (isAdhocDate) return 1;
              // For adhoc_value, try to parse the answer as a number
              if (isAdhocValue) {
                const numValue = parseFloat(answer.answer);
                return !isNaN(numValue) ? numValue : 0;
              }
              return parseFloat(answer.answer) || 0;
            }
            if (answer.value !== undefined) {
              // For adhoc_value and value trackers, return the numeric value
              const numValue = parseFloat(answer.value);
              return !isNaN(numValue) ? numValue : 0;
            }
          }
          // For unmarked dates in yes/no trackers, show as 0 (yellow indicator)
          // For other trackers, show as null (gap in line)
          return isYesNoTracker ? 0 : null;
        }),
        // For yes/no and adhoc_date trackers, use conditional colors per bar
        backgroundColor: (isYesNoTracker || isAdhocDate)
          ? datesToShow.map(date => {
              const answer = answeredDatesMap.get(date);
              if (!answer) return 'rgba(234, 179, 8, 0.3)'; // Yellow for unmarked
              if (isAdhocDate) return 'rgba(59, 130, 246, 0.8)'; // Blue for adhoc_date events
              const answerValue = typeof answer.answer === 'string' ? answer.answer.toLowerCase() : '';
              return answerValue === 'yes' ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)';
            })
          : datesToShow.map(date => {
              return answeredDatesMap.has(date) ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 179, 8, 0.3)';
            }),
        borderColor: (isYesNoTracker || isAdhocDate)
          ? datesToShow.map(date => {
              const answer = answeredDatesMap.get(date);
              if (!answer) return 'rgba(234, 179, 8, 0.8)'; // Yellow border for unmarked
              if (isAdhocDate) return 'rgb(59, 130, 246)'; // Blue border for adhoc_date events
              const answerValue = typeof answer.answer === 'string' ? answer.answer.toLowerCase() : '';
              return answerValue === 'yes' ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)';
            })
          : datesToShow.map(date => {
              return answeredDatesMap.has(date) ? 'rgb(34, 197, 94)' : 'rgba(234, 179, 8, 0.8)';
            }),
        borderWidth: (isYesNoTracker || isAdhocDate) ? 1 : 1,
        // Line chart specific properties (for value and adhoc_value trackers)
        tension: (isYesNoTracker || isAdhocDate) ? undefined : 0.2,
        fill: (isYesNoTracker || isAdhocDate) ? false : true,
        pointRadius: (isYesNoTracker || isAdhocDate) ? undefined : 2,
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
            if (isAdhocDate) {
              // For adhoc_date, show the date in tooltip
              const dateLabel = context.label;
              return `Event on ${dateLabel}`;
            }
            if (context.parsed.y === null) return 'Unmarked';
            return context.parsed.y;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: (tracker.type && tracker.type.toLowerCase().includes('yes')) || isAdhocDate ? false : true,
        ticks: {
          stepSize: (tracker.type && tracker.type.toLowerCase().includes('yes')) || isAdhocDate ? 1 : undefined,
          callback: function(value) {
            if (tracker.type && tracker.type.toLowerCase().includes('yes')) {
              if (value === 1) return 'Yes';
              if (value === -1) return 'No';
              if (value === 0) return '';
              return '';
            }
            if (isAdhocDate) {
              // For adhoc_date, hide y-axis labels since all bars are the same height
              return '';
            }
            return value;
          }
        },
        min: tracker.type && tracker.type.toLowerCase().includes('yes') ? -1 : (isAdhocDate ? 0 : undefined),
        max: tracker.type && tracker.type.toLowerCase().includes('yes') ? 1 : (isAdhocDate ? 1 : undefined),
      }
    }
  };

  return (
    <div>
      {/* Time Filter Buttons */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
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
        
        {/* Exclude Unmarked Checkbox - Only show for non-adhoc trackers */}
        {!isAdhocDate && !isAdhocValue && (
          <label className="flex items-center gap-2 px-3 py-1 text-xs bg-white border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 ml-auto">
            <input
              type="checkbox"
              checked={excludeUnmarked}
              onChange={(e) => setExcludeUnmarked(e.target.checked)}
              className="h-3 w-3 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded cursor-pointer"
            />
            <span className="text-gray-700">Exclude Unmarked</span>
          </label>
        )}
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
        {(isValueTracker || isAdhocValue) && firstValue !== null && lastValue !== null && (
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
        {(isYesNoTracker || isAdhocDate) ? (
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
  // Monthly modal state
  const [monthlyModalTracker, setMonthlyModalTracker] = useState(null);
  const [monthlyModalMonth, setMonthlyModalMonth] = useState(() => moment().startOf('month'));
  const [monthlyModalPendingChanges, setMonthlyModalPendingChanges] = useState({});
  const [monthlyModalValueInput, setMonthlyModalValueInput] = useState({
    show: false,
    dateStr: null,
    value: '',
    dateObj: null
  });

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
        const notes = lines.find(line => line.startsWith('Notes:'))?.replace('Notes:', '').trim() || '';
        
        if (link && answerValue && date) {
          if (!answersByTracker[link]) {
            answersByTracker[link] = [];
          }
          answersByTracker[link].push({
            id: answer.id,
            date,
            answer: answerValue,
            value: answerValue, // For value trackers, answer and value are the same
            notes: notes, // Include notes
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
      // If clicking the same tracker, deselect it. Otherwise, select only the clicked tracker.
      if (prev.includes(trackerId)) {
        return []; // Deselect if clicking the same tracker
      } else {
        return [trackerId]; // Select only one tracker at a time
      }
    });
  };

  // Helper to get all dates in a given month
  function getAllDatesInMonth(monthDate) {
    const dates = [];
    const daysInMonth = moment(monthDate).daysInMonth();
    for (let day = 1; day <= daysInMonth; day++) {
      dates.push(moment(monthDate).date(day));
    }
    return dates;
  }

  // Toggle day handler (similar to TrackerListing)
  const handleToggleDay = async (trackerId, dateStr, value = null) => {
    const tracker = trackers.find(t => t.id === trackerId);
    if (!tracker) return;

    console.log('[TrackerStatsAnalysis.handleToggleDay] START', { trackerId, dateStr, value });

    // Check if this is a removal (value is null)
    const isRemoval = value === null;

    if (isRemoval) {
      // Handle removal
      const existingAnswer = trackerAnswers[trackerId]?.find(ans => ans.date === dateStr);
      if (existingAnswer && existingAnswer.id) {
        try {
          await deleteNoteById(existingAnswer.id);
          console.log('[TrackerStatsAnalysis.handleToggleDay] Removed answer', { dateStr, noteId: existingAnswer.id });
          // Update state
          setTrackerAnswers(prev => {
            const prevAnswers = prev[trackerId] || [];
            const filteredAnswers = prevAnswers.filter(a => a.date !== dateStr);
            return { ...prev, [trackerId]: filteredAnswers };
          });
        } catch (error) {
          console.error('[TrackerStatsAnalysis.handleToggleDay] ERROR removing answer', { dateStr, error });
          toast.error('Failed to remove answer: ' + error.message);
        }
      } else {
        // Just update state
        setTrackerAnswers(prev => {
          const prevAnswers = prev[trackerId] || [];
          const filteredAnswers = prevAnswers.filter(a => a.date !== dateStr);
          return { ...prev, [trackerId]: filteredAnswers };
        });
      }
      return;
    }

    // Handle addition/update
    let answer;
    if (tracker.type.toLowerCase() === 'value') {
      answer = value;
    } else if (tracker.type.toLowerCase().includes('yes')) {
      answer = value;
    } else {
      answer = 'no';
    }

    try {
      const existingAnswer = trackerAnswers[trackerId]?.find(a => a.date === dateStr);
      let response;

      if (existingAnswer && existingAnswer.id) {
        // Update existing note
        await updateNoteById(existingAnswer.id, answer);
        response = { id: existingAnswer.id };
        console.log('[TrackerStatsAnalysis.handleToggleDay] Updated note', { noteId: existingAnswer.id });
      } else {
        // Create new note
        response = await createTrackerAnswerNote(trackerId, answer, dateStr, '', tracker?.title || '');
        console.log('[TrackerStatsAnalysis.handleToggleDay] Created note', { response });
      }

      if (response && response.id) {
        // Update state
        setTrackerAnswers(prev => {
          const prevAnswers = prev[trackerId] || [];
          const idx = prevAnswers.findIndex(a => a.date === dateStr);
          let newAnswers;
          if (idx !== -1) {
            newAnswers = [...prevAnswers];
            newAnswers[idx] = {
              ...newAnswers[idx],
              answer,
              value: answer,
              date: dateStr,
              id: response.id
            };
          } else {
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
      }
    } catch (error) {
      console.error('[TrackerStatsAnalysis.handleToggleDay] ERROR:', error);
      toast.error('Failed to record answer: ' + error.message);
    }
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
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">{tracker.title}</h2>
                <button
                  onClick={() => {
                    setMonthlyModalTracker(tracker);
                    setMonthlyModalMonth(moment().startOf('month'));
                    setMonthlyModalPendingChanges({});
                  }}
                  className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Add entries for this tracker"
                >
                  <CalendarIcon className="h-5 w-5" />
                  <span className="text-sm font-medium">Add</span>
                </button>
              </div>
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

      {/* Monthly Check-ins Modal */}
      {monthlyModalTracker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full shadow-lg relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl"
              onClick={() => {
                // Clear pending changes and value input when closing
                setMonthlyModalPendingChanges({});
                setMonthlyModalValueInput({ show: false, dateStr: null, value: '', dateObj: null });
                setMonthlyModalTracker(null);
              }}
              aria-label="Close"
            >
              &times;
            </button>
            {/* Tracker Title */}
            <div className="text-center mb-2">
              <h2 className="text-xl font-semibold">{monthlyModalTracker.title}</h2>
            </div>
            
            {/* Month Navigation */}
            <div className="flex items-center justify-center mb-2 gap-4">
              <button
                className="p-2 rounded-full hover:bg-gray-200"
                onClick={() => {
                  setMonthlyModalMonth(prev => {
                    // Clone the moment object before mutating to avoid skipping months
                    return moment(prev).subtract(1, 'months').startOf('month');
                  });
                  // Clear pending changes and value input when changing months
                  setMonthlyModalPendingChanges({});
                  setMonthlyModalValueInput({ show: false, dateStr: null, value: '', dateObj: null });
                }}
                aria-label="Previous Month"
              >
                <span className="text-xl">&#8592;</span>
              </button>
              <h3 className="text-lg font-semibold text-center">
                {monthlyModalMonth.format('MMMM YYYY')}
              </h3>
              <button
                className="p-2 rounded-full hover:bg-gray-200"
                onClick={() => {
                  setMonthlyModalMonth(prev => {
                    // Clone the moment object before mutating to avoid skipping months
                    return moment(prev).add(1, 'months').startOf('month');
                  });
                  // Clear pending changes and value input when changing months
                  setMonthlyModalPendingChanges({});
                  setMonthlyModalValueInput({ show: false, dateStr: null, value: '', dateObj: null });
                }}
                aria-label="Next Month"
              >
                <span className="text-xl">&#8594;</span>
              </button>
            </div>
            
            {/* Cadence and Events Count */}
            <div className="text-center mb-4 text-sm text-gray-600">
              {(() => {
                const trackerAnswersForMonth = trackerAnswers[monthlyModalTracker.id] || [];
                // Count events marked in the month
                const monthStart = moment(monthlyModalMonth).startOf('month').format('YYYY-MM-DD');
                const monthEnd = moment(monthlyModalMonth).endOf('month').format('YYYY-MM-DD');
                const eventsInMonth = trackerAnswersForMonth.filter(ans => {
                  const ansDate = moment(ans.date).format('YYYY-MM-DD');
                  return ansDate >= monthStart && ansDate <= monthEnd;
                }).length;
                
                // Format cadence for display
                const cadence = monthlyModalTracker.cadence || 'daily';
                const cadenceDisplay = cadence.charAt(0).toUpperCase() + cadence.slice(1);
                
                return `${cadenceDisplay} • ${eventsInMonth} event${eventsInMonth !== 1 ? 's' : ''} marked`;
              })()}
            </div>
            <div className="flex flex-wrap gap-2 justify-center bg-blue-50 p-4 rounded-lg">
              {getAllDatesInMonth(monthlyModalMonth).map(dateObj => {
                const dateStr = dateObj.format('YYYY-MM-DD');
                const trackerAnswersForModal = trackerAnswers[monthlyModalTracker.id] || [];
                const answerObj = trackerAnswersForModal.find(ans => ans.date === dateStr);
                
                // Check if there's a pending change for this date, otherwise use existing answer
                const pendingValue = monthlyModalPendingChanges[dateStr];
                let displayValue = null;
                let displayValueString = null;
                if (pendingValue !== undefined) {
                  displayValue = pendingValue; // Use pending change
                  displayValueString = pendingValue !== null ? String(pendingValue) : null;
                } else if (answerObj && answerObj.answer) {
                  const ansValue = answerObj.answer || answerObj.value;
                  displayValue = ansValue;
                  displayValueString = String(ansValue);
                }
                
                let color = '';
                const trackerType = monthlyModalTracker.type || '';
                const isYesNoTracker = trackerType.toLowerCase().includes('yes');
                const isValueTracker = trackerType.toLowerCase() === 'value';
                const cadence = monthlyModalTracker.cadence || 'daily';
                
                // Check if this date is allowed based on cadence
                let isDateAllowed = true;
                if (cadence === 'weekly' && monthlyModalTracker.days && monthlyModalTracker.days.length > 0) {
                  // For weekly trackers: only allow configured days of the week
                  const selectedDays = monthlyModalTracker.days.map(d => {
                    if (typeof d === 'string') {
                      const idx = ['sun','mon','tue','wed','thu','fri','sat'].indexOf(d.toLowerCase().slice(0,3));
                      return idx >= 0 ? idx : d;
                    }
                    return d;
                  }).filter(d => typeof d === 'number' && d >= 0 && d <= 6);
                  
                  // Check if this date's weekday is in the allowed days
                  const dateWeekday = dateObj.day(); // 0 = Sunday, 6 = Saturday
                  isDateAllowed = selectedDays.includes(dateWeekday);
                } else if (cadence === 'monthly') {
                  // For monthly trackers: only allow the 1st of each month
                  isDateAllowed = dateObj.date() === 1;
                } else if (cadence === 'yearly') {
                  // For yearly trackers: only allow January 1st
                  isDateAllowed = dateObj.month() === 0 && dateObj.date() === 1; // month() is 0-indexed, 0 = January
                }
                // Daily and custom cadences allow all dates
                
                if (isYesNoTracker) {
                  if (displayValue === 'yes') {
                    color = 'bg-green-300';
                  } else if (displayValue === 'no') {
                    color = 'bg-red-300';
                  }
                } else if (isValueTracker) {
                  color = displayValue ? 'bg-green-300' : '';
                } else {
                  color = displayValue ? 'bg-green-300' : '';
                }
                
                // Disable date if it's not allowed based on cadence
                const isDisabled = !isDateAllowed;
                const isClickable = (isYesNoTracker || isValueTracker) && !isDisabled;
                
                const handleMonthlyDateClick = () => {
                  if (!isYesNoTracker && !isValueTracker) return; // Only allow clicking for yes/no or value trackers
                  if (!isDateAllowed) return; // Disable clicks for non-allowed dates
                  
                  if (isValueTracker) {
                    // Show popup for value entry
                    const currentValue = pendingValue !== undefined 
                      ? pendingValue 
                      : (answerObj && (answerObj.answer || answerObj.value) ? String(answerObj.answer || answerObj.value) : '');
                    setMonthlyModalValueInput({
                      show: true,
                      dateStr,
                      value: currentValue,
                      dateObj
                    });
                  } else if (isYesNoTracker) {
                    // Toggle yes/no for yes/no trackers
                    const currentState = pendingValue !== undefined 
                      ? pendingValue 
                      : (answerObj && answerObj.answer ? answerObj.answer.toLowerCase() : null);
                    
                    // Toggle: null -> yes -> no -> null
                    let newValue = null;
                    if (currentState === null || currentState === '') {
                      newValue = 'yes';
                    } else if (currentState === 'yes') {
                      newValue = 'no';
                    } else if (currentState === 'no') {
                      newValue = null; // Remove
                    }
                    
                    console.log('[TrackerStatsAnalysis] Monthly date click', { 
                      dateStr, 
                      currentState, 
                      newValue,
                      isDateAllowed
                    });
                    
                    setMonthlyModalPendingChanges(prev => ({
                      ...prev,
                      [dateStr]: newValue
                    }));
                  }
                };
                
                return (
                  <div key={dateStr} className={`flex flex-col items-center w-10`}>
                    <span className="text-[10px] text-gray-400 mb-0.5 text-center w-full">{dateObj.format('ddd')}</span>
                    {/* Show value above date for value trackers */}
                    {isValueTracker && displayValueString && (
                      <span className="text-[9px] text-gray-600 mb-0.5 text-center w-full font-medium" title={`Value: ${displayValueString}`}>
                        {displayValueString.length > 4 ? displayValueString.substring(0, 4) + '...' : displayValueString}
                      </span>
                    )}
                    <button
                      onClick={handleMonthlyDateClick}
                      className={`w-8 h-8 rounded-full border flex items-center justify-center text-sm ${color} ${
                        isDisabled 
                          ? 'border-gray-200 opacity-30 cursor-not-allowed' 
                          : isClickable
                            ? 'border-gray-300 cursor-pointer hover:ring-2 hover:ring-blue-400' 
                            : 'border-gray-300 cursor-default'
                      }`}
                      title={
                        dateObj.format('MMM D, YYYY') + 
                        (isDisabled ? ' - Not available for this tracker' : 
                         isYesNoTracker ? ' - Click to toggle yes/no/remove' :
                         isValueTracker ? ' - Click to add/edit value' : '')
                      }
                      disabled={!isClickable}
                    >
                      {dateObj.date()}
                    </button>
                  </div>
                );
              })}
            </div>
            {/* Save button for yes/no and value trackers */}
            {((monthlyModalTracker.type && monthlyModalTracker.type.toLowerCase().includes('yes')) || 
              (monthlyModalTracker.type && monthlyModalTracker.type.toLowerCase() === 'value')) && 
              Object.keys(monthlyModalPendingChanges).length > 0 && (
              <div className="mt-4 flex justify-center gap-4">
                <button
                  onClick={async () => {
                    console.log('[TrackerStatsAnalysis] Saving monthly modal changes', { 
                      changes: monthlyModalPendingChanges 
                    });
                    
                    const trackerAnswersForModal = trackerAnswers[monthlyModalTracker.id] || [];
                    
                    // Apply each change
                    for (const [dateStr, value] of Object.entries(monthlyModalPendingChanges)) {
                      if (value === null) {
                        // Remove: find existing answer and delete it
                        const existingAnswer = trackerAnswersForModal.find(ans => ans.date === dateStr);
                        if (existingAnswer && existingAnswer.id) {
                          try {
                            await deleteNoteById(existingAnswer.id);
                            console.log('[TrackerStatsAnalysis] Removed answer', { dateStr, noteId: existingAnswer.id });
                            // Update UI by calling handleToggleDay with null
                            await handleToggleDay(monthlyModalTracker.id, dateStr, null);
                          } catch (error) {
                            console.error('[TrackerStatsAnalysis] ERROR removing answer', { dateStr, error });
                          }
                        } else {
                          // No existing answer, just update state
                          await handleToggleDay(monthlyModalTracker.id, dateStr, null);
                        }
                      } else {
                        // Update or create: use handleToggleDay which handles both cases
                        console.log('[TrackerStatsAnalysis] Setting answer', { dateStr, value });
                        await handleToggleDay(monthlyModalTracker.id, dateStr, value);
                      }
                    }
                    
                    // Clear pending changes
                    setMonthlyModalPendingChanges({});
                    console.log('[TrackerStatsAnalysis] Monthly modal changes saved');
                  }}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Save Changes ({Object.keys(monthlyModalPendingChanges).length} changes)
                </button>
                <button
                  onClick={() => {
                    console.log('[TrackerStatsAnalysis] Cancelling monthly modal changes');
                    setMonthlyModalPendingChanges({});
                  }}
                  className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
            {/* Value Input Popup for value trackers */}
            {monthlyModalValueInput.show && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
                <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-lg">
                  <h3 className="text-lg font-semibold mb-4">
                    Enter Value for {monthlyModalValueInput.dateObj?.format('MMM D, YYYY')}
                  </h3>
                  <input
                    type="text"
                    value={monthlyModalValueInput.value}
                    onChange={(e) => setMonthlyModalValueInput(prev => ({ ...prev, value: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 mb-4"
                    placeholder="Enter value"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        // Save value to pending changes
                        const valueToSave = monthlyModalValueInput.value.trim() || null;
                        setMonthlyModalPendingChanges(prev => ({
                          ...prev,
                          [monthlyModalValueInput.dateStr]: valueToSave
                        }));
                        setMonthlyModalValueInput({ show: false, dateStr: null, value: '', dateObj: null });
                      } else if (e.key === 'Escape') {
                        setMonthlyModalValueInput({ show: false, dateStr: null, value: '', dateObj: null });
                      }
                    }}
                  />
                  <div className="flex justify-end gap-4">
                    <button
                      onClick={() => {
                        setMonthlyModalValueInput({ show: false, dateStr: null, value: '', dateObj: null });
                      }}
                      className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        // Save value to pending changes
                        const valueToSave = monthlyModalValueInput.value.trim() || null;
                        setMonthlyModalPendingChanges(prev => ({
                          ...prev,
                          [monthlyModalValueInput.dateStr]: valueToSave
                        }));
                        setMonthlyModalValueInput({ show: false, dateStr: null, value: '', dateObj: null });
                      }}
                      className="px-4 py-2 bg-blue-500 text-white hover:bg-blue-600 rounded-lg transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackerStatsAnalysisPage;

