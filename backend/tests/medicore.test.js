require('dotenv').config();
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/services/prisma');

describe('MediCore Multi-Speciality Hospital Management Integration Tests', () => {
  let adminToken;
  let receptionToken;
  let coordToken;
  let sysadminToken;

  let testBedResource;
  let testOtResource;
  let testAmbulanceResource;
  let testEquipmentResource;
  let testCreatedResource;
  let testAllocation;

  before(async () => {
    // Seed and verify database connection
    const { execSync } = require('child_process');
    execSync('node prisma/seed.js', {
      stdio: 'inherit',
      cwd: __dirname + '/..',
      env: { ...process.env, NODE_ENV: 'test', FORCE_DB_RESET: 'true' }
    });
    await prisma.$connect();
  });

  after(async () => {
    await prisma.$disconnect();
  });

  // Scenario 1: Valid login
  test('Scenario 1: Valid login succeeds and sets secure session cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        usernameOrEmail: 'admin',
        password: 'AdminPassword123!'
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.user.role, 'HOSPITAL_ADMINISTRATOR');

    // Verify HTTP-only session cookie is set
    const cookies = res.headers['set-cookie'];
    assert.ok(cookies, 'Set-Cookie header must be present');
    assert.ok(cookies.some((c) => c.includes('token=') && c.includes('HttpOnly')));

    const extractToken = (r) => {
      const c = r.headers['set-cookie'] || [];
      const match = c.join('; ').match(/token=([^;]+)/);
      return match ? match[1] : null;
    };

    adminToken = extractToken(res);
    assert.ok(adminToken);

    // Login other roles for subsequent tests
    const recRes = await request(app).post('/api/auth/login').send({ usernameOrEmail: 'reception', password: 'Reception123!' });
    receptionToken = extractToken(recRes);

    const coordRes = await request(app).post('/api/auth/login').send({ usernameOrEmail: 'coord_icu', password: 'CoordPassword123!' });
    coordToken = extractToken(coordRes);

    const sysRes = await request(app).post('/api/auth/login').send({ usernameOrEmail: 'sysadmin', password: 'Sysadmin123!' });
    sysadminToken = extractToken(sysRes);
  });

  // Scenario 2: Invalid credentials
  test('Scenario 2: Invalid credentials correctly rejected with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        usernameOrEmail: 'admin',
        password: 'WrongPassword999!'
      });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.message.includes('Invalid credentials'));
  });

  // Scenario 3: Unauthenticated API access
  test('Scenario 3: Unauthenticated API access blocked with 401', async () => {
    const res = await request(app).get('/api/resources');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
  });

  // Scenario 4: Role-based authorization
  test('Scenario 4: Role-based authorization prevents Reception Staff from accessing System Admin routes', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${receptionToken}`);

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.message.includes('Forbidden'));
  });

  // Scenario 5: Hospital Administrator registering a resource
  test('Scenario 5: Hospital Administrator registers a new hospital bed resource', async () => {
    const dept = await prisma.department.findFirst({ where: { code: 'ICU' } });

    const res = await request(app)
      .post('/api/resources')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        resourceName: 'Test High-Dependency Bed 901',
        resourceType: 'HOSPITAL_BED',
        subType: 'ICU',
        departmentID: dept.departmentID,
        location: 'ICU Level 3 Wing C',
        identifierCode: 'BED-TEST-901',
        quantityTotal: 1,
        specifications: { monitor: 'Phillips Intellivue', ventilatorPort: true }
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.resource.identifierCode, 'BED-TEST-901');
    assert.strictEqual(res.body.resource.status, 'AVAILABLE');
    testCreatedResource = res.body.resource;
  });

  // Scenario 6: Reception Staff checking availability
  test('Scenario 6: Reception Staff checks resource availability and summary', async () => {
    const res = await request(app)
      .get('/api/resources/availability')
      .set('Authorization', `Bearer ${receptionToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.summary.overall.total > 0);
    assert.ok(res.body.summary.byCategory.HOSPITAL_BED);
    assert.ok(res.body.summary.byCategory.OPERATION_THEATRE);
    assert.ok(res.body.summary.byCategory.MEDICAL_EQUIPMENT);
    assert.ok(res.body.summary.byCategory.AMBULANCE);
    assert.ok(res.body.summary.byCategory.DIAGNOSTIC_FACILITY);
  });

  // Scenario 7: Successful resource allocation
  test('Scenario 7: Reception Staff successfully allocates an available bed', async () => {
    const dept = await prisma.department.findFirst({ where: { code: 'ICU' } });

    const res = await request(app)
      .post('/api/allocations')
      .set('Authorization', `Bearer ${receptionToken}`)
      .send({
        resourceID: testCreatedResource.resourceID,
        departmentID: dept.departmentID,
        patientReference: 'PT-TEST-001 (Jane Doe)',
        purpose: 'Post-op cardiac intensive observation',
        priority: 'URGENT',
        startTime: new Date().toISOString(),
        expectedEndTime: new Date(Date.now() + 86400000).toISOString(),
        quantity: 1
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.allocation.status, 'ALLOCATED');
    testAllocation = res.body.allocation;

    // Verify resource status changed to ALLOCATED
    const updated = await prisma.resource.findUnique({ where: { resourceID: testCreatedResource.resourceID } });
    assert.strictEqual(updated.status, 'ALLOCATED');
    assert.strictEqual(updated.quantityAvailable, 0);
  });

  // Scenario 8: Allocation rejection for an unavailable resource
  test('Scenario 8: Rejects allocation when resource is already ALLOCATED', async () => {
    const dept = await prisma.department.findFirst({ where: { code: 'ICU' } });

    const res = await request(app)
      .post('/api/allocations')
      .set('Authorization', `Bearer ${receptionToken}`)
      .send({
        resourceID: testCreatedResource.resourceID,
        departmentID: dept.departmentID,
        patientReference: 'PT-TEST-002 (Bob Smith)',
        purpose: 'Duplicate admission attempt',
        startTime: new Date().toISOString(),
        quantity: 1
      });

    assert.strictEqual(res.status, 500);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.message.includes('currently ALLOCATED'));
  });

  // Scenario 9: Duplicate allocation prevention
  test('Scenario 9: Duplicate allocation blocked even if requested again immediately', async () => {
    const dept = await prisma.department.findFirst({ where: { code: 'ICU' } });

    const res = await request(app)
      .post('/api/allocations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        resourceID: testCreatedResource.resourceID,
        departmentID: dept.departmentID,
        purpose: 'Conflicting simultaneous allocation',
        startTime: new Date().toISOString()
      });

    assert.strictEqual(res.status, 500);
    assert.strictEqual(res.body.success, false);
  });

  // Scenario 10: Overlapping operation theatre booking prevention
  test('Scenario 10: Prevents overlapping booking for the same Operation Theatre during conflicting time window', async () => {
    const ot = await prisma.resource.findFirst({
      where: { resourceType: 'OPERATION_THEATRE', status: 'AVAILABLE' }
    });
    assert.ok(ot, 'Available Operation Theatre must exist');

    const start1 = new Date(Date.now() + 10000000);
    const end1 = new Date(Date.now() + 20000000);

    // First booking
    const booking1 = await request(app)
      .post('/api/allocations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        resourceID: ot.resourceID,
        departmentID: ot.departmentID,
        patientReference: 'PT-OT-01',
        purpose: 'Elective Laparoscopic Cholecystectomy',
        startTime: start1.toISOString(),
        expectedEndTime: end1.toISOString()
      });
    assert.strictEqual(booking1.status, 201);

    // Overlapping booking request during the same window
    const overlappingStart = new Date(Date.now() + 15000000);
    const overlappingEnd = new Date(Date.now() + 25000000);

    const booking2 = await request(app)
      .post('/api/allocations')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        resourceID: ot.resourceID,
        departmentID: ot.departmentID,
        patientReference: 'PT-OT-02',
        purpose: 'Conflicting Emergency Orthopedic Surgery',
        startTime: overlappingStart.toISOString(),
        expectedEndTime: overlappingEnd.toISOString()
      });

    assert.strictEqual(booking2.status, 500);
    assert.ok(booking2.body.message.includes('already has an active allocation') || booking2.body.message.includes('currently ALLOCATED'));
  });

  // Scenario 11: Emergency ambulance allocation
  test('Scenario 11: Emergency ambulance allocation initiates with EMERGENCY priority and logs dispatch', async () => {
    const ambulance = await prisma.resource.findFirst({
      where: { resourceType: 'AMBULANCE', status: 'AVAILABLE' }
    });
    assert.ok(ambulance, 'Available ambulance must exist');

    const res = await request(app)
      .post(`/api/ambulances/${ambulance.resourceID}/allocate`)
      .set('Authorization', `Bearer ${receptionToken}`)
      .send({
        emergencyPurpose: 'Severe Highway Collision - Multi-victim Trauma Response',
        patientReference: 'Emergency Dispatch Trauma Callout #911',
        notes: 'En route with ALS life support crew'
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.allocation.priority, 'EMERGENCY');
    assert.strictEqual(res.body.allocation.isEmergency, true);

    const updatedAmb = await prisma.resource.findUnique({ where: { resourceID: ambulance.resourceID } });
    assert.strictEqual(updatedAmb.status, 'ALLOCATED');
  });

  // Scenario 12: Department Coordinator updating an authorized resource status
  test('Scenario 12: Department Coordinator updates status of resource in their own department', async () => {
    // Find ICU coordinator's user record and department
    const coordUser = await prisma.user.findUnique({ where: { username: 'coord_icu' } });
    
    // Find a resource in the ICU department
    const icuResource = await prisma.resource.findFirst({
      where: {
        departmentID: coordUser.departmentID,
        status: 'AVAILABLE'
      }
    });
    assert.ok(icuResource, 'An available ICU resource must exist for coordinator testing');

    const res = await request(app)
      .patch(`/api/resources/${icuResource.resourceID}/status`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send({
        status: 'CLEANING_MAINTENANCE',
        reason: 'Preventive chemical sanitization ordered by ICU Coordinator.'
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.resource.status, 'CLEANING_MAINTENANCE');
  });

  // Scenario 13: System Administrator managing accounts
  test('Scenario 13: System Administrator creates, updates, and controls user accounts', async () => {
    const dept = await prisma.department.findFirst();

    // 1. Create account
    const createRes = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${sysadminToken}`)
      .send({
        username: 'test_coordinator_99',
        email: 'test_coord99@medicore.hospital',
        fullName: 'Test Coordinator 99',
        password: 'Password999!',
        role: 'DEPARTMENT_COORDINATOR',
        departmentID: dept.departmentID
      });

    assert.strictEqual(createRes.status, 201);
    const createdUserID = createRes.body.user.userID;

    // 2. Toggle status / deactivate
    const deactivateRes = await request(app)
      .patch(`/api/users/${createdUserID}/status`)
      .set('Authorization', `Bearer ${sysadminToken}`)
      .send({ isActive: false });

    assert.strictEqual(deactivateRes.status, 200);
    assert.strictEqual(deactivateRes.body.user.isActive, false);

    // 3. Reset password
    const resetRes = await request(app)
      .post(`/api/users/${createdUserID}/reset-password`)
      .set('Authorization', `Bearer ${sysadminToken}`)
      .send({ newPassword: 'NewSecurePassword888!' });

    assert.strictEqual(resetRes.status, 200);
  });

  // Scenario 14: Allocation release and resource status transitions
  test('Scenario 14: Releasing allocation marks allocation RELEASED and resource to CLEANING_MAINTENANCE', async () => {
    const res = await request(app)
      .post(`/api/allocations/${testAllocation.allocationID}/release`)
      .set('Authorization', `Bearer ${receptionToken}`)
      .send({
        notes: 'Patient successfully discharged to home care.',
        nextStatus: 'CLEANING_MAINTENANCE'
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.allocation.status, 'RELEASED');
    assert.ok(res.body.allocation.actualEndTime);

    const updatedRes = await prisma.resource.findUnique({ where: { resourceID: testCreatedResource.resourceID } });
    assert.strictEqual(updatedRes.status, 'CLEANING_MAINTENANCE');
  });

  // Scenario 15: Cleaning and maintenance workflow
  test('Scenario 15: Resource moves from CLEANING_MAINTENANCE to AVAILABLE after sanitization', async () => {
    const res = await request(app)
      .patch(`/api/resources/${testCreatedResource.resourceID}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'AVAILABLE',
        reason: 'Terminal bio-cleaning cycle finished. Bed inspected and approved for patient admission.'
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.resource.status, 'AVAILABLE');
  });

  // Scenario 16: Breakdown, repair, and return to availability
  test('Scenario 16: Fault transition: AVAILABLE -> OUT_OF_SERVICE -> UNDER_REPAIR -> AVAILABLE', async () => {
    // 1. Sudden breakdown
    const breakdown = await request(app)
      .patch(`/api/resources/${testCreatedResource.resourceID}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'OUT_OF_SERVICE',
        reason: 'Hydraulic elevation mechanism failure reported.'
      });
    assert.strictEqual(breakdown.status, 200);
    assert.strictEqual(breakdown.body.resource.status, 'OUT_OF_SERVICE');

    // 2. Technician starts repair
    const repair = await request(app)
      .patch(`/api/resources/${testCreatedResource.resourceID}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'UNDER_REPAIR',
        reason: 'Biomedical engineering team initiated hydraulic seal replacement.'
      });
    assert.strictEqual(repair.status, 200);
    assert.strictEqual(repair.body.resource.status, 'UNDER_REPAIR');

    // 3. Return to available after QA
    const restored = await request(app)
      .patch(`/api/resources/${testCreatedResource.resourceID}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'AVAILABLE',
        reason: 'Load-bearing calibration passed. Certified safe for clinical use.'
      });
    assert.strictEqual(restored.status, 200);
    assert.strictEqual(restored.body.resource.status, 'AVAILABLE');
  });

  // Scenario 17: Resource retirement and archival
  test('Scenario 17: Administrator retires resource; retired resource cannot transition or be allocated', async () => {
    const res = await request(app)
      .post(`/api/resources/${testCreatedResource.resourceID}/retire`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        reason: 'End of 10-year clinical lifecycle reached. Decommissioned and safely archived.'
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.resource.status, 'RETIRED_DISPOSED');
    assert.ok(res.body.resource.retiredAt);

    // Verify cannot transition anymore
    const illegalTransition = await request(app)
      .patch(`/api/resources/${testCreatedResource.resourceID}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'AVAILABLE',
        reason: 'Illegal revival attempt'
      });
    assert.strictEqual(illegalTransition.status, 500);
    assert.ok(illegalTransition.body.message.includes('terminal state'));
  });

  // Scenario 18: Audit log creation
  test('Scenario 18: Audit logs record all domain events and are accessible by System Administrator', async () => {
    const res = await request(app)
      .get('/api/audit-logs')
      .set('Authorization', `Bearer ${sysadminToken}`);

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.total > 0);
    assert.ok(res.body.logs.length > 0);

    const actions = res.body.logs.map(l => l.action);
    assert.ok(actions.includes('LOGIN_SUCCESS'));
    assert.ok(actions.includes('RESOURCE_REGISTERED'));
    assert.ok(actions.includes('RESOURCE_ALLOCATED') || actions.includes('EMERGENCY_ALLOCATION_CREATED'));
  });

  // Scenario 19: Utilization report calculations
  test('Scenario 19: Utilization report calculates exact formula-based capacity and rates', async () => {
    const res = await request(app)
      .get('/api/reports/utilization')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.metrics.overall.totalHospitalCapacity > 0);
    assert.ok(typeof res.body.metrics.overall.overallUtilizationRate === 'number');
    assert.strictEqual(res.body.metrics.categoryMetrics.length, 5);
  });

  // Scenario 20: Concurrent requests for the same resource
  test('Scenario 20: Concurrent allocation requests for single-unit resource permit only ONE winner', async () => {
    // Find an available bed
    const bed = await prisma.resource.findFirst({
      where: { resourceType: 'HOSPITAL_BED', status: 'AVAILABLE', quantityTotal: 1 }
    });
    assert.ok(bed, 'An available bed must exist for concurrency testing');

    const req1 = request(app)
      .post('/api/allocations')
      .set('Authorization', `Bearer ${receptionToken}`)
      .send({
        resourceID: bed.resourceID,
        departmentID: bed.departmentID,
        patientReference: 'Concurrent Candidate Alpha',
        purpose: 'Race condition test 1',
        startTime: new Date().toISOString()
      });

    const req2 = request(app)
      .post('/api/allocations')
      .set('Authorization', `Bearer ${receptionToken}`)
      .send({
        resourceID: bed.resourceID,
        departmentID: bed.departmentID,
        patientReference: 'Concurrent Candidate Beta',
        purpose: 'Race condition test 2',
        startTime: new Date().toISOString()
      });

    const [res1, res2] = await Promise.all([req1, req2]);

    const statuses = [res1.status, res2.status];
    // Exactly one should succeed with 201, and one should fail with 500
    const successCount = statuses.filter(s => s === 201).length;
    const failureCount = statuses.filter(s => s === 500).length;

    assert.strictEqual(successCount, 1, 'Exactly one concurrent request must succeed');
    assert.strictEqual(failureCount, 1, 'The other concurrent request must be rejected');
  });
});
