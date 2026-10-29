const prisma = require('./prisma');
const AuditService = require('./auditService');

/**
 * Valid transitions map based on the Experiment 5 Statechart Diagram
 */
const VALID_TRANSITIONS = {
  AVAILABLE: [
    'ALLOCATED',            // Direct allocation
    'CLEANING_MAINTENANCE', // Preventive cleaning
    'OUT_OF_SERVICE',       // Sudden fault / breakdown
    'RETIRED_DISPOSED'      // Permanent retirement
  ],
  ALLOCATED: [
    'IN_USE',               // Resource usage begins (e.g. patient admitted, surgery started)
    'AVAILABLE',            // Cancelled before use
    'CLEANING_MAINTENANCE', // Released early / directly to cleaning
    'OUT_OF_SERVICE',       // Equipment defect discovered prior to use
    'RETIRED_DISPOSED'
  ],
  IN_USE: [
    'CLEANING_MAINTENANCE', // Released after procedure/admission; requires sanitation
    'AVAILABLE',            // Immediate release (if pre-cleared)
    'OUT_OF_SERVICE',       // Breakdown during operation
    'RETIRED_DISPOSED'
  ],
  CLEANING_MAINTENANCE: [
    'AVAILABLE',            // Maintenance / sanitization successfully completed
    'UNDER_REPAIR',         // Inspection discovered defect needing deeper repair
    'OUT_OF_SERVICE',       // Equipment failed sanitation/testing
    'RETIRED_DISPOSED'
  ],
  OUT_OF_SERVICE: [
    'UNDER_REPAIR',         // Work order issued; technician starts repair
    'CLEANING_MAINTENANCE', // Sent to bio-cleaning
    'RETIRED_DISPOSED'      // Beyond economical repair
  ],
  UNDER_REPAIR: [
    'AVAILABLE',            // Repair, calibration, and QA testing passed
    'CLEANING_MAINTENANCE', // Needs sterilization following mechanical repair
    'OUT_OF_SERVICE',       // Repair failed / awaiting parts
    'RETIRED_DISPOSED'      // Declared obsolete / irreparable
  ],
  RETIRED_DISPOSED: []      // Terminal state. No further transitions allowed.
};

/**
 * Role permissions matrix for status transitions
 */
const ROLE_TRANSITION_PERMISSIONS = {
  HOSPITAL_ADMINISTRATOR: [
    'AVAILABLE', 'ALLOCATED', 'IN_USE', 'CLEANING_MAINTENANCE', 'OUT_OF_SERVICE', 'UNDER_REPAIR', 'RETIRED_DISPOSED'
  ],
  RECEPTION_STAFF: [
    'ALLOCATED', 'IN_USE', 'CLEANING_MAINTENANCE', 'AVAILABLE'
  ],
  DEPARTMENT_COORDINATOR: [
    'AVAILABLE', 'IN_USE', 'CLEANING_MAINTENANCE', 'OUT_OF_SERVICE', 'UNDER_REPAIR'
    // Department Coordinator CANNOT retire resources
  ],
  SYSTEM_ADMINISTRATOR: [
    'AVAILABLE', 'CLEANING_MAINTENANCE', 'OUT_OF_SERVICE', 'UNDER_REPAIR', 'RETIRED_DISPOSED'
  ]
};

class StateMachineService {
  /**
   * Validate if transition from currentStatus to targetStatus is permitted
   */
  static validateTransition(currentStatus, targetStatus, userRole) {
    if (currentStatus === 'RETIRED_DISPOSED') {
      return {
        valid: false,
        message: 'A retired/disposed resource is in a terminal state and cannot transition to any other status.'
      };
    }

    if (currentStatus === targetStatus) {
      return {
        valid: false,
        message: `Resource is already in status '${currentStatus}'.`
      };
    }

    const allowedTargets = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowedTargets.includes(targetStatus)) {
      return {
        valid: false,
        message: `Illegal lifecycle transition: cannot move from '${currentStatus}' to '${targetStatus}'. Permitted transitions: [${allowedTargets.join(', ')}].`
      };
    }

    // Check user role capability
    const rolePermissions = ROLE_TRANSITION_PERMISSIONS[userRole] || [];
    if (!rolePermissions.includes(targetStatus)) {
      return {
        valid: false,
        message: `Role '${userRole}' is not authorized to transition a resource into status '${targetStatus}'.`
      };
    }

    // Special rule: only Hospital Administrator or System Administrator can retire resources
    if (targetStatus === 'RETIRED_DISPOSED' && !['HOSPITAL_ADMINISTRATOR', 'SYSTEM_ADMINISTRATOR'].includes(userRole)) {
      return {
        valid: false,
        message: 'Only Hospital Administrators or System Administrators may retire/dispose hospital resources.'
      };
    }

    return { valid: true };
  }

  /**
   * Execute validated status transition and record in StatusHistory and AuditLog
   */
  static async transitionResource({ resourceID, targetStatus, reason, user, tx = null }) {
    const client = tx || prisma;

    const resource = await client.resource.findUnique({
      where: { resourceID }
    });

    if (!resource) {
      throw new Error(`Resource '${resourceID}' not found.`);
    }

    // If user is Department Coordinator, check department restriction
    if (user.role === 'DEPARTMENT_COORDINATOR') {
      if (user.departmentID && resource.departmentID !== user.departmentID) {
        throw new Error('Department Coordinators can only update resources belonging to their assigned department.');
      }
    }

    const validation = this.validateTransition(resource.status, targetStatus, user.role);
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    const previousStatus = resource.status;

    // Additional side-effects: update quantityAvailable if applicable
    let newQuantityAvailable = resource.quantityAvailable;
    if (resource.quantityTotal === 1) {
      if (['AVAILABLE'].includes(targetStatus)) {
        newQuantityAvailable = 1;
      } else {
        newQuantityAvailable = 0;
      }
    }

    const updateData = {
      status: targetStatus,
      quantityAvailable: newQuantityAvailable,
      updatedAt: new Date()
    };

    if (targetStatus === 'RETIRED_DISPOSED') {
      updateData.retiredAt = new Date();
    }

    // Execute atomic update
    const updatedResource = await client.resource.update({
      where: { resourceID },
      data: updateData
    });

    // Record Status History
    await client.statusHistory.create({
      data: {
        resourceID,
        previousStatus,
        newStatus: targetStatus,
        changedBy: user.userID,
        reason
      }
    });

    // Record Audit Log
    await AuditService.log({
      userID: user.userID,
      action: 'RESOURCE_STATUS_CHANGED',
      entityType: 'RESOURCE',
      entityID: resourceID,
      details: {
        resourceName: resource.resourceName,
        identifierCode: resource.identifierCode,
        fromStatus: previousStatus,
        toStatus: targetStatus,
        reason
      },
      tx: client
    });

    return updatedResource;
  }
}

module.exports = {
  StateMachineService,
  VALID_TRANSITIONS,
  ROLE_TRANSITION_PERMISSIONS
};
