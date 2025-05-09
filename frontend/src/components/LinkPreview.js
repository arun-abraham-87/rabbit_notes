import React, { useState, useEffect, useRef } from 'react';

const LinkPreview = ({ url }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [position, setPosition] = useState({ right: 20, top: 20 });
  const previewRef = useRef(null);

  useEffect(() => {
    const updatePosition = () => {
      if (!previewRef.current) return;

      const preview = previewRef.current;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const previewWidth = preview.offsetWidth;
      const previewHeight = preview.offsetHeight;

      // Calculate available space
      const rightSpace = viewportWidth - 20; // 20px margin
      const bottomSpace = viewportHeight - 20; // 20px margin

      // Adjust position if preview would overflow
      const newPosition = {
        right: Math.min(20, rightSpace - previewWidth),
        top: Math.min(20, bottomSpace - previewHeight)
      };

      setPosition(newPosition);
    };

    // Update position on load and resize
    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [isLoading]); // Recalculate when loading state changes

  return (
    <div 
      ref={previewRef}
      style={{
        position: 'fixed',
        right: `${position.right}px`,
        top: `${position.top}px`,
        zIndex: 1000,
        width: '1200px', // Increased width
        height: '900px', // Increased height
      }}
      className="bg-white rounded-lg shadow-xl border border-gray-200 p-2"
    >
      {isLoading && (
        <div className="flex items-center justify-center h-144">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      )}
      <iframe
        src={url}
        style={{
          width: '100%',
          height: '100%',
          border: 'none'
        }}
        onLoad={() => setIsLoading(false)}
        sandbox="allow-same-origin allow-scripts"
      />
    </div>
  );
};

export default LinkPreview; 