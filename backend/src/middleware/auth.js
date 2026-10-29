const jwt = require('jsonwebtoken');
const prisma = require('../services/prisma');

/**
 * Validates and retrieves the JWT Secret from environment variables.
 * Fails startup if missing or insecure.
 */
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || typeof secret !== 'string' || secret.trim().length === 0) {
    throw new Error('CRITICAL SECURITY ERROR: JWT_SECRET environment variable is missing. Server cannot start without a configured secret.');
  }
  if (process.env.NODE_ENV === 'production' && secret.length < 32) {
    throw new Error('CRITICAL SECURITY ERROR: JWT_SECRET must be at least 32 characters in production.');
  }
  return secret;
}

/**
 * Middleware to verify JWT from HTTP-only cookie or Authorization header.
 * Attaches authenticated user object to req.user.
 */
async function authenticate(req, res, next) {
  try {
    const currentSecret = getJwtSecret();
    let token = null;

    // Check HTTP-only cookie
    if (req.cookies && (req.cookies.token || req.cookies.medicore_session)) {
      token = req.cookies.token || req.cookies.medicore_session;
    }
    // Check Authorization header fallback (Bearer <token>)
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No session token provided.'
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, currentSecret);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Your session has expired. Please log in again.'
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid session token. Please re-authenticate.'
      });
    }

    // Retrieve active user from database to ensure fresh state and role
    const user = await prisma.user.findUnique({
      where: { userID: decoded.userID },
      include: {
        department: true
      }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The account associated with this session no longer exists.'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact the System Administrator.'
      });
    }

    // Strip sensitive fields
    delete user.passwordHash;

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.'
    });
  }
}

module.exports = {
  authenticate,
  getJwtSecret
};
