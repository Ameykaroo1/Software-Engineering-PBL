const AuditService = require('../services/auditService');

class AuditController {
  static async getAll(req, res, next) {
    try {
      const { page, limit, action, entityType, userID, startDate, endDate } = req.query;
      const result = await AuditService.getLogs({
        page,
        limit,
        action,
        entityType,
        userID,
        startDate,
        endDate
      });

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuditController;
