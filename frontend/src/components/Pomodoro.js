import React, { useState, useRef, useEffect } from 'react';

const TomatoIcon = ({ className = '' }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className} width={32} height={32}>
    <ellipse cx="16" cy="20" rx="12" ry="10" fill="#FF6347" />
    <path d="M16 10c-1.5-4-6-4-6-4s2 2 2 4" stroke="#388e3c" strokeWidth="2" fill="none" />
    <path d="M16 10c1.5-4 6-4 6-4s-2 2-2 4" stroke="#388e3c" strokeWidth="2" fill="none" />
  </svg>
);

const DURATIONS = [0.5, 15, 20, 25];

function formatTime(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const Pomodoro = () => {
  const [showSetup, setShowSetup] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(null);
  const [active, setActive] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [showAnimation, setShowAnimation] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customMins, setCustomMins] = useState('');
  const [customSecs, setCustomSecs] = useState('');
  const intervalRef = useRef();

  useEffect(() => {
    if (active && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining(r => r - 1);
      }, 1000);
    } else if (remaining === 0 && active) {
      setActive(false);
      setShowAnimation(true);
      // Hide animation after 3 seconds
      setTimeout(() => setShowAnimation(false), 3000);
    }
    return () => clearInterval(intervalRef.current);
  }, [active, remaining]);

  const handleStart = () => {
    let totalSecs;
    if (customMode) {
      const mins = Number(customMins) || 0;
      const secs = Number(customSecs) || 0;
      totalSecs = mins * 60 + secs;
    } else {
      totalSecs = (selectedDuration || 25) * 60;
    }
    setRemaining(totalSecs);
    setActive(true);
    setShowSetup(false);
    setCustomMode(false);
    setCustomMins('');
    setCustomSecs('');
  };

  const handleReset = () => {
    setActive(false);
    setRemaining(0);
    setSelectedDuration(null);
    setShowSetup(false);
  };

  // Dial SVG
  const percent = active && selectedDuration ? (remaining / (selectedDuration * 60)) : 1;
  const radius = 60;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - percent);

  return (
    <>
      {showAnimation && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center animate-pulse bg-red-600/90"
          style={{ animation: 'pulse 1s infinite' }}
        >
          <TomatoIcon className="w-24 h-24 mb-6" />
          <div className="text-white text-6xl font-extrabold drop-shadow-lg animate-bounce mb-6">Time's Up!</div>
          <button
            className="px-6 py-3 bg-white text-red-600 font-bold rounded-full text-xl shadow hover:bg-red-100 transition"
            onClick={() => setShowAnimation(false)}
          >
            Dismiss
          </button>
        </div>
      )}
      <div className="flex flex-col items-center justify-center">
        <button
          className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-100 text-red-700 font-semibold mb-4 hover:bg-red-200 transition"
          onClick={() => setShowSetup(true)}
          disabled={active}
          title="Pomodoro Timer"
        >
          <TomatoIcon className="w-6 h-6" />
          Pomo
        </button>
        {active ? (
          <div className="flex flex-col items-center">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg width={144} height={144}>
                <circle
                  cx={72}
                  cy={72}
                  r={radius}
                  stroke="#f87171"
                  strokeWidth={10}
                  fill="none"
                  opacity={0.2}
                />
                <circle
                  cx={72}
                  cy={72}
                  r={radius}
                  stroke="#f87171"
                  strokeWidth={10}
                  fill="none"
                  strokeDasharray={circ}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 1s linear' }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-4xl font-bold text-red-600 select-none">
                {formatTime(remaining)}
              </span>
            </div>
            <button
              className="mt-4 px-4 py-2 bg-gray-200 rounded text-gray-700 hover:bg-gray-300"
              onClick={handleReset}
            >
              Reset
            </button>
          </div>
        ) : showSetup ? (
          <div className="flex flex-col items-center gap-4 bg-white p-4 rounded shadow-md">
            <div className="text-lg font-semibold mb-2">Select Pomodoro Duration</div>
            <div className="flex gap-2 flex-wrap">
              {DURATIONS.map(mins => (
                <button
                  key={mins}
                  className={`px-4 py-2 rounded-full border font-semibold ${selectedDuration === mins && !customMode ? 'bg-red-500 text-white border-red-500' : 'bg-white text-red-500 border-red-300 hover:bg-red-100'}`}
                  onClick={() => { setSelectedDuration(mins); setCustomMode(false); }}
                >
                  {mins === 0.5 ? '30 sec' : `${mins} min`}
                </button>
              ))}
              <button
                className={`px-4 py-2 rounded-full border font-semibold ${customMode ? 'bg-red-500 text-white border-red-500' : 'bg-white text-red-500 border-red-300 hover:bg-red-100'}`}
                onClick={() => { setCustomMode(true); setSelectedDuration(null); }}
              >
                Custom
              </button>
            </div>
            {customMode && (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="border rounded px-2 py-1 w-16 text-center"
                  placeholder="Min"
                  value={customMins}
                  onChange={e => setCustomMins(e.target.value.replace(/[^0-9]/g, ''))}
                />
                <span className="text-gray-500">min</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  step="1"
                  className="border rounded px-2 py-1 w-16 text-center"
                  placeholder="Sec"
                  value={customSecs}
                  onChange={e => setCustomSecs(e.target.value.replace(/[^0-9]/g, ''))}
                />
                <span className="text-gray-500">sec</span>
              </div>
            )}
            <button
              className="mt-2 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
              onClick={handleStart}
              disabled={(!selectedDuration && !customMode) || (customMode && ((Number(customMins) || 0) + (Number(customSecs) || 0) < 1))}
            >
              Start Pomo
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
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            onClick={() => setShowSetup(true)}
          >
            Start Pomo
          </button>
        )}
      </div>
    </>
  );
};

export default Pomodoro; 