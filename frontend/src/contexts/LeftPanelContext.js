import React, { createContext, useContext, useState, useEffect } from 'react';

const LeftPanelContext = createContext();

export function LeftPanelProvider({ children }) {
  const [isPinned, setIsPinned] = useState(() => {
    const saved = localStorage.getItem('sidebarPermanentlyVisible');
    return saved ? JSON.parse(saved) : false;
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

  const isVisible = isHovered || isPinned;

  return (
    <LeftPanelContext.Provider value={{
      isPinned,
      isHovered,
      isVisible,
      togglePinned,
      setHovered
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