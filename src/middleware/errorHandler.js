function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error';
  res.status(Number(status)).json({ error: message });
}

module.exports = errorHandler;
