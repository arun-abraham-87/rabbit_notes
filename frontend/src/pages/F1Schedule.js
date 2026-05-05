import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowPathIcon, TrophyIcon } from '@heroicons/react/24/outline';
import { createNote, deleteNoteById, fetchF1Data2026, fetchF1DriverBirthDate, fetchF1DriverProfile, updateNoteById } from '../utils/ApiUtils';

const F1_NOTE_META = 'meta::f1_schedule::2026';
const F1_DRIVER_BIRTHDATES_META = 'meta::f1_driver_birthdates';
const SCRAPED_INFO_META = 'meta::scraped_info';
const F1_SCRAPED_DATA_META = 'meta::scraped_info::f1';
const DATA_START = 'f1_schedule_json::start';
const DATA_END = 'f1_schedule_json::end';
const DRIVER_BIRTHDATES_START = 'f1_driver_birthdates_json::start';
const DRIVER_BIRTHDATES_END = 'f1_driver_birthdates_json::end';
const DAY_MS = 1000 * 60 * 60 * 24;
const STALE_AFTER_DAYS = 3;
const DRIVER_HOVER_DELAY_MS = 650;

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

const getAgeInDays = (dateString) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / DAY_MS));
};

const getAgeInYears = (dateString) => {
  if (!dateString) return null;
  const birthDate = new Date(`${dateString}T12:00:00`);
  if (Number.isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const hasBirthdayPassed = today.getMonth() > birthDate.getMonth()
    || (today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());
  if (!hasBirthdayPassed) age -= 1;
  return age >= 0 ? age : null;
};

const formatFetchedAt = (dateString) => {
  if (!dateString) return '';
  const age = getAgeInDays(dateString);
  const ageText = age === null ? '' : ` (${age} day${age === 1 ? '' : 's'} old)`;
  return `${new Date(dateString).toLocaleString()}${ageText}`;
};

const isScheduleStale = (payload) => {
  const age = getAgeInDays(payload?.fetchedAt);
  return age !== null && age > STALE_AFTER_DAYS;
};

const getDynamicStatus = (event) => {
  if (!event?.startDate || !event?.endDate) return event?.status || 'upcoming';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(`${event.startDate}T00:00:00`);
  const end = new Date(`${event.endDate}T23:59:59`);

  if (end < today) return 'completed';
  if (start <= today && end >= today) return 'current';
  return 'upcoming';
};

const formatTimeToStart = (event) => {
  if (!event?.startDate) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(`${event.startDate}T00:00:00`);
  const days = Math.ceil((start - today) / (1000 * 60 * 60 * 24));

  if (days < 0) return `Started ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`;
  if (days === 0) return 'Starts today';
  if (days <= 30) return `${days} day${days === 1 ? '' : 's'} to start`;

  const months = Math.floor(days / 30);
  const remainingDays = days % 30;
  return `${months} month${months === 1 ? '' : 's'}${remainingDays ? ` and ${remainingDays} day${remainingDays === 1 ? '' : 's'}` : ''} to start`;
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

const extractDriverBirthDatesFromNote = (note) => {
  if (!note?.content?.includes(F1_DRIVER_BIRTHDATES_META)) return {};
  const start = note.content.indexOf(DRIVER_BIRTHDATES_START);
  const end = note.content.indexOf(DRIVER_BIRTHDATES_END);
  if (start === -1 || end === -1 || end <= start) return {};

  const raw = note.content.slice(start + DRIVER_BIRTHDATES_START.length, end).trim();
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    console.warn('Failed to parse cached F1 driver birth dates note:', error);
    return {};
  }
};

const buildDriverBirthDatesNoteContent = (birthDatesByDriver) => (
  [
    'F1 Driver Birth Dates',
    SCRAPED_INFO_META,
    F1_DRIVER_BIRTHDATES_META,
    'source:Wikipedia/Wikidata',
    `fetched_at:${new Date().toISOString()}`,
    DRIVER_BIRTHDATES_START,
    JSON.stringify(birthDatesByDriver, null, 2),
    DRIVER_BIRTHDATES_END,
  ].join('\n')
);

const buildScheduleNoteContent = (payload) => (
  [
    'F1 Schedule 2026',
    SCRAPED_INFO_META,
    F1_SCRAPED_DATA_META,
    F1_NOTE_META,
    `source:${payload.sourceUrl || 'https://www.formula1.com/en/racing/2026'}`,
    `drivers_source:${payload.driversSourceUrl || 'https://www.formula1.com/en/results/2026/drivers'}`,
    `teams_source:${payload.teamsSourceUrl || 'https://www.formula1.com/en/results/2026/team'}`,
    `race_results_source:${payload.raceResultsSourceUrl || 'https://www.formula1.com/en/results/2026/races'}`,
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

const DriverProfilePopup = ({ driver, profileState, position }) => (
  <div
    className="fixed z-50 w-80 overflow-hidden rounded-lg border border-slate-200 bg-white text-left shadow-xl ring-1 ring-slate-900/5"
    style={{ left: position.left, top: position.top }}
  >
    {profileState?.status === 'loading' && (
      <div className="p-4 text-sm font-medium text-slate-500">Loading Wikipedia profile...</div>
    )}
    {profileState?.status === 'error' && (
      <div className="p-4 text-sm text-red-600">Could not load Wikipedia profile.</div>
    )}
    {profileState?.status === 'loaded' && (
      <div>
        {profileState.profile.thumbnail && (
          <img
            src={profileState.profile.thumbnail}
            alt={profileState.profile.name}
            className="h-40 w-full object-cover object-top"
          />
        )}
        <div className="p-4">
          <div className="text-base font-bold text-slate-950">{profileState.profile.name || driver.name}</div>
          {profileState.profile.description && (
            <div className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {profileState.profile.description}
            </div>
          )}
          <p className="mt-3 line-clamp-5 text-sm leading-6 text-slate-600">
            {profileState.profile.extract || 'No summary available from Wikipedia.'}
          </p>
          {profileState.profile.url && (
            <a
              href={profileState.profile.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex text-xs font-bold text-blue-700 hover:text-blue-900 hover:underline"
            >
              Open Wikipedia
            </a>
          )}
        </div>
      </div>
    )}
  </div>
);

const F1Schedule = ({ allNotes, setAllNotes }) => {
  const [schedule, setSchedule] = useState(null);
  const [source, setSource] = useState('cache');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoReloadedFetchedAt, setAutoReloadedFetchedAt] = useState('');
  const [hoveredDriverName, setHoveredDriverName] = useState('');
  const [driverPopupPosition, setDriverPopupPosition] = useState({ left: 0, top: 0 });
  const [driverProfiles, setDriverProfiles] = useState({});
  const [driverBirthDates, setDriverBirthDates] = useState({});
  const [driverBirthDateLookupStatus, setDriverBirthDateLookupStatus] = useState({});
  const hoverTimerRef = useRef(null);

  const scheduleNote = useMemo(() => (
    (allNotes || []).find(note => note?.content?.includes(F1_NOTE_META))
  ), [allNotes]);

  const f1ScrapedDataNotes = useMemo(() => (
    (allNotes || []).filter(note => note?.content?.includes(F1_SCRAPED_DATA_META) || note?.content?.includes(F1_NOTE_META))
  ), [allNotes]);

  const driverBirthDatesNote = useMemo(() => (
    (allNotes || []).find(note => note?.content?.includes(F1_DRIVER_BIRTHDATES_META))
  ), [allNotes]);

  const saveSchedulePayload = async (payload) => {
    const content = buildScheduleNoteContent(payload);
    const created = await createNote(content);
    setAllNotes(prev => [...prev, created]);
  };

  const deleteExistingScrapedData = async () => {
    if (f1ScrapedDataNotes.length === 0) return;
    await Promise.all(f1ScrapedDataNotes.map(note => deleteNoteById(note.id)));
    setAllNotes(prev => prev.filter(note => !f1ScrapedDataNotes.some(scrapedNote => scrapedNote.id === note.id)));
  };

  const saveDriverBirthDates = useCallback(async (birthDatesByDriver) => {
    const content = buildDriverBirthDatesNoteContent(birthDatesByDriver);
    if (driverBirthDatesNote?.id) {
      const updated = await updateNoteById(driverBirthDatesNote.id, content);
      setAllNotes(prev => prev.map(note => (
        note.id === driverBirthDatesNote.id ? { ...note, content: updated?.content || content } : note
      )));
      return;
    }

    const created = await createNote(content);
    setAllNotes(prev => [...prev, created]);
  }, [driverBirthDatesNote, setAllNotes]);

  const loadFromWebsite = async () => {
    setIsLoading(true);
    setError('');
    try {
      const payload = await fetchF1Data2026();
      await deleteExistingScrapedData();
      await saveSchedulePayload(payload);
      setSchedule(payload);
      setSource('website');
    } catch (err) {
      setError(err.message || 'Failed to load F1 schedule');
    } finally {
      setIsLoading(false);
    }
  };

  const clearDriverHoverTimer = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  const lookupDriverBirthDateIfMissing = useCallback(async (driver) => {
    if (!driver?.name || driverBirthDates[driver.name] || driverBirthDateLookupStatus[driver.name] === 'loading') return;

    setDriverBirthDateLookupStatus(prev => ({ ...prev, [driver.name]: 'loading' }));
    try {
      const profile = await fetchF1DriverBirthDate(driver.name);
      const nextBirthDates = {
        ...driverBirthDates,
        [driver.name]: {
          birthDate: profile.birthDate,
          birthYear: profile.birthYear,
          source: profile.source,
          wikipediaUrl: profile.wikipediaUrl,
          wikidataId: profile.wikidataId,
          fetchedAt: new Date().toISOString(),
        },
      };
      setDriverBirthDates(nextBirthDates);
      await saveDriverBirthDates(nextBirthDates);
      setDriverBirthDateLookupStatus(prev => ({ ...prev, [driver.name]: 'loaded' }));
    } catch (err) {
      const nextBirthDates = {
        ...driverBirthDates,
        [driver.name]: {
          birthDate: '',
          birthYear: '',
          error: err.message || 'Failed to fetch birth date',
          fetchedAt: new Date().toISOString(),
        },
      };
      setDriverBirthDates(nextBirthDates);
      await saveDriverBirthDates(nextBirthDates);
      setDriverBirthDateLookupStatus(prev => ({ ...prev, [driver.name]: 'error' }));
    }
  }, [driverBirthDates, driverBirthDateLookupStatus, saveDriverBirthDates]);

  const loadDriverProfile = async (driver) => {
    if (!driver?.name) return;
    const current = driverProfiles[driver.name];
    if (current?.status === 'loaded') {
      lookupDriverBirthDateIfMissing(driver);
      return;
    }
    if (current?.status === 'loading') return;

    setDriverProfiles(prev => ({
      ...prev,
      [driver.name]: { status: 'loading', profile: null, error: '' },
    }));

    try {
      const profile = await fetchF1DriverProfile(driver.name);
      setDriverProfiles(prev => ({
        ...prev,
        [driver.name]: { status: 'loaded', profile, error: '' },
      }));
      lookupDriverBirthDateIfMissing(driver);
    } catch (err) {
      setDriverProfiles(prev => ({
        ...prev,
        [driver.name]: { status: 'error', profile: null, error: err.message || 'Failed to load profile' },
      }));
    }
  };

  const handleDriverHoverStart = (driver, event) => {
    clearDriverHoverTimer();
    const rect = event.currentTarget.getBoundingClientRect();
    setDriverPopupPosition({
      left: Math.min(rect.left, window.innerWidth - 336),
      top: Math.min(rect.bottom + 8, window.innerHeight - 420),
    });
    hoverTimerRef.current = setTimeout(() => {
      setHoveredDriverName(driver.name);
      loadDriverProfile(driver);
    }, DRIVER_HOVER_DELAY_MS);
  };

  const handleDriverHoverEnd = () => {
    clearDriverHoverTimer();
    setHoveredDriverName('');
  };

  useEffect(() => () => clearDriverHoverTimer(), []);

  useEffect(() => {
    const cached = extractScheduleFromNote(scheduleNote);
    if (cached) {
      if (schedule?.fetchedAt === cached.fetchedAt) return;
      setSchedule(cached);
      setSource('cache');
      if (isScheduleStale(cached) && autoReloadedFetchedAt !== cached.fetchedAt && !isLoading) {
        setAutoReloadedFetchedAt(cached.fetchedAt || 'unknown');
        loadFromWebsite();
      }
      return;
    }

    if ((allNotes || []).length > 0 && !scheduleNote && !schedule && !isLoading) {
      loadFromWebsite();
    }
  }, [scheduleNote, allNotes]);

  useEffect(() => {
    setDriverBirthDates(extractDriverBirthDatesFromNote(driverBirthDatesNote));
  }, [driverBirthDatesNote]);

  const events = useMemo(() => (
    (schedule?.events || []).map(event => ({
      ...event,
      status: getDynamicStatus(event),
    }))
  ), [schedule]);
  const races = events.filter(event => event.type === 'race');
  const tests = events.filter(event => event.type === 'testing');
  const drivers = useMemo(() => schedule?.drivers || [], [schedule]);
  const teams = schedule?.teams || [];
  const raceResults = schedule?.raceResults || [];
  const nextEvent = events.find(event => event.status === 'current') || events.find(event => event.status === 'upcoming');
  const hasMissingEarlyRounds = races.length > 0 && !races.some(event => event.round === 1);

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
              {schedule?.fetchedAt && ` Last fetched ${formatFetchedAt(schedule.fetchedAt)}.`}
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

        {hasMissingEarlyRounds && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            Saved F1 data is missing the early completed rounds. Reload from website to refresh the saved schedule.
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
              <TrophyIcon className="h-4 w-4" />
              Races
            </div>
            <div className="mt-2 text-3xl font-bold">{races.length}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-500">Next</div>
            <div className="mt-2 truncate text-lg font-bold">{nextEvent?.location || nextEvent?.country || 'No upcoming race'}</div>
            <div className="text-xs text-slate-500">{nextEvent ? formatRange(nextEvent) : ''}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-500">Drivers</div>
            <div className="mt-2 text-3xl font-bold">{drivers.length}</div>
            <div className="truncate text-xs text-slate-500">{drivers[0] ? `${drivers[0].name} leads` : 'No standings yet'}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-500">Teams</div>
            <div className="mt-2 text-3xl font-bold">{teams.length}</div>
            <div className="truncate text-xs text-slate-500">{teams[0] ? `${teams[0].name} leads` : 'No standings yet'}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm font-semibold text-slate-500">Results</div>
            <div className="mt-2 text-3xl font-bold">{raceResults.length}</div>
            <div className="truncate text-xs text-slate-500">{raceResults[0] ? `${raceResults[0].grandPrix} done` : 'No results yet'}</div>
          </div>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Race Results</h2>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{raceResults.length} race{raceResults.length === 1 ? '' : 's'}</span>
          </div>
          {raceResults.length > 0 ? (
            <div className="overflow-hidden rounded-md border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-2">Grand Prix</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Winner</th>
                    <th className="hidden px-3 py-2 md:table-cell">Team</th>
                    <th className="hidden w-20 px-3 py-2 text-right sm:table-cell">Laps</th>
                    <th className="w-32 px-3 py-2 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {raceResults.map(result => (
                    <tr key={`${result.grandPrix}-${result.date}`} className="hover:bg-slate-50">
                      <td className="px-3 py-2">
                        {result.url ? (
                          <a href={result.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-700 hover:text-blue-900 hover:underline">
                            {result.grandPrix}
                          </a>
                        ) : (
                          <div className="font-semibold text-slate-900">{result.grandPrix}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-500">{result.date}</td>
                      <td className="px-3 py-2">
                        <div className="font-semibold text-slate-900">{result.winner}</div>
                        {result.winnerCode && <div className="text-xs font-bold text-slate-400">{result.winnerCode}</div>}
                      </td>
                      <td className="hidden px-3 py-2 text-slate-700 md:table-cell">{result.team}</td>
                      <td className="hidden px-3 py-2 text-right font-medium text-slate-500 sm:table-cell">{result.laps}</td>
                      <td className="px-3 py-2 text-right font-bold text-slate-900">{result.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
              Reload from website to save the race results with the schedule.
            </div>
          )}
        </section>

        <div className="grid gap-5 xl:grid-cols-2">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">Drivers Standings</h2>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {drivers.length} driver{drivers.length === 1 ? '' : 's'}
              </span>
            </div>
            {drivers.length > 0 ? (
              <div className="overflow-hidden rounded-md border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="w-16 px-3 py-2">Pos</th>
                      <th className="px-3 py-2">Driver</th>
                      <th className="w-20 px-3 py-2 text-right">Age</th>
                      <th className="hidden px-3 py-2 sm:table-cell">Nat</th>
                      <th className="px-3 py-2">Team</th>
                      <th className="w-20 px-3 py-2 text-right">Pts</th>
                    </tr>
                  </thead>
                </table>
                <div className="max-h-[440px] overflow-y-auto">
                  <table className="min-w-full text-sm">
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {drivers.map(driver => (
                        <tr key={`${driver.position}-${driver.code || driver.name}`} className={driver.position === 1 ? 'bg-green-50' : 'hover:bg-slate-50'}>
                          <td className="w-16 px-3 py-2 font-bold text-slate-500">{driver.position}</td>
                          <td className="px-3 py-2">
                            <div
                              className="relative inline-block"
                              onMouseEnter={(event) => handleDriverHoverStart(driver, event)}
                              onMouseLeave={handleDriverHoverEnd}
                              onFocus={(event) => handleDriverHoverStart(driver, event)}
                              onBlur={handleDriverHoverEnd}
                            >
                              {driver.profileUrl ? (
                                <a
                                  href={driver.profileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-semibold text-blue-700 hover:text-blue-900 hover:underline"
                                >
                                  {driver.name}
                                </a>
                              ) : (
                                <button
                                  type="button"
                                  className="font-semibold text-slate-900 hover:text-blue-900 hover:underline"
                                >
                                  {driver.name}
                                </button>
                              )}
                              {hoveredDriverName === driver.name && (
                                createPortal(
                                  <DriverProfilePopup
                                    driver={driver}
                                    profileState={driverProfiles[driver.name] || { status: 'loading' }}
                                    position={driverPopupPosition}
                                  />,
                                  document.body
                                )
                              )}
                            </div>
                            {driver.code && <div className="text-xs font-bold text-slate-400">{driver.code}</div>}
                          </td>
                          <td className="w-20 px-3 py-2 text-right font-semibold text-slate-700">
                            {(() => {
                              const age = getAgeInYears(driverBirthDates[driver.name]?.birthDate);
                              return age === null ? '' : age;
                            })()}
                          </td>
                          <td className="hidden px-3 py-2 font-medium text-slate-500 sm:table-cell">{driver.nationality}</td>
                          <td className="px-3 py-2 text-slate-700">{driver.team}</td>
                          <td className="w-20 px-3 py-2 text-right font-bold text-slate-900">{driver.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                Reload from website to save the drivers standings with the schedule.
              </div>
            )}
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">Team Standings</h2>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{teams.length} team{teams.length === 1 ? '' : 's'}</span>
            </div>
            {teams.length > 0 ? (
              <div className="overflow-hidden rounded-md border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="w-16 px-3 py-2">Pos</th>
                      <th className="px-3 py-2">Team</th>
                      <th className="w-20 px-3 py-2 text-right">Pts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {teams.map(team => (
                      <tr key={`${team.position}-${team.name}`} className={team.position === 1 ? 'bg-green-50' : 'hover:bg-slate-50'}>
                        <td className="w-16 px-3 py-2 font-bold text-slate-500">{team.position}</td>
                        <td className="px-3 py-2">
                          {team.profileUrl ? (
                            <a href={team.profileUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-700 hover:text-blue-900 hover:underline">
                              {team.name}
                            </a>
                          ) : (
                            <div className="font-semibold text-slate-900">{team.name}</div>
                          )}
                        </td>
                        <td className="w-20 px-3 py-2 text-right font-bold text-slate-900">{team.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                Reload from website to save the team standings with the schedule.
              </div>
            )}
          </section>
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
