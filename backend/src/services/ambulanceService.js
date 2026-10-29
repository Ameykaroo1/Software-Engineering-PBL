const prisma = require('./prisma');
const AllocationService = require('./allocationService');

class AmbulanceService {
  /**
   * Get all ambulances with availability status and current deployment details
   */
  static async getAmbulanceFleet() {
    return await prisma.resource.findMany({
      where: {
        resourceType: 'AMBULANCE',
        status: { not: 'RETIRED_DISPOSED' }
      },
      include: {
        department: true,
        allocations: {
          where: {
            status: { in: ['ALLOCATED', 'IN_USE'] }
          },
          take: 1,
          orderBy: { startTime: 'desc' },
          include: {
            user: { select: { userID: true, username: true, fullName: true } }
          }
        }
      },
      orderBy: [{ status: 'asc' }, { resourceName: 'asc' }]
    });
  }

  /**
   * Allocate ambulance in emergency mode
   */
  static async allocateEmergencyAmbulance({ ambulanceID, emergencyPurpose, patientReference, notes }, user) {
    const ambulance = await prisma.resource.findUnique({
      where: { resourceID: ambulanceID }
    });

    if (!ambulance || ambulance.resourceType !== 'AMBULANCE') {
      throw new Error('Selected resource is not a registered ambulance unit.');
    }

    if (ambulance.status !== 'AVAILABLE') {
      throw new Error(`Ambulance '${ambulance.resourceName}' is currently ${ambulance.status} and cannot be dispatched for emergency allocation.`);
    }

    // Call unified AllocationService with priority = EMERGENCY
    return await AllocationService.allocateResource({
      resourceID: ambulanceID,
      departmentID: ambulance.departmentID,
      purpose: `[EMERGENCY CALLOUT] ${emergencyPurpose}`,
      patientReference: patientReference || 'Emergency Triage Admission',
      priority: 'EMERGENCY',
      startTime: new Date().toISOString(),
      quantity: 1,
      notes: notes || 'Immediate ambulance unit allocation initiated via emergency dispatch panel.',
      isEmergency: true
    }, user);
  }
}

module.exports = AmbulanceService;
