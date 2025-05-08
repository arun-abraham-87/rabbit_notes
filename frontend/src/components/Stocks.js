// src/components/StockPrice.js
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { loadAllNotes } from '../utils/ApiUtils';
import { InformationCircleIcon, ArrowPathIcon, XMarkIcon } from '@heroicons/react/24/outline';

const SYMBOL = 'XYZ'; // e.g., Apple Inc.

const StockPrice = () => {
  const [price, setPrice] = useState(null);
  const [error, setError] = useState('');
  const [apiKey, setApiKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiCalls, setApiCalls] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [shares, setShares] = useState(() => {
    const savedShares = localStorage.getItem('stockShares');
    return savedShares ? parseInt(savedShares, 10) : 100;
  });
  const [multiplier, setMultiplier] = useState(() => {
    const savedMultiplier = localStorage.getItem('stockMultiplier');
    return savedMultiplier ? parseFloat(savedMultiplier) : 1.0;
  });
  const [totalValue, setTotalValue] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const [tempValue, setTempValue] = useState('');
  const [editingField, setEditingField] = useState(null); // 'shares' or 'multiplier'

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

  // Update total value when price, shares, or multiplier changes
  useEffect(() => {
    if (price !== null) {
      setTotalValue(shares * price * multiplier);
    }
  }, [price, shares, multiplier]);

  // Save values to localStorage when they change
  useEffect(() => {
    localStorage.setItem('stockShares', shares.toString());
  }, [shares]);

  useEffect(() => {
    localStorage.setItem('stockMultiplier', multiplier.toString());
  }, [multiplier]);

  const handleValueSubmit = (e) => {
    e.preventDefault();
    const newValue = parseFloat(tempValue);
    if (!isNaN(newValue) && newValue > 0) {
      if (editingField === 'shares') {
        setShares(Math.floor(newValue)); // Ensure integer for shares
      } else {
        setMultiplier(newValue);
      }
      setShowPopup(false);
    }
  };

  const openEditPopup = (field, value) => {
    setEditingField(field);
    setTempValue(value.toString());
    setShowPopup(true);
  };

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
      <div className="relative w-64 h-40">
        {/* Front of card */}
        <div 
          className={`absolute w-full h-full p-4 rounded-md bg-gray-100 shadow-md transition-all duration-500 ${
            isFlipped ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          <div className="mb-2">
            <h2 className="text-lg font-bold">{SYMBOL} Stock Price</h2>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-green-700 text-xl">${price?.toFixed(2)}</p>
            <button 
              className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              title="Refresh price"
              onClick={(e) => {
                e.stopPropagation();
                handleRefresh();
              }}
              disabled={isRefreshing}
            >
              <ArrowPathIcon className={`h-5 w-5 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <div className="mt-2 text-xs text-gray-600">
            <p>API Calls Today: {apiCalls}</p>
            <p>Last Updated: {new Date(JSON.parse(localStorage.getItem('stockPriceData') || '{"timestamp":0}').timestamp).toLocaleString()}</p>
          </div>
          <button 
            className="absolute top-2 right-2 p-1 hover:bg-gray-200 rounded-full transition-colors"
            onClick={() => setIsFlipped(true)}
          >
            <InformationCircleIcon className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        {/* Back of card */}
        <div 
          className={`absolute w-full h-full p-4 rounded-md bg-gray-100 shadow-md transition-all duration-500 ${
            isFlipped ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Total Assets</h2>
            <button 
              className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              onClick={() => setIsFlipped(false)}
              title="Flip back"
            >
              <XMarkIcon className="h-5 w-5 text-gray-600" />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600">Calculation</p>
              <p className="text-lg font-mono">
                <span 
                  className="cursor-pointer hover:text-blue-600 transition-colors"
                  onClick={() => openEditPopup('shares', shares)}
                >
                  {shares}
                </span>
                {' × $'}{price?.toFixed(2)}
                {' × '}
                <span 
                  className="cursor-pointer hover:text-blue-600 transition-colors"
                  onClick={() => openEditPopup('multiplier', multiplier)}
                >
                  {multiplier.toFixed(2)}
                </span>
                {' = $'}{totalValue.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Popup for editing values */}
      {showPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl">
            <h3 className="text-lg font-bold mb-4">
              Edit {editingField === 'shares' ? 'Number of Shares' : 'Multiplier'}
            </h3>
            <form onSubmit={handleValueSubmit}>
              <input
                type="number"
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                className="w-full p-2 border rounded mb-4"
                min="0.01"
                step={editingField === 'shares' ? "1" : "0.01"}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPopup(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockPrice;

// Add these styles to your CSS
const styles = `
.perspective-1000 {
  perspective: 1000px;
}

.transform-style-3d {
  transform-style: preserve-3d;
}

.backface-hidden {
  backface-visibility: hidden;
}

.rotate-y-180 {
  transform: rotateY(180deg);
}
`;
