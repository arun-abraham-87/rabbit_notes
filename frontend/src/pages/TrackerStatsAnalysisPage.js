import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadNotes } from '../utils/ApiUtils';
import { getAgeInStringFmt } from '../utils/DateUtils';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
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
  Title,
  Tooltip,
  Legend
);

// EnhancedStats component (same as in TrackerCard)
function EnhancedStats({ answers, tracker }) {
  if (!answers || answers.length === 0) {
    return <div className="text-gray-400 italic text-center">No check-ins yet.</div>;
  }

  // Normalize and deduplicate dates
  const dateSet = new Set(answers.map(a => moment(a.date).format('YYYY-MM-DD')));
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
  const sorted = [...answers].sort((a, b) => new Date(a.date) - new Date(b.date));
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
  const chartData = {
    labels: sorted.slice(-30).map(a => new Date(a.date).toLocaleDateString()),
    datasets: [
      {
        label: tracker.type && tracker.type.toLowerCase().includes('yes') ? 'Yes' : 'Value',
        data: sorted.slice(-30).map(a => {
          if (typeof a.answer === 'string') {
            if (a.answer.toLowerCase() === 'yes') return 1;
            if (a.answer.toLowerCase() === 'no') return 0;
            return parseFloat(a.answer) || 0;
          }
          if (a.value !== undefined) return parseFloat(a.value) || 0;
          return 0;
        }),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        tension: 0.2,
        fill: true,
        pointRadius: 2,
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
      <div className="mb-4">
        <Line data={chartData} options={chartOptions} height={120} />
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
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Select Trackers:</h2>
        <div className="flex flex-wrap gap-2">
          {trackers.map(tracker => {
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

