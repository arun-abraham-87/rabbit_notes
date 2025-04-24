import React, { useState, useEffect } from 'react';

const NextMeetingBanner = ({ meetings, notes }) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Find the next meeting within the next hour
  const nextMeeting = meetings?.find(m => {
    const note = notes?.find(n => n.id === m.id);
    if (note?.content.includes('meta::meeting_acknowledge')) return false;
    
    const meetingTime = new Date(m.time).getTime();
    const diff = meetingTime - now;
    return diff > 0 && diff <= 3600000; // 1 hour in milliseconds
  });

  if (!nextMeeting) return null;

  const formatTimeRemaining = (timeMs) => {
    const minutes = Math.floor(timeMs / 60000);
    const seconds = Math.floor((timeMs % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const timeRemaining = new Date(nextMeeting.time).getTime() - now;

  return (
    <div className="bg-indigo-600 text-white p-4 rounded-lg mb-4 shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-1">Next Meeting in {formatTimeRemaining(timeRemaining)}</h3>
          <p className="text-white/90">{nextMeeting.context}</p>
        </div>
        {nextMeeting.duration && (
          <div className="text-white/80 text-sm">
            Duration: {nextMeeting.duration} mins
          </div>
        )}
      </div>
    </div>
  );
};

export default NextMeetingBanner; 