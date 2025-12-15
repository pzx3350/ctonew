const express = require('express');

const jsonParser = express.json({ limit: '2mb' });
const urlencodedParser = express.urlencoded({ extended: true, limit: '2mb' });

module.exports = {
  jsonParser,
  urlencodedParser,
};
