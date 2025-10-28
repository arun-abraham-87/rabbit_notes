import React, { useMemo } from 'react';
import { getDateInDDMMYYYYFormatWithAgeInParentheses } from '../utils/DateUtils';

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
  // Filter purchase events
  const purchaseEvents = useMemo(() => {
    return allNotes
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
  }, [allNotes]);

  // Calculate total
  const totalAmount = useMemo(() => {
    return purchaseEvents.reduce((total, event) => {
      return total + extractDollarAmount(event.description);
    }, 0);
  }, [purchaseEvents]);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Purchases</h1>
        {totalAmount > 0 && (
          <div className="text-xl font-bold text-green-700">
            Total: ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        )}
      </div>

      {purchaseEvents.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No purchase events found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {purchaseEvents.map((event) => {
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
      )}
    </div>
  );
};

export default Purchases;

