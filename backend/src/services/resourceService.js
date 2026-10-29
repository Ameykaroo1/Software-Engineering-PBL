const prisma = require('./prisma');
const AuditService = require('./auditService');
const { StateMachineService } = require('./stateMachineService');

class ResourceService {
  /**
   * Register a new hospital resource
   */
  static async createResource(data, user) {
    const { specifications, quantityTotal = 1, ...rest } = data;

    // Check unique identifierCode
    const existing = await prisma.resource.findUnique({
      where: { identifierCode: rest.identifierCode }
    });
    if (existing) {
      throw new Error(`A resource with identifier '${rest.identifierCode}' already exists.`);
    }

    const specificationsString = typeof specifications === 'object'
      ? JSON.stringify(specifications)
      : (specifications || null);

    const resource = await prisma.resource.create({
      data: {
        ...rest,
        quantityTotal: parseInt(quantityTotal, 10),
        quantityAvailable: data.quantityAvailable !== undefined
          ? parseInt(data.quantityAvailable, 10)
          : parseInt(quantityTotal, 10),
        status: 'AVAILABLE',
        specifications: specificationsString
      },
      include: {
        department: true
      }
    });

    // Record Status History for initial creation
    await prisma.statusHistory.create({
      data: {
        resourceID: resource.resourceID,
        previousStatus: 'AVAILABLE',
        newStatus: 'AVAILABLE',
        changedBy: user.userID,
        reason: 'Resource initial registration into MediCore'
      }
    });

    // Audit log
    await AuditService.log({
      userID: user.userID,
      action: 'RESOURCE_REGISTERED',
      entityType: 'RESOURCE',
      entityID: resource.resourceID,
      details: {
        resourceName: resource.resourceName,
        resourceType: resource.resourceType,
        identifierCode: resource.identifierCode,
        department: resource.department.departmentName
      }
    });

    return resource;
  }

  /**
   * Retrieve list of resources with searching, filtering, and pagination
   */
  static async getResources({
    search,
    resourceType,
    departmentID,
    status,
    location,
    includeRetired = false,
    page = 1,
    limit = 50
  }) {
    const where = {};

    if (!includeRetired) {
      where.status = { not: 'RETIRED_DISPOSED' };
    }

    const isValid = (v) => v && v !== 'undefined' && v !== 'null' && v !== '';

    if (isValid(status)) {
      where.status = status;
    }

    if (isValid(resourceType)) {
      where.resourceType = resourceType;
    }

    if (isValid(departmentID)) {
      where.departmentID = departmentID;
    }

    if (isValid(location)) {
      where.location = { contains: location };
    }

    if (isValid(search)) {
      where.OR = [
        { resourceName: { contains: search } },
        { identifierCode: { contains: search } },
        { subType: { contains: search } },
        { location: { contains: search } }
      ];
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const [total, resources] = await Promise.all([
      prisma.resource.count({ where }),
      prisma.resource.findMany({
        where,
        skip,
        take,
        orderBy: [{ resourceType: 'asc' }, { resourceName: 'asc' }],
        include: {
          department: true,
          allocations: {
            where: {
              status: { in: ['ALLOCATED', 'IN_USE'] }
            },
            take: 1,
            orderBy: { startTime: 'desc' },
            include: {
              user: {
                select: { userID: true, username: true, fullName: true }
              }
            }
          }
        }
      })
    ]);

    return {
      total,
      page: parseInt(page, 10),
      limit: take,
      totalPages: Math.ceil(total / take),
      resources
    };
  }

  /**
   * Get single resource with full history
   */
  static async getResourceById(resourceID) {
    const resource = await prisma.resource.findUnique({
      where: { resourceID },
      include: {
        department: true,
        allocations: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            user: { select: { userID: true, username: true, fullName: true } },
            department: true
          }
        },
        statusHistories: {
          orderBy: { timestamp: 'desc' },
          take: 15,
          include: {
            user: { select: { userID: true, username: true, fullName: true, role: true } }
          }
        }
      }
    });

    if (!resource) {
      throw new Error(`Resource '${resourceID}' not found.`);
    }

    return resource;
  }

  /**
   * Update resource details
   */
  static async updateResource(resourceID, updateData, user) {
    const resource = await prisma.resource.findUnique({
      where: { resourceID }
    });

    if (!resource) {
      throw new Error(`Resource '${resourceID}' not found.`);
    }

    if (resource.status === 'RETIRED_DISPOSED') {
      throw new Error('Retired or disposed resources cannot be modified.');
    }

    // Role-based department scoping for Department Coordinators
    if (user.role === 'DEPARTMENT_COORDINATOR') {
      if (user.departmentID && resource.departmentID !== user.departmentID) {
        throw new Error('Department Coordinators can only modify resources assigned to their own department.');
      }
    }

    const { specifications, ...rest } = updateData;
    const dataToUpdate = { ...rest };

    if (specifications !== undefined) {
      dataToUpdate.specifications = typeof specifications === 'object'
        ? JSON.stringify(specifications)
        : specifications;
    }

    const updated = await prisma.resource.update({
      where: { resourceID },
      data: dataToUpdate,
      include: { department: true }
    });

    await AuditService.log({
      userID: user.userID,
      action: 'RESOURCE_MODIFIED',
      entityType: 'RESOURCE',
      entityID: resourceID,
      details: {
        changes: updateData,
        resourceName: updated.resourceName
      }
    });

    return updated;
  }

  /**
   * Retire / Archive Resource
   * Section 5: A resource must not be permanently deleted if it has historical allocation records.
   * Archive or retire it instead.
   */
  static async retireResource(resourceID, reason, user) {
    return await StateMachineService.transitionResource({
      resourceID,
      targetStatus: 'RETIRED_DISPOSED',
      reason: reason || 'Permanently decommissioned and retired by administration',
      user
    });
  }

  /**
   * Get availability summary across all 5 resource categories
   */
  static async getAvailabilitySummary(departmentID = null) {
    const where = { status: { not: 'RETIRED_DISPOSED' } };
    if (departmentID && departmentID !== 'undefined' && departmentID !== 'null') {
      where.departmentID = departmentID;
    }

    const resources = await prisma.resource.findMany({
      where,
      include: { department: true }
    });

    const summary = {
      overall: {
        total: 0,
        available: 0,
        allocated: 0,
        inUse: 0,
        maintenance: 0,
        outOfService: 0
      },
      byCategory: {
        HOSPITAL_BED: { total: 0, available: 0, allocated: 0, inUse: 0, maintenance: 0 },
        OPERATION_THEATRE: { total: 0, available: 0, allocated: 0, inUse: 0, maintenance: 0 },
        MEDICAL_EQUIPMENT: { total: 0, available: 0, allocated: 0, inUse: 0, maintenance: 0 },
        AMBULANCE: { total: 0, available: 0, allocated: 0, inUse: 0, maintenance: 0 },
        DIAGNOSTIC_FACILITY: { total: 0, available: 0, allocated: 0, inUse: 0, maintenance: 0 }
      }
    };

    resources.forEach((r) => {
      const units = r.quantityTotal || 1;
      const availUnits = r.quantityAvailable !== undefined ? r.quantityAvailable : (r.status === 'AVAILABLE' ? 1 : 0);

      summary.overall.total += units;
      summary.overall.available += availUnits;

      const cat = summary.byCategory[r.resourceType];
      if (cat) {
        cat.total += units;
        cat.available += availUnits;
      }

      if (r.status === 'ALLOCATED') {
        summary.overall.allocated += (units - availUnits);
        if (cat) cat.allocated += (units - availUnits);
      } else if (r.status === 'IN_USE') {
        summary.overall.inUse += units;
        if (cat) cat.inUse += units;
      } else if (['CLEANING_MAINTENANCE', 'UNDER_REPAIR'].includes(r.status)) {
        summary.overall.maintenance += units;
        if (cat) cat.maintenance += units;
      } else if (r.status === 'OUT_OF_SERVICE') {
        summary.overall.outOfService += units;
      }
    });

    return summary;
  }
}

module.exports = ResourceService;
