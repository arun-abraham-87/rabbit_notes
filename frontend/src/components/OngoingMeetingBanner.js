import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';

const OngoingMeetingBanner = ({ meeting, onDismiss }) => {
  const { description, startTime, duration } = meeting;
  const [timeInfo, setTimeInfo] = useState({ minsElapsed: 0, minsRemaining: 0, progress: 0 });
  
  useEffect(() => {
    const updateTimes = () => {
      const now = new Date();
      const meetingStart = new Date(startTime);
      const minsElapsed = Math.floor((now - meetingStart) / (1000 * 60));
      const minsRemaining = duration - minsElapsed;
      const progress = Math.min(100, Math.round((minsElapsed / duration) * 100));
      setTimeInfo({ minsElapsed, minsRemaining, progress });
    };

    // Initial calculation
    updateTimes();

    // Update every minute
    const interval = setInterval(updateTimes, 60000);

    return () => clearInterval(interval);
  }, [startTime, duration]);

  // Get color based on progress
  const getProgressColor = (progress) => {
    if (progress < 50) return 'bg-green-500';
    if (progress < 75) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg shadow-lg mb-6 relative">
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-1">
            Meeting On: {description}
          </h3>
          <div className="text-sm opacity-90">
            Started {timeInfo.minsElapsed} mins ago • Finishes in {timeInfo.minsRemaining} mins
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-3xl font-bold opacity-25">🗣️</div>
          <button
            onClick={onDismiss}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
            title="Dismiss meeting banner"
          >
            <XMarkIcon className="h-5 w-5 text-white" />
          </button>
        </div>
      </div>
      
      {/* Progress bar container */}
      <div className="relative h-2 bg-white bg-opacity-20 rounded-full overflow-hidden">
        {/* Progress bar */}
        <div
          className={`absolute left-0 top-0 h-full transition-all duration-1000 ${getProgressColor(timeInfo.progress)}`}
          style={{ width: `${timeInfo.progress}%` }}
        />
      </div>
      
      {/* Progress percentage */}
      <div className="text-xs mt-1 text-right text-white text-opacity-75">
        {timeInfo.progress}% Complete
      </div>
    </div>
  );
};

export default OngoingMeetingBanner; 