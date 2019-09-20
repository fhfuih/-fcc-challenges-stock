/*
*
*
*       Complete the API routing below
*
*
*/

'use strict';

var keyby = require('lodash.keyby');
var expect = require('chai').expect;
var MongoClient = require('mongodb');

var getStock = require('./getStock');
var { getLikes, setLikes } = require('./likes');

const CONNECTION_STRING = process.env.DB; //MongoClient.connect(CONNECTION_STRING, function(err, db) {});

module.exports = function (app, cb = () => {}) {
  MongoClient.connect(CONNECTION_STRING, { useNewUrlParser: true, useUnifiedTopology: true }, (err, client) => {
    if (err) {
      console.warn(err);
      return;
    }
    
    const collection = client.db('infoSec').collection('stockLikes');
    
    app.route('/api/stock-prices')
      .get(function (req, res, next){
        // store real IP (behind reverse-proxy) in req
        const xForwardedFor = req.header('x-forwarded-for') || '';
        req.realIp = xForwardedFor.split(',')[0];
        if (!req.realIp.length) {
          req.realIp = req.ip;
        }
        next();
      }, async function (req, res) {
        const { realIp: ip } = req;
        let { stock: stocks, like } = req.query;
        like = like === 'true';
      
        const isMultiple = Array.isArray(stocks);
      
        const stocksPromise = getStock(stocks);
        const likesPromise = 
          like 
            ? setLikes(stocks, ip, collection).then(() => getLikes(stocks, collection))
            : getLikes(stocks, collection);
      
        const [
          stocksResult,
          likesResult,
        ] = await Promise.all([
          stocksPromise,
          likesPromise
        ]);
      
        if (isMultiple) {
          // likesResult is {stock: rel_likes}
          // stocksResult is [{data, error}]          
          const errors = stocksResult.map(s => s.error).filter(e => !!e);
          const status = errors.some(e => e.status === 404) ? 404 : 500;
          if (errors.length) {
            return res.status(status).json({
              error: errors
            });
          }
          
          const stockData = stocksResult.map(({ data }) => ({
            ...data,
            rel_likes: likesResult[data.stock]
          }));
          
          return res.json({ stockData });
        }
      
        // likesResult is int
        // stocksResult is {data, error}
        const { error } = stocksResult;
        if (error) {
          return res.status(error.status).json({ error })
        }
      
        const stockData = {
          ...stocksResult.data,
          likes: likesResult
        };
      
        res.json({ stockData });
      });
    
    cb();
  })
};
