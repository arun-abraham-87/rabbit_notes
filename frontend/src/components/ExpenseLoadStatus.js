import React, { useState } from 'react';
import { XMarkIcon, ExclamationTriangleIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

const ExpenseLoadStatus = ({ expenses, onClose }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [expandedMonths, setExpandedMonths] = useState(new Set());
  const years = [2023, 2024, 2025, 2026, 2027];
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // JavaScript months are 0-based
  const EXPECTED_SOURCES = 5;

  const toggleMonth = (monthKey) => {
    setExpandedMonths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(monthKey)) {
        newSet.delete(monthKey);
      } else {
        newSet.add(monthKey);
      }
      return newSet;
    });
  };

  // Group expenses by month
  const monthlyStatus = expenses.reduce((acc, expense) => {
    const [day, month, year] = expense.date.split('/').map(Number);
    const monthKey = `${year}-${month}`;
    
    if (!acc[monthKey]) {
      acc[monthKey] = {
        year,
        month,
        count: 0,
        debit: 0,
        credit: 0,
        sources: new Map()
      };
    }

    const sourceKey = `${expense.sourceType}-${expense.sourceName}`;
    if (!acc[monthKey].sources.has(sourceKey)) {
      acc[monthKey].sources.set(sourceKey, {
        sourceType: expense.sourceType,
        sourceName: expense.sourceName,
        count: 0,
        debit: 0,
        credit: 0
      });
    }

    const source = acc[monthKey].sources.get(sourceKey);
    source.count++;
    if (expense.amount < 0) {
      source.debit += Math.abs(expense.amount);
      acc[monthKey].debit += Math.abs(expense.amount);
    } else {
      source.credit += Math.abs(expense.amount);
      acc[monthKey].credit += Math.abs(expense.amount);
    }
    acc[monthKey].count++;

    return acc;
  }, {});

  // Get all months for the selected year
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Create an array of all months for the selected year
  const allMonthsForYear = months.map((monthName, index) => {
    const monthNumber = index + 1;
    // Skip months after current month if it's the current year
    if (selectedYear === currentYear && monthNumber > currentMonth) {
      return null;
    }
    
    const monthKey = `${selectedYear}-${monthNumber}`;
    const monthData = monthlyStatus[monthKey];
    const sourceCount = monthData ? monthData.sources.size : 0;
    const isComplete = sourceCount === EXPECTED_SOURCES;
    
    return {
      year: selectedYear,
      month: monthNumber,
      name: monthName,
      hasData: !!monthData,
      data: monthData,
      sourceCount,
      isComplete,
      monthKey
    };
  })
  .filter(month => month !== null) // Remove null entries
  .reverse(); // Reverse to show most recent months first

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Yearly Load Status</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="flex gap-2 mb-6">
          {years.map(year => (
            <button
              key={year}
              onClick={() => setSelectedYear(year)}
              className={`px-4 py-2 rounded-md transition-colors ${
                selectedYear === year
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
        
        <div className="space-y-2">
          {allMonthsForYear.map((monthInfo, index) => (
            <div key={index} className="bg-gray-50 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleMonth(monthInfo.monthKey)}
                className="w-full p-4 flex justify-between items-center hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {expandedMonths.has(monthInfo.monthKey) ? (
                    <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronRightIcon className="h-5 w-5 text-gray-500" />
                  )}
                  <h3 className="text-lg font-medium text-gray-900">
                    {monthInfo.name} {monthInfo.year}
                  </h3>
                </div>
                <div className={`text-sm font-medium ${monthInfo.isComplete ? 'text-green-600' : 'text-red-600'}`}>
                  Sources: {monthInfo.sourceCount}/{EXPECTED_SOURCES}
                </div>
              </button>
              
              <div className={`transition-all duration-300 ${expandedMonths.has(monthInfo.monthKey) ? 'max-h-[2000px]' : 'max-h-0 overflow-hidden'}`}>
                <div className="p-4">
                  {monthInfo.hasData ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source Type</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source Name</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction Count</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Debit</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credit</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {Array.from(monthInfo.data.sources.values()).map((source, sourceIndex) => (
                            <tr key={sourceIndex} className={sourceIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{source.sourceType}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{source.sourceName}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{source.count}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-red-600">${source.debit.toFixed(2)}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm text-green-600">${source.credit.toFixed(2)}</td>
                            </tr>
                          ))}
                          <tr className="bg-gray-100 font-bold">
                            <td colSpan="2" className="px-4 py-2 text-right text-sm text-gray-900">Total:</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{monthInfo.data.count}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-red-600">${monthInfo.data.debit.toFixed(2)}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-green-600">${monthInfo.data.credit.toFixed(2)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-red-600">
                      <ExclamationTriangleIcon className="h-5 w-5" />
                      <span>No Source loaded</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExpenseLoadStatus; 