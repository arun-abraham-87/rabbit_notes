import React from 'react';
import StockPrice from './Stocks';
import NewsFeed from './NewsFeed';

const News = () => {
  return (
    <div className="p-4 w-full h-full">
      <StockPrice />
      <NewsFeed />
    </div>
  );
};

export default News; 