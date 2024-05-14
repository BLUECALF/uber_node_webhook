// src/config.js
require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3000,
  EXTERNAL_ENDPOINT: process.env.EXTERNAL_ENDPOINT || 'http://example.com/api/endpoint'
};
