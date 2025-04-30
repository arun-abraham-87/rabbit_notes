import React, { useState } from "react";


const InfoPanel = ({ totals, grpbyViewChkd, enableGroupByView }) => {
  
  const handleCheckboxChange = (event) => {
    enableGroupByView(event.target.checked);
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
          <input
            type="checkbox"
            checked={grpbyViewChkd}
            onChange={handleCheckboxChange}
            title="Toggle Group By Date View"
            className="accent-purple-600 w-4 h-4 rounded border-gray-300 focus:ring-purple-500"
          />
          <span className="text-sm text-gray-700">Group By Date View</span>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            title="Toggle Compressed View"
            className="accent-purple-600 w-4 h-4 rounded border-gray-300 focus:ring-purple-500"
          />
          <span className="text-sm text-gray-700">Compressed View</span>
        </div>
      </div>
    </div>
  )
};

export default InfoPanel;
