function getHealth() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
}

module.exports = {
  getHealth,
};
