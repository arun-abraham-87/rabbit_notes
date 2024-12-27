import React, { useState } from "react";


const InfoPanel = ({ totals, grpbyViewChkd, enableGroupByView }) => {
  
  const handleCheckboxChange = (event) => {
    enableGroupByView(event.target.checked);
  };

  return (
    <div className="flex justify-between items-center mb-4">
      <p>Count: {totals}</p>

      <div>
        <label>
          <input
            type="checkbox"
            checked={grpbyViewChkd}
            onChange={handleCheckboxChange}
          />
           <span className="pl-4">Group By Date View</span>
        </label>
      </div>

    </div>
  )
};

export default InfoPanel;
