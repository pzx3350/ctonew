function errorHandler(err, req, res, _next) {
  const status = err.status || 500;

  const payload = {
    error: err.message || 'Internal Server Error',
  };

  if (process.env.NODE_ENV !== 'production' && err.stack) {
    payload.stack = err.stack;
  }

  if (req.originalUrl.startsWith('/api')) {
    res.status(status).json(payload);
    return;
  }

  res.status(status).send(payload.error);
}

module.exports = errorHandler;
