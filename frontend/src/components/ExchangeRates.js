import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { loadAllNotes } from '../utils/ApiUtils';
import { InformationCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

const ExchangeRates = () => {
  const [rates, setRates] = useState(null);
  const [error, setError] = useState('');
  const [apiKey, setApiKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [apiCalls, setApiCalls] = useState(0);

  // Initialize API call count
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const storedData = localStorage.getItem('exchangeRateApiCalls');
    let apiCallData = { date: today, count: 0 };

    if (storedData) {
      const parsedData = JSON.parse(storedData);
      if (parsedData.date === today) {
        apiCallData = parsedData;
      }
    }

    setApiCalls(apiCallData.count);
  }, []);

  const getCachedData = () => {
    const cachedData = localStorage.getItem('exchangeRatesData');
    if (!cachedData) return null;

    try {
      const { timestamp, usdToInr, audToInr } = JSON.parse(cachedData);
      const now = new Date().getTime();
      
      // Check if cache is still valid
      if (now - timestamp < CACHE_DURATION) {
        return { usdToInr, audToInr, timestamp };
      }
    } catch (err) {
      console.error('Error parsing cached data:', err);
    }
    return null;
  };

  const updateApiCallCount = () => {
    const today = new Date().toISOString().split('T')[0];
    const storedData = localStorage.getItem('exchangeRateApiCalls');
    let apiCallData = { date: today, count: 0 };

    if (storedData) {
      const parsedData = JSON.parse(storedData);
      if (parsedData.date === today) {
        apiCallData = parsedData;
      }
    }

    apiCallData.count += 1;
    localStorage.setItem('exchangeRateApiCalls', JSON.stringify(apiCallData));
    setApiCalls(apiCallData.count);
  };

  const fetchRates = async (key) => {
    try {
      // Fetch USD to INR rate
      const usdRes = await axios.get(`https://v6.exchangerate-api.com/v6/${key}/latest/USD`);
      updateApiCallCount();

      // Fetch AUD to INR rate
      const audRes = await axios.get(`https://v6.exchangerate-api.com/v6/${key}/latest/AUD`);
      updateApiCallCount();

      if (usdRes.data?.conversion_rates && audRes.data?.conversion_rates) {
        const newRates = {
          usdToInr: usdRes.data.conversion_rates.INR,
          audToInr: audRes.data.conversion_rates.INR,
          timestamp: new Date().getTime()
        };

        setRates(newRates);
        setError('');
        
        // Cache the rates and timestamp
        localStorage.setItem('exchangeRatesData', JSON.stringify(newRates));
        
        return newRates;
      } else {
        throw new Error('Invalid response from API');
      }
    } catch (err) {
      setError('Failed to fetch exchange rates');
      console.error('Error fetching exchange rates:', err);
      throw err;
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Fetch API key
      const response = await loadAllNotes();
      const notes = response.notes || [];
      
      const apiKeyNote = notes.find(note => {
        if (!note?.content) return false;
        const lines = note.content.split('\n');
        return lines.some(line => line.trim().includes('meta::api_key')) &&
               lines.some(line => line.trim().startsWith('exchangerate_api:'));
      });

      if (!apiKeyNote?.content) {
        setError("NO API Key");
        return;
      }

      const apiKeyLine = apiKeyNote.content.split('\n').find(line => line.trim().startsWith('exchangerate_api:'));
      if (!apiKeyLine) {
        setError("NO API Key");
        return;
      }

      const key = apiKeyLine.split('exchangerate_api:')[1].trim();
      setApiKey(key);
      
      // Fetch new rates
      await fetchRates(key);
    } catch (err) {
      setError('Failed to fetch exchange rates');
      console.error('Error fetching exchange rates:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Initialize component
  useEffect(() => {
    const initialize = async () => {
      try {
        // First check cache
        const cachedData = getCachedData();
        if (cachedData) {
          setRates(cachedData);
          setLoading(false);
          return;
        }

        // If no valid cache, fetch API key and rates
        const response = await loadAllNotes();
        const notes = response.notes || [];
        
        const apiKeyNote = notes.find(note => {
          if (!note?.content) return false;
          const lines = note.content.split('\n');
          return lines.some(line => line.trim().includes('meta::api_key')) &&
                 lines.some(line => line.trim().startsWith('exchangerate_api:'));
        });

        if (!apiKeyNote?.content) {
          setError("NO API Key");
          setLoading(false);
          return;
        }

        const apiKeyLine = apiKeyNote.content.split('\n').find(line => line.trim().startsWith('exchangerate_api:'));
        if (!apiKeyLine) {
          setError("NO API Key");
          setLoading(false);
          return;
        }

        const key = apiKeyLine.split('exchangerate_api:')[1].trim();
        setApiKey(key);

        // Fetch rates
        await fetchRates(key);
      } catch (err) {
        setError('Failed to fetch exchange rates');
        console.error('Error fetching exchange rates:', err);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, []);

  if (error) {
    return (
      <div className="p-4 rounded-md bg-red-50 border border-red-200 shadow-md w-fit">
        <p className="text-red-600">NO API Key</p>
        <p className="text-xs text-red-500 mt-2">
          To fix this, create a note with meta::api_key and add a line starting with 'exchangerate_api:'
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-4 rounded-md bg-gray-50 border border-gray-200 shadow-md w-fit">
        <p className="text-gray-600">Loading exchange rates...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative w-72 h-44">
        <div className="absolute w-full h-full p-4 rounded-md bg-gray-100 shadow-md">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-lg font-bold truncate">INR Exchange Rates</h2>
            <button 
              className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              title="Refresh rates"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <ArrowPathIcon className={`h-5 w-5 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="space-y-3">
            <div className="flex items-center">
              <span className="text-gray-600 text-sm">1 USD =</span>
              <span className="text-green-700 font-medium text-sm ml-1">₹{rates?.usdToInr?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex items-center">
              <span className="text-gray-600 text-sm">1 AUD =</span>
              <span className="text-green-700 font-medium text-sm ml-1">₹{rates?.audToInr?.toFixed(2) || '0.00'}</span>
            </div>
          </div>
          <div className="mt-4 text-xs text-gray-500 space-y-1">
            <div>API Calls Today: {apiCalls}</div>
            <div className="truncate max-w-[180px]">Last updated: {new Date(rates?.timestamp).toLocaleString()}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExchangeRates; 