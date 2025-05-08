import React, { useState, useEffect } from 'react';
import { Alerts } from './Alerts';

const QuickPasteToggle = () => {
  const [isQuickPasteEnabled, setIsQuickPasteEnabled] = useState(() => {
    const saved = localStorage.getItem('quickPasteEnabled');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Update localStorage when quick paste state changes
  useEffect(() => {
    localStorage.setItem('quickPasteEnabled', JSON.stringify(isQuickPasteEnabled));
  }, [isQuickPasteEnabled]);

  // Handle Quick Paste toggle shortcut (Ctrl+Shift+Q)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'q') {
        e.preventDefault();
        const newState = !isQuickPasteEnabled;
        setIsQuickPasteEnabled(newState);
        Alerts.info(`Quick Paste ${newState ? 'enabled' : 'disabled'}`);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isQuickPasteEnabled]);

  return (
    <label className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors shadow-sm cursor-pointer">
      <input
        type="checkbox"
        checked={isQuickPasteEnabled}
        onChange={(e) => setIsQuickPasteEnabled(e.target.checked)}
        className="form-checkbox h-4 w-4 text-indigo-600"
      />
      <span>Quick Paste</span>
    </label>
  );
};

export default QuickPasteToggle; 