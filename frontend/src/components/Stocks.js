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
  const [marketStatus, setMarketStatus] = useState('');
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

  // Add this function to check market status
  const checkMarketStatus = () => {
    const now = new Date();
    const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
    const day = etTime.getDay();
    const hour = etTime.getHours();
    const minute = etTime.getMinutes();
    
    // Check if it's a weekday (0 is Sunday, 6 is Saturday)
    if (day === 0 || day === 6) {
      const nextOpenDay = day === 0 ? 1 : 1; // Monday
      const daysUntilOpen = (nextOpenDay + 7 - day) % 7;
      setMarketStatus(`Market Closed (Weekend) - Opens in ${daysUntilOpen} days`);
      return;
    }
    
    // Convert current time to minutes for easier comparison
    const currentTimeInMinutes = hour * 60 + minute;
    const marketOpenTime = 9 * 60; // 9:00 AM
    const marketCloseTime = 16 * 60; // 4:00 PM
    
    if (currentTimeInMinutes >= marketOpenTime && currentTimeInMinutes < marketCloseTime) {
      const minutesUntilClose = marketCloseTime - currentTimeInMinutes;
      const hoursUntilClose = Math.floor(minutesUntilClose / 60);
      const remainingMinutes = minutesUntilClose % 60;
      setMarketStatus(`Market Open - Closes in ${hoursUntilClose}h ${remainingMinutes}m`);
    } else {
      let minutesUntilOpen;
      if (currentTimeInMinutes < marketOpenTime) {
        // Market opens later today
        minutesUntilOpen = marketOpenTime - currentTimeInMinutes;
      } else {
        // Market opens tomorrow
        minutesUntilOpen = (24 * 60 - currentTimeInMinutes) + marketOpenTime;
      }
      const hoursUntilOpen = Math.floor(minutesUntilOpen / 60);
      const remainingMinutes = minutesUntilOpen % 60;
      setMarketStatus(`Market Closed - Opens in ${hoursUntilOpen}h ${remainingMinutes}m`);
    }
  };

  // Add market status check to useEffect
  useEffect(() => {
    checkMarketStatus();
    // Update market status every minute
    const interval = setInterval(checkMarketStatus, 60000);
    return () => clearInterval(interval);
  }, []);

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
          <div className="text-gray-500 text-sm">Loading...</div>
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
    <div className="w-full group relative">
      {/* Collapsed View - Essential Info Only (Wide Format) */}
      <div className="bg-white rounded-lg p-2 border flex items-center justify-between group-hover:opacity-0 group-hover:pointer-events-none transition-opacity duration-200 delay-300">
        <div className="flex items-center gap-4 flex-1">
          <div>
            <div className="text-xs text-gray-500">{SYMBOL} Stock</div>
            <div className="text-xl font-bold text-green-700">${price?.toFixed(2)}</div>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-600">
            <div>
              <span className="text-gray-500">Total Value:</span> ${totalValue.toFixed(2)}
            </div>
            <div className={marketStatus.includes('Open') ? 'text-green-600' : 'text-red-600'}>
              {marketStatus.split(' - ')[0]}
            </div>
          </div>
        </div>
        <button 
          className="p-1 text-gray-600 hover:text-gray-800 disabled:opacity-50"
          title="Refresh price"
          onClick={(e) => {
            e.stopPropagation();
            handleRefresh();
          }}
          disabled={isRefreshing}
        >
          <ArrowPathIcon className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Expanded View - Full Details (Shown on Hover) */}
      <div className="opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity duration-200 delay-300 absolute top-0 left-0 right-0 z-10 bg-white rounded-lg p-2 border shadow-lg">
        <div className="space-y-4">
          <div className="relative w-64 min-h-[160px]">
            {/* Front of card */}
            <div 
              className={`w-full p-4 rounded-md bg-gray-100 shadow-md ${
                isFlipped ? 'opacity-0 pointer-events-none absolute' : 'opacity-100 relative'
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
                  <ArrowPathIcon className="h-5 w-5 text-gray-600" />
                </button>
              </div>
              <div className="mt-2 text-xs text-gray-600">
                <p>API Calls Today: {apiCalls}</p>
                <p>Last Updated: {new Date(JSON.parse(localStorage.getItem('stockPriceData') || '{"timestamp":0}').timestamp).toLocaleString()}</p>
                <p className={`mt-1 ${marketStatus.includes('Open') ? 'text-green-600' : 'text-red-600'}`}>
                  {marketStatus}
                </p>
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
              className={`w-full p-4 rounded-md bg-gray-100 shadow-md ${
                isFlipped ? 'opacity-100 relative' : 'opacity-0 pointer-events-none absolute'
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
