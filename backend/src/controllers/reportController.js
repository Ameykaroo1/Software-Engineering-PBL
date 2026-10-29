const ReportService = require('../services/reportService');
const AllocationService = require('../services/allocationService');

class ReportController {
  static async getUtilization(req, res, next) {
    try {
      const { startDate, endDate, departmentID, resourceType } = req.query;
      const metrics = await ReportService.getUtilizationMetrics({
        startDate,
        endDate,
        departmentID,
        resourceType
      });

      res.json({
        success: true,
        metrics
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAllocationsReport(req, res, next) {
    try {
      const { startDate, endDate, departmentID, resourceType, status, page, limit } = req.query;
      const result = await AllocationService.getAllocations({
        startDate,
        endDate,
        departmentID,
        resourceType,
        status,
        page: page || 1,
        limit: limit || 100
      });

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  static async exportCSV(req, res, next) {
    try {
      const { startDate, endDate, departmentID, resourceType, status } = req.query;
      const result = await AllocationService.getAllocations({
        startDate,
        endDate,
        departmentID,
        resourceType,
        status,
        page: 1,
        limit: 2000
      });

      const csvData = ReportService.generateCSV(result.allocations);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="medicore-report-${new Date().toISOString().split('T')[0]}.csv"`);
      res.status(200).send(csvData);
    } catch (error) {
      next(error);
    }
  }

  static async saveSnapshot(req, res, next) {
    try {
      const { reportType, startDate, endDate, summaryData } = req.body;
      const snapshot = await ReportService.saveSnapshot({
        reportType,
        startDate,
        endDate,
        summaryData,
        userID: req.user.userID
      });

      res.status(201).json({
        success: true,
        message: 'Formal utilization report snapshot successfully archived.',
        snapshot
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSnapshots(req, res, next) {
    try {
      const { page, limit } = req.query;
      const result = await ReportService.getSnapshots({ page, limit });
      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ReportController;
