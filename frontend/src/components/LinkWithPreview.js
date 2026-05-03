import React from 'react';
import { getInstagramReelsUrl } from '../utils/InstagramUrlUtils';

const LinkWithPreview = ({ url, children }) => {
  return (
    <div className="inline-block">
      <a
        href={getInstagramReelsUrl(url)}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline hover:text-blue-800"
      >
        {children}
      </a>
    </div>
  );
};

export default LinkWithPreview; 
