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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Stock Information</h3>
              <StockPrice />
            </div>
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Exchange Rates</h3>
              <ExchangeRates />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockInfoPanel; 