/**
 * CSRF Protection Middleware for Cookie-based Authentication
 * Protects state-changing requests (POST, PUT, PATCH, DELETE) from cross-site request forgery.
 * Requires a matching X-CSRF-Token header when the request is authenticated via session cookies.
 */
function csrfProtection(req, res, next) {
  // Safe HTTP methods do not mutate server state
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Pre-authentication & session termination endpoints
  const exemptPaths = ['/api/auth/login', '/login', '/api/auth/logout', '/logout'];
  if (exemptPaths.includes(req.path) || exemptPaths.includes(req.originalUrl)) {
    return next();
  }

  // Check if session cookie is present
  const sessionCookie = req.cookies?.token || req.cookies?.medicore_session;
  if (!sessionCookie) {
    // If not authenticated via ambient browser cookie (e.g. non-browser API client), pass through
    return next();
  }

  // Cookie-authenticated state change: enforce double-submit CSRF token
  const clientCsrfToken = req.headers['x-csrf-token'];
  const expectedCsrfToken = req.cookies?.medicore_csrf;

  if (!expectedCsrfToken || !clientCsrfToken || clientCsrfToken !== expectedCsrfToken) {
    return res.status(403).json({
      success: false,
      message: 'CSRF security validation failed: Missing or invalid anti-CSRF token.'
    });
  }

  next();
}

module.exports = {
  csrfProtection
};
