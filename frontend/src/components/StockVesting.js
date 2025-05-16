import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAgeInStringFmt } from '../utils/DateUtils';

const StockVesting = ({ notes }) => {
  const [vestingData, setVestingData] = useState([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showUnvestedOnly, setShowUnvestedOnly] = useState(false);
  const navigate = useNavigate();

  const formatDateWithMonthName = (dateStr) => {
    if (!dateStr || dateStr === '-' || dateStr === 'Unknown') return dateStr;
    const [day, month, year] = dateStr.split('/');
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    return `${day}/${monthNames[parseInt(month) - 1]}/${year}`;
  };

  const isDateInPast = (dateStr) => {
    if (!dateStr || dateStr === '-' || dateStr === 'Unknown') return false;
    const [day, month, year] = dateStr.split('/');
    const date = new Date(year, parseInt(month) - 1, day);
    return date <= new Date();
  };

  const getDateColor = (dateStr) => {
    if (!dateStr || dateStr === '-' || dateStr === 'Unknown') return 'text-gray-500';
    return isDateInPast(dateStr) ? 'text-red-500' : 'text-green-500';
  };

  const calculateQuantities = (row) => {
    const isVested = isDateInPast(row.vestDate);
    return {
      ...row,
      vestQuantity: isVested ? row.grantQuantity : 0,
      unvestQuantity: isVested ? 0 : row.grantQuantity
    };
  };

  useEffect(() => {
    const stockVestingNodes = notes.filter(note => 
      note.content && note.content.includes('meta::stock_vesting_data')
    );

    const processedData = stockVestingNodes.map(note => {
      try {
        const lines = note.content.split('\n');
        // Skip the meta tag line, header line, and any empty lines
        const dataLines = lines
          .filter((line, index) => {
            // Skip first line (header) and meta tag line
            if (index === 0 || line.includes('meta::stock_vesting_data')) {
              return false;
            }
            return line.trim();
          });

        const data = dataLines
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
            
            const baseRow = {
              vestPeriod: vestPeriod || '',
              vestDate: vestDate || '',
              grantDate: grantDate || '',
              grantQuantity: parseFloat(grantQuantity) || 0,
              releaseQuantity: parseFloat(releaseQuantity) || 0
            };

            return calculateQuantities(baseRow);
          });

        if (data.length === 0) {
          return null;
        }

        // Calculate totals
        const totals = data.reduce((acc, row) => ({
          grantQuantity: acc.grantQuantity + row.grantQuantity,
          vestQuantity: acc.vestQuantity + row.vestQuantity,
          unvestQuantity: acc.unvestQuantity + row.unvestQuantity
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

        // Find the next vesting date and quantity
        const today = new Date();
        const nextVest = data
          .filter(row => {
            if (!row.vestDate) return false;
            const [day, month, year] = row.vestDate.split('/');
            const vestDate = new Date(year, parseInt(month) - 1, day);
            return vestDate > today;
          })
          .sort((a, b) => {
            const [aDay, aMonth, aYear] = a.vestDate.split('/');
            const [bDay, bMonth, bYear] = b.vestDate.split('/');
            const aDate = new Date(aYear, parseInt(aMonth) - 1, aDay);
            const bDate = new Date(bYear, parseInt(bMonth) - 1, bDay);
            return aDate - bDate;
          })[0];

        // Count remaining vestings
        const remainingVestings = data.filter(row => {
          if (!row.vestDate) return false;
          const [day, month, year] = row.vestDate.split('/');
          const vestDate = new Date(year, parseInt(month) - 1, day);
          return vestDate > today;
        }).length;

        return {
          nodeId: note.id,
          title: note.title || 'Untitled Schedule',
          grantDate,
          lastVestDate,
          nextVest: nextVest ? {
            date: nextVest.vestDate,
            quantity: nextVest.unvestQuantity
          } : null,
          remainingVestings,
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
          <div className="grid grid-cols-4 gap-4 mb-4">
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
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500">Next Vest</h3>
              {schedule.nextVest ? (
                <>
                  <div className="mt-2">
                    <span className="text-gray-600">Date: </span>
                    <span className="text-green-500">
                      {formatDateWithMonthName(schedule.nextVest.date)}
                    </span>
                    <span className="text-gray-500 ml-2">
                      ({getAgeInStringFmt(schedule.nextVest.date)})
                    </span>
                  </div>
                  <div className="mt-2">
                    <span className="text-gray-600">Quantity: </span>
                    <span>
                      {schedule.nextVest.quantity.toLocaleString()}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-gray-500 mt-2">No upcoming vests</p>
              )}
            </div>
          </div>

          {/* Collapse/Expand Button */}
          <div className="mb-4 flex gap-4">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              {isCollapsed ? 'Expand Details' : 'Collapse Details'}
            </button>
            {!isCollapsed && (
              <button
                onClick={() => setShowUnvestedOnly(!showUnvestedOnly)}
                className={`px-4 py-2 rounded transition-colors ${
                  showUnvestedOnly 
                    ? 'bg-green-500 text-white hover:bg-green-600' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {showUnvestedOnly ? 'Show All Details' : 'Show Unvested Only'}
              </button>
            )}
          </div>

          {/* Detailed Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  {!isCollapsed && (
                    <>
                      <th className="px-6 py-3 border-b text-left">Grant Date</th>
                      <th className="px-6 py-3 border-b text-left">Vest Period</th>
                      <th className="px-6 py-3 border-b text-left">Vest Date</th>
                    </>
                  )}
                  {isCollapsed && (
                    <>
                      <th className="px-6 py-3 border-b text-left">Grant Date</th>
                      <th className="px-6 py-3 border-b text-left">Last Vest Date</th>
                      <th className="px-6 py-3 border-b text-left">Next Vest Date</th>
                      <th className="px-6 py-3 border-b text-left">Remaining Vestings</th>
                    </>
                  )}
                  <th className="px-6 py-3 border-b text-left">Grant Quantity</th>
                  <th className="px-6 py-3 border-b text-left">Vest Quantity</th>
                  <th className="px-6 py-3 border-b text-left">Unvest Quantity</th>
                  {isCollapsed && (
                    <th className="px-6 py-3 border-b text-left">Release Quantity</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {isCollapsed ? (
                  // Collapsed view - single row with summed values
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 border-b">
                      {formatDateWithMonthName(schedule.grantDate)}
                      {schedule.grantDate !== 'Unknown' && (
                        <div className="text-sm text-gray-500">
                          ({getAgeInStringFmt(schedule.grantDate)})
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 border-b">
                      <span className={getDateColor(schedule.lastVestDate)}>
                        {formatDateWithMonthName(schedule.lastVestDate)}
                      </span>
                      {schedule.lastVestDate !== '-' && (
                        <div className="text-sm text-gray-500">
                          ({getAgeInStringFmt(schedule.lastVestDate)})
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 border-b">
                      {schedule.nextVest ? (
                        <>
                          <div>
                            <span className={getDateColor(schedule.nextVest.date)}>
                              {formatDateWithMonthName(schedule.nextVest.date)}
                            </span>
                          </div>
                          <div className="text-sm text-gray-500">
                            ({getAgeInStringFmt(schedule.nextVest.date)})
                          </div>
                        </>
                      ) : (
                        'No upcoming vests'
                      )}
                    </td>
                    <td className="px-6 py-4 border-b">{schedule.remainingVestings}</td>
                    <td className="px-6 py-4 border-b">{schedule.totals.grantQuantity.toLocaleString()}</td>
                    <td className="px-6 py-4 border-b">{schedule.totals.vestQuantity.toLocaleString()}</td>
                    <td className="px-6 py-4 border-b">{schedule.totals.unvestQuantity.toLocaleString()}</td>
                    <td className="px-6 py-4 border-b">
                      {schedule.data.reduce((sum, row) => sum + row.releaseQuantity, 0).toLocaleString()}
                    </td>
                  </tr>
                ) : (
                  // Expanded view - all rows
                  schedule.data
                    .filter(row => {
                      if (!showUnvestedOnly) return true;
                      if (!row.vestDate) return false;
                      const [day, month, year] = row.vestDate.split('/');
                      const vestDate = new Date(year, parseInt(month) - 1, day);
                      return vestDate > new Date();
                    })
                    .map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-gray-50">
                        <td className="px-6 py-4 border-b">
                          {formatDateWithMonthName(row.grantDate)}
                        </td>
                        <td className="px-6 py-4 border-b">{row.vestPeriod}</td>
                        <td className="px-6 py-4 border-b">
                          <span className={getDateColor(row.vestDate)}>
                            {formatDateWithMonthName(row.vestDate)}
                          </span>
                        </td>
                        <td className="px-6 py-4 border-b">{row.grantQuantity.toLocaleString()}</td>
                        <td className="px-6 py-4 border-b">{row.vestQuantity.toLocaleString()}</td>
                        <td className="px-6 py-4 border-b">{row.unvestQuantity.toLocaleString()}</td>
                      </tr>
                    ))
                )}
                {!isCollapsed && (
                  <tr className="bg-gray-100 font-semibold">
                    <td className="px-6 py-4 border-b" colSpan="3">Totals</td>
                    <td className="px-6 py-4 border-b">
                      {schedule.data.reduce((sum, row) => sum + row.grantQuantity, 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 border-b">
                      {schedule.data.reduce((sum, row) => sum + row.vestQuantity, 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 border-b">
                      {schedule.data.reduce((sum, row) => sum + row.unvestQuantity, 0).toLocaleString()}
                    </td>
                  </tr>
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