import React, { useState, useRef, useEffect } from 'react';
import { ClockIcon, PlusIcon } from '@heroicons/react/24/solid';

const Countdown = () => {
  const [showSetup, setShowSetup] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [active, setActive] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [targetTime, setTargetTime] = useState('');
  const [meetingName, setMeetingName] = useState('');
  const [meetings, setMeetings] = useState([]);
  const [currentMeetingIndex, setCurrentMeetingIndex] = useState(-1);
  const [editingMeetingIndex, setEditingMeetingIndex] = useState(-1);
  const [editMeetingName, setEditMeetingName] = useState('');
  const [editMeetingTime, setEditMeetingTime] = useState('');
  const intervalRef = useRef();
  const [error, setError] = useState('');

  // Load saved meetings and countdown state on component mount
  useEffect(() => {
    const savedMeetings = localStorage.getItem('meetingCountdownMeetings');
    const savedState = localStorage.getItem('meetingCountdownState');
    
    if (savedMeetings) {
      const parsedMeetings = JSON.parse(savedMeetings);
      setMeetings(parsedMeetings);
    }
    
  }, []);
  
  // Immediate auto-restart on mount
  useEffect(() => {
    const checkAndRestart = () => {
      const savedState = localStorage.getItem('meetingCountdownState');
      if (savedState && !active) {
        const parsedState = JSON.parse(savedState);
        const { targetTime: savedTargetTime, active: savedActive, currentMeetingIndex: savedIndex } = parsedState;
        
        if (savedActive && savedTargetTime) {
          // Recalculate remaining time
          const now = new Date();
          const [targetHour, targetMinute] = savedTargetTime.split(':').map(Number);
          const target = new Date(now);
          target.setHours(targetHour, targetMinute, 0, 0);
          const diffSecs = Math.floor((target - now) / 1000);
          
          if (diffSecs > 0) {
            setTargetTime(savedTargetTime);
            setActive(true);
            setRemaining(diffSecs);
            setCurrentMeetingIndex(savedIndex || 0);
          } else {
            // Countdown finished, clear state
            localStorage.removeItem('meetingCountdownState');
          }
        }
      }
    };
    
    // Check immediately
    checkAndRestart();
    
    // Also check after a short delay to ensure meetings are loaded
    setTimeout(checkAndRestart, 500);
  }, []); // Run only on mount
  
  // Continuous check for saved countdown state
  useEffect(() => {
    const interval = setInterval(() => {
      if (!active) {
        const savedState = localStorage.getItem('meetingCountdownState');
        if (savedState) {
          const parsedState = JSON.parse(savedState);
          const { targetTime: savedTargetTime, active: savedActive, currentMeetingIndex: savedIndex } = parsedState;
          
          if (savedTargetTime) { // Changed condition: only check for targetTime, not savedActive
            // Recalculate remaining time
            const now = new Date();
            const [targetHour, targetMinute] = savedTargetTime.split(':').map(Number);
            const target = new Date(now);
            target.setHours(targetHour, targetMinute, 0, 0);
            const diffSecs = Math.floor((target - now) / 1000);
            
            if (diffSecs > 0) {
              setTargetTime(savedTargetTime);
              setActive(true);
              setRemaining(diffSecs);
              setCurrentMeetingIndex(savedIndex || 0);
            } else {
              // Countdown finished, clear state
              localStorage.removeItem('meetingCountdownState');
            }
          }
        }
      }
    }, 1000); // Check every second
    
    return () => clearInterval(interval);
  }, [active]); // Run when active state changes
  
  // Simple countdown restoration check
  useEffect(() => {
    const savedState = localStorage.getItem('meetingCountdownState');
    if (savedState && !active) {
      const parsedState = JSON.parse(savedState);
      const { targetTime: savedTargetTime, active: savedActive, currentMeetingIndex: savedIndex } = parsedState;
      
      if (savedActive && savedTargetTime && meetings.length > 0) {
        // Recalculate remaining time
        const now = new Date();
        const [targetHour, targetMinute] = savedTargetTime.split(':').map(Number);
        const target = new Date(now);
        target.setHours(targetHour, targetMinute, 0, 0);
        const diffSecs = Math.floor((target - now) / 1000);
        
        if (diffSecs > 0) {
          setTargetTime(savedTargetTime);
          setActive(true);
          setRemaining(diffSecs);
          setCurrentMeetingIndex(savedIndex || 0);
        } else {
          // Countdown finished, clear state
          localStorage.removeItem('meetingCountdownState');
        }
      }
    }
  }, [active, meetings]); // Run when active state or meetings change
  
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
    
    // Add meeting to list
    const newMeeting = { name: meetingName.trim(), time: targetTime };
    const updatedMeetings = [...meetings, newMeeting];
    setMeetings(updatedMeetings);
    saveMeetings(updatedMeetings);
    
    // Calculate remaining time
    const diffSecs = Math.floor((target - now) / 1000);
    
    // If no countdown is currently running, start one
    if (!active) {
      setRemaining(diffSecs);
      setActive(true);
      setShowSetup(false);
      setCurrentMeetingIndex(updatedMeetings.length - 1);
      setTargetTime(targetTime); // Make sure targetTime is set
      saveState(targetTime, true, updatedMeetings.length - 1);
    } else {
      // Just add to the list, don't start a new countdown
      setShowAddForm(false);
    }
    
    setMeetingName('');
    setTargetTime('');
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
    const newMeetings = meetings.filter((_, i) => i !== index);
    setMeetings(newMeetings);
    saveMeetings(newMeetings);
    
    // If we're removing the current meeting, find the next one
    if (index === currentMeetingIndex && active) {
      // Find the next upcoming meeting
      const now = new Date();
      const upcomingMeetings = newMeetings
        .map((meeting, idx) => {
          const [hour, minute] = meeting.time.split(':').map(Number);
          const meetingTime = new Date(now);
          meetingTime.setHours(hour, minute, 0, 0);
          const diffSecs = Math.floor((meetingTime - now) / 1000);
          return { ...meeting, index: idx, diffSecs };
        })
        .filter(meeting => meeting.diffSecs > 0)
        .sort((a, b) => a.diffSecs - b.diffSecs);
      
      if (upcomingMeetings.length > 0) {
        const nextMeeting = upcomingMeetings[0];
        const [targetHour, targetMinute] = nextMeeting.time.split(':').map(Number);
        const target = new Date(now);
        target.setHours(targetHour, targetMinute, 0, 0);
        const diffSecs = Math.floor((target - now) / 1000);
        
        if (diffSecs > 0) {
          setTargetTime(nextMeeting.time);
          setRemaining(diffSecs);
          setCurrentMeetingIndex(nextMeeting.index);
          saveState(nextMeeting.time, true, nextMeeting.index);
        } else {
          // Next meeting is in the past, stop countdown
          setActive(false);
          setCurrentMeetingIndex(-1);
          localStorage.removeItem('meetingCountdownState');
        }
      } else {
        // No upcoming meetings, stop countdown
        setActive(false);
        setCurrentMeetingIndex(-1);
        localStorage.removeItem('meetingCountdownState');
      }
    } else if (index < currentMeetingIndex) {
      // Adjust the current meeting index if we removed a meeting before it
      setCurrentMeetingIndex(currentMeetingIndex - 1);
    }
  };

  const startEdit = (index) => {
    const meeting = meetings[index];
    setEditingMeetingIndex(index);
    setEditMeetingName(meeting.name);
    setEditMeetingTime(meeting.time);
  };

  const saveEdit = () => {
    if (!editMeetingName.trim()) {
      setError('Please enter a meeting name.');
      return;
    }
    if (!editMeetingTime) {
      setError('Please select a meeting time.');
      return;
    }
    
    const updatedMeetings = [...meetings];
    updatedMeetings[editingMeetingIndex] = {
      name: editMeetingName.trim(),
      time: editMeetingTime
    };
    
    setMeetings(updatedMeetings);
    saveMeetings(updatedMeetings);
    
    // If editing the current meeting, update the countdown
    if (editingMeetingIndex === currentMeetingIndex) {
      const now = new Date();
      const [targetHour, targetMinute] = editMeetingTime.split(':').map(Number);
      const target = new Date(now);
      target.setHours(targetHour, targetMinute, 0, 0);
      const diffSecs = Math.floor((target - now) / 1000);
      setRemaining(diffSecs);
      setTargetTime(editMeetingTime);
      saveState(editMeetingTime, true, currentMeetingIndex);
    }
    
    setEditingMeetingIndex(-1);
    setEditMeetingName('');
    setEditMeetingTime('');
    setError('');
  };

  const cancelEdit = () => {
    setEditingMeetingIndex(-1);
    setEditMeetingName('');
    setEditMeetingTime('');
    setError('');
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
    <div className="bg-white rounded-lg shadow-sm p-4">
      {active ? (
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <ClockIcon className="h-5 w-5 text-indigo-600" />
            <span className="text-lg font-semibold text-gray-800">
              {meetings[currentMeetingIndex]?.name || 'Meeting'}
            </span>
          </div>
          <div className="text-3xl font-bold text-indigo-600 mb-4">
            {formatTime(remaining)}
          </div>
          <div className="text-sm text-gray-600 mb-4">
            {meetings[currentMeetingIndex]?.time && formatMeetingTime(meetings[currentMeetingIndex].time)}
          </div>
          <div className="flex justify-center gap-2">
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              Reset
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <ClockIcon className="h-5 w-5 text-gray-600" />
            <span className="text-lg font-semibold text-gray-800">Meeting Countdown</span>
          </div>
          {meetings.length > 0 ? (
            <div className="space-y-2">
              <div className="text-sm text-gray-600 mb-4">
                {getUpcomingMeetings().length > 0 
                  ? `${getUpcomingMeetings().length} upcoming meeting${getUpcomingMeetings().length > 1 ? 's' : ''}`
                  : 'No upcoming meetings'
                }
              </div>
              {getUpcomingMeetings().slice(0, 3).map((meeting, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-700">{meeting.name}</span>
                  <span className="text-sm text-gray-500">{meeting.time}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => startEdit(meeting.index)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => removeMeeting(meeting.index)}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
              {getUpcomingMeetings().length > 3 && (
                <div className="text-xs text-gray-500">
                  +{getUpcomingMeetings().length - 3} more
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500 mb-4">No meetings scheduled</div>
          )}
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
            >
              <PlusIcon className="h-4 w-4 inline mr-1" />
              Add Meeting
            </button>
          </div>
        </div>
      )}

      {/* Add Meeting Form */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Add Meeting</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meeting Name
                </label>
                <input
                  type="text"
                  value={meetingName}
                  onChange={(e) => setMeetingName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter meeting name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time
                </label>
                <input
                  type="time"
                  value={targetTime}
                  onChange={(e) => setTargetTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {error && (
                <div className="text-red-600 text-sm">{error}</div>
              )}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowAddForm(false);
                    setMeetingName('');
                    setTargetTime('');
                    setError('');
                  }}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStart}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  Add Meeting
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Meeting Form */}
      {editingMeetingIndex !== -1 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Edit Meeting</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meeting Name
                </label>
                <input
                  type="text"
                  value={editMeetingName}
                  onChange={(e) => setEditMeetingName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter meeting name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time
                </label>
                <input
                  type="time"
                  value={editMeetingTime}
                  onChange={(e) => setEditMeetingTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={cancelEdit}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Countdown;
 