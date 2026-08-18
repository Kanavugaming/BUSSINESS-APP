// Centralized error handler — every route can just call next(err) and
// this catches it, so you don't repeat try/catch boilerplate everywhere.
function errorHandler(err, req, res, next) {
  console.error('❌ Error:', err.message);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Something went wrong on the server'
  });
}

module.exports = errorHandler;
