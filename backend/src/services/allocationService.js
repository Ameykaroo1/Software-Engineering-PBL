const prisma = require('./prisma');
const AuditService = require('./auditService');

class AllocationService {
  /**
   * Allocate a hospital resource with strict concurrency control, double-check availability,
   * overlap detection, multi-unit quantity tracking, and ACID transaction semantics.
   */
  static async allocateResource({
    resourceID,
    departmentID,
    purpose,
    patientReference,
    priority = 'NORMAL',
    startTime,
    expectedEndTime,
    quantity = 1,
    notes,
    isEmergency = false
  }, user) {
    const allocStartTime = new Date(startTime);
    const allocEndTime = expectedEndTime ? new Date(expectedEndTime) : null;

    if (allocEndTime && allocEndTime <= allocStartTime) {
      throw new Error('Expected release time must be strictly after the start time.');
    }

    const requestedQty = parseInt(quantity, 10) || 1;
    if (requestedQty <= 0) {
      throw new Error('Allocation quantity must be greater than zero.');
    }

    // Wrap the entire check-and-commit in a database transaction
    return await prisma.$transaction(async (tx) => {
      // 1. Fetch resource with fresh lock/state
      const resource = await tx.resource.findUnique({
        where: { resourceID },
        include: { department: true }
      });

      if (!resource) {
        throw new Error(`Resource with ID '${resourceID}' does not exist.`);
      }

      // Check if retired
      if (resource.status === 'RETIRED_DISPOSED') {
        await AuditService.log({
          userID: user.userID,
          action: 'ALLOCATION_REJECTED',
          entityType: 'RESOURCE',
          entityID: resourceID,
          details: { reason: 'Resource is permanently retired/disposed.', requestedQty },
          tx
        });
        throw new Error(`Cannot allocate resource '${resource.resourceName}' because it has been permanently retired.`);
      }

      // Check if resource is under maintenance, out of service, or repair
      if (['CLEANING_MAINTENANCE', 'OUT_OF_SERVICE', 'UNDER_REPAIR'].includes(resource.status)) {
        await AuditService.log({
          userID: user.userID,
          action: 'ALLOCATION_REJECTED',
          entityType: 'RESOURCE',
          entityID: resourceID,
          details: { reason: `Resource status is ${resource.status}`, requestedQty },
          tx
        });
        throw new Error(`Cannot allocate resource '${resource.resourceName}' because it is currently in status '${resource.status}'.`);
      }

      // 2. Multi-unit check vs Single-unit check
      const isMultiUnit = resource.quantityTotal > 1;

      if (isMultiUnit) {
        if (resource.quantityAvailable < requestedQty) {
          await AuditService.log({
            userID: user.userID,
            action: 'ALLOCATION_REJECTED',
            entityType: 'RESOURCE',
            entityID: resourceID,
            details: {
              reason: 'Insufficient quantity available',
              requestedQty,
              quantityAvailable: resource.quantityAvailable,
              quantityTotal: resource.quantityTotal
            },
            tx
          });
          throw new Error(`Insufficient units available for '${resource.resourceName}'. Requested: ${requestedQty}, Available: ${resource.quantityAvailable}.`);
        }
      } else {
        // Single-unit resource (Beds, Operation Theatres, Ambulances, Diagnostic Machines)
        if (resource.status !== 'AVAILABLE') {
          await AuditService.log({
            userID: user.userID,
            action: 'ALLOCATION_REJECTED',
            entityType: 'RESOURCE',
            entityID: resourceID,
            details: { reason: `Resource status is currently ${resource.status}. Duplicate allocation prevented.` },
            tx
          });
          throw new Error(`Resource '${resource.resourceName}' (${resource.identifierCode}) is currently ${resource.status} and cannot be allocated.`);
        }

        // Active allocation check to prevent race conditions
        const activeAllocations = await tx.allocation.findFirst({
          where: {
            resourceID,
            status: { in: ['ALLOCATED', 'IN_USE'] }
          }
        });

        if (activeAllocations) {
          await AuditService.log({
            userID: user.userID,
            action: 'ALLOCATION_REJECTED',
            entityType: 'RESOURCE',
            entityID: resourceID,
            details: { reason: 'Active conflicting allocation already exists.' },
            tx
          });
          throw new Error(`Resource '${resource.resourceName}' already has an active allocation (Allocation ID: ${activeAllocations.allocationID}).`);
        }

        // 3. For Operation Theatres & Diagnostic Facilities: Check time-based scheduling overlaps
        if (['OPERATION_THEATRE', 'DIAGNOSTIC_FACILITY'].includes(resource.resourceType) && allocEndTime) {
          const overlappingBooking = await tx.allocation.findFirst({
            where: {
              resourceID,
              status: { in: ['ALLOCATED', 'IN_USE'] },
              AND: [
                { startTime: { lt: allocEndTime } },
                {
                  OR: [
                    { expectedEndTime: null },
                    { expectedEndTime: { gt: allocStartTime } }
                  ]
                }
              ]
            }
          });

          if (overlappingBooking) {
            await AuditService.log({
              userID: user.userID,
              action: 'ALLOCATION_REJECTED',
              entityType: 'RESOURCE',
              entityID: resourceID,
              details: {
                reason: 'Overlapping time schedule conflict',
                conflictingAllocationID: overlappingBooking.allocationID,
                startTime: allocStartTime,
                endTime: allocEndTime
              },
              tx
            });
            throw new Error(`Operation Theatre / Diagnostic schedule conflict: '${resource.resourceName}' already has a booking during the selected time window.`);
          }
        }
      }

      // 4. Create the Allocation record
      const allocation = await tx.allocation.create({
        data: {
          resourceID,
          userID: user.userID,
          departmentID,
          patientReference: patientReference || null,
          purpose,
          priority,
          startTime: allocStartTime,
          expectedEndTime: allocEndTime,
          quantity: requestedQty,
          status: 'ALLOCATED',
          notes: notes || null,
          isEmergency
        },
        include: {
          resource: true,
          department: true,
          user: {
            select: { userID: true, username: true, fullName: true, role: true }
          }
        }
      });

      // 5. Update Resource Status & Quantities atomically
      const newQtyAvailable = resource.quantityAvailable - requestedQty;
      const newStatus = isMultiUnit
        ? (newQtyAvailable === 0 ? 'ALLOCATED' : 'AVAILABLE')
        : 'ALLOCATED';

      await tx.resource.update({
        where: { resourceID },
        data: {
          status: newStatus,
          quantityAvailable: newQtyAvailable
        }
      });

      // 6. Record Status History
      await tx.statusHistory.create({
        data: {
          resourceID,
          previousStatus: resource.status,
          newStatus: 'ALLOCATED',
          changedBy: user.userID,
          reason: `Resource allocated for purpose: ${purpose}${patientReference ? ` (Patient: ${patientReference})` : ''}`
        }
      });

      // 7. Record Audit Log
      await AuditService.log({
        userID: user.userID,
        action: isEmergency ? 'EMERGENCY_ALLOCATION_CREATED' : 'RESOURCE_ALLOCATED',
        entityType: 'ALLOCATION',
        entityID: allocation.allocationID,
        details: {
          resourceID,
          resourceName: resource.resourceName,
          identifierCode: resource.identifierCode,
          quantity: requestedQty,
          priority,
          purpose,
          patientReference,
          isEmergency
        },
        tx
      });

      return allocation;
    });
  }

  /**
   * Release an active allocation and transition resource to CLEANING_MAINTENANCE or AVAILABLE
   */
  static async releaseAllocation(allocationID, { notes, nextStatus = 'CLEANING_MAINTENANCE' }, user) {
    return await prisma.$transaction(async (tx) => {
      const allocation = await tx.allocation.findUnique({
        where: { allocationID },
        include: { resource: true }
      });

      if (!allocation) {
        throw new Error(`Allocation with ID '${allocationID}' not found.`);
      }

      if (['RELEASED', 'CANCELLED', 'REJECTED'].includes(allocation.status)) {
        throw new Error(`Allocation is already in final status '${allocation.status}'.`);
      }

      const resource = allocation.resource;
      const actualEndTime = new Date();

      // Update allocation record
      const updatedAllocation = await tx.allocation.update({
        where: { allocationID },
        data: {
          status: 'RELEASED',
          actualEndTime,
          notes: notes ? `${allocation.notes ? allocation.notes + ' | ' : ''}Release notes: ${notes}` : allocation.notes
        },
        include: {
          resource: true,
          department: true,
          user: {
            select: { userID: true, username: true, fullName: true }
          }
        }
      });

      // Update Resource Quantities and Status
      const isMultiUnit = resource.quantityTotal > 1;
      const restoredQty = Math.min(resource.quantityTotal, resource.quantityAvailable + allocation.quantity);

      // Status transition: Usually goes to CLEANING_MAINTENANCE or AVAILABLE
      const finalResourceStatus = isMultiUnit
        ? (restoredQty > 0 ? 'AVAILABLE' : resource.status)
        : nextStatus;

      await tx.resource.update({
        where: { resourceID: resource.resourceID },
        data: {
          status: finalResourceStatus,
          quantityAvailable: restoredQty
        }
      });

      // Record Status History
      await tx.statusHistory.create({
        data: {
          resourceID: resource.resourceID,
          previousStatus: resource.status,
          newStatus: finalResourceStatus,
          changedBy: user.userID,
          reason: `Released from Allocation '${allocationID}'. Post-allocation status set to '${finalResourceStatus}'.`
        }
      });

      // Record Audit Log
      await AuditService.log({
        userID: user.userID,
        action: 'ALLOCATION_RELEASED',
        entityType: 'ALLOCATION',
        entityID: allocationID,
        details: {
          resourceID: resource.resourceID,
          resourceName: resource.resourceName,
          releasedQty: allocation.quantity,
          nextStatus: finalResourceStatus,
          actualEndTime
        },
        tx
      });

      return updatedAllocation;
    });
  }

  /**
   * Get allocations with comprehensive filtering
   */
  static async getAllocations({
    resourceID,
    resourceType,
    departmentID,
    userID,
    status,
    priority,
    isEmergency,
    startDate,
    endDate,
    search,
    page = 1,
    limit = 25
  }) {
    const where = {};
    const isValid = (v) => v && v !== 'undefined' && v !== 'null' && v !== '';
    const parseDate = (d) => {
      if (!isValid(d)) return null;
      const parsed = new Date(d);
      return isNaN(parsed.getTime()) ? null : parsed;
    };

    if (isValid(resourceID)) where.resourceID = resourceID;
    if (isValid(departmentID)) where.departmentID = departmentID;
    if (isValid(userID)) where.userID = userID;
    if (isValid(status)) where.status = status;
    if (isValid(priority)) where.priority = priority;
    if (isEmergency !== undefined && isEmergency !== 'undefined' && isEmergency !== 'null') {
      where.isEmergency = isEmergency === 'true' || isEmergency === true;
    }

    if (isValid(resourceType)) {
      where.resource = { resourceType };
    }

    const validStart = parseDate(startDate);
    const validEnd = parseDate(endDate);
    if (validStart || validEnd) {
      where.startTime = {};
      if (validStart) where.startTime.gte = validStart;
      if (validEnd) where.startTime.lte = validEnd;
    }

    if (isValid(search)) {
      where.OR = [
        { purpose: { contains: search } },
        { patientReference: { contains: search } },
        { resource: { resourceName: { contains: search } } },
        { resource: { identifierCode: { contains: search } } }
      ];
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const [total, allocations] = await Promise.all([
      prisma.allocation.count({ where }),
      prisma.allocation.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          resource: {
            include: { department: true }
          },
          department: true,
          user: {
            select: { userID: true, username: true, fullName: true, role: true }
          }
        }
      })
    ]);

    return {
      total,
      page: parseInt(page, 10),
      limit: take,
      totalPages: Math.ceil(total / take),
      allocations
    };
  }

  /**
   * Get single allocation by ID with related audit entries
   */
  static async getAllocationById(allocationID) {
    const allocation = await prisma.allocation.findUnique({
      where: { allocationID },
      include: {
        resource: {
          include: { department: true }
        },
        department: true,
        user: {
          select: { userID: true, username: true, fullName: true, role: true }
        }
      }
    });

    if (!allocation) {
      throw new Error(`Allocation '${allocationID}' not found.`);
    }

    // Retrieve related audit logs
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityType: 'ALLOCATION',
        entityID: allocationID
      },
      orderBy: { timestamp: 'desc' },
      include: {
        user: { select: { userID: true, username: true, fullName: true, role: true } }
      }
    });

    return {
      ...allocation,
      auditLogs
    };
  }
}

module.exports = AllocationService;
