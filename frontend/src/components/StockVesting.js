import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const StockVesting = ({ notes }) => {
  const [vestingData, setVestingData] = useState([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const stockVestingNodes = notes.filter(note => 
      note.content && note.content.includes('meta::stock_vesting_data')
    );

    const processedData = stockVestingNodes.map(note => {
      try {
        const lines = note.content.split('\n');
        const header = lines[0]; // First line is header, we'll ignore it
        const dataLines = lines.slice(1); // Rest of the lines contain the data

        const data = dataLines
          .filter(line => line.trim()) // Remove empty lines
          .map(line => {
            const [
              vestPeriod,
              vestDate,
              grantDate,
              grantQuantity,
              vestQuantity,
              unvestQuantity,
              releaseQuantity
            ] = line.split(',').map(item => item.trim());
            
            return {
              vestPeriod: vestPeriod || '',
              vestDate: vestDate || '',
              grantDate: grantDate || '',
              grantQuantity: parseFloat(grantQuantity) || 0,
              vestQuantity: parseFloat(vestQuantity) || 0,
              unvestQuantity: parseFloat(unvestQuantity) || 0,
              releaseQuantity: parseFloat(releaseQuantity) || 0
            };
          });

        if (data.length === 0) {
          return null;
        }

        // Calculate totals
        const totals = data.reduce((acc, row) => ({
          grantQuantity: acc.grantQuantity + (row.grantQuantity || 0),
          vestQuantity: acc.vestQuantity + (row.vestQuantity || 0),
          unvestQuantity: acc.unvestQuantity + (row.unvestQuantity || 0)
        }), {
          grantQuantity: 0,
          vestQuantity: 0,
          unvestQuantity: 0
        });

        // Get grant date from first row (should be same for all rows)
        const grantDate = data[0]?.grantDate || 'Unknown';

        // Find the maximum vest date from the Vest Date column
        const lastVestDate = data
          .map(row => row.vestDate)
          .filter(Boolean) // Remove empty dates
          .reduce((max, date) => {
            // Parse DDMMYYYY format
            const [day, month, year] = date.split('/').map(Number);
            const currentDate = new Date(year, month - 1, day); // month is 0-based in JS Date
            
            if (!max) return date;
            
            const [maxDay, maxMonth, maxYear] = max.split('/').map(Number);
            const maxDate = new Date(maxYear, maxMonth - 1, maxDay);
            
            return currentDate > maxDate ? date : max;
          }, null) || '-';

        return {
          nodeId: note.id,
          title: note.title || 'Untitled Schedule',
          grantDate,
          lastVestDate,
          totals,
          data
        };
      } catch (error) {
        console.error('Error processing note:', error);
        return null;
      }
    }).filter(Boolean); // Remove any null entries

    setVestingData(processedData);
  }, [notes]);

  if (!vestingData || vestingData.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Stock Vesting Schedules</h1>
        <div className="text-center text-gray-500 mt-8">
          No stock vesting data found. Add a note with 'meta::stock_vesting_data' tag to see your vesting schedule.
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Stock Vesting Schedules</h1>
      {vestingData.map((schedule) => (
        <div key={schedule.nodeId} className="mb-8">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">{schedule.title}</h2>
            <p className="text-gray-600">Grant Date: {schedule.grantDate}</p>
          </div>
          
          {/* Totals Summary */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500">Total Grant</h3>
              <p className="text-lg font-semibold">{schedule.totals.grantQuantity.toLocaleString()}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500">Total Vested</h3>
              <p className="text-lg font-semibold">{schedule.totals.vestQuantity.toLocaleString()}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500">Total Unvested</h3>
              <p className="text-lg font-semibold">{schedule.totals.unvestQuantity.toLocaleString()}</p>
            </div>
          </div>

          {/* Collapse/Expand Button */}
          <div className="mb-4">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              {isCollapsed ? 'Expand Details' : 'Collapse Details'}
            </button>
          </div>

          {/* Detailed Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  {!isCollapsed && (
                    <>
                      <th className="px-6 py-3 border-b text-left">Vest Period</th>
                      <th className="px-6 py-3 border-b text-left">Vest Date</th>
                    </>
                  )}
                  <th className="px-6 py-3 border-b text-left">Grant Date</th>
                  {isCollapsed && (
                    <th className="px-6 py-3 border-b text-left">Last Vest Date</th>
                  )}
                  <th className="px-6 py-3 border-b text-left">Grant Quantity</th>
                  <th className="px-6 py-3 border-b text-left">Vest Quantity</th>
                  <th className="px-6 py-3 border-b text-left">Unvest Quantity</th>
                  <th className="px-6 py-3 border-b text-left">Release Quantity</th>
                </tr>
              </thead>
              <tbody>
                {isCollapsed ? (
                  // Collapsed view - single row with summed values
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 border-b">{schedule.grantDate}</td>
                    <td className="px-6 py-4 border-b">{schedule.lastVestDate}</td>
                    <td className="px-6 py-4 border-b">{schedule.totals.grantQuantity.toLocaleString()}</td>
                    <td className="px-6 py-4 border-b">{schedule.totals.vestQuantity.toLocaleString()}</td>
                    <td className="px-6 py-4 border-b">{schedule.totals.unvestQuantity.toLocaleString()}</td>
                    <td className="px-6 py-4 border-b">
                      {schedule.data.reduce((sum, row) => sum + row.releaseQuantity, 0).toLocaleString()}
                    </td>
                  </tr>
                ) : (
                  // Expanded view - all rows
                  schedule.data.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-50">
                      <td className="px-6 py-4 border-b">{row.vestPeriod}</td>
                      <td className="px-6 py-4 border-b">{row.vestDate}</td>
                      <td className="px-6 py-4 border-b">{row.grantDate}</td>
                      <td className="px-6 py-4 border-b">{row.grantQuantity.toLocaleString()}</td>
                      <td className="px-6 py-4 border-b">{row.vestQuantity.toLocaleString()}</td>
                      <td className="px-6 py-4 border-b">{row.unvestQuantity.toLocaleString()}</td>
                      <td className="px-6 py-4 border-b">{row.releaseQuantity.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StockVesting; 