const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();

const SOLD_URL = 'https://www.realestate.com.au/sold/in-mernda,+vic+3754/list-1';
const BUY_URL = 'https://www.realestate.com.au/buy/property-house-in-mernda,+vic+3754/list-1?source=refinement';
const COSTCO_FUEL_URL = 'https://petrolmate.com.au/station/epping-26337';
const REAL_ESTATE_CACHE_DIR = path.join(__dirname, '..', 'data', 'realestate');
const LOCAL_REAL_ESTATE_DIR = path.join(__dirname, '..', 'downloaded_files', 'rs');
const ORIGIN_ADDRESS = '11 Crossing Rd, Mernda VIC 3754';
const GEOCODE_CACHE_PATH = path.join(REAL_ESTATE_CACHE_DIR, 'geocode-cache.json');

const getTodayKey = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Australia/Melbourne' });

const getCachePath = (listingType = 'sold', dateKey = getTodayKey()) => (
  path.join(REAL_ESTATE_CACHE_DIR, `${listingType}-${dateKey}.json`)
);

const readCachedRealEstate = async (listingType = 'sold', dateKey = getTodayKey()) => {
  try {
    const raw = await fs.readFile(getCachePath(listingType, dateKey), 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
};

const writeCachedRealEstate = async (listingType = 'sold', payload, dateKey = getTodayKey()) => {
  await fs.mkdir(REAL_ESTATE_CACHE_DIR, { recursive: true });
  await fs.writeFile(getCachePath(listingType, dateKey), JSON.stringify(payload, null, 2));
};

const readGeocodeCache = async () => {
  try {
    const raw = await fs.readFile(GEOCODE_CACHE_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    throw error;
  }
};

const writeGeocodeCache = async (cache) => {
  await fs.mkdir(REAL_ESTATE_CACHE_DIR, { recursive: true });
  await fs.writeFile(GEOCODE_CACHE_PATH, JSON.stringify(cache, null, 2));
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

const absoluteUrl = (url = '') => {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  if (url.startsWith('//')) return `https:${url}`;
  return new URL(url, 'https://www.realestate.com.au').toString();
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const normaliseDistanceAddress = (address = '') => {
  const cleaned = cleanText(address);
  if (!cleaned || /available on request/i.test(cleaned)) return '';
  if (/vic\s*3754/i.test(cleaned)) return cleaned;
  return `${cleaned}, VIC 3754`;
};

const haversineKm = (from, to) => {
  if (!from || !to) return '';
  const radiusKm = 6371;
  const toRadians = degrees => (degrees * Math.PI) / 180;
  const latDelta = toRadians(to.lat - from.lat);
  const lonDelta = toRadians(to.lon - from.lon);
  const fromLat = toRadians(from.lat);
  const toLat = toRadians(to.lat);
  const a = Math.sin(latDelta / 2) ** 2
    + Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lonDelta / 2) ** 2;
  return (radiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1);
};

const geocodeAddress = async (address, cache) => {
  const formattedAddress = normaliseDistanceAddress(address);
  if (!formattedAddress) return null;

  const cacheKey = formattedAddress.toLowerCase();
  if (cache[cacheKey]) return cache[cacheKey].lat && cache[cacheKey].lon ? cache[cacheKey] : null;

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=au&q=${encodeURIComponent(formattedAddress)}`;
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      'user-agent': 'rabbit-notes-realestate-distance/1.0',
    },
  });

  if (!response.ok) {
    throw new Error(`Geocoding returned ${response.status}`);
  }

  const results = await response.json();
  const first = Array.isArray(results) ? results[0] : null;
  cache[cacheKey] = first
    ? { lat: Number(first.lat), lon: Number(first.lon), displayName: first.display_name || formattedAddress }
    : { lat: null, lon: null, displayName: '' };
  return cache[cacheKey].lat && cache[cacheKey].lon ? cache[cacheKey] : null;
};

const addApproxDistances = async (properties) => {
  const cache = await readGeocodeCache();
  let cacheChanged = false;

  const cacheKeysBefore = new Set(Object.keys(cache));
  const origin = await geocodeAddress(ORIGIN_ADDRESS, cache).catch(() => null);
  if (!origin) return properties;

  const withDistances = [];
  for (const property of properties) {
    const beforeCount = Object.keys(cache).length;
    const destination = await geocodeAddress(property.address, cache).catch(() => null);
    if (Object.keys(cache).length !== beforeCount) {
      cacheChanged = true;
      await sleep(1100);
    }

    withDistances.push({
      ...property,
      distanceKm: destination ? haversineKm(origin, destination) : '',
      distanceFrom: ORIGIN_ADDRESS,
    });
  }

  if (cacheChanged || Object.keys(cache).some(key => !cacheKeysBefore.has(key))) {
    await writeGeocodeCache(cache);
  }

  return withDistances;
};

const firstValue = (object, keys) => {
  for (const key of keys) {
    if (object && object[key] !== undefined && object[key] !== null && object[key] !== '') {
      return object[key];
    }
  }
  return '';
};

const normaliseAddress = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return cleanText(value);
  if (typeof value !== 'object') return '';

  const direct = firstValue(value, [
    'displayAddress',
    'displayableAddress',
    'fullAddress',
    'streetAddress',
    'shortAddress',
    'address',
  ]);
  if (typeof direct === 'string') return cleanText(direct);

  const parts = [
    value.streetAddress || value.street,
    value.suburb || value.locality,
    value.state,
    value.postcode || value.postCode,
  ].filter(Boolean);
  return cleanText(parts.join(', '));
};

const normaliseListing = (item) => {
  const address = normaliseAddress(firstValue(item, [
    'address',
    'displayAddress',
    'displayableAddress',
    'fullAddress',
    'streetAddress',
  ]));
  if (!address || !/mernda/i.test(address)) return null;

  const listingUrl = absoluteUrl(firstValue(item, [
    'url',
    'canonicalUrl',
    'prettyUrl',
    'href',
    'link',
    'pdpUrl',
  ]));
  const price = firstValue(item, ['price', 'displayPrice', 'priceDisplay', 'soldPrice', 'displaySoldPrice']);
  const soldDate = firstValue(item, ['soldDate', 'dateSold', 'soldOn', 'displaySoldDate']);
  const features = item.features || item.propertyFeatures || item.generalFeatures || {};

  return {
    address,
    propertyType: cleanText(firstValue(item, ['propertyType', 'propertyTypeDisplay', 'type']) || ''),
    bedrooms: String(firstValue(item, ['bedrooms', 'beds', 'bed']) || firstValue(features, ['bedrooms', 'beds']) || ''),
    bathrooms: String(firstValue(item, ['bathrooms', 'baths', 'bath']) || firstValue(features, ['bathrooms', 'baths']) || ''),
    carSpaces: String(firstValue(item, ['carSpaces', 'parkingSpaces', 'cars', 'car']) || firstValue(features, ['carSpaces', 'parkingSpaces', 'cars']) || ''),
    landSize: cleanText(firstValue(item, ['landSize', 'landArea', 'displayLandSize']) || firstValue(features, ['landSize', 'landArea']) || ''),
    soldDate: cleanText(String(soldDate || '').replace(/^Sold on\s+/i, '')),
    soldPrice: cleanText(String(price || '')),
    agent: cleanText(firstValue(item, ['agentName', 'agent', 'agencyName', 'agency']) || ''),
    listingUrl,
    source: SOLD_URL,
  };
};

const looksLikeListingObject = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const address = normaliseAddress(firstValue(value, [
    'address',
    'displayAddress',
    'displayableAddress',
    'fullAddress',
    'streetAddress',
  ]));
  return Boolean(address && /mernda/i.test(address));
};

const walkForListings = (value, listings, seenObjects = new WeakSet()) => {
  if (!value || typeof value !== 'object') return;
  if (seenObjects.has(value)) return;
  seenObjects.add(value);

  if (Array.isArray(value)) {
    value.forEach(item => walkForListings(item, listings, seenObjects));
    return;
  }

  if (looksLikeListingObject(value)) {
    const listing = normaliseListing(value);
    if (listing) listings.push(listing);
  }

  Object.values(value).forEach(child => walkForListings(child, listings, seenObjects));
};

const parseJsonListings = (html) => {
  const listings = [];
  const scriptMatches = html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi);
  for (const match of scriptMatches) {
    const content = decodeHtml(match[1].trim());
    if (!content || !/Mernda/i.test(content)) continue;

    const candidates = [];
    if (/^\s*[{[]/.test(content)) candidates.push(content);
    const nextData = content.match(/({[\s\S]*})/);
    if (nextData) candidates.push(nextData[1]);

    candidates.forEach(candidate => {
      try {
        walkForListings(JSON.parse(candidate), listings);
      } catch (error) {
        // Ignore script blocks that are not standalone JSON.
      }
    });
  }
  return listings;
};

const parseTextListings = (html) => {
  const text = cleanText(html);
  const listings = [];
  const pattern = /Sold\s+(\$[\d,]+|Price Withheld|Contact agent)\s+(.+?\bMernda(?:,\s*Vic\s*3754)?)\s+([\s\S]*?)\s+•\s+(House|Townhouse|Apartment|Unit|Villa|Land)\s+Sold on\s+(\d{1,2}\s+\w+\s+\d{4})/gi;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const details = match[3] || '';
    const numbers = Array.from(details.matchAll(/(\d[\d,]*m²|\d+)/g)).map(item => item[1]);
    listings.push({
      listingType: 'sold',
      address: cleanText(match[2]),
      propertyType: match[4],
      bedrooms: numbers[0] || '',
      bathrooms: numbers[1] || '',
      carSpaces: numbers[2] || '',
      landSize: numbers.find(number => /m²/.test(number)) || '',
      soldDate: match[5],
      soldPrice: match[1],
      agent: '',
      listingUrl: '',
      source: SOLD_URL,
    });
  }

  return listings;
};

const uniqueListings = (listings) => {
  const unique = new Map();
  listings.forEach(listing => {
    if (!listing?.address) return;
    const key = listing.listingUrl || `${listing.listingType || ''}-${listing.address}-${listing.soldDate}-${listing.soldPrice}`;
    if (!unique.has(key)) unique.set(key, listing);
  });
  return Array.from(unique.values());
};

const parseListingsFromHtml = (html) => {
  const listings = uniqueListings([
    ...parseJsonListings(html),
    ...parseTextListings(html),
  ]);

  return listings.slice(0, 25);
};

const extractFuelPrice = (text, fuelType) => {
  const availableTypePattern = new RegExp(`${fuelType}\\s*\\((\\d+(?:\\.\\d+)?)c\\/L\\)`, 'i');
  const availableTypeMatch = text.match(availableTypePattern);
  if (availableTypeMatch) {
    return `${availableTypeMatch[1]}c/L`;
  }

  const atPattern = new RegExp(`${fuelType}\\s+at\\s+(\\d+(?:\\.\\d+)?)c\\/L`, 'i');
  const atMatch = text.match(atPattern);
  if (atMatch) {
    return `${atMatch[1]}c/L`;
  }

  const rowPattern = new RegExp(`${fuelType}\\s+\\|\\s+\\d+\\s+\\|\\s+(\\d+(?:\\.\\d+)?)¢\\s+\\|\\s+(\\d+(?:\\.\\d+)?)¢`, 'i');
  const rowMatch = text.match(rowPattern);
  if (rowMatch) {
    return `${rowMatch[1]}c/L`;
  }

  const bulletPattern = new RegExp(`${fuelType}\\s+at\\s+\\d+\\s+stations\\s+\\(from\\s+(\\d+(?:\\.\\d+)?)c,\\s+avg\\s+(\\d+(?:\\.\\d+)?)c\\)`, 'i');
  const bulletMatch = text.match(bulletPattern);
  if (bulletMatch) {
    return `${bulletMatch[1]}c/L`;
  }

  return null;
};

const parseCostcoFuelPrices = (html) => {
  const text = cleanText(html);
  const unleaded = extractFuelPrice(text, 'Unleaded Petrol') || extractFuelPrice(text, 'U91');
  const diesel = extractFuelPrice(text, 'Diesel');
  const premiumDiesel = extractFuelPrice(text, 'Premium Diesel') || extractFuelPrice(text, 'Prem Diesel');
  const updatedMatch = text.match(/Prices last updated:\s*([0-9]{1,2}:[0-9]{2}\s*[AP]M,\s*\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})/i)
    || text.match(/Last updated\s+(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})/i);

  return {
    sourceUrl: COSTCO_FUEL_URL,
    fetchedAt: new Date().toISOString(),
    updatedAt: updatedMatch ? cleanText(updatedMatch[1]) : '',
    station: 'Costco Epping',
    unleaded,
    diesel,
    premiumDiesel,
  };
};

const textBetween = (value, pattern) => {
  const match = value.match(pattern);
  return match ? cleanText(match[1]) : '';
};

const parseFeatureNumber = (label, pattern) => {
  const match = String(label || '').match(pattern);
  return match ? match[1] : '';
};

const parseSaleMethod = (card, listingType) => {
  if (listingType === 'sold') return '';

  const text = cleanText(card);
  const auctionMatch = text.match(/Auction\s+((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+\d{1,2}\s+\w+(?:\s+\d{1,2}:\d{2}\s*(?:am|pm))?)/i);
  if (auctionMatch) return `Auction ${auctionMatch[1]}`;

  if (/Private\s+sale/i.test(text)) return 'Private sale';

  if (/Under offer/i.test(text)) return 'Under offer';
  if (/View indicative price|Indicative price/i.test(text)) return 'Indicative price';
  if (/Contact agent/i.test(text)) return 'Contact agent';

  return '';
};

const parseCardListingsFromHtml = (html, fileName = '', listingType = 'buy') => {
  const listings = [];
  const cardPattern = /<div[^>]*class="[^"]*residential-card__content-wrapper[\s\S]*?(?=<div[^>]*class="[^"]*residential-card__content-wrapper|<\/body>|<\/html>)/gi;
  const cards = Array.from(html.matchAll(cardPattern)).map(match => match[0]);

  cards.forEach((card) => {
    const address = textBetween(card, /<h2[^>]*class="[^"]*residential-card__address-heading[^"]*"[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/i);
    if (!address || !/mernda/i.test(address) || /address available on request/i.test(address)) return;

    const price = textBetween(card, /<span[^>]*class="[^"]*property-price[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
    const linkMatch = card.match(/<a[^>]+(?:data-savepage-href|href)="([^"]*property-[^"]+)"/i);
    const listingUrl = linkMatch ? absoluteUrl(linkMatch[1]) : '';
    const featureLabel = decodeHtml(textBetween(card, /<ul[^>]*aria-label="([^"]+)"/i));
    const soldDate = listingType === 'sold'
      ? textBetween(card, /<span[^>]*>\s*Sold on\s+([\s\S]*?)<\/span>/i)
      : '';
    const saleMethod = parseSaleMethod(card, listingType);

    listings.push({
      listingType,
      address,
      propertyType: textBetween(featureLabel, /^(House|Townhouse|Apartment|Unit|Villa|Land)\b/i) || 'House',
      bedrooms: parseFeatureNumber(featureLabel, /(\d+)\s+bedrooms?/i),
      bathrooms: parseFeatureNumber(featureLabel, /(\d+)\s+bathrooms?/i),
      carSpaces: parseFeatureNumber(featureLabel, /(\d+)\s+car spaces?/i),
      landSize: parseFeatureNumber(featureLabel, /with\s+([\d,]+m²)\s+land size/i),
      soldDate,
      soldPrice: price,
      saleMethod,
      agent: '',
      listingUrl,
      source: fileName,
    });
  });

  return uniqueListings(listings);
};

const parseBuyListingsFromHtml = (html, fileName = '') => parseCardListingsFromHtml(html, fileName, 'buy');
const parseSoldListingsFromHtml = (html, fileName = '') => {
  const cardListings = parseCardListingsFromHtml(html, fileName, 'sold');
  return cardListings.length ? cardListings : parseListingsFromHtml(html);
};

const parseLocalRealEstateFiles = async (listingType = 'buy') => {
  const files = (await fs.readdir(LOCAL_REAL_ESTATE_DIR))
    .filter(file => file.toLowerCase().endsWith('.html'))
    .filter(file => (
      listingType === 'sold'
        ? /sold|auction/i.test(file)
        : /sale|buy|house/i.test(file) && !/sold|auction/i.test(file)
    ))
    .sort();

  const listings = [];
  for (const file of files) {
    const filePath = path.join(LOCAL_REAL_ESTATE_DIR, file);
    const html = await fs.readFile(filePath, 'utf8');
    listings.push(...(listingType === 'sold'
      ? parseSoldListingsFromHtml(html, file)
      : parseBuyListingsFromHtml(html, file)));
  }

  return uniqueListings(listings);
};

const parseAllLocalRealEstateFiles = async () => (
  uniqueListings([
    ...await parseLocalRealEstateFiles('sold'),
    ...await parseLocalRealEstateFiles('buy'),
  ])
);

const getListingConfig = (listingType) => (
  listingType === 'buy'
    ? { listingType: 'buy', url: BUY_URL, expectedCount: 25, fallbackTitle: 'Realestate.com.au buy listings' }
    : { listingType: 'sold', url: SOLD_URL, expectedCount: 25, fallbackTitle: 'Realestate.com.au sold listings' }
);

const handleCacheStatus = (listingType) => async (req, res) => {
  try {
    const config = getListingConfig(listingType);
    const dateKey = getTodayKey();
    const cached = await readCachedRealEstate(config.listingType, dateKey);
    res.json({
      dateKey,
      hasCache: Boolean(cached),
      cachedAt: cached?.cachedAt || '',
      fetchedAt: cached?.fetchedAt || '',
      total: Array.isArray(cached?.properties) ? cached.properties.length : 0,
    });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to check real estate cache' });
  }
};

const handleListingsRequest = (listingType) => async (req, res) => {
  try {
    const config = getListingConfig(listingType);
    const dateKey = getTodayKey();

    const properties = await addApproxDistances(await parseLocalRealEstateFiles(config.listingType));
    const payload = {
      sourceUrl: LOCAL_REAL_ESTATE_DIR,
      fetchedAt: new Date().toISOString(),
      properties,
      notes: `Loaded ${properties.length} ${config.listingType} listings from downloaded HTML files.`,
      sources: [{ title: config.fallbackTitle, url: config.url }],
      cachedAt: new Date().toISOString(),
    };
    await writeCachedRealEstate(config.listingType, payload, dateKey);
    res.json({
      ...payload,
      cache: {
        dateKey,
        status: 'local-html',
        cachedAt: payload.cachedAt,
      },
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message || 'Failed to load real estate results',
      details: error.details || undefined,
    });
  }
};

const handleCombinedListingsRequest = async (req, res) => {
  try {
    const dateKey = getTodayKey();
    const properties = await addApproxDistances(await parseAllLocalRealEstateFiles());
    const payload = {
      sourceUrl: LOCAL_REAL_ESTATE_DIR,
      fetchedAt: new Date().toISOString(),
      properties,
      notes: `Loaded ${properties.length} combined listings from downloaded HTML files.`,
      sources: [
        { title: 'Realestate.com.au sold listings', url: SOLD_URL },
        { title: 'Realestate.com.au buy listings', url: BUY_URL },
      ],
      cachedAt: new Date().toISOString(),
    };
    await writeCachedRealEstate('combined', payload, dateKey);
    res.json({
      ...payload,
      cache: {
        dateKey,
        status: 'local-html',
        cachedAt: payload.cachedAt,
      },
    });
  } catch (error) {
    res.status(error.status || 500).json({
      error: error.message || 'Failed to load real estate results',
      details: error.details || undefined,
    });
  }
};

router.get('/sold-mernda/cache-status', handleCacheStatus('sold'));
router.post('/sold-mernda', handleListingsRequest('sold'));
router.get('/buy-mernda/cache-status', handleCacheStatus('buy'));
router.post('/buy-mernda', handleListingsRequest('buy'));
router.post('/mernda', handleCombinedListingsRequest);

router.get('/costco-fuel-prices', async (req, res) => {
  try {
    const response = await fetch(COSTCO_FUEL_URL, {
      headers: {
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'en-AU,en;q=0.9',
        'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      res.status(response.status).json({ error: `Petrolmate returned ${response.status}` });
      return;
    }

    const html = await response.text();
    const prices = parseCostcoFuelPrices(html);
    if (!prices.unleaded && !prices.diesel && !prices.premiumDiesel) {
      res.status(502).json({ error: 'Could not parse Costco fuel prices from Petrolmate.' });
      return;
    }

    res.json(prices);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch Costco fuel prices' });
  }
});

router.parseListingsFromHtml = parseListingsFromHtml;
router.parseBuyListingsFromHtml = parseBuyListingsFromHtml;
router.parseSoldListingsFromHtml = parseSoldListingsFromHtml;
router.parseCostcoFuelPrices = parseCostcoFuelPrices;

module.exports = router;
