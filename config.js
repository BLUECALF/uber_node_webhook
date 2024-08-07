// src/config.js
require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 3000,
  EXTERNAL_ENDPOINT: process.env.EXTERNAL_ENDPOINT || 'http://example.com/api/endpoint',
  PROD_ENDPOINT: process.env.PROD_ENDPOINT || 'http://example.com/api/endpoint',
  VERIFY_DRIVER_ENDPOINT: process.env.VERIFY_DRIVER_ENDPOINT
};
