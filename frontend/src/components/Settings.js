import React, { useState, useEffect } from 'react';
import { getSettings, updateSettings, defaultSettings } from '../utils/ApiUtils';

// Common timezones with their offsets and locations
export const timeZones = [
  { label: 'AEST (Sydney, +10:00)', value: 'Australia/Sydney' },
  { label: 'AEDT (Sydney, +11:00)', value: 'Australia/Sydney' },
  { label: 'IST (Mumbai, +5:30)', value: 'Asia/Kolkata' },
  { label: 'EST (New York, -5:00)', value: 'America/New_York' },
  { label: 'EDT (New York, -4:00)', value: 'America/New_York' },
  { label: 'PST (Los Angeles, -8:00)', value: 'America/Los_Angeles' },
  { label: 'PDT (Los Angeles, -7:00)', value: 'America/Los_Angeles' },
  { label: 'GMT (London, +0:00)', value: 'Europe/London' },
  { label: 'BST (London, +1:00)', value: 'Europe/London' },
  { label: 'CET (Paris, +1:00)', value: 'Europe/Paris' },
  { label: 'CEST (Paris, +2:00)', value: 'Europe/Paris' },
  { label: 'JST (Tokyo, +9:00)', value: 'Asia/Tokyo' },
  { label: 'SGT (Singapore, +8:00)', value: 'Asia/Singapore' },
  { label: 'HKT (Hong Kong, +8:00)', value: 'Asia/Hong_Kong' },
  { label: 'CST (Beijing, +8:00)', value: 'Asia/Shanghai' },
  { label: 'MSK (Moscow, +3:00)', value: 'Europe/Moscow' },
  { label: 'SAST (Johannesburg, +2:00)', value: 'Africa/Johannesburg' },
  { label: 'BRT (São Paulo, -3:00)', value: 'America/Sao_Paulo' },
  { label: 'BRST (São Paulo, -2:00)', value: 'America/Sao_Paulo' },
  { label: 'NZST (Auckland, +12:00)', value: 'Pacific/Auckland' },
  { label: 'NZDT (Auckland, +13:00)', value: 'Pacific/Auckland' },
];

const NAVBAR_PAGES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'notes', label: 'Notes' },
  { id: 'todos', label: 'Todos' },
  { id: 'watch', label: 'Watch' },
  { id: 'tags', label: 'Tags' },
  { id: 'journals', label: 'Journals' },
  { id: 'events', label: 'Events' },
  { id: 'timelines', label: 'Timelines' },
  { id: 'purchases', label: 'Purchases' },
  { id: 'payments', label: 'Payments' },
  { id: 'countdowns', label: 'Countdowns' },
  { id: 'people', label: 'People' },
  { id: 'news', label: 'News' },
  { id: 'expense', label: 'Expense' },
  { id: 'trackers', label: 'Trackers' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'bookmarks', label: 'Bookmarks' },
  { id: 'assets', label: 'Assets' },
  { id: 'stock-vesting', label: 'Stock Vesting' },
  { id: 'pomodoro', label: 'Pomodoro' },
  { id: 'information', label: 'Information' },
];

const Settings = ({ onClose, settings, setSettings }) => {
  const [selectedTimezones, setSelectedTimezones] = useState([]);
  const [baseTimezone, setBaseTimezone] = useState('');
  const [navbarPagesVisibility, setNavbarPagesVisibility] = useState({});
  const [navbarMainBarPages, setNavbarMainBarPages] = useState({});
  const [navbarPagesOrder, setNavbarPagesOrder] = useState([]);
  const [quickPasteEnabled, setQuickPasteEnabled] = useState(true);
  const [developerMode, setDeveloperMode] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);

  // Load settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await getSettings();
        const mergedSettings = { ...defaultSettings, ...savedSettings };
        
        // Load local settings from localStorage (for backward compatibility)
        const savedTimezones = localStorage.getItem('selectedTimezones');
        const savedBaseTimezone = localStorage.getItem('baseTimezone');
        const savedNavbarPages = localStorage.getItem('navbarPagesVisibility');
        const savedMainBarPages = localStorage.getItem('navbarMainBarPages');
        const savedPagesOrder = localStorage.getItem('navbarPagesOrder');
        const savedQuickPaste = localStorage.getItem('quickPasteEnabled');
        
        if (savedTimezones) {
          setSelectedTimezones(JSON.parse(savedTimezones));
        }
        if (savedBaseTimezone) {
          setBaseTimezone(savedBaseTimezone);
        }
        if (savedNavbarPages) {
          setNavbarPagesVisibility(JSON.parse(savedNavbarPages));
        } else {
          // Default: all true
          const defaultVis = {};
          NAVBAR_PAGES.forEach(page => { defaultVis[page.id] = true; });
          setNavbarPagesVisibility(defaultVis);
        }
        if (savedMainBarPages) {
          setNavbarMainBarPages(JSON.parse(savedMainBarPages));
        } else {
          // Default: first 10 visible pages on main bar
          const defaultMainBar = {};
          NAVBAR_PAGES.slice(0, 10).forEach(page => { defaultMainBar[page.id] = true; });
          setNavbarMainBarPages(defaultMainBar);
        }
        if (savedPagesOrder) {
          setNavbarPagesOrder(JSON.parse(savedPagesOrder));
        } else {
          // Default: use original NAVBAR_PAGES order
          setNavbarPagesOrder(NAVBAR_PAGES.map(p => p.id));
        }
        if (savedQuickPaste !== null) {
          setQuickPasteEnabled(savedQuickPaste === 'true');
        }
        
        // Set developer mode from settings
        
        setDeveloperMode(mergedSettings.developerMode || false);
        
      } catch (error) {
        console.error('Failed to load settings:', error);
      }
    };
    
    loadSettings();
  }, []);

  const handleTimezoneChange = (index, value) => {
    const newTimezones = [...selectedTimezones];
    newTimezones[index] = value;
    setSelectedTimezones(newTimezones);
  };

  const handleBaseTimezoneChange = (timezone) => {
    setBaseTimezone(timezone);
  };

  const addTimezone = () => {
    if (selectedTimezones.length < 6) {
      setSelectedTimezones([...selectedTimezones, '']);
    }
  };

  const removeTimezone = (index) => {
    const newTimezones = selectedTimezones.filter((_, i) => i !== index);
    setSelectedTimezones(newTimezones);
    // If the removed timezone was the base timezone, clear the base timezone
    if (selectedTimezones[index] === baseTimezone) {
      setBaseTimezone('');
    }
  };

  const handleNavbarPageChange = (id, checked) => {
    setNavbarPagesVisibility(prev => ({ ...prev, [id]: checked }));
    // If page is hidden, also remove from main bar
    if (!checked) {
      setNavbarMainBarPages(prev => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
    }
  };

  const handleMainBarPageChange = (id, checked) => {
    // Count how many pages are currently on main bar
    const currentMainBarCount = Object.values(navbarMainBarPages).filter(v => v === true).length;
    
    // Only allow if page is visible
    if (!navbarPagesVisibility[id]) {
      return;
    }
    
    // If checking and already have 10, don't allow
    if (checked && currentMainBarCount >= 10) {
      alert('You can only have up to 10 pages on the main bar. Please uncheck another page first.');
      return;
    }
    
    setNavbarMainBarPages(prev => {
      if (checked) {
        return { ...prev, [id]: true };
      } else {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      }
    });
  };

  // Drag and drop handlers
  const handleDragStart = (e, pageId) => {
    setDraggedItem(pageId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', pageId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetPageId, isMainBar) => {
    e.preventDefault();
    
    if (!draggedItem || draggedItem === targetPageId) {
      setDraggedItem(null);
      return;
    }

    // Get current order or use default
    let currentOrder = navbarPagesOrder.length > 0 
      ? [...navbarPagesOrder]
      : NAVBAR_PAGES.map(p => p.id);
    
    // Ensure both items are in the order
    if (!currentOrder.includes(draggedItem)) {
      currentOrder.push(draggedItem);
    }
    if (!currentOrder.includes(targetPageId)) {
      currentOrder.push(targetPageId);
    }
    
    // Find indices
    const draggedIndex = currentOrder.indexOf(draggedItem);
    const targetIndex = currentOrder.indexOf(targetPageId);
    
    // Check if dragging within same section or between sections
    const draggedIsMainBar = !!navbarMainBarPages[draggedItem];
    const targetIsMainBar = isMainBar;
    
    if (draggedIsMainBar === targetIsMainBar) {
      // Same section: reorder within section
      // Get all pages in current section (main bar or more)
      const sectionPages = currentOrder.filter(id => 
        isMainBar ? !!navbarMainBarPages[id] : !navbarMainBarPages[id]
      );
      
      // Get other section pages
      const otherSectionPages = currentOrder.filter(id => 
        isMainBar ? !navbarMainBarPages[id] : !!navbarMainBarPages[id]
      );
      
      // Find indices within section
      const sectionDraggedIndex = sectionPages.indexOf(draggedItem);
      const sectionTargetIndex = sectionPages.indexOf(targetPageId);
      
      if (sectionDraggedIndex === -1 || sectionTargetIndex === -1) {
        setDraggedItem(null);
        return;
      }
      
      // Reorder within section
      sectionPages.splice(sectionDraggedIndex, 1);
      sectionPages.splice(sectionTargetIndex, 0, draggedItem);
      
      // Rebuild full order: main bar pages first, then more pages
      const newOrder = isMainBar 
        ? [...sectionPages, ...otherSectionPages]
        : [...otherSectionPages, ...sectionPages];
      
      setNavbarPagesOrder(newOrder);
    } else {
      // Different sections: move item to new section and reorder
      // Remove from old position
      currentOrder.splice(draggedIndex, 1);
      
      // Find new position in target section
      const targetSectionPages = currentOrder.filter(id => 
        isMainBar ? !!navbarMainBarPages[id] : !navbarMainBarPages[id]
      );
      const newTargetIndex = targetSectionPages.indexOf(targetPageId);
      
      if (newTargetIndex === -1) {
        // If target not found in section, append to section
        targetSectionPages.push(draggedItem);
      } else {
        targetSectionPages.splice(newTargetIndex, 0, draggedItem);
      }
      
      // Rebuild order with new section arrangement
      const otherSectionPages = currentOrder.filter(id => 
        isMainBar ? !navbarMainBarPages[id] : !!navbarMainBarPages[id]
      );
      
      const newOrder = isMainBar 
        ? [...targetSectionPages, ...otherSectionPages]
        : [...otherSectionPages, ...targetSectionPages];
      
      setNavbarPagesOrder(newOrder);
    }
    
    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleSave = async () => {
    try {
      
      
      // Save selected timezones, base timezone, navbar pages visibility, main bar pages, pages order, and quick paste to localStorage
      localStorage.setItem('selectedTimezones', JSON.stringify(selectedTimezones));
      localStorage.setItem('baseTimezone', baseTimezone);
      localStorage.setItem('navbarPagesVisibility', JSON.stringify(navbarPagesVisibility));
      localStorage.setItem('navbarMainBarPages', JSON.stringify(navbarMainBarPages));
      localStorage.setItem('navbarPagesOrder', JSON.stringify(navbarPagesOrder));
      localStorage.setItem('quickPasteEnabled', quickPasteEnabled);
      
      // Update settings with developer mode
      const updatedSettings = {
        ...settings,
        developerMode: developerMode
      };
      
      
      
      await updateSettings(updatedSettings);
      setSettings(updatedSettings);
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl p-6 m-4 max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <h2 className="text-2xl font-bold text-gray-800">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6 overflow-y-auto flex-1 pr-2">
          {/* Left Section: Other Settings */}
          <div className="space-y-6 overflow-y-auto pr-4">
          {/* Quick Paste Toggle */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-3 text-gray-700">Quick Paste</h3>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={quickPasteEnabled}
                onChange={e => setQuickPasteEnabled(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-700">Enable Quick Paste in UI</span>
            </label>
          </div>

          {/* Developer Mode Toggle */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-3 text-gray-700">Developer Options</h3>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={developerMode}
                onChange={e => setDeveloperMode(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-gray-700">Enable Developer Mode</span>
            </label>
            <p className="text-sm text-gray-500 mt-1">
              Shows component names for debugging purposes
            </p>
          </div>

          {/* Theme Settings */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-3 text-gray-700">Theme</h3>
            <div className="flex items-center space-x-4">
              <button className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200">
                Light
              </button>
              <button className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200">
                Dark
              </button>
              <button className="px-4 py-2 bg-gray-100 rounded-md hover:bg-gray-200">
                System
              </button>
            </div>
          </div>

          {/* Timezone Settings */}
          <div className="border-b pb-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-700">Timezones</h3>
              {selectedTimezones.length < 6 && (
                <button
                  onClick={addTimezone}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  + Add Timezone
                </button>
              )}
            </div>

            {/* Timezone List */}
            <div className="space-y-3">
              {selectedTimezones.map((timezone, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={timezone === baseTimezone}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setBaseTimezone(timezone);
                        } else {
                          setBaseTimezone('');
                        }
                      }}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-500">Base</span>
                  </div>
                  <select
                    value={timezone}
                    onChange={(e) => {
                      const newTimezone = e.target.value;
                      handleTimezoneChange(index, newTimezone);
                      if (timezone === baseTimezone) {
                        setBaseTimezone(newTimezone);
                      }
                    }}
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Select a timezone</option>
                    {timeZones.map((tz) => (
                      <option key={tz.value} value={tz.value}>
                        {tz.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeTimezone(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Editor Settings */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-3 text-gray-700">Editor</h3>
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="autoSave"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="autoSave" className="ml-2 text-gray-700">
                  Enable auto-save
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="spellCheck"
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="spellCheck" className="ml-2 text-gray-700">
                  Enable spell check
                </label>
              </div>
            </div>
          </div>

          {/* Shortcuts */}
          <div>
            <h3 className="text-lg font-semibold mb-3 text-gray-700">Keyboard Shortcuts</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">New Note</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded">⌘ + N</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Save Note</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded">⌘ + S</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Search</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded">⌘ + F</kbd>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Toggle Sidebar</span>
                <kbd className="px-2 py-1 bg-gray-100 rounded">⌘ + B</kbd>
              </div>
            </div>
          </div>
          </div>

          {/* Right Section: Navbar Pages */}
          <div className="flex flex-col pl-4 border-l border-gray-200 h-full">
          {/* Navbar Pages Visibility */}
          <div className="flex flex-col h-full">
            <h3 className="text-lg font-semibold mb-3 text-gray-700">Navbar Pages</h3>
            <p className="text-sm text-gray-600 mb-3">
              Select pages to show in navbar. You can choose up to 10 pages to display on the main bar (rest will go to "More" dropdown).
            </p>
            <div className="grid grid-cols-2 gap-4 flex-1 overflow-y-auto pr-2">
              {(() => {
                // Create a map for quick lookup
                const pageMap = {};
                NAVBAR_PAGES.forEach(page => { pageMap[page.id] = page; });
                
                // Get ordered pages based on stored order
                const orderedPages = navbarPagesOrder
                  .map(id => pageMap[id])
                  .filter(page => page); // Filter out any undefined
                
                // Add any pages not in the order list (for backward compatibility)
                NAVBAR_PAGES.forEach(page => {
                  if (!navbarPagesOrder.includes(page.id)) {
                    orderedPages.push(page);
                  }
                });
                
                // Split pages into Main Bar and More sections based on stored order
                const mainBarPages = orderedPages.filter(page => !!navbarMainBarPages[page.id]);
                const morePages = orderedPages.filter(page => !navbarMainBarPages[page.id]);
                
                const renderPageItem = (page, index, isMainBar) => {
                  const mainBarCount = Object.values(navbarMainBarPages).filter(v => v === true).length;
                  const isVisible = !!navbarPagesVisibility[page.id];
                  const isOnMainBar = !!navbarMainBarPages[page.id];
                  const canCheckMainBar = isVisible && (isOnMainBar || mainBarCount < 10);
                  const isDragging = draggedItem === page.id;
                
                  return (
                    <div
                      key={page.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, page.id)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, page.id, isMainBar)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center justify-between gap-2 p-2 rounded hover:bg-gray-50 border-b border-gray-100 last:border-b-0 cursor-move transition-all ${isOnMainBar ? 'bg-blue-50' : ''} ${isDragging ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                        </svg>
                        <label className="flex items-center gap-2 flex-1 cursor-pointer min-w-0">
                          <input
                            type="checkbox"
                            checked={isVisible}
                            onChange={e => handleNavbarPageChange(page.id, e.target.checked)}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 flex-shrink-0"
                          />
                          <span className={`text-gray-700 font-medium text-sm truncate ${isOnMainBar ? 'text-blue-700 font-semibold' : ''}`}>{page.label}</span>
                        </label>
                      </div>
                      {isVisible && (
                        <label className="flex items-center gap-1 text-sm cursor-pointer flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isOnMainBar}
                            onChange={e => handleMainBarPageChange(page.id, e.target.checked)}
                            disabled={!canCheckMainBar && !isOnMainBar}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed w-4 h-4"
                          />
                          <span className={`text-xs font-medium whitespace-nowrap ${isOnMainBar ? 'text-blue-600' : 'text-gray-500'}`}>
                            Main
                          </span>
                        </label>
                      )}
                    </div>
                  );
                };
                
                return (
                  <>
                    <div className="space-y-2 border border-gray-200 rounded p-2">
                      <h4 className="text-sm font-semibold text-blue-600 mb-2 px-2">Main Bar ({mainBarPages.length})</h4>
                      {mainBarPages.length > 0 ? (
                        mainBarPages.map((page, index) => renderPageItem(page, index, true))
                      ) : (
                        <p className="text-sm text-gray-400 px-2 py-4 text-center">No pages on main bar</p>
                      )}
                    </div>
                    <div className="space-y-2 border border-gray-200 rounded p-2">
                      <h4 className="text-sm font-semibold text-gray-600 mb-2 px-2">More ({morePages.length})</h4>
                      {morePages.length > 0 ? (
                        morePages.map((page, index) => renderPageItem(page, index, false))
                      ) : (
                        <p className="text-sm text-gray-400 px-2 py-4 text-center">All pages on main bar</p>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
            <p className="text-xs text-gray-500 mt-2 flex-shrink-0">
              Main Bar: {Object.values(navbarMainBarPages).filter(v => v === true).length} / 10 selected
            </p>
          </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3 flex-shrink-0 border-t border-gray-200 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings; 