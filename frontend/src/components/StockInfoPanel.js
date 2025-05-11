import React, { useState } from 'react';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import StockPrice from './Stocks';
import ExchangeRates from './ExchangeRates';

const StockInfoPanel = () => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="relative">
      <button
        className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
        onMouseEnter={() => setIsHovered(true)}
      >
        <InformationCircleIcon className="h-5 w-5" />
      </button>

      {isHovered && (
        <div 
          className="absolute right-0 mt-2 w-screen max-w-4xl bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Stock Information</h3>
              <StockPrice />
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Exchange Rates</h3>
              <ExchangeRates />
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Market Overview</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">S&P 500</p>
                  <p className="text-lg font-medium text-green-600">4,783.45</p>
                  <p className="text-sm text-green-500">+1.2%</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Dow Jones</p>
                  <p className="text-lg font-medium text-green-600">37,305.16</p>
                  <p className="text-sm text-green-500">+0.8%</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Nasdaq</p>
                  <p className="text-lg font-medium text-green-600">14,963.23</p>
                  <p className="text-sm text-green-500">+1.5%</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Bitcoin</p>
                  <p className="text-lg font-medium text-red-600">$42,123</p>
                  <p className="text-sm text-red-500">-2.1%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockInfoPanel; 