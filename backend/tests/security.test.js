require('dotenv').config();
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../src/app');
const prisma = require('../src/services/prisma');
const { getJwtSecret } = require('../src/middleware/auth');

describe('MediCore Authentication & Authorization Security Test Suite', () => {
  before(async () => {
    await prisma.$connect();
  });

  after(async () => {
    await prisma.$disconnect();
  });

  // 1. Invalid credentials cannot log in
  test('1. Invalid credentials cannot log in (401)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        usernameOrEmail: 'admin',
        password: 'DefinitivelyWrongPassword999!'
      });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.message.includes('Invalid credentials'));
    // Ensure no session cookie was set
    const cookies = res.headers['set-cookie'] || [];
    assert.strictEqual(cookies.some((c) => c.includes('token=')), false);
  });

  // 2. Valid credentials authenticate the correct database user
  test('2. Valid credentials authenticate the correct database user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        usernameOrEmail: 'admin@medicore.hospital',
        password: 'AdminPassword123!'
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.user.username, 'admin');
    assert.strictEqual(res.body.user.role, 'HOSPITAL_ADMINISTRATOR');

    // Verify session cookie was issued
    const cookies = res.headers['set-cookie'];
    assert.ok(cookies);
    assert.ok(cookies.some((c) => c.includes('token=') && c.includes('HttpOnly')));
  });

  // 3. Changing a frontend role value does not change the authenticated role
  test('3. Changing a frontend role value does not change the authenticated role', async () => {
    // Authenticate as Reception Staff
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        usernameOrEmail: 'reception',
        password: 'Reception123!'
      });
    const sessionCookie = loginRes.headers['set-cookie'];

    // Send request attempting to spoof role in request headers or body to access admin endpoints
    const spoofedRes = await request(app)
      .get('/api/users')
      .set('Cookie', sessionCookie)
      .set('X-User-Role', 'SYSTEM_ADMINISTRATOR')
      .send({ role: 'SYSTEM_ADMINISTRATOR' });

    assert.strictEqual(spoofedRes.status, 403);
    assert.strictEqual(spoofedRes.body.success, false);
    assert.ok(spoofedRes.body.message.includes('Forbidden'));
  });

  // 4. Sending a role in the login request cannot grant additional permissions
  test('4. Sending a role in the login request cannot grant additional permissions', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        usernameOrEmail: 'reception',
        password: 'Reception123!',
        role: 'SYSTEM_ADMINISTRATOR', // Maliciously requested elevation
        requestedRole: 'SYSTEM_ADMINISTRATOR'
      });

    assert.strictEqual(res.status, 200);
    // Role MUST remain what is in MySQL database, never the requested parameter
    assert.strictEqual(res.body.user.role, 'RECEPTION_STAFF');

    const sessionCookie = res.headers['set-cookie'];
    const verifyRes = await request(app)
      .get('/api/users')
      .set('Cookie', sessionCookie);

    assert.strictEqual(verifyRes.status, 403);
  });

  // 5. Unauthenticated users cannot access protected endpoints
  test('5. Unauthenticated users cannot access protected endpoints (401)', async () => {
    const endpoints = [
      { method: 'get', path: '/api/resources' },
      { method: 'get', path: '/api/allocations' },
      { method: 'get', path: '/api/users' },
      { method: 'get', path: '/api/audit-logs' },
      { method: 'get', path: '/api/reports/utilization' },
      { method: 'get', path: '/api/auth/me' }
    ];

    for (const ep of endpoints) {
      const res = await request(app)[ep.method](ep.path);
      assert.strictEqual(res.status, 401, `Expected 401 on unauthenticated ${ep.method.toUpperCase()} ${ep.path}`);
      assert.strictEqual(res.body.success, false);
    }
  });

  // 6. Reception Staff cannot manage administrator accounts
  test('6. Reception Staff cannot manage administrator accounts (403)', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ usernameOrEmail: 'reception', password: 'Reception123!' });
    const sessionCookie = loginRes.headers['set-cookie'];

    const res = await request(app)
      .post('/api/users')
      .set('Cookie', sessionCookie)
      .send({
        username: 'hacked_admin',
        email: 'hacked@medicore.hospital',
        password: 'Password123!',
        fullName: 'Hacked Admin',
        role: 'SYSTEM_ADMINISTRATOR'
      });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
  });

  // 7. Department Coordinators cannot access unrestricted system administration
  test('7. Department Coordinators cannot access unrestricted system administration (403)', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ usernameOrEmail: 'coord_icu', password: 'CoordPassword123!' });
    const sessionCookie = loginRes.headers['set-cookie'];

    const usersRes = await request(app).get('/api/users').set('Cookie', sessionCookie);
    assert.strictEqual(usersRes.status, 403);

    const auditRes = await request(app).get('/api/audit-logs').set('Cookie', sessionCookie);
    assert.strictEqual(auditRes.status, 403);
  });

  // 8. Hospital Administrators cannot access System Administrator-only endpoints
  test('8. Hospital Administrators cannot access System Administrator-only endpoints (403)', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ usernameOrEmail: 'admin', password: 'AdminPassword123!' });
    const sessionCookie = loginRes.headers['set-cookie'];

    const usersRes = await request(app).get('/api/users').set('Cookie', sessionCookie);
    assert.strictEqual(usersRes.status, 403);

    const auditRes = await request(app).get('/api/audit-logs').set('Cookie', sessionCookie);
    assert.strictEqual(auditRes.status, 403);
  });

  // 9. System Administrator access is available only to authenticated accounts assigned that role
  test('9. System Administrator access is available only to authenticated accounts assigned that role', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ usernameOrEmail: 'sysadmin', password: 'Sysadmin123!' });
    const sessionCookie = loginRes.headers['set-cookie'];

    const usersRes = await request(app).get('/api/users').set('Cookie', sessionCookie);
    assert.strictEqual(usersRes.status, 200);
    assert.strictEqual(usersRes.body.success, true);
    assert.ok(Array.isArray(usersRes.body.users));

    const auditRes = await request(app).get('/api/audit-logs').set('Cookie', sessionCookie);
    assert.strictEqual(auditRes.status, 200);
    assert.strictEqual(auditRes.body.success, true);
  });

  function extractCsrfToken(res) {
    const cookies = res.headers['set-cookie'] || [];
    const match = cookies.join('; ').match(/medicore_csrf=([^;]+)/);
    return match ? match[1] : '';
  }

  // 10. Deactivated accounts cannot continue accessing protected endpoints
  test('10. Deactivated accounts cannot continue accessing protected endpoints (403)', async () => {
    // 1. Create a temporary user
    const tempUsername = `temp_active_${Date.now()}`;
    const sysLogin = await request(app)
      .post('/api/auth/login')
      .send({ usernameOrEmail: 'sysadmin', password: 'Sysadmin123!' });
    const sysCookie = sysLogin.headers['set-cookie'];
    const csrfToken = extractCsrfToken(sysLogin);

    const createdUserRes = await request(app)
      .post('/api/users')
      .set('Cookie', sysCookie)
      .set('X-CSRF-Token', csrfToken)
      .send({
        username: tempUsername,
        email: `${tempUsername}@medicore.hospital`,
        password: 'TempPassword123!',
        fullName: 'Temporary Active User',
        role: 'RECEPTION_STAFF'
      });
    assert.strictEqual(createdUserRes.status, 201);
    const tempUserID = createdUserRes.body.user.userID;

    // 2. Log in as temporary user and get active session cookie
    const tempLogin = await request(app)
      .post('/api/auth/login')
      .send({ usernameOrEmail: tempUsername, password: 'TempPassword123!' });
    assert.strictEqual(tempLogin.status, 200);
    const tempCookie = tempLogin.headers['set-cookie'];

    // Verify temp user can access resources
    const checkActive = await request(app).get('/api/resources').set('Cookie', tempCookie);
    assert.strictEqual(checkActive.status, 200);

    // 3. Deactivate the user
    await prisma.user.update({
      where: { userID: tempUserID },
      data: { isActive: false }
    });

    // 4. Existing session cookie MUST immediately be rejected with 403
    const checkDeactivated = await request(app).get('/api/resources').set('Cookie', tempCookie);
    assert.strictEqual(checkDeactivated.status, 403);
    assert.ok(checkDeactivated.body.message.includes('deactivated'));

    // 5. Subsequent login attempt must also be rejected
    const reloginRes = await request(app)
      .post('/api/auth/login')
      .send({ usernameOrEmail: tempUsername, password: 'TempPassword123!' });
    assert.strictEqual(reloginRes.status, 403);
  });

  // 11. Missing JWT_SECRET prevents the production server from starting
  test('11. Missing JWT_SECRET prevents the production server from starting', () => {
    const originalSecret = process.env.JWT_SECRET;
    const originalEnv = process.env.NODE_ENV;

    try {
      delete process.env.JWT_SECRET;
      process.env.NODE_ENV = 'production';

      assert.throws(() => {
        getJwtSecret();
      }, /CRITICAL SECURITY ERROR: JWT_SECRET environment variable is missing/);
    } finally {
      process.env.JWT_SECRET = originalSecret;
      process.env.NODE_ENV = originalEnv;
    }
  });

  // 12. Unexpected production CORS origins are rejected
  test('12. Unexpected production CORS origins are rejected (403)', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'https://unauthorized-malicious-site.com');

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.message.includes('CORS blocked'));
  });

  // 13. Logout invalidates the session according to the implemented session strategy
  test('13. Logout invalidates the session according to the implemented session strategy', async () => {
    // Login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ usernameOrEmail: 'reception', password: 'Reception123!' });
    const sessionCookie = loginRes.headers['set-cookie'];

    // Verify authenticated
    const meRes = await request(app).get('/api/auth/me').set('Cookie', sessionCookie);
    assert.strictEqual(meRes.status, 200);

    // Logout
    const logoutRes = await request(app).post('/api/auth/logout').set('Cookie', sessionCookie);
    assert.strictEqual(logoutRes.status, 200);

    // Verify session cookie was cleared
    const clearCookies = logoutRes.headers['set-cookie'] || [];
    assert.ok(clearCookies.some((c) => c.includes('token=') && (c.includes('Expires=Thu, 01 Jan 1970') || c.includes('Max-Age=0'))));

    // Request after logout without cookie fails with 401
    const postLogoutRes = await request(app).get('/api/auth/me');
    assert.strictEqual(postLogoutRes.status, 401);
  });

  // 14. No production frontend bundle contains demo administrator credentials
  test('14. No production frontend bundle contains demo administrator credentials', () => {
    const distPath = path.resolve(__dirname, '../../frontend/dist');
    assert.ok(fs.existsSync(distPath), 'Frontend dist directory must exist');

    const forbiddenStrings = [
      'AdminPassword123!',
      'Sysadmin123!',
      'CoordPassword123!',
      'Reception123!'
    ];

    function checkDir(dir) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          checkDir(fullPath);
        } else if (file.endsWith('.js') || file.endsWith('.html')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          for (const forbidden of forbiddenStrings) {
            assert.strictEqual(
              content.includes(forbidden),
              false,
              `Security Violation: Found forbidden credential string '${forbidden}' in ${file}`
            );
          }
        }
      }
    }

    checkDir(distPath);
  });
});
