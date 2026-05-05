const express = require('express');

const router = express.Router();

const F1_2026_URL = 'https://www.formula1.com/en/racing/2026';
const F1_2026_DRIVERS_URL = 'https://www.formula1.com/en/results/2026/drivers';
const F1_2026_TEAMS_URL = 'https://www.formula1.com/en/results/2026/team';
const F1_2026_RACE_RESULTS_URL = 'https://www.formula1.com/en/results/2026/races';
const WIKIPEDIA_API_URL = 'https://en.wikipedia.org/api/rest_v1/page/summary';
const WIKIPEDIA_QUERY_API_URL = 'https://en.wikipedia.org/w/api.php';
const WIKIDATA_API_URL = 'https://www.wikidata.org/w/api.php';
const driverProfileCache = new Map();
const driverBirthDateCache = new Map();

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

const absoluteUrl = (url = '') => {
  if (!url) return F1_2026_URL;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return `https://www.formula1.com${url}`;
  return new URL(url, F1_2026_URL).toString();
};

const monthNumber = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

const parseDateRange = (dateText = '', year = 2026) => {
  const normalized = cleanText(dateText).replace(/\s+/g, ' ');
  let match = normalized.match(/^(\d{1,2})\s*-\s*(\d{1,2})\s+([A-Za-z]{3})$/i);
  if (match) {
    const startDay = Number(match[1]);
    const endDay = Number(match[2]);
    const month = monthNumber[match[3].toLowerCase()];
    return {
      startDate: new Date(Date.UTC(year, month, startDay)).toISOString().slice(0, 10),
      endDate: new Date(Date.UTC(year, month, endDay)).toISOString().slice(0, 10),
    };
  }

  match = normalized.match(/^(\d{1,2})\s+([A-Za-z]{3})\s*-\s*(\d{1,2})\s+([A-Za-z]{3})$/i);
  if (match) {
    const startDay = Number(match[1]);
    const startMonth = monthNumber[match[2].toLowerCase()];
    const endDay = Number(match[3]);
    const endMonth = monthNumber[match[4].toLowerCase()];
    return {
      startDate: new Date(Date.UTC(year, startMonth, startDay)).toISOString().slice(0, 10),
      endDate: new Date(Date.UTC(year, endMonth, endDay)).toISOString().slice(0, 10),
    };
  }

  return { startDate: '', endDate: '' };
};

const getStatus = (startDate, endDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
  const end = endDate ? new Date(`${endDate}T23:59:59`) : null;
  if (end && end < today) return 'completed';
  if (start && start <= today && end && end >= today) return 'current';
  return 'upcoming';
};

const parseLocation = (locationText = '') => {
  const location = cleanText(locationText.replace(/^Flag of\s+/i, ''));
  const knownLocationMap = [
    { location: 'Barcelona-Catalunya', country: 'Spain' },
    { location: 'Las Vegas', country: 'United States of America' },
    { location: 'Abu Dhabi', country: 'United Arab Emirates' },
    { location: 'Miami', country: 'United States of America' },
    { location: 'Monaco', country: 'Monaco' },
    { location: 'Spielberg', country: 'Austria' },
    { location: 'Silverstone', country: 'Great Britain' },
    { location: 'Spa-Francorchamps', country: 'Belgium' },
    { location: 'Budapest', country: 'Hungary' },
    { location: 'Zandvoort', country: 'Netherlands' },
    { location: 'Monza', country: 'Italy' },
    { location: 'Baku', country: 'Azerbaijan' },
    { location: 'Singapore', country: 'Singapore' },
    { location: 'Austin', country: 'United States of America' },
    { location: 'Mexico City', country: 'Mexico' },
    { location: 'São Paulo', country: 'Brazil' },
    { location: 'Sao Paulo', country: 'Brazil' },
    { location: 'Lusail', country: 'Qatar' },
    { location: 'Melbourne', country: 'Australia' },
    { location: 'Shanghai', country: 'China' },
    { location: 'Suzuka', country: 'Japan' },
    { location: 'Sakhir', country: 'Bahrain' },
    { location: 'Jeddah', country: 'Saudi Arabia' },
    { location: 'Montreal', country: 'Canada' },
    { location: 'Montréal', country: 'Canada' },
    { location: 'Imola', country: 'Italy' },
  ];
  const known = knownLocationMap.find(item => location.endsWith(item.location));
  if (known) return known;

  return { country: location, location };
};

const parseScheduleFromHtml = (html) => {
  const datePattern = '(\\d{1,2}\\s*-\\s*\\d{1,2}\\s+[A-Za-z]{3}|\\d{1,2}\\s+[A-Za-z]{3}\\s*-\\s*\\d{1,2}\\s+[A-Za-z]{3})';
  const anchors = Array.from(html.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi))
    .map(match => ({
      href: match[1],
      text: cleanText(match[2]),
    }))
    .filter(item => /\b(ROUND\s+\d+|TESTING)\b/i.test(item.text) && /FORMULA 1/i.test(item.text) && /2026/.test(item.text));

  const seen = new Set();
  const events = [];

  const addEvent = ({ href, text, type, round, dateText, placeText, name }) => {
    const label = type === 'testing' ? 'TESTING' : `ROUND ${round}`;
    const dates = parseDateRange(dateText);
    const location = parseLocation(placeText);
    const key = `${type}-${round || name}-${dates.startDate}`;
    if (seen.has(key)) return;
    seen.add(key);

    events.push({
      id: key,
      type,
      round,
      label,
      name,
      country: location.country,
      location: location.location,
      dateRange: cleanText(dateText),
      ...dates,
      status: getStatus(dates.startDate, dates.endDate),
      url: absoluteUrl(href),
    });
  };

  anchors.forEach(({ href, text }) => {
    const type = /^TESTING\b/i.test(text) ? 'testing' : 'race';
    const roundMatch = text.match(/^ROUND\s+(\d{1,2}?)(?=\s|\d{1,2}\s*-)/i);
    const round = roundMatch ? Number(roundMatch[1]) : null;

    const dateMatch = text.match(new RegExp(`2026\\s+${datePattern}`, 'i'))
      || text.match(new RegExp(`^ROUND\\s+\\d{1,2}?\\s*${datePattern}\\s+`, 'i'));
    if (!dateMatch) return;

    const beforeFormulaRaw = text
      .replace(/^TESTING\s+/i, '')
      .replace(/^ROUND\s+\d{1,2}?\s*/i, '')
      .replace(new RegExp(`^${datePattern}\\s+`, 'i'), '')
      .replace(/^Chequered Flag\s+/i, '')
      .split(/\s+FORMULA 1\s+/i)[0];
    const beforeFormula = beforeFormulaRaw.replace(/\s+FORMULA 1.*$/i, '');
    const nameMatch = text.match(/FORMULA 1\s+(.+?)\s+2026\s+/i);
    const name = nameMatch ? cleanText(nameMatch[1]) : (type === 'testing' ? 'Pre-season Testing' : `Round ${round}`);

    addEvent({
      href,
      text,
      type,
      round,
      dateText: dateMatch[1],
      placeText: beforeFormula,
      name,
    });
  });

  const pageText = cleanText(html);
  const completedRacePattern = new RegExp(`ROUND\\s+(\\d{1,2}?)(?=\\s*\\d{1,2}\\s*-)\\s*${datePattern}\\s+(.+?)\\s+FORMULA 1\\s+(.+?)\\s+2026\\b`, 'gi');
  Array.from(pageText.matchAll(completedRacePattern)).forEach((match) => {
    addEvent({
      href: F1_2026_URL,
      text: match[0],
      type: 'race',
      round: Number(match[1]),
      dateText: match[2],
      placeText: match[3],
      name: cleanText(match[4]),
    });
  });

  return events.sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)));
};

const fetchHtml = async (url) => {
  const response = await fetch(url, {
    headers: {
      accept: 'text/html,application/xhtml+xml',
      'user-agent': 'rabbit-notes-f1-schedule/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Formula 1 returned ${response.status} for ${url}`);
  }

  return response.text();
};

const fetchWikipediaDriverProfile = async (name = '') => {
  const driverName = cleanText(name);
  if (!driverName) {
    const error = new Error('Driver name is required');
    error.status = 400;
    throw error;
  }

  if (driverProfileCache.has(driverName)) {
    return driverProfileCache.get(driverName);
  }

  const title = encodeURIComponent(driverName.replace(/\s+/g, '_'));
  const response = await fetch(`${WIKIPEDIA_API_URL}/${title}`, {
    headers: {
      accept: 'application/json',
      'user-agent': 'rabbit-notes-f1-driver-popup/1.0',
    },
  });

  if (!response.ok) {
    const error = new Error(`Wikipedia returned ${response.status} for ${driverName}`);
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  const profile = {
    name: data.title || driverName,
    description: data.description || '',
    extract: data.extract || '',
    thumbnail: data.thumbnail?.source || data.originalimage?.source || '',
    url: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${title}`,
    source: 'Wikipedia',
  };

  driverProfileCache.set(driverName, profile);
  return profile;
};

const normalizeWikidataBirthDate = (value = '') => {
  const match = String(value).match(/^\+?(\d{4})-(\d{2})-(\d{2})T/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : '';
};

const fetchWikipediaDriverBirthDate = async (name = '') => {
  const driverName = cleanText(name);
  if (!driverName) {
    const error = new Error('Driver name is required');
    error.status = 400;
    throw error;
  }

  if (driverBirthDateCache.has(driverName)) {
    return driverBirthDateCache.get(driverName);
  }

  const pageTitle = driverName.replace(/\s+/g, '_');
  const pageResponse = await fetch(`${WIKIPEDIA_QUERY_API_URL}?action=query&format=json&prop=pageprops&titles=${encodeURIComponent(pageTitle)}&redirects=1`, {
    headers: {
      accept: 'application/json',
      'user-agent': 'rabbit-notes-f1-driver-birthdate/1.0',
    },
  });

  if (!pageResponse.ok) {
    const error = new Error(`Wikipedia returned ${pageResponse.status} for ${driverName}`);
    error.status = pageResponse.status;
    throw error;
  }

  const pageData = await pageResponse.json();
  const page = Object.values(pageData?.query?.pages || {})[0];
  const wikidataId = page?.pageprops?.wikibase_item;
  if (!wikidataId) {
    const error = new Error(`No Wikidata item found for ${driverName}`);
    error.status = 404;
    throw error;
  }

  const entityResponse = await fetch(`${WIKIDATA_API_URL}?action=wbgetentities&format=json&props=claims&ids=${encodeURIComponent(wikidataId)}`, {
    headers: {
      accept: 'application/json',
      'user-agent': 'rabbit-notes-f1-driver-birthdate/1.0',
    },
  });

  if (!entityResponse.ok) {
    const error = new Error(`Wikidata returned ${entityResponse.status} for ${driverName}`);
    error.status = entityResponse.status;
    throw error;
  }

  const entityData = await entityResponse.json();
  const birthTime = entityData?.entities?.[wikidataId]?.claims?.P569?.[0]?.mainsnak?.datavalue?.value?.time;
  const birthDate = normalizeWikidataBirthDate(birthTime);
  if (!birthDate) {
    const error = new Error(`No birth date found for ${driverName}`);
    error.status = 404;
    throw error;
  }

  const payload = {
    name: page?.title || driverName,
    requestedName: driverName,
    birthDate,
    birthYear: birthDate.slice(0, 4),
    wikidataId,
    wikipediaUrl: `https://en.wikipedia.org/wiki/${encodeURIComponent((page?.title || pageTitle).replace(/\s+/g, '_'))}`,
    source: 'Wikipedia/Wikidata',
  };

  driverBirthDateCache.set(driverName, payload);
  return payload;
};

const parseTableCells = (rowHtml = '') => Array.from(rowHtml.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi))
  .map(match => cleanText(match[1]))
  .filter(Boolean);

const getFirstLink = (html = '') => {
  const match = html.match(/<a\b[^>]*href="([^"]+)"/i);
  return match ? absoluteUrl(match[1]) : '';
};

const parseDriversFromHtml = (html) => {
  const drivers = [];
  const rows = Array.from(html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi));

  rows.forEach((rowMatch) => {
    const cellHtml = Array.from(rowMatch[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)).map(match => match[1]);
    const cells = cellHtml.map(cell => cleanText(cell)).filter(Boolean);
    if (cells.length < 5 || !/^\d+$/.test(cells[0]) || !/^\d+$/.test(cells[cells.length - 1])) return;

    const position = Number(cells[0]);
    const points = Number(cells[cells.length - 1]);
    const team = cells[cells.length - 2];
    const nationality = cells[cells.length - 3];
    const driverCell = cells.slice(1, -3).join(' ');
    const codeMatch = driverCell.match(/\b([A-Z]{3})$/);
    const code = codeMatch ? codeMatch[1] : '';
    const name = code ? driverCell.replace(new RegExp(`\\s*${code}$`), '').trim() : driverCell;
    const profileUrl = getFirstLink(cellHtml.slice(1, -3).join(' '));
    if (!name || !team) return;

    drivers.push({
      position,
      name,
      code,
      nationality,
      team,
      points,
      profileUrl,
    });
  });

  if (drivers.length > 0) return drivers.sort((a, b) => a.position - b.position);

  const text = cleanText(html);
  const standingsText = text.split("2026 Drivers' Standings").pop()?.split('OUR PARTNERS')[0] || '';
  const knownTeams = [
    'Red Bull Racing',
    'Racing Bulls',
    'Haas F1 Team',
    'Aston Martin',
    'Mercedes',
    'Ferrari',
    'McLaren',
    'Alpine',
    'Williams',
    'Cadillac',
    'Audi',
  ];
  const teamPattern = knownTeams.map(team => team.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const fallbackPattern = new RegExp(`(\\d{1,2})([A-Z][A-Za-z]+(?:\\s+[A-Z][A-Za-z]+)+)\\s+([A-Z]{3})([A-Z]{3})(${teamPattern})(\\d+)`, 'g');

  return Array.from(standingsText.matchAll(fallbackPattern)).map(match => ({
    position: Number(match[1]),
    name: cleanText(match[2]),
    code: match[3],
    nationality: match[4],
    team: match[5],
    points: Number(match[6]),
  })).sort((a, b) => a.position - b.position);
};

const parseTeamsFromHtml = (html) => {
  const teams = [];
  const rows = Array.from(html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi));

  rows.forEach((rowMatch) => {
    const cellHtml = Array.from(rowMatch[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)).map(match => match[1]);
    const cells = cellHtml.map(cell => cleanText(cell)).filter(Boolean);
    if (cells.length < 3 || !/^\d+$/.test(cells[0]) || !/^\d+$/.test(cells[cells.length - 1])) return;

    const position = Number(cells[0]);
    const points = Number(cells[cells.length - 1]);
    const name = cells.slice(1, -1).join(' ');
    const profileUrl = getFirstLink(cellHtml.slice(1, -1).join(' '));
    if (!name) return;

    teams.push({
      position,
      name,
      points,
      profileUrl,
    });
  });

  if (teams.length > 0) return teams.sort((a, b) => a.position - b.position);

  const text = cleanText(html);
  const standingsText = text.split("2026 Teams' Standings").pop()?.split('OUR PARTNERS')[0] || '';
  const fallbackPattern = /(\d{1,2})([A-Z][A-Za-z0-9 &]+?)(\d+)(?=\d{1,2}[A-Z]|$)/g;

  return Array.from(standingsText.matchAll(fallbackPattern)).map(match => ({
    position: Number(match[1]),
    name: cleanText(match[2]),
    points: Number(match[3]),
    profileUrl: '',
  })).sort((a, b) => a.position - b.position);
};

const parseRaceResultsFromHtml = (html) => {
  const results = [];
  const rows = Array.from(html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi));

  rows.forEach((rowMatch) => {
    const cellHtml = Array.from(rowMatch[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)).map(match => match[1]);
    const cells = cellHtml.map(cell => cleanText(cell)).filter(Boolean);
    if (cells.length < 6 || !/^\d{1,2}\s+[A-Za-z]{3}$/.test(cells[1])) return;

    const winnerCell = cells[2] || '';
    const codeMatch = winnerCell.match(/\b([A-Z]{3})$/);
    const winnerCode = codeMatch ? codeMatch[1] : '';
    const winner = winnerCode ? winnerCell.replace(new RegExp(`\\s*${winnerCode}$`), '').trim() : winnerCell;

    results.push({
      grandPrix: cells[0].replace(/^Flag of\s+/i, ''),
      date: cells[1],
      winner,
      winnerCode,
      team: cells[3],
      laps: Number(cells[4]) || cells[4],
      time: cells[5],
      url: getFirstLink(cellHtml[0]),
    });
  });

  if (results.length > 0) return results;

  const text = cleanText(html);
  const resultsText = text.split('2026 RACE RESULTS').pop()?.split('OUR PARTNERS')[0] || '';
  const knownTeams = [
    'Red Bull Racing',
    'Racing Bulls',
    'Haas F1 Team',
    'Aston Martin',
    'Mercedes',
    'Ferrari',
    'McLaren',
    'Alpine',
    'Williams',
    'Cadillac',
    'Audi',
  ];
  const teamPattern = knownTeams.map(team => team.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const fallbackPattern = new RegExp(`Flag of\\s+(.+?)\\s+(\\d{1,2}\\s+[A-Za-z]{3})([A-Z][A-Za-z\\u00A0\\s]+?)\\s+([A-Z]{3})(${teamPattern})(\\d+)\\s+([^\\s]+)`, 'g');

  return Array.from(resultsText.matchAll(fallbackPattern)).map(match => ({
    grandPrix: cleanText(match[1]),
    date: match[2],
    winner: cleanText(match[3].replace(/\u00A0/g, ' ')),
    winnerCode: match[4],
    team: match[5],
    laps: Number(match[6]) || match[6],
    time: match[7],
    url: '',
  }));
};

const buildF1Payload = async () => {
  const [scheduleHtml, driversHtml, teamsHtml, raceResultsHtml] = await Promise.all([
    fetchHtml(F1_2026_URL),
    fetchHtml(F1_2026_DRIVERS_URL),
    fetchHtml(F1_2026_TEAMS_URL),
    fetchHtml(F1_2026_RACE_RESULTS_URL),
  ]);
  const events = parseScheduleFromHtml(scheduleHtml);
  const drivers = parseDriversFromHtml(driversHtml);
  const teams = parseTeamsFromHtml(teamsHtml);
  const raceResults = parseRaceResultsFromHtml(raceResultsHtml);

  return {
    season: 2026,
    sourceUrl: F1_2026_URL,
    driversSourceUrl: F1_2026_DRIVERS_URL,
    teamsSourceUrl: F1_2026_TEAMS_URL,
    raceResultsSourceUrl: F1_2026_RACE_RESULTS_URL,
    fetchedAt: new Date().toISOString(),
    events,
    drivers,
    teams,
    raceResults,
    total: events.filter(event => event.type === 'race').length,
    testingTotal: events.filter(event => event.type === 'testing').length,
    driversTotal: drivers.length,
    teamsTotal: teams.length,
    raceResultsTotal: raceResults.length,
  };
};

router.get('/2026', async (req, res) => {
  try {
    res.json(await buildF1Payload());
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to scrape F1 data' });
  }
});

router.get('/schedule/2026', async (req, res) => {
  try {
    const scheduleHtml = await fetchHtml(F1_2026_URL);
    const events = parseScheduleFromHtml(scheduleHtml);
    res.json({
      season: 2026,
      sourceUrl: F1_2026_URL,
      fetchedAt: new Date().toISOString(),
      events,
      total: events.filter(event => event.type === 'race').length,
      testingTotal: events.filter(event => event.type === 'testing').length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to scrape F1 schedule' });
  }
});

router.get('/drivers/2026', async (req, res) => {
  try {
    const driversHtml = await fetchHtml(F1_2026_DRIVERS_URL);
    const drivers = parseDriversFromHtml(driversHtml);
    res.json({
      season: 2026,
      sourceUrl: F1_2026_DRIVERS_URL,
      fetchedAt: new Date().toISOString(),
      drivers,
      total: drivers.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to scrape F1 drivers standings' });
  }
});

router.get('/teams/2026', async (req, res) => {
  try {
    const teamsHtml = await fetchHtml(F1_2026_TEAMS_URL);
    const teams = parseTeamsFromHtml(teamsHtml);
    res.json({
      season: 2026,
      sourceUrl: F1_2026_TEAMS_URL,
      fetchedAt: new Date().toISOString(),
      teams,
      total: teams.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to scrape F1 team standings' });
  }
});

router.get('/race-results/2026', async (req, res) => {
  try {
    const raceResultsHtml = await fetchHtml(F1_2026_RACE_RESULTS_URL);
    const raceResults = parseRaceResultsFromHtml(raceResultsHtml);
    res.json({
      season: 2026,
      sourceUrl: F1_2026_RACE_RESULTS_URL,
      fetchedAt: new Date().toISOString(),
      raceResults,
      total: raceResults.length,
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to scrape F1 race results' });
  }
});

router.get('/driver-profile', async (req, res) => {
  try {
    res.json(await fetchWikipediaDriverProfile(req.query.name));
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Failed to fetch driver profile' });
  }
});

router.get('/driver-birthdate', async (req, res) => {
  try {
    res.json(await fetchWikipediaDriverBirthDate(req.query.name));
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'Failed to fetch driver birth date' });
  }
});

module.exports = router;
