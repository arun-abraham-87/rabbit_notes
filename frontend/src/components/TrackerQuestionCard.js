import React from 'react';
import { CalendarIcon, CheckIcon } from '@heroicons/react/24/outline';

const TrackerQuestionCard = ({
  tracker,
  answers,
  timeAnswers,
  setAnswers,
  setTimeAnswers,
  handleAnswer,
  handleTimeAnswer,
}) => {
  return (
    <div key={`${tracker.id}-${tracker.date}`} className="p-6 hover:bg-gray-50 transition-colors duration-150">
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <CalendarIcon className="h-4 w-4" />
              <span>{tracker.formattedDate}</span>
            </div>
            <h5 className="text-md font-medium text-gray-900 mb-2">
              {tracker.title}
            </h5>
            <p className="text-gray-600 mb-4">{tracker.question}</p>
          </div>
          <div className="flex flex-col gap-2 relative z-10">
            {tracker.type?.toLowerCase() === 'value_time' ? (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={timeAnswers[tracker.id]?.date || tracker.date}
                    onChange={(e) => {
                      e.stopPropagation();
                      setTimeAnswers(prev => ({ ...prev, [tracker.id]: { ...prev[tracker.id], date: e.target.value } }));
                    }}
                    className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="time"
                    value={timeAnswers[tracker.id]?.time || ''}
                    onChange={(e) => {
                      e.stopPropagation();
                      setTimeAnswers(prev => ({ ...prev, [tracker.id]: { ...prev[tracker.id], time: e.target.value } }));
                    }}
                    className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleTimeAnswer(tracker.id, timeAnswers[tracker.id]?.time, timeAnswers[tracker.id]?.date);
                    }}
                    className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200"
                  >
                    <CheckIcon className="h-5 w-5" />
                  </button>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTimeAnswer(tracker.id, 'Not Known', timeAnswers[tracker.id]?.date);
                  }}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200"
                >
                  Not Known
                </button>
              </div>
            ) : tracker.type?.toLowerCase() === 'value' ? (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={answers[tracker.id]?.date || tracker.date}
                    onChange={(e) => {
                      e.stopPropagation();
                      setAnswers(prev => ({ ...prev, [tracker.id]: { ...prev[tracker.id], date: e.target.value } }));
                    }}
                    className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={answers[tracker.id]?.value || ''}
                    onChange={(e) => {
                      e.stopPropagation();
                      setAnswers(prev => ({ ...prev, [tracker.id]: { ...prev[tracker.id], value: e.target.value } }));
                    }}
                    className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter value"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAnswer(tracker.id, answers[tracker.id]?.value, answers[tracker.id]?.date);
                    }}
                    className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200"
                  >
                    <CheckIcon className="h-5 w-5" />
                  </button>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAnswer(tracker.id, 'Not Known', answers[tracker.id]?.date);
                  }}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-800 rounded-lg hover:bg-gray-200"
                >
                  Not Known
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAnswer(tracker.id, 'Yes', answers[tracker.id]?.date);
                  }}
                  className={`px-4 py-2 rounded-lg ${
                    answers[tracker.id] === 'Yes'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  Yes
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAnswer(tracker.id, 'No', answers[tracker.id]?.date);
                  }}
                  className={`px-4 py-2 rounded-lg ${
                    answers[tracker.id] === 'No'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  No
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackerQuestionCard; 