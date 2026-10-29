require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedInventoryAndReports() {
  console.log('--- Seeding Additional Resource Inventory & Historical Utilization Data ---');

  // 1. Fetch departments and users
  const departmentsList = await prisma.department.findMany();
  const deptMap = {};
  departmentsList.forEach((d) => {
    deptMap[d.code] = d;
  });

  const usersList = await prisma.user.findMany();
  const userMap = {};
  usersList.forEach((u) => {
    userMap[u.username] = u;
  });

  const admin = userMap['admin'];
  const reception = userMap['reception'];
  const coordIcu = userMap['coord_icu'];
  const coordRadio = userMap['coord_radio'];
  const sysadmin = userMap['sysadmin'];

  // 2. Additional Hospital Resources to Add
  const additionalResources = [
    // --- HOSPITAL BEDS ---
    {
      resourceName: 'ICU Cardiac Telemetry Bed 103',
      resourceType: 'HOSPITAL_BED',
      subType: 'ICU',
      departmentID: deptMap['ICU'].departmentID,
      location: 'Building A, Level 3, Pod B, Bed 103',
      status: 'AVAILABLE',
      quantityTotal: 1,
      quantityAvailable: 1,
      identifierCode: 'BED-ICU-103',
      specifications: JSON.stringify({ features: ['Continuous 12-lead ECG dock', 'Integrated hemodynamics scale', 'Pressure-relief mattress'] })
    },
    {
      resourceName: 'ICU Negative Pressure Suite 104',
      resourceType: 'HOSPITAL_BED',
      subType: 'ICU',
      departmentID: deptMap['ICU'].departmentID,
      location: 'Building A, Level 3, Isolation Bay 104',
      status: 'IN_USE',
      quantityTotal: 1,
      quantityAvailable: 0,
      identifierCode: 'BED-ICU-104',
      specifications: JSON.stringify({ features: ['HEPA negative pressure', 'Air lock interlock', 'Dedicated ventilator line'] })
    },
    {
      resourceName: 'Emergency Trauma Bay Bed 03',
      resourceType: 'HOSPITAL_BED',
      subType: 'Emergency',
      departmentID: deptMap['EMERGENCY'].departmentID,
      location: 'Ground Floor, Trauma Bay 3',
      status: 'AVAILABLE',
      quantityTotal: 1,
      quantityAvailable: 1,
      identifierCode: 'BED-EMERG-03',
      specifications: JSON.stringify({ features: ['Hydraulic trendelenburg', 'Dual oxygen ports', 'Rapid X-ray radiolucent cassette tunnel'] })
    },
    {
      resourceName: 'Pediatric Emergency Care Bed 04',
      resourceType: 'HOSPITAL_BED',
      subType: 'Emergency',
      departmentID: deptMap['EMERGENCY'].departmentID,
      location: 'Ground Floor, Peds Emergency Bay',
      status: 'AVAILABLE',
      quantityTotal: 1,
      quantityAvailable: 1,
      identifierCode: 'BED-EMERG-04',
      specifications: JSON.stringify({ features: ['Pediatric safety rails', 'Integrated warming canopy dock', 'Distraction lighting'] })
    },
    {
      resourceName: 'General Inpatient Bed 203',
      resourceType: 'HOSPITAL_BED',
      subType: 'General Ward',
      departmentID: deptMap['GENERAL_WARD'].departmentID,
      location: 'North Wing, Level 2, Room 203-A',
      status: 'AVAILABLE',
      quantityTotal: 1,
      quantityAvailable: 1,
      identifierCode: 'BED-GEN-203',
      specifications: JSON.stringify({ features: ['Electric height adjustment', 'Overbed table', 'Wall medical gas panel'] })
    },
    {
      resourceName: 'General Inpatient Bed 204',
      resourceType: 'HOSPITAL_BED',
      subType: 'General Ward',
      departmentID: deptMap['GENERAL_WARD'].departmentID,
      location: 'North Wing, Level 2, Room 204-A',
      status: 'ALLOCATED',
      quantityTotal: 1,
      quantityAvailable: 0,
      identifierCode: 'BED-GEN-204',
      specifications: JSON.stringify({ features: ['Nurse call terminal', 'Fall prevention sensor', 'Intravenous stand'] })
    },
    {
      resourceName: 'Step-Down Progressive Care Bed 205',
      resourceType: 'HOSPITAL_BED',
      subType: 'General Ward',
      departmentID: deptMap['GENERAL_WARD'].departmentID,
      location: 'North Wing, Level 2, Step-Down Pod',
      status: 'AVAILABLE',
      quantityTotal: 1,
      quantityAvailable: 1,
      identifierCode: 'BED-GEN-205',
      specifications: JSON.stringify({ features: ['Wireless vitals relay', 'Continuous pulse oximetry dock'] })
    },
    {
      resourceName: 'Coronary Care Telemetry Bed 301',
      resourceType: 'HOSPITAL_BED',
      subType: 'Private Room',
      departmentID: deptMap['CARDIOLOGY'].departmentID,
      location: 'Cardiology Tower, Level 4, CCU-301',
      status: 'AVAILABLE',
      quantityTotal: 1,
      quantityAvailable: 1,
      identifierCode: 'BED-CCU-301',
      specifications: JSON.stringify({ features: ['Cardiology telemetry hub', 'Direct defibrillator docking station', 'Anti-arrhythmia alarm sync'] })
    },
    {
      resourceName: 'Deluxe Executive Recovery Suite 501',
      resourceType: 'HOSPITAL_BED',
      subType: 'Private Room',
      departmentID: deptMap['GENERAL_WARD'].departmentID,
      location: 'South Tower, Level 5, Suite 501',
      status: 'AVAILABLE',
      quantityTotal: 1,
      quantityAvailable: 1,
      identifierCode: 'BED-VIP-501',
      specifications: JSON.stringify({ features: ['Private patient anteroom', 'En-suite bath', 'Family sofa-bed', 'Secure biometric access'] })
    },

    // --- OPERATION THEATRES ---
    {
      resourceName: 'Da Vinci Xi Robotic Surgery Suite 5',
      resourceType: 'OPERATION_THEATRE',
      subType: 'Robotic Surgery',
      departmentID: deptMap['SURGERY'].departmentID,
      location: 'Surgical Wing, Level 3, Suite OT-5',
      status: 'AVAILABLE',
      quantityTotal: 1,
      quantityAvailable: 1,
      identifierCode: 'OT-ROBOT-05',
      specifications: JSON.stringify({ readiness: 'Sterile and Calibrated', roboticSystem: 'Da Vinci Xi Dual Console', fireflyFluorescence: true })
    },
    {
      resourceName: 'Hybrid Angio-Vascular OR 6',
      resourceType: 'OPERATION_THEATRE',
      subType: 'Endovascular & Cardiac',
      departmentID: deptMap['SURGERY'].departmentID,
      location: 'Surgical Wing, Level 3, Suite OT-6',
      status: 'AVAILABLE',
      quantityTotal: 1,
      quantityAvailable: 1,
      identifierCode: 'OT-HYBRID-06',
      specifications: JSON.stringify({ readiness: 'Pre-flight Check Passed', cArmType: 'Siemens Artis pheno Robotic', laminarFlow: true })
    },
    {
      resourceName: 'Orthopedic & Joint Reconstruction Theatre 7',
      resourceType: 'OPERATION_THEATRE',
      subType: 'Orthopedics',
      departmentID: deptMap['SURGERY'].departmentID,
      location: 'Surgical Wing, Level 2, Suite OT-7',
      status: 'AVAILABLE',
      quantityTotal: 1,
      quantityAvailable: 1,
      identifierCode: 'OT-ORTHO-07',
      specifications: JSON.stringify({ readiness: 'Prepped', makoRoboticArmReady: true, ultraCleanAirLaminarFlow: true })
    },
    {
      resourceName: 'Ambulatory Day Care Surgery OT 8',
      resourceType: 'OPERATION_THEATRE',
      subType: 'Day Surgery',
      departmentID: deptMap['SURGERY'].departmentID,
      location: 'Day Surgery Pavilion, Ground Floor, OT-8',
      status: 'AVAILABLE',
      quantityTotal: 1,
      quantityAvailable: 1,
      identifierCode: 'OT-DAY-08',
      specifications: JSON.stringify({ readiness: 'Ready for Elective Turnaround', rapidTurnaroundSterilization: true })
    },
    {
      resourceName: 'Micro-Surgical Ophthalmology Suite 9',
      resourceType: 'OPERATION_THEATRE',
      subType: 'Ophthalmology',
      departmentID: deptMap['SURGERY'].departmentID,
      location: 'Day Surgery Pavilion, Level 1, OT-9',
      status: 'AVAILABLE',
      quantityTotal: 1,
      quantityAvailable: 1,
      identifierCode: 'OT-OPHTH-09',
      specifications: JSON.stringify({ readiness: 'Ready', microscope: 'Zeiss Lumera 700 with Callisto eye' })
    },

    // --- MEDICAL EQUIPMENT ---
    {
      resourceName: 'GE OEC Elite CFD Mobile 3D C-Arm Fluoroscope',
      resourceType: 'MEDICAL_EQUIPMENT',
      subType: 'Fluoroscopy',
      departmentID: deptMap['SURGERY'].departmentID,
      location: 'Surgical Clean Core Equipment Bay',
      status: 'AVAILABLE',
      quantityTotal: 2,
      quantityAvailable: 2,
      identifierCode: 'EQ-CARM-01',
      specifications: JSON.stringify({ detectorType: 'CMOS Flat Panel 31x31cm', lowDoseFluoroscopy: true, vascularSoftware: true })
    },
    {
      resourceName: 'Draeger Babylog VN500 Neonatal Ventilator',
      resourceType: 'MEDICAL_EQUIPMENT',
      subType: 'Neonatal Ventilator',
      departmentID: deptMap['ICU'].departmentID,
      location: 'NICU / ICU Respiratory Pod',
      status: 'AVAILABLE',
      quantityTotal: 4,
      quantityAvailable: 3,
      identifierCode: 'EQ-NEO-VENT',
      specifications: JSON.stringify({ HFOVOscillation: true, volumeGuarantee: true, nonInvasiveInterfaces: true })
    },
    {
      resourceName: 'Medtronic StealthStation S8 Surgical Navigation',
      resourceType: 'MEDICAL_EQUIPMENT',
      subType: 'Surgical Navigation',
      departmentID: deptMap['SURGERY'].departmentID,
      location: 'Neurosurgery Equipment Alcove',
      status: 'AVAILABLE',
      quantityTotal: 1,
      quantityAvailable: 1,
      identifierCode: 'EQ-NAV-01',
      specifications: JSON.stringify({ opticalTracking: true, electromagneticTracking: true, cranialSpineSoftware: true })
    },
    {
      resourceName: 'Fisher & Paykel Airvo 2 High Flow Nasal Cannula',
      resourceType: 'MEDICAL_EQUIPMENT',
      subType: 'High-Flow Oxygen',
      departmentID: deptMap['ICU'].departmentID,
      location: 'Respiratory Therapy Depot',
      status: 'AVAILABLE',
      quantityTotal: 8,
      quantityAvailable: 5,
      identifierCode: 'EQ-AIRVO-O2',
      specifications: JSON.stringify({ flowRange: '2 - 60 L/min', integratedHumidifier: true, pediatricAdultModes: true })
    },
    {
      resourceName: 'Roche cobas b 221 POC Blood Gas Analyzer',
      resourceType: 'MEDICAL_EQUIPMENT',
      subType: 'Point-of-Care Analyzer',
      departmentID: deptMap['EMERGENCY'].departmentID,
      location: 'Emergency Resuscitation Lab Bar',
      status: 'AVAILABLE',
      quantityTotal: 3,
      quantityAvailable: 3,
      identifierCode: 'EQ-POC-ROCHE',
      specifications: JSON.stringify({ parameters: ['pH', 'pO2', 'pCO2', 'Lactate', 'Electrolytes', 'Co-oximetry'], turnaroundSec: 90 })
    },

    // --- AMBULANCES ---
    {
      resourceName: 'Advanced Cardiac Care Mobile ICU 06',
      resourceType: 'AMBULANCE',
      subType: 'Cardiac ALS Unit',
      departmentID: deptMap['EMERGENCY'].departmentID,
      location: 'Trauma Bay Ambulance Dock 4',
      status: 'AVAILABLE',
      quantityTotal: 1,
      quantityAvailable: 1,
      identifierCode: 'AMB-ALS-102',
      specifications: JSON.stringify({ vehicleModel: 'Mercedes-Benz Sprinter 419 CDI', onboardEquipment: ['LP15 Defibrillator', 'Lucas 3 CPR Device', 'Hamilton T1 Ventilator'] })
    },
    {
      resourceName: 'Emergency Physician Fly-Car Rapid Interceptor 07',
      resourceType: 'AMBULANCE',
      subType: 'Rapid Response Fly-Car',
      departmentID: deptMap['EMERGENCY'].departmentID,
      location: 'Emergency Driveway Interceptor Bay',
      status: 'AVAILABLE',
      quantityTotal: 1,
      quantityAvailable: 1,
      identifierCode: 'AMB-FLY-302',
      specifications: JSON.stringify({ vehicleModel: 'Volvo XC90 AWD Emergency Physician Unit', features: ['Aviation trauma drug vault', 'Video laryngoscope', 'Satellite comms'] })
    },
    {
      resourceName: 'Zero-Emission Electric Patient Transfer Unit 08',
      resourceType: 'AMBULANCE',
      subType: 'Electric BLS Transfer',
      departmentID: deptMap['EMERGENCY'].departmentID,
      location: 'East Pavilion EV Charging Bay',
      status: 'AVAILABLE',
      quantityTotal: 1,
      quantityAvailable: 1,
      identifierCode: 'AMB-EV-202',
      specifications: JSON.stringify({ vehicleModel: 'Ford E-Transit 350 High Roof', batteryRangeKm: 250, hydraulicStretcherLoader: true })
    },
    {
      resourceName: 'Mass-Casualty Disaster Incident Support Unit 09',
      resourceType: 'AMBULANCE',
      subType: 'Disaster Support',
      departmentID: deptMap['EMERGENCY'].departmentID,
      location: 'Emergency Reserve Garage Bay B',
      status: 'AVAILABLE',
      quantityTotal: 1,
      quantityAvailable: 1,
      identifierCode: 'AMB-DISASTER-502',
      specifications: JSON.stringify({ vehicleModel: 'Freightliner M2 106 Logistics Rig', capacityTriagePacks: 100, portableFieldOxygenGen: true })
    },

    // --- DIAGNOSTIC FACILITIES ---
    {
      resourceName: 'Hologic 3D Dimensions Mammography with Tomosynthesis',
      resourceType: 'DIAGNOSTIC_FACILITY',
      subType: 'Mammography',
      departmentID: deptMap['RADIOLOGY'].departmentID,
      location: 'Women’s Diagnostic Center, Suite W-102',
      status: 'AVAILABLE',
      quantityTotal: 1,
      quantityAvailable: 1,
      identifierCode: 'DIAG-MAMMO-01',
      specifications: JSON.stringify({ detector: 'High-Resolution Direct Conversion', lowDoseCView: true, biopsyGuidance: true })
    },
    {
      resourceName: 'GE Vivid E95 4D Cardiovascular Ultrasound',
      resourceType: 'DIAGNOSTIC_FACILITY',
      subType: 'Cardiovascular Ultrasound',
      departmentID: deptMap['CARDIOLOGY'].departmentID,
      location: 'Non-Invasive Cardiac Lab, Room C-204',
      status: 'AVAILABLE',
      quantityTotal: 1,
      quantityAvailable: 1,
      identifierCode: 'DIAG-ECHO-02',
      specifications: JSON.stringify({ probes: ['4D TEE', 'Transthoracic Matrix M5Sc-D'], strainAnalysis: true })
    },
    {
      resourceName: 'Siemens Symbia Intevo SPECT/CT Nuclear Scanner',
      resourceType: 'DIAGNOSTIC_FACILITY',
      subType: 'Nuclear Medicine',
      departmentID: deptMap['RADIOLOGY'].departmentID,
      location: 'Nuclear Medicine Suite N-01',
      status: 'AVAILABLE',
      quantityTotal: 1,
      quantityAvailable: 1,
      identifierCode: 'DIAG-SPECT-01',
      specifications: JSON.stringify({ dualHeadGammaCamera: true, integrated16SliceCT: true, quantitativeReconstruction: true })
    },
    {
      resourceName: 'Hologic Horizon DXA Bone Densitometer',
      resourceType: 'DIAGNOSTIC_FACILITY',
      subType: 'Densitometry',
      departmentID: deptMap['RADIOLOGY'].departmentID,
      location: 'Outpatient Imaging, Room R-110',
      status: 'AVAILABLE',
      quantityTotal: 1,
      quantityAvailable: 1,
      identifierCode: 'DIAG-DXA-01',
      specifications: JSON.stringify({ ceramicDigitalDetector: true, wholeBodyCompositionAnalysis: true })
    },
    {
      resourceName: 'Cepheid GeneXpert Infinity Rapid PCR Molecular Core',
      resourceType: 'DIAGNOSTIC_FACILITY',
      subType: 'Molecular Diagnostics',
      departmentID: deptMap['RADIOLOGY'].departmentID,
      location: 'Central Pathology Laboratory, Suite P-300',
      status: 'AVAILABLE',
      quantityTotal: 1,
      quantityAvailable: 1,
      identifierCode: 'DIAG-PCR-01',
      specifications: JSON.stringify({ randomAccessModules: 48, automatedRoboticLoading: true, respiratoryPanelTimeMin: 45 })
    }
  ];

  let addedCount = 0;
  for (const r of additionalResources) {
    const exists = await prisma.resource.findUnique({
      where: { identifierCode: r.identifierCode }
    });
    if (!exists) {
      await prisma.resource.create({ data: r });
      addedCount++;
    }
  }
  console.log(`Added ${addedCount} new hospital clinical resources into inventory.`);

  // 3. Populate Historical Allocations for Real Clinical Utilization Trends
  const allResources = await prisma.resource.findMany();
  const resMap = {};
  allResources.forEach((r) => {
    resMap[r.identifierCode] = r;
  });

  const now = Date.now();
  const day = 86400000;
  const hour = 3600000;

  const historicalAllocations = [
    // --- Past 30 to 20 days ---
    {
      resourceCode: 'OT-CARD-01',
      user: admin,
      dept: deptMap['SURGERY'],
      patientRef: 'PT-2026-10101 (Fictional: Arthur Pendelton)',
      purpose: 'Coronary Artery Bypass Grafting (CABG x3)',
      priority: 'URGENT',
      startOffset: -28 * day,
      durationHours: 6.5,
      status: 'RELEASED',
      notes: 'Bypass successful. Patient extubated in ICU.'
    },
    {
      resourceCode: 'BED-ICU-101',
      user: coordIcu,
      dept: deptMap['ICU'],
      patientRef: 'PT-2026-10101 (Fictional: Arthur Pendelton)',
      purpose: 'Post-CABG intensive hemodynamic stabilization',
      priority: 'URGENT',
      startOffset: -28 * day + 6.5 * hour,
      durationHours: 72,
      status: 'RELEASED',
      notes: 'Stable weaning from inotropic support. Transferred to stepdown.'
    },
    {
      resourceCode: 'DIAG-MRI-01',
      user: coordRadio,
      dept: deptMap['RADIOLOGY'],
      patientRef: 'PT-2026-10245 (Fictional: Brenda Zhao)',
      purpose: 'Emergency Stroke Protocol: Brain & Diffusion MRI',
      priority: 'EMERGENCY',
      startOffset: -25 * day,
      durationHours: 1.2,
      status: 'RELEASED',
      notes: 'Acute MCA territory ischemia identified. Thrombolysis candidate.'
    },
    {
      resourceCode: 'AMB-ALS-101',
      user: reception,
      dept: deptMap['EMERGENCY'],
      patientRef: 'PT-2026-10245 (Fictional: Brenda Zhao)',
      purpose: 'Code Stroke Priority 1 Pre-hospital Transport',
      priority: 'EMERGENCY',
      startOffset: -25 * day - 1.5 * hour,
      durationHours: 1.2,
      status: 'RELEASED',
      isEmergency: true,
      notes: 'Pre-notification dispatched to CT/MRI suite.'
    },
    {
      resourceCode: 'BED-GEN-201',
      user: reception,
      dept: deptMap['GENERAL_WARD'],
      patientRef: 'PT-2026-10330 (Fictional: Donald Campbell)',
      purpose: 'Post-operative orthopedic rehabilitation stay',
      priority: 'NORMAL',
      startOffset: -21 * day,
      durationHours: 96,
      status: 'RELEASED',
      notes: 'Physical therapy milestones met. Discharged home.'
    },

    // --- Past 19 to 10 days ---
    {
      resourceCode: 'OT-ROBOT-05',
      user: admin,
      dept: deptMap['SURGERY'],
      patientRef: 'PT-2026-10492 (Fictional: Evelyn Reed)',
      purpose: 'Robotic-assisted partial nephrectomy',
      priority: 'NORMAL',
      startOffset: -18 * day,
      durationHours: 4.5,
      status: 'RELEASED',
      notes: 'Margins negative on frozen section. Blood loss < 50ml.'
    },
    {
      resourceCode: 'EQ-VENT-G5',
      user: coordIcu,
      dept: deptMap['ICU'],
      patientRef: 'PT-2026-10550 (Fictional: George Miller)',
      purpose: 'Acute respiratory distress syndrome secondary to viral pneumonia',
      priority: 'EMERGENCY',
      startOffset: -15 * day,
      durationHours: 120,
      quantity: 1,
      status: 'RELEASED',
      notes: 'Prone positioning protocol completed. Successfully extubated.'
    },
    {
      resourceCode: 'BED-ICU-103',
      user: coordIcu,
      dept: deptMap['ICU'],
      patientRef: 'PT-2026-10550 (Fictional: George Miller)',
      purpose: 'ICU Severe ARDS Critical Care Management',
      priority: 'EMERGENCY',
      startOffset: -15 * day,
      durationHours: 140,
      status: 'RELEASED',
      notes: 'Transfer to Step-down unit Bed 205 completed.'
    },
    {
      resourceCode: 'DIAG-CT-01',
      user: coordRadio,
      dept: deptMap['RADIOLOGY'],
      patientRef: 'PT-2026-10612 (Fictional: Henry Walsh)',
      purpose: 'High-speed motor vehicle collision polytrauma CT pan-scan',
      priority: 'EMERGENCY',
      startOffset: -12 * day,
      durationHours: 0.8,
      status: 'RELEASED',
      notes: 'Splenic laceration grade III, stable pelvis.'
    },
    {
      resourceCode: 'OT-HYBRID-06',
      user: admin,
      dept: deptMap['SURGERY'],
      patientRef: 'PT-2026-10612 (Fictional: Henry Walsh)',
      purpose: 'Emergency endovascular splenic artery embolization',
      priority: 'EMERGENCY',
      startOffset: -12 * day + 1 * hour,
      durationHours: 2.5,
      status: 'RELEASED',
      notes: 'Embolization complete. Hemodynamics normalized.'
    },

    // --- Past 9 to 3 days ---
    {
      resourceCode: 'OT-DAY-08',
      user: admin,
      dept: deptMap['SURGERY'],
      patientRef: 'PT-2026-10701 (Fictional: Irene Jenkins)',
      purpose: 'Diagnostic and operative arthroscopy knee meniscectomy',
      priority: 'NORMAL',
      startOffset: -8 * day,
      durationHours: 2.0,
      status: 'RELEASED',
      notes: 'Day-stay discharge protocol cleared.'
    },
    {
      resourceCode: 'AMB-BLS-201',
      user: reception,
      dept: deptMap['EMERGENCY'],
      patientRef: 'PT-2026-10777 (Fictional: Keith Sullivan)',
      purpose: 'Inter-facility transport for subacute hyperbaric oxygen',
      priority: 'NORMAL',
      startOffset: -7 * day,
      durationHours: 3.5,
      status: 'RELEASED',
      notes: 'Scheduled transfer completed without event.'
    },
    {
      resourceCode: 'DIAG-ECHO-02',
      user: coordRadio,
      dept: deptMap['CARDIOLOGY'],
      patientRef: 'PT-2026-10820 (Fictional: Laura Ortiz)',
      purpose: 'Pre-operative 4D Transesophageal Echocardiography',
      priority: 'NORMAL',
      startOffset: -5 * day,
      durationHours: 1.5,
      status: 'RELEASED',
      notes: 'Severe mitral valve regurgitation mapped for repair.'
    },
    {
      resourceCode: 'EQ-PUMP-BRAUN',
      user: reception,
      dept: deptMap['GENERAL_WARD'],
      patientRef: 'PT-2026-10850 (Fictional: Marcus Brody)',
      purpose: 'Continuous intravenous broad-spectrum antibiotic infusion',
      priority: 'NORMAL',
      startOffset: -4 * day,
      durationHours: 72,
      quantity: 2,
      status: 'RELEASED',
      notes: 'Infection resolved. Switched to oral regimen.'
    },
    {
      resourceCode: 'BED-EMERG-03',
      user: reception,
      dept: deptMap['EMERGENCY'],
      patientRef: 'PT-2026-10901 (Fictional: Nancy Kowalski)',
      purpose: 'Acute syncope and severe dehydration evaluation',
      priority: 'URGENT',
      startOffset: -3 * day,
      durationHours: 14,
      status: 'RELEASED',
      notes: 'Electrolyte repletion complete. Ambulatory discharge.'
    },

    // --- Past 48 hours to Current ---
    {
      resourceCode: 'BED-ICU-104',
      user: coordIcu,
      dept: deptMap['ICU'],
      patientRef: 'PT-2026-11005 (Fictional: Oscar Lindqvist)',
      purpose: 'Multi-drug resistant pulmonary infection isolation stay',
      priority: 'URGENT',
      startOffset: -1.5 * day,
      durationHours: 48,
      status: 'IN_USE',
      notes: 'Strict barrier nursing and negative pressure continuous containment.'
    },
    {
      resourceCode: 'BED-GEN-204',
      user: reception,
      dept: deptMap['GENERAL_WARD'],
      patientRef: 'PT-2026-11022 (Fictional: Patricia Henderson)',
      purpose: 'Post-operative total hip replacement inpatient monitoring',
      priority: 'NORMAL',
      startOffset: -1 * day,
      durationHours: 36,
      status: 'ALLOCATED',
      notes: 'Mobilizing with crutches. Pain controlled.'
    },
    {
      resourceCode: 'EQ-AIRVO-O2',
      user: coordIcu,
      dept: deptMap['ICU'],
      patientRef: 'PT-2026-11050 (Fictional: Quentin Tarantino-Smith)',
      purpose: 'High-flow humidified nasal oxygen for acute hypoxemic failure',
      priority: 'URGENT',
      startOffset: -18 * hour,
      durationHours: 24,
      quantity: 1,
      status: 'ALLOCATED',
      notes: 'FiO2 45%, Flow 40 L/min, patient comfortable.'
    },
    {
      resourceCode: 'AMB-ALS-102',
      user: reception,
      dept: deptMap['EMERGENCY'],
      patientRef: 'PT-2026-11100 (Fictional: Rachel Green)',
      purpose: 'Acute ST-Elevation Myocardial Infarction direct to Cath Lab',
      priority: 'EMERGENCY',
      startOffset: -2 * hour,
      durationHours: 1.5,
      status: 'RELEASED',
      isEmergency: true,
      notes: 'Door-to-balloon time 52 minutes. Successful PCI.'
    }
  ];

  let allocCount = 0;
  for (const a of historicalAllocations) {
    const resource = resMap[a.resourceCode];
    if (!resource) continue;

    const startTime = new Date(now + a.startOffset);
    const expectedEndTime = new Date(startTime.getTime() + a.durationHours * hour);
    const actualEndTime = a.status === 'RELEASED' ? expectedEndTime : null;

    const exists = await prisma.allocation.findFirst({
      where: {
        resourceID: resource.resourceID,
        startTime: startTime
      }
    });

    if (!exists) {
      await prisma.allocation.create({
        data: {
          resourceID: resource.resourceID,
          userID: a.user?.userID || admin.userID,
          departmentID: a.dept?.departmentID || resource.departmentID,
          patientReference: a.patientRef,
          purpose: a.purpose,
          priority: a.priority,
          startTime: startTime,
          expectedEndTime: expectedEndTime,
          actualEndTime: actualEndTime,
          quantity: a.quantity || 1,
          status: a.status,
          isEmergency: a.isEmergency || false,
          notes: a.notes,
          createdAt: startTime
        }
      });
      allocCount++;
    }
  }
  console.log(`Added ${allocCount} new clinical allocations with realistic longitudinal timestamps.`);

  // 4. Archive Official Pre-calculated Utilization Reports in Database
  const snapshotCount = await prisma.utilizationReport.count();
  if (snapshotCount === 0) {
    const report1 = await prisma.utilizationReport.create({
      data: {
        reportType: 'MONTHLY_EXECUTIVE_SUMMARY',
        generatedBy: admin.userID,
        startDate: new Date(now - 30 * day),
        endDate: new Date(now),
        summaryData: JSON.stringify({
          title: 'Monthly Hospital Clinical Resource Utilization & Capacity Census',
          aggregateRate: 46.8,
          totalCapacityEvaluated: 118,
          bedOccupancyRate: 58.2,
          otUtilizationRate: 42.5,
          fleetDispatches: 24,
          highRiskAlerts: 0,
          complianceAudit: 'PASSED'
        }),
        generatedAt: new Date(now - 2 * day)
      }
    });

    const report2 = await prisma.utilizationReport.create({
      data: {
        reportType: 'WEEKLY_CRITICAL_CARE_CENSUS',
        generatedBy: admin.userID,
        startDate: new Date(now - 7 * day),
        endDate: new Date(now),
        summaryData: JSON.stringify({
          title: 'Weekly Critical Care & Surgical Block Utilization Audit',
          aggregateRate: 52.4,
          icuOccupancyRate: 66.7,
          theatreThroughputHours: 142.5,
          equipmentDowntimeHours: 0.0,
          complianceAudit: 'PASSED'
        }),
        generatedAt: new Date(now - 4 * hour)
      }
    });

    console.log(`Archived ${[report1, report2].length} formal utilization snapshots in the database.`);
  }

  console.log('--- Seeding Completed Successfully ---');
}

seedInventoryAndReports()
  .catch((e) => {
    console.error('Error seeding inventory & reports:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
