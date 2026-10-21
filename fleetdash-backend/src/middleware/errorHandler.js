function notFound(req, res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.status = 404;
  next(error);
}

function errorHandler(error, req, res, next) { // eslint-disable-line no-unused-vars
  const status = error.status || (error.type === "entity.parse.failed" ? 400 : 500);
  if (status >= 500) console.error(error);
  res.status(status).json({ success: false, error: status >= 500 ? "Internal server error" : error.message });
}

module.exports = { notFound, errorHandler };
