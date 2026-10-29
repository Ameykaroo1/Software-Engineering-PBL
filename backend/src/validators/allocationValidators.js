const { z } = require('zod');

const PriorityEnum = z.enum(['NORMAL', 'URGENT', 'EMERGENCY']);

const createAllocationSchema = z.object({
  resourceID: z.string().min(1, 'Resource ID is required'),
  departmentID: z.string().min(1, 'Department ID is required'),
  purpose: z.string().min(3, 'Purpose is required').max(255),
  patientReference: z.string().max(191).optional(),
  priority: PriorityEnum.default('NORMAL'),
  startTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Valid ISO startTime is required'
  }),
  expectedEndTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Valid ISO expectedEndTime is required'
  }).optional(),
  quantity: z.number().int().positive().default(1),
  notes: z.string().max(1000).optional(),
  isEmergency: z.boolean().default(false)
});

const emergencyAmbulanceSchema = z.object({
  ambulanceID: z.string().min(1, 'Ambulance ID is required'),
  emergencyPurpose: z.string().min(3, 'Emergency purpose details required').max(255),
  patientReference: z.string().max(191).optional(),
  notes: z.string().max(1000).optional()
});

const releaseAllocationSchema = z.object({
  notes: z.string().max(1000).optional(),
  nextStatus: z.enum(['AVAILABLE', 'CLEANING_MAINTENANCE', 'OUT_OF_SERVICE']).default('CLEANING_MAINTENANCE')
});

module.exports = {
  PriorityEnum,
  createAllocationSchema,
  emergencyAmbulanceSchema,
  releaseAllocationSchema
};
