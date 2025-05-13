import React from 'react';
import TrackerCard from './TrackerCard';

export default function TrackerGrid({ trackers, onToggleDay, trackerAnswers = {}, onEdit, isFocusMode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {trackers.map(tracker => (
        <TrackerCard
          key={tracker.id}
          tracker={tracker}
          onToggleDay={onToggleDay}
          answers={trackerAnswers[tracker.id] || []}
          onEdit={onEdit}
          isFocusMode={isFocusMode}
        />
      ))}
    </div>
  );
} 