require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting MediCore Database Seed ---');

  // 1. Destructive reset ONLY when explicitly requested in non-production environments
  const isProduction = process.env.NODE_ENV === 'production';
  const shouldReset = (process.env.FORCE_DB_RESET === 'true' || process.env.NODE_ENV === 'test') && !isProduction;

  if (shouldReset) {
    console.log('⚠️ Explicit development DB reset requested (FORCE_DB_RESET=true). Purging existing records...');
    await prisma.auditLog.deleteMany();
    await prisma.statusHistory.deleteMany();
    await prisma.allocation.deleteMany();
    await prisma.resource.deleteMany();
    await prisma.utilizationReport.deleteMany();
    await prisma.user.deleteMany();
    await prisma.department.deleteMany();
  } else {
    console.log('ℹ️ Safe seeding mode: Preserving existing data and accounts without overwriting.');
  }

  // 2. Create Departments (idempotent)
  const departmentsData = [
    { departmentName: 'Emergency Medicine', code: 'EMERGENCY', description: 'Emergency trauma, triage, and rapid stabilization services' },
    { departmentName: 'Intensive Care Unit', code: 'ICU', description: 'Critical care units, ventilators, and continuous patient monitoring' },
    { departmentName: 'Surgical Services', code: 'SURGERY', description: 'Main operation theatres, robotic surgery, and day-care suites' },
    { departmentName: 'Cardiology & Cath Lab', code: 'CARDIOLOGY', description: 'Coronary care unit, heart catheterization, and hemodynamic labs' },
    { departmentName: 'Diagnostic Radiology', code: 'RADIOLOGY', description: 'Advanced diagnostic imaging including MRI, CT scan, and Ultrasound' },
    { departmentName: 'General Inpatient Wards', code: 'GENERAL_WARD', description: 'Inpatient recovery beds and routine monitoring units' }
  ];

  const departments = {};
  for (const dept of departmentsData) {
    let existingDept = await prisma.department.findFirst({ where: { code: dept.code } });
    if (!existingDept) {
      existingDept = await prisma.department.create({ data: dept });
    }
    departments[dept.code] = existingDept;
  }
  console.log(`Verified ${Object.keys(departments).length} departments.`);

  // 3. Resolve Initial Credentials from Environment Variables
  function getSeedPassword(roleKey, envVarNames, devFallback) {
    for (const varName of envVarNames) {
      if (process.env[varName]) {
        return process.env[varName];
      }
    }
    if (isProduction) {
      throw new Error(
        `CRITICAL SECURITY ERROR: Seeding in production requires environment variable ${envVarNames[0]} to be set. Hardcoded defaults are prohibited in production.`
      );
    }
    console.warn(`[DEV SEED] Using development password for role ${roleKey}. Do not use in production.`);
    return devFallback;
  }

  const adminPassword = getSeedPassword('ADMIN', ['SEED_ADMIN_PASSWORD', 'ADMIN_INITIAL_PASSWORD'], 'AdminPassword123!');
  const receptionPassword = getSeedPassword('RECEPTION', ['SEED_RECEPTION_PASSWORD', 'RECEPTION_INITIAL_PASSWORD'], 'Reception123!');
  const coordPassword = getSeedPassword('COORDINATOR', ['SEED_COORD_PASSWORD', 'COORD_INITIAL_PASSWORD'], 'CoordPassword123!');
  const sysadminPassword = getSeedPassword('SYSADMIN', ['SEED_SYSADMIN_PASSWORD', 'SYSADMIN_INITIAL_PASSWORD'], 'Sysadmin123!');

  const passwordSalt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash(adminPassword, passwordSalt);
  const receptionPasswordHash = await bcrypt.hash(receptionPassword, passwordSalt);
  const coordPasswordHash = await bcrypt.hash(coordPassword, passwordSalt);
  const sysadminPasswordHash = await bcrypt.hash(sysadminPassword, passwordSalt);

  const usersData = [
    {
      username: 'admin',
      email: 'admin@medicore.hospital',
      fullName: 'Dr. Sarah Mitchell, MD (Medical Director)',
      role: 'HOSPITAL_ADMINISTRATOR',
      departmentID: departments['SURGERY'].departmentID,
      passwordHash: adminPasswordHash,
      isActive: true
    },
    {
      username: 'reception',
      email: 'reception@medicore.hospital',
      fullName: 'Alex Reynolds (Senior Triage Coordinator)',
      role: 'RECEPTION_STAFF',
      departmentID: departments['EMERGENCY'].departmentID,
      passwordHash: receptionPasswordHash,
      isActive: true
    },
    {
      username: 'coord_icu',
      email: 'coord_icu@medicore.hospital',
      fullName: 'Dr. Elena Rostova (ICU Head Coordinator)',
      role: 'DEPARTMENT_COORDINATOR',
      departmentID: departments['ICU'].departmentID,
      passwordHash: coordPasswordHash,
      isActive: true
    },
    {
      username: 'coord_radio',
      email: 'coord_radio@medicore.hospital',
      fullName: 'Marcus Vance (Radiology Operations Lead)',
      role: 'DEPARTMENT_COORDINATOR',
      departmentID: departments['RADIOLOGY'].departmentID,
      passwordHash: coordPasswordHash,
      isActive: true
    },
    {
      username: 'sysadmin',
      email: 'sysadmin@medicore.hospital',
      fullName: 'David Sterling (Hospital IT Infrastructure Admin)',
      role: 'SYSTEM_ADMINISTRATOR',
      departmentID: null,
      passwordHash: sysadminPasswordHash,
      isActive: true
    }
  ];

  const users = {};
  for (const u of usersData) {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ username: u.username }, { email: u.email }] }
    });
    if (existing) {
      users[u.username] = existing;
    } else {
      const created = await prisma.user.create({ data: u });
      users[u.username] = created;
    }
  }
  console.log(`Verified ${Object.keys(users).length} system users across all 4 roles.`);

  // 4. Create Resources across 5 categories
  const resourcesData = [
    // 5.1 Hospital Beds
    {
      resourceName: 'ICU Critical Bed 101',
      resourceType: 'HOSPITAL_BED',
      subType: 'ICU',
      departmentID: departments['ICU'].departmentID,
      location: 'Building A, Level 3, Pod A',
      status: 'AVAILABLE',
      quantityTotal: 1,
      quantityAvailable: 1,
      identifierCode: 'BED-ICU-101',
      specifications: JSON.stringify({ features: ['Ventilator hookup', 'Cardiac telemetry', 'Electric adjustment', 'Defibrillator dock'] })
    },
    {
      resourceName: 'ICU Isolation Bed 102',
      resourceType: 'HOSPITAL_BED',
      subType: 'ICU',
      departmentID: departments['ICU'].departmentID,
      location: 'Building A, Level 3, Negative Pressure Room 102',
      status: 'ALLOCATED',
      quantityTotal: 1,
      quantityAvailable: 0,
      identifierCode: 'BED-ICU-102',
      specifications: JSON.stringify({ features: ['HEPA filtration', 'Negative pressure monitor', 'Air lock entry'] })
    },
    {
      resourceName: 'Emergency Trauma Bed 01',
      resourceType: 'HOSPITAL_BED',
      subType: 'Emergency',
      departmentID: departments['EMERGENCY'].departmentID,
      location: 'Ground Floor, Trauma Bay 1',
      status: 'AVAILABLE',
      quantityTotal: 1,
      quantityAvailable: 1,
      identifierCode: 'BED-EMERG-01',
      specifications: JSON.stringify({ features: ['Rapid tilt', 'Overhead surgical lighting dock', 'Wall suction & O2'] })
    },
    {
      resourceName: 'Emergency Resuscitation Bed 02',
      resourceType: 'HOSPITAL_BED',
      subType: 'Emergency',
      departmentID: departments['EMERGENCY'].departmentID,
      location: 'Ground Floor, Resus Bay 2',
      status: 'AVAILABLE',
      quantityTotal: 1,
      quantityAvailable: 1,
      identifierCode: 'BED-EMERG-02',
      specifications: JSON.stringify({ features: ['Full cardiac dock', 'Direct ambulance access'] })
    },
    {
      resourceName: 'General Ward Bed 201',
      resourceType: 'HOSPITAL_BED',
      subType: 'General Ward',
      departmentID: departments['GENERAL_WARD'].departmentID,
      location: 'North Wing, Level 2, Room 201-A',
      status: 'AVAILABLE',
      quantityTotal: 1,
      quantityAvailable: 1,
      identifierCode: 'BED-GEN-201',
      specifications: JSON.stringify({ features: ['Nurse call system', 'Oxygen outlet', 'Bedside cabinet'] })
    },
    {
      resourceName: 'General Ward Bed 202',
      resourceType: 'HOSPITAL_BED',
      subType: 'General Ward',
      departmentID: departments['GENERAL_WARD'].departmentID,
      location: 'North Wing, Level 2, Room 201-B',
      status: 'CLEANING_MAINTENANCE',
      quantityTotal: 1,
      quantityAvailable: 0,
      identifierCode: 'BED-GEN-202',
      specifications: JSON.stringify({ features: ['Sanitization cycle underway', 'Bio-cleaning required'] })
    },
    {
      resourceName: 'Executive Private Suite Bed 301',
      resourceType: 'HOSPITAL_BED',
      subType: 'Private Room',
      departmentID: departments['GENERAL_WARD'].departmentID,
      location: 'South Tower, Level 5, Suite 301',
      status: 'AVAILABLE',
      quantityTotal: 1,
      quantityAvailable: 1,
      identifierCode: 'BED-PVT-301',
      specifications: JSON.stringify({ features: ['En-suite washroom', 'Attendant cot', 'Smart TV and monitoring'] })
    },

    // 5.2 Operation Theatres
    {
      resourceName: 'Cardiac Surgery Theatre 1',
      resourceType: 'OPERATION_THEATRE',
      subType: 'Cardiothoracic',
      departmentID: departments['SURGERY'].departmentID,
      location: 'Surgical Wing, Level 2, OT-1',
      status: 'AVAILABLE',
      quantityTotal: 1,
      quantityAvailable: 1,
      identifierCode: 'OT-CARD-01',
      specifications: JSON.stringify({ readiness: 'Fully Prepped', laminarFlow: true, heartLungBypassReady: true })
    },
    {
      resourceName: 'Neuro & Ortho Hybrid Theatre 2',
      resourceType: 'OPERATION_THEATRE',
      subType: 'Neurosurgery',
      departmentID: departments['SURGERY'].departmentID,
      location: 'Surgical Wing, Level 2, OT-2',
      status: 'IN_USE',
      quantityTotal: 1,
      quantityAvailable: 0,
      identifierCode: 'OT-NEURO-02',
      specifications: JSON.stringify({ readiness: 'Procedure In Progress', laminarFlow: true, intraoperativeImaging: true })
    },
    {
      resourceName: 'General & Laparoscopic OT 3',
      resourceType: 'OPERATION_THEATRE',
      subType: 'General Surgery',
      departmentID: departments['SURGERY'].departmentID,
      location: 'Surgical Wing, Level 2, OT-3',
      status: 'AVAILABLE',
      quantityTotal: 1,
      quantityAvailable: 1,
      identifierCode: 'OT-GEN-03',
      specifications: JSON.stringify({ readiness: 'Sterilized and Ready', '4KEndoscopyTower': true })
    },
    {
      resourceName: 'Emergency Trauma OT 4',
      resourceType: 'OPERATION_THEATRE',
      subType: 'Emergency Surgery',
      departmentID: departments['SURGERY'].departmentID,
      location: 'Surgical Wing, Level 2, OT-4',
      status: 'CLEANING_MAINTENANCE',
      quantityTotal: 1,
      quantityAvailable: 0,
      identifierCode: 'OT-TRAUMA-04',
      specifications: JSON.stringify({ readiness: 'Post-op terminal disinfection scheduled' })
    },

    // 5.3 Medical Equipment
    {
      resourceName: 'Hamilton-G5 Critical Care Ventilators',
      resourceType: 'MEDICAL_EQUIPMENT',
      subType: 'Ventilator',
      departmentID: departments['ICU'].departmentID,
      location: 'ICU Central Equipment Bay',
      status: 'AVAILABLE',
      quantityTotal: 10,
      quantityAvailable: 7,
      identifierCode: 'EQ-VENT-G5',
      specifications: JSON.stringify({ model: 'Hamilton Medical G5', powerBackup: '180 mins', invasiveAndNonInvasive: true })
    },
    {
      resourceName: 'Zoll R-Series Biphasic Defibrillators',
      resourceType: 'MEDICAL_EQUIPMENT',
      subType: 'Defibrillator',
      departmentID: departments['EMERGENCY'].departmentID,
      location: 'Emergency Resuscitation Station',
      status: 'AVAILABLE',
      quantityTotal: 6,
      quantityAvailable: 6,
      identifierCode: 'EQ-DEFIB-ZOLL',
      specifications: JSON.stringify({ pacing: true, realCPRHelp: true, calibratedOn: '2026-09-15' })
    },
    {
      resourceName: 'Cardiohelp Portable ECMO Unit',
      resourceType: 'MEDICAL_EQUIPMENT',
      subType: 'ECMO',
      departmentID: departments['CARDIOLOGY'].departmentID,
      location: 'Cath Lab Equipment Pod 1',
      status: 'ALLOCATED',
      quantityTotal: 2,
      quantityAvailable: 1,
      identifierCode: 'EQ-ECMO-01',
      specifications: JSON.stringify({ circuitType: 'Veno-Arterial / Veno-Venous', cannulationKitSupplied: true })
    },
    {
      resourceName: 'Fresenius MultiFiltrate Dialysis System',
      resourceType: 'MEDICAL_EQUIPMENT',
      subType: 'Hemodialysis',
      departmentID: departments['ICU'].departmentID,
      location: 'ICU Renal Support Station',
      status: 'AVAILABLE',
      quantityTotal: 4,
      quantityAvailable: 3,
      identifierCode: 'EQ-DIALYSIS-01',
      specifications: JSON.stringify({ CRRTModes: ['CVVHD', 'CVVHDF'], anticoagulation: 'Citrate' })
    },
    {
      resourceName: 'B. Braun Space Infusion Pump System',
      resourceType: 'MEDICAL_EQUIPMENT',
      subType: 'Infusion Pump',
      departmentID: departments['GENERAL_WARD'].departmentID,
      location: 'Central Pharmacy Supply Depot',
      status: 'AVAILABLE',
      quantityTotal: 30,
      quantityAvailable: 24,
      identifierCode: 'EQ-PUMP-BRAUN',
      specifications: JSON.stringify({ doseErrorReductionSystem: true, wirelessMonitoring: true })
    },

    // 5.4 Ambulances
    {
      resourceName: 'Advanced Life Support Ambulance 01',
      resourceType: 'AMBULANCE',
      subType: 'ALS Mobile ICU',
      departmentID: departments['EMERGENCY'].departmentID,
      location: 'Ambulance Bay Bay-1',
      status: 'AVAILABLE',
      quantityTotal: 1,
      quantityAvailable: 1,
      identifierCode: 'AMB-ALS-101',
      specifications: JSON.stringify({ vehiclePlate: 'MH-01-EQ-1001', crew: 'Paramedic + EMT Driver', equipment: ['Ventilator', 'Defibrillator', 'Suction', 'Spine Board'] })
    },
    {
      resourceName: 'Advanced Life Support Ambulance 02',
      resourceType: 'AMBULANCE',
      subType: 'ALS Trauma & Cardiac',
      departmentID: departments['EMERGENCY'].departmentID,
      location: 'Ambulance Bay Bay-2',
      status: 'AVAILABLE',
      quantityTotal: 1,
      quantityAvailable: 1,
      identifierCode: 'AMB-ALS-102',
      specifications: JSON.stringify({ vehiclePlate: 'MH-01-EQ-1002', crew: 'Trauma Paramedic + Driver', equipment: ['12-lead ECG telemetry', 'Trauma pack'] })
    },
    {
      resourceName: 'Basic Life Support Ambulance 03',
      resourceType: 'AMBULANCE',
      subType: 'BLS Patient Transfer',
      departmentID: departments['EMERGENCY'].departmentID,
      location: 'Ambulance Bay Bay-3',
      status: 'ALLOCATED',
      quantityTotal: 1,
      quantityAvailable: 0,
      identifierCode: 'AMB-BLS-201',
      specifications: JSON.stringify({ vehiclePlate: 'MH-01-EQ-2001', crew: 'Certified EMT + Driver', equipment: ['Oxygen Delivery', 'Stretcher'] })
    },
    {
      resourceName: 'Rapid Response Medical Van 04',
      resourceType: 'AMBULANCE',
      subType: 'First Responder',
      departmentID: departments['EMERGENCY'].departmentID,
      location: 'Hospital Garage Maintenance Bay',
      status: 'UNDER_REPAIR',
      quantityTotal: 1,
      quantityAvailable: 0,
      identifierCode: 'AMB-RRV-301',
      specifications: JSON.stringify({ vehiclePlate: 'MH-01-EQ-3001', repairNotes: 'Brake cylinder replacement scheduled with authorized service center' })
    },

    // 5.5 Diagnostic Facilities
    {
      resourceName: 'Siemens Magnetom Vida 3.0T MRI',
      resourceType: 'DIAGNOSTIC_FACILITY',
      subType: 'MRI',
      departmentID: departments['RADIOLOGY'].departmentID,
      location: 'Basement 1, Diagnostic Imaging Suite MRI-1',
      status: 'AVAILABLE',
      quantityTotal: 1,
      quantityAvailable: 1,
      identifierCode: 'DIAG-MRI-3T',
      specifications: JSON.stringify({ boreSize: '70cm', bioMatrixTechnology: true, heliumLevel: '98%' })
    },
    {
      resourceName: 'GE Revolution 128-Slice CT Scanner',
      resourceType: 'DIAGNOSTIC_FACILITY',
      subType: 'CT Scan',
      departmentID: departments['RADIOLOGY'].departmentID,
      location: 'Ground Floor, Emergency Trauma Imaging Suite',
      status: 'AVAILABLE',
      quantityTotal: 1,
      quantityAvailable: 1,
      identifierCode: 'DIAG-CT-128',
      specifications: JSON.stringify({ scanSpeed: '0.28 sec rotation', cardiacGating: true, spectralImaging: true })
    },
    {
      resourceName: 'Philips EPIQ Elite Ultrasound Suite',
      resourceType: 'DIAGNOSTIC_FACILITY',
      subType: 'Ultrasound',
      departmentID: departments['RADIOLOGY'].departmentID,
      location: 'Basement 1, Ultrasound Room 4',
      status: 'AVAILABLE',
      quantityTotal: 1,
      quantityAvailable: 1,
      identifierCode: 'DIAG-US-04',
      specifications: JSON.stringify({ transducers: ['Curvilinear', 'Linear Vascular', 'Cardiac Phased Array'] })
    },
    {
      resourceName: 'Shimadzu Digital Ceiling Suspension X-Ray',
      resourceType: 'DIAGNOSTIC_FACILITY',
      subType: 'Digital X-Ray',
      departmentID: departments['RADIOLOGY'].departmentID,
      location: 'Basement 1, Room X-01',
      status: 'AVAILABLE',
      quantityTotal: 1,
      quantityAvailable: 1,
      identifierCode: 'DIAG-XRAY-01',
      specifications: JSON.stringify({ wirelessDetector: true, autoTracking: true })
    },
    {
      resourceName: 'Roche Cobas 8000 Core Chemistry Lab Line',
      resourceType: 'DIAGNOSTIC_FACILITY',
      subType: 'Pathology & Chemistry',
      departmentID: departments['RADIOLOGY'].departmentID,
      location: 'Level 1, Central Diagnostic Pathology Core',
      status: 'AVAILABLE',
      quantityTotal: 1,
      quantityAvailable: 1,
      identifierCode: 'DIAG-LAB-ROCHE',
      specifications: JSON.stringify({ throughput: 'Up to 9,800 tests/hour', sampleIntegrityCheck: true })
    }
  ];

  const createdResources = {};
  for (const res of resourcesData) {
    let existingResource = await prisma.resource.findUnique({
      where: { identifierCode: res.identifierCode }
    });
    if (!existingResource) {
      existingResource = await prisma.resource.create({ data: res });
    }
    createdResources[res.identifierCode] = existingResource;
  }
  console.log(`Verified ${Object.keys(createdResources).length} hospital resources across all 5 categories.`);

  // 5. Seed an active allocation and historical allocation
  const existingAllocationsCount = await prisma.allocation.count();
  if (existingAllocationsCount === 0 || shouldReset) {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);
    const twoHoursFromNow = new Date(now.getTime() + 7200000);
    const yesterday = new Date(now.getTime() - 86400000);
    const yesterdayEnd = new Date(yesterday.getTime() + 14400000);

    // Active ICU Bed allocation
    await prisma.allocation.create({
      data: {
        resourceID: createdResources['BED-ICU-102'].resourceID,
        userID: users['reception'].userID,
        departmentID: departments['ICU'].departmentID,
        patientReference: 'PT-2026-90412 (Fictional Patient: Robert Evans)',
        purpose: 'Post-operative respiratory monitoring following thoracic surgery',
        priority: 'URGENT',
        startTime: oneHourAgo,
        expectedEndTime: twoHoursFromNow,
        quantity: 1,
        status: 'ALLOCATED',
        notes: 'Continuous oxygenation and telemetric monitoring required.'
      }
    });

  // Active BLS Ambulance allocation
  await prisma.allocation.create({
    data: {
      resourceID: createdResources['AMB-BLS-201'].resourceID,
      userID: users['reception'].userID,
      departmentID: departments['EMERGENCY'].departmentID,
      patientReference: 'PT-2026-88120 (Fictional Patient: Clara Adams)',
      purpose: 'Inter-hospital scheduled transport for specialized hemodialysis',
      priority: 'NORMAL',
      startTime: oneHourAgo,
      expectedEndTime: twoHoursFromNow,
      quantity: 1,
      status: 'ALLOCATED',
      isEmergency: false,
      notes: 'Transfer dispatched to satellite nephrology center.'
    }
  });

  // Released OT historical allocation
  await prisma.allocation.create({
    data: {
      resourceID: createdResources['OT-GEN-03'].resourceID,
      userID: users['admin'].userID,
      departmentID: departments['SURGERY'].departmentID,
      patientReference: 'PT-2026-77319 (Fictional Patient: Michael Scott)',
      purpose: 'Emergency Laparoscopic Appendectomy',
      priority: 'URGENT',
      startTime: yesterday,
      expectedEndTime: yesterdayEnd,
      actualEndTime: yesterdayEnd,
      quantity: 1,
      status: 'RELEASED',
      notes: 'Surgery concluded successfully without complications. Resource sanitized.'
    }
  });

  // 6. Create Initial Status History Records
  await prisma.statusHistory.create({
    data: {
      resourceID: createdResources['BED-GEN-202'].resourceID,
      previousStatus: 'IN_USE',
      newStatus: 'CLEANING_MAINTENANCE',
      changedBy: users['coord_icu'].userID,
      reason: 'Patient discharged. Bed queued for terminal chemical sanitization.'
    }
  });

  await prisma.statusHistory.create({
    data: {
      resourceID: createdResources['AMB-RRV-301'].resourceID,
      previousStatus: 'AVAILABLE',
      newStatus: 'UNDER_REPAIR',
      changedBy: users['sysadmin'].userID,
      reason: 'Scheduled brake overhaul and preventive transmission maintenance.'
    }
  });

  // 7. Seed Initial Audit Logs
  const auditEntries = [
    {
      userID: users['sysadmin'].userID,
      action: 'SYSTEM_INITIALIZATION',
      entityType: 'SYSTEM',
      entityID: 'SYSTEM',
      details: JSON.stringify({ message: 'MediCore system seed executed. 5 core resource categories initialized.' }),
      ipAddress: '127.0.0.1'
    },
    {
      userID: users['admin'].userID,
      action: 'RESOURCE_REGISTRATION',
      entityType: 'RESOURCE',
      entityID: createdResources['BED-ICU-101'].resourceID,
      details: JSON.stringify({ resourceName: 'ICU Critical Bed 101', identifierCode: 'BED-ICU-101' }),
      ipAddress: '192.168.1.10'
    },
    {
      userID: users['reception'].userID,
      action: 'RESOURCE_ALLOCATION',
      entityType: 'ALLOCATION',
      entityID: createdResources['BED-ICU-102'].resourceID,
      details: JSON.stringify({ patientReference: 'PT-2026-90412', priority: 'URGENT', purpose: 'Post-op respiratory care' }),
      ipAddress: '192.168.1.25'
    }
  ];

  for (const log of auditEntries) {
    await prisma.auditLog.create({ data: log });
  }

  console.log('Seeded initial allocations, status history, and audit log entries.');
  } else {
    console.log('Existing allocations and history preserved.');
  }

  // 8. Seed expanded inventory and longitudinal utilization data
  try {
    const { execSync } = require('child_process');
    execSync('node prisma/seed_inventory_reports.js', {
      stdio: 'inherit',
      cwd: __dirname + '/..',
      env: process.env
    });
  } catch (err) {
    console.log('Expanded inventory note:', err.message);
  }

  console.log('--- MediCore Database Seed Completed Successfully ---');
}

main()
  .catch((e) => {
    console.error('Seed Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
