# Developer Mode Utilities

This module provides utilities for adding developer mode features to React components, specifically for displaying component names during debugging.

## Features

- **Component Name Display**: Shows component names as badges when developer mode is enabled
- **Settings Integration**: Automatically checks for developer mode in user settings
- **Multiple Usage Patterns**: Supports different ways to implement developer mode

## Usage

### 1. Using DevModeInfo Component

The simplest way to add developer mode to any component:

```jsx
import { DevModeInfo } from '../utils/DevUtils';

const MyComponent = ({ settings, children }) => {
  return (
    <DevModeInfo 
      componentName="MyComponent" 
      isDevMode={settings?.developerMode || false}
    >
      <div className="my-component">
        {children}
      </div>
    </DevModeInfo>
  );
};
```

### 2. Using withDevMode HOC

For more complex scenarios, use the higher-order component:

```jsx
import { withDevMode } from '../utils/DevUtils';

const MyComponent = ({ settings, children }) => {
  return (
    <div className="my-component">
      {children}
    </div>
  );
};

// Wrap with developer mode
const MyComponentWithDevMode = withDevMode(MyComponent, 'MyComponent');

// Usage
<MyComponentWithDevMode settings={settings}>
  Content here
</MyComponentWithDevMode>
```

### 3. Manual Implementation

For complete control, implement manually:

```jsx
const MyComponent = ({ settings, children }) => {
  const isDevMode = settings?.developerMode || false;
  
  return (
    <>
      {isDevMode && (
        <div className="dev-mode-wrapper" data-component-name="MyComponent">
          <div className="dev-mode-badge">
            <span className="dev-mode-text">MyComponent</span>
          </div>
        </div>
      )}
      <div className="my-component">
        {children}
      </div>
    </>
  );
};
```

## Settings

Developer mode is controlled by the `developerMode` setting in user preferences:

```javascript
// In settings
{
  developerMode: true, // Enable developer mode
  // ... other settings
}
```

## CSS Classes

The following CSS classes are used for styling:

- `.dev-mode-wrapper`: Container for developer mode badges
- `.dev-mode-badge`: The badge element containing the component name
- `.dev-mode-text`: The text inside the badge

## Styling

The badges are styled with:
- Blue background with transparency
- White text
- Monospace font
- Positioned at top-left of components
- Hover effect to show full component name
- Non-interactive (pointer-events: none)

## Best Practices

1. **Use DevModeInfo for simple cases**: When you just need to wrap a component
2. **Use withDevMode for complex cases**: When you need more control or want to wrap existing components
3. **Pass settings prop**: Always pass the settings object to components that use developer mode
4. **Use descriptive names**: Use clear, descriptive component names for better debugging
5. **Test with developer mode off**: Ensure components work correctly when developer mode is disabled

## Example Implementation

See `DevModeDemo.js` for a complete example showing all three usage patterns. 