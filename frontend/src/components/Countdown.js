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
    
    console.log('Loading saved data:', { savedMeetings, savedState });
    
    if (savedMeetings) {
      const parsedMeetings = JSON.parse(savedMeetings);
      console.log('Parsed meetings:', parsedMeetings);
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
          console.log('Auto-restarting countdown on mount:', parsedState);
          
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
      console.log('Interval check - active:', active);
      if (!active) {
        const savedState = localStorage.getItem('meetingCountdownState');
        console.log('Saved state from localStorage:', savedState);
        if (savedState) {
          const parsedState = JSON.parse(savedState);
          console.log('Parsed state:', parsedState);
          const { targetTime: savedTargetTime, active: savedActive, currentMeetingIndex: savedIndex } = parsedState;
          
          console.log('Checking conditions:', { savedActive, savedTargetTime, savedIndex });
          
          if (savedTargetTime) { // Changed condition: only check for targetTime, not savedActive
            console.log('Auto-restarting countdown via interval:', parsedState);
            
            // Recalculate remaining time
            const now = new Date();
            const [targetHour, targetMinute] = savedTargetTime.split(':').map(Number);
            const target = new Date(now);
            target.setHours(targetHour, targetMinute, 0, 0);
            const diffSecs = Math.floor((target - now) / 1000);
            
            console.log('Calculated diffSecs:', diffSecs);
            
            if (diffSecs > 0) {
              console.log('Setting countdown state...');
              setTargetTime(savedTargetTime);
              setActive(true);
              setRemaining(diffSecs);
              setCurrentMeetingIndex(savedIndex || 0);
            } else {
              // Countdown finished, clear state
              console.log('Countdown finished, clearing state');
              localStorage.removeItem('meetingCountdownState');
            }
          } else {
            console.log('Conditions not met for auto-restart');
          }
        } else {
          console.log('No saved state found');
        }
      } else {
        console.log('Countdown already active, skipping check');
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
        console.log('Auto-restarting countdown:', parsedState);
        
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
    console.log('Saving state to localStorage:', state);
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
    console.log('Removing meeting at index:', index, 'Current meeting index:', currentMeetingIndex);
    console.log('Current meetings:', meetings);
    
    const updatedMeetings = meetings.filter((_, i) => i !== index);
    setMeetings(updatedMeetings);
    saveMeetings(updatedMeetings);
    
    // If we're removing the current meeting, try to start the next meeting
    if (index === currentMeetingIndex) {
      console.log('Removing current meeting, looking for next meeting...');
      
      // Get upcoming meetings after removal
      const upcomingMeetings = updatedMeetings
        .map((meeting, idx) => {
          const [hours, minutes] = meeting.time.split(':').map(Number);
          const meetingTime = new Date();
          meetingTime.setHours(hours, minutes, 0, 0);
          const diffMs = meetingTime - new Date();
          return {
            ...meeting,
            index: idx,
            diffMs,
            isPast: diffMs <= 0
          };
        })
        .filter(meeting => !meeting.isPast)
        .sort((a, b) => a.diffMs - b.diffMs);
      
      console.log('Upcoming meetings after removal:', upcomingMeetings);
      
      if (upcomingMeetings.length > 0) {
        // Start countdown for the next meeting
        const nextMeeting = upcomingMeetings[0];
        const now = new Date();
        const [targetHour, targetMinute] = nextMeeting.time.split(':').map(Number);
        const target = new Date(now);
        target.setHours(targetHour, targetMinute, 0, 0);
        const diffSecs = Math.floor((target - now) / 1000);
        
        console.log('Next meeting:', nextMeeting, 'diffSecs:', diffSecs);
        
        if (diffSecs > 0) {
          setTargetTime(nextMeeting.time);
          setActive(true);
          setRemaining(diffSecs);
          setCurrentMeetingIndex(nextMeeting.index);
          saveState(nextMeeting.time, true, nextMeeting.index);
          console.log('Switched to next meeting:', nextMeeting.name, 'at index:', nextMeeting.index);
        } else {
          // Next meeting is in the past, stop countdown
          console.log('Next meeting is in the past, stopping countdown');
          handleReset();
        }
      } else {
        // No upcoming meetings, stop countdown
        console.log('No upcoming meetings, stopping countdown');
        handleReset();
      }
    } else if (index < currentMeetingIndex) {
      // Adjust current meeting index
      setCurrentMeetingIndex(currentMeetingIndex - 1);
      console.log('Adjusted current meeting index to:', currentMeetingIndex - 1);
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
    <div className="flex flex-col items-center justify-center">
      {console.log('Countdown state:', { active, remaining, targetTime, currentMeetingIndex })}
      {console.log('Should show countdown:', active)}
      {console.log('Remaining time:', remaining)}
      {active ? (
        <div className="flex items-start gap-6">
          {/* Countdown Timer */}
          <div className="flex flex-col items-center bg-black/90 rounded-xl p-6 shadow-lg">
            <div className="text-white text-6xl font-extrabold mb-4 tracking-widest select-none">
              {formatTime(remaining)}
            </div>
            <div className="text-white text-lg mb-2">
              {meetings[currentMeetingIndex]?.name || 'Meeting'} at {formatMeetingTime(targetTime) || 'unknown time'}
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
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-800">Upcoming Meetings</h3>
              <button
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                onClick={() => setShowAddForm(true)}
              >
                Add Meeting
              </button>
            </div>
            {getUpcomingMeetings().length === 0 ? (
              <p className="text-gray-500 text-sm">No upcoming meetings</p>
            ) : (
              <div className="space-y-2">
                {getUpcomingMeetings().map((meeting, listIndex) => (
                  <div key={meeting.index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    {editingMeetingIndex === meeting.index ? (
                      // Edit form
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          placeholder="Meeting name"
                          className="border rounded px-2 py-1 text-sm w-full"
                          value={editMeetingName}
                          onChange={e => setEditMeetingName(e.target.value)}
                        />
                        <input
                          type="time"
                          className="border rounded px-2 py-1 text-sm w-full"
                          value={editMeetingTime}
                          onChange={e => setEditMeetingTime(e.target.value)}
                        />
                        {error && <div className="text-red-500 text-xs">{error}</div>}
                        <div className="flex gap-1">
                          <button
                            onClick={saveEdit}
                            className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Normal display
                      <>
                        <div className="flex-1">
                          <div className="font-medium text-gray-800">{meeting.name}</div>
                          <div className="text-sm text-gray-600">{formatMeetingTime(meeting.time)}</div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => startEdit(meeting.index)}
                            className="text-blue-500 hover:text-blue-700 text-sm"
                            title="Edit meeting"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => removeMeeting(meeting.index)}
                            className="text-red-500 hover:text-red-700 text-sm"
                            title="Remove meeting"
                          >
                            ×
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Add Meeting Form when countdown is active */}
            {showAddForm && (
              <div className="mt-4 p-3 bg-gray-50 rounded">
                <div className="text-sm font-semibold mb-2">Add New Meeting</div>
                <input
                  type="text"
                  placeholder="Meeting name"
                  className="border rounded px-2 py-1 text-sm w-full mb-2"
                  value={meetingName}
                  onChange={e => setMeetingName(e.target.value)}
                />
                <input
                  type="time"
                  className="border rounded px-2 py-1 text-sm w-full mb-2"
                  value={targetTime}
                  onChange={e => handleTimeChange(e.target.value)}
                />
                {error && <div className="text-red-500 text-xs mb-2">{error}</div>}
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
                    onClick={handleStart}
                    disabled={!targetTime || !meetingName.trim()}
                  >
                    Add Meeting
                  </button>
                  <button
                    className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                    onClick={() => {
                      setShowAddForm(false);
                      setMeetingName('');
                      setTargetTime('');
                      setError('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
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
          
          {/* Manual restart button for saved countdowns */}
          {!active && localStorage.getItem('meetingCountdownState') && (
            <button
              className="px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-semibold text-lg"
              onClick={() => {
                const savedState = localStorage.getItem('meetingCountdownState');
                if (savedState) {
                  const { targetTime: savedTargetTime, currentMeetingIndex: savedIndex } = JSON.parse(savedState);
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
                  }
                }
              }}
            >
              🔄 Resume Countdown
            </button>
          )}
          
          {/* Show existing meetings if any */}
          {meetings.length > 0 && (
            <div className="bg-white rounded-lg p-4 shadow-md min-w-[250px]">
              <h3 className="text-lg font-semibold mb-3 text-gray-800">Your Meetings</h3>
              <div className="space-y-2">
                {getUpcomingMeetings().map((meeting, listIndex) => (
                  <div key={meeting.index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    {editingMeetingIndex === meeting.index ? (
                      // Edit form
                      <div className="flex-1 space-y-2">
                        <input
                          type="text"
                          placeholder="Meeting name"
                          className="border rounded px-2 py-1 text-sm w-full"
                          value={editMeetingName}
                          onChange={e => setEditMeetingName(e.target.value)}
                        />
                        <input
                          type="time"
                          className="border rounded px-2 py-1 text-sm w-full"
                          value={editMeetingTime}
                          onChange={e => setEditMeetingTime(e.target.value)}
                        />
                        {error && <div className="text-red-500 text-xs">{error}</div>}
                        <div className="flex gap-1">
                          <button
                            onClick={saveEdit}
                            className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Normal display
                      <>
                        <div className="flex-1">
                          <div className="font-medium text-gray-800">{meeting.name}</div>
                          <div className="text-sm text-gray-600">{formatMeetingTime(meeting.time)}</div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => startEdit(meeting.index)}
                            className="text-blue-500 hover:text-blue-700 text-sm"
                            title="Edit meeting"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => removeMeeting(meeting.index)}
                            className="text-red-500 hover:text-red-700 text-sm"
                            title="Remove meeting"
                          >
                            ×
                          </button>
                        </div>
                      </>
                    )}
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
 