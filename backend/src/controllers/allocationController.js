const AllocationService = require('../services/allocationService');
const {
  createAllocationSchema,
  releaseAllocationSchema
} = require('../validators/allocationValidators');

class AllocationController {
  static async create(req, res, next) {
    try {
      const parsed = createAllocationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: parsed.error.errors[0].message
        });
      }

      const allocation = await AllocationService.allocateResource(parsed.data, req.user);
      res.status(201).json({
        success: true,
        message: `Resource '${allocation.resource.resourceName}' allocated successfully.`,
        allocation
      });
    } catch (error) {
      next(error);
    }
  }

  static async release(req, res, next) {
    try {
      const parsed = releaseAllocationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: parsed.error.errors[0].message
        });
      }

      const released = await AllocationService.releaseAllocation(req.params.id, parsed.data, req.user);
      res.json({
        success: true,
        message: `Allocation '${released.allocationID}' released. Resource transitioned to '${released.resource.status}'.`,
        allocation: released
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAll(req, res, next) {
    try {
      const {
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
        page,
        limit
      } = req.query;

      const result = await AllocationService.getAllocations({
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
        page,
        limit
      });

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const allocation = await AllocationService.getAllocationById(req.params.id);
      res.json({
        success: true,
        allocation
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AllocationController;
