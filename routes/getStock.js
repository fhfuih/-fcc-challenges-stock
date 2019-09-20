'use strict';

const axios = require('axios');

async function getStockSingle(stock) {
  const { API_KEY } = process.env;
  try {
    const res = await axios.get(
      `https://api.worldtradingdata.com/api/v1/stock_search?api_token=${API_KEY}&stock_exchange=NASDAQ&search_term=${stock}&search_by=symbol`
    );

    for (const s of res.data.data) {
      if (stock.toUpperCase() === s.symbol) {
        const { symbol, price } = s;
        return {
          data: {
            stock: symbol,
            price
          }
        };
      }
    }
  } catch (error) {
    const defaultErrorMessage = 'Unknown error returned from stock API server. Perhaps the free tier monthly query limit is reached, or a internal error occurs.'
    // if API returns non-2xx with JSON
    if (error.response && error.response.data) {
      // if API returns a JSON with message, use it as error message
      if (!error.resoponse.data.message) {
        error.resoponse.data.message = defaultErrorMessage;
      }
      return {
        error: {
          status: error.response.status,
          error: error.response.data
        }
      };
    }
    // if API returns non-2xx with nothing
    return {
      error: {
        status: 500,
        error: new Error(defaultErrorMessage)
      }
    };
  }

  // if API returns 2xx but the seach result is empty
  return {
    error: {
      status: 404,
      error: new Error(`Cannot find the stock ${stock}`)
    }
  };
}

/* async */ function getStocks(stocks) {
  if (Array.isArray(stocks)) {
    return Promise.all(stocks.map(s => getStockSingle(s)));
  } else if (typeof stocks === 'string') {
    return getStockSingle(stocks);
  }
}

module.exports = getStocks;
