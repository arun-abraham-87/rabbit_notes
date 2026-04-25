import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';

const DURATION = 10;
const RADIUS = 9;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * UndoToast — shows a circular countdown timer with an Undo button.
 *
 * Props:
 *   label   – string shown next to the timer
 *   onUndo  – called when Undo is clicked (should revert the change)
 *   toastId – id used to dismiss this toast after undo
 */
const UndoToast = ({ label, onUndo, toastId }) => {
  const [remaining, setRemaining] = useState(DURATION);

  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const left = Math.max(0, DURATION - elapsed);
      setRemaining(left);
      if (left <= 0) clearInterval(interval);
    }, 80);
    return () => clearInterval(interval);
  }, []);

  const dashOffset = CIRCUMFERENCE * (remaining / DURATION);

  const handleUndo = () => {
    onUndo();
    if (toastId) toast.dismiss(toastId);
  };

  return (
    <div className="flex items-center gap-3 py-0.5">
      {/* Circular countdown */}
      <div className="relative w-7 h-7 flex-shrink-0">
        <svg className="w-7 h-7 -rotate-90" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r={RADIUS} fill="none" stroke="#e5e7eb" strokeWidth="2.5" />
          <circle
            cx="12" cy="12" r={RADIUS}
            fill="none"
            stroke="#6366f1"
            strokeWidth="2.5"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE - dashOffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.08s linear' }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-gray-600 rotate-90" style={{ transform: 'none' }}>
          {Math.ceil(remaining)}
        </span>
      </div>

      <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{label}</span>

      <button
        onClick={handleUndo}
        className="flex-shrink-0 px-2.5 py-1 bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors"
      >
        Undo
      </button>
    </div>
  );
};

export default UndoToast;
