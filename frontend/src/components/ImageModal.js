import React, { useRef } from 'react';

/**
 * Modal to display and zoom a pasted image.
 *
 * Props:
 * - imageUrl: string|null      — URL of the image to show (falsy → hidden)
 * - isLoading: boolean         — whether to show the spinner overlay
 * - scale: number              — current zoom level (e.g. 0.5, 1, 1.5, 2.5)
 * - onScaleChange: (s: number) => void   — called when user picks a new zoom
 * - onImageLoad: () => void    — called once the image has finished loading
 * - onClose: () => void        — called to close the modal
 */
export default function ImageModal({
  imageUrl,
  isLoading,
  scale,
  onScaleChange,
  onImageLoad,
  onClose,
}) {
  const containerRef = useRef(null);
  if (!imageUrl) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div
        ref={containerRef}
        className="relative bg-white p-4 rounded shadow-lg resize overflow-auto"
        style={{ width: 'auto', height: 'auto' }}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80">
            <div className="w-10 h-10 animate-spin border-4 border-purple-600 border-t-transparent rounded-full" />
          </div>
        )}

        <div className="flex justify-center gap-2 mb-2">
          {[0.5, 1, 1.5, 2.5].map(s => (
            <button
              key={s}
              onClick={() => onScaleChange(s)}
              className="px-3 py-1 text-sm bg-purple-100 text-purple-800 rounded hover:bg-purple-200"
            >
              {Math.round(s * 100)}%
            </button>
          ))}
        </div>

        <img
          src={imageUrl}
          alt="Full"
          onLoad={onImageLoad}
          style={{
            width: containerRef.current
              ? `${containerRef.current.offsetWidth * scale}px`
              : 'auto',
            height: 'auto',
          }}
          className="max-w-screen-md max-h-screen object-contain"
        />

        <button
          onClick={onClose}
          className="absolute top-2 right-2 bg-gray-800 text-white px-2 py-1 rounded hover:bg-gray-700"
        >
          Close
        </button>
      </div>
    </div>
  );
}