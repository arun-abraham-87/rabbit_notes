import React, { useEffect, useState } from 'react';
import axios from 'axios';

const GoldPrice = () => {
  const [price, setPrice] = useState(null);

  useEffect(() => {
    const fetchGoldPrice = async () => {
      try {
        const response = await axios.get('https://metals-api.com/api/latest', {
          params: {
            access_key: 'YOUR_API_KEY',
            base: 'INR',
            symbols: 'XAU'
          }
        });
        setPrice(response.data.rates.XAU);
      } catch (error) {
        console.error('Error fetching gold price:', error);
      }
    };

    fetchGoldPrice();
  }, []);

  return (
    <div>
      <h1>Current Gold Price</h1>
      {price ? <p>₹{price} per ounce</p> : <p>Loading...</p>}
    </div>
  );
};

export default GoldPrice; 