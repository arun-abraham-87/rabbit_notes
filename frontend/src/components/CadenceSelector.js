import React, { useState, useEffect } from 'react';
import { parseReviewCadenceMeta, handleCadenceChange } from '../utils/CadenceUtils';

const CadenceSelector = ({ noteId, notes, onCadenceChange }) => {
  const [cadenceType, setCadenceType] = useState('every-x-hours');
  const [cadenceHours, setCadenceHours] = useState(12);
  const [cadenceMinutes, setCadenceMinutes] = useState(0);
  const [cadenceDays, setCadenceDays] = useState(0);
  const [dailyTime, setDailyTime] = useState('09:00');
  const [weeklyTime, setWeeklyTime] = useState('09:00');
  const [weeklyDays, setWeeklyDays] = useState([]);
  const [monthlyTime, setMonthlyTime] = useState('09:00');
  const [monthlyDay, setMonthlyDay] = useState(1);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('');

  // Initialize state from existing note
  useEffect(() => {
    const note = notes.find(n => n.id === noteId);
    if (note) {
      const meta = parseReviewCadenceMeta(note.content);
      if (meta) {
        setCadenceType(meta.type || 'every-x-hours');
        setCadenceHours(meta.hours || 12);
        setCadenceMinutes(meta.minutes || 0);
        setCadenceDays(meta.days || 0);
        setDailyTime(meta.time || '09:00');
        setWeeklyTime(meta.time || '09:00');
        setWeeklyDays(Array.isArray(meta.days) ? meta.days : []);
        setMonthlyTime(meta.time || '09:00');
        setMonthlyDay(meta.day || 1);
        setStartDate(meta.start || new Date().toISOString().slice(0, 10));
        setEndDate(meta.end || '');
      }
    }
  }, [noteId, notes]);

  const handleCadenceChangeSave = async () => {
    await handleCadenceChange(notes, noteId, cadenceHours, cadenceMinutes, cadenceType, cadenceDays, dailyTime, weeklyTime, weeklyDays, monthlyTime, monthlyDay, startDate, endDate);
    if (onCadenceChange) {
      onCadenceChange();
    }
  }


return (
  <div className="flex flex-col gap-2 bg-white p-3 rounded shadow z-50">
    <label className="text-xs font-semibold mb-1">Cadence Type</label>
    <select
      value={cadenceType}
      onChange={e => setCadenceType(e.target.value)}
      className="border rounded px-2 py-1 text-sm mb-2"
    >
      <option value="every-x-hours">Every X hours</option>
      <option value="daily">Daily</option>
      <option value="weekly">Weekly</option>
      <option value="monthly">Monthly</option>
      <option value="yearly">Yearly</option>
    </select>

    {cadenceType === 'every-x-hours' && (
      <>
        <div className="flex flex-wrap gap-2 mb-2">
          {[
            { d: 0, h: 2, m: 0, label: '2h' },
            { d: 0, h: 4, m: 0, label: '4h' },
            { d: 0, h: 8, m: 0, label: '8h' },
            { d: 0, h: 12, m: 0, label: '12h' },
            { d: 1, h: 0, m: 0, label: '24h' },
            { d: 3, h: 0, m: 0, label: '3d' },
            { d: 7, h: 0, m: 0, label: '7d' }
          ].map(opt => (
            <button
              key={opt.label}
              className="px-2 py-1 bg-gray-100 rounded hover:bg-blue-100 text-xs"
              onClick={() => { setCadenceDays(opt.d); setCadenceHours(opt.h); setCadenceMinutes(opt.m); }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 mb-2">
          <input
            type="number"
            min="0"
            max="365"
            value={cadenceDays}
            onChange={e => setCadenceDays(parseInt(e.target.value) || 0)}
            className="w-12 px-1 py-0.5 border rounded text-sm"
            placeholder="Days"
          />
          <span className="text-sm">d</span>
          <input
            type="number"
            min="0"
            max="23"
            value={cadenceHours}
            onChange={e => setCadenceHours(parseInt(e.target.value) || 0)}
            className="w-12 px-1 py-0.5 border rounded text-sm"
            placeholder="Hours"
          />
          <span className="text-sm">h</span>
          <input
            type="number"
            min="0"
            max="59"
            value={cadenceMinutes}
            onChange={e => setCadenceMinutes(parseInt(e.target.value) || 0)}
            className="w-12 px-1 py-0.5 border rounded text-sm"
            placeholder="Minutes"
          />
          <span className="text-sm">m</span>
        </div>
      </>
    )}

    {cadenceType === 'daily' && (
      <div className="flex items-center gap-2 mb-2">
        <label className="text-xs">Time of day:</label>
        <input
          type="time"
          value={dailyTime}
          onChange={e => setDailyTime(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        />
      </div>
    )}

    {cadenceType === 'weekly' && (
      <>
        <div className="flex items-center gap-2 mb-2">
          <label className="text-xs">Time of day:</label>
          <input
            type="time"
            value={weeklyTime}
            onChange={e => setWeeklyTime(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          />
        </div>
        <div className="flex items-center gap-2 mb-2">
          <label className="text-xs">Days:</label>
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, idx) => (
            <label key={d} className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={weeklyDays.includes(idx)}
                onChange={e => {
                  if (e.target.checked) {
                    setWeeklyDays(prev => [...prev, idx]);
                  } else {
                    setWeeklyDays(prev => prev.filter(day => day !== idx));
                  }
                }}
              />
              {d}
            </label>
          ))}
        </div>
      </>
    )}

    {cadenceType === 'monthly' && (
      <>
        <div className="flex items-center gap-2 mb-2">
          <label className="text-xs">Day of month:</label>
          <select
            value={monthlyDay}
            onChange={e => setMonthlyDay(Number(e.target.value))}
            className="border rounded px-2 py-1 text-sm"
          >
            {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
              <option key={day} value={day}>{day}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <label className="text-xs">Time of day:</label>
          <input
            type="time"
            value={monthlyTime}
            onChange={e => setMonthlyTime(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          />
        </div>
      </>
    )}

    <div className="flex items-center gap-2 mb-2">
      <label className="text-xs">Start Date:</label>
      <input
        type="date"
        value={startDate}
        onChange={e => setStartDate(e.target.value)}
        className="border rounded px-2 py-1 text-sm"
      />
      <label className="text-xs">End Date:</label>
      <input
        type="date"
        value={endDate}
        onChange={e => setEndDate(e.target.value)}
        className="border rounded px-2 py-1 text-sm"
      />
    </div>

    <div className="flex gap-2 mt-2">
      <button
        onClick={handleCadenceChangeSave}
        className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200"
      >
        Set
      </button>
      <button
        onClick={() => onCadenceChange && onCadenceChange()}
        className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
      >
        Cancel
      </button>
    </div>
  </div>
);
};

export default CadenceSelector; 