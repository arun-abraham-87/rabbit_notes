import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  PlusIcon, PencilSquareIcon, TrashIcon, CheckIcon,
  ChevronDownIcon, ChevronUpIcon, XMarkIcon,
  ExclamationTriangleIcon, ClockIcon,
} from '@heroicons/react/24/solid';
import { FireIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import { loadNotes, createNote, updateNoteById, deleteNoteById } from '../utils/ApiUtils';
import { createTrackerAnswerNote, shouldAskOnDate } from '../utils/TrackerQuestionUtils';

// ─── Constants ────────────────────────────────────────────────────────────────
const CADENCES = ['Daily', 'Weekly', 'Monthly', 'Yearly'];
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TRACKER_TYPES = [
  { value: 'Yes,No',      label: 'Yes / No',    desc: 'Did you do it?' },
  { value: 'value',       label: 'Number',       desc: 'Track a numeric value' },
  { value: 'value_time',  label: 'Time',         desc: 'Track duration' },
  { value: 'adhoc_date',  label: 'Adhoc Date',   desc: 'Log when something happens' },
  { value: 'adhoc_value', label: 'Adhoc Value',  desc: 'Log a value when something happens' },
];
const COLORS = ['blue','green','purple','red','orange','yellow','pink','indigo','teal','gray'];
const EMOJIS = ['📊','💪','🏃','⚖️','💧','😴','🍎','🧘','📚','🎯','🌡️','❤️','🔥','⚡','🌿','📝','🎵','🧠','💊','🏋️'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

// ─── Color helper ─────────────────────────────────────────────────────────────
function clr(color) {
  const m = {
    blue:   { ring:'ring-blue-400',   bg:'bg-blue-50',   text:'text-blue-700',   dot:'bg-blue-500',   btn:'bg-blue-500 border-blue-500' },
    green:  { ring:'ring-green-400',  bg:'bg-green-50',  text:'text-green-700',  dot:'bg-green-500',  btn:'bg-green-500 border-green-500' },
    purple: { ring:'ring-purple-400', bg:'bg-purple-50', text:'text-purple-700', dot:'bg-purple-500', btn:'bg-purple-500 border-purple-500' },
    red:    { ring:'ring-red-400',    bg:'bg-red-50',    text:'text-red-700',    dot:'bg-red-500',    btn:'bg-red-500 border-red-500' },
    orange: { ring:'ring-orange-400', bg:'bg-orange-50', text:'text-orange-700', dot:'bg-orange-500', btn:'bg-orange-500 border-orange-500' },
    yellow: { ring:'ring-yellow-400', bg:'bg-yellow-50', text:'text-yellow-700', dot:'bg-yellow-500', btn:'bg-yellow-500 border-yellow-500' },
    pink:   { ring:'ring-pink-400',   bg:'bg-pink-50',   text:'text-pink-700',   dot:'bg-pink-500',   btn:'bg-pink-500 border-pink-500' },
    indigo: { ring:'ring-indigo-400', bg:'bg-indigo-50', text:'text-indigo-700', dot:'bg-indigo-500', btn:'bg-indigo-500 border-indigo-500' },
    teal:   { ring:'ring-teal-400',   bg:'bg-teal-50',   text:'text-teal-700',   dot:'bg-teal-500',   btn:'bg-teal-500 border-teal-500' },
    gray:   { ring:'ring-gray-400',   bg:'bg-gray-50',   text:'text-gray-700',   dot:'bg-gray-500',   btn:'bg-gray-500 border-gray-500' },
  };
  return m[color] || m.blue;
}

// ─── Date helpers ─────────────────────────────────────────────────────────────
function toYMD(d) {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${day}`;
}
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function startOfWeek(d) { const r = new Date(d); r.setDate(r.getDate() - r.getDay()); return r; }
function fmtHistDate(ymd) {
  const [, m, d] = ymd.split('-');
  return `${MONTH_SHORT[parseInt(m, 10) - 1]} ${parseInt(d, 10)}`;
}

// ─── Parse tracker notes ──────────────────────────────────────────────────────
function parseTrackers(notes) {
  return notes
    .filter(n => n.content && n.content.split('\n').some(l => l.trim() === 'meta::tracker'))
    .map(n => {
      const lines = n.content.split('\n');
      const g = k => lines.find(l => l.startsWith(k + ':'))?.replace(k + ':', '').trim() || '';
      const daysStr = g('Days');
      const tagsStr = g('Tags');
      return {
        id: n.id,
        title: g('Title'),
        question: g('Question'),
        type: g('Type'),
        cadence: g('Cadence'),
        days: daysStr ? daysStr.split(',').map(d => d.trim()).filter(Boolean) : [],
        startDate: g('Start Date'),
        endDate: g('End Date') || '',
        tags: tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [],
        overdueDays: g('overdue') || '30',
        watched: lines.some(l => l.trim() === 'meta::tracker_watched'),
        emoji: g('Emoji') || '📊',
        color: g('Color') || 'blue',
        group: g('Group') || '',
      };
    });
}

function parseAnswers(notes, trackers) {
  const map = {};
  const trackerIds = new Set(trackers.map(t => String(t.id)));
  notes
    .filter(n => n.content && n.content.split('\n').some(l => l.trim() === 'meta::tracker_answer'))
    .forEach(n => {
      const lines = n.content.split('\n');
      const g = k => lines.find(l => l.startsWith(k + ':'))?.replace(k + ':', '').trim() || '';
      const link = lines.find(l => l.startsWith('meta::link:'))?.replace('meta::link:', '').trim();
      const answer = g('Answer');
      const date = g('Date');
      const notesText = g('Notes');
      if (link && answer && date && trackerIds.has(link)) {
        if (!map[link]) map[link] = {};
        if (!map[link][date] || n.id > map[link][date].id) {
          map[link][date] = { id: n.id, answer, notes: notesText };
        }
      }
    });
  return map;
}

// ─── Streak ───────────────────────────────────────────────────────────────────
function calcStreak(tracker, answerMap) {
  if (!tracker.startDate) return 0;
  const answers = answerMap[tracker.id] || {};
  let streak = 0;
  let d = new Date();
  while (true) {
    const ymd = toYMD(d);
    if (!shouldAskOnDate(d, tracker.cadence, tracker.days)) {
      d = addDays(d, -1);
      if (d < new Date(tracker.startDate)) break;
      continue;
    }
    const ans = answers[ymd];
    if (ans && ans.answer && ans.answer !== '' && ans.answer.toLowerCase() !== 'no') {
      streak++;
      d = addDays(d, -1);
    } else {
      break;
    }
    if (d < new Date(tracker.startDate)) break;
  }
  return streak;
}

// ─── Rate ─────────────────────────────────────────────────────────────────────
function calcRate(tracker, answerMap, days) {
  if (!tracker.startDate) return 0;
  const answers = answerMap[tracker.id] || {};
  let asked = 0, done = 0;
  for (let i = 0; i < days; i++) {
    const d = addDays(new Date(), -i);
    if (d < new Date(tracker.startDate)) break;
    if (!shouldAskOnDate(d, tracker.cadence, tracker.days)) continue;
    asked++;
    const ymd = toYMD(d);
    const ans = answers[ymd];
    if (ans && ans.answer && ans.answer !== '') done++;
  }
  return asked > 0 ? done / asked : 0;
}

// ─── Due / overdue ────────────────────────────────────────────────────────────
function isDueToday(tracker) {
  return shouldAskOnDate(new Date(), tracker.cadence, tracker.days);
}

function isOverdue(tracker, answerMap) {
  if (!tracker.startDate) return false;
  const answers = answerMap[tracker.id] || {};
  const yesterday = addDays(new Date(), -1);
  let d = yesterday;
  for (let i = 0; i < 366; i++) {
    if (d < new Date(tracker.startDate)) return false;
    if (tracker.endDate && d > new Date(tracker.endDate)) { d = addDays(d, -1); continue; }
    if (shouldAskOnDate(d, tracker.cadence, tracker.days)) {
      const ymd = toYMD(d);
      const ans = answers[ymd];
      return !ans?.answer || ans.answer === '';
    }
    d = addDays(d, -1);
  }
  return false;
}

// ─── Next / last N due dates ──────────────────────────────────────────────────
function getNextDue(tracker, fromDate) {
  let d = addDays(new Date(fromDate), 1);
  for (let i = 0; i < 365; i++) {
    if (tracker.endDate && d > new Date(tracker.endDate)) return null;
    if (shouldAskOnDate(d, tracker.cadence, tracker.days)) return toYMD(d);
    d = addDays(d, 1);
  }
  return null;
}

function getLastNDue(tracker, fromDate, n) {
  const results = [];
  let d = new Date(fromDate);
  let guard = 0;
  while (results.length < n && guard < 365) {
    if (tracker.startDate && d < new Date(tracker.startDate)) break;
    if (shouldAskOnDate(d, tracker.cadence, tracker.days)) results.push(toYMD(d));
    d = addDays(d, -1);
    guard++;
  }
  return results;
}

// ─── Group trackers ───────────────────────────────────────────────────────────
function groupTrackers(trackers) {
  const order = ['Daily', 'Weekly', 'Monthly', 'Yearly', 'Custom', 'Adhoc'];
  const map = {};
  trackers.forEach(t => {
    const isAdhoc = t.type === 'adhoc_date' || t.type === 'adhoc_value';
    const g = isAdhoc ? 'Adhoc' : (t.cadence || 'Other');
    if (!map[g]) map[g] = [];
    map[g].push(t);
  });
  const sorted = [
    ...order.filter(g => map[g]),
    ...Object.keys(map).filter(g => !order.includes(g)).sort(),
  ];
  return sorted.map(g => ({ group: g, trackers: map[g] }));
}

// ─── RateBadge ────────────────────────────────────────────────────────────────
function RateBadge({ rate }) {
  const pct = Math.round(rate * 100);
  const col = pct >= 80 ? 'text-green-700 bg-green-50' : pct >= 50 ? 'text-yellow-700 bg-yellow-50' : 'text-red-600 bg-red-50';
  return <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${col}`}>{pct}%</span>;
}

// ─── History cell (one date in the log panel) ─────────────────────────────────
function HistoryCell({ date, tracker, ans, onToggleYesNo, onSaveValue, c, today }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(ans?.answer || '');
  const isYN = tracker.type?.toLowerCase().includes('yes') || tracker.type === 'Yes,No';
  const isAdhoc = tracker.type === 'adhoc_date' || tracker.type === 'adhoc_value';
  const isToday = date === today;
  const label = fmtHistDate(date);
  const dayName = DAYS_SHORT[new Date(date + 'T00:00:00').getDay()];

  const dateLabel = isToday ? (
    <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1 py-0.5 rounded leading-tight whitespace-nowrap">
      {label} <span className="opacity-70">[{dayName}]</span> <span className="opacity-70">(today)</span>
    </span>
  ) : (
    <span className="text-[10px] text-gray-400">{label} <span className="text-gray-300">[{dayName}]</span></span>
  );

  if (isYN) {
    const done = ans?.answer === 'yes';
    const no = ans?.answer === 'no';
    return (
      <div className="flex flex-col items-center gap-0.5">
        {dateLabel}
        <button
          onClick={() => onToggleYesNo(tracker, date)}
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
            done ? c.btn + ' text-white' : no ? 'border-red-400 bg-red-50 text-red-400' : 'border-gray-200 hover:border-gray-400'
          } ${isToday ? 'ring-1 ring-blue-300 ring-offset-1' : ''}`}
        >
          {done ? <CheckIcon className="h-3 w-3" /> : no ? <span className="text-[10px] font-bold">✗</span> : null}
        </button>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="flex flex-col items-center gap-0.5">
        {dateLabel}
        <input
          autoFocus
          type={tracker.type === 'value_time' ? 'text' : 'number'}
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { onSaveValue(tracker, date, isAdhoc ? date : val, ''); setEditing(false); }
            if (e.key === 'Escape') setEditing(false);
          }}
          onBlur={() => { if (val && val !== ans?.answer) onSaveValue(tracker, date, isAdhoc ? date : val, ''); setEditing(false); }}
          className="w-16 border border-blue-300 rounded px-1 py-1 text-xs focus:outline-none text-center font-medium"
          placeholder={isAdhoc ? 'log' : 'value'}
        />
      </div>
    );
  }

  const hasVal = ans?.answer;
  return (
    <div className="flex flex-col items-center gap-0.5">
      {dateLabel}
      <button
        onClick={() => { setVal(ans?.answer || ''); setEditing(true); }}
        className={`w-16 rounded px-1 py-1 text-center border transition-all ${
          hasVal
            ? `${c.bg} ${c.text} border-transparent`
            : 'border-dashed border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-600'
        } ${isToday ? 'ring-1 ring-blue-300 ring-offset-1' : ''}`}
      >
        {hasVal
          ? <span className="text-sm font-bold leading-tight block">{ans.answer}</span>
          : <span className="text-lg leading-tight block">+</span>
        }
      </button>
    </div>
  );
}

// ─── Add entry for a specific date (adhoc types) ─────────────────────────────
function AdhocAddCell({ tracker, onSaveValue, c }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(toYMD(new Date()));
  const [val, setVal] = useState('');
  const isAdhocValue = tracker.type === 'adhoc_value';

  const handleSave = () => {
    if (!date) return;
    onSaveValue(tracker, date, isAdhocValue ? val : date, '');
    setVal('');
    setDate(toYMD(new Date()));
    setOpen(false);
  };

  if (!open) {
    return (
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-[10px] text-gray-400 invisible">x</span>
        <button
          onClick={() => setOpen(true)}
          className="w-8 h-8 rounded border-dashed border-2 border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-500 flex items-center justify-center transition-colors"
          title="Add entry for a date"
        >
          <PlusIcon className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5" onClick={e => e.stopPropagation()}>
      <span className="text-[10px] text-gray-500 font-medium">Add entry</span>
      <div className="flex items-center gap-1.5 flex-wrap">
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="border border-gray-200 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
        />
        {isAdhocValue && (
          <input
            autoFocus
            type="number"
            value={val}
            onChange={e => setVal(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setOpen(false); }}
            placeholder="value"
            className="w-16 border border-gray-200 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
          />
        )}
        <button onClick={handleSave} className={`px-2 py-0.5 text-xs text-white rounded ${c.btn} hover:opacity-90 transition-opacity`}>
          Save
        </button>
        <button onClick={() => setOpen(false)} className="p-0.5 text-gray-400 hover:text-gray-600">
          <XMarkIcon className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Single tracker row ───────────────────────────────────────────────────────
const TrackerRow = memo(function TrackerRow({ tracker, answers, selectedDate, onToggleYesNo, onSaveValue, onEdit, onDelete, nextDueLabel, stats }) {
  const [showHistory, setShowHistory] = useState(false);
  const [pinHistory, setPinHistory] = useState(false);
  const c = clr(tracker.color);
  const histVisible = showHistory || pinHistory;
  const ans = answers[selectedDate];
  const due = isDueToday(tracker);
  const { streak = 0, rate7 = 0, overdue = false, daysOverdue = 0, daysSinceLastLog = null } = stats || {};

  const isAdhocType = tracker.type === 'adhoc_date' || tracker.type === 'adhoc_value';
  const hist7 = histVisible
    ? isAdhocType
      ? Object.keys(answers).sort().slice(-7)
      : [...getLastNDue(tracker, selectedDate, 7)].reverse()
    : [];

  const answerSummary = (() => {
    if (!ans?.answer) return null;
    const isYN = tracker.type?.toLowerCase().includes('yes') || tracker.type === 'Yes,No';
    if (isYN) {
      return ans.answer === 'yes'
        ? <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${c.bg} ${c.text}`}>✓ yes</span>
        : <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600">✗ no</span>;
    }
    return <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${c.bg} ${c.text}`}>{ans.answer}</span>;
  })();

  return (
    <div
      className={`rounded-lg border transition-all ${
        ans?.answer ? c.bg + ' border-transparent' : 'bg-white border-gray-100'
      } ${overdue ? 'border-l-2 border-l-red-400' : ''} hover:shadow-sm`}
      onMouseEnter={() => setShowHistory(true)}
      onMouseLeave={() => setShowHistory(false)}
    >
      {/* Main row */}
      <div className="flex items-center gap-3 px-3 py-2.5 group">
        <span className="text-lg leading-none flex-shrink-0">{tracker.emoji}</span>
        <div className="flex-1 min-w-0">
          <span className={`text-sm font-medium ${ans?.answer ? 'text-gray-500' : 'text-gray-800'}`}>{tracker.title}</span>
          {tracker.question && tracker.question !== tracker.title && (
            <div className="text-xs text-gray-400 truncate">{tracker.question}</div>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {answerSummary}
          {daysSinceLastLog !== null && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              daysSinceLastLog === 0 ? `${c.bg} ${c.text} font-semibold` :
              daysSinceLastLog <= 7 ? 'text-gray-500 bg-gray-100' :
              'text-amber-700 bg-amber-50'
            }`}>
              {daysSinceLastLog === 0 ? 'today' : `${daysSinceLastLog}d ago`}
            </span>
          )}
          {nextDueLabel && <span className="text-xs text-gray-400 italic">{nextDueLabel}</span>}
          {!nextDueLabel && overdue && (
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600">
              {daysOverdue}d overdue
            </span>
          )}
          {!nextDueLabel && !overdue && due && !ans?.answer && (
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600">
              due today
            </span>
          )}
          {!nextDueLabel && streak >= 3 && (
            <span className="flex items-center gap-0.5 text-xs text-orange-500 font-semibold">
              <FireIcon className="h-3.5 w-3.5" />{streak}
            </span>
          )}
          {!nextDueLabel && tracker.cadence === 'Daily' && <RateBadge rate={rate7} />}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setPinHistory(p => !p)}
            className={`p-1 rounded transition-colors ${pinHistory ? 'text-blue-500 bg-blue-50' : 'text-gray-400 hover:text-blue-500'}`}
            title={pinHistory ? 'Unpin' : 'Pin log panel open'}
          >
            <ClockIcon className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => onEdit(tracker)} className="p-1 text-gray-400 hover:text-gray-700 rounded">
            <PencilSquareIcon className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => onDelete(tracker.id)} className="p-1 text-gray-400 hover:text-red-500 rounded">
            <TrashIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Log panel — shown on hover, includes today */}
      {histVisible && (hist7.length > 0 || isAdhocType) && (
        <div className="px-3 pb-3 pt-0 border-t border-black/5">
          <div className="flex gap-2 flex-wrap mt-2 items-end">
            {hist7.map(date => (
              <HistoryCell
                key={date}
                date={date}
                tracker={tracker}
                ans={answers[date]}
                onToggleYesNo={onToggleYesNo}
                onSaveValue={onSaveValue}
                c={c}
                today={selectedDate}
              />
            ))}
            {isAdhocType && (
              <AdhocAddCell tracker={tracker} onSaveValue={onSaveValue} c={c} />
            )}
          </div>
        </div>
      )}
    </div>
  );
});

// ─── Week heatmap for a tracker ───────────────────────────────────────────────
function WeekDots({ tracker, answerMap, weekDates }) {
  const c = clr(tracker.color);
  const answers = answerMap[tracker.id] || {};
  return (
    <div className="flex gap-1">
      {weekDates.map(d => {
        const ymd = toYMD(d);
        const due = shouldAskOnDate(d, tracker.cadence, tracker.days);
        const ans = answers[ymd];
        const filled = ans?.answer && ans.answer !== '';
        return (
          <div key={ymd} title={`${DAYS_SHORT[d.getDay()]} ${ymd}${ans?.answer ? ': ' + ans.answer : ''}`}
            className={`w-5 h-5 rounded-sm border transition-colors ${
              !due ? 'bg-gray-50 border-gray-100' :
              filled ? c.dot : 'bg-gray-100 border-gray-200'
            }`} />
        );
      })}
    </div>
  );
}

// ─── Stats card for one tracker ───────────────────────────────────────────────
function StatsCard({ tracker, answerMap, last30 }) {
  const c = clr(tracker.color);
  const answers = answerMap[tracker.id] || {};
  const streak = calcStreak(tracker, answerMap);
  const rate7 = calcRate(tracker, answerMap, 7);
  const rate30 = calcRate(tracker, answerMap, 30);
  const isYN = tracker.type?.toLowerCase().includes('yes') || tracker.type === 'Yes,No';
  const allAnswers = Object.values(answers);
  const yesCount = allAnswers.filter(a => a.answer === 'yes').length;
  const noCount = allAnswers.filter(a => a.answer === 'no').length;

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{tracker.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-gray-900 truncate">{tracker.title}</div>
          <div className="text-xs text-gray-500">{tracker.cadence} · {TRACKER_TYPES.find(t => t.value === tracker.type)?.label || tracker.type}</div>
        </div>
        <div className="flex items-center gap-2">
          {streak >= 3 && (
            <span className="flex items-center gap-0.5 text-xs text-orange-500 font-semibold">
              <FireIcon className="h-3.5 w-3.5" />{streak}d
            </span>
          )}
          {tracker.cadence === 'Daily' && <RateBadge rate={rate7} />}
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-2">
        {last30.map(d => {
          const ymd = toYMD(d);
          const due = shouldAskOnDate(d, tracker.cadence, tracker.days);
          const ans = answers[ymd];
          const filled = ans?.answer && ans.answer !== '';
          const isNo = ans?.answer === 'no';
          return (
            <div key={ymd} title={`${ymd}${ans?.answer ? ': ' + ans.answer : ''}`}
              className={`w-4 h-4 rounded-sm ${
                !due ? 'bg-gray-50' : isNo ? 'bg-red-300' : filled ? c.dot : 'bg-gray-100'
              }`} />
          );
        })}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{allAnswers.length} total entries</span>
        {isYN && <span className="text-green-600 font-medium">✓ {yesCount} yes · {noCount} no</span>}
        <span>30d: <span className="font-semibold text-gray-700">{Math.round(rate30 * 100)}%</span></span>
      </div>
    </div>
  );
}

// ─── Add/Edit Tracker Modal ───────────────────────────────────────────────────
function TrackerModal({ tracker, onSave, onClose }) {
  const isEdit = !!tracker;
  const [title, setTitle] = useState(tracker?.title || '');
  const [question, setQuestion] = useState(tracker?.question || '');
  const [type, setType] = useState(tracker?.type || 'Yes,No');
  const [cadence, setCadence] = useState(tracker?.cadence || 'Daily');
  const [days, setDays] = useState(tracker?.days || []);
  const [startDate, setStartDate] = useState(tracker?.startDate || toYMD(new Date()));
  const [endDate, setEndDate] = useState(tracker?.endDate || '');
  const [tags, setTags] = useState((tracker?.tags || []).join(', '));
  const [overdueDays, setOverdueDays] = useState(tracker?.overdueDays || '30');
  const [emoji, setEmoji] = useState(tracker?.emoji || '📊');
  const [color, setColor] = useState(tracker?.color || 'blue');
  const [group] = useState(tracker?.group || '');

  const toggleDay = d => setDays(ds => ds.includes(d) ? ds.filter(x => x !== d) : [...ds, d]);

  const handleSave = () => {
    if (!title.trim()) { toast.error('Title is required'); return; }
    if (!startDate) { toast.error('Start date is required'); return; }
    if (type !== 'adhoc_date' && type !== 'adhoc_value' && cadence === 'Weekly' && days.length === 0) {
      toast.error('Select at least one weekday'); return;
    }
    onSave({ title: title.trim(), question: question.trim() || title.trim(), type, cadence, days, startDate, endDate, tags, overdueDays, emoji, color, group });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{isEdit ? 'Edit Tracker' : 'New Life Tracker'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="h-5 w-5" /></button>
        </div>
        <div className="p-5 space-y-4">

          {/* Emoji + title */}
          <div className="flex gap-2">
            <select value={emoji} onChange={e => setEmoji(e.target.value)}
              className="appearance-none w-14 h-10 text-xl text-center border border-gray-200 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300">
              {EMOJIS.map(em => <option key={em} value={em}>{em}</option>)}
            </select>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Tracker name" autoFocus
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>

          {/* Question */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Question <span className="text-gray-400">(shown when logging)</span></label>
            <input type="text" value={question} onChange={e => setQuestion(e.target.value)}
              placeholder={`e.g. Did you ${title.toLowerCase() || '...'}?`}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {TRACKER_TYPES.map(t => (
                <button key={t.value} onClick={() => setType(t.value)}
                  className={`text-left px-3 py-2 rounded-lg border text-sm transition-colors ${type === t.value ? 'bg-blue-50 border-blue-400 text-blue-800' : 'border-gray-200 text-gray-600 hover:border-blue-300'}`}>
                  <div className="font-medium">{t.label}</div>
                  <div className="text-xs text-gray-400">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Cadence — hidden for adhoc types */}
          {type !== 'adhoc_date' && type !== 'adhoc_value' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Cadence</label>
              <div className="flex gap-2 flex-wrap">
                {CADENCES.map(c => (
                  <button key={c} onClick={() => setCadence(c)}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${cadence === c ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-blue-300'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Weekday picker */}
          {type !== 'adhoc_date' && type !== 'adhoc_value' && cadence === 'Weekly' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Days</label>
              <div className="flex gap-1.5 flex-wrap">
                {WEEKDAYS.map(d => (
                  <button key={d} onClick={() => toggleDay(d)}
                    className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${days.includes(d) ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-blue-300'}`}>
                    {d.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">End Date <span className="text-gray-400">(optional)</span></label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Color</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(col => {
                const cc = clr(col);
                return (
                  <button key={col} onClick={() => setColor(col)}
                    className={`w-7 h-7 rounded-full ${cc.dot} transition-transform ${color === col ? 'ring-2 ring-offset-2 ' + cc.ring + ' scale-110' : 'opacity-60 hover:opacity-100'}`} />
                );
              })}
            </div>
          </div>

          {/* Tags + overdue */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Tags</label>
              <input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="health, fitness"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div className="w-28">
              <label className="block text-xs font-medium text-gray-500 mb-1">Overdue (days)</label>
              <input type="number" value={overdueDays} onChange={e => setOverdueDays(e.target.value)} min="1"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            {isEdit ? 'Save Changes' : 'Create Tracker'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Build note content from tracker data ─────────────────────────────────────
function buildTrackerContent({ title, question, type, cadence, days, startDate, endDate, tags, overdueDays, emoji, color, group, watched }) {
  const tagArr = typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(Boolean) : (tags || []);
  const isAdhoc = type === 'adhoc_date' || type === 'adhoc_value';
  let content = `Title: ${title}\nQuestion: ${question}\nType: ${type}${isAdhoc ? '' : `\nCadence: ${cadence}`}\nStart Date: ${startDate}`;
  if (endDate) content += `\nEnd Date: ${endDate}`;
  if (!isAdhoc && cadence === 'Weekly' && days?.length) content += `\nDays: ${days.join(',')}`;
  if (tagArr.length) content += `\nTags: ${tagArr.join(',')}`;
  if (overdueDays && overdueDays !== '30') content += `\noverdue: ${overdueDays}`;
  if (emoji && emoji !== '📊') content += `\nEmoji: ${emoji}`;
  if (color && color !== 'blue') content += `\nColor: ${color}`;
  if (group) content += `\nGroup: ${group}`;
  content += `\nmeta::tracker`;
  if (watched) content += `\nmeta::tracker_watched`;
  return content;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function LifeTrackers() {
  const [trackers, setTrackers] = useState([]);
  const [answerMap, setAnswerMap] = useState({});
  const [rawNotes, setRawNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('today');
  const [selectedDate, setSelectedDate] = useState(toYMD(new Date()));
  const [showModal, setShowModal] = useState(false);
  const [editingTracker, setEditingTracker] = useState(null);
  const [collapsed, setCollapsed] = useState({});
  const [search, setSearch] = useState('');
  const [filterOverdue, setFilterOverdue] = useState(false);

  const today = toYMD(new Date());

  // ── Load ──────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const res = await loadNotes();
      const notes = Array.isArray(res) ? res : (res?.notes || []);
      setRawNotes(notes);
      const trkrs = parseTrackers(notes);
      const aMap = parseAnswers(notes, trkrs);
      setTrackers(trkrs);
      setAnswerMap(aMap);
    } catch {
      toast.error('Failed to load trackers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Toggle yes/no ──────────────────────────────────────────────────────────
  const handleToggleYesNo = useCallback(async (tracker, date) => {
    const answers = answerMap[tracker.id] || {};
    const current = answers[date];
    let nextAnswer;
    if (!current?.answer) nextAnswer = 'yes';
    else if (current.answer === 'yes') nextAnswer = 'no';
    else nextAnswer = null;

    // Optimistic update
    setAnswerMap(m => {
      const next = { ...m, [tracker.id]: { ...m[tracker.id] } };
      if (nextAnswer === null) { delete next[tracker.id][date]; }
      else { next[tracker.id][date] = { ...current, answer: nextAnswer, id: current?.id }; }
      return next;
    });

    try {
      if (nextAnswer === null && current?.id) {
        await deleteNoteById(current.id);
        setRawNotes(rn => rn.filter(n => n.id !== current.id));
      } else if (nextAnswer && current?.id) {
        const noteLines = rawNotes.find(n => n.id === current.id)?.content?.split('\n') || [];
        const updated = noteLines.map(l => l.startsWith('Answer:') ? `Answer: ${nextAnswer}` : l).join('\n');
        await updateNoteById(current.id, updated);
        setRawNotes(rn => rn.map(n => n.id === current.id ? { ...n, content: updated } : n));
      } else if (nextAnswer) {
        const created = await createTrackerAnswerNote(tracker.id, nextAnswer, date, '', tracker.title);
        setRawNotes(rn => [...rn, created]);
        setAnswerMap(m => ({ ...m, [tracker.id]: { ...m[tracker.id], [date]: { id: created.id, answer: nextAnswer, notes: '' } } }));
      }
    } catch {
      toast.error('Failed to save');
      load();
    }
  }, [answerMap, rawNotes, load]);

  // ── Save value/adhoc entry ─────────────────────────────────────────────────
  const handleSaveValue = useCallback(async (tracker, date, value, note = '') => {
    if (!value && value !== 0 && tracker.type !== 'adhoc_date') { toast.error('Please enter a value'); return; }
    const answers = answerMap[tracker.id] || {};
    const current = answers[date];
    try {
      if (current?.id) {
        const noteLines = rawNotes.find(n => n.id === current.id)?.content?.split('\n') || [];
        const updated = noteLines.map(l => l.startsWith('Answer:') ? `Answer: ${value || date}` : l).join('\n');
        await updateNoteById(current.id, updated);
        setRawNotes(rn => rn.map(n => n.id === current.id ? { ...n, content: updated } : n));
        setAnswerMap(m => ({ ...m, [tracker.id]: { ...m[tracker.id], [date]: { ...current, answer: String(value || date) } } }));
      } else {
        const finalVal = tracker.type === 'adhoc_date' ? date : value;
        const created = await createTrackerAnswerNote(tracker.id, finalVal, date, note, tracker.title);
        setRawNotes(rn => [...rn, created]);
        setAnswerMap(m => ({ ...m, [tracker.id]: { ...m[tracker.id], [date]: { id: created.id, answer: String(finalVal), notes: note } } }));
      }
      toast.success('Logged!');
    } catch {
      toast.error('Failed to save');
    }
  }, [answerMap, rawNotes]);

  // ── Create/update tracker ─────────────────────────────────────────────────
  const handleSaveTracker = async (data) => {
    try {
      const content = buildTrackerContent(data);
      if (editingTracker) {
        await updateNoteById(editingTracker.id, content);
        toast.success('Tracker updated');
      } else {
        await createNote(content);
        toast.success('Tracker created!');
      }
      setShowModal(false);
      setEditingTracker(null);
      load();
    } catch {
      toast.error('Failed to save tracker');
    }
  };

  // ── Delete tracker ────────────────────────────────────────────────────────
  const handleDeleteTracker = async (id) => {
    if (!window.confirm('Delete this tracker and all its entries?')) return;
    try {
      await deleteNoteById(id);
      const answerNotes = rawNotes.filter(n =>
        n.content?.split('\n').some(l => l.trim() === 'meta::tracker_answer') &&
        n.content?.split('\n').some(l => l.trim() === `meta::link:${id}`)
      );
      await Promise.all(answerNotes.map(n => deleteNoteById(n.id)));
      toast.success('Tracker deleted');
      load();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleEditTracker = useCallback(t => { setEditingTracker(t); setShowModal(true); }, []);
  const toggleGroup = g => setCollapsed(c => ({ ...c, [g]: !c[g] }));

  // ── Pre-computed stats per tracker ────────────────────────────────────────
  const statsMap = useMemo(() => {
    const todayYMD = toYMD(new Date());
    const map = {};
    trackers.forEach(t => {
      const answers = answerMap[t.id] || {};
      const streak = calcStreak(t, answerMap);
      const rate7 = calcRate(t, answerMap, 7);
      const overdue = isOverdue(t, answerMap);
      const daysOverdue = (() => {
        if (!overdue) return 0;
        const dates = Object.keys(answers).sort().reverse();
        if (dates.length === 0) return Math.floor((new Date() - new Date(t.startDate)) / (1000 * 60 * 60 * 24));
        return Math.floor((new Date() - new Date(dates[0])) / (1000 * 60 * 60 * 24));
      })();
      const daysSinceLastLog = (() => {
        const dates = Object.keys(answers).sort();
        if (dates.length === 0) return null;
        const last = dates[dates.length - 1];
        return Math.floor((new Date(todayYMD) - new Date(last)) / (1000 * 60 * 60 * 24));
      })();
      map[t.id] = { streak, rate7, overdue, daysOverdue, daysSinceLastLog };
    });
    return map;
  }, [trackers, answerMap]);

  // ── Computed ───────────────────────────────────────────────────────────────
  const overdueTrackers = useMemo(() => trackers.filter(t => statsMap[t.id]?.overdue), [trackers, statsMap]);
  const filteredTrackers = useMemo(() => trackers.filter(t => {
    if (filterOverdue && !statsMap[t.id]?.overdue) return false;
    if (search) {
      const q = search.toLowerCase();
      return t.title.toLowerCase().includes(q) || t.question?.toLowerCase().includes(q);
    }
    return true;
  }), [trackers, statsMap, filterOverdue, search]);
  const groups = useMemo(() => groupTrackers(filteredTrackers), [filteredTrackers]);
  const today_due = useMemo(() => trackers.filter(t => isDueToday(t)), [trackers]);
  const today_done = useMemo(() => today_due.filter(t => {
    const ans = (answerMap[t.id] || {})[today];
    return ans?.answer && ans.answer !== '';
  }).length, [today_due, answerMap, today]);
  const lagging = useMemo(() => trackers.filter(t =>
    t.cadence === 'Daily' && statsMap[t.id]?.rate7 < 0.5 &&
    t.startDate <= addDays(new Date(), -7).toISOString().slice(0, 10)
  ), [trackers, statsMap]);

  const weekStart = startOfWeek(new Date(selectedDate));
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const last30 = Array.from({ length: 30 }, (_, i) => addDays(new Date(), -(29 - i)));

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <div className="max-w-[52rem] mx-auto px-4 py-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Life Trackers</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track what matters, every day</p>
        </div>
        <button
          onClick={() => { setEditingTracker(null); setShowModal(true); }}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <PlusIcon className="h-4 w-4" />
          New Tracker
        </button>
      </div>

      {/* Lagging alert */}
      {lagging.length > 0 && (
        <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-800">
          <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0 text-amber-500" />
          <span>
            <strong>{lagging.length} tracker{lagging.length > 1 ? 's' : ''}</strong> falling behind — less than 50% logged in the last 7 days
          </span>
        </div>
      )}

      {/* Search + filters */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search trackers…"
            className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
          />
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <XMarkIcon className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={() => setFilterOverdue(f => !f)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors whitespace-nowrap ${
            filterOverdue
              ? 'bg-red-50 border-red-300 text-red-700 font-medium'
              : 'border-gray-200 text-gray-500 hover:border-red-300 hover:text-red-600'
          }`}
        >
          <ExclamationTriangleIcon className="h-3.5 w-3.5" />
          Overdue
          {overdueTrackers.length > 0 && (
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${filterOverdue ? 'bg-red-200 text-red-800' : 'bg-gray-100 text-gray-600'}`}>
              {overdueTrackers.length}
            </span>
          )}
        </button>
      </div>

      {/* View tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-lg w-fit">
        {['today', 'week', 'stats'].map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`px-4 py-1.5 text-sm rounded-md capitalize transition-all ${view === v ? 'bg-white shadow-sm text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-700'}`}>
            {v === 'today' ? 'Today' : v === 'week' ? 'Week' : 'Stats'}
          </button>
        ))}
      </div>

      {/* ── TODAY VIEW ── */}
      {view === 'today' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button onClick={() => setSelectedDate(toYMD(addDays(new Date(selectedDate), -1)))}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">‹</button>
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              <button onClick={() => setSelectedDate(toYMD(addDays(new Date(selectedDate), 1)))}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                disabled={selectedDate >= today}>›</button>
              {selectedDate !== today && (
                <button onClick={() => setSelectedDate(today)} className="text-xs text-blue-600 hover:underline ml-1">
                  Today
                </button>
              )}
            </div>
            {today_due.length > 0 && selectedDate === today && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-24 bg-gray-200 rounded-full h-1.5">
                  <div className="bg-green-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${Math.round((today_done / today_due.length) * 100)}%` }} />
                </div>
                <span className="text-xs font-medium">{today_done}/{today_due.length}</span>
              </div>
            )}
          </div>

          {trackers.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-3">📊</div>
              <div className="text-sm">No trackers yet. Create your first life tracker!</div>
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map(({ group, trackers: gt }) => {
                const relevant = gt.filter(t =>
                  shouldAskOnDate(new Date(selectedDate), t.cadence, t.days) || statsMap[t.id]?.overdue
                );
                const notDue = gt.filter(t =>
                  !shouldAskOnDate(new Date(selectedDate), t.cadence, t.days) && !statsMap[t.id]?.overdue
                );
                const allForGroup = [...relevant, ...notDue];
                if (allForGroup.length === 0) return null;
                const groupDone = relevant.filter(t => {
                  const ans = (answerMap[t.id] || {})[selectedDate];
                  return ans?.answer && ans.answer !== '';
                }).length;
                const isCollapsed = collapsed[group];
                return (
                  <div key={group}>
                    <button onClick={() => toggleGroup(group)}
                      className="flex items-center gap-2 w-full text-left mb-2 group">
                      <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 group-hover:text-gray-700">{group}</span>
                      {relevant.length > 0 && <span className="text-xs text-gray-400">({groupDone}/{relevant.length} due)</span>}
                      <div className="flex-1 border-t border-gray-100 mx-1" />
                      {isCollapsed
                        ? <ChevronDownIcon className="h-3.5 w-3.5 text-gray-400" />
                        : <ChevronUpIcon className="h-3.5 w-3.5 text-gray-400" />}
                    </button>
                    {!isCollapsed && (
                      <div className="space-y-1.5">
                        {relevant.map(t => (
                          <TrackerRow key={t.id} tracker={t} answers={answerMap[t.id] || {}}
                            selectedDate={selectedDate}
                            onToggleYesNo={handleToggleYesNo}
                            onSaveValue={handleSaveValue}
                            onEdit={handleEditTracker}
                            onDelete={handleDeleteTracker}
                            stats={statsMap[t.id]} />
                        ))}
                        {notDue.length > 0 && relevant.length > 0 && (
                          <div className="text-xs text-gray-400 pl-1 pt-1 pb-0.5">Not due today</div>
                        )}
                        {notDue.map(t => {
                          const nextDue = getNextDue(t, selectedDate);
                          const nextLabel = nextDue ? `Due ${fmtHistDate(nextDue)}` : t.cadence;
                          return (
                            <div key={t.id} className="opacity-50 hover:opacity-100 transition-opacity">
                              <TrackerRow tracker={t} answers={answerMap[t.id] || {}}
                                selectedDate={selectedDate}
                                onToggleYesNo={handleToggleYesNo}
                                onSaveValue={handleSaveValue}
                                onEdit={handleEditTracker}
                                onDelete={handleDeleteTracker}
                                nextDueLabel={nextLabel}
                                stats={statsMap[t.id]} />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── WEEK VIEW ── */}
      {view === 'week' && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <button onClick={() => setSelectedDate(toYMD(addDays(new Date(selectedDate), -7)))}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">‹</button>
            <span className="text-sm text-gray-700 font-medium">Week of {toYMD(weekStart)}</span>
            <button onClick={() => setSelectedDate(toYMD(addDays(new Date(selectedDate), 7)))}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
              disabled={toYMD(weekStart) >= toYMD(startOfWeek(new Date()))}>›</button>
            {toYMD(weekStart) !== toYMD(startOfWeek(new Date())) && (
              <button onClick={() => setSelectedDate(today)} className="text-xs text-blue-600 hover:underline ml-1">This week</button>
            )}
          </div>

          <div className="flex items-center mb-3 pl-[calc(2rem+2rem+0.75rem)]">
            {weekDates.map(d => (
              <div key={toYMD(d)} className={`w-5 mr-1 text-center text-[10px] font-semibold ${toYMD(d) === today ? 'text-blue-600' : 'text-gray-400'}`}>
                {DAYS_SHORT[d.getDay()]}
              </div>
            ))}
          </div>

          {trackers.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">No trackers yet.</div>
          ) : (
            <div className="space-y-4">
              {groups.map(({ group, trackers: gt }) => (
                <div key={group}>
                  <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-2">
                    {group}
                    <div className="flex-1 border-t border-gray-100" />
                  </div>
                  <div className="space-y-2">
                    {gt.map(t => (
                      <div key={t.id} className="flex items-center gap-3">
                        <span className="text-base w-6 flex-shrink-0">{t.emoji}</span>
                        <span className="text-sm text-gray-700 w-32 truncate flex-shrink-0">{t.title}</span>
                        <WeekDots tracker={t} answerMap={answerMap} weekDates={weekDates} />
                        {t.cadence === 'Daily' && <RateBadge rate={statsMap[t.id]?.rate7 || 0} />}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── STATS VIEW ── */}
      {view === 'stats' && (
        <div>
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-white border border-gray-100 rounded-xl p-4 text-center shadow-sm">
              <div className="text-2xl font-bold text-blue-600">{trackers.length}</div>
              <div className="text-xs text-gray-500 mt-0.5">Trackers</div>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4 text-center shadow-sm">
              <div className="text-2xl font-bold text-green-600">{today_done}</div>
              <div className="text-xs text-gray-500 mt-0.5">Logged today</div>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4 text-center shadow-sm">
              <div className="text-2xl font-bold text-orange-500">
                {trackers.reduce((m, t) => Math.max(m, statsMap[t.id]?.streak || 0), 0)}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Best streak</div>
            </div>
          </div>

          {trackers.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">No trackers yet.</div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Last 30 Days</div>
              {trackers.map(t => (
                <StatsCard key={t.id} tracker={t} answerMap={answerMap} last30={last30} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <TrackerModal
          tracker={editingTracker}
          onSave={handleSaveTracker}
          onClose={() => { setShowModal(false); setEditingTracker(null); }}
        />
      )}
    </div>
  );
}
