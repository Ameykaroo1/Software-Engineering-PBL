const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const { authenticate, getJwtSecret } = require('../middleware/auth');
const jwt = require('jsonwebtoken');

router.post('/login', AuthController.login);

// Logout: clears cookies. Attaches user to req.user for audit logging if session token is still valid.
router.post('/logout', (req, res, next) => {
  const token = req.cookies?.token || req.cookies?.medicore_session;
  if (token) {
    try {
      const decoded = jwt.verify(token, getJwtSecret());
      req.user = decoded;
    } catch (e) {
      // Session expired or invalid; still proceed to clear cookies
    }
  }
  AuthController.logout(req, res);
});

router.get('/me', authenticate, AuthController.getMe);

module.exports = router;
