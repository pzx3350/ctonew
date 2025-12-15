const healthService = require('../services/healthService');

function getHealth(_req, res) {
  res.json(healthService.getHealth());
}

module.exports = {
  getHealth,
};
