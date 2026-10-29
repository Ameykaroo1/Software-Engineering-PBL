const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../services/prisma');
const AuditService = require('../services/auditService');
const { loginSchema } = require('../validators/authValidators');
const { getJwtSecret } = require('../middleware/auth');

class AuthController {
  static async login(req, res, next) {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: parsed.error.errors[0].message
        });
      }

      const { usernameOrEmail, password } = parsed.data;

      // 1. Retrieve user strictly from database by username or email
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { username: usernameOrEmail },
            { email: usernameOrEmail }
          ]
        },
        include: { department: true }
      });

      if (!user) {
        // Audit log failed login
        await AuditService.log({
          action: 'LOGIN_FAILED',
          entityType: 'AUTH',
          entityID: 'UNKNOWN',
          details: { attemptIdentifier: usernameOrEmail, reason: 'User not found' },
          ipAddress: req.ip
        });
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials. Please verify your username/email and password.'
        });
      }

      // 2. Check if account is active
      if (!user.isActive) {
        await AuditService.log({
          userID: user.userID,
          action: 'LOGIN_BLOCKED_DEACTIVATED',
          entityType: 'AUTH',
          entityID: user.userID,
          details: { username: user.username },
          ipAddress: req.ip
        });
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated. Please contact the Hospital System Administrator.'
        });
      }

      // 3. Verify password against stored bcrypt hash
      const passwordValid = await bcrypt.compare(password, user.passwordHash);
      if (!passwordValid) {
        await AuditService.log({
          userID: user.userID,
          action: 'LOGIN_FAILED_PASSWORD',
          entityType: 'AUTH',
          entityID: user.userID,
          details: { username: user.username },
          ipAddress: req.ip
        });
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials. Please verify your username/email and password.'
        });
      }

      // 4. Create session - Sign JWT with actual role retrieved from database
      const jwtSecret = getJwtSecret();
      const token = jwt.sign(
        {
          userID: user.userID,
          username: user.username,
          role: user.role // Sourced strictly from DB, never frontend
        },
        jwtSecret,
        { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
      );

      // Generate cryptographically random CSRF token
      const csrfToken = crypto.randomBytes(24).toString('hex');

      const isProduction = process.env.NODE_ENV === 'production';

      // 5. Set secure HTTP-only session cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 8 * 60 * 60 * 1000, // 8 hours
        path: '/'
      });

      // Set accessible CSRF cookie for client header attachment
      res.cookie('medicore_csrf', csrfToken, {
        httpOnly: false, // Must be readable by client JS to attach in X-CSRF-Token header
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 8 * 60 * 60 * 1000,
        path: '/'
      });

      // Audit log successful login
      await AuditService.log({
        userID: user.userID,
        action: 'LOGIN_SUCCESS',
        entityType: 'AUTH',
        entityID: user.userID,
        details: { username: user.username, role: user.role },
        ipAddress: req.ip
      });

      // 6. Return authenticated user profile.
      // Token is removed from response body as per secure HTTP-only cookie strategy.
      // If an automated test/headless client requests it via x-test-auth header, include for supertest convenience.
      const includeTokenInBody = req.headers['x-test-auth'] === 'true';

      res.json({
        success: true,
        message: `Welcome back, ${user.fullName}`,
        ...(includeTokenInBody ? { token } : {}),
        user: {
          userID: user.userID,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role, // Database-verified role
          departmentID: user.departmentID,
          department: user.department
        }
      });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req, res) {
    if (req.user) {
      await AuditService.log({
        userID: req.user.userID,
        action: 'LOGOUT',
        entityType: 'AUTH',
        entityID: req.user.userID,
        details: { username: req.user.username },
        ipAddress: req.ip
      });
    }

    const isProduction = process.env.NODE_ENV === 'production';

    // Clear session cookies
    res.clearCookie('token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/'
    });

    res.clearCookie('medicore_session', {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/'
    });

    res.clearCookie('medicore_csrf', {
      httpOnly: false,
      secure: isProduction,
      sameSite: 'lax',
      path: '/'
    });

    res.json({
      success: true,
      message: 'Successfully logged out.'
    });
  }

  static async getMe(req, res) {
    // Ensure CSRF cookie is present
    if (!req.cookies || !req.cookies.medicore_csrf) {
      const csrfToken = crypto.randomBytes(24).toString('hex');
      res.cookie('medicore_csrf', csrfToken, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 8 * 60 * 60 * 1000,
        path: '/'
      });
    }

    res.json({
      success: true,
      user: req.user
    });
  }
}

module.exports = AuthController;
