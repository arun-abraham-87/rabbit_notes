const express = require('express');

const router = express.Router();

const IPL_POINTS_TABLE_URL = 'https://www.moneycontrol.com/sports/cricket/ipl/points-table/';
const IPL_SCHEDULE_URL = 'https://www.thetopbookies.com/cricket-news/ipl-2026-schedule';
const IPL_RESULTS_URL = 'https://www.moneycontrol.com/sports/cricket/ipl/results/';
const IPL_SQUADS_URL = 'https://www.ipl2026hub.com/blog/ipl-2026-teams-squads';
const WIKIPEDIA_QUERY_API_URL = 'https://en.wikipedia.org/w/api.php';
const WIKIDATA_API_URL = 'https://www.wikidata.org/w/api.php';
const KNOWN_TEAMS = [
  'Chennai Super Kings',
  'Mumbai Indians',
  'Royal Challengers Bengaluru',
  'Kolkata Knight Riders',
  'Delhi Capitals',
  'Punjab Kings',
  'Rajasthan Royals',
  'Sunrisers Hyderabad',
  'Gujarat Titans',
  'Lucknow Super Giants',
];
const WICKET_KEEPERS_BY_TEAM = {
  'Chennai Super Kings': ['MS Dhoni', 'Sanju Samson', 'Urvil Patel'],
  'Mumbai Indians': ['Robin Minz', 'Ryan Rickelton', 'Quinton de Kock'],
  'Royal Challengers Bengaluru': ['Phil Salt', 'Jitesh Sharma', 'Jordan Cox'],
  'Kolkata Knight Riders': ['Finn Allen', 'Tim Seifert'],
  'Delhi Capitals': ['KL Rahul', 'Abishek Porel', 'Tristan Stubbs'],
  'Punjab Kings': ['Prabhsimran Singh', 'Vishnu Vinod'],
  'Rajasthan Royals': ['Dhruv Jurel', 'Donovan Ferreira'],
  'Sunrisers Hyderabad': ['Heinrich Klaasen', 'Ishan Kishan'],
  'Gujarat Titans': ['Jos Buttler', 'Anuj Rawat', 'Glenn Phillips', 'Kumar Kushagra'],
  'Lucknow Super Giants': ['Rishabh Pant', 'Josh Inglis'],
};

const decodeHtml = (value = '') => String(value)
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#x27;/g, "'")
  .replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&nbsp;/g, ' ');

const cleanText = (value = '') => decodeHtml(value)
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const toAbsoluteUrl = (url = '', baseUrl = IPL_RESULTS_URL) => {
  try {
    return new URL(decodeHtml(url), baseUrl).toString();
  } catch (error) {
    return '';
  }
};

const fetchHtml = async (url) => {
  const response = await fetch(url, {
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'user-agent': 'rabbit-notes-ipl/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`IPL source returned ${response.status} for ${url}`);
  }

  return response.text();
};

const fetchJson = async (url) => {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      'user-agent': 'rabbit-notes-ipl/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Wikipedia returned ${response.status}`);
  }

  return response.json();
};

const normalizeWikidataBirthDate = (value = '') => {
  const match = String(value).match(/^\+?(\d{4})-(\d{2})-(\d{2})T/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : '';
};

const findWikipediaPlayerTitle = async (player) => {
  const searchUrl = `${WIKIPEDIA_QUERY_API_URL}?action=query&list=search&srsearch=${encodeURIComponent(`${player} cricketer`)}&format=json&srlimit=1`;
  const search = await fetchJson(searchUrl);
  return search?.query?.search?.[0]?.title || player;
};

const fetchPlayerBirthDate = async (player) => {
  const title = await findWikipediaPlayerTitle(player);
  const pageData = await fetchJson(`${WIKIPEDIA_QUERY_API_URL}?action=query&format=json&prop=pageprops&titles=${encodeURIComponent(title)}&redirects=1`);
  const page = Object.values(pageData?.query?.pages || {})[0];
  const wikidataId = page?.pageprops?.wikibase_item;
  if (!wikidataId) {
    const error = new Error(`No Wikidata item found for ${player}`);
    error.status = 404;
    throw error;
  }

  const entityData = await fetchJson(`${WIKIDATA_API_URL}?action=wbgetentities&format=json&props=claims&ids=${encodeURIComponent(wikidataId)}`);
  const birthTime = entityData?.entities?.[wikidataId]?.claims?.P569?.[0]?.mainsnak?.datavalue?.value?.time;
  const birthDate = normalizeWikidataBirthDate(birthTime);
  if (!birthDate) {
    const error = new Error(`No birth date found for ${player}`);
    error.status = 404;
    throw error;
  }

  return {
    name: player,
    title: page?.title || title,
    birthDate,
    birthYear: birthDate.slice(0, 4),
    wikidataId,
    wikipediaUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent((page?.title || title).replace(/\s+/g, '_'))}`,
    source: 'Wikipedia/Wikidata',
  };
};

const parseTableRows = (html) => (
  Array.from(html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi))
    .map(rowMatch => (
      Array.from(rowMatch[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi))
        .map(match => cleanText(match[1]))
        .filter(Boolean)
    ))
    .filter(cells => cells.length >= 7)
);

const parseHtmlTables = (html) => (
  Array.from(html.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi))
    .map(tableMatch => (
      Array.from(tableMatch[1].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi))
        .map(rowMatch => (
          Array.from(rowMatch[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi))
            .map(match => cleanText(match[1]))
            .filter(Boolean)
        ))
        .filter(cells => cells.length > 0)
    ))
    .filter(rows => rows.length > 0)
);

const normalizeTeamName = (team = '') => team
  .replace(/\s+/g, ' ')
  .trim();

const toIplDate = (dateText, timeText) => {
  const parsed = new Date(`${dateText} ${timeText} GMT+0530`);
  return Number.isNaN(parsed.getTime()) ? `${dateText} ${timeText}` : parsed.toISOString();
};

const toIplNumericDate = (dateText, timeText) => {
  const match = dateText.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return `${dateText} ${timeText}`;
  const [, day, month, year] = match;
  const parsed = new Date(`${year}-${month}-${day}T${timeText}:00+05:30`);
  return Number.isNaN(parsed.getTime()) ? `${dateText} ${timeText}` : parsed.toISOString();
};

const findKnownTeam = (value = '') => KNOWN_TEAMS.find(team => value.includes(team)) || '';

const splitTeams = (title = '') => {
  const [teamA = '', teamB = ''] = title.split(/\s+v(?:s|\.)?\s+/i);
  return [teamA.trim(), teamB.trim()];
};

const parseStandings = (html) => {
  const tableRows = parseTableRows(html)
    .map((cells) => {
      const position = /^\d+$/.test(cells[0]) ? Number(cells[0]) : null;
      const offset = position === null ? 0 : 1;
      const team = normalizeTeamName(cells[offset]);
      const played = Number(cells[offset + 1]);
      const won = Number(cells[offset + 2]);
      const lost = Number(cells[offset + 3]);
      const tied = Number(cells[offset + 4]) || 0;
      const noResult = Number(cells[offset + 5]) || 0;
      const points = Number(cells[offset + 6]);
      const netRunRate = cells.find(cell => /^[+-]\d+(\.\d+)?$/.test(cell)) || cells[offset + 7] || '';

      if (!team || Number.isNaN(played) || Number.isNaN(won) || Number.isNaN(points)) return null;
      return {
        position,
        team,
        played,
        won,
        lost,
        tied,
        noResult,
        points,
        netRunRate,
        raw: cells,
      };
    })
    .filter(Boolean);

  if (tableRows.length > 0) return tableRows;

  const text = cleanText(html);
  const section = text.split('IPL 2026 Points Table').pop()?.split('IPL 2026 Stats')[0] || text;
  const rowPattern = /(\d{1,2})\s+([A-Z]{2,5})\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+([+-]\d+\.\d+)\s+(\d+)/g;
  return Array.from(section.matchAll(rowPattern)).map(match => ({
    position: Number(match[1]),
    team: match[2],
    played: Number(match[3]),
    won: Number(match[4]),
    drawn: Number(match[5]),
    noResult: Number(match[6]),
    lost: Number(match[7]),
    netRunRate: match[8],
    points: Number(match[9]),
    raw: match.slice(1),
  }));
};

const parseMatches = (html, defaultCompleted = false) => {
  const text = cleanText(html);
  const seen = new Set();
  const blocks = Array.from(text.matchAll(/Recent\s+(.+?)(?=\s+Full Scorecard\b)/gi)).map(match => match[1].trim());
  const blockMatches = blocks.map((block) => {
    const header = block.match(/^(.+?)\s+Match\s+(\d+),\s*Indian Premier League,\s*2026\b/i);
    const dates = Array.from(block.matchAll(/2026-\d{2}-\d{2}T\d{2}:\d{2}\+05:30/g)).map(match => match[0]);
    if (!header || dates.length === 0) return null;

    const title = header[1].trim();
    const matchNumber = Number(header[2]);
    const [teamA, teamB] = title.split(/\s+vs\s+/);
    const lastDateIndex = block.lastIndexOf(dates[dates.length - 1]);
    const afterDates = block.slice(lastDateIndex + dates[dates.length - 1].length).trim();
    const detailMatch = afterDates.match(/^(.*?)\s+Match\s+\d+,\s+Indian Premier League,\s+2026\s+(.+)$/i);
    const venue = detailMatch ? detailMatch[1].trim() : '';
    const details = detailMatch ? detailMatch[2].trim() : afterDates;
    const isAbandoned = /Match Abandoned/i.test(details);
    const isCompleted = defaultCompleted || /Match Ended/i.test(details) || /\bbeat\b|\btied with\b/i.test(details);
    const result = details
      .replace(/^Match Ended\s+/i, '')
      .replace(/^Match Abandoned\s+/i, 'Match Abandoned ')
      .trim();
    const key = `${matchNumber}-${dates[0]}`;
    if (seen.has(key)) return null;
    seen.add(key);

    return {
      id: key,
      matchNumber,
      title,
      teamA: teamA?.trim() || '',
      teamB: teamB?.trim() || '',
      startDate: dates[0],
      venue,
      status: isAbandoned ? 'abandoned' : isCompleted ? 'completed' : 'upcoming',
      result: isCompleted || isAbandoned ? result : '',
    };
  }).filter(Boolean);

  if (blockMatches.length > 0) {
    return blockMatches.sort((a, b) => a.matchNumber - b.matchNumber);
  }

  const chunks = text.split(/\bRecent\s+/).slice(1);

  return chunks.map((chunk) => {
    const matchNumber = chunk.match(/\bMatch\s+(\d+),Indian Premier League, 2026\b/)?.[1]
      || chunk.match(/\bMatch\s+(\d+), Indian Premier League, 2026\b/)?.[1];
    const title = chunk.match(/^(.+?)\s+Match\s+\d+,Indian Premier League, 2026/)?.[1]
      || chunk.match(/^(.+?)\s+Match\s+\d+, Indian Premier League, 2026/)?.[1];
    const dates = Array.from(chunk.matchAll(/2026-\d{2}-\d{2}T\d{2}:\d{2}\+05:30/g)).map(match => match[0]);
    if (!matchNumber || !title || dates.length === 0) return null;

    const [teamA, teamB] = title.split(/\s+vs\s+/);
    let lastDateIndex = -1;
    dates.forEach((date) => {
      lastDateIndex = chunk.indexOf(date, lastDateIndex + 1);
    });
    const afterDates = chunk.slice(lastDateIndex + dates[dates.length - 1].length).trim();
    const beforeScorecard = afterDates.split(/\s+Full Scorecard\b/i)[0].trim();
    const venueMatch = beforeScorecard.match(/^(.+?)\s+Match\s+\d+,\s+Indian Premier League,\s+2026\s+(.+)$/i);
    const venue = venueMatch ? venueMatch[1].trim() : '';
    const details = venueMatch ? venueMatch[2].trim() : beforeScorecard;
    const status = /Match Ended/i.test(details) || defaultCompleted || /\bbeat\b|\btied with\b/i.test(details)
      ? 'completed'
      : /Match Abandoned/i.test(details)
        ? 'abandoned'
        : 'upcoming';
    const result = status === 'completed'
      ? details.replace(/^Match Ended\s+/i, '').trim()
      : status === 'abandoned'
        ? 'Match Abandoned'
        : '';
    const startDate = dates[0];
    const key = `${matchNumber}-${startDate}`;
    if (seen.has(key)) return null;
    seen.add(key);

    return {
      id: key,
      matchNumber: Number(matchNumber),
      title: title.trim(),
      teamA: teamA?.trim() || '',
      teamB: teamB?.trim() || '',
      startDate,
      venue,
      status,
      result,
    };
  }).filter(Boolean).sort((a, b) => a.matchNumber - b.matchNumber);
};

const parseMoneycontrolResults = (html) => {
  const text = cleanText(html);
  const section = text.split('IPL 2026 RESULTS').pop()?.split('IPL 2026')[0] || text;
  const chunks = section.split(/\bMatch\s+(?=\d+\s)/).slice(1);
  const scorecardUrls = Array.from(html.matchAll(/href=["']([^"']*\/news\/cricket\/live-cricket-scorecard\/[^"']+)["']/gi))
    .map(match => toAbsoluteUrl(match[1]))
    .filter(Boolean);
  const seen = new Set();

  return chunks.map((chunk, index) => {
    const match = chunk.match(/^(\d+)\s+(.+?)\s+(\d{1,2}\s+[A-Za-z]{3}\s+2026)\s+(\d{2}:\d{2}\s+(?:am|pm))\s+(.+?)(?=\s+Match\s+\d+\s+|\s+view more\b|\s+Advertisement\b|$)/i);
    if (!match) return null;

    const matchNumber = Number(match[1]);
    const venue = match[2].trim();
    const dateText = match[3];
    const timeText = match[4];
    const details = match[5].trim();
    const resultMatch = details.match(/([A-Z][A-Za-z ]+?\s+(?:beat|tied with)\s+.+)$/);
    const result = resultMatch ? resultMatch[1].trim() : details;
    const key = `${matchNumber}-${dateText}`;
    if (seen.has(key)) return null;
    seen.add(key);

    return {
      id: key,
      matchNumber,
      title: result,
      teamA: '',
      teamB: '',
      startDate: toIplDate(dateText, timeText),
      venue,
      status: /tied with/i.test(result) ? 'completed' : 'completed',
      result,
      scorecardUrl: scorecardUrls[index] || '',
    };
  }).filter(Boolean).sort((a, b) => a.matchNumber - b.matchNumber);
};

const isBattingHeader = cells => cells.some(cell => /^(batter|batsman|batting)$/i.test(cell))
  && cells.some(cell => /^r(?:uns)?$/i.test(cell))
  && cells.some(cell => /^b(?:alls)?$/i.test(cell));

const isBowlingHeader = cells => cells.some(cell => /^bowler|bowling$/i.test(cell))
  && cells.some(cell => /^o(?:vers)?$/i.test(cell))
  && cells.some(cell => /^w(?:ickets)?$/i.test(cell));

const compactScoreRow = row => row.filter(Boolean).map(cell => cell.replace(/\s+/g, ' ').trim());

const parseBattingRows = (rows, headerIndex) => rows.slice(headerIndex + 1)
  .map(compactScoreRow)
  .filter(row => row.length >= 3)
  .map((row) => {
    const name = row[0];
    if (!name || /^(extras|fall of wickets)$/i.test(name)) return null;
    if (/^total$/i.test(name)) {
      return {
        type: 'total',
        name: 'Total',
        runs: row[1] || row[row.length - 1] || '',
      };
    }

    return {
      type: 'batting',
      name,
      dismissal: row.slice(1, -5).join(' '),
      runs: row[row.length - 5] || '',
      balls: row[row.length - 4] || '',
      fours: row[row.length - 3] || '',
      sixes: row[row.length - 2] || '',
      strikeRate: row[row.length - 1] || '',
    };
  })
  .filter(Boolean);

const parseBowlingRows = (rows, headerIndex) => rows.slice(headerIndex + 1)
  .map(compactScoreRow)
  .filter(row => row.length >= 5 && !/^total$/i.test(row[0]))
  .map((row) => {
    const stats = row.slice(1);
    return {
      name: row[0],
      overs: stats[0] || '',
      maidens: stats[1] || '',
      runs: stats[2] || '',
      wickets: stats[3] || '',
      economy: stats.length >= 5 ? stats[stats.length - 1] : '',
    };
  })
  .filter(row => row.name && /\d/.test(`${row.overs}${row.runs}${row.wickets}`));

const parseMoneycontrolScorecard = (html, scorecardUrl = '') => {
  const tables = parseHtmlTables(html);
  const innings = [];

  tables.forEach((rows, tableIndex) => {
    const battingHeaderIndex = rows.findIndex(isBattingHeader);
    if (battingHeaderIndex === -1) return;

    const bowlingTable = tables.slice(tableIndex + 1).find(nextRows => nextRows.findIndex(isBowlingHeader) !== -1);
    const bowlingHeaderIndex = bowlingTable ? bowlingTable.findIndex(isBowlingHeader) : -1;
    const batters = parseBattingRows(rows, battingHeaderIndex);
    const bowlers = bowlingTable && bowlingHeaderIndex !== -1 ? parseBowlingRows(bowlingTable, bowlingHeaderIndex) : [];
    const total = batters.find(row => row.type === 'total')?.runs || '';
    const battingRows = batters.filter(row => row.type === 'batting');

    if (battingRows.length === 0 && bowlers.length === 0) return;

    innings.push({
      team: rows.slice(0, battingHeaderIndex).flat().find(cell => /innings/i.test(cell)) || `Innings ${innings.length + 1}`,
      total,
      batters: battingRows,
      bowlers,
    });
  });

  return {
    sourceUrl: scorecardUrl,
    innings,
  };
};

const attachScorecards = async (matches) => Promise.all(matches.map(async (match) => {
  if (!match.scorecardUrl) return match;

  try {
    const html = await fetchHtml(match.scorecardUrl);
    return {
      ...match,
      scorecard: parseMoneycontrolScorecard(html, match.scorecardUrl),
    };
  } catch (error) {
    return {
      ...match,
      scorecard: {
        sourceUrl: match.scorecardUrl,
        error: error.message || 'Failed to fetch scorecard',
      },
    };
  }
}));

const parseMoneycontrolSchedule = (html) => {
  const text = cleanText(html);
  const section = text.split('IPL schedule 2026').pop()?.split('view more')[0] || text;
  const chunks = section.split(/\bMatch\s+(?=\d+\s)/).slice(1);
  const seen = new Set();

  return chunks.map((chunk) => {
    const match = chunk.match(/^(\d+)\s+(.+?)\s+(\d{1,2}\s+[A-Za-z]{3}\s+2026)\s+(\d{2}:\d{2}\s+(?:am|pm))\s+(.+?)(?=\s+Match\s+\d+\s+|\s+Advertisement\b|\s+view more\b|$)/i);
    if (!match) return null;

    const matchNumber = Number(match[1]);
    const venue = match[2].trim();
    const dateText = match[3];
    const timeText = match[4];
    const title = match[5].replace(/\s+/g, ' ').trim();
    const [teamA, teamB] = splitTeams(title);
    const key = `${matchNumber}-${dateText}`;
    if (seen.has(key)) return null;
    seen.add(key);

    return {
      id: key,
      matchNumber,
      title,
      teamA,
      teamB,
      startDate: toIplDate(dateText, timeText),
      venue,
      status: 'upcoming',
      result: '',
    };
  }).filter(Boolean).sort((a, b) => a.matchNumber - b.matchNumber);
};

const parseTopBookiesSchedule = (html) => {
  const text = cleanText(html);
  const section = text.split('IPL Match Schedule 2026').pop()?.split('IPL 2026 Teams & Groups')[0] || text;
  const rowPattern = /(\d{2}\.\d{2}\.\d{4})\s+(\d{2}:\d{2})\s+(.+?)\s+(\d+)(?:st|nd|rd|th)\s+t20\s+(.+?)(?=\s+\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}\s+|$)/gi;
  const seen = new Set();

  return Array.from(section.matchAll(rowPattern)).map((match) => {
    const dateText = match[1];
    const timeText = match[2];
    const title = match[3].replace(/\s+/g, ' ').trim();
    const matchNumber = Number(match[4]);
    const venue = match[5].replace(/\s+/g, ' ').trim();
    const [teamA, teamB] = splitTeams(title);
    const key = `${matchNumber}-${dateText}`;
    if (seen.has(key)) return null;
    seen.add(key);

    return {
      id: key,
      matchNumber,
      title,
      teamA,
      teamB,
      startDate: toIplNumericDate(dateText, timeText),
      venue,
      status: 'upcoming',
      result: '',
    };
  }).filter(Boolean).sort((a, b) => a.matchNumber - b.matchNumber);
};

const parseTopBookiesOverview = (html) => {
  const tableMatch = html.match(/IPL 2026 at a Glance[\s\S]*?<table\b[^>]*>([\s\S]*?)<\/table>/i);
  if (tableMatch) {
    const rows = parseHtmlTables(`<table>${tableMatch[1]}</table>`)[0]
      ?.map(cells => ({
        label: cells[0] || '',
        value: cells.slice(1).join(' ') || '',
      }))
      .filter(row => row.label && row.value) || [];
    if (rows.length > 0) return rows;
  }

  const text = cleanText(html);
  const section = text.split('IPL 2026 at a Glance').pop()?.split('IPL Match Schedule 2026')[0] || '';
  const labels = [
    'Date Start',
    'Final',
    'Total Matches',
    'Teams',
    'Final Venue',
    'Defending Champions',
    'Title Sponsor',
    'Broadcaster',
  ];

  return labels.map((label, index) => {
    const nextLabels = labels.slice(index + 1).map(nextLabel => nextLabel.replace(/\s+/g, '\\s+')).join('|');
    const valuePattern = nextLabels
      ? new RegExp(`${label.replace(/\s+/g, '\\s+')}\\s+(.+?)(?=\\s+(?:${nextLabels})\\s+|$)`, 'i')
      : new RegExp(`${label.replace(/\s+/g, '\\s+')}\\s+(.+)$`, 'i');
    let value = section.match(valuePattern)?.[1]?.trim() || '';
    value = value
      .split(/\s+The IPL 2026 schedule covers\b/i)[0]
      .split(/\s+IPL 2026 Full Schedule\b/i)[0]
      .trim();
    return value ? { label, value } : null;
  }).filter(Boolean);
};

const parseSquads = (html) => {
  const text = cleanText(html);
  return KNOWN_TEAMS.map((team, index) => {
    const startMatch = text.match(new RegExp(`${team.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+\\([^)]*\\)\\s+[—-]\\s+IPL 2026 Squad`, 'i'));
    const start = startMatch ? startMatch.index : -1;
    if (start === -1) return null;

    const nextStarts = KNOWN_TEAMS.slice(index + 1)
      .map((nextTeam) => {
        const nextMatch = text.slice(start + team.length).match(new RegExp(`${nextTeam.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+\\([^)]*\\)\\s+[—-]\\s+IPL 2026 Squad`, 'i'));
        return nextMatch ? start + team.length + nextMatch.index : -1;
      })
      .filter(nextStart => nextStart !== -1);
    const end = nextStarts.length > 0 ? Math.min(...nextStarts) : text.length;
    const section = text.slice(start, end);
    const captain = section.match(/Captain\s+[—-]\s+(.+?)(?=\s+Home Ground|\s+IPL Titles|\s+Key|\s+Status|\s+Record|\s+Big|\s+Full Squad:|$)/i)?.[1]?.trim() || '';
    const homeGround = section.match(/Home Ground\s+[—-]\s+(.+?)(?=\s+IPL Titles|\s+Key|\s+Status|\s+Record|\s+Big|\s+Full Squad:|$)/i)?.[1]?.trim() || '';
    const squadText = section.match(/Full Squad:\s+(.+?)(?=\s+Why\s+[A-Z]|##\s+|$)/i)?.[1] || '';
    const players = Array.from(new Set(
      squadText
        .replace(/\.$/, '')
        .split(/\s*,\s*/)
        .map(player => player.trim())
        .filter(Boolean)
    ));
    const wicketKeepers = WICKET_KEEPERS_BY_TEAM[team] || [];
    const playerDetails = players.map(player => ({
      name: player,
      isCaptain: player === captain,
      isWicketKeeper: wicketKeepers.includes(player),
    }));

    return {
      name: team,
      captain,
      homeGround,
      players,
      playerDetails,
      wicketKeepers,
      sourceUrl: IPL_SQUADS_URL,
    };
  }).filter(Boolean);
};

const buildIplPayload = async () => {
  const [pointsHtml, scheduleHtml, resultsHtml, squadsHtml] = await Promise.all([
    fetchHtml(IPL_POINTS_TABLE_URL),
    fetchHtml(IPL_SCHEDULE_URL),
    fetchHtml(IPL_RESULTS_URL),
    fetchHtml(IPL_SQUADS_URL),
  ]);
  const standings = parseStandings(pointsHtml);
  const scheduleMatches = parseTopBookiesSchedule(scheduleHtml);
  const overview = parseTopBookiesOverview(scheduleHtml);
  const resultMatches = await attachScorecards(parseMoneycontrolResults(resultsHtml));
  const squads = parseSquads(squadsHtml);
  const squadMap = new Map(squads.map(team => [team.name, team]));
  const resultIds = new Set(resultMatches.map(match => match.id));
  const matches = [
    ...resultMatches,
    ...scheduleMatches.filter(match => !resultIds.has(match.id)),
  ].sort((a, b) => a.matchNumber - b.matchNumber);
  const teams = standings.length > 0
    ? standings.map((row) => {
      const fullName = findKnownTeam(row.team) || row.team;
      const squad = squadMap.get(fullName);
      return {
        name: row.team,
        fullName,
        captain: squad?.captain || '',
        players: squad?.players || [],
        playerDetails: squad?.playerDetails || [],
        wicketKeepers: squad?.wicketKeepers || [],
        homeGround: squad?.homeGround || '',
      };
    })
    : squads.map(team => ({
      name: team.name,
      fullName: team.name,
      captain: team.captain,
      players: team.players,
      playerDetails: team.playerDetails,
      wicketKeepers: team.wicketKeepers,
      homeGround: team.homeGround,
    }));

  return {
    season: 2026,
    parserVersion: 8,
    sourceUrl: IPL_POINTS_TABLE_URL,
    scheduleSourceUrl: IPL_SCHEDULE_URL,
    resultsSourceUrl: IPL_RESULTS_URL,
    squadsSourceUrl: IPL_SQUADS_URL,
    captainsSourceUrl: IPL_SQUADS_URL,
    fetchedAt: new Date().toISOString(),
    overview,
    standings,
    matches,
    results: matches.filter(match => match.status === 'completed' || match.status === 'abandoned'),
    upcoming: matches.filter(match => match.status === 'upcoming'),
    teams,
    squads,
    captains: squads.map(team => ({ name: team.name, captain: team.captain })),
    status: standings.length > 0 ? 'available' : 'pending',
    message: standings.length > 0
      ? 'IPL data loaded from static sports sources.'
      : 'The source did not expose IPL points-table rows in the fetched HTML.',
  };
};

router.get('/points-table', async (req, res) => {
  try {
    res.json(await buildIplPayload());
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to scrape IPL data' });
  }
});

router.get('/player-profile', async (req, res) => {
  try {
    const player = String(req.query.name || '').trim();
    if (!player) {
      res.status(400).json({ error: 'Missing player name' });
      return;
    }

    const title = await findWikipediaPlayerTitle(player);
    const summary = await fetchJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
    const pageHtml = await fetchHtml(`https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`);
    const infobox = {};

    Array.from(pageHtml.matchAll(/<tr[^>]*>\s*<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi))
      .forEach((match) => {
        const label = cleanText(match[1]).replace(/:$/, '');
        const value = cleanText(match[2]);
        if (!label || !value) return;
        if (/^(Born|Batting|Bowling|Role|Height|Nickname|National side)$/i.test(label)) {
          infobox[label] = value;
        }
      });

    res.json({
      name: player,
      title: summary?.title || title,
      description: summary?.description || '',
      extract: summary?.extract || '',
      imageUrl: summary?.thumbnail?.source || summary?.originalimage?.source || '',
      pageUrl: summary?.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
      sourceUrl: 'https://en.wikipedia.org/',
      sourceName: 'wikipedia.org',
      infobox,
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch Wikipedia player profile' });
  }
});

router.get('/player-birthdate', async (req, res) => {
  try {
    const player = String(req.query.name || '').trim();
    if (!player) {
      res.status(400).json({ error: 'Missing player name' });
      return;
    }

    res.json(await fetchPlayerBirthDate(player));
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Failed to fetch Wikipedia player birth date' });
  }
});

module.exports = router;
