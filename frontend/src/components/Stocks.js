// src/components/StockPrice.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { loadAllNotes } from '../utils/ApiUtils';
import { InformationCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

const SYMBOL = 'XYZ'; // e.g., Apple Inc.

const StockPrice = () => {
  const [price, setPrice] = useState(null);
  const [error, setError] = useState('');
  const [apiKey, setApiKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiCalls, setApiCalls] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initialize or update API call count
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const storedData = localStorage.getItem('apifinncalldata');
    let apiCallData = { date: today, count: 0 };

    if (storedData) {
      const parsedData = JSON.parse(storedData);
      if (parsedData.date === today) {
        apiCallData = parsedData;
      }
    }

    setApiCalls(apiCallData.count);
  }, []);

  const fetchStockPrice = async (key) => {
    try {
      const res = await axios.get(`https://finnhub.io/api/v1/quote?symbol=${SYMBOL}&token=${key}`);
      if (res.data && res.data.c !== undefined) {
        const newPrice = res.data.c;
        setPrice(newPrice);
        setError('');
        
        // Cache the price and timestamp
        localStorage.setItem('stockPriceData', JSON.stringify({
          timestamp: new Date().getTime(),
          price: newPrice
        }));
        
        // Update API call count
        const today = new Date().toISOString().split('T')[0];
        const storedData = localStorage.getItem('apifinncalldata');
        let apiCallData = { date: today, count: 0 };

        if (storedData) {
          const parsedData = JSON.parse(storedData);
          if (parsedData.date === today) {
            apiCallData = parsedData;
          }
        }

        apiCallData.count += 1;
        localStorage.setItem('apifinncalldata', JSON.stringify(apiCallData));
        setApiCalls(apiCallData.count);
      } else {
        setError('Invalid response from API');
      }
    } catch (err) {
      setError('Failed to fetch stock price');
      console.error('Error fetching stock price:', err);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Fetch API key
      const response = await loadAllNotes();
      const notes = response.notes || [];
      
      const apiKeyNote = notes.find(note => {
        if (!note?.content) {
          return false;
        }
        const lines = note.content.split('\n');
        
        const hasMetaTag = lines.some(line => {
          const trimmed = line.trim();
          return trimmed.includes('meta::api_key');
        });
        
        const hasApiKey = lines.some(line => {
          const trimmed = line.trim();
          return trimmed.startsWith('finnhub_api:');
        });
        
        return hasMetaTag && hasApiKey;
      });

      if (!apiKeyNote || !apiKeyNote.content) {
        setError("NO API Key");
        return;
      }

      const apiKeyLine = apiKeyNote.content.split('\n').find(line => line.trim().startsWith('finnhub_api:'));
      if (!apiKeyLine) {
        setError("NO API Key");
        return;
      }

      const key = apiKeyLine.split('finnhub_api:')[1].trim();
      setApiKey(key);
      
      // Fetch new price
      await fetchStockPrice(key);
    } catch (err) {
      setError('Failed to fetch stock price');
      console.error('Error fetching stock price:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Fetch API key and price on startup
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check if we have cached data that's less than 24 hours old
        const cachedData = localStorage.getItem('stockPriceData');
        if (cachedData) {
          const { timestamp, price: cachedPrice } = JSON.parse(cachedData);
          const now = new Date().getTime();
          const hoursSinceLastUpdate = (now - timestamp) / (1000 * 60 * 60);
          
          if (hoursSinceLastUpdate < 24) {
            setPrice(cachedPrice);
            setLoading(false);
            return;
          }
        }

        // First fetch the API key
        const response = await loadAllNotes();
        const notes = response.notes || [];
        
        const apiKeyNote = notes.find(note => {
          if (!note?.content) {
            return false;
          }
          const lines = note.content.split('\n');
          
          const hasMetaTag = lines.some(line => {
            const trimmed = line.trim();
            return trimmed.includes('meta::api_key');
          });
          
          const hasApiKey = lines.some(line => {
            const trimmed = line.trim();
            return trimmed.startsWith('finnhub_api:');
          });
          
          return hasMetaTag && hasApiKey;
        });

        if (!apiKeyNote) {
          setError("NO API Key");
          setLoading(false);
          return;
        }

        if (!apiKeyNote.content) {
          setError("NO API Key");
          setLoading(false);
          return;
        }

        const apiKeyLine = apiKeyNote.content.split('\n').find(line => line.trim().startsWith('finnhub_api:'));
        if (!apiKeyLine) {
          setError("NO API Key");
          setLoading(false);
          return;
        }

        const key = apiKeyLine.split('finnhub_api:')[1].trim();
        setApiKey(key);

        // Then fetch the stock price
        await fetchStockPrice(key);
      } catch (err) {
        setError('Failed to fetch stock price');
        console.error('Error fetching stock price:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="p-4 rounded-md bg-gray-100 shadow-md w-fit">
        <div className="flex items-center justify-center h-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-md bg-red-50 border border-red-200 shadow-md w-fit">
        <p className="text-red-600">NO API Key</p>
        <p className="text-xs text-red-500 mt-2">
          To fix this, create a note with meta::api_key and add a line starting with 'finnhub_api:'
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* API Usage Card */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
        <InformationCircleIcon className="h-5 w-5 text-blue-500" />
        <div>
          <p className="text-sm text-blue-700">
            API calls today: <span className="font-semibold">{apiCalls}</span>
          </p>
          <p className="text-xs text-blue-600">
            Resets daily at midnight
          </p>
        </div>
      </div>

      {/* Stock Price Card */}
      <div className="p-4 rounded-md bg-gray-100 shadow-md w-fit">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-bold">{SYMBOL} Stock Price</h2>
          <button 
            className="p-1 hover:bg-gray-200 rounded-full transition-colors"
            title="Refresh price"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <ArrowPathIcon className={`h-5 w-5 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
        {error ? (
          <p className="text-red-600">NO API Key</p>
        ) : (
          <>
            <p className="text-green-700 text-xl">${price?.toFixed(2)}</p>
            <div className="mt-2 text-xs text-gray-600">
              <p>API Calls Today: {apiCalls}</p>
              <p>Last Updated: {new Date(JSON.parse(localStorage.getItem('stockPriceData') || '{"timestamp":0}').timestamp).toLocaleString()}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StockPrice;
