const prisma = require('./prisma');

class ReportService {
  /**
   * Calculate Utilization Metrics based on real database entries.
   * Clearly defined formulas:
   * 1. Snapshot Utilization = (Total Capacity - Available Units) / Total Capacity * 100%
   * 2. Active Allocation Rate = Allocated & In Use Units / Total Capacity * 100%
   */
  static async getUtilizationMetrics({ startDate, endDate, departmentID, resourceType }) {
    const isValid = (v) => v && v !== 'undefined' && v !== 'null' && v !== '';
    const parseDate = (d) => {
      if (!isValid(d)) return null;
      const parsed = new Date(d);
      return isNaN(parsed.getTime()) ? null : parsed;
    };

    const resourceWhere = { status: { not: 'RETIRED_DISPOSED' } };
    if (isValid(departmentID)) resourceWhere.departmentID = departmentID;
    if (isValid(resourceType)) resourceWhere.resourceType = resourceType;

    const resources = await prisma.resource.findMany({
      where: resourceWhere,
      include: { department: true }
    });

    const allocWhere = {};
    if (isValid(departmentID)) allocWhere.departmentID = departmentID;
    if (isValid(resourceType)) allocWhere.resource = { resourceType };

    const validStart = parseDate(startDate);
    const validEnd = parseDate(endDate);

    if (validStart || validEnd) {
      allocWhere.createdAt = {};
      if (validStart) allocWhere.createdAt.gte = validStart;
      if (validEnd) allocWhere.createdAt.lte = validEnd;
    }

    const allocations = await prisma.allocation.findMany({
      where: allocWhere,
      include: { resource: true, department: true }
    });

    // Aggregations by Category
    const categories = [
      'HOSPITAL_BED',
      'OPERATION_THEATRE',
      'MEDICAL_EQUIPMENT',
      'AMBULANCE',
      'DIAGNOSTIC_FACILITY'
    ];

    const categoryStats = {};
    categories.forEach((cat) => {
      categoryStats[cat] = {
        resourceType: cat,
        totalCapacity: 0,
        availableUnits: 0,
        allocatedUnits: 0,
        inUseUnits: 0,
        maintenanceUnits: 0,
        outOfServiceUnits: 0,
        totalAllocationsPeriod: 0,
        utilizationRate: 0
      };
    });

    // Aggregations by Department
    const departmentStats = {};

    let totalHospitalCapacity = 0;
    let totalHospitalAvailable = 0;
    let totalHospitalInService = 0;

    resources.forEach((r) => {
      const units = r.quantityTotal || 1;
      const avail = r.quantityAvailable !== undefined ? r.quantityAvailable : (r.status === 'AVAILABLE' ? 1 : 0);
      const cat = categoryStats[r.resourceType];

      totalHospitalCapacity += units;
      totalHospitalAvailable += avail;

      if (cat) {
        cat.totalCapacity += units;
        cat.availableUnits += avail;

        if (r.status === 'ALLOCATED') cat.allocatedUnits += (units - avail);
        else if (r.status === 'IN_USE') cat.inUseUnits += units;
        else if (['CLEANING_MAINTENANCE', 'UNDER_REPAIR'].includes(r.status)) cat.maintenanceUnits += units;
        else if (r.status === 'OUT_OF_SERVICE') cat.outOfServiceUnits += units;
      }

      // Department aggregation
      const deptName = r.department.departmentName;
      if (!departmentStats[deptName]) {
        departmentStats[deptName] = {
          departmentName: deptName,
          totalCapacity: 0,
          availableUnits: 0,
          allocatedUnits: 0,
          inUseUnits: 0,
          utilizationRate: 0
        };
      }
      departmentStats[deptName].totalCapacity += units;
      departmentStats[deptName].availableUnits += avail;
      if (['ALLOCATED', 'IN_USE'].includes(r.status)) {
        departmentStats[deptName].allocatedUnits += (units - avail);
      }
    });

    // Count allocations per category and department
    allocations.forEach((a) => {
      if (categoryStats[a.resource.resourceType]) {
        categoryStats[a.resource.resourceType].totalAllocationsPeriod += 1;
      }
    });

    // Calculate rates
    categories.forEach((cat) => {
      const c = categoryStats[cat];
      const busyUnits = c.totalCapacity - c.availableUnits;
      c.utilizationRate = c.totalCapacity > 0
        ? parseFloat(((busyUnits / c.totalCapacity) * 100).toFixed(1))
        : 0;
    });

    Object.values(departmentStats).forEach((d) => {
      const busy = d.totalCapacity - d.availableUnits;
      d.utilizationRate = d.totalCapacity > 0
        ? parseFloat(((busy / d.totalCapacity) * 100).toFixed(1))
        : 0;
    });

    const overallBusy = totalHospitalCapacity - totalHospitalAvailable;
    const overallUtilizationRate = totalHospitalCapacity > 0
      ? parseFloat(((overallBusy / totalHospitalCapacity) * 100).toFixed(1))
      : 0;

    return {
      overall: {
        totalHospitalCapacity,
        totalHospitalAvailable,
        overallBusy,
        overallUtilizationRate,
        totalAllocationsPeriod: allocations.length
      },
      categoryMetrics: Object.values(categoryStats),
      departmentMetrics: Object.values(departmentStats),
      timeRange: {
        startDate: startDate || null,
        endDate: endDate || null
      }
    };
  }

  /**
   * Generate CSV format for utilization and allocation records
   */
  static generateCSV(allocations) {
    const headers = [
      'Allocation ID',
      'Resource Name',
      'Identifier Code',
      'Category',
      'Department',
      'Patient Reference',
      'Purpose',
      'Priority',
      'Status',
      'Start Time',
      'Expected End Time',
      'Actual End Time',
      'Allocated By',
      'Emergency'
    ];

    const rows = allocations.map((a) => [
      `"${a.allocationID}"`,
      `"${a.resource?.resourceName || ''}"`,
      `"${a.resource?.identifierCode || ''}"`,
      `"${a.resource?.resourceType || ''}"`,
      `"${a.department?.departmentName || ''}"`,
      `"${a.patientReference || 'N/A'}"`,
      `"${(a.purpose || '').replace(/"/g, '""')}"`,
      `"${a.priority}"`,
      `"${a.status}"`,
      `"${new Date(a.startTime).toISOString()}"`,
      `"${a.expectedEndTime ? new Date(a.expectedEndTime).toISOString() : 'N/A'}"`,
      `"${a.actualEndTime ? new Date(a.actualEndTime).toISOString() : 'Active'}"`,
      `"${a.user?.fullName || a.user?.username || ''}"`,
      `"${a.isEmergency ? 'YES' : 'NO'}"`
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  /**
   * Save an archived formal snapshot report to the database
   */
  static async saveSnapshot({ reportType = 'UTILIZATION_SUMMARY', startDate, endDate, summaryData, userID }) {
    const report = await prisma.utilizationReport.create({
      data: {
        reportType,
        generatedBy: userID,
        startDate: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 86400000),
        endDate: endDate ? new Date(endDate) : new Date(),
        summaryData: typeof summaryData === 'object' ? JSON.stringify(summaryData) : summaryData
      },
      include: {
        user: {
          select: { userID: true, username: true, fullName: true, role: true }
        }
      }
    });
    return report;
  }

  /**
   * Retrieve list of saved snapshot reports
   */
  static async getSnapshots({ page = 1, limit = 20 } = {}) {
    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const [total, reports] = await Promise.all([
      prisma.utilizationReport.count(),
      prisma.utilizationReport.findMany({
        skip,
        take,
        orderBy: { generatedAt: 'desc' },
        include: {
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
      reports
    };
  }
}

module.exports = ReportService;
