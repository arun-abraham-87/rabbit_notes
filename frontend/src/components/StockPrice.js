import React, { useState, useEffect } from 'react';

const StockPrice = () => {
  const [stockData, setStockData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStockData = async () => {
      try {
        // TODO: Replace with actual API call
        // This is a mock response for demonstration
        const mockData = {
          symbol: 'AAPL',
          price: 175.23,
          change: 2.34,
          changePercent: 1.35
        };
        setStockData(mockData);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch stock data');
        setLoading(false);
      }
    };

    fetchStockData();
    const interval = setInterval(fetchStockData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse flex items-center space-x-2">
        <div className="h-4 w-20 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 text-sm">{error}</div>;
  }

  return (
    <div className="flex items-center space-x-4">
      <div className="text-sm">
        <span className="font-medium">{stockData.symbol}</span>
        <span className="ml-2">${stockData.price.toFixed(2)}</span>
        <span className={`ml-2 ${stockData.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
          {stockData.change >= 0 ? '+' : ''}{stockData.change.toFixed(2)} ({stockData.changePercent.toFixed(2)}%)
        </span>
      </div>
    </div>
  );
};

export default StockPrice; 