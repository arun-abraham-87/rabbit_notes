import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowPathIcon, TrophyIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { createNote, deleteNoteById, fetchIplPlayerBirthDate, fetchIplPlayerProfile, fetchIplPointsTable, updateNoteById } from '../utils/ApiUtils';

const IPL_NOTE_META = 'meta::ipl_points_table';
const IPL_PLAYER_BIRTHDATES_META = 'meta::ipl_player_birthdates';
const SCRAPED_INFO_META = 'meta::scraped_info';
const IPL_SCRAPED_DATA_META = 'meta::scraped_info::ipl';
const DATA_START = 'ipl_points_table_json::start';
const DATA_END = 'ipl_points_table_json::end';
const PLAYER_BIRTHDATES_START = 'ipl_player_birthdates_json::start';
const PLAYER_BIRTHDATES_END = 'ipl_player_birthdates_json::end';
const DAY_MS = 1000 * 60 * 60 * 24;
const STALE_AFTER_DAYS = 3;
const PLAYER_HOVER_DELAY_MS = 850;
const SCORECARD_HOVER_DELAY_MS = 250;
const TEAM_ALIASES = {
  PBKS: 'Punjab Kings',
  RCB: 'Royal Challengers Bengaluru',
  SRH: 'Sunrisers Hyderabad',
  RR: 'Rajasthan Royals',
  GT: 'Gujarat Titans',
  CSK: 'Chennai Super Kings',
  DC: 'Delhi Capitals',
  KKR: 'Kolkata Knight Riders',
  MI: 'Mumbai Indians',
  LSG: 'Lucknow Super Giants',
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

const getStartOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const formatMatchDateWithAge = (dateString, includeTime = false) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;

  const today = getStartOfDay(new Date());
  const matchDay = getStartOfDay(date);
  const dayDiff = Math.round((matchDay - today) / DAY_MS);
  const ageText = dayDiff === 0
    ? 'today'
    : dayDiff === -1
      ? 'yesterday'
      : dayDiff < 0
        ? `${Math.abs(dayDiff)} days ago`
        : dayDiff === 1
          ? 'tomorrow'
          : `in ${dayDiff} days`;

  const dateText = date.toLocaleDateString();
  const weekdayText = date.toLocaleDateString(undefined, { weekday: 'short' });
  const isMidnight = date.getHours() === 0 && date.getMinutes() === 0 && date.getSeconds() === 0;
  const timeText = includeTime && !isMidnight
    ? `, ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
    : '';
  return `${dateText}${timeText} (${weekdayText}, ${ageText})`;
};

const getHostname = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch (error) {
    return 'source';
  }
};

const SourceLink = ({ url }) => (
  <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    onClick={event => event.stopPropagation()}
    className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700 hover:border-blue-300 hover:bg-blue-100"
  >
    {getHostname(url)}
  </a>
);

const normalizeTeamForHighlight = (team = '') => {
  const cleaned = String(team).replace(/\s+/g, ' ').trim();
  return (TEAM_ALIASES[cleaned.toUpperCase()] || cleaned).toLowerCase();
};

const teamMatchesHighlight = (candidate, highlightedTeam) => {
  if (!candidate || !highlightedTeam) return false;
  const normalizedCandidate = normalizeTeamForHighlight(candidate);
  const normalizedHighlight = normalizeTeamForHighlight(highlightedTeam);
  return normalizedCandidate === normalizedHighlight
    || normalizedCandidate.includes(normalizedHighlight)
    || normalizedHighlight.includes(normalizedCandidate);
};

const getMatchDisplayTitle = (match) => (
  match?.teamA && match?.teamB ? `${match.teamA} vs ${match.teamB}` : match?.title || 'Match'
);

const getMatchScoreRows = (match) => {
  const explicitRows = match?.scorecard || match?.innings || match?.scores;
  if (Array.isArray(explicitRows) && explicitRows.length > 0) {
    return explicitRows.map((row, index) => {
      if (typeof row === 'string') {
        return { id: `${index}-${row}`, team: row, score: '', overs: '' };
      }

      return {
        id: `${index}-${row.team || row.battingTeam || row.name || row.score || 'innings'}`,
        team: row.team || row.battingTeam || row.name || `Innings ${index + 1}`,
        score: row.score || row.runs || row.total || '',
        overs: row.overs || row.over || '',
      };
    });
  }

  return [
    {
      id: 'result-summary',
      team: match?.result || match?.status || 'Result not available',
      score: '',
      overs: '',
    },
  ];
};

const hasFullScorecard = (match) => (match?.scorecard?.innings || []).some(innings => (
  (innings.batters || []).length > 0 || (innings.bowlers || []).length > 0
));

const isPayloadStale = (payload) => {
  const age = getAgeInDays(payload?.fetchedAt);
  return age !== null && age > STALE_AFTER_DAYS;
};

const needsMatchDataRefresh = (payload) => (
  !!payload
  && (payload.parserVersion || 0) < 8
  && (payload?.standings || []).length > 0
);

const extractIplPayloadFromNote = (note) => {
  if (!note?.content?.includes(IPL_NOTE_META)) return null;
  const start = note.content.indexOf(DATA_START);
  const end = note.content.indexOf(DATA_END);
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    return JSON.parse(note.content.slice(start + DATA_START.length, end).trim());
  } catch (error) {
    console.warn('Failed to parse cached IPL points table note:', error);
    return null;
  }
};

const extractPlayerBirthDatesFromNote = (note) => {
  if (!note?.content?.includes(IPL_PLAYER_BIRTHDATES_META)) return {};
  const start = note.content.indexOf(PLAYER_BIRTHDATES_START);
  const end = note.content.indexOf(PLAYER_BIRTHDATES_END);
  if (start === -1 || end === -1 || end <= start) return {};

  try {
    const parsed = JSON.parse(note.content.slice(start + PLAYER_BIRTHDATES_START.length, end).trim());
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch (error) {
    console.warn('Failed to parse cached IPL player birth dates note:', error);
    return {};
  }
};

const buildPlayerBirthDatesNoteContent = (birthDatesByPlayer) => ([
  'IPL Player Birth Dates',
  SCRAPED_INFO_META,
  IPL_PLAYER_BIRTHDATES_META,
  'source:Wikipedia/Wikidata',
  `fetched_at:${new Date().toISOString()}`,
  PLAYER_BIRTHDATES_START,
  JSON.stringify(birthDatesByPlayer, null, 2),
  PLAYER_BIRTHDATES_END,
].join('\n'));

const buildIplNoteContent = (payload) => ([
  'IPL Points Table',
  SCRAPED_INFO_META,
  IPL_SCRAPED_DATA_META,
  IPL_NOTE_META,
  `source:${payload.sourceUrl || 'https://www.moneycontrol.com/sports/cricket/ipl/points-table/'}`,
  `schedule_source:${payload.scheduleSourceUrl || 'https://www.thetopbookies.com/cricket-news/ipl-2026-schedule'}`,
  `results_source:${payload.resultsSourceUrl || 'https://www.moneycontrol.com/sports/cricket/ipl/results/'}`,
  `captains_source:${payload.captainsSourceUrl || payload.squadsSourceUrl || 'https://www.ipl2026hub.com/blog/ipl-2026-teams-squads'}`,
  `squads_source:${payload.squadsSourceUrl || 'https://www.ipl2026hub.com/blog/ipl-2026-teams-squads'}`,
  `fetched_at:${payload.fetchedAt || new Date().toISOString()}`,
  DATA_START,
  JSON.stringify(payload, null, 2),
  DATA_END,
].join('\n'));

const IPLPage = ({ allNotes, setAllNotes }) => {
  const [payload, setPayload] = useState(null);
  const [source, setSource] = useState('cache');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoReloadedFetchedAt, setAutoReloadedFetchedAt] = useState('');
  const [playerProfiles, setPlayerProfiles] = useState({});
  const [playerBirthDates, setPlayerBirthDates] = useState({});
  const [playerBirthDateLookupStatus, setPlayerBirthDateLookupStatus] = useState({});
  const [activePlayer, setActivePlayer] = useState('');
  const [playerPopupPosition, setPlayerPopupPosition] = useState(null);
  const [playerProfileError, setPlayerProfileError] = useState('');
  const [hoveredTeam, setHoveredTeam] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [activeScorecardMatch, setActiveScorecardMatch] = useState(null);
  const [scorecardPopupPosition, setScorecardPopupPosition] = useState(null);
  const playerHoverTimerRef = useRef(null);
  const scorecardHoverTimerRef = useRef(null);

  const iplNote = useMemo(() => (
    (allNotes || []).find(note => note?.content?.includes(IPL_NOTE_META))
  ), [allNotes]);

  const iplScrapedDataNotes = useMemo(() => (
    (allNotes || []).filter(note => note?.content?.includes(IPL_SCRAPED_DATA_META) || note?.content?.includes(IPL_NOTE_META))
  ), [allNotes]);

  const playerBirthDatesNote = useMemo(() => (
    (allNotes || []).find(note => note?.content?.includes(IPL_PLAYER_BIRTHDATES_META))
  ), [allNotes]);

  const savePayload = async (nextPayload) => {
    const content = buildIplNoteContent(nextPayload);
    const created = await createNote(content);
    setAllNotes(prev => [...prev, created]);
  };

  const deleteExistingScrapedData = async () => {
    if (iplScrapedDataNotes.length === 0) return;
    await Promise.all(iplScrapedDataNotes.map(note => deleteNoteById(note.id)));
    setAllNotes(prev => prev.filter(note => !iplScrapedDataNotes.some(scrapedNote => scrapedNote.id === note.id)));
  };

  const savePlayerBirthDates = useCallback(async (birthDatesByPlayer) => {
    const content = buildPlayerBirthDatesNoteContent(birthDatesByPlayer);
    if (playerBirthDatesNote?.id) {
      const updated = await updateNoteById(playerBirthDatesNote.id, content);
      setAllNotes(prev => prev.map(note => (
        note.id === playerBirthDatesNote.id ? { ...note, content: updated?.content || content } : note
      )));
      return;
    }

    const created = await createNote(content);
    setAllNotes(prev => [...prev, created]);
  }, [playerBirthDatesNote, setAllNotes]);

  const loadFromWebsite = async () => {
    setIsLoading(true);
    setError('');
    try {
      const nextPayload = await fetchIplPointsTable();
      await deleteExistingScrapedData();
      await savePayload(nextPayload);
      setPayload(nextPayload);
      setSource('website');
    } catch (err) {
      setError(err.message || 'Failed to load IPL points table');
    } finally {
      setIsLoading(false);
    }
  };

  const clearPlayerHoverTimer = () => {
    if (playerHoverTimerRef.current) {
      clearTimeout(playerHoverTimerRef.current);
      playerHoverTimerRef.current = null;
    }
  };

  const clearScorecardHoverTimer = () => {
    if (scorecardHoverTimerRef.current) {
      clearTimeout(scorecardHoverTimerRef.current);
      scorecardHoverTimerRef.current = null;
    }
  };

  const lookupPlayerBirthDateIfMissing = useCallback(async (playerName) => {
    if (!playerName || playerBirthDates[playerName] || playerBirthDateLookupStatus[playerName] === 'loading') return;

    setPlayerBirthDateLookupStatus(prev => ({ ...prev, [playerName]: 'loading' }));
    try {
      const profile = await fetchIplPlayerBirthDate(playerName);
      const nextBirthDates = {
        ...playerBirthDates,
        [playerName]: {
          birthDate: profile.birthDate,
          birthYear: profile.birthYear,
          source: profile.source,
          wikipediaUrl: profile.wikipediaUrl,
          wikidataId: profile.wikidataId,
          fetchedAt: new Date().toISOString(),
        },
      };
      setPlayerBirthDates(nextBirthDates);
      await savePlayerBirthDates(nextBirthDates);
      setPlayerBirthDateLookupStatus(prev => ({ ...prev, [playerName]: 'loaded' }));
    } catch (err) {
      const nextBirthDates = {
        ...playerBirthDates,
        [playerName]: {
          birthDate: '',
          birthYear: '',
          error: err.message || 'Failed to fetch birth date',
          fetchedAt: new Date().toISOString(),
        },
      };
      setPlayerBirthDates(nextBirthDates);
      await savePlayerBirthDates(nextBirthDates);
      setPlayerBirthDateLookupStatus(prev => ({ ...prev, [playerName]: 'error' }));
    }
  }, [playerBirthDates, playerBirthDateLookupStatus, savePlayerBirthDates]);

  const loadPlayerProfile = async (playerName) => {
    if (!playerName) return;
    if (playerProfiles[playerName]?.status === 'loaded') {
      lookupPlayerBirthDateIfMissing(playerName);
      return;
    }
    if (playerProfiles[playerName]?.status === 'loading') return;
    setPlayerProfileError('');
    setPlayerProfiles(prev => ({
      ...prev,
      [playerName]: { status: 'loading' },
    }));

    try {
      const profile = await fetchIplPlayerProfile(playerName);
      setPlayerProfiles(prev => ({
        ...prev,
        [playerName]: { status: 'loaded', data: profile },
      }));
      lookupPlayerBirthDateIfMissing(playerName);
    } catch (err) {
      setPlayerProfileError(err.message || 'Failed to load player profile');
      setPlayerProfiles(prev => ({
        ...prev,
        [playerName]: { status: 'error' },
      }));
    }
  };

  const handlePlayerMouseEnter = (playerName, event) => {
    clearPlayerHoverTimer();
    const rect = event.currentTarget.getBoundingClientRect();
    playerHoverTimerRef.current = setTimeout(() => {
      setActivePlayer(playerName);
      setPlayerPopupPosition({
        top: rect.bottom + 8,
        left: Math.max(12, Math.min(rect.left, window.innerWidth - 500)),
      });
      loadPlayerProfile(playerName);
    }, PLAYER_HOVER_DELAY_MS);
  };

  const handlePlayerMouseLeave = () => {
    clearPlayerHoverTimer();
    if (activePlayer) {
      playerHoverTimerRef.current = setTimeout(closePlayerPopup, 250);
    }
  };

  const closePlayerPopup = () => {
    clearPlayerHoverTimer();
    setActivePlayer('');
    setPlayerPopupPosition(null);
  };

  const closeScorecardPopup = () => {
    clearScorecardHoverTimer();
    setActiveScorecardMatch(null);
    setScorecardPopupPosition(null);
  };

  const handleResultMouseEnter = (match, event) => {
    clearScorecardHoverTimer();
    const rect = event.currentTarget.getBoundingClientRect();
    scorecardHoverTimerRef.current = setTimeout(() => {
      setActiveScorecardMatch(match);
      setScorecardPopupPosition({
        top: Math.max(12, Math.min(rect.top, window.innerHeight - 520)),
        left: rect.right + 12 > window.innerWidth - 760
          ? Math.max(12, rect.left - 772)
          : rect.right + 12,
      });
    }, SCORECARD_HOVER_DELAY_MS);
  };

  const handleResultMouseLeave = () => {
    clearScorecardHoverTimer();
    if (activeScorecardMatch) {
      scorecardHoverTimerRef.current = setTimeout(closeScorecardPopup, 180);
    }
  };

  useEffect(() => {
    const cached = extractIplPayloadFromNote(iplNote);
    if (cached) {
      if (payload?.fetchedAt === cached.fetchedAt) return;
      setPayload(cached);
      setSource('cache');
      if ((isPayloadStale(cached) || needsMatchDataRefresh(cached)) && autoReloadedFetchedAt !== cached.fetchedAt && !isLoading) {
        setAutoReloadedFetchedAt(cached.fetchedAt || 'unknown');
        loadFromWebsite();
      }
      return;
    }

    if ((allNotes || []).length > 0 && !iplNote && !payload && !isLoading) {
      loadFromWebsite();
    }
  }, [iplNote, allNotes]);

  useEffect(() => {
    setPlayerBirthDates(extractPlayerBirthDatesFromNote(playerBirthDatesNote));
  }, [playerBirthDatesNote]);

  useEffect(() => () => {
    clearPlayerHoverTimer();
    clearScorecardHoverTimer();
  }, []);

  const rawStandings = payload?.standings || [];
  const rawTeams = payload?.teams || [];
  const rawSquads = payload?.squads || [];
  const rawCaptains = payload?.captains || [];
  const overview = payload?.overview || [];
  const rawResults = useMemo(() => (
    [...(payload?.results || [])].sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
  ), [payload?.results]);
  const rawUpcoming = payload?.upcoming || [];
  const selectTeam = teamName => setSelectedTeam(teamName || '');
  const activeTeam = selectedTeam || hoveredTeam;
  const isTeamHighlighted = teamName => teamMatchesHighlight(teamName, activeTeam);
  const isMatchHighlighted = match => isTeamHighlighted(match.teamA) || isTeamHighlighted(match.teamB) || isTeamHighlighted(match.title) || isTeamHighlighted(match.result);
  const isSelectedTeam = teamName => teamMatchesHighlight(teamName, selectedTeam);
  const isSelectedMatch = match => isSelectedTeam(match.teamA) || isSelectedTeam(match.teamB) || isSelectedTeam(match.title) || isSelectedTeam(match.result);
  const standings = selectedTeam ? rawStandings.filter(row => isSelectedTeam(row.team)) : rawStandings;
  const teams = selectedTeam ? rawTeams.filter(team => isSelectedTeam(team.fullName || team.name)) : rawTeams;
  const squads = selectedTeam ? rawSquads.filter(team => isSelectedTeam(team.name)) : rawSquads;
  const captains = selectedTeam ? rawCaptains.filter(team => isSelectedTeam(team.name || team.team || team.fullName)) : rawCaptains;
  const results = selectedTeam ? rawResults.filter(isSelectedMatch) : rawResults;
  const upcoming = selectedTeam ? rawUpcoming.filter(isSelectedMatch) : rawUpcoming;
  const leader = standings[0];
  const hasNoMatchData = !!payload && standings.length > 0 && results.length === 0 && upcoming.length === 0;
  const activeProfile = activePlayer ? playerProfiles[activePlayer] : null;
  const pointsSourceUrl = payload?.sourceUrl || 'https://www.moneycontrol.com/sports/cricket/ipl/points-table/';
  const fixturesSourceUrl = payload?.scheduleSourceUrl || 'https://www.thetopbookies.com/cricket-news/ipl-2026-schedule';
  const resultsSourceUrl = payload?.resultsSourceUrl || 'https://www.moneycontrol.com/sports/cricket/ipl/results/';
  const squadsSourceUrl = payload?.squadsSourceUrl || 'https://www.ipl2026hub.com/blog/ipl-2026-teams-squads';

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wide text-blue-700">Indian Premier League</div>
            <h1 className="text-3xl font-bold">IPL Points Table</h1>
            <p className="mt-1 text-sm text-slate-500">
              {source === 'cache' ? 'Loaded from saved notes.' : 'Reloaded from NDTV Sports and saved to notes.'}
              {payload?.fetchedAt && ` Last fetched ${formatFetchedAt(payload.fetchedAt)}.`}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
              <a href={payload?.sourceUrl || 'https://www.moneycontrol.com/sports/cricket/ipl/points-table/'} target="_blank" rel="noopener noreferrer" className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-blue-700 hover:border-blue-300 hover:bg-blue-100">
                Points source
              </a>
              <a href={payload?.scheduleSourceUrl || 'https://www.thetopbookies.com/cricket-news/ipl-2026-schedule'} target="_blank" rel="noopener noreferrer" className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-blue-700 hover:border-blue-300 hover:bg-blue-100">
                Fixtures source
              </a>
              <a href={payload?.resultsSourceUrl || 'https://www.moneycontrol.com/sports/cricket/ipl/results/'} target="_blank" rel="noopener noreferrer" className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-blue-700 hover:border-blue-300 hover:bg-blue-100">
                Results source
              </a>
              <a href={payload?.captainsSourceUrl || payload?.squadsSourceUrl || 'https://www.ipl2026hub.com/blog/ipl-2026-teams-squads'} target="_blank" rel="noopener noreferrer" className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-blue-700 hover:border-blue-300 hover:bg-blue-100">
                Captains source
              </a>
              <a href={payload?.squadsSourceUrl || 'https://www.ipl2026hub.com/blog/ipl-2026-teams-squads'} target="_blank" rel="noopener noreferrer" className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-blue-700 hover:border-blue-300 hover:bg-blue-100">
                Squads source
              </a>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {selectedTeam && (
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800">
                <span>Selected: {selectedTeam}</span>
                <button
                  type="button"
                  onClick={() => setSelectedTeam('')}
                  className="rounded border border-blue-200 bg-white px-2 py-1 text-xs font-bold text-blue-700 hover:bg-blue-100"
                >
                  Clear
                </button>
              </div>
            )}
            {selectedTeam && (
              <button
                type="button"
                onClick={loadFromWebsite}
                disabled={isLoading}
                className="inline-flex items-center gap-2 rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            )}
            <button
              type="button"
              onClick={loadFromWebsite}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ArrowPathIcon className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Reload from website
            </button>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {payload?.status === 'pending' && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            {payload.message}
          </div>
        )}

        {hasNoMatchData && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
            Saved IPL data has the points table but no match results or fixtures. Reload from website to refresh the saved data.
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-6">
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">
              <TrophyIcon className="h-4 w-4" />
              Standings Rows
              <SourceLink url={pointsSourceUrl} />
            </div>
            <div className="mt-2 text-3xl font-bold">{standings.length}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">
              <UserGroupIcon className="h-4 w-4" />
              Teams
              <SourceLink url={squadsSourceUrl} />
            </div>
            <div className="mt-2 text-3xl font-bold">{teams.length}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">Leader <SourceLink url={pointsSourceUrl} /></div>
            <div className="mt-2 truncate text-lg font-bold">{leader?.team || 'No standings yet'}</div>
            <div className="text-xs text-slate-500">{leader ? `${leader.points} points` : 'Waiting on source data'}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">Results <SourceLink url={resultsSourceUrl} /></div>
            <div className="mt-2 text-3xl font-bold">{results.length}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">Upcoming <SourceLink url={fixturesSourceUrl} /></div>
            <div className="mt-2 text-3xl font-bold">{upcoming.length}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">Captains <SourceLink url={squadsSourceUrl} /></div>
            <div className="mt-2 text-3xl font-bold">{captains.filter(team => team.captain).length}</div>
          </div>
        </div>

        {overview.length > 0 && (
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex flex-wrap items-center gap-2 text-lg font-bold">
                IPL 2026 at a Glance <SourceLink url={fixturesSourceUrl} />
              </h2>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">TheTopBookies</span>
            </div>
            <div className="overflow-hidden rounded-md border border-slate-200">
              <div className="grid divide-y divide-slate-100 text-sm sm:grid-cols-2 sm:divide-x sm:divide-y-0">
                {overview.map(row => (
                  <div key={row.label} className="grid grid-cols-[minmax(120px,0.9fr)_1fr]">
                    <div className="border-b border-slate-100 bg-slate-50 px-3 py-2 font-semibold text-slate-500">{row.label}</div>
                    <div className="border-b border-slate-100 px-3 py-2 font-bold text-slate-900">{row.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex flex-wrap items-center gap-2 text-lg font-bold">Points Table <SourceLink url={pointsSourceUrl} /></h2>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{standings.length} row{standings.length === 1 ? '' : 's'}</span>
          </div>
          {standings.length > 0 ? (
            <div className="overflow-hidden rounded-md border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="w-16 px-3 py-2">Pos</th>
                    <th className="px-3 py-2">Team</th>
                    <th className="w-16 px-3 py-2 text-right">P</th>
                    <th className="w-16 px-3 py-2 text-right">W</th>
                    <th className="w-16 px-3 py-2 text-right">L</th>
                    <th className="w-20 px-3 py-2 text-right">Pts</th>
                    <th className="w-24 px-3 py-2 text-right">NRR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {standings.map((row, index) => (
                    <tr
                      key={`${row.team}-${index}`}
                      onClick={() => selectTeam(row.team)}
                      onMouseEnter={() => setHoveredTeam(row.team)}
                      onMouseLeave={() => setHoveredTeam('')}
                      className={`${isTeamHighlighted(row.team) ? 'bg-blue-100' : index === 0 ? 'bg-blue-50' : 'hover:bg-slate-50'} cursor-pointer transition-colors`}
                    >
                      <td className="px-3 py-2 font-bold text-slate-500">{row.position || index + 1}</td>
                      <td className="px-3 py-2 font-semibold text-slate-900">{row.team}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{row.played}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{row.won}</td>
                      <td className="px-3 py-2 text-right text-slate-700">{row.lost}</td>
                      <td className="px-3 py-2 text-right font-bold text-slate-900">{row.points}</td>
                      <td className="px-3 py-2 text-right font-medium text-slate-600">{row.netRunRate || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
              The official IPL page did not expose standings rows in the fetched HTML. Reload later to refresh the saved data.
            </div>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex flex-wrap items-center gap-2 text-lg font-bold">Teams <SourceLink url={squadsSourceUrl} /></h2>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{teams.length} team{teams.length === 1 ? '' : 's'}</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {teams.map(team => (
              <div
                key={team.name}
                role="button"
                tabIndex={0}
                onClick={() => selectTeam(team.fullName || team.name)}
                onKeyDown={event => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    selectTeam(team.fullName || team.name);
                  }
                }}
                className={`cursor-pointer rounded-md border px-3 py-2 text-sm font-semibold text-blue-700 transition-colors ${isTeamHighlighted(team.fullName || team.name) ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-100' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
              >
                <span className="flex flex-wrap items-center gap-2">{team.fullName || team.name} <SourceLink url={squadsSourceUrl} /></span>
                {team.captain && <span className="mt-1 block text-xs font-medium text-slate-500">Captain: {team.captain}</span>}
              </div>
            ))}
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-2">
          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex flex-wrap items-center gap-2 text-lg font-bold">Results <SourceLink url={resultsSourceUrl} /></h2>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{results.length} match{results.length === 1 ? '' : 'es'}</span>
            </div>
            <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
              {results.map(match => (
                <div
                  key={match.id}
                  onMouseEnter={event => handleResultMouseEnter(match, event)}
                  onMouseLeave={handleResultMouseLeave}
                  className={`cursor-help rounded-md border p-3 transition-colors ${isMatchHighlighted(match) ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-100' : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Match {match.matchNumber}</div>
                    <div className="text-xs font-semibold text-slate-500">{formatMatchDateWithAge(match.startDate)}</div>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 font-semibold text-slate-900">
                    {getMatchDisplayTitle(match)}
                    <SourceLink url={resultsSourceUrl} />
                  </div>
                  <div className="mt-1 text-sm text-slate-500">{match.venue}</div>
                  <div className="mt-2 rounded-md bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800">{match.result || match.status}</div>
                </div>
              ))}
              {results.length === 0 && (
                <div className="rounded-md border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                  No completed results found in the saved data.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex flex-wrap items-center gap-2 text-lg font-bold">Upcoming Fixtures <SourceLink url={fixturesSourceUrl} /></h2>
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{upcoming.length} match{upcoming.length === 1 ? '' : 'es'}</span>
            </div>
            <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
              {upcoming.map(match => (
                <div key={match.id} className={`rounded-md border p-3 transition-colors ${isMatchHighlighted(match) ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-100' : 'border-slate-200 bg-white'}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs font-bold uppercase tracking-wide text-slate-400">Match {match.matchNumber}</div>
                    <div className="text-xs font-semibold text-slate-500">{formatMatchDateWithAge(match.startDate, true)}</div>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 font-semibold text-slate-900">
                    {match.teamA} vs {match.teamB}
                    <SourceLink url={fixturesSourceUrl} />
                  </div>
                  <div className="mt-1 text-sm text-slate-500">{match.venue}</div>
                </div>
              ))}
              {upcoming.length === 0 && (
                <div className="rounded-md border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                  No upcoming fixtures found in the saved data.
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex flex-wrap items-center gap-2 text-lg font-bold">Captains & Full Squads <SourceLink url={squadsSourceUrl} /></h2>
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{squads.length} squad{squads.length === 1 ? '' : 's'}</span>
          </div>
          {squads.length > 0 ? (
            <div className="grid gap-3 lg:grid-cols-2">
              {squads.map((team) => {
                const sourceUrl = team.sourceUrl || payload?.squadsSourceUrl || 'https://www.ipl2026hub.com/blog/ipl-2026-teams-squads';
                return (
                <div
                  key={team.name}
                  role="button"
                  tabIndex={0}
                  onClick={() => selectTeam(team.name)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      selectTeam(team.name);
                    }
                  }}
                  className={`cursor-pointer rounded-md border p-3 transition-colors ${isTeamHighlighted(team.name) ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-100' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 font-bold text-slate-900">{team.name} <SourceLink url={sourceUrl} /></div>
                      <div className="mt-1 text-sm font-semibold text-blue-700">Captain: {team.captain || 'Not listed'}</div>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <div className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">
                        {(team.players || []).length} players
                      </div>
                    </div>
                  </div>
                  {team.homeGround && <div className="mt-2 text-sm text-slate-500">{team.homeGround}</div>}
                  <div className="mt-3 max-h-72 overflow-y-auto rounded-md border border-slate-100 bg-slate-50">
                    <div className="divide-y divide-slate-100">
                      {((team.playerDetails || []).length > 0 ? team.playerDetails : (team.players || []).map(player => ({
                        name: player,
                        isCaptain: player === team.captain,
                        isWicketKeeper: (team.wicketKeepers || []).includes(player),
                      }))).map(player => (
                        <div
                          key={`${team.name}-${player.name}`}
                          onClick={event => event.stopPropagation()}
                          onMouseEnter={event => handlePlayerMouseEnter(player.name, event)}
                          onMouseLeave={handlePlayerMouseLeave}
                          className="flex cursor-help items-center justify-between gap-3 bg-white px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-800"
                        >
                          <span className="font-medium">
                            {player.name}
                            {player.isCaptain && <span className="ml-1 text-xs font-bold text-blue-700">(c)</span>}
                            {player.isWicketKeeper && <span className="ml-1 text-xs font-bold text-emerald-700">(WK)</span>}
                          </span>
                          {(() => {
                            const age = getAgeInYears(playerBirthDates[player.name]?.birthDate);
                            return age === null ? null : (
                              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">
                                {age}
                              </span>
                            );
                          })()}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-md border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
              No squad list found in the saved data. Reload from website to refresh captains and squads.
            </div>
          )}
        </section>
      </div>
      {activePlayer && playerPopupPosition && (
        <div
          onMouseEnter={clearPlayerHoverTimer}
          onMouseLeave={closePlayerPopup}
          className="fixed z-50 w-[480px] max-w-[calc(100vw-24px)] rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-xl"
          style={{ top: playerPopupPosition.top, left: playerPopupPosition.left }}
        >
          {activeProfile?.status === 'loading' && (
            <div className="text-sm font-semibold text-slate-500">Loading {activePlayer}...</div>
          )}
          {activeProfile?.status === 'error' && (
            <div>
              <div className="font-bold text-slate-900">{activePlayer}</div>
              <div className="mt-2 text-sm text-red-600">{playerProfileError || 'Wikipedia profile was not available.'}</div>
            </div>
          )}
          {activeProfile?.status === 'loaded' && (
            <div>
              <div className="flex gap-4">
                {activeProfile.data.imageUrl && (
                  <img src={activeProfile.data.imageUrl} alt="" className="h-40 w-36 shrink-0 rounded-md object-cover" />
                )}
                <div className="min-w-0">
                  <a href={activeProfile.data.pageUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-blue-700 hover:text-blue-900">
                    {activeProfile.data.title || activePlayer}
                  </a>
                  {activeProfile.data.description && <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{activeProfile.data.description}</div>}
                  <a href={activeProfile.data.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block rounded-full border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700">
                    {activeProfile.data.sourceName || 'wikipedia.org'}
                  </a>
                </div>
              </div>
              {activeProfile.data.extract && (
                <p className="mt-3 max-h-20 overflow-hidden text-sm leading-5 text-slate-600">{activeProfile.data.extract}</p>
              )}
              {activeProfile.data.infobox && Object.keys(activeProfile.data.infobox).length > 0 && (
                <div className="mt-3 grid gap-1 border-t border-slate-100 pt-3">
                  {Object.entries(activeProfile.data.infobox).map(([label, value]) => (
                    <div key={label} className="grid grid-cols-[88px_1fr] gap-2 text-xs">
                      <span className="font-bold text-slate-400">{label}</span>
                      <span className="text-slate-700">{value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {activeScorecardMatch && scorecardPopupPosition && (
        <div
          onMouseEnter={clearScorecardHoverTimer}
          onMouseLeave={closeScorecardPopup}
          className="fixed z-40 max-h-[calc(100vh-24px)] w-[760px] max-w-[calc(100vw-24px)] overflow-y-auto rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-xl"
          style={{ top: scorecardPopupPosition.top, left: scorecardPopupPosition.left }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
                Match {activeScorecardMatch.matchNumber}
              </div>
              <div className="mt-1 font-bold text-slate-900">{getMatchDisplayTitle(activeScorecardMatch)}</div>
            </div>
            <SourceLink url={activeScorecardMatch.scorecard?.sourceUrl || activeScorecardMatch.scorecardUrl || resultsSourceUrl} />
          </div>
          <div className="mt-2 text-xs font-semibold text-slate-500">
            {formatMatchDateWithAge(activeScorecardMatch.startDate)}
            {activeScorecardMatch.venue ? ` - ${activeScorecardMatch.venue}` : ''}
          </div>
          {hasFullScorecard(activeScorecardMatch) ? (
            <div className="mt-3 space-y-4">
              {activeScorecardMatch.scorecard.innings.map((innings, inningsIndex) => (
                <div key={`${innings.team}-${inningsIndex}`} className="overflow-hidden rounded-md border border-slate-200">
                  <div className="flex items-center justify-between gap-3 bg-slate-50 px-3 py-2">
                    <div className="font-bold text-slate-900">{innings.team || `Innings ${inningsIndex + 1}`}</div>
                    {innings.total && <div className="text-sm font-bold text-blue-700">{innings.total}</div>}
                  </div>
                  {(innings.batters || []).length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-xs">
                        <thead className="bg-white text-left font-bold uppercase tracking-wide text-slate-400">
                          <tr>
                            <th className="px-3 py-2">Batter</th>
                            <th className="px-3 py-2">How out</th>
                            <th className="px-2 py-2 text-right">R</th>
                            <th className="px-2 py-2 text-right">B</th>
                            <th className="px-2 py-2 text-right">4s</th>
                            <th className="px-2 py-2 text-right">6s</th>
                            <th className="px-2 py-2 text-right">SR</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {innings.batters.map(player => (
                            <tr key={`${innings.team}-${player.name}`} className="bg-white">
                              <td className="px-3 py-2 font-semibold text-slate-800">{player.name}</td>
                              <td className="max-w-[240px] px-3 py-2 text-slate-500">{player.dismissal || '-'}</td>
                              <td className="px-2 py-2 text-right font-bold text-slate-900">{player.runs || '-'}</td>
                              <td className="px-2 py-2 text-right text-slate-600">{player.balls || '-'}</td>
                              <td className="px-2 py-2 text-right text-slate-600">{player.fours || '-'}</td>
                              <td className="px-2 py-2 text-right text-slate-600">{player.sixes || '-'}</td>
                              <td className="px-2 py-2 text-right text-slate-600">{player.strikeRate || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {(innings.bowlers || []).length > 0 && (
                    <div className="overflow-x-auto border-t border-slate-100">
                      <table className="min-w-full text-xs">
                        <thead className="bg-slate-50 text-left font-bold uppercase tracking-wide text-slate-400">
                          <tr>
                            <th className="px-3 py-2">Bowler</th>
                            <th className="px-2 py-2 text-right">O</th>
                            <th className="px-2 py-2 text-right">M</th>
                            <th className="px-2 py-2 text-right">R</th>
                            <th className="px-2 py-2 text-right">W</th>
                            <th className="px-2 py-2 text-right">Econ</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {innings.bowlers.map(player => (
                            <tr key={`${innings.team}-${player.name}`} className="bg-white">
                              <td className="px-3 py-2 font-semibold text-slate-800">{player.name}</td>
                              <td className="px-2 py-2 text-right text-slate-600">{player.overs || '-'}</td>
                              <td className="px-2 py-2 text-right text-slate-600">{player.maidens || '-'}</td>
                              <td className="px-2 py-2 text-right text-slate-600">{player.runs || '-'}</td>
                              <td className="px-2 py-2 text-right font-bold text-slate-900">{player.wickets || '-'}</td>
                              <td className="px-2 py-2 text-right text-slate-600">{player.economy || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-3 overflow-hidden rounded-md border border-slate-100">
              {getMatchScoreRows(activeScorecardMatch).map(row => (
                <div key={row.id} className="grid grid-cols-[1fr_auto] gap-3 border-b border-slate-100 px-3 py-2 last:border-b-0">
                  <div className="min-w-0 font-semibold text-slate-700">{row.team}</div>
                  {(row.score || row.overs) && (
                    <div className="text-right">
                      {row.score && <div className="font-bold text-slate-900">{row.score}</div>}
                      {row.overs && <div className="text-xs font-semibold text-slate-400">{row.overs}</div>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          {activeScorecardMatch.result && (
            <div className="mt-3 rounded-md bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800">
              {activeScorecardMatch.result}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default IPLPage;
