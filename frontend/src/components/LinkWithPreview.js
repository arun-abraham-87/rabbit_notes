import React, { useState } from 'react';
import LinkPreview from './LinkPreview';

const LinkWithPreview = ({ url, children }) => {
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="inline-block">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline hover:text-blue-800"
        onMouseEnter={() => setShowPreview(true)}
        onMouseLeave={() => setShowPreview(false)}
      >
        {children}
      </a>
      {showPreview && (
        <div
          style={{
            position: 'fixed',
            right: '20px',
            top: '20px',
            zIndex: 1000,
          }}
        >
          <LinkPreview url={url} />
        </div>
      )}
    </div>
  );
};

export default LinkWithPreview; 