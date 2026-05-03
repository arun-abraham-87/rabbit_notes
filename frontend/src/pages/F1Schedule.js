import React, { useEffect, useMemo, useState } from 'react';
import { ArrowPathIcon, CalendarDaysIcon, FlagIcon, TrophyIcon } from '@heroicons/react/24/outline';
import { createNote, fetchF1Schedule2026, updateNoteById } from '../utils/ApiUtils';

const F1_NOTE_META = 'meta::f1_schedule::2026';
const DATA_START = 'f1_schedule_json::start';
const DATA_END = 'f1_schedule_json::end';

const formatDate = (dateString) => {
  if (!dateString) return '';
  return new Date(`${dateString}T12:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
};

const formatRange = (event) => {
  if (!event?.startDate && !event?.endDate) return event?.dateRange || '';
  if (event.startDate === event.endDate) return formatDate(event.startDate);
  return `${formatDate(event.startDate)} - ${formatDate(event.endDate)}`;
};

const formatTimeToStart = (event) => {
  if (!event?.startDate) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(`${event.startDate}T00:00:00`);
  const days = Math.ceil((start - today) / (1000 * 60 * 60 * 24));
  const name = event.name || 'Grand Prix';

  if (days < 0) return `Started ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`;
  if (days === 0) return `${name} starts today`;
  if (days <= 30) return `${days} day${days === 1 ? '' : 's'} to start of ${name}`;

  const months = Math.floor(days / 30);
  const remainingDays = days % 30;
  return `${months} month${months === 1 ? '' : 's'}${remainingDays ? ` and ${remainingDays} day${remainingDays === 1 ? '' : 's'}` : ''} to start of ${name}`;
};

const extractScheduleFromNote = (note) => {
  if (!note?.content?.includes(F1_NOTE_META)) return null;
  const start = note.content.indexOf(DATA_START);
  const end = note.content.indexOf(DATA_END);
  if (start === -1 || end === -1 || end <= start) return null;

  const raw = note.content.slice(start + DATA_START.length, end).trim();
  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Failed to parse cached F1 schedule note:', error);
    return null;
  }
};

const buildScheduleNoteContent = (payload) => (
  [
    'F1 Schedule 2026',
    F1_NOTE_META,
    `source:${payload.sourceUrl || 'https://www.formula1.com/en/racing/2026'}`,
    `fetched_at:${payload.fetchedAt || new Date().toISOString()}`,
    DATA_START,
    JSON.stringify(payload, null, 2),
    DATA_END,
  ].join('\n')
);

const statusStyles = {
  completed: 'bg-slate-100 text-slate-700 border-slate-200',
  current: 'bg-green-100 text-green-700 border-green-200',
  upcoming: 'bg-blue-100 text-blue-700 border-blue-200',
};

const countryFlags = {
  Australia: '🇦🇺',
  China: '🇨🇳',
  Japan: '🇯🇵',
  Bahrain: '🇧🇭',
  'Saudi Arabia': '🇸🇦',
  'United States': '🇺🇸',
  'United States of America': '🇺🇸',
  Canada: '🇨🇦',
  Monaco: '🇲🇨',
  Spain: '🇪🇸',
  Austria: '🇦🇹',
  'United Kingdom': '🇬🇧',
  Belgium: '🇧🇪',
  Hungary: '🇭🇺',
  Netherlands: '🇳🇱',
  Italy: '🇮🇹',
  Azerbaijan: '🇦🇿',
  Singapore: '🇸🇬',
  Mexico: '🇲🇽',
  Brazil: '🇧🇷',
  Qatar: '🇶🇦',
  'United Arab Emirates': '🇦🇪',
  'Great Britain': '🇬🇧',
  Mexico: '🇲🇽',
};

const locationCountryMap = [
  ['Barcelona-Catalunya', 'Spain'],
  ['Las Vegas', 'United States of America'],
  ['Abu Dhabi', 'United Arab Emirates'],
  ['Miami', 'United States of America'],
  ['Monaco', 'Monaco'],
  ['Spielberg', 'Austria'],
  ['Silverstone', 'Great Britain'],
  ['Spa-Francorchamps', 'Belgium'],
  ['Budapest', 'Hungary'],
  ['Zandvoort', 'Netherlands'],
  ['Monza', 'Italy'],
  ['Baku', 'Azerbaijan'],
  ['Singapore', 'Singapore'],
  ['Austin', 'United States of America'],
  ['Mexico City', 'Mexico'],
  ['São Paulo', 'Brazil'],
  ['Sao Paulo', 'Brazil'],
  ['Lusail', 'Qatar'],
  ['Melbourne', 'Australia'],
  ['Shanghai', 'China'],
  ['Suzuka', 'Japan'],
  ['Sakhir', 'Bahrain'],
  ['Jeddah', 'Saudi Arabia'],
  ['Montreal', 'Canada'],
  ['Montréal', 'Canada'],
  ['Imola', 'Italy'],
];

const normalizeEventPlace = (event) => {
  const rawCountry = String(event?.country || '').trim();
  const rawLocation = String(event?.location || '').trim();
  const combined = `${rawCountry} ${rawLocation}`.trim();
  const match = locationCountryMap.find(([location]) => combined.includes(location));
  if (match) {
    return { location: match[0], country: match[1] };
  }

  const doubled = rawCountry.match(/^(.+?)\s+\1$/i);
  return {
    location: rawLocation || (doubled ? doubled[1] : rawCountry),
    country: doubled ? doubled[1] : rawCountry,
  };
};

const getCountryFlag = (event) => {
  const { country } = normalizeEventPlace(event);
  return countryFlags[country] || '🏁';
};

const getRaceCardClass = (event) => (
  event.status === 'current'
    ? 'group rounded-lg border border-green-300 bg-green-50 p-4 shadow-sm ring-1 ring-green-200 transition-colors hover:border-green-400 hover:bg-green-100'
    : 'group rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-red-300 hover:bg-red-50'
);

const F1Schedule = ({ allNotes, setAllNotes }) => {
  const [schedule, setSchedule] = useState(null);
  const [source, setSource] = useState('cache');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const scheduleNote = useMemo(() => (
    (allNotes || []).find(note => note?.content?.includes(F1_NOTE_META))
  ), [allNotes]);

  const saveSchedulePayload = async (payload) => {
    const content = buildScheduleNoteContent(payload);
    if (scheduleNote?.id) {
      const updated = await updateNoteById(scheduleNote.id, content);
      setAllNotes(prev => prev.map(note => note.id === scheduleNote.id ? { ...note, content: updated?.content || content } : note));
      return;
    }

    const created = await createNote(content);
    setAllNotes(prev => [...prev, created]);
  };

  const loadFromWebsite = async () => {
    setIsLoading(true);
    setError('');
    try {
      const payload = await fetchF1Schedule2026();
      await saveSchedulePayload(payload);
      setSchedule(payload);
      setSource('website');
    } catch (err) {
      setError(err.message || 'Failed to load F1 schedule');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const cached = extractScheduleFromNote(scheduleNote);
    if (cached) {
      if (schedule?.fetchedAt === cached.fetchedAt) return;
      setSchedule(cached);
      setSource('cache');
      return;
    }

    if ((allNotes || []).length > 0 && !scheduleNote && !schedule && !isLoading) {
      loadFromWebsite();
    }
  }, [scheduleNote, allNotes]);

  const events = schedule?.events || [];
  const races = events.filter(event => event.type === 'race');
  const tests = events.filter(event => event.type === 'testing');
  const nextEvent = events.find(event => event.status === 'current') || events.find(event => event.status === 'upcoming');
  const completedCount = races.filter(event => event.status === 'completed').length;

  const racesByMonth = races.reduce((groups, event) => {
    const month = event.startDate
      ? new Date(`${event.startDate}T12:00:00`).toLocaleDateString(undefined, { month: 'long' })
      : 'Unscheduled';
    if (!groups[month]) groups[month] = [];
    groups[month].push(event);
    return groups;
  }, {});

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-red-600">Formula 1</div>
            <h1 className="text-3xl font-bold">F1 Schedule 2026</h1>
            <p className="mt-1 text-sm text-slate-500">
              {source === 'cache' ? 'Loaded from saved notes.' : 'Reloaded from Formula1.com and saved to notes.'}
              {schedule?.fetchedAt && ` Last fetched ${new Date(schedule.fetchedAt).toLocaleString()}.`}
            </p>
          </div>
          <button
            type="button"
            onClick={loadFromWebsite}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Reload from website
          </button>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
              <TrophyIcon className="h-4 w-4" />
              Races
            </div>
            <div className="mt-2 text-3xl font-bold">{races.length}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
              <FlagIcon className="h-4 w-4" />
              Completed
            </div>
            <div className="mt-2 text-3xl font-bold">{completedCount}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
              <CalendarDaysIcon className="h-4 w-4" />
              Testing
            </div>
            <div className="mt-2 text-3xl font-bold">{tests.length}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-500">Next</div>
            <div className="mt-2 truncate text-lg font-bold">{nextEvent?.location || nextEvent?.country || 'No upcoming race'}</div>
            <div className="text-xs text-slate-500">{nextEvent ? formatRange(nextEvent) : ''}</div>
          </div>
        </div>

        {tests.length > 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-3 text-lg font-bold">Pre-season Testing</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {tests.map(event => (
                <a key={event.id} href={event.url} target="_blank" rel="noopener noreferrer" className="rounded-md border border-slate-200 p-3 transition-colors hover:border-red-300 hover:bg-red-50">
                  <div className="flex items-start gap-3">
                    <div className="text-4xl leading-none" title={normalizeEventPlace(event).country}>{getCountryFlag(event)}</div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold uppercase tracking-wide text-slate-400">{event.label}</div>
                      <div className="mt-1 font-semibold">{event.name}</div>
                      <div className="text-sm text-slate-500">{normalizeEventPlace(event).country} · {formatRange(event)}</div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-5">
          {Object.entries(racesByMonth).map(([month, monthEvents]) => (
            <section key={month} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold">{month}</h2>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{monthEvents.length} race{monthEvents.length === 1 ? '' : 's'}</span>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {monthEvents.map(event => {
                  const place = normalizeEventPlace(event);
                  return (
                    <a key={event.id} href={event.url} target="_blank" rel="noopener noreferrer" className={getRaceCardClass(event)}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 gap-3">
                          <div className="text-5xl leading-none" title={place.country}>{getCountryFlag(event)}</div>
                          <div className="min-w-0">
                            <div className={`text-xs font-bold uppercase tracking-wide ${event.status === 'current' ? 'text-green-700' : 'text-red-600'}`}>Round {event.round}</div>
                            <h3 className={`mt-1 line-clamp-2 font-bold ${event.status === 'current' ? 'text-green-950' : 'text-slate-900 group-hover:text-red-700'}`}>{event.name}</h3>
                          </div>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${statusStyles[event.status] || statusStyles.upcoming}`}>
                          {event.status}
                        </span>
                      </div>
                      <div className={`mt-3 text-sm font-semibold ${event.status === 'current' ? 'text-green-900' : 'text-slate-700'}`}>{place.location || place.country}</div>
                      <div className={event.status === 'current' ? 'text-sm text-green-700' : 'text-sm text-slate-500'}>{place.country}</div>
                      <div className={`mt-3 rounded-md px-3 py-2 text-sm font-semibold ${event.status === 'current' ? 'bg-green-100 text-green-900' : 'bg-slate-100 text-slate-700'}`}>
                        {formatRange(event)}
                      </div>
                      <div className={`mt-3 border-t pt-3 text-sm font-semibold ${event.status === 'current' ? 'border-green-200 text-green-900' : 'border-slate-100 text-slate-600'}`}>
                        {formatTimeToStart(event)}
                      </div>
                    </a>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

export default F1Schedule;
