import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';

export default function LinkSelectionPopup({ showLinkPopup, setShowLinkPopup, linkPopupLinks, setLinkPopupLinks, selectedLinkIndex, setSelectedLinkIndex }) {
  if (!showLinkPopup) return null;
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      data-link-popup
      tabIndex={0}
    >
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Select Link to Open</h2>
          <button
            onClick={() => {
              setShowLinkPopup(false);
              setLinkPopupLinks([]);
              setSelectedLinkIndex(0);
            }}
            className="text-gray-500 hover:text-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {/* Open all links option */}
          <div
            className={`p-3 rounded-lg border cursor-pointer transition-colors ${
              selectedLinkIndex === 0
                ? 'bg-blue-100 border-blue-300 text-blue-800'
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
            }`}
            onClick={() => {
              linkPopupLinks.forEach(link => window.open(link.url, '_blank'));
              setShowLinkPopup(false);
              setLinkPopupLinks([]);
              setSelectedLinkIndex(0);
            }}
          >
            <div className="text-sm font-medium truncate">Open all links</div>
            <div className="text-xs text-gray-500 mt-1">
              {selectedLinkIndex === 0 ? 'Press Enter to open all' : 'Click or use arrow keys'}
            </div>
          </div>
          {/* Individual links */}
          {linkPopupLinks.map((link, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                selectedLinkIndex === index + 1
                  ? 'bg-blue-100 border-blue-300 text-blue-800'
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              }`}
              onClick={() => {
                window.open(link.url, '_blank');
                setShowLinkPopup(false);
                setLinkPopupLinks([]);
                setSelectedLinkIndex(0);
              }}
            >
              <div className="text-sm font-medium truncate">{link.text || link.url}</div>
              <div className="text-xs text-gray-500 mt-1">
                {selectedLinkIndex === index + 1 ? 'Press Enter to open' : 'Click or use arrow keys'}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-sm text-gray-600">
          <p>Use ↑↓ arrows to navigate, Enter to open, 'a' to open all, Esc to cancel</p>
        </div>
      </div>
    </div>
  );
} 