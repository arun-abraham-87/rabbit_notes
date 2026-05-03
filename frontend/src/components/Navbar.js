import React, { useEffect, useState } from 'react';
import { Cog6ToothIcon, ChevronDownIcon, PencilSquareIcon, Bars2Icon, XMarkIcon, ArrowUpTrayIcon } from '@heroicons/react/24/solid';
import QuickPasteToggle from './QuickPasteToggle';
import { useLeftPanel } from '../contexts/LeftPanelContext';
import {
  DASHBOARD_NAV_MENU_SETTING_KEY,
  addNoteBackedSettingsListener,
  loadNoteBackedSetting,
  normalizeNavbarMenuSettings,
  saveNoteBackedSetting,
} from '../utils/NoteBackedSettingsUtils';

const Navbar = ({ activePage, setActivePage }) => {
  const [navbarPagesVisibility, setNavbarPagesVisibility] = useState({});
  const [navbarMainBarPages, setNavbarMainBarPages] = useState({});
  const [navbarPagesOrder, setNavbarPagesOrder] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [draggedItem, setDraggedItem] = useState(null);
  const { isVisible } = useLeftPanel();
  const handleBrandClick = () => {
    setActivePage('dashboard');
    setShowDropdown(false);
  };

  const allPageIds = [
    'dashboard', 'notes', 'watch', 'tags', 'journals', 'events',
    'timelines', 'purchases', 'payments', 'countdowns', 'people', 'family-tree',
    'news', 'expense', 'trackers', 'calendar', 'bookmarks', 'assets',
    'stock-vesting', 'pomodoro', 'information', 'over-the-years', 'tiny-habits', 'life-trackers', 'taxes'
  ];

  const applyNavbarSettings = (settings) => {
    const normalized = normalizeNavbarMenuSettings(settings, allPageIds);
    setNavbarPagesVisibility(normalized.visibility);
    setNavbarMainBarPages(normalized.mainBar);
    setNavbarPagesOrder(normalized.order);
    localStorage.setItem('navbarPagesVisibility', JSON.stringify(normalized.visibility));
    localStorage.setItem('navbarMainBarPages', JSON.stringify(normalized.mainBar));
    localStorage.setItem('navbarPagesOrder', JSON.stringify(normalized.order));
  };

  useEffect(() => {
    const saved = localStorage.getItem('navbarPagesVisibility');
    const savedMainBar = localStorage.getItem('navbarMainBarPages');
    const savedOrder = localStorage.getItem('navbarPagesOrder');
    const hasCachedSettings = !!(saved || savedMainBar || savedOrder);
    let localSettings = null;

    try {
      localSettings = normalizeNavbarMenuSettings({
        visibility: saved ? JSON.parse(saved) : undefined,
        mainBar: savedMainBar ? JSON.parse(savedMainBar) : undefined,
        order: savedOrder ? JSON.parse(savedOrder) : undefined,
      }, allPageIds);
      applyNavbarSettings(localSettings);
    } catch (error) {
      console.warn('Failed to load cached navbar settings:', error);
      applyNavbarSettings(null);
    }

    let mounted = true;
    loadNoteBackedSetting(DASHBOARD_NAV_MENU_SETTING_KEY, null)
      .then(noteSettings => {
        if (!mounted) return;
        if (noteSettings) {
          applyNavbarSettings(noteSettings);
          return;
        }
        if (hasCachedSettings && localSettings) {
          saveNoteBackedSetting(DASHBOARD_NAV_MENU_SETTING_KEY, localSettings)
            .catch(error => console.warn('Failed to migrate cached navbar settings to note:', error));
        }
      })
      .catch(error => console.warn('Failed to load note-backed navbar settings:', error));

    const removeListener = addNoteBackedSettingsListener(({ key, value }) => {
      if (key === DASHBOARD_NAV_MENU_SETTING_KEY) applyNavbarSettings(value);
    });

    return () => {
      mounted = false;
      removeListener();
    };
  }, []);

  // Helper to save navbar state to localStorage
  const saveNavbarState = (visibility, mainBar, order) => {
    localStorage.setItem('navbarPagesVisibility', JSON.stringify(visibility));
    localStorage.setItem('navbarMainBarPages', JSON.stringify(mainBar));
    localStorage.setItem('navbarPagesOrder', JSON.stringify(order));
    saveNoteBackedSetting(DASHBOARD_NAV_MENU_SETTING_KEY, {
      visibility,
      mainBar,
      order,
    }).catch(error => console.warn('Failed to save note-backed navbar settings:', error));
  };

  const allNavigationButtons = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'notes', label: 'Notes' },
    { id: 'watch', label: 'Watch' },
    { id: 'tags', label: 'Tags' },
    { id: 'journals', label: 'Journals' },
    { id: 'events', label: 'Events' },
    { id: 'timelines', label: 'Timelines' },
    { id: 'purchases', label: 'Purchases' },
    { id: 'payments', label: 'Payments' },
    { id: 'countdowns', label: 'Countdowns' },
    { id: 'people', label: 'People' },
    { id: 'family-tree', label: 'Family Tree' },
    { id: 'news', label: 'News' },
    { id: 'expense', label: 'Expense' },
    { id: 'trackers', label: 'Trackers' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'bookmarks', label: 'Bookmarks' },
    { id: 'assets', label: 'Assets' },
    { id: 'stock-vesting', label: 'Stock Vesting' },
    { id: 'pomodoro', label: 'Pomodoro' },
    { id: 'information', label: 'Information' },
    { id: 'over-the-years', label: 'Over the Years' },
    { id: 'tiny-habits', label: 'Tiny Habits' },
    { id: 'life-trackers', label: 'Life Trackers' },
    { id: 'taxes', label: 'Taxes' },
  ];

  // Filter visible pages
  const visibleButtons = allNavigationButtons.filter(button => navbarPagesVisibility[button.id]);

  // Create a map for quick lookup
  const buttonMap = {};
  allNavigationButtons.forEach(btn => { buttonMap[btn.id] = btn; });

  // Sort buttons based on saved order if available
  let navigationButtons;
  if (navbarPagesOrder.length > 0) {
    // Use saved order, preserving only visible pages
    const orderedVisible = navbarPagesOrder
      .map(id => buttonMap[id])
      .filter(btn => btn && navbarPagesVisibility[btn.id]);
    
    // Add any visible buttons not in the order (for backward compatibility)
    visibleButtons.forEach(btn => {
      if (!navbarPagesOrder.includes(btn.id)) {
        orderedVisible.push(btn);
      }
    });
    
    navigationButtons = orderedVisible;
  } else {
    // Fallback to original order if no saved order
    navigationButtons = visibleButtons;
  }

  // Split navigation buttons based on main bar preference
  const mainBarButtonIds = new Set(Object.keys(navbarMainBarPages).filter(id => navbarMainBarPages[id]));

  // Split into main bar and dropdown buttons based on saved order
  const mainMenuButtons = navigationButtons.filter(btn => mainBarButtonIds.has(btn.id));
  const dropdownButtons = navigationButtons.filter(btn => !mainBarButtonIds.has(btn.id));

  // Handler to move an item from dropdown to main bar
  const handleMoveToMainBar = (id) => {
    const newMainBar = { ...navbarMainBarPages, [id]: true };

    // If main bar is full (10 items), remove the last main bar item
    const currentMainBarCount = Object.values(newMainBar).filter(v => v === true).length;
    if (currentMainBarCount > 10) {
      // Find and remove the last main bar item from the ordered list
      const lastMainBarItem = mainMenuButtons[mainMenuButtons.length - 1];
      if (lastMainBarItem) {
        newMainBar[lastMainBarItem.id] = false;
      }
    }

    setNavbarMainBarPages(newMainBar);
    saveNavbarState(navbarPagesVisibility, newMainBar, navbarPagesOrder);
    setShowDropdown(false);
  };

  // Handler to remove an item from main bar
  const handleRemoveFromMainBar = (id) => {
    const newMainBar = { ...navbarMainBarPages, [id]: false };
    setNavbarMainBarPages(newMainBar);
    saveNavbarState(navbarPagesVisibility, newMainBar, navbarPagesOrder);
  };

  // Drag-and-drop handlers for main bar reordering
  const handleDragStart = (e, id) => {
    setDraggedItem(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetId) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetId) {
      setDraggedItem(null);
      return;
    }

    // Reorder the mainMenuButtons
    const draggedIndex = mainMenuButtons.findIndex(btn => btn.id === draggedItem);
    const targetIndex = mainMenuButtons.findIndex(btn => btn.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedItem(null);
      return;
    }

    // Create new order by moving dragged item to target position
    const newOrder = [...navbarPagesOrder];
    const draggedPageIndex = newOrder.indexOf(draggedItem);
    const targetPageIndex = newOrder.indexOf(targetId);

    if (draggedPageIndex > -1 && targetPageIndex > -1) {
      newOrder.splice(draggedPageIndex, 1);
      const newTargetIndex = newOrder.indexOf(targetId);
      newOrder.splice(newTargetIndex, 0, draggedItem);

      setNavbarPagesOrder(newOrder);
      saveNavbarState(navbarPagesVisibility, navbarMainBarPages, newOrder);
    }

    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const NavButton = ({ id, label }) => {
    if (isEditMode) {
      return (
        <div
          draggable
          onDragStart={(e) => handleDragStart(e, id)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, id)}
          onDragEnd={handleDragEnd}
          className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 cursor-grab active:cursor-grabbing transition ${
            draggedItem === id
              ? 'opacity-50 bg-gray-100 border-gray-300 shadow-sm'
              : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300'
          }`}
        >
          <Bars2Icon className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span className={`text-sm ${
            activePage === id ? 'text-black font-medium' : 'text-gray-600'
          }`}>
            {label}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRemoveFromMainBar(id);
            }}
            className="ml-auto text-gray-400 hover:text-red-500 transition flex-shrink-0"
            title="Remove from main bar"
          >
            <XMarkIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      );
    }

    return (
      <button
        onClick={() => setActivePage(id)}
        className={`rounded-xl border px-3 py-2 text-sm transition ${
          activePage === id
            ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
            : 'bg-white text-gray-600 border-gray-200 hover:text-gray-900 hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        {label}
      </button>
    );
  };

  const DropdownButton = ({ id, label }) => (
    <div className="group">
      <button
        onClick={() => {
          setActivePage(id);
          setShowDropdown(false);
        }}
        className={`w-full rounded-lg border px-4 py-2 text-sm flex items-center justify-between transition ${
          activePage === id
            ? 'bg-gray-100 text-black font-medium border-gray-300'
            : 'bg-white text-gray-600 border-transparent hover:bg-gray-50 hover:text-black hover:border-gray-200'
        }`}
      >
        <span>{label}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleMoveToMainBar(id);
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-indigo-500 flex-shrink-0"
          title="Move to main bar"
        >
          <ArrowUpTrayIcon className="h-4 w-4" />
        </button>
      </button>
    </div>
  );

  return (
    <nav className={`sticky top-0 z-50 border-b py-4 px-8 bg-background hover:shadow-sm transition-all duration-300 ease-in-out ${
      isVisible ? 'ml-80' : 'ml-0'
    } ${isEditMode ? 'border-dashed border-indigo-400' : ''}`}>
      <div className="w-full mx-auto flex justify-between items-center">
        {/* Left: Brand */}
        <button
          type="button"
          onClick={handleBrandClick}
          aria-label="Go to dashboard"
          className="flex items-center gap-2 cursor-pointer text-left focus:outline-none border-0 bg-transparent p-0"
        >
          <div>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-rabbit h-6 w-6 text-primary"><path d="M13 16a3 3 0 0 1 2.24 5"></path><path d="M18 12h.01"></path><path d="M18 21h-8a4 4 0 0 1-4-4 7 7 0 0 1 7-7h.2L9.6 6.4a1 1 0 1 1 2.8-2.8L15.8 7h.2c3.3 0 6 2.7 6 6v1a2 2 0 0 1-2 2h-1a3 3 0 0 0-3 3"></path><path d="M20 8.54V4a2 2 0 1 0-4 0v3"></path><path d="M7.612 12.524a3 3 0 1 0-1.6 4.3"></path></svg>
          </div>
          <h1 className="text-xl font-bold">Rabbit Notes</h1>
        </button>

        {/* Right: Navigation Buttons */}
        <div className="flex items-center gap-3">
          {/* Main menu navigation buttons (max 10) */}
          <div className={`flex items-center gap-2 overflow-x-auto py-1 ${
            isEditMode ? 'bg-indigo-50 rounded-2xl px-3 py-2 border border-indigo-100' : ''
          }`}>
            {mainMenuButtons.map(button => (
              <NavButton key={button.id} id={button.id} label={button.label} />
            ))}
          </div>

          {/* Edit mode toggle button */}
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`p-2 rounded-xl border transition ${
              isEditMode
                ? 'bg-indigo-100 text-indigo-600 border-indigo-200'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
            }`}
            title={isEditMode ? 'Done editing' : 'Edit main bar'}
          >
            <PencilSquareIcon className="h-5 w-5" />
          </button>

          {/* Dropdown for additional navigation buttons */}
          {dropdownButtons.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 hover:text-black hover:bg-gray-50 hover:border-gray-300 transition"
              >
                <span>More</span>
                <ChevronDownIcon className="h-4 w-4" />
              </button>
              
              {showDropdown && (
                <div className="absolute top-full right-0 mt-2 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-2">
                  <div className="space-y-1">
                    {dropdownButtons.map(button => (
                      <DropdownButton key={button.id} id={button.id} label={button.label} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Settings button */}
          <button
            onClick={() => setActivePage('manage-notes')}
            className={`p-2 rounded-xl border ${
              activePage === 'manage-notes' 
                ? 'bg-[rgb(31_41_55_/_var(--tw-bg-opacity,1))] text-white border-[rgb(31_41_55_/_var(--tw-bg-opacity,1))]' 
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
            } transition`}
            title="Manage Notes"
          >
            <Cog6ToothIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      {/* Click outside to close dropdown */}
      {showDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowDropdown(false)}
        />
      )}
    </nav>
  );
};

export default Navbar;
