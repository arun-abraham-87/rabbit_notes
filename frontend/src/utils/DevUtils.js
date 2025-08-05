// Utility functions for developer mode features

/**
 * Gets the display name of a React component
 * @param {React.Component} Component - The React component
 * @returns {string} The display name or function name
 */
export const getComponentDisplayName = (Component) => {
  if (Component.displayName) {
    return Component.displayName;
  }
  
  if (Component.name) {
    return Component.name;
  }
  
  if (typeof Component === 'function') {
    return Component.name || 'AnonymousComponent';
  }
  
  return 'UnknownComponent';
};

/**
 * Higher-order component that adds developer mode debugging info
 * @param {React.Component} WrappedComponent - The component to wrap
 * @param {string} customName - Optional custom name to display
 * @returns {React.Component} The wrapped component
 */
export const withDevMode = (WrappedComponent, customName = null) => {
  const displayName = customName || getComponentDisplayName(WrappedComponent);
  
  const DevModeWrapper = (props) => {
    // Check if developer mode is enabled in settings
    const isDevMode = props.settings?.developerMode || false;
    
    if (!isDevMode) {
      return <WrappedComponent {...props} />;
    }
    
    return (
      <div className="dev-mode-wrapper" data-component-name={displayName}>
        <div className="dev-mode-badge">
          <span className="dev-mode-text">{displayName}</span>
        </div>
        <WrappedComponent {...props} />
      </div>
    );
  };
  
  DevModeWrapper.displayName = `withDevMode(${displayName})`;
  
  return DevModeWrapper;
};

/**
 * Hook to get developer mode status
 * @param {Object} settings - The settings object
 * @returns {boolean} Whether developer mode is enabled
 */
export const useDevMode = (settings) => {
  return settings?.developerMode || false;
};

/**
 * Component that renders developer mode info for any component
 * @param {Object} props - Component props
 * @param {string} props.componentName - The name of the component
 * @param {React.ReactNode} props.children - The component content
 * @param {boolean} props.isDevMode - Whether developer mode is enabled
 * @returns {React.ReactNode} The wrapped component
 */
export const DevModeInfo = ({ componentName, children, isDevMode }) => {
  
  
  if (!isDevMode) {
    return children;
  }
  
  return (
    <div className="dev-mode-wrapper" data-component-name={componentName}>
      <div className="dev-mode-badge">
        <span className="dev-mode-text">{componentName}</span>
      </div>
      {children}
    </div>
  );
}; 