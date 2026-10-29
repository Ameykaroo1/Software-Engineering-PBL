const AmbulanceService = require('../services/ambulanceService');
const { emergencyAmbulanceSchema } = require('../validators/allocationValidators');

class AmbulanceController {
  static async getAvailable(req, res, next) {
    try {
      const fleet = await AmbulanceService.getAmbulanceFleet();
      res.json({
        success: true,
        fleet,
        availableCount: fleet.filter(a => a.status === 'AVAILABLE').length
      });
    } catch (error) {
      next(error);
    }
  }

  static async allocateEmergency(req, res, next) {
    try {
      const parsed = emergencyAmbulanceSchema.safeParse({
        ambulanceID: req.params.id,
        ...req.body
      });

      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: parsed.error.errors[0].message
        });
      }

      const allocation = await AmbulanceService.allocateEmergencyAmbulance(parsed.data, req.user);
      res.status(201).json({
        success: true,
        message: `Emergency allocation recorded for ${allocation.resource.resourceName}. Unit marked as ALLOCATED.`,
        allocation
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AmbulanceController;
