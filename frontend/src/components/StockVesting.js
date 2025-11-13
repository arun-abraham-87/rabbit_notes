import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAgeInStringFmt } from '../utils/DateUtils';

const StockVesting = ({ notes }) => {
  const [vestingData, setVestingData] = useState([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showUnvestedOnly, setShowUnvestedOnly] = useState(false);
  const [showNext3Months, setShowNext3Months] = useState(false);
  const [showSalesModal, setShowSalesModal] = useState(false);
  const [activeTab, setActiveTab] = useState('future');
  const [monthsToShow, setMonthsToShow] = useState(3);
  const [stockPrice, setStockPrice] = useState(null);
  const [sliderPrice, setSliderPrice] = useState(null);
  const [defaultStockPrice, setDefaultStockPrice] = useState(null);
  const [currency, setCurrency] = useState('USD');
  const [conversionRate, setConversionRate] = useState(null);
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [tempConversionRate, setTempConversionRate] = useState('');
  const [applyTax, setApplyTax] = useState(false);
  const [taxRate, setTaxRate] = useState(null);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [tempTaxRate, setTempTaxRate] = useState('');
  const [showTaxObligation, setShowTaxObligation] = useState(false);
  const [excludeSold, setExcludeSold] = useState(false);
  const [excludeUnvested, setExcludeUnvested] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Get stock price from localStorage
    const cachedData = localStorage.getItem('stockPriceData');
    if (cachedData) {
      const { timestamp, price: cachedPrice } = JSON.parse(cachedData);
      const now = new Date().getTime();
      const hoursSinceLastUpdate = (now - timestamp) / (1000 * 60 * 60);
      
      if (hoursSinceLastUpdate < 24) {
        setStockPrice(cachedPrice);
        setDefaultStockPrice(cachedPrice);
        setSliderPrice(cachedPrice);
      } else {
        // If no cached price or cache expired, use default of 65.47
        const defaultPrice = 65.47;
        setDefaultStockPrice(defaultPrice);
        setSliderPrice(defaultPrice);
      }
    } else {
      // If no cached data, use default of 65.47
      const defaultPrice = 65.47;
      setDefaultStockPrice(defaultPrice);
      setSliderPrice(defaultPrice);
    }

    // Get conversion rate from localStorage
    const savedConversionRate = localStorage.getItem('audConversionRate');
    if (savedConversionRate) {
      setConversionRate(parseFloat(savedConversionRate));
    }

    // Get tax rate from localStorage
    const savedTaxRate = localStorage.getItem('vestingTaxRate');
    if (savedTaxRate) {
      setTaxRate(parseFloat(savedTaxRate));
    }
  }, []);

  const calculateMonetaryValue = (quantity) => {
    // Use sliderPrice if available, otherwise fall back to stockPrice
    const priceToUse = sliderPrice !== null ? sliderPrice : stockPrice;
    if (!priceToUse) return null;
    let value = quantity * priceToUse;
    
    // Apply currency conversion if needed
    if (currency === 'AUD' && conversionRate) {
      value = value * conversionRate;
    }

    // Apply tax if enabled
    if (applyTax && taxRate) {
      value = value * (1 - taxRate);
    }

    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const handleCurrencySwitch = () => {
    if (currency === 'USD') {
      if (!conversionRate) {
        setShowConversionModal(true);
      } else {
        setCurrency('AUD');
      }
    } else {
      setCurrency('USD');
    }
  };

  const handleConversionRateSave = () => {
    const rate = parseFloat(tempConversionRate);
    if (!isNaN(rate) && rate > 0) {
      setConversionRate(rate);
      localStorage.setItem('audConversionRate', rate.toString());
      setCurrency('AUD');
      setShowConversionModal(false);
    }
  };

  const handleTaxToggle = () => {
    if (!applyTax) {
      if (!taxRate) {
        setTempTaxRate('');
        setShowTaxModal(true);
      } else {
        setApplyTax(true);
      }
    } else {
      setApplyTax(false);
    }
  };

  const handleTaxRateSave = () => {
    const rate = parseFloat(tempTaxRate) / 100;
    if (!isNaN(rate) && rate >= 0 && rate <= 1) {
      setTaxRate(rate);
      localStorage.setItem('vestingTaxRate', rate.toString());
      setApplyTax(true);
      setShowTaxModal(false);
    }
  };

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

  const getNextVestings = (schedule) => {
    const today = new Date();
    return schedule.data
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
      });
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

  // Group sales by date of sale
  const groupSalesBySaleDate = () => {
    if (!soldRecords || soldRecords.length === 0) return [];
    
    const grouped = soldRecords.reduce((acc, sale) => {
      if (!sale.dateOfSell) return acc;
      
      // Parse date (dd/mm/yyyy format)
      const [day, month, year] = sale.dateOfSell.split('/');
      if (!day || !month || !year) return acc;
      
      const saleDate = new Date(year, parseInt(month) - 1, day);
      const dateKey = saleDate.toISOString().split('T')[0]; // YYYY-MM-DD for sorting
      
      if (!acc[dateKey]) {
        acc[dateKey] = {
          saleDate: saleDate,
          dateStr: sale.dateOfSell,
          sales: []
        };
      }
      
      acc[dateKey].sales.push(sale);
      return acc;
    }, {});
    
    // Convert to array and sort by date (newest first)
    return Object.values(grouped).sort((a, b) => b.saleDate - a.saleDate);
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

      // Get next vestings
      const nextVestings = getNextVestings({ data });
      const nextVest = nextVestings[0];

      // Count remaining vestings
      const remainingVestings = nextVestings.length;

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

  // Helper to get all future vestings, sorted
  const getAllFutureVestings = () => {
    return vestingData
      .flatMap(schedule => schedule.data)
      .filter(row => {
        if (!row.vestDate) return false;
        const [day, month, year] = row.vestDate.split('/');
        const vestDate = new Date(year, parseInt(month) - 1, day);
        return vestDate > new Date();
      })
      .sort((a, b) => {
        const [aDay, aMonth, aYear] = a.vestDate.split('/');
        const [bDay, bMonth, bYear] = b.vestDate.split('/');
        const aDate = new Date(aYear, parseInt(aMonth) - 1, aDay);
        const bDate = new Date(bYear, parseInt(bMonth) - 1, bDay);
        return aDate - bDate;
      });
  };

  // Get next vesting date and sum all vestings on that date
  const getNextVestSummary = () => {
    const futureVestings = getAllFutureVestings();
    if (futureVestings.length === 0) return null;
    const nextDate = futureVestings[0].vestDate;
    const sameDateVestings = futureVestings.filter(v => v.vestDate === nextDate);
    const totalQuantity = sameDateVestings.reduce((sum, v) => sum + v.unvestQuantity, 0);
    return {
      date: nextDate,
      quantity: totalQuantity
    };
  };

  // Helper to get current Australian financial year range
  const getCurrentFinancialYear = () => {
    const today = new Date();
    const year = today.getFullYear();
    // If before July, financial year started last year
    if (today.getMonth() < 6) {
      return { start: new Date(year - 1, 6, 1), end: new Date(year, 5, 30) };
    } else {
      return { start: new Date(year, 6, 1), end: new Date(year + 1, 5, 30) };
    }
  };

  // Helper to get all vested in current financial year
  const getVestedThisFinancialYear = () => {
    const { start, end } = getCurrentFinancialYear();
    return vestingData
      .flatMap(schedule => schedule.data)
      .filter(row => {
        if (!row.vestDate) return false;
        const [day, month, year] = row.vestDate.split('/');
        const vestDate = new Date(year, parseInt(month) - 1, day);
        return vestDate >= start && vestDate <= end && isDateInPast(row.vestDate);
      });
  };

  // Calculate total number of grants (unique grant cards)
  const totalGrants = vestingData.length;

  // Parse sold notes and initialize soldRecords FIRST
  const soldNotes = notes.filter(note => note.content && note.content.includes('meta::stock_vesting_sold_data'));
  let soldRecords = [];
  soldNotes.forEach(note => {
    const lines = note.content.split('\n');
    lines.forEach((line, idx) => {
      if (idx === 0 || line.includes('meta::stock_vesting_sold_data')) return;
      const [
        symbol,
        quantity,
        dateOfSell,
        dateAcquired,
        adjustedCostBasis,
        totalProceeds,
        gainLoss,
        capitalGainsStatus
      ] = line.split(',').map(item => item && item.trim());
      if (quantity && dateAcquired) {
        soldRecords.push({
          symbol,
          quantity: parseFloat(quantity),
          dateOfSell,
          dateAcquired,
          adjustedCostBasis,
          totalProceeds,
          gainLoss,
          capitalGainsStatus,
          matched: false
        });
      }
    });
  });

  // Calculate total gain/loss and total proceeds from all sold records with date of sell in the past
  const now = new Date();
  const totalGainLoss = soldRecords
    .filter(sold => {
      if (!sold.dateOfSell) return false;
      const [day, month, year] = sold.dateOfSell.split('/');
      const sellDate = new Date(year, parseInt(month) - 1, day);
      return sellDate <= now;
    })
    .reduce((sum, sold) => sum + (parseFloat(sold.gainLoss) || 0), 0);
  const totalProceeds = soldRecords
    .filter(sold => {
      if (!sold.dateOfSell) return false;
      const [day, month, year] = sold.dateOfSell.split('/');
      const sellDate = new Date(year, parseInt(month) - 1, day);
      return sellDate <= now;
    })
    .reduce((sum, sold) => sum + (parseFloat(sold.totalProceeds) || 0), 0);
  const taxedGainLoss = taxRate ? totalGainLoss * taxRate : null;

  // Helper to match sold record to vesting row
  const findMatchingSoldRecord = (row) => {
    // Match by quantity and date acquired (vesting date) in dd/mm/yyyy format
    const vestDateStr = row.vestDate;
    const matchIdx = soldRecords.findIndex(sold =>
      sold.quantity === row.grantQuantity &&
      sold.dateAcquired === vestDateStr &&
      !sold.matched
    );
    if (matchIdx !== -1) {
      soldRecords[matchIdx].matched = true;
      return soldRecords[matchIdx];
    }
    return null;
  };

  // Helper to check if a row is sold (for filtering)
  const isRowSold = (row) => {
    const vestDateStr = row.vestDate;
    return soldRecords.some(sold =>
      sold.quantity === row.grantQuantity &&
      sold.dateAcquired === vestDateStr
    );
  };

  if (!vestingData || vestingData.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Stock Vesting Details</h1>
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
      <h1 className="text-2xl font-bold mb-6">Stock Vesting Details</h1>

      {/* Totals Summary */}
      <div className="grid grid-cols-6 gap-4 mb-4">
        {/* Total Grants Card */}
        <div className="bg-gray-50 p-4 rounded-lg flex flex-col items-center justify-center">
          <div className="text-sm font-medium text-gray-500 mb-1">Total Number of Grants</div>
          <div className="text-2xl font-bold text-gray-900 mb-1">{totalGrants}</div>
          <div className="text-xs text-gray-500 opacity-80">(Each card below represents a grant)</div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-500">Total Grant</h3>
          <p className="text-lg font-semibold">{overallTotals.grantQuantity.toLocaleString()}</p>
          {stockPrice && (
            <p className="text-sm text-gray-600">
              Value: {currency === 'USD' ? '$' : 'A$'} {calculateMonetaryValue(overallTotals.grantQuantity)}
            </p>
          )}
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-500">Total Vested</h3>
          <p className="text-lg font-semibold">{overallTotals.vestQuantity.toLocaleString()}</p>
          {stockPrice && (
            <p className="text-sm text-gray-600">
              Value: {currency === 'USD' ? '$' : 'A$'} {calculateMonetaryValue(overallTotals.vestQuantity)}
            </p>
          )}
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-500">Total Unvested</h3>
          <p className="text-lg font-semibold">{overallTotals.unvestQuantity.toLocaleString()}</p>
          {stockPrice && (
            <p className="text-sm text-gray-600">
              Value: {currency === 'USD' ? '$' : 'A$'} {calculateMonetaryValue(overallTotals.unvestQuantity)}
            </p>
          )}
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-500">Next Vest</h3>
          {(() => {
            const nextVest = getNextVestSummary();
            if (nextVest) {
              return (
                <>
                  <div className="mt-2">
                    <span className="text-gray-600">Date: </span>
                    <span className="text-green-500">
                      {formatDateWithMonthName(nextVest.date)}
                    </span>
                    <span className="text-gray-500 ml-2">
                      ({getAgeInStringFmt(nextVest.date)})
                    </span>
                  </div>
                  <div className="mt-2">
                    <span className="text-gray-600">Quantity: </span>
                    <span>
                      {nextVest.quantity.toLocaleString()}
                    </span>
                    {stockPrice && (
                      <span className="text-gray-600 ml-2">
                        (Value: {currency === 'USD' ? '$' : 'A$'} {calculateMonetaryValue(nextVest.quantity)})
                      </span>
                    )}
                  </div>
                </>
              );
            } else {
              return <p className="text-gray-500 mt-2">No upcoming vests</p>;
            }
          })()}
        </div>
        {/* Gain/Loss and Proceeds Card */}
        <div className="bg-gray-50 p-4 rounded-lg flex flex-col items-center justify-center">
          <div className="text-sm font-medium text-gray-500 mb-1">Total Gain/Loss (Sold)</div>
          <div className={`text-lg font-bold mb-1 ${totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>{currency === 'USD' ? '$' : 'A$'} {totalGainLoss.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
          {taxRate && (
            <div className="text-xs text-gray-500 opacity-80">
              After Tax ({(taxRate * 100).toFixed(1)}%): {currency === 'USD' ? '$' : 'A$'} {taxedGainLoss.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </div>
          )}
          <div className="text-xs text-gray-500 opacity-80">Total Proceeds: {currency === 'USD' ? '$' : 'A$'} {totalProceeds.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
        </div>
      </div>
      
      {/* Currency and Tax Controls */}
      <div className="mb-4 flex items-center gap-4">
        <button
          onClick={handleCurrencySwitch}
          className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors"
        >
          Switch to {currency === 'USD' ? 'AUD' : 'USD'}
        </button>
        {currency === 'AUD' && conversionRate && (
          <div className="text-sm text-gray-600">
            Conversion rate: 
            <button
              onClick={() => {
                setTempConversionRate(conversionRate.toString());
                setShowConversionModal(true);
              }}
              className="ml-1 text-blue-600 hover:text-blue-800 underline"
            >
              {conversionRate.toFixed(4)}
            </button>
          </div>
        )}

        <button
          onClick={handleTaxToggle}
          className={`px-4 py-2 rounded transition-colors ${
            applyTax 
              ? 'bg-black text-white hover:bg-gray-800' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          {applyTax ? 'Remove Tax' : 'Apply Tax'}
        </button>
        {applyTax && taxRate && (
          <div className="text-sm text-gray-600">
            Tax rate: 
            <button
              onClick={() => {
                setTempTaxRate(taxRate.toString());
                setShowTaxModal(true);
              }}
              className="ml-1 text-blue-600 hover:text-blue-800 underline"
            >
              {(taxRate * 100).toFixed(1)}%
            </button>
          </div>
        )}
        <label className="flex items-center gap-2 ml-2 cursor-pointer">
          <input
            type="checkbox"
            checked={excludeSold}
            onChange={() => setExcludeSold(v => !v)}
            className="form-checkbox h-4 w-4 text-black"
          />
          <span className="text-sm text-gray-700">Exclude Sold Shares</span>
        </label>
        <label className="flex items-center gap-2 ml-2 cursor-pointer">
          <input
            type="checkbox"
            checked={excludeUnvested}
            onChange={() => setExcludeUnvested(v => !v)}
            className="form-checkbox h-4 w-4 text-black"
          />
          <span className="text-sm text-gray-700">Exclude Unvested Quantity</span>
        </label>
      </div>

      {/* Conversion Rate Modal */}
      {showConversionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Set AUD Conversion Rate</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                USD to AUD Conversion Rate
              </label>
              <input
                type="number"
                step="0.0001"
                value={tempConversionRate}
                onChange={(e) => setTempConversionRate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter conversion rate"
              />
            </div>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowConversionModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleConversionRateSave}
                className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tax Rate Modal */}
      {showTaxModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Set Tax Rate</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tax Rate (as percentage)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={tempTaxRate}
                onChange={(e) => setTempTaxRate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter tax rate (e.g., 30 for 30%)"
              />
              <p className="mt-1 text-sm text-gray-500">
                Enter a value between 0 and 100 (e.g., 30 for 30%)
              </p>
            </div>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowTaxModal(false);
                  setTempTaxRate('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleTaxRateSave}
                className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Price Note with Slider */}
      {(stockPrice || sliderPrice !== null) && (
        <div className="mb-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="text-sm text-gray-600">
              Note: All monetary values are calculated using the current stock price of {currency === 'USD' ? '$' : 'A$'}
              <span className="font-semibold ml-1">
                {(sliderPrice !== null ? sliderPrice : stockPrice).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </span>
              {' '}per share
              {currency === 'AUD' && conversionRate && (
                <span> (converted at {conversionRate.toFixed(4)} USD/AUD)</span>
              )}
              {applyTax && taxRate && (
                <span> (after {taxRate * 100}% tax)</span>
              )}
            </div>
            <div className="flex items-center gap-3 flex-1 min-w-[300px]">
              <label className="text-sm text-gray-600 whitespace-nowrap">
                Price: {currency === 'USD' ? '$' : 'A$'}
                <span className="font-semibold ml-1">
                  {(sliderPrice !== null ? sliderPrice : stockPrice || 65.47).toFixed(2)}
                </span>
              </label>
              <input
                type="range"
                min="30"
                max="120"
                step="0.01"
                value={sliderPrice !== null ? sliderPrice : (stockPrice || 65.47)}
                onChange={(e) => setSliderPrice(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #4F46E5 0%, #4F46E5 ${((sliderPrice !== null ? sliderPrice : (stockPrice || 65.47)) - 30) / (120 - 30) * 100}%, #E5E7EB ${((sliderPrice !== null ? sliderPrice : (stockPrice || 65.47)) - 30) / (120 - 30) * 100}%, #E5E7EB 100%)`
                }}
              />
              <button
                onClick={() => {
                  const resetPrice = defaultStockPrice !== null ? defaultStockPrice : (stockPrice || 65.47);
                  setSliderPrice(resetPrice);
                }}
                className="px-3 py-1.5 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors whitespace-nowrap"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
      
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
              Show Future/Past Vesting
            </button>
            <button
              onClick={() => setShowSalesModal(true)}
              className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors"
            >
              Sales View
            </button>
            <button
              onClick={() => setShowTaxObligation(true)}
              className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors"
            >
              Show Tax Obligation
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
                      <div>Total: {monthGroup.total.toLocaleString()}</div>
                      {stockPrice && (
                        <div className="text-sm text-gray-600">
                          Value: {currency === 'USD' ? '$' : 'A$'} {calculateMonetaryValue(monthGroup.total)}
                        </div>
                      )}
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
                          <div>
                            {activeTab === 'future' 
                              ? row.unvestQuantity.toLocaleString() 
                              : row.vestQuantity.toLocaleString()}
                          </div>
                          {stockPrice && (
                            <div className="text-sm text-gray-600">
                              {currency === 'USD' ? '$' : 'A$'} {calculateMonetaryValue(
                                activeTab === 'future' 
                                  ? row.unvestQuantity 
                                  : row.vestQuantity
                              )}
                            </div>
                          )}
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

      {/* Sales View Modal */}
      {showSalesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Sales View</h2>
              <button
                onClick={() => setShowSalesModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              {groupSalesBySaleDate().length > 0 ? (
                groupSalesBySaleDate().map((saleGroup, index) => (
                  <div key={index} className="border-b pb-4">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-medium text-lg">
                        {formatDateWithMonthName(saleGroup.dateStr)}
                      </h3>
                      <div className="font-semibold text-right">
                        <div>Total Quantity: {saleGroup.sales.reduce((sum, s) => sum + (parseFloat(s.quantity) || 0), 0).toLocaleString()}</div>
                        <div>Total Proceeds: {currency === 'USD' ? '$' : 'A$'} {saleGroup.sales.reduce((sum, s) => sum + (parseFloat(s.totalProceeds) || 0), 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                        <div className={`${saleGroup.sales.reduce((sum, s) => sum + (parseFloat(s.gainLoss) || 0), 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          Total Gain/Loss: {currency === 'USD' ? '$' : 'A$'} {saleGroup.sales.reduce((sum, s) => sum + (parseFloat(s.gainLoss) || 0), 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {saleGroup.sales.map((sale, saleIndex) => (
                        <div key={saleIndex} className="flex justify-between items-center pl-4 border-l-2 border-gray-200 py-2">
                          <div className="flex-1">
                            <div className="font-medium">
                              {sale.symbol || 'N/A'} - Quantity: {parseFloat(sale.quantity || 0).toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-600">
                              Date Acquired: {formatDateWithMonthName(sale.dateAcquired || 'N/A')}
                            </div>
                            <div className="text-sm text-gray-600">
                              Cost Basis: {currency === 'USD' ? '$' : 'A$'} {parseFloat(sale.adjustedCostBasis || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            </div>
                            <div className="text-xs text-gray-500">
                              Status: {sale.capitalGainsStatus || 'N/A'}
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <div className="font-medium">
                              Proceeds: {currency === 'USD' ? '$' : 'A$'} {parseFloat(sale.totalProceeds || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            </div>
                            <div className={`font-semibold ${parseFloat(sale.gainLoss || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              Gain/Loss: {currency === 'USD' ? '$' : 'A$'} {parseFloat(sale.gainLoss || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No sales data available.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tax Obligation Modal */}
      {showTaxObligation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Tax Obligation (Current Financial Year)</h2>
              <button
                onClick={() => setShowTaxObligation(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="mb-4 text-sm text-gray-600">
              Financial Year: {(() => {
                const fy = getCurrentFinancialYear();
                return `${fy.start.getDate()}/${fy.start.getMonth()+1}/${fy.start.getFullYear()} - ${fy.end.getDate()}/${fy.end.getMonth()+1}/${fy.end.getFullYear()}`;
              })()}
            </div>
            <table className="min-w-full bg-white border border-gray-300 mb-4">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-6 py-3 border-b text-left">Vest Date</th>
                  <th className="px-6 py-3 border-b text-left">Units Vested</th>
                  <th className="px-6 py-3 border-b text-left">Value</th>
                </tr>
              </thead>
              <tbody>
                {getVestedThisFinancialYear().map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-100'}>
                    <td className="px-6 py-4 border-b">{formatDateWithMonthName(row.vestDate)}</td>
                    <td className="px-6 py-4 border-b">{row.vestQuantity.toLocaleString()}</td>
                    <td className="px-6 py-4 border-b">{currency === 'USD' ? '$' : 'A$'} {calculateMonetaryValue(row.vestQuantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Totals */}
            <div className="mb-2 font-semibold">
              Total Units Vested: {getVestedThisFinancialYear().reduce((sum, row) => sum + row.vestQuantity, 0).toLocaleString()}
            </div>
            <div className="mb-2 font-semibold">
              Total Value: {currency === 'USD' ? '$' : 'A$'} {calculateMonetaryValue(getVestedThisFinancialYear().reduce((sum, row) => sum + row.vestQuantity, 0))}
            </div>
            <div className="mb-2 font-semibold">
              Tax Rate: {taxRate !== null ? `${(taxRate * 100).toFixed(1)}%` : 'Not Set'}
            </div>
            <div className="mb-2 font-semibold">
              Tax Obligation: {taxRate !== null ? `${currency === 'USD' ? '$' : 'A$'} ${calculateMonetaryValue(getVestedThisFinancialYear().reduce((sum, row) => sum + row.vestQuantity, 0) * taxRate)}` : 'Set tax rate to calculate'}
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
                    if (excludeSold && isRowSold(row)) return false;
                    if (excludeUnvested && row.unvestQuantity > 0) return false;
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
                      <td className="px-6 py-4 border-b">
                        {row.grantQuantity.toLocaleString()}
                        {stockPrice && (
                          <div className="text-sm text-gray-500">
                            ({currency === 'USD' ? '$' : 'A$'} {calculateMonetaryValue(row.grantQuantity)})
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 border-b">
                        {row.vestQuantity.toLocaleString()}
                        {stockPrice && (
                          <div className="text-sm text-gray-500">
                            ({currency === 'USD' ? '$' : 'A$'} {calculateMonetaryValue(row.vestQuantity)})
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 border-b">
                        {row.unvestQuantity.toLocaleString()}
                        {stockPrice && (
                          <div className="text-sm text-gray-500">
                            ({currency === 'USD' ? '$' : 'A$'} {calculateMonetaryValue(row.unvestQuantity)})
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 border-b">
                        {(() => {
                          const sold = findMatchingSoldRecord(row);
                          if (sold) {
                            return (
                              <div className="text-xs text-red-600 font-semibold">
                                Sold: {sold.quantity} on {sold.dateOfSell}<br/>
                                Proceeds: {currency === 'USD' ? '$' : 'A$'} {sold.totalProceeds}<br/>
                                Gain/Loss: {currency === 'USD' ? '$' : 'A$'} {sold.gainLoss} ({sold.capitalGainsStatus})
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </td>
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
                      if (excludeSold && isRowSold(row)) return false;
                      if (excludeUnvested && row.unvestQuantity > 0) return false;
                      if (!showUnvestedOnly) return true;
                      if (!row.vestDate) return false;
                      const [day, month, year] = row.vestDate.split('/');
                      const vestDate = new Date(year, parseInt(month) - 1, day);
                      return vestDate > new Date();
                    })
                    .reduce((sum, row) => sum + row.grantQuantity, 0)
                    .toLocaleString()}
                  {stockPrice && (
                    <div className="text-sm text-gray-500">
                      ({currency === 'USD' ? '$' : 'A$'} {calculateMonetaryValue(
                        vestingData
                          .flatMap(schedule => schedule.data)
                          .filter(row => {
                            if (excludeSold && isRowSold(row)) return false;
                            if (excludeUnvested && row.unvestQuantity > 0) return false;
                            if (!showUnvestedOnly) return true;
                            if (!row.vestDate) return false;
                            const [day, month, year] = row.vestDate.split('/');
                            const vestDate = new Date(year, parseInt(month) - 1, day);
                            return vestDate > new Date();
                          })
                          .reduce((sum, row) => sum + row.grantQuantity, 0)
                      )})
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 border-b">
                  {vestingData
                    .flatMap(schedule => schedule.data)
                    .filter(row => {
                      if (excludeSold && isRowSold(row)) return false;
                      if (excludeUnvested && row.unvestQuantity > 0) return false;
                      if (!showUnvestedOnly) return true;
                      if (!row.vestDate) return false;
                      const [day, month, year] = row.vestDate.split('/');
                      const vestDate = new Date(year, parseInt(month) - 1, day);
                      return vestDate > new Date();
                    })
                    .reduce((sum, row) => sum + row.vestQuantity, 0)
                    .toLocaleString()}
                  {stockPrice && (
                    <div className="text-sm text-gray-500">
                      ({currency === 'USD' ? '$' : 'A$'} {calculateMonetaryValue(
                        vestingData
                          .flatMap(schedule => schedule.data)
                          .filter(row => {
                            if (excludeSold && isRowSold(row)) return false;
                            if (excludeUnvested && row.unvestQuantity > 0) return false;
                            if (!showUnvestedOnly) return true;
                            if (!row.vestDate) return false;
                            const [day, month, year] = row.vestDate.split('/');
                            const vestDate = new Date(year, parseInt(month) - 1, day);
                            return vestDate > new Date();
                          })
                          .reduce((sum, row) => sum + row.vestQuantity, 0)
                      )})
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 border-b">
                  {vestingData
                    .flatMap(schedule => schedule.data)
                    .filter(row => {
                      if (excludeSold && isRowSold(row)) return false;
                      if (excludeUnvested && row.unvestQuantity > 0) return false;
                      if (!showUnvestedOnly) return true;
                      if (!row.vestDate) return false;
                      const [day, month, year] = row.vestDate.split('/');
                      const vestDate = new Date(year, parseInt(month) - 1, day);
                      return vestDate > new Date();
                    })
                    .reduce((sum, row) => sum + row.unvestQuantity, 0)
                    .toLocaleString()}
                  {stockPrice && (
                    <div className="text-sm text-gray-500">
                      ({currency === 'USD' ? '$' : 'A$'} {calculateMonetaryValue(
                        vestingData
                          .flatMap(schedule => schedule.data)
                          .filter(row => {
                            if (excludeSold && isRowSold(row)) return false;
                            if (excludeUnvested && row.unvestQuantity > 0) return false;
                            if (!showUnvestedOnly) return true;
                            if (!row.vestDate) return false;
                            const [day, month, year] = row.vestDate.split('/');
                            const vestDate = new Date(year, parseInt(month) - 1, day);
                            return vestDate > new Date();
                          })
                          .reduce((sum, row) => sum + row.unvestQuantity, 0)
                      )})
                    </div>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Unmatched Sold Records Section */}
      {soldRecords.filter(s => !s.matched).length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold mb-2 text-red-700">Unmatched Sold Records</h2>
          <table className="min-w-full bg-white border border-gray-300 mb-4">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-6 py-3 border-b text-left">Symbol</th>
                <th className="px-6 py-3 border-b text-left">Quantity</th>
                <th className="px-6 py-3 border-b text-left">Date of Sell</th>
                <th className="px-6 py-3 border-b text-left">Date Acquired</th>
                <th className="px-6 py-3 border-b text-left">Adjusted Cost Basis</th>
                <th className="px-6 py-3 border-b text-left">Total Proceeds</th>
                <th className="px-6 py-3 border-b text-left">Gain/Loss</th>
                <th className="px-6 py-3 border-b text-left">Capital Gains Status</th>
              </tr>
            </thead>
            <tbody>
              {soldRecords.filter(s => !s.matched).map((sold, idx) => (
                <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-100'}>
                  <td className="px-6 py-4 border-b">{sold.symbol}</td>
                  <td className="px-6 py-4 border-b">{sold.quantity}</td>
                  <td className="px-6 py-4 border-b">{sold.dateOfSell}</td>
                  <td className="px-6 py-4 border-b">{sold.dateAcquired}</td>
                  <td className="px-6 py-4 border-b">{sold.adjustedCostBasis}</td>
                  <td className="px-6 py-4 border-b">{sold.totalProceeds}</td>
                  <td className="px-6 py-4 border-b">{sold.gainLoss}</td>
                  <td className="px-6 py-4 border-b">{sold.capitalGainsStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StockVesting; 