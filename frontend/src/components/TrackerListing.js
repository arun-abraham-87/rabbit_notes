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
import { getAge } from '../utils/DateUtils';
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
            createdAt: note.createdAt
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
            age: getAge(new Date(date))
          });
          rawNotesByAnswer[answer.id] = answer.content;

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
  };

  const handleEditTracker = (tracker) => {
    setEditingTracker(tracker);
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

  if (isLoading) {
    return (
      <div className="w-full rounded-lg border bg-card text-card-foreground shadow-sm p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-lg border bg-card text-card-foreground shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Trackers</h1>
        <button
          onClick={() => setShowAddTracker(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Add Tracker
        </button>
      </div>

      {(showAddTracker || editingTracker) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full relative">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {editingTracker ? 'Edit Tracker' : 'Add New Tracker'}
              </h2>
              <button
                onClick={() => {
                  setShowAddTracker(false);
                  setEditingTracker(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <AddTracker 
              onTrackerAdded={handleTrackerAdded}
              onTrackerUpdated={handleTrackerUpdated}
              editingTracker={editingTracker}
            />
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 flex items-center gap-2">
          <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
          <span>{error}</span>
        </div>
      )}
      
      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search trackers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-8 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <XMarkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        <div className="flex gap-4">
          <select
            value={filterCadence}
            onChange={(e) => setFilterCadence(e.target.value)}
            className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="all">All Cadences</option>
            <option value="Daily">Daily</option>
            <option value="Weekly">Weekly</option>
            <option value="Monthly">Monthly</option>
            <option value="Yearly">Yearly</option>
            <option value="Custom">Custom</option>
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="all">All Types</option>
            <option value="Yes,No">Yes/No</option>
            <option value="Value">Value</option>
          </select>
        </div>
      </div>

      {/* Trackers List */}
      <div className="space-y-4">
        {filteredTrackers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchTerm || filterCadence !== 'all' || filterType !== 'all' ? (
              <p>No trackers match your filters</p>
            ) : (
              <p>No trackers found. Create one to get started.</p>
            )}
          </div>
        ) : (
          filteredTrackers.map((tracker) => {
            const stats = trackerStats[tracker.id] || { yes: 0, no: 0, total: 0 };
            const yesPercentage = stats.total > 0 ? Math.round((stats.yes / stats.total) * 100) : 0;
            const noPercentage = stats.total > 0 ? Math.round((stats.no / stats.total) * 100) : 0;

            return (
              <div
                key={tracker.id}
                className="p-4 border rounded-lg hover:bg-gray-50 transition-colors duration-150"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                      {tracker.title}
                    </h3>
                    <p className="text-gray-600 mb-2">{tracker.question}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <ClockIcon className="h-4 w-4" />
                        <span>{tracker.type}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="h-4 w-4" />
                        <span>{tracker.cadence}</span>
                        {tracker.days.length > 0 && (
                          <span className="ml-1">({tracker.days.join(', ')})</span>
                        )}
                      </div>
                    </div>
                    {tracker.type === 'Yes,No' && stats.total > 0 && (
                      <div className="mt-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500" 
                              style={{ width: `${yesPercentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">
                            {yesPercentage}% Yes
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-red-500" 
                              style={{ width: `${noPercentage}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">
                            {noPercentage}% No
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Total answers: {stats.total}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleEditTracker(tracker)}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    {stats.total > 0 && (
                      <>
                        <button
                          onClick={() => handleShowAnswers(tracker.id)}
                          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <DocumentTextIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleShowGraph(tracker.id)}
                          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <ChartBarIcon className="h-5 w-5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Answers Popup */}
      {showAnswers && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Recent Answers</h2>
              <button
                onClick={() => setShowAnswers(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="overflow-auto max-h-[60vh]">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Day</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Answer</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">View</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {trackerAnswers[showAnswers]?.slice(-50).map((answer) => (
                    <tr key={answer.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(answer.date)}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {new Date(answer.date).toLocaleDateString('en-US', { weekday: 'long' })}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                        {answer.age}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full ${
                          answer.answer.toLowerCase() === 'yes' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {answer.answer}
                        </span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleShowRawNote(answer.id)}
                          className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">
                        <button
                          onClick={() => {
                            setDeletingAnswerId(answer.id);
                            setShowDeleteConfirm(true);
                          }}
                          className="p-1 text-gray-500 hover:text-red-700 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Delete Answer</h2>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletingAnswerId(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this answer? This action cannot be undone.</p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletingAnswerId(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteAnswer(deletingAnswerId)}
                className="px-4 py-2 bg-red-500 text-white hover:bg-red-600 rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Raw Note Popup */}
      {showRawNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Raw Note</h2>
              <button
                onClick={() => setShowRawNote(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="overflow-auto max-h-[60vh]">
              <pre className="whitespace-pre-wrap text-sm font-mono bg-gray-50 p-4 rounded-lg">
                {rawNotes[showRawNote]}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Graph Popup */}
      {showGraph && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Answer Statistics</h2>
              <button
                onClick={() => setShowGraph(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-medium mb-4">Answer Trend</h3>
                <div className="h-64">
                  {getLineChartData(showGraph) && (
                    <Line
                      data={getLineChartData(showGraph)}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'top',
                          },
                          title: {
                            display: true,
                            text: 'Yes/No Answers Over Time'
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: {
                              stepSize: 1
                            }
                          }
                        }
                      }}
                    />
                  )}
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="text-lg font-medium mb-4">Answer Distribution</h3>
                <div className="h-64">
                  {getPieChartData(showGraph) && (
                    <Pie
                      data={getPieChartData(showGraph)}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            position: 'top',
                          },
                          title: {
                            display: true,
                            text: 'Overall Yes/No Distribution'
                          }
                        }
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrackerListing; 