import React, { useState, useEffect } from 'react';
import { 
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import { generateTrackerQuestions, createTrackerAnswerNote } from '../utils/TrackerQuestionUtils';
import TrackerQuestionCard from './TrackerQuestionCard';

const TrackerQuestionsAlert = ({ notes, expanded: initialExpanded = true }) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [trackerQuestions, setTrackerQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [timeAnswers, setTimeAnswers] = useState({});

  useEffect(() => {
    setTrackerQuestions(generateTrackerQuestions(notes));
  }, [notes]);

  const handleAnswer = async (trackerId, answer, date) => {
    try {
      if (!answer) {
        toast.error('Please enter a value before submitting');
        return;
      }

      const tracker = trackerQuestions.find(q => q.id === trackerId);
      if (!tracker) {
        console.error('Tracker not found:', trackerId);
        return;
      }

      const response = await createTrackerAnswerNote(trackerId, answer, date || tracker.date, '', tracker.title || '');
      
      if (response && response.id) {
        setAnswers(prev => ({ ...prev, [trackerId]: { value: answer, date: date || tracker.date } }));
        //need to se tot notes as well

        // Update the questions list to remove the answered one
        setTrackerQuestions(prev => 
          prev.filter(q => !(q.id === trackerId && q.date === (date || tracker.date)))
        );

        toast.success('Answer recorded successfully');
      } else {
        throw new Error('Failed to create answer note');
      }
    } catch (error) {
      console.error('Error recording answer:', error);
      toast.error('Failed to record answer: ' + error.message);
    }
  };

  const handleTimeAnswer = async (trackerId, time, date) => {
    try {
      const tracker = trackerQuestions.find(q => q.id === trackerId);
      if (!tracker) {
        console.error('Tracker not found:', trackerId);
        return;
      }

      const response = await createTrackerAnswerNote(trackerId, time, date || tracker.date, '', tracker.title || '');
      
      if (response && response.id) {
        setTimeAnswers(prev => ({ ...prev, [trackerId]: { time, date: date || tracker.date } }));
        
        // Update the questions list to remove the answered one
        setTrackerQuestions(prev => 
          prev.filter(q => !(q.id === trackerId && q.date === (date || tracker.date)))
        );

        toast.success('Time recorded successfully');
      } else {
        throw new Error('Failed to create time answer note');
      }
    } catch (error) {
      console.error('Error recording time:', error);
      toast.error('Failed to record time: ' + error.message);
    }
  };

  if (!trackerQuestions || trackerQuestions.length === 0) return null;

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden w-full">
      <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 cursor-pointer hover:bg-blue-100 transition-colors duration-150" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <DocumentTextIcon className="h-6 w-6 text-blue-500" />
            <h3 className="ml-3 text-lg font-semibold text-blue-800">
              Tracker Questions ({trackerQuestions.length})
            </h3>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="text-blue-600 hover:text-blue-700 focus:outline-none"
            aria-label={isExpanded ? "Collapse questions" : "Expand questions"}
          >
            {isExpanded ? (
              <ChevronUpIcon className="h-5 w-5" />
            ) : (
              <ChevronDownIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>
      {isExpanded && trackerQuestions && (
        <div className="divide-y divide-gray-100">
          {trackerQuestions.map((tracker) => (
            <TrackerQuestionCard
              key={`${tracker.id}-${tracker.date}`}
              tracker={tracker}
              answers={answers}
              timeAnswers={timeAnswers}
              setAnswers={setAnswers}
              setTimeAnswers={setTimeAnswers}
              handleAnswer={handleAnswer}
              handleTimeAnswer={handleTimeAnswer}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TrackerQuestionsAlert; 