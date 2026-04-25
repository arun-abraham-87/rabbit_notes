import React, { useState, useEffect, useCallback } from 'react';
import { PlusIcon, PencilSquareIcon, TrashIcon, CheckIcon, ChevronDownIcon, ChevronUpIcon, XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import { FireIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

const API_BASE = 'http://localhost:5001/api/habits';

const GROUP_ORDER = ['Morning', 'Afternoon', 'Evening', 'Weekly', 'Monthly', 'General'];
const COLORS = ['blue', 'green', 'purple', 'red', 'orange', 'yellow', 'pink', 'indigo', 'teal', 'gray'];
const EMOJIS = ['✅', '💪', '🧘', '📚', '🏃', '💧', '🍎', '😴', '🎯', '🌅', '🌙', '🧠', '❤️', '🎵', '✍️', '🧹', '🌿', '⚡', '🔥', '⭐'];
const TAG_FALLBACK = 'Untagged';
const DEFAULT_TIMEFRAME = 'General';
const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toYMD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return d;
}

function normalizeTag(tag) {
  return typeof tag === 'string' ? tag.trim() : '';
}

function getHabitTagLabel(habit) {
  return normalizeTag(habit?.tag) || TAG_FALLBACK;
}

function normalizeHabit(habit) {
  return {
    ...habit,
    group: habit?.timeframe || habit?.group || 'General',
    tag: normalizeTag(habit?.tag),
    notes: habit?.notes || '',
    color: habit?.color || 'blue',
    emoji: habit?.emoji || '✅',
  };
}

function sortHabits(habits) {
  return [...habits].sort((a, b) => {
    const aOrder = typeof a?.order === 'number' ? a.order : Number.MAX_SAFE_INTEGER;
    const bOrder = typeof b?.order === 'number' ? b.order : Number.MAX_SAFE_INTEGER;

    if (aOrder !== bOrder) return aOrder - bOrder;

    const aCreated = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bCreated = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
    return aCreated - bCreated;
  });
}

function colorClasses(color) {
  const map = {
    blue:   { ring: 'ring-blue-400',   bg: 'bg-blue-50',   text: 'text-blue-700',   dot: 'bg-blue-500',   checked: 'bg-blue-500 border-blue-500' },
    green:  { ring: 'ring-green-400',  bg: 'bg-green-50',  text: 'text-green-700',  dot: 'bg-green-500',  checked: 'bg-green-500 border-green-500' },
    purple: { ring: 'ring-purple-400', bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500', checked: 'bg-purple-500 border-purple-500' },
    red:    { ring: 'ring-red-400',    bg: 'bg-red-50',    text: 'text-red-700',    dot: 'bg-red-500',    checked: 'bg-red-500 border-red-500' },
    orange: { ring: 'ring-orange-400', bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500', checked: 'bg-orange-500 border-orange-500' },
    yellow: { ring: 'ring-yellow-400', bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500', checked: 'bg-yellow-500 border-yellow-500' },
    pink:   { ring: 'ring-pink-400',   bg: 'bg-pink-50',   text: 'text-pink-700',   dot: 'bg-pink-500',   checked: 'bg-pink-500 border-pink-500' },
    indigo: { ring: 'ring-indigo-400', bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500', checked: 'bg-indigo-500 border-indigo-500' },
    teal:   { ring: 'ring-teal-400',   bg: 'bg-teal-50',   text: 'text-teal-700',   dot: 'bg-teal-500',   checked: 'bg-teal-500 border-teal-500' },
    gray:   { ring: 'ring-gray-400',   bg: 'bg-gray-50',   text: 'text-gray-700',   dot: 'bg-gray-500',   checked: 'bg-gray-500 border-gray-500' },
  };
  return map[color] || map.blue;
}

function TagSuggestions({ tags, currentTag, onSelect, compact = false }) {
  const filteredTags = tags.filter(tag => tag !== normalizeTag(currentTag));

  if (filteredTags.length === 0) return null;

  return (
    <div className={compact ? 'mt-1 flex flex-wrap gap-1' : 'mt-2 flex flex-wrap gap-1.5'}>
      {filteredTags.map(tag => (
        <button
          key={tag}
          type="button"
          onClick={() => onSelect(tag)}
          className={`inline-flex items-center rounded-full border border-gray-200 bg-gray-50 text-gray-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-colors ${
            compact ? 'px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide' : 'px-2.5 py-1 text-xs font-medium'
          }`}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}

function QuickAddHabitForm({ value, onChange, onSave, onCancel, inputRef, label }) {
  return (
    <div className="mb-2 rounded-lg border border-blue-200 bg-blue-50/60 p-2">
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') onSave();
            if (e.key === 'Escape') onCancel();
          }}
          placeholder={`Add habit to ${label}`}
          className="flex-1 rounded-md border border-blue-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <button onClick={onSave} className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-700">
          Add
        </button>
        <button onClick={onCancel} className="px-2 py-1 text-xs text-gray-500 transition-colors hover:text-gray-700">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Add/Edit Habit Modal ─────────────────────────────────────────────────────
function HabitModal({ habit, existingTags, onSave, onClose }) {
  const [name, setName] = useState(habit?.name || '');
  const [timeframe, setTimeframe] = useState(habit?.timeframe || habit?.group || 'Morning');
  const [tag, setTag] = useState(habit?.tag || '');
  const [frequency, setFrequency] = useState(habit?.frequency || 'daily');
  const [color, setColor] = useState(habit?.color || 'blue');
  const [emoji, setEmoji] = useState(habit?.emoji || '✅');
  const [notes, setNotes] = useState(habit?.notes || '');
  const [customTimeframe, setCustomTimeframe] = useState('');
  const [showCustomTimeframe, setShowCustomTimeframe] = useState(false);

  const timeframes = [...GROUP_ORDER, 'Custom...'];

  const handleSave = () => {
    if (!name.trim()) { toast.error('Habit name is required'); return; }
    const finalTimeframe = showCustomTimeframe && customTimeframe.trim() ? customTimeframe.trim() : timeframe;
    onSave({ name: name.trim(), timeframe: finalTimeframe, tag: normalizeTag(tag), frequency, color, emoji, notes: notes.trim() });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">{habit ? 'Edit Habit' : 'Add Tiny Habit'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><XMarkIcon className="h-5 w-5" /></button>
        </div>

        {/* Emoji + Name row */}
        <div className="flex gap-2 mb-4">
          <div className="relative">
            <select
              value={emoji}
              onChange={e => setEmoji(e.target.value)}
              className="appearance-none w-14 h-10 text-xl text-center border border-gray-200 rounded-lg cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {EMOJIS.map(em => <option key={em} value={em}>{em}</option>)}
            </select>
          </div>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Habit name (e.g. Drink 2L water)"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
          />
        </div>

        {/* Timeframe */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-500 mb-1">Timeframe</label>
          <select
            value={showCustomTimeframe ? 'Custom...' : timeframe}
            onChange={e => {
              if (e.target.value === 'Custom...') { setShowCustomTimeframe(true); }
              else { setShowCustomTimeframe(false); setTimeframe(e.target.value); }
            }}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            {timeframes.map(option => <option key={option} value={option}>{option}</option>)}
          </select>
          {showCustomTimeframe && (
            <input
              type="text"
              value={customTimeframe}
              onChange={e => setCustomTimeframe(e.target.value)}
              placeholder="Custom timeframe name"
              className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          )}
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-500 mb-1">Tag (optional)</label>
          <input
            type="text"
            value={tag}
            onChange={e => setTag(e.target.value)}
            placeholder="Single tag (e.g. health)"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <TagSuggestions
            tags={existingTags}
            currentTag={tag}
            onSelect={setTag}
          />
        </div>

        {/* Frequency */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-500 mb-1">Frequency</label>
          <div className="flex gap-2">
            {FREQUENCIES.map(f => (
              <button
                key={f.value}
                onClick={() => setFrequency(f.value)}
                className={`flex-1 py-1.5 text-sm rounded-lg border transition-colors ${frequency === f.value ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-blue-300'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Color */}
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-500 mb-1">Color</label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map(c => {
              const cls = colorClasses(c);
              return (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full ${cls.dot} transition-transform ${color === c ? 'ring-2 ring-offset-2 ' + cls.ring + ' scale-110' : 'opacity-60 hover:opacity-100'}`}
                />
              );
            })}
          </div>
        </div>

        {/* Notes */}
        <div className="mb-5">
          <label className="block text-xs font-medium text-gray-500 mb-1">Notes (optional)</label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Any note about this habit"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            {habit ? 'Save Changes' : 'Add Habit'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Completion rate badge ─────────────────────────────────────────────────────
function RateBadge({ rate }) {
  const pct = Math.round(rate * 100);
  const color = pct >= 80 ? 'text-green-700 bg-green-50' : pct >= 50 ? 'text-yellow-700 bg-yellow-50' : 'text-red-600 bg-red-50';
  return <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${color}`}>{pct}%</span>;
}

// ─── Single habit row in Today view ───────────────────────────────────────────
function HabitRow({ habit, done, existingTags, onToggle, onEdit, onDelete, onInlineRename, onInlineTagSave, streak, rate7, alert }) {
  const cls = colorClasses(habit.color);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(habit.name);
  const [tagEditing, setTagEditing] = useState(false);
  const [editTag, setEditTag] = useState(habit.tag || '');
  const inputRef = React.useRef(null);
  const tagInputRef = React.useRef(null);

  const startEdit = () => {
    setTagEditing(false);
    setEditName(habit.name);
    setEditing(true);
  };
  const cancelEdit = () => { setEditing(false); setEditName(habit.name); };
  const saveEdit = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== habit.name) onInlineRename({ ...habit, name: trimmed });
    setEditing(false);
  };
  const startTagEdit = () => {
    setEditing(false);
    setEditTag(habit.tag || '');
    setTagEditing(true);
  };
  const cancelTagEdit = () => {
    setTagEditing(false);
    setEditTag(habit.tag || '');
  };
  const saveTagEdit = () => {
    const trimmed = normalizeTag(editTag);
    if (trimmed !== normalizeTag(habit.tag)) {
      onInlineTagSave({ ...habit, tag: trimmed });
    }
    setTagEditing(false);
  };
  const selectSuggestedTag = (tag) => {
    setEditTag(tag);
    if (tag !== normalizeTag(habit.tag)) {
      onInlineTagSave({ ...habit, tag });
    }
    setTagEditing(false);
  };

  React.useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  React.useEffect(() => { if (tagEditing) tagInputRef.current?.focus(); }, [tagEditing]);
  React.useEffect(() => {
    if (!editing) setEditName(habit.name);
    if (!tagEditing) setEditTag(habit.tag || '');
  }, [habit.name, habit.tag, editing, tagEditing]);

  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${done ? cls.bg + ' border-transparent' : 'bg-white border-gray-100'} hover:shadow-sm transition-all group`}>
      {/* Checkbox */}
      <button
        onClick={() => onToggle(habit.id)}
        className={`flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${done ? cls.checked + ' text-white' : 'border-gray-300 hover:border-gray-400'}`}
      >
        {done && <CheckIcon className="h-4 w-4" />}
      </button>

      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && e.metaKey) saveEdit();
                if (e.key === 'Escape') cancelEdit();
              }}
              className="flex-1 text-sm font-medium border border-blue-300 rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <button onClick={saveEdit} className="text-xs px-2 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors whitespace-nowrap">Save</button>
            <button onClick={cancelEdit} className="text-xs px-2 py-0.5 text-gray-500 hover:text-gray-700 transition-colors">✕</button>
          </div>
        ) : (
          <>
            <span
              onClick={startEdit}
              className={`text-sm font-medium cursor-text ${done ? 'line-through text-gray-400' : 'text-gray-800'}`}
            >{habit.name}</span>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              {tagEditing ? (
                <div>
                  <div className="flex items-center gap-1">
                    <input
                      ref={tagInputRef}
                      value={editTag}
                      onChange={e => setEditTag(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveTagEdit();
                        if (e.key === 'Escape') cancelTagEdit();
                      }}
                      placeholder="Add tag"
                      className="w-28 text-[10px] font-semibold uppercase tracking-wide border border-blue-300 rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                    <button onClick={saveTagEdit} className="text-xs px-1.5 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">Save</button>
                    <button onClick={cancelTagEdit} className="text-xs px-1.5 py-0.5 text-gray-500 hover:text-gray-700 transition-colors">✕</button>
                  </div>
                  <TagSuggestions
                    tags={existingTags}
                    currentTag={editTag}
                    onSelect={selectSuggestedTag}
                    compact
                  />
                </div>
              ) : habit.tag ? (
                <button
                  type="button"
                  onClick={startTagEdit}
                  className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600 hover:bg-gray-200 transition-colors"
                  title="Edit tag"
                >
                  {habit.tag}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startTagEdit}
                  className="inline-flex items-center rounded-full border border-dashed border-gray-300 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400 hover:border-blue-300 hover:text-blue-600 transition-colors"
                  title="Add tag"
                >
                  + Add tag
                </button>
              )}
              {habit.notes && <div className="text-xs text-gray-400 truncate">{habit.notes}</div>}
            </div>
          </>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {streak >= 3 && (
          <span className="flex items-center gap-0.5 text-xs text-orange-500 font-semibold">
            <FireIcon className="h-3.5 w-3.5" />{streak}
          </span>
        )}
        {alert && (
          <span title="Lagging behind — missing this habit often" className="text-amber-500">
            <ExclamationTriangleIcon className="h-4 w-4" />
          </span>
        )}
        <RateBadge rate={rate7} />
      </div>

      {/* Actions (hover) */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onEdit(habit)} className="p-1 text-gray-400 hover:text-gray-700 rounded transition-colors">
          <PencilSquareIcon className="h-3.5 w-3.5" />
        </button>
        <button onClick={() => onDelete(habit.id)} className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors">
          <TrashIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Weekly heatmap for a single habit ────────────────────────────────────────
function WeekHeatmap({ habit, completions, weekDates }) {
  const cls = colorClasses(habit.color);
  return (
    <div className="flex gap-1">
      {weekDates.map(date => {
        const ymd = toYMD(date);
        const done = !!(completions[ymd] && completions[ymd][habit.id]);
        return (
          <div
            key={ymd}
            title={`${DAYS_SHORT[date.getDay()]} ${ymd}`}
            className={`w-5 h-5 rounded-sm border transition-colors ${done ? cls.dot : 'bg-gray-100 border-gray-200'}`}
          />
        );
      })}
    </div>
  );
}

// ─── Stats view for a habit ────────────────────────────────────────────────────
function HabitStatsRow({ habit, completions, last30Dates, streak, rate30, rate7 }) {
  const cls = colorClasses(habit.color);
  const doneCount30 = last30Dates.filter(d => {
    const ymd = toYMD(d);
    return !!(completions[ymd] && completions[ymd][habit.id]);
  }).length;

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-gray-900 truncate">{habit.name}</div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
            <span>{habit.group} · {habit.frequency}</span>
            {habit.tag && (
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                {habit.tag}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {streak >= 3 && (
            <span className="flex items-center gap-0.5 text-xs text-orange-500 font-semibold">
              <FireIcon className="h-3.5 w-3.5" />{streak}d streak
            </span>
          )}
          <RateBadge rate={rate7} />
        </div>
      </div>

      {/* 30-day heatmap */}
      <div className="flex flex-wrap gap-1 mb-2">
        {last30Dates.map(d => {
          const ymd = toYMD(d);
          const done = !!(completions[ymd] && completions[ymd][habit.id]);
          return (
            <div
              key={ymd}
              title={ymd}
              className={`w-4 h-4 rounded-sm ${done ? cls.dot : 'bg-gray-100'}`}
            />
          );
        })}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
        <span>{doneCount30} / 30 days completed</span>
        <span>30d rate: <span className="font-semibold text-gray-700">{Math.round(rate30 * 100)}%</span></span>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function TinyHabits() {
  const [habits, setHabits] = useState([]);
  const [completions, setCompletions] = useState({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('today'); // today | week | stats
  const [groupBy, setGroupBy] = useState('tag');
  const [editingHabit, setEditingHabit] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(toYMD(new Date()));
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [quickAddTarget, setQuickAddTarget] = useState(null);
  const [quickAddName, setQuickAddName] = useState('');
  const quickAddInputRef = React.useRef(null);

  const today = toYMD(new Date());

  // ── Load data ────────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    try {
      const [habitsRes, completionsRes] = await Promise.all([
        fetch(API_BASE).then(r => r.json()),
        fetch(`${API_BASE}/completions`).then(r => r.json()),
      ]);
      setHabits(Array.isArray(habitsRes) ? sortHabits(habitsRes.filter(h => h.active).map(normalizeHabit)) : []);
      setCompletions(typeof completionsRes === 'object' ? completionsRes : {});
    } catch (err) {
      toast.error('Could not load habits');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const isDone = (habitId, date = selectedDate) =>
    !!(completions[date] && completions[date][habitId]);

  const toggleCompletion = async (habitId) => {
    const prev = isDone(habitId, selectedDate);
    // Optimistic update
    setCompletions(c => {
      const next = { ...c };
      if (!next[selectedDate]) next[selectedDate] = {};
      if (prev) {
        const day = { ...next[selectedDate] };
        delete day[habitId];
        next[selectedDate] = day;
      } else {
        next[selectedDate] = { ...next[selectedDate], [habitId]: { completedAt: new Date().toISOString() } };
      }
      return next;
    });
    try {
      await fetch(`${API_BASE}/completions/${selectedDate}/${habitId}`, { method: 'POST' });
    } catch {
      toast.error('Failed to save');
      loadAll();
    }
  };

  // Streak: consecutive days done up to today
  const getStreak = (habitId) => {
    let streak = 0;
    let d = new Date();
    while (true) {
      const ymd = toYMD(d);
      if (completions[ymd] && completions[ymd][habitId]) {
        streak++;
        d = addDays(d, -1);
      } else {
        break;
      }
    }
    return streak;
  };

  // Rate over last N days
  const getRate = (habitId, days) => {
    let done = 0;
    for (let i = 0; i < days; i++) {
      const ymd = toYMD(addDays(new Date(), -i));
      if (completions[ymd] && completions[ymd][habitId]) done++;
    }
    return days > 0 ? done / days : 0;
  };

  // Alert: rate < 50% over last 7 days (only for daily habits)
  const isLagging = (habit) => {
    if (habit.frequency !== 'daily') return false;
    return getRate(habit.id, 7) < 0.5;
  };

  // Group habits
  const grouped = () => {
    const map = {};
    habits.forEach(h => {
      const g = groupBy === 'tag' ? getHabitTagLabel(h) : (h.group || 'General');
      if (!map[g]) map[g] = [];
      map[g].push(h);
    });
    const sortedKeys = groupBy === 'tag'
      ? Object.keys(map).sort((a, b) => {
          if (a === TAG_FALLBACK) return 1;
          if (b === TAG_FALLBACK) return -1;
          return a.localeCompare(b);
        })
      : [
          ...GROUP_ORDER.filter(g => map[g]),
          ...Object.keys(map).filter(g => !GROUP_ORDER.includes(g)).sort(),
        ];
    return sortedKeys.map(g => ({ group: g, habits: map[g] }));
  };

  // Completion summary for today
  const todayDone = habits.filter(h => isDone(h.id, today)).length;
  const todayTotal = habits.filter(h => h.frequency === 'daily').length;

  // Week dates (Mon-Sun of selectedDate's week, starting Sunday)
  const weekStart = startOfWeek(new Date(selectedDate));
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Last 30 dates for stats
  const last30Dates = Array.from({ length: 30 }, (_, i) => addDays(new Date(), -(29 - i)));
  const existingTags = Array.from(new Set(
    habits
      .map(habit => normalizeTag(habit.tag))
      .filter(Boolean)
  )).sort((a, b) => a.localeCompare(b));

  const isQuickAddGroup = (group) => (
    quickAddTarget &&
    quickAddTarget.grouping === groupBy &&
    quickAddTarget.groupValue === group
  );

  const getQuickAddButtonLabel = (group) => (
    groupBy === 'tag' && group !== TAG_FALLBACK ? `#${group}` : group
  );

  const beginQuickAdd = (group) => {
    setQuickAddTarget({ grouping: groupBy, groupValue: group });
    setQuickAddName('');
  };

  const cancelQuickAdd = () => {
    setQuickAddTarget(null);
    setQuickAddName('');
  };

  useEffect(() => {
    if (quickAddTarget) quickAddInputRef.current?.focus();
  }, [quickAddTarget]);

  const getTopOrderForTarget = (target) => {
    const matchingHabits = habits.filter(habit => (
      target.grouping === 'tag'
        ? getHabitTagLabel(habit) === target.groupValue
        : (habit.group || 'General') === target.groupValue
    ));

    const matchingOrders = matchingHabits
      .map(habit => habit.order)
      .filter(order => typeof order === 'number' && Number.isFinite(order));

    if (matchingOrders.length > 0) {
      return Math.min(...matchingOrders) - 1;
    }

    const allOrders = habits
      .map(habit => habit.order)
      .filter(order => typeof order === 'number' && Number.isFinite(order));

    return allOrders.length > 0 ? Math.min(...allOrders) - 1 : 0;
  };

  const buildQuickAddPayload = (target, name) => {
    const isTagGrouping = target.grouping === 'tag';
    const selectedTag = isTagGrouping && target.groupValue !== TAG_FALLBACK
      ? normalizeTag(target.groupValue)
      : '';
    const selectedTimeframe = !isTagGrouping && target.groupValue
      ? target.groupValue
      : DEFAULT_TIMEFRAME;

    return {
      name,
      timeframe: selectedTimeframe,
      group: selectedTimeframe,
      tag: selectedTag,
      frequency: 'daily',
      color: 'blue',
      emoji: '✅',
      notes: '',
      order: getTopOrderForTarget(target),
    };
  };

  // ── CRUD ─────────────────────────────────────────────────────────────────────
  const handleSaveHabit = async (data) => {
    try {
      if (editingHabit) {
        const res = await fetch(`${API_BASE}/${editingHabit.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const updated = await res.json();
        setHabits(hs => sortHabits(hs.map(h => h.id === updated.id ? normalizeHabit(updated) : h)));
        toast.success('Habit updated');
      } else {
        const res = await fetch(API_BASE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const created = await res.json();
        setHabits(hs => sortHabits([...hs, normalizeHabit(created)]));
        toast.success('Habit added!');
      }
    } catch {
      toast.error('Failed to save habit');
    }
    setShowModal(false);
    setEditingHabit(null);
  };

  const handleInlineRename = async (habit) => {
    try {
      const res = await fetch(`${API_BASE}/${habit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: habit.name }),
      });
      const updated = await res.json();
      setHabits(hs => sortHabits(hs.map(h => h.id === updated.id ? normalizeHabit(updated) : h)));
    } catch {
      toast.error('Failed to rename habit');
    }
  };

  const handleInlineTagSave = async (habit) => {
    try {
      const res = await fetch(`${API_BASE}/${habit.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: normalizeTag(habit.tag) }),
      });
      const updated = await res.json();
      setHabits(hs => sortHabits(hs.map(h => h.id === updated.id ? normalizeHabit(updated) : h)));
    } catch {
      toast.error('Failed to save tag');
    }
  };

  const handleQuickAddHabit = async () => {
    const name = quickAddName.trim();
    if (!name || !quickAddTarget) return;

    const payload = buildQuickAddPayload(quickAddTarget, name);

    try {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const created = await res.json();
      setHabits(hs => sortHabits([
        ...hs,
        normalizeHabit({
          ...created,
          group: created?.group || payload.group,
          timeframe: created?.timeframe || payload.timeframe,
          tag: typeof created?.tag === 'string' ? created.tag : payload.tag,
        }),
      ]));
      setQuickAddName('');
      toast.success('Habit added!');
    } catch {
      toast.error('Failed to add habit');
    }
  };

  const handleDeleteHabit = async (habitId) => {
    if (!window.confirm('Delete this habit and all its history?')) return;
    try {
      await fetch(`${API_BASE}/${habitId}`, { method: 'DELETE' });
      setHabits(hs => hs.filter(h => h.id !== habitId));
      toast.success('Habit deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const toggleGroup = (g) => setCollapsedGroups(c => ({ ...c, [g]: !c[g] }));

  // ── Render ────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const groups = grouped();
  const laggingCount = habits.filter(isLagging).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tiny Habits</h1>
          <p className="text-sm text-gray-500 mt-0.5">Small actions, compounded over years</p>
        </div>
        <button
          onClick={() => { setEditingHabit(null); setShowModal(true); }}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <PlusIcon className="h-4 w-4" />
          Add Habit
        </button>
      </div>

      {/* ── Lagging alert ── */}
      {laggingCount > 0 && (
        <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-800">
          <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0 text-amber-500" />
          <span>
            <strong>{laggingCount} habit{laggingCount > 1 ? 's' : ''}</strong> falling behind — completed less than 50% in the last 7 days
          </span>
        </div>
      )}

      {/* ── View tabs ── */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-lg w-fit">
        {['today', 'week', 'stats'].map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-1.5 text-sm rounded-md capitalize transition-all ${view === v ? 'bg-white shadow-sm text-gray-900 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {v === 'today' ? 'Today' : v === 'week' ? 'Week' : 'Stats'}
          </button>
        ))}
      </div>

      <div className="mb-5 flex items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">Organize by</span>
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
            {[
            { value: 'timeframe', label: 'Timeframe' },
            { value: 'tag', label: 'Tag' },
          ].map(option => (
            <button
              key={option.value}
              onClick={() => setGroupBy(option.value)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                groupBy === option.value
                  ? 'bg-white text-gray-900 shadow-sm font-medium'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── TODAY VIEW ── */}
      {view === 'today' && (
        <div>
          {/* Date selector + progress */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedDate(toYMD(addDays(new Date(selectedDate), -1)))}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              >
                ‹
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
              <button
                onClick={() => setSelectedDate(toYMD(addDays(new Date(selectedDate), 1)))}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                disabled={selectedDate >= today}
              >
                ›
              </button>
              {selectedDate !== today && (
                <button
                  onClick={() => setSelectedDate(today)}
                  className="text-xs text-blue-600 hover:underline ml-1"
                >
                  Back to today
                </button>
              )}
            </div>
            {todayTotal > 0 && selectedDate === today && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-24 bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-green-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${Math.round((todayDone / todayTotal) * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-medium">{todayDone}/{todayTotal}</span>
              </div>
            )}
          </div>

          {habits.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-4xl mb-3">🌱</div>
              <div className="text-sm">No habits yet. Add your first tiny habit!</div>
            </div>
          ) : (
            <div className="space-y-4">
              {groups.map(({ group, habits: gHabits }) => {
                // For today view, filter by frequency
                const relevant = gHabits.filter(h => {
                  if (h.frequency === 'daily') return true;
                  if (h.frequency === 'weekly') {
                    // Show on any day
                    return true;
                  }
                  if (h.frequency === 'monthly') return true;
                  return true;
                });
                if (relevant.length === 0) return null;
                const collapsed = collapsedGroups[group];
                const groupDone = relevant.filter(h => isDone(h.id, selectedDate)).length;
                return (
                  <div key={group}>
                    <div className="mb-2 flex items-center gap-2">
                      <button
                        onClick={() => toggleGroup(group)}
                        className="flex flex-1 items-center gap-2 text-left group"
                      >
                        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 group-hover:text-gray-700">
                          {groupBy === 'tag' && group !== TAG_FALLBACK ? `#${group}` : group}
                        </span>
                        <span className="text-xs text-gray-400">({groupDone}/{relevant.length})</span>
                        <div className="flex-1 border-t border-gray-100 mx-1" />
                        {collapsed
                          ? <ChevronDownIcon className="h-3.5 w-3.5 text-gray-400" />
                          : <ChevronUpIcon className="h-3.5 w-3.5 text-gray-400" />
                        }
                      </button>
                      <button
                        type="button"
                        onClick={() => beginQuickAdd(group)}
                        className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500 transition-colors hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50"
                        title={`Add habit to ${getQuickAddButtonLabel(group)}`}
                      >
                        <PlusIcon className="h-3 w-3" />
                        Add
                      </button>
                    </div>
                    {!collapsed && (
                      <div className="space-y-1.5">
                        {isQuickAddGroup(group) && (
                          <QuickAddHabitForm
                            value={quickAddName}
                            onChange={setQuickAddName}
                            onSave={handleQuickAddHabit}
                            onCancel={cancelQuickAdd}
                            inputRef={quickAddInputRef}
                            label={getQuickAddButtonLabel(group)}
                          />
                        )}
                        {relevant.map(habit => (
                          <HabitRow
                            key={habit.id}
                            habit={habit}
                            done={isDone(habit.id, selectedDate)}
                            existingTags={existingTags}
                            onToggle={toggleCompletion}
                            onEdit={h => { setEditingHabit(h); setShowModal(true); }}
                            onInlineRename={handleInlineRename}
                            onInlineTagSave={handleInlineTagSave}
                            onDelete={handleDeleteHabit}
                            streak={getStreak(habit.id)}
                            rate7={getRate(habit.id, 7)}
                            alert={isLagging(habit)}
                          />
                        ))}
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
          {/* Week navigation */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setSelectedDate(toYMD(addDays(new Date(selectedDate), -7)))}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
            >
              ‹
            </button>
            <span className="text-sm text-gray-700 font-medium">
              Week of {toYMD(weekStart)}
            </span>
            <button
              onClick={() => setSelectedDate(toYMD(addDays(new Date(selectedDate), 7)))}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
              disabled={toYMD(weekStart) >= toYMD(startOfWeek(new Date()))}
            >
              ›
            </button>
            {toYMD(weekStart) !== toYMD(startOfWeek(new Date())) && (
              <button onClick={() => setSelectedDate(today)} className="text-xs text-blue-600 hover:underline ml-1">
                This week
              </button>
            )}
          </div>

          {/* Day headers */}
          <div className="flex items-center gap-2 mb-3 pl-[calc(1rem+2rem+1rem+8rem)]">
            {weekDates.map(d => (
              <div
                key={toYMD(d)}
                className={`w-5 text-center text-[10px] font-semibold ${toYMD(d) === today ? 'text-blue-600' : 'text-gray-400'}`}
              >
                {DAYS_SHORT[d.getDay()]}
              </div>
            ))}
          </div>

          {habits.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">No habits yet.</div>
          ) : (
            <div className="space-y-4">
              {groups.map(({ group, habits: gHabits }) => (
                <div key={group}>
                  <div className="mb-2 flex items-center gap-2">
                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-2 flex-1">
                      {groupBy === 'tag' && group !== TAG_FALLBACK ? `#${group}` : group}
                      <div className="flex-1 border-t border-gray-100" />
                    </div>
                    <button
                      type="button"
                      onClick={() => beginQuickAdd(group)}
                      className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500 transition-colors hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50"
                      title={`Add habit to ${getQuickAddButtonLabel(group)}`}
                    >
                      <PlusIcon className="h-3 w-3" />
                      Add
                    </button>
                  </div>
                  <div className="space-y-2">
                    {isQuickAddGroup(group) && (
                      <QuickAddHabitForm
                        value={quickAddName}
                        onChange={setQuickAddName}
                        onSave={handleQuickAddHabit}
                        onCancel={cancelQuickAdd}
                        inputRef={quickAddInputRef}
                        label={getQuickAddButtonLabel(group)}
                      />
                    )}
                    {gHabits.map(habit => (
                      <div key={habit.id} className="flex items-center gap-2">
                        <span className="text-sm text-gray-700 w-40 truncate flex-shrink-0">{habit.name}</span>
                        <WeekHeatmap habit={habit} completions={completions} weekDates={weekDates} />
                        <RateBadge rate={getRate(habit.id, 7)} />
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
              <div className="text-2xl font-bold text-blue-600">{habits.length}</div>
              <div className="text-xs text-gray-500 mt-0.5">Active habits</div>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4 text-center shadow-sm">
              <div className="text-2xl font-bold text-green-600">{todayDone}</div>
              <div className="text-xs text-gray-500 mt-0.5">Done today</div>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-4 text-center shadow-sm">
              <div className="text-2xl font-bold text-orange-500">
                {habits.reduce((max, h) => Math.max(max, getStreak(h.id)), 0)}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">Best streak</div>
            </div>
          </div>

          {habits.length === 0 ? (
            <div className="text-center py-16 text-gray-400 text-sm">No habits yet.</div>
          ) : (
            <div className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Last 30 Days</div>
              {groups.map(({ group, habits: gHabits }) => (
                <div key={group}>
                  <div className="mb-2 flex items-center gap-2">
                    <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 flex items-center gap-2 flex-1">
                      {groupBy === 'tag' && group !== TAG_FALLBACK ? `#${group}` : group}
                      <div className="flex-1 border-t border-gray-100" />
                    </div>
                    <button
                      type="button"
                      onClick={() => beginQuickAdd(group)}
                      className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500 transition-colors hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50"
                      title={`Add habit to ${getQuickAddButtonLabel(group)}`}
                    >
                      <PlusIcon className="h-3 w-3" />
                      Add
                    </button>
                  </div>
                  <div className="space-y-3">
                    {isQuickAddGroup(group) && (
                      <QuickAddHabitForm
                        value={quickAddName}
                        onChange={setQuickAddName}
                        onSave={handleQuickAddHabit}
                        onCancel={cancelQuickAdd}
                        inputRef={quickAddInputRef}
                        label={getQuickAddButtonLabel(group)}
                      />
                    )}
                    {gHabits.map(habit => (
                      <HabitStatsRow
                        key={habit.id}
                        habit={habit}
                        completions={completions}
                        last30Dates={last30Dates}
                        streak={getStreak(habit.id)}
                        rate30={getRate(habit.id, 30)}
                        rate7={getRate(habit.id, 7)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Modal ── */}
      {showModal && (
        <HabitModal
          habit={editingHabit}
          existingTags={existingTags}
          onSave={handleSaveHabit}
          onClose={() => { setShowModal(false); setEditingHabit(null); }}
        />
      )}
    </div>
  );
}
