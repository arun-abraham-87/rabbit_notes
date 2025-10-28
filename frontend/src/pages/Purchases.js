import React, { useState, useMemo } from 'react';
import { getDateInDDMMYYYYFormatWithAgeInParentheses } from '../utils/DateUtils';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

// Function to extract event details from note content
const getEventDetails = (content) => {
  const lines = content.split('\n');
  
  // Find the description
  const descriptionLine = lines.find(line => line.startsWith('event_description:'));
  const description = descriptionLine ? descriptionLine.replace('event_description:', '').trim() : '';
  
  // Find the event date
  const eventDateLine = lines.find(line => line.startsWith('event_date:'));
  const dateTime = eventDateLine ? eventDateLine.replace('event_date:', '').trim() : '';
  
  // Find tags
  const tagsLine = lines.find(line => line.startsWith('event_tags:'));
  const tags = tagsLine ? tagsLine.replace('event_tags:', '').trim().split(',').map(tag => tag.trim()) : [];
  
  return { description, dateTime, tags };
};

// Helper function to extract dollar amount from text
const extractDollarAmount = (text) => {
  if (!text) return 0;
  const matches = text.match(/\$[\d,]+(?:\.\d{2})?/g);
  if (!matches) return 0;
  
  return matches.reduce((total, match) => {
    const value = parseFloat(match.replace(/[$,]/g, ''));
    return total + (isNaN(value) ? 0 : value);
  }, 0);
};

const Purchases = ({ allNotes }) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter purchase events
  const purchaseEvents = useMemo(() => {
    const events = allNotes
      .filter(note => note?.content && note.content.includes('meta::event::'))
      .map(note => {
        const eventDetails = getEventDetails(note.content);
        return { note, ...eventDetails };
      })
      .filter(event => event.tags.some(tag => tag.toLowerCase() === 'purchase'))
      .sort((a, b) => {
        // Sort by date, most recent first
        if (!a.dateTime && !b.dateTime) return 0;
        if (!a.dateTime) return 1;
        if (!b.dateTime) return -1;
        return new Date(b.dateTime) - new Date(a.dateTime);
      });

    // Apply fuzzy search if query exists
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return events.filter(event => {
        const description = event.description.toLowerCase();
        const amount = extractDollarAmount(event.description).toString();
        const dateStr = event.dateTime ? new Date(event.dateTime).toLocaleDateString().toLowerCase() : '';
        
        // Check if any part matches
        return description.includes(query) || 
               amount.includes(query) || 
               dateStr.includes(query);
      });
    }
    
    return events;
  }, [allNotes, searchQuery]);

  // Group events by year and month
  const groupedPurchases = useMemo(() => {
    const grouped = {};
    
    purchaseEvents.forEach(event => {
      if (!event.dateTime) {
        // Group events without dates in a special group
        if (!grouped['No Date']) {
          grouped['No Date'] = [];
        }
        grouped['No Date'].push(event);
        return;
      }

      const date = new Date(event.dateTime);
      const year = date.getFullYear();
      const month = date.getMonth(); // Get month as number (0-11)
      const monthName = date.toLocaleString('default', { month: 'long' });
      
      if (!grouped[year]) {
        grouped[year] = {};
      }
      if (!grouped[year][month]) {
        grouped[year][month] = { name: monthName, events: [] };
      }
      grouped[year][month].events.push(event);
    });

    // Sort years and months properly
    const sortedGrouped = {};
    Object.keys(grouped).sort((a, b) => {
      if (a === 'No Date') return 1;
      if (b === 'No Date') return -1;
      return parseInt(b) - parseInt(a); // Descending order
    }).forEach(key => {
      if (key === 'No Date') {
        sortedGrouped[key] = grouped[key];
      } else {
        const year = parseInt(key);
        sortedGrouped[key] = {};
        Object.keys(grouped[year])
          .sort((a, b) => parseInt(b) - parseInt(a)) // Descending order
          .forEach(month => {
            sortedGrouped[key][month] = grouped[year][month];
          });
      }
    });

    return sortedGrouped;
  }, [purchaseEvents]);

  // Calculate total
  const totalAmount = useMemo(() => {
    return purchaseEvents.reduce((total, event) => {
      return total + extractDollarAmount(event.description);
    }, 0);
  }, [purchaseEvents]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Purchases</h1>
        {totalAmount > 0 && (
          <div className="text-xl font-bold text-green-700">
            Total: ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        )}
      </div>

      {/* Search Box */}
      <div className="mb-6">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search purchases by description, amount, or date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      {searchQuery && (
        <div className="mb-4 text-sm text-gray-600">
          Showing {purchaseEvents.length} result{purchaseEvents.length !== 1 ? 's' : ''} for "{searchQuery}"
        </div>
      )}

      {purchaseEvents.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>{searchQuery ? `No purchases found matching "${searchQuery}".` : 'No purchase events found.'}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.keys(groupedPurchases).map(yearKey => {
            // Handle "No Date" group
            if (yearKey === 'No Date') {
              return (
                <div key="no-date" className="space-y-4">
                  <h2 className="text-xl font-semibold text-gray-700 border-b border-gray-300 pb-2">
                    No Date
                  </h2>
                  {groupedPurchases[yearKey].map((event) => {
                    const dollarAmount = extractDollarAmount(event.description);
                    return (
                      <div
                        key={event.note.id}
                        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            {dollarAmount > 0 && (
                              <span className="text-lg font-semibold text-green-700">
                                ${dollarAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            )}
                            <h3 className="text-lg font-semibold text-gray-900 mt-2">
                              {event.description}
                            </h3>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            }

            // Handle year groups
            const year = parseInt(yearKey);
            const months = groupedPurchases[year];
            
            return (
              <div key={year} className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-800 border-b-2 border-gray-300 pb-2">
                  {year}
                </h2>
                
                {Object.entries(months).map(([monthNum, monthData]) => {
                  const events = monthData.events;
                  const monthTotal = events.reduce((total, event) => {
                    return total + extractDollarAmount(event.description);
                  }, 0);

                  return (
                    <div key={monthNum} className="space-y-3">
                      <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                        <h3 className="text-lg font-semibold text-gray-700">
                          {monthData.name}
                        </h3>
                        {monthTotal > 0 && (
                          <span className="text-base font-semibold text-green-600">
                            ${monthTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                      
                      <div className="space-y-3 ml-4">
                        {events.map((event) => {
                          const dollarAmount = extractDollarAmount(event.description);
                          return (
                            <div
                              key={event.note.id}
                              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    {event.dateTime && (
                                      <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded font-medium">
                                        {getDateInDDMMYYYYFormatWithAgeInParentheses(event.dateTime)}
                                      </span>
                                    )}
                                    {dollarAmount > 0 && (
                                      <span className="text-lg font-semibold text-green-700">
                                        ${dollarAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </span>
                                    )}
                                  </div>
                                  <h3 className="text-lg font-semibold text-gray-900">
                                    {event.description}
                                  </h3>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Purchases;

