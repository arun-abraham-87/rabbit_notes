import React, { createContext, useContext, useState, useEffect } from 'react';

const LeftPanelContext = createContext();
const clampPanelWidth = (width) => Math.min(560, Math.max(280, width));

export function LeftPanelProvider({ children }) {
  const [isPinned, setIsPinned] = useState(() => {
    const saved = localStorage.getItem('sidebarPermanentlyVisible');
    return saved ? JSON.parse(saved) : false;
  });
  const [panelWidth, setPanelWidthState] = useState(() => {
    try {
      return clampPanelWidth(Number(localStorage.getItem('bookmarksPanelWidth')) || 320);
    } catch {
      return 320;
    }
  });

  const [isHovered, setIsHovered] = useState(false);

  // Update localStorage when pinned state changes
  useEffect(() => {
    localStorage.setItem('sidebarPermanentlyVisible', JSON.stringify(isPinned));
  }, [isPinned]);

  const togglePinned = () => {
    setIsPinned(prev => !prev);
    if (!isPinned) {
      setIsHovered(false); // Hide if unpinned and not hovered
    }
  };

  const setHovered = (hovered) => {
    setIsHovered(hovered);
  };

  const setPanelWidth = (width) => {
    const nextWidth = clampPanelWidth(width);
    setPanelWidthState(nextWidth);
    localStorage.setItem('bookmarksPanelWidth', String(nextWidth));
  };

  const isVisible = isHovered || isPinned;

  return (
    <LeftPanelContext.Provider value={{
      isPinned,
      isHovered,
      isVisible,
      panelWidth,
      togglePinned,
      setHovered,
      setPanelWidth
    }}>
      {children}
    </LeftPanelContext.Provider>
  );
}

export function useLeftPanel() {
  const context = useContext(LeftPanelContext);
  if (!context) {
    throw new Error('useLeftPanel must be used within a LeftPanelProvider');
  }
  return context;
} 
