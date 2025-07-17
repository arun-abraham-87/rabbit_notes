import React, { useState, useRef, useEffect } from 'react';
import { ClockIcon, PlusIcon } from '@heroicons/react/24/solid';

const Countdown = () => {
  const [showSetup, setShowSetup] = useState(false);
  const [active, setActive] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [targetTime, setTargetTime] = useState('');
  const [meetingName, setMeetingName] = useState('');
  const [meetings, setMeetings] = useState([]);
  const [currentMeetingIndex, setCurrentMeetingIndex] = useState(-1);
  const intervalRef = useRef();
  const [error, setError] = useState('');

  // Load saved meetings and countdown state on component mount
  useEffect(() => {
    const savedMeetings = localStorage.getItem('meetingCountdownMeetings');
    const savedState = localStorage.getItem('meetingCountdownState');
    
    if (savedMeetings) {
      setMeetings(JSON.parse(savedMeetings));
    }
    
    if (savedState) {
      const { targetTime: savedTargetTime, active: savedActive, startTime, currentMeetingIndex: savedIndex } = JSON.parse(savedState);
      setTargetTime(savedTargetTime);
      setActive(savedActive);
      setCurrentMeetingIndex(savedIndex || -1);
      
      if (savedActive && startTime) {
        // Recalculate remaining time
        const now = new Date();
        const start = new Date(startTime);
        const [targetHour, targetMinute] = savedTargetTime.split(':').map(Number);
        const target = new Date(start);
        target.setHours(targetHour, targetMinute, 0, 0);
        
        const diffSecs = Math.floor((target - now) / 1000);
        if (diffSecs > 0) {
          setRemaining(diffSecs);
        } else {
          // Countdown has finished, clear saved state
          localStorage.removeItem('meetingCountdownState');
          setActive(false);
          setRemaining(0);
          setCurrentMeetingIndex(-1);
        }
      }
    }
  }, []);

  // Save meetings to localStorage
  const saveMeetings = (meetingsList) => {
    localStorage.setItem('meetingCountdownMeetings', JSON.stringify(meetingsList));
  };

  // Save countdown state to localStorage
  const saveState = (targetTime, active, currentIndex = -1) => {
    const state = {
      targetTime,
      active,
      currentMeetingIndex: currentIndex,
      startTime: active ? new Date().toISOString() : null
    };
    localStorage.setItem('meetingCountdownState', JSON.stringify(state));
  };

  // Save just the target time (for when countdown isnt active)
  const saveTargetTime = (targetTime) => {
    const state = {
      targetTime,
      active: false,
      currentMeetingIndex: -1,
      startTime: null
    };
    localStorage.setItem('meetingCountdownState', JSON.stringify(state));
  };

  useEffect(() => {
    if (active && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining(r => r - 1);
      }, 1000);
    } else if (remaining === 0 && active) {
      setActive(false);
      localStorage.removeItem('meetingCountdownState');
      if ('Notification' in window && Notification.permission === 'granted') {
        const currentMeeting = meetings[currentMeetingIndex];
        const meetingText = currentMeeting ? `"${currentMeeting.name}"` : 'your meeting';
        new Notification('Meeting Time!', {
          body: `${meetingText} is starting now!`,
          icon: '/favicon.ico'
        });
      }
      setCurrentMeetingIndex(-1);
    }
    return () => clearInterval(intervalRef.current);
  }, [active, remaining, meetings, currentMeetingIndex]);

  const handleStart = () => {
    if (!targetTime) {
      setError('Please select a meeting time.');
      return;
    }
    if (!meetingName.trim()) {
      setError('Please enter a meeting name.');
      return;
    }
    setError('');
    
    const now = new Date();
    const [targetHour, targetMinute] = targetTime.split(':').map(Number);
    const target = new Date(now);
    target.setHours(targetHour, targetMinute, 0, 0);
    if (target <= now) {
      setError('Please select a future meeting time.');
      return;
    }
    
    const diffSecs = Math.floor((target - now) / 1000);
    setRemaining(diffSecs);
    setActive(true);
    setShowSetup(false);
    
    // Add meeting to list if not already there
    const newMeeting = { name: meetingName.trim(), time: targetTime };
    const updatedMeetings = [...meetings, newMeeting];
    setMeetings(updatedMeetings);
    saveMeetings(updatedMeetings);
    
    setCurrentMeetingIndex(updatedMeetings.length - 1);
    saveState(targetTime, true, updatedMeetings.length - 1);
    
    setMeetingName('');
  };

  const handleReset = () => {
    setActive(false);
    setRemaining(0);
    setShowSetup(false);
    setTargetTime('');
    setMeetingName('');
    setError('');
    setCurrentMeetingIndex(-1);
    localStorage.removeItem('meetingCountdownState');
  };

  const handleTimeChange = (newTime) => {
    setTargetTime(newTime);
    if (newTime) {
      saveTargetTime(newTime);
    }
  };

  const removeMeeting = (index) => {
    const updatedMeetings = meetings.filter((_, i) => i !== index);
    setMeetings(updatedMeetings);
    saveMeetings(updatedMeetings);
    
    // If we're removing the current meeting, stop the countdown
    if (index === currentMeetingIndex) {
      handleReset();
    } else if (index < currentMeetingIndex) {
      // Adjust current meeting index
      setCurrentMeetingIndex(currentMeetingIndex - 1);
    }
  };

  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    
    if (h > 0) {
      return `${h}h ${m}m ${s}s`;
    } else if (m > 0) {
      return `${m}m ${s}s`;
    } else {
      return `${s}s`;
    }
  };

  const formatMeetingTime = (timeString) => {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getUpcomingMeetings = () => {
    const now = new Date();
    return meetings
      .map((meeting, index) => {
        const [hours, minutes] = meeting.time.split(':').map(Number);
        const meetingTime = new Date(now);
        meetingTime.setHours(hours, minutes, 0, 0);
        const diffMs = meetingTime - now;
        return {
          ...meeting,
          index,
          diffMs,
          isPast: diffMs <= 0
        };
      })
      .filter(meeting => !meeting.isPast)
      .sort((a, b) => a.diffMs - b.diffMs);
  };

  return (
    <div className="flex flex-col items-center justify-center">
      {active ? (
        <div className="flex items-start gap-6">
          {/* Countdown Timer */}
          <div className="flex flex-col items-center bg-black/90 rounded-xl p-6 shadow-lg">
            <div className="text-white text-6xl font-extrabold mb-4 tracking-widest select-none">
              {formatTime(remaining)}
            </div>
            <div className="text-white text-lg mb-2">
              {meetings[currentMeetingIndex]?.name} at {formatMeetingTime(targetTime)}
            </div>
            <button
              className="mt-2 px-4 py-2 bg-gray-200 rounded text-gray-700 hover:bg-gray-300 font-semibold"
              onClick={handleReset}
            >
              Cancel Meeting
            </button>
          </div>

          {/* Upcoming Meetings List */}
          <div className="bg-white rounded-xl p-4 shadow-lg min-w-[250px]">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">Upcoming Meetings</h3>
            {getUpcomingMeetings().length === 0 ? (
              <p className="text-gray-500 text-sm">No upcoming meetings</p>
            ) : (
              <div className="space-y-2">
                {getUpcomingMeetings().map((meeting, listIndex) => (
                  <div key={meeting.index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">{meeting.name}</div>
                      <div className="text-sm text-gray-600">{formatMeetingTime(meeting.time)}</div>
                    </div>
                    <button
                      onClick={() => removeMeeting(meeting.index)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : showSetup ? (
        <div className="flex flex-col items-center gap-4 bg-white p-4 rounded shadow-md">
          <div className="text-lg font-semibold mb-2">Add New Meeting</div>
          <input
            type="text"
            placeholder="Meeting name"
            className="border rounded px-3 py-2 text-center text-lg w-full"
            value={meetingName}
            onChange={e => setMeetingName(e.target.value)}
          />
          <input
            type="time"
            className="border rounded px-2 py-1 text-center text-lg"
            value={targetTime}
            onChange={e => handleTimeChange(e.target.value)}
          />
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <button
            className="mt-2 px-4 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            onClick={handleStart}
            disabled={!targetTime || !meetingName.trim()}
          >
            Start Meeting Countdown
          </button>
          <button
            className="mt-1 text-xs text-gray-400 hover:underline"
            onClick={handleReset}
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4">
          <button
            className="px-4 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2"
            onClick={() => setShowSetup(true)}
          >
            <PlusIcon className="h-5 w-5" />
            Add Meeting
          </button>
          
          {/* Show existing meetings if any */}
          {meetings.length > 0 && (
            <div className="bg-white rounded-lg p-4 shadow-md min-w-[250px]">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">Your Meetings</h3>
              <div className="space-y-2">
                {getUpcomingMeetings().map((meeting, listIndex) => (
                  <div key={meeting.index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">{meeting.name}</div>
                      <div className="text-sm text-gray-600">{formatMeetingTime(meeting.time)}</div>
                    </div>
                    <button
                      onClick={() => removeMeeting(meeting.index)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Countdown;
 