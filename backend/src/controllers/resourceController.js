const ResourceService = require('../services/resourceService');
const { StateMachineService } = require('../services/stateMachineService');
const {
  createResourceSchema,
  updateResourceSchema,
  updateStatusSchema
} = require('../validators/resourceValidators');

class ResourceController {
  static async create(req, res, next) {
    try {
      const parsed = createResourceSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: parsed.error.errors[0].message
        });
      }

      const resource = await ResourceService.createResource(parsed.data, req.user);
      res.status(201).json({
        success: true,
        message: `Resource '${resource.resourceName}' registered successfully.`,
        resource
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAll(req, res, next) {
    try {
      const { search, resourceType, departmentID, status, location, includeRetired, page, limit } = req.query;
      const result = await ResourceService.getResources({
        search,
        resourceType,
        departmentID,
        status,
        location,
        includeRetired: includeRetired === 'true',
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
      const resource = await ResourceService.getResourceById(req.params.id);
      res.json({
        success: true,
        resource
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const parsed = updateResourceSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: parsed.error.errors[0].message
        });
      }

      const updated = await ResourceService.updateResource(req.params.id, parsed.data, req.user);
      res.json({
        success: true,
        message: 'Resource details updated successfully.',
        resource: updated
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req, res, next) {
    try {
      const parsed = updateStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: parsed.error.errors[0].message
        });
      }

      const updated = await StateMachineService.transitionResource({
        resourceID: req.params.id,
        targetStatus: parsed.data.status,
        reason: parsed.data.reason,
        user: req.user
      });

      res.json({
        success: true,
        message: `Resource status changed to '${parsed.data.status}' successfully.`,
        resource: updated
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAvailability(req, res, next) {
    try {
      const departmentID = req.query.departmentID || (req.user.role === 'DEPARTMENT_COORDINATOR' ? req.user.departmentID : null);
      const summary = await ResourceService.getAvailabilitySummary(departmentID);
      res.json({
        success: true,
        summary
      });
    } catch (error) {
      next(error);
    }
  }

  static async retire(req, res, next) {
    try {
      const { reason } = req.body;
      const retired = await ResourceService.retireResource(req.params.id, reason, req.user);
      res.json({
        success: true,
        message: 'Resource permanently retired and archived.',
        resource: retired
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ResourceController;
