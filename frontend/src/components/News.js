import React from 'react';
import StockPrice from './Stocks';
import NewsFeed from './NewsFeed';

const News = () => {
  return (
    <div className="p-4 max-w-4xl mx-auto">
      <StockPrice />
      <NewsFeed />
    </div>
  );
};

export default News; 