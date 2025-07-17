import React, { useState, useRef, useEffect } from 'react';
import { ClockIcon } from '@heroicons/react/24/solid';

const Countdown = () => {
  const [showSetup, setShowSetup] = useState(false);
  const [active, setActive] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [targetTime, setTargetTime] = useState('');
  const intervalRef = useRef();
  const [error, setError] = useState('');

  // Load saved countdown state on component mount
  useEffect(() => {
    const savedState = localStorage.getItem('meetingCountdownState');
    if (savedState) {
      const { targetTime: savedTargetTime, active: savedActive, startTime } = JSON.parse(savedState);
      setTargetTime(savedTargetTime);
      setActive(savedActive);
      
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
        }
      }
    }
  }, []);

  // Save countdown state to localStorage
  const saveState = (targetTime, active, remaining = 0) => {
    const state = {
      targetTime,
      active,
      startTime: active ? new Date().toISOString() : null
    };
    localStorage.setItem('meetingCountdownState', JSON.stringify(state));
  };

  // Save just the target time (for when countdown isnt active)
  const saveTargetTime = (targetTime) => {
    const state = {
      targetTime,
      active: false,
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
        new Notification('Meeting Time!', {
          body: 'Your meeting is starting now!',
          icon: '/favicon.ico'
        });
      }
    }
    return () => clearInterval(intervalRef.current);
  }, [active, remaining]);

  const handleStart = () => {
    if (!targetTime) {
      setError('Please select a meeting time.');
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
    saveState(targetTime, true);
  };

  const handleReset = () => {
    setActive(false);
    setRemaining(0);
    setShowSetup(false);
    setTargetTime('');
    setError('');
    localStorage.removeItem('meetingCountdownState');
  };

  const handleTimeChange = (newTime) => {
    setTargetTime(newTime);
    if (newTime) {
      saveTargetTime(newTime);
    }
  };

  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) {
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center justify-center">
      {active ? (
        <div className="flex flex-col items-center bg-black/90 rounded-xl p-6 shadow-lg">
          <div className="text-white text-6xl font-extrabold mb-4 tracking-widest select-none">
            {formatTime(remaining)}
          </div>
          <div className="text-white text-lg mb-2">Meeting at {targetTime}</div>
          <button
            className="mt-2 px-4 py-2 bg-gray-200 rounded text-gray-700 hover:bg-gray-300 font-semibold"
            onClick={handleReset}
          >
            Cancel Meeting
          </button>
        </div>
      ) : showSetup ? (
        <div className="flex flex-col items-center gap-4 bg-white p-4 rounded shadow-md">
          <div className="text-lg font-semibold mb-2">Set Meeting Time</div>
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
            disabled={!targetTime}
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
        <button
          className="px-4 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-2"
          onClick={() => setShowSetup(true)}
        >
          <ClockIcon className="h-5 w-5" />
          Meeting Countdown
        </button>
      )}
    </div>
  );
};

export default Countdown;
 