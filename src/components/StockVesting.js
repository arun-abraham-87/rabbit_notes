import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNodes } from '../context/NodesContext';

const StockVesting = () => {
  const { nodes } = useNodes();
  const [vestingData, setVestingData] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const stockVestingNodes = nodes.filter(node => 
      node.metadata && node.metadata.stock_vesting_data
    );

    const processedData = stockVestingNodes.map(node => {
      const lines = node.content.split('\n');
      const header = lines[0]; // First line is header, we'll ignore it
      const dataLines = lines.slice(1); // Rest of the lines contain the data

      return {
        nodeId: node.id,
        data: dataLines.map(line => {
          const [date, shares, price] = line.split(',').map(item => item.trim());
          return { date, shares, price };
        })
      };
    });

    setVestingData(processedData);
  }, [nodes]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Stock Vesting Schedule</h1>
      {vestingData.map((nodeData, index) => (
        <div key={nodeData.nodeId} className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Vesting Schedule {index + 1}</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-6 py-3 border-b text-left">Date</th>
                  <th className="px-6 py-3 border-b text-left">Shares</th>
                  <th className="px-6 py-3 border-b text-left">Price</th>
                </tr>
              </thead>
              <tbody>
                {nodeData.data.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-gray-50">
                    <td className="px-6 py-4 border-b">{row.date}</td>
                    <td className="px-6 py-4 border-b">{row.shares}</td>
                    <td className="px-6 py-4 border-b">{row.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StockVesting; 