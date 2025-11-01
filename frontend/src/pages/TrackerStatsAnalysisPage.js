import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
    if (timeFilter === 'all') {
      return answers;
    }
    
    const now = moment();
    let startDate;
    
    switch (timeFilter) {
      case 'lastMonth':
        startDate = moment().subtract(1, 'months').startOf('month');
        break;
      case 'last3Months':
        startDate = moment().subtract(3, 'months').startOf('month');
        break;
      case 'ytd':
        startDate = moment().startOf('year');
        break;
      case 'last365Days':
        startDate = moment().subtract(365, 'days');
        break;
      default:
        return answers;
    }
    
    return answers.filter(ans => moment(ans.date).isSameOrAfter(startDate));
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

  // Normalize and deduplicate dates
  const dateSet = new Set(filteredAnswers.map(a => moment(a.date).format('YYYY-MM-DD')));
  const sortedDates = Array.from(dateSet).sort();

  // Longest streak calculation (robust)
  let longest = 0, current = 0;
  let prev = null;
  sortedDates.forEach(dateStr => {
    if (!prev) {
      current = 1;
    } else {
      const prevDate = moment(prev);
      const currDate = moment(dateStr);
      const diff = currDate.diff(prevDate, 'days');
      if (diff === 1) {
        current++;
      } else {
        current = 1;
      }
    }
    if (current > longest) longest = current;
    prev = dateStr;
  });

  // Sort answers by date ascending
  const sorted = [...filteredAnswers].sort((a, b) => new Date(a.date) - new Date(b.date));
  const firstDate = sorted[0]?.date;
  const lastDate = sorted[sorted.length - 1]?.date;
  const total = sorted.length;

  // Yes/No breakdown
  let yes = 0, no = 0, valueCount = 0;
  sorted.forEach(ans => {
    if (typeof ans.answer === 'string') {
      if (ans.answer.toLowerCase() === 'yes') yes++;
      else if (ans.answer.toLowerCase() === 'no') no++;
      else valueCount++;
    } else if (ans.value !== undefined) {
      valueCount++;
    }
  });

  // Completion rate (for daily trackers)
  let completionRate = null;
  if (tracker.cadence && tracker.cadence.toLowerCase() === 'daily' && firstDate) {
    const daysBetween = Math.max(1, Math.ceil((new Date(lastDate) - new Date(firstDate)) / (1000*60*60*24)) + 1);
    completionRate = (total / daysBetween) * 100;
  }

  // Prepare chart data (show last 30 check-ins)
  const last30Answers = sorted.slice(-30);
  const chartData = {
    labels: last30Answers.map(a => new Date(a.date).toLocaleDateString()),
    datasets: [
      {
        label: isYesNoTracker ? 'Yes' : 'Value',
        data: last30Answers.map(a => {
          if (typeof a.answer === 'string') {
            if (a.answer.toLowerCase() === 'yes') return 1;
            if (a.answer.toLowerCase() === 'no') return 0;
            return parseFloat(a.answer) || 0;
          }
          if (a.value !== undefined) return parseFloat(a.value) || 0;
          return 0;
        }),
        // For yes/no trackers, use conditional colors per bar
        backgroundColor: isYesNoTracker
          ? last30Answers.map(a => {
              const answer = typeof a.answer === 'string' ? a.answer.toLowerCase() : '';
              return answer === 'yes' ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)';
            })
          : 'rgba(34, 197, 94, 0.2)',
        borderColor: isYesNoTracker
          ? last30Answers.map(a => {
              const answer = typeof a.answer === 'string' ? a.answer.toLowerCase() : '';
              return answer === 'yes' ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)';
            })
          : 'rgb(34, 197, 94)',
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
              return context.parsed.y === 1 ? 'Yes' : 'No';
            }
            return context.parsed.y;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: tracker.type && tracker.type.toLowerCase().includes('yes') ? 1 : undefined,
          callback: function(value) {
            if (tracker.type && tracker.type.toLowerCase().includes('yes')) {
              return value === 1 ? 'Yes' : 'No';
            }
            return value;
          }
        },
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
      
      <div className="mb-4">
        {isYesNoTracker ? (
          <Bar data={chartData} options={chartOptions} height={120} />
        ) : (
          <Line data={chartData} options={chartOptions} height={120} />
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm mb-2">
        <div><span className="font-semibold">Total Check-ins:</span> {total}</div>
        {tracker.type && tracker.type.toLowerCase().includes('yes') && (
          <>
            <div><span className="font-semibold">Yes:</span> {yes}</div>
            <div><span className="font-semibold">No:</span> {no}</div>
          </>
        )}
        <div><span className="font-semibold">First Check-in:</span> {firstDate && new Date(firstDate).toLocaleDateString()}</div>
        <div><span className="font-semibold">Last Check-in:</span> {lastDate && new Date(lastDate).toLocaleDateString()}</div>
        <div><span className="font-semibold">Current Streak:</span> {longest}</div>
        <div><span className="font-semibold">Longest Streak:</span> {longest}</div>
        {completionRate !== null && (
          <div className="col-span-2"><span className="font-semibold">Completion Rate:</span> {completionRate.toFixed(1)}%</div>
        )}
      </div>
    </div>
  );
}

const TrackerStatsAnalysisPage = () => {
  const navigate = useNavigate();
  const [trackers, setTrackers] = useState([]);
  const [trackerAnswers, setTrackerAnswers] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTrackers, setSelectedTrackers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

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

  const selectedTrackersList = trackers.filter(t => selectedTrackers.includes(t.id));
  
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
            const isSelected = selectedTrackers.includes(tracker.id);
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
              <h2 className="text-xl font-semibold text-gray-900 mb-2">{tracker.title}</h2>
              {tracker.question && (
                <p className="text-sm text-gray-600 mb-4">{tracker.question}</p>
              )}
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

