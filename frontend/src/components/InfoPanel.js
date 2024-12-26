import React from 'react';

const InfoPanel = ({ totals }) => (
  <div className="flex justify-between items-center mb-4">
    <p>Count: {totals}</p>
  </div>
);

export default InfoPanel;
