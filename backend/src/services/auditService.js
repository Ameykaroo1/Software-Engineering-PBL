const prisma = require('./prisma');

/**
 * Audit Log Service
 * Records all critical domain events for tracking and regulatory compliance.
 * Only System Administrators have access to full audit logs.
 */
class AuditService {
  /**
   * Log an action in the database
   * @param {Object} params
   * @param {string|null} params.userID - ID of the actor
   * @param {string} params.action - Action name e.g. LOGIN_SUCCESS, ALLOCATION_CREATED
   * @param {string} params.entityType - Target entity type e.g. USER, RESOURCE, ALLOCATION
   * @param {string} params.entityID - ID of the target entity
   * @param {Object|string} params.details - Contextual details / metadata
   * @param {string} [params.ipAddress] - Request IP address
   * @param {Object} [params.tx] - Optional Prisma transaction client
   */
  static async log({ userID = null, action, entityType, entityID, details = {}, ipAddress = null, tx = null }) {
    try {
      const client = tx || prisma;
      const detailsString = typeof details === 'string' ? details : JSON.stringify(details);

      return await client.auditLog.create({
        data: {
          userID: userID || null,
          action,
          entityType,
          entityID: String(entityID),
          details: detailsString,
          ipAddress: ipAddress || '127.0.0.1'
        }
      });
    } catch (error) {
      console.error('AuditLog Creation Failed:', error.message);
      // Fail safely without blocking critical application flows, but log error
      return null;
    }
  }

  /**
   * Retrieve audit logs with filtering and pagination
   */
  static async getLogs({ page = 1, limit = 25, action, entityType, userID, startDate, endDate }) {
    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const where = {};
    if (action) where.action = { contains: action };
    if (entityType) where.entityType = entityType;
    if (userID) where.userID = userID;
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { timestamp: 'desc' },
        include: {
          user: {
            select: {
              userID: true,
              username: true,
              fullName: true,
              role: true
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
      logs
    };
  }
}

module.exports = AuditService;
