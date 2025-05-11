import React, { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

const Assets = () => {
  const [assets, setAssets] = useState(() => {
    const savedAssets = localStorage.getItem('assets');
    return savedAssets ? JSON.parse(savedAssets) : [
      { id: 1, name: '', amount: '', conversion: 1 }
    ];
  });

  const [monthlyExpense, setMonthlyExpense] = useState(() => {
    return localStorage.getItem('monthlyExpense') || '';
  });

  // Save to localStorage whenever assets or monthlyExpense changes
  useEffect(() => {
    localStorage.setItem('assets', JSON.stringify(assets));
    localStorage.setItem('monthlyExpense', monthlyExpense);
  }, [assets, monthlyExpense]);

  const addNewRow = () => {
    const newId = Math.max(...assets.map(a => a.id), 0) + 1;
    setAssets([...assets, { id: newId, name: '', amount: '', conversion: 1 }]);
  };

  const deleteRow = (id) => {
    if (assets.length > 1) {
      setAssets(assets.filter(asset => asset.id !== id));
    }
  };

  const updateAsset = (id, field, value) => {
    setAssets(assets.map(asset => 
      asset.id === id ? { ...asset, [field]: value } : asset
    ));
  };

  const calculateTotal = () => {
    return assets.reduce((total, asset) => {
      const amount = parseFloat(asset.amount) || 0;
      const conversion = parseFloat(asset.conversion) || 1;
      return total + (amount * conversion);
    }, 0);
  };

  const calculateMonthsToSurvive = () => {
    const total = calculateTotal();
    const expense = parseFloat(monthlyExpense) || 0;
    if (expense <= 0) return 0;
    return Math.floor(total / expense);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Assets</h1>
        <p className="text-gray-600">Track and manage your assets with real-time conversion</p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Conversion</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {assets.map((asset) => (
                <tr key={asset.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="text"
                      value={asset.name}
                      onChange={(e) => updateAsset(asset.id, 'name', e.target.value)}
                      className="w-full border-0 focus:ring-0 bg-transparent"
                      placeholder="Asset name"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      value={asset.amount}
                      onChange={(e) => updateAsset(asset.id, 'amount', e.target.value)}
                      className="w-full border-0 focus:ring-0 bg-transparent"
                      placeholder="0.00"
                      step="0.01"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="number"
                      value={asset.conversion}
                      onChange={(e) => updateAsset(asset.id, 'conversion', e.target.value)}
                      className="w-full border-0 focus:ring-0 bg-transparent"
                      placeholder="1.00"
                      step="0.01"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                    {((parseFloat(asset.amount) || 0) * (parseFloat(asset.conversion) || 1)).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => deleteRow(asset.id)}
                      className="text-red-600 hover:text-red-900"
                      disabled={assets.length === 1}
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold">
                <td className="px-6 py-4 whitespace-nowrap">Total</td>
                <td className="px-6 py-4 whitespace-nowrap"></td>
                <td className="px-6 py-4 whitespace-nowrap"></td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                  {calculateTotal().toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Expense</label>
            <input
              type="number"
              value={monthlyExpense}
              onChange={(e) => setMonthlyExpense(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Months I Can Survive</label>
            <div className="text-2xl font-bold text-gray-900">
              {calculateMonthsToSurvive()} months
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <button
          onClick={addNewRow}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Asset
        </button>
      </div>
    </div>
  );
};

export default Assets; 