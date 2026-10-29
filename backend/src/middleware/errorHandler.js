/**
 * Global Error Handler Middleware
 */
function errorHandler(err, req, res, next) {
  // CORS Origin Blocked
  if (err.message && err.message.startsWith('CORS blocked:')) {
    return res.status(403).json({
      success: false,
      message: err.message
    });
  }

  console.error('Unhandled Application Error:', err);

  // Prisma unique constraint violation
  if (err.code === 'P2002') {
    const target = err.meta?.target ? ` (${err.meta.target})` : '';
    return res.status(409).json({
      success: false,
      message: `A record with this unique value already exists${target}.`
    });
  }

  // Prisma foreign key constraint failure
  if (err.code === 'P2003') {
    return res.status(400).json({
      success: false,
      message: 'Invalid relationship reference. The referenced record does not exist.'
    });
  }

  // Prisma record not found
  if (err.code === 'P2025') {
    return res.status(404).json({
      success: false,
      message: err.meta?.cause || 'The requested resource was not found.'
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'An unexpected internal server error occurred.';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

module.exports = errorHandler;
