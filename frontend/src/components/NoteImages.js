import React, { useState, useEffect } from 'react';
import { PhotoIcon, ExclamationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

// API Base URL for consistent API calls
const API_BASE_URL = 'http://localhost:5001/api';

const NoteImages = ({ imageIds, onDeleteImage }) => {
  const [imageStates, setImageStates] = useState({});

  useEffect(() => {
    if (!imageIds || imageIds.length === 0) return;

    // Initialize states for all images
    const initialStates = {};
    imageIds.forEach(id => {
      initialStates[id] = { loading: true, error: false, url: null };
    });
    setImageStates(initialStates);

    // Load each image
    const loadImages = async () => {
      // Try common extensions in order of likelihood (png first since it's most common for screenshots)
      const extensions = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
      
      for (const imageId of imageIds) {
        let found = false;
        
        for (const ext of extensions) {
          try {
            const response = await fetch(`${API_BASE_URL}/images/${imageId}.${ext}`, { method: 'HEAD' });
            
            if (response.ok) {
              setImageStates(prev => ({
                ...prev,
                [imageId]: { loading: false, error: false, url: `${API_BASE_URL}/images/${imageId}.${ext}` }
              }));
              found = true;
              break;
            }
          } catch (error) {
            // Continue to next extension
            continue;
          }
        }
        
        if (!found) {
          setImageStates(prev => ({
            ...prev,
            [imageId]: { loading: false, error: true, url: null }
          }));
        }
      }
    };
    
    loadImages();
  }, [imageIds]);

  if (!imageIds || imageIds.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {imageIds.map(imageId => {
        const state = imageStates[imageId];
        
        if (!state) return null;

        if (state.loading) {
          return (
            <div key={imageId} className="flex items-center justify-center w-24 h-24 bg-gray-100 rounded-lg">
              <div className="flex flex-col items-center space-y-1 text-gray-500">
                <PhotoIcon className="h-5 w-5 animate-pulse" />
                <span className="text-xs">Loading...</span>
              </div>
            </div>
          );
        }

        if (state.error) {
          return (
            <div key={imageId} className="flex items-center justify-center w-24 h-24 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300">
              <div className="flex flex-col items-center space-y-1 text-gray-400">
                <ExclamationCircleIcon className="h-5 w-5" />
                <span className="text-xs">Not found</span>
              </div>
            </div>
          );
        }

        if (state.url) {
          return (
            <div key={imageId} className="relative w-24 h-24 rounded-lg overflow-hidden border border-gray-200 hover:border-gray-400 transition-colors duration-200 group">
              <img
                src={state.url}
                alt={`Image ${imageId}`}
                className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity duration-200"
                onError={() => {
                  setImageStates(prev => ({
                    ...prev,
                    [imageId]: { loading: false, error: true, url: null }
                  }));
                }}
                onClick={() => {
                  // Open image in new tab for full view
                  window.open(state.url, '_blank');
                }}
                title="Click to view full size"
              />
              {/* Delete button - shows on hover */}
              {onDeleteImage && (
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent opening image in new tab
                    onDeleteImage(imageId);
                  }}
                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg"
                  title="Delete image"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        }

        return null;
      })}
    </div>
  );
};

export default NoteImages; 