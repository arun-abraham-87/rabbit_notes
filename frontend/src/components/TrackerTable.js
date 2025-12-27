import React from 'react';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/solid';
import moment from 'moment';

const TrackerTable = ({ trackers, trackerAnswers = {}, onEdit, onTrackerDeleted, onToggleDay, isFocusMode }) => {
    if (trackers.length === 0) return null;

    return (
        <div className="w-full overflow-x-auto bg-white rounded-lg shadow-sm border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title & Tags</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Question</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cadence</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Entry</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Log Today</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {trackers.map(tracker => {
                        const answers = trackerAnswers[String(tracker.id)] || [];
                        const lastAnswer = answers.length > 0 ? answers[0] : null; // Assuming answers are sorted by date desc

                        return (
                            <tr key={tracker.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-sm font-semibold text-gray-900">{tracker.title}</span>
                                        {tracker.tags && Array.isArray(tracker.tags) && tracker.tags.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                                {tracker.tags.map((tag, idx) => (
                                                    <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-800">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm text-gray-600 line-clamp-2 max-w-xs">{tracker.question}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${tracker.cadence === 'Daily' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
                                        }`}>
                                        {tracker.cadence}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-500">{tracker.type}</div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {lastAnswer ? (
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-gray-900">{lastAnswer.value}</span>
                                            <span className="text-xs text-gray-500">{moment(lastAnswer.date).format('MMM D, YYYY')}</span>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-400 italic">No entries yet</span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {(() => {
                                        const type = tracker.type ? tracker.type.toLowerCase() : '';
                                        const isYesNoTracker = type === 'yes,no' || type === 'yesno' || type === 'yes/no';
                                        const today = moment().format('YYYY-MM-DD');
                                        const todayAnswer = answers.find(ans => ans.date === today);
                                        const todayValue = todayAnswer ? (todayAnswer.value || todayAnswer.answer) : '';

                                        if (isYesNoTracker) {
                                            const isYes = todayValue?.toLowerCase() === 'yes';
                                            const isNo = todayValue?.toLowerCase() === 'no';

                                            const handleToggle = () => {
                                                let nextAnswer = 'Yes';
                                                if (isYes) nextAnswer = 'No';
                                                else if (isNo) nextAnswer = '';
                                                onToggleDay(tracker.id, today, nextAnswer);
                                            };

                                            return (
                                                <button
                                                    onClick={handleToggle}
                                                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${isYes
                                                        ? 'bg-green-100 text-green-700 border border-green-200'
                                                        : isNo
                                                            ? 'bg-red-100 text-red-700 border border-red-200'
                                                            : 'bg-gray-100 text-gray-400 border border-gray-200 hover:bg-gray-200'
                                                        }`}
                                                >
                                                    {isYes ? 'YES' : isNo ? 'NO' : 'LOG'}
                                                </button>
                                            );
                                        }

                                        return (
                                            <button
                                                onClick={() => onEdit(tracker)}
                                                className="inline-flex items-center px-2.5 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                            >
                                                Log
                                            </button>
                                        );
                                    })()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <div className="flex justify-end gap-3">
                                        <button
                                            onClick={() => onEdit(tracker)}
                                            className="text-blue-600 hover:text-blue-900 transition-colors"
                                            title="Edit Tracker"
                                        >
                                            <PencilIcon className="h-4 w-4" />
                                        </button>
                                        {!isFocusMode && (
                                            <button
                                                onClick={() => onTrackerDeleted(tracker.id)}
                                                className="text-red-600 hover:text-red-900 transition-colors"
                                                title="Delete Tracker"
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default TrackerTable;
