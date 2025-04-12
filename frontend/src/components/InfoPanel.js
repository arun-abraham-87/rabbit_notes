import React, { useState } from "react";


const InfoPanel = ({ totals, grpbyViewChkd, enableGroupByView }) => {
  
  const handleCheckboxChange = (event) => {
    enableGroupByView(event.target.checked);
  };

  return (
    <div className="flex justify-between items-center px-4 py-2 mb-4 mt-4 bg-white rounded-lg border border-gray-200 shadow-sm">
      <p className="text-sm text-gray-700">Count: {totals}</p>

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

    </div>
  )
};

export default InfoPanel;
