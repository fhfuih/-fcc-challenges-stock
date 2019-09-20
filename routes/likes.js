'use strict';

const keyby = require('lodash.keyby');

/* async */ function setLikes(stocks, ip, collection) {
  if (Array.isArray(stocks)) {
    const stocksUpper = stocks.map(s => s.toUpperCase());
    return collection.bulkWrite(stocksUpper.map(s => ({
      updateOne: {
      filter: { _id: s }, 
      update: { $addToSet: { ip } },
      upsert: true
      }
    })));
  }
  const stockUpper = stocks.toUpperCase();
  return collection.updateOne(
    { _id: stockUpper }, 
    { $addToSet: { ip } },
    { upsert: true }
  );
}

async function getLike(stock, collection) {
  const stockUpper = stock.toUpperCase();
  const data = await collection.aggregate([
    { $match: { _id: stockUpper } },
    { $addFields: { likes: { $size: "$ip" } } },
    { $project: { ip: 0 } }, 
  ]).toArray();
  const doc = data[0] || {};
  return doc.likes || 0;
}

async function getRelLikes(stocks, collection) {
  const stocksUpper = stocks.map(s => s.toUpperCase());
  const data = await collection.aggregate([
    { 
      $match: {
        _id: { $in: stocksUpper }
      }
    },
    {
      $project: {
        likes: { $size: "$ip" }
      }
    },
    {
       $project: { ip: 0 }, 
    },
  ]).toArray();
  
  const relLikeByStock = keyby(data, '_id');
  const r = {};
  stocksUpper.forEach(s => {
    r[s] = relLikeByStock[s] ? relLikeByStock[s].likes : 0
  });
  
  const total = Object.values(r).reduce((a, b) => a + b, 0);
  Object.keys(r).forEach(k => {
    r[k] = r[k] * 2 - total
  });
  
  return r;
}

/* async */ function getLikes(stocks, collection) {
  if (Array.isArray(stocks)) {
    return getRelLikes(stocks, collection);
  }
  return getLike(stocks, collection);
}

module.exports = { getLikes, setLikes };
