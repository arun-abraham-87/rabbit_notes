import React, { useState, useRef, useEffect } from 'react';
import { ClockIcon, PlusIcon } from '@heroicons/react/24/solid';

const Countdown = () => {
  const [showSetup, setShowSetup] = useState(false);
  
  // Allowed minutes for time selection
  const allowedMinutes = ['00', '05', '15', '30', '35', '45'];
  
  // Generate hours array for 12-hour format (1-12)
  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  
  // AM/PM options
  const ampmOptions = ['AM', 'PM'];
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
  const [selectedHour, setSelectedHour] = useState('');
  const [selectedMinute, setSelectedMinute] = useState('');
  const [selectedAmPm, setSelectedAmPm] = useState('');
  const [editSelectedHour, setEditSelectedHour] = useState('');
  const [editSelectedMinute, setEditSelectedMinute] = useState('');
  const [editSelectedAmPm, setEditSelectedAmPm] = useState('');
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
    
    // Convert 24-hour time to 12-hour format for display
    const time12 = convertTo12Hour(meeting.time);
    setEditSelectedHour(time12.hour);
    setEditSelectedMinute(time12.minute);
    setEditSelectedAmPm(time12.ampm);
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

  // Convert 12-hour format to 24-hour format
  const convertTo24Hour = (hour, minute, ampm) => {
    if (!hour || !minute || !ampm) return '';
    
    let hour24 = parseInt(hour);
    if (ampm === 'PM' && hour24 !== 12) {
      hour24 += 12;
    } else if (ampm === 'AM' && hour24 === 12) {
      hour24 = 0;
    }
    
    return `${hour24.toString().padStart(2, '0')}:${minute}`;
  };

  // Convert 24-hour format to 12-hour format
  const convertTo12Hour = (time24) => {
    if (!time24) return { hour: '', minute: '', ampm: '' };
    
    const [hour24, minute] = time24.split(':');
    const hour24Num = parseInt(hour24);
    
    let hour12 = hour24Num;
    let ampm = 'AM';
    
    if (hour24Num === 0) {
      hour12 = 12;
    } else if (hour24Num > 12) {
      hour12 = hour24Num - 12;
      ampm = 'PM';
    } else if (hour24Num === 12) {
      ampm = 'PM';
    }
    
    return {
      hour: hour12.toString().padStart(2, '0'),
      minute,
      ampm
    };
  };

  const handleCustomTimeChange = (hour, minute, ampm) => {
    setSelectedHour(hour);
    setSelectedMinute(minute);
    setSelectedAmPm(ampm);
    const time24 = convertTo24Hour(hour, minute, ampm);
    setTargetTime(time24);
  };

  const handleEditCustomTimeChange = (hour, minute, ampm) => {
    setEditSelectedHour(hour);
    setEditSelectedMinute(minute);
    setEditSelectedAmPm(ampm);
    const time24 = convertTo24Hour(hour, minute, ampm);
    setEditMeetingTime(time24);
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
    <div className="group flex flex-col items-start border border-gray-200 rounded-lg shadow-sm px-4 py-3 min-w-[220px] max-w-xs h-40 bg-white">
      {active ? (
        <div className="w-full h-full flex flex-col">
          <div className="text-2xl font-bold text-gray-600 mb-2">
            {formatTime(remaining)}
          </div>
          <div className="text-sm text-gray-500 mb-2">until</div>
          <div className="font-medium text-gray-900 w-full break-words leading-relaxed" style={{ wordBreak: 'break-word', lineHeight: '1.6' }}>
            {meetings[currentMeetingIndex]?.name || 'Meeting'}
          </div>
          <div className="text-sm text-gray-500 mt-auto">
            {meetings[currentMeetingIndex]?.time && formatMeetingTime(meetings[currentMeetingIndex].time)}
          </div>
          <div className="flex gap-2 mt-2 self-end opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleReset}
              className="text-red-500 hover:text-red-700 p-1"
              title="Reset"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <div className="w-full h-full flex flex-col">
          <div className="text-2xl font-bold text-gray-600 mb-2">
            {meetings.length}
          </div>
          <div className="text-sm text-gray-500 mb-4">Total Meetings</div>
          
          {meetings.length > 0 ? (
            <div className="text-sm text-gray-600 mb-2">
              {getUpcomingMeetings().length > 0 
                ? `${getUpcomingMeetings().length} upcoming`
                : 'No upcoming meetings'
              }
            </div>
          ) : (
            <div className="text-sm text-gray-500 mb-2">No meetings scheduled</div>
          )}
          
          <div className="flex gap-2 mt-auto self-end opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setShowAddForm(true)}
              className="text-blue-500 hover:text-blue-700 p-1"
              title="Add Meeting"
            >
              <PlusIcon className="h-4 w-4" />
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
                <div className="flex gap-2">
                  <select
                    value={selectedHour}
                    onChange={(e) => handleCustomTimeChange(e.target.value, selectedMinute, selectedAmPm)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Hour</option>
                    {hours.map(hour => (
                      <option key={hour} value={hour}>{hour}</option>
                    ))}
                  </select>
                  <span className="flex items-center text-gray-500">:</span>
                  <select
                    value={selectedMinute}
                    onChange={(e) => handleCustomTimeChange(selectedHour, e.target.value, selectedAmPm)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Min</option>
                    {allowedMinutes.map(minute => (
                      <option key={minute} value={minute}>{minute}</option>
                    ))}
                  </select>
                  <select
                    value={selectedAmPm}
                    onChange={(e) => handleCustomTimeChange(selectedHour, selectedMinute, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">AM/PM</option>
                    {ampmOptions.map(ampm => (
                      <option key={ampm} value={ampm}>{ampm}</option>
                    ))}
                  </select>
                </div>
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
                    setSelectedHour('');
                    setSelectedMinute('');
                    setSelectedAmPm('');
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
                <div className="flex gap-2">
                  <select
                    value={editSelectedHour}
                    onChange={(e) => handleEditCustomTimeChange(e.target.value, editSelectedMinute, editSelectedAmPm)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Hour</option>
                    {hours.map(hour => (
                      <option key={hour} value={hour}>{hour}</option>
                    ))}
                  </select>
                  <span className="flex items-center text-gray-500">:</span>
                  <select
                    value={editSelectedMinute}
                    onChange={(e) => handleEditCustomTimeChange(editSelectedHour, e.target.value, editSelectedAmPm)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Min</option>
                    {allowedMinutes.map(minute => (
                      <option key={minute} value={minute}>{minute}</option>
                    ))}
                  </select>
                  <select
                    value={editSelectedAmPm}
                    onChange={(e) => handleEditCustomTimeChange(editSelectedHour, editSelectedMinute, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">AM/PM</option>
                    {ampmOptions.map(ampm => (
                      <option key={ampm} value={ampm}>{ampm}</option>
                    ))}
                  </select>
                </div>
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
 