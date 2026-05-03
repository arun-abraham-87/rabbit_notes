const express = require('express');

const router = express.Router();

const F1_2026_URL = 'https://www.formula1.com/en/racing/2026';

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
  const start = startDate ? new Date(`${startDate}T00:00:00Z`) : null;
  const end = endDate ? new Date(`${endDate}T23:59:59Z`) : null;
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
  const anchors = Array.from(html.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi))
    .map(match => ({
      href: match[1],
      text: cleanText(match[2]),
    }))
    .filter(item => /\b(ROUND\s+\d+|TESTING)\b/i.test(item.text) && /FORMULA 1/i.test(item.text) && /2026/.test(item.text));

  const seen = new Set();
  const events = [];

  anchors.forEach(({ href, text }) => {
    const type = /^TESTING\b/i.test(text) ? 'testing' : 'race';
    const roundMatch = text.match(/^ROUND\s+(\d+)/i);
    const round = roundMatch ? Number(roundMatch[1]) : null;
    const label = type === 'testing' ? 'TESTING' : `ROUND ${round}`;

    const dateMatch = text.match(/2026\s+(\d{1,2}\s*-\s*\d{1,2}\s+[A-Za-z]{3}|\d{1,2}\s+[A-Za-z]{3}\s*-\s*\d{1,2}\s+[A-Za-z]{3})/i);
    if (!dateMatch) return;

    const beforeFormula = text
      .replace(/^TESTING\s+/i, '')
      .replace(/^ROUND\s+\d+\s+/i, '')
      .replace(/^Chequered Flag\s+/i, '')
      .split(/\s+FORMULA 1\s+/i)[0];
    const nameMatch = text.match(/FORMULA 1\s+(.+?)\s+2026\s+/i);
    const name = nameMatch ? cleanText(nameMatch[1]) : label;
    const dates = parseDateRange(dateMatch[1]);
    const location = parseLocation(beforeFormula);
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
      dateRange: cleanText(dateMatch[1]),
      ...dates,
      status: getStatus(dates.startDate, dates.endDate),
      url: absoluteUrl(href),
    });
  });

  return events.sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)));
};

router.get('/schedule/2026', async (req, res) => {
  try {
    const response = await fetch(F1_2026_URL, {
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'user-agent': 'rabbit-notes-f1-schedule/1.0',
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `Formula 1 returned ${response.status}` });
    }

    const html = await response.text();
    const events = parseScheduleFromHtml(html);
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

module.exports = router;
