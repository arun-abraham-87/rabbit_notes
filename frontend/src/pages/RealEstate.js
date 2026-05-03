import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  ExclamationTriangleIcon,
  HomeModernIcon,
  MagnifyingGlassIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';

const SOLD_URL = 'https://www.realestate.com.au/sold/in-mernda,+vic+3754/list-1';
const BUY_URL = 'https://www.realestate.com.au/buy/property-house-in-mernda,+vic+3754/list-1?source=refinement';
const API_BASE = 'http://localhost:5001/api/realestate';

const columns = [
  ['address', 'Address'],
  ['propertyType', 'Type'],
  ['bedrooms', 'Beds'],
  ['bathrooms', 'Baths'],
  ['carSpaces', 'Cars'],
  ['landSize', 'Land'],
  ['soldDate', 'Sold date'],
  ['soldPrice', 'Price'],
  ['saleMethod', 'Sale method'],
];

const columnClasses = {
  address: 'min-w-64',
  propertyType: 'min-w-28',
  bedrooms: 'min-w-20',
  bathrooms: 'min-w-20',
  carSpaces: 'min-w-20',
  landSize: 'min-w-24',
  soldDate: 'min-w-32',
  soldPrice: 'min-w-48',
  saleMethod: 'min-w-44',
};

const numericValue = (value) => {
  const parsed = Number(String(value || '').replace(/[^0-9.-]/g, ''));
  return Number.isNaN(parsed) ? null : parsed;
};

const dateValue = (value) => {
  const parsed = Date.parse(String(value || ''));
  return Number.isNaN(parsed) ? null : parsed;
};

const getSortValue = (property, key) => {
  const value = property[key];
  if (['soldPrice', 'bedrooms', 'bathrooms', 'carSpaces', 'landSize', 'distanceKm'].includes(key)) return numericValue(value);
  if (key === 'soldDate') return dateValue(value);
  return String(value || '').toLowerCase();
};

const normalizeSearchText = (value) => String(value || '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '');

const fuzzyIncludes = (value, term) => {
  const haystack = normalizeSearchText(value);
  const needle = normalizeSearchText(term);
  if (!needle) return true;
  if (haystack.includes(needle)) return true;

  let needleIndex = 0;
  for (let index = 0; index < haystack.length && needleIndex < needle.length; index += 1) {
    if (haystack[index] === needle[needleIndex]) needleIndex += 1;
  }
  return needleIndex === needle.length;
};

const getPropertySearchUrl = (property) => {
  const query = [property.address, property.propertyType, property.soldDate].filter(Boolean).join(' ');
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
};

const getPropertyDirectionsUrl = (property) => {
  const origin = '11 Crossing Rd, Mernda VIC 3754';
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(property.address || '')}`;
};

const displayValue = (value) => (
  value === undefined || value === null || value === '' ? 'null' : value
);

const addressClassName = (property) => (
  property.listingType === 'sold' ? 'text-rose-700' : 'text-emerald-700'
);

function ListingSection() {
  const [cacheInfo, setCacheInfo] = useState(null);
  const [properties, setProperties] = useState([]);
  const [fetchedAt, setFetchedAt] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'listingType', direction: 'asc' });
  const [search, setSearch] = useState('');
  const [listingFilter, setListingFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const applyPayload = (data) => {
    setProperties(data.properties || []);
    setFetchedAt(data.fetchedAt || '');
    setCacheInfo(data.cache || null);
  };

  const loadResults = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/mernda`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load real estate results');
      applyPayload(data);
    } catch (err) {
      setError(err.message || 'Failed to load real estate results');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const loadLocalOnMount = async () => {
      try {
        const response = await fetch(`${API_BASE}/mernda`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        const data = await response.json();
        if (mounted && response.ok) applyPayload(data);
      } catch (err) {
        // Explicit reload still shows errors.
      }
    };

    loadLocalOnMount();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredProperties = useMemo(() => {
    const term = search.trim().toLowerCase();
    const byType = listingFilter === 'all'
      ? properties
      : properties.filter(property => property.listingType === listingFilter);
    const filtered = !term ? byType : byType.filter(property => (
      columns.some(([key]) => fuzzyIncludes(property[key], term))
    ));
    return [...filtered].sort((a, b) => {
      const aValue = getSortValue(a, sortConfig.key);
      const bValue = getSortValue(b, sortConfig.key);
      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return 1;
      if (bValue === null) return -1;
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [listingFilter, properties, search, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  return (
    <section className="mt-6">
      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-sky-700">
              <HomeModernIcon className="h-5 w-5" />
              Local HTML
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Combined Listings</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Parses every sold and buy Realestate HTML file in the backend folder, removes duplicates, and displays everything in one sortable table.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a href={SOLD_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
              Sold source
            </a>
            <a href={BUY_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
              <ArrowTopRightOnSquareIcon className="h-4 w-4" />
              Buy source
            </a>
            <button type="button" onClick={loadResults} className="inline-flex items-center gap-2 rounded-md bg-sky-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-sky-400" disabled={loading}>
              <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Load HTML
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto_auto_auto] md:items-center">
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Fuzzy search listings" className="w-full rounded-md border border-slate-300 py-2 pl-10 pr-3 text-sm outline-none focus:border-sky-600 focus:ring-2 focus:ring-sky-100" />
          </div>
          <div className="inline-flex rounded-md border border-slate-300 bg-white p-1">
            {[
              ['all', 'All'],
              ['buy', 'Buy'],
              ['sold', 'Sold'],
            ].map(([value, label]) => (
              <button key={value} type="button" onClick={() => setListingFilter(value)} className={`rounded px-3 py-1.5 text-sm font-medium ${listingFilter === value ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {filteredProperties.length} of {properties.length} properties
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {fetchedAt ? new Date(fetchedAt).toLocaleString() : 'Not fetched'}
          </div>
          {cacheInfo?.status && (
            <div className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm text-indigo-800">
              Cache {cacheInfo.status}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-6 flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="font-semibold">Could not load real estate results</div>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}

      <div className="mt-6 rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-[1200px] divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
              <tr>
                {columns.map(([key, label]) => (
                  <th key={label} className={`${columnClasses[key] || 'min-w-32'} whitespace-nowrap px-4 py-3`}>
                    <button type="button" onClick={() => handleSort(key)} className="inline-flex items-center gap-1 font-semibold uppercase tracking-wide text-slate-600 hover:text-slate-950">
                      {label}
                      <span className="text-[10px] text-slate-400">{sortConfig.key === key ? (sortConfig.direction === 'asc' ? '▲' : '▼') : '↕'}</span>
                    </button>
                  </th>
                ))}
                <th className="whitespace-nowrap px-4 py-3">Listing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-10 text-center text-slate-500">
                    Parsing downloaded HTML files...
                  </td>
                </tr>
              )}
              {!loading && filteredProperties.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-10 text-center text-slate-500">
                    No results yet. Press Load HTML to parse listings.
                  </td>
                </tr>
              )}
              {!loading && filteredProperties.map((property, index) => (
                <tr key={`${property.address || 'property'}-${index}`} className="hover:bg-slate-50">
                  {columns.map(([key]) => (
                    <td key={key} className={`${columnClasses[key] || 'min-w-32'} px-4 py-3 align-top ${key === 'address' ? addressClassName(property) : 'text-slate-700'}`}>
                      <div className={key === 'address' ? 'whitespace-normal break-words' : 'whitespace-nowrap'}>
                        {displayValue(property[key])}
                      </div>
                    </td>
                  ))}
                  <td className="whitespace-nowrap px-4 py-3 align-top">
                    <div className="flex flex-col gap-2">
                      {property.listingUrl && (
                        <a href={property.listingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-medium text-violet-700 hover:text-violet-900">
                          Listing
                          <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                        </a>
                      )}
                      <a href={getPropertySearchUrl(property)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-medium text-sky-700 hover:text-sky-900">
                        Search
                        <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                      </a>
                      <a href={getPropertyDirectionsUrl(property)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-medium text-emerald-700 hover:text-emerald-900">
                        Directions
                        <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </section>
  );
}

function FuelCard() {
  const [fuelPrices, setFuelPrices] = useState(null);
  const [fuelLoading, setFuelLoading] = useState(false);
  const [fuelError, setFuelError] = useState('');

  const loadFuelPrices = async () => {
    setFuelLoading(true);
    setFuelError('');
    try {
      const response = await fetch(`${API_BASE}/costco-fuel-prices`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch Costco fuel prices');
      setFuelPrices(data);
    } catch (err) {
      setFuelError(err.message || 'Failed to fetch Costco fuel prices');
    } finally {
      setFuelLoading(false);
    }
  };

  return (
    <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-cyan-700">
            <TruckIcon className="h-5 w-5" />
            Costco Fuel
          </div>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">Petrol and diesel prices</h2>
        </div>
        <button type="button" onClick={loadFuelPrices} className="inline-flex items-center gap-2 rounded-md bg-cyan-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-cyan-400" disabled={fuelLoading}>
          <ArrowPathIcon className={`h-4 w-4 ${fuelLoading ? 'animate-spin' : ''}`} />
          Fetch petrol prices
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Petrol cheapest', fuelPrices?.unleaded?.cheapest],
          ['Petrol average', fuelPrices?.unleaded?.average],
          ['Diesel cheapest', fuelPrices?.diesel?.cheapest],
          ['Diesel average', fuelPrices?.diesel?.average],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
            <div className="mt-2 text-2xl font-semibold text-slate-950">{value || '-'}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
        <span>{fuelLoading ? 'Fetching Costco fuel prices...' : (fuelPrices?.updatedAt || 'Not fetched')}</span>
        {fuelPrices?.sourceUrl && (
          <a href={fuelPrices.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-medium text-cyan-700 hover:text-cyan-900">
            Source
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
          </a>
        )}
      </div>

      {fuelError && <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{fuelError}</div>}
    </section>
  );
}

export default function RealEstate() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-[1800px] px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <div>
              <h1 className="text-3xl font-semibold text-slate-950">Real Estate Mernda</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                Sold and buy listings parsed from downloaded backend HTML files, with sorting, search, directions, direct listing links, and approximate distance from 11 Crossing Rd.
              </p>
            </div>
          </div>
        </section>

        <FuelCard />

        <ListingSection />
      </div>
    </div>
  );
}
