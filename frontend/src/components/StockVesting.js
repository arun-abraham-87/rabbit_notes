import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAgeInStringFmt } from '../utils/DateUtils';

const StockVesting = ({ notes }) => {
  const [vestingData, setVestingData] = useState([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showUnvestedOnly, setShowUnvestedOnly] = useState(false);
  const [showNext3Months, setShowNext3Months] = useState(false);
  const [activeTab, setActiveTab] = useState('future');
  const [monthsToShow, setMonthsToShow] = useState(3);
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

  const getVestingsInDateRange = (schedule, isFuture = true) => {
    const today = new Date();
    const targetDate = new Date();
    
    if (isFuture) {
      targetDate.setMonth(today.getMonth() + monthsToShow);
    } else {
      targetDate.setMonth(today.getMonth() - monthsToShow);
    }

    return schedule.data
      .filter(row => {
        if (!row.vestDate) return false;
        const [day, month, year] = row.vestDate.split('/');
        const vestDate = new Date(year, parseInt(month) - 1, day);
        return isFuture 
          ? vestDate > today && vestDate <= targetDate
          : vestDate < today && vestDate >= targetDate;
      })
      .sort((a, b) => {
        const [aDay, aMonth, aYear] = a.vestDate.split('/');
        const [bDay, bMonth, bYear] = b.vestDate.split('/');
        const aDate = new Date(aYear, parseInt(aMonth) - 1, aDay);
        const bDate = new Date(bYear, parseInt(bMonth) - 1, bDay);
        return isFuture ? aDate - bDate : bDate - aDate;
      });
  };

  const groupVestingsByMonth = (vestings) => {
    const grouped = vestings.reduce((acc, row) => {
      const [day, month, year] = row.vestDate.split('/');
      const date = new Date(year, parseInt(month) - 1, day);
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      
      if (!acc[monthKey]) {
        acc[monthKey] = {
          month: date,
          vestings: [],
          total: 0
        };
      }
      
      acc[monthKey].vestings.push(row);
      acc[monthKey].total += row.unvestQuantity;
      
      return acc;
    }, {});

    return Object.values(grouped).sort((a, b) => a.month - b.month);
  };

  const formatMonthYear = (date) => {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
  };

  const handleLoadMore = () => {
    setMonthsToShow(prev => prev + 3);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setMonthsToShow(3); // Reset months when switching tabs
  };

  useEffect(() => {
    const stockVestingNodes = notes.filter(note => 
      note.content && note.content.includes('meta::stock_vesting_data')
    );

    const allData = stockVestingNodes.flatMap(note => {
      try {
        const lines = note.content.split('\n');
        const dataLines = lines
          .filter((line, index) => {
            if (index === 0 || line.includes('meta::stock_vesting_data')) {
              return false;
            }
            return line.trim();
          });

        return dataLines
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
              nodeId: note.id,
              vestPeriod: vestPeriod || '',
              vestDate: vestDate || '',
              grantDate: grantDate || '',
              grantQuantity: parseFloat(grantQuantity) || 0,
              releaseQuantity: parseFloat(releaseQuantity) || 0
            };

            return calculateQuantities(baseRow);
          });
      } catch (error) {
        console.error('Error processing note:', error);
        return [];
      }
    });

    if (allData.length === 0) {
      setVestingData([]);
      return;
    }

    // Group data by grant date and nodeId
    const groupedByGrantDate = allData.reduce((acc, row) => {
      const key = `${row.grantDate}-${row.nodeId}`;
      if (!acc[key]) {
        acc[key] = {
          grantDate: row.grantDate,
          nodeId: row.nodeId,
          data: []
        };
      }
      acc[key].data.push(row);
      return acc;
    }, {});

    // Convert grouped data to array format
    const processedData = Object.values(groupedByGrantDate).map(group => {
      const data = group.data;
      // Calculate totals for this grant
      const totals = data.reduce((acc, row) => ({
        grantQuantity: acc.grantQuantity + row.grantQuantity,
        vestQuantity: acc.vestQuantity + row.vestQuantity,
        unvestQuantity: acc.unvestQuantity + row.unvestQuantity
      }), {
        grantQuantity: 0,
        vestQuantity: 0,
        unvestQuantity: 0
      });

      // Find the maximum vest date
      const lastVestDate = data
        .map(row => row.vestDate)
        .filter(Boolean)
        .reduce((max, date) => {
          const [day, month, year] = date.split('/').map(Number);
          const currentDate = new Date(year, month - 1, day);
          
          if (!max) return date;
          
          const [maxDay, maxMonth, maxYear] = max.split('/').map(Number);
          const maxDate = new Date(maxYear, maxMonth - 1, maxDay);
          
          return currentDate > maxDate ? date : max;
        }, null) || '-';

      // Find next vesting date and quantity
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
        grantDate: group.grantDate,
        nodeId: group.nodeId,
        lastVestDate,
        nextVest: nextVest ? {
          date: nextVest.vestDate,
          quantity: nextVest.unvestQuantity
        } : null,
        remainingVestings,
        totals,
        data
      };
    });

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

  // Calculate overall totals
  const overallTotals = vestingData.reduce((acc, schedule) => ({
    grantQuantity: acc.grantQuantity + schedule.totals.grantQuantity,
    vestQuantity: acc.vestQuantity + schedule.totals.vestQuantity,
    unvestQuantity: acc.unvestQuantity + schedule.totals.unvestQuantity
  }), {
    grantQuantity: 0,
    vestQuantity: 0,
    unvestQuantity: 0
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Stock Vesting Schedules</h1>
      
      {/* Totals Summary */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-500">Total Grant</h3>
          <p className="text-lg font-semibold">{overallTotals.grantQuantity.toLocaleString()}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-500">Total Vested</h3>
          <p className="text-lg font-semibold">{overallTotals.vestQuantity.toLocaleString()}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-500">Total Unvested</h3>
          <p className="text-lg font-semibold">{overallTotals.unvestQuantity.toLocaleString()}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-500">Next Vest</h3>
          {vestingData[0]?.nextVest ? (
            <>
              <div className="mt-2">
                <span className="text-gray-600">Date: </span>
                <span className="text-green-500">
                  {formatDateWithMonthName(vestingData[0].nextVest.date)}
                </span>
                <span className="text-gray-500 ml-2">
                  ({getAgeInStringFmt(vestingData[0].nextVest.date)})
                </span>
              </div>
              <div className="mt-2">
                <span className="text-gray-600">Quantity: </span>
                <span>
                  {vestingData[0].nextVest.quantity.toLocaleString()}
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
          className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors"
        >
          {isCollapsed ? 'Expand Details' : 'Collapse Details'}
        </button>
        {!isCollapsed && (
          <>
            <button
              onClick={() => setShowUnvestedOnly(!showUnvestedOnly)}
              className={`px-4 py-2 rounded transition-colors ${
                showUnvestedOnly 
                  ? 'bg-black text-white hover:bg-gray-800' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {showUnvestedOnly ? 'Show All Details' : 'Show Unvested Only'}
            </button>
            <button
              onClick={() => setShowNext3Months(true)}
              className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors"
            >
              Show Next 3 Months Vesting
            </button>
          </>
        )}
      </div>

      {/* Next 3 Months Modal */}
      {showNext3Months && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Vesting Schedule</h2>
              <button
                onClick={() => {
                  setShowNext3Months(false);
                  setMonthsToShow(3); // Reset months when closing modal
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-4">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => handleTabChange('future')}
                  className={`${
                    activeTab === 'future'
                      ? 'border-black text-black'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  Next {monthsToShow} Months
                </button>
                <button
                  onClick={() => handleTabChange('past')}
                  className={`${
                    activeTab === 'past'
                      ? 'border-black text-black'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  Previous {monthsToShow} Months
                </button>
              </nav>
            </div>

            <div className="space-y-6">
              {groupVestingsByMonth(
                vestingData.flatMap(schedule => 
                  getVestingsInDateRange(schedule, activeTab === 'future')
                )
              ).map((monthGroup, index) => (
                <div key={index} className="border-b pb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-medium text-lg">{formatMonthYear(monthGroup.month)}</h3>
                    <div className="font-semibold">
                      Total: {monthGroup.total.toLocaleString()}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {monthGroup.vestings.map((row, rowIndex) => (
                      <div key={rowIndex} className="flex justify-between items-center pl-4">
                        <div>
                          <span className={`${activeTab === 'future' ? 'text-green-500' : 'text-blue-500'}`}>
                            {formatDateWithMonthName(row.vestDate)}
                          </span>
                          <span className="text-gray-500 ml-2">
                            ({getAgeInStringFmt(row.vestDate)})
                          </span>
                        </div>
                        <div className="font-medium">
                          {activeTab === 'future' ? row.unvestQuantity.toLocaleString() : row.vestQuantity.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Load More Button */}
              <div className="flex justify-center pt-4">
                <button
                  onClick={handleLoadMore}
                  className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors"
                >
                  Load {activeTab === 'future' ? 'Next' : 'Previous'} 3 Months
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
              // Collapsed view - grouped by grant date and nodeId
              vestingData.map((schedule, index) => (
                <tr key={`${schedule.nodeId}-${index}`} className={`hover:bg-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-200'}`}>
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
              ))
            ) : (
              // Expanded view - all rows
              vestingData.flatMap((schedule, scheduleIndex) => 
                schedule.data
                  .filter(row => {
                    if (!showUnvestedOnly) return true;
                    if (!row.vestDate) return false;
                    const [day, month, year] = row.vestDate.split('/');
                    const vestDate = new Date(year, parseInt(month) - 1, day);
                    return vestDate > new Date();
                  })
                  .map((row, rowIndex) => (
                    <tr 
                      key={`${schedule.nodeId}-${rowIndex}`} 
                      className={`hover:bg-gray-100 ${scheduleIndex % 2 === 0 ? 'bg-white' : 'bg-gray-200'}`}
                    >
                      <td className="px-6 py-4 border-b">
                        {formatDateWithMonthName(row.grantDate)}
                      </td>
                      <td className="px-6 py-4 border-b">{row.vestPeriod}</td>
                      <td className="px-6 py-4 border-b">
                        <span className={getDateColor(row.vestDate)}>
                          {formatDateWithMonthName(row.vestDate)}
                        </span>
                        {row.vestDate && row.vestDate !== '-' && (
                          <div className="text-sm text-gray-500">
                            ({getAgeInStringFmt(row.vestDate)})
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 border-b">{row.grantQuantity.toLocaleString()}</td>
                      <td className="px-6 py-4 border-b">{row.vestQuantity.toLocaleString()}</td>
                      <td className="px-6 py-4 border-b">{row.unvestQuantity.toLocaleString()}</td>
                    </tr>
                  ))
              )
            )}
            {!isCollapsed && (
              <tr className="bg-gray-100 font-semibold">
                <td className="px-6 py-4 border-b" colSpan="3">Totals</td>
                <td className="px-6 py-4 border-b">
                  {vestingData
                    .flatMap(schedule => schedule.data)
                    .filter(row => {
                      if (!showUnvestedOnly) return true;
                      if (!row.vestDate) return false;
                      const [day, month, year] = row.vestDate.split('/');
                      const vestDate = new Date(year, parseInt(month) - 1, day);
                      return vestDate > new Date();
                    })
                    .reduce((sum, row) => sum + row.grantQuantity, 0)
                    .toLocaleString()}
                </td>
                <td className="px-6 py-4 border-b">
                  {vestingData
                    .flatMap(schedule => schedule.data)
                    .filter(row => {
                      if (!showUnvestedOnly) return true;
                      if (!row.vestDate) return false;
                      const [day, month, year] = row.vestDate.split('/');
                      const vestDate = new Date(year, parseInt(month) - 1, day);
                      return vestDate > new Date();
                    })
                    .reduce((sum, row) => sum + row.vestQuantity, 0)
                    .toLocaleString()}
                </td>
                <td className="px-6 py-4 border-b">
                  {vestingData
                    .flatMap(schedule => schedule.data)
                    .filter(row => {
                      if (!showUnvestedOnly) return true;
                      if (!row.vestDate) return false;
                      const [day, month, year] = row.vestDate.split('/');
                      const vestDate = new Date(year, parseInt(month) - 1, day);
                      return vestDate > new Date();
                    })
                    .reduce((sum, row) => sum + row.unvestQuantity, 0)
                    .toLocaleString()}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StockVesting; 