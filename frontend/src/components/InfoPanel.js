import React, { useState } from "react";


const InfoPanel = ({ totals, grpbyViewChkd, enableGroupByView, compressedView, setCompressedView }) => {
  
  const handleCheckboxChange = (event) => {
    enableGroupByView(event.target.checked);
  };

  const handleCompressedViewChange = (event) => {
    setCompressedView(event.target.checked);
  };

  return (
    <div className="flex justify-between items-center px-4 py-2 mb-4 mt-4 bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-center space-x-4">
        <p className="text-sm text-gray-700">Total: {totals.total || 0}</p>
        <p className="text-sm text-gray-700">Events: {totals.events || 0}</p>
        <p className="text-sm text-gray-700">Meetings: {totals.meetings || 0}</p>
        <p className="text-sm text-gray-700">Todos: {totals.todos || 0}</p>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={grpbyViewChkd}
              onChange={handleCheckboxChange}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            <span className="ml-2 text-sm text-gray-700">Group By Date View</span>
          </label>
        </div>

        <div className="flex items-center space-x-2">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={compressedView}
              onChange={handleCompressedViewChange}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            <span className="ml-2 text-sm text-gray-700">Compressed View</span>
          </label>
        </div>
      </div>
    </div>
  )
};

export default InfoPanel;
