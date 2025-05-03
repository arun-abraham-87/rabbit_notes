// src/components/StockPrice.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { loadAllNotes } from '../utils/ApiUtils';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

const SYMBOL = 'XYZ'; // e.g., Apple Inc.

const StockPrice = () => {
  const [price, setPrice] = useState(null);
  const [error, setError] = useState('');
  const [apiKey, setApiKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiCalls, setApiCalls] = useState(0);

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

    console.log('update apiCallData');
    setApiCalls(apiCallData.count);
  }, []);

  // Fetch API key and price on startup
  useEffect(() => {
    const fetchData = async () => {
      try {
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
          setError("API key not found. Please create a note with meta::api_key and a line starting with 'finnhub_api:'");
          setLoading(false);
          return;
        }

        if (!apiKeyNote.content) {
          setError("API key not found. Please add a line starting with 'finnhub_api:' to the note with meta::api_key");
          setLoading(false);
          return;
        }

        const apiKeyLine = apiKeyNote.content.split('\n').find(line => line.trim().startsWith('finnhub_api:'));
        if (!apiKeyLine) {
          setError("API key not found. Please add a line starting with 'finnhub_api:' to the note with meta::api_key");
          setLoading(false);
          return;
        }

        const key = apiKeyLine.split('finnhub_api:')[1].trim();
        setApiKey(key);

        // Then fetch the stock price
        const res = await axios.get(`https://finnhub.io/api/v1/quote?symbol=${SYMBOL}&token=${key}`);
        if (res.data && res.data.c !== undefined) {
          setPrice(res.data.c);
          setError('');
          
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
          console.log('update apiCallData');
          setApiCalls(apiCallData.count);
        } else {
          setError('Invalid response from API');
        }
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
        <p className="text-red-600">{error}</p>
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
        <h2 className="text-lg font-bold">{SYMBOL} Stock Price</h2>
        {error ? (
          <p className="text-red-600">{error}</p>
        ) : (
          <p className="text-green-700 text-xl">${price?.toFixed(2)}</p>
        )}
      </div>
    </div>
  );
};

export default StockPrice;
