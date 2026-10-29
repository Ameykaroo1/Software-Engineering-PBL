const { z } = require('zod');

const ResourceTypeEnum = z.enum([
  'HOSPITAL_BED',
  'OPERATION_THEATRE',
  'MEDICAL_EQUIPMENT',
  'AMBULANCE',
  'DIAGNOSTIC_FACILITY'
]);

const ResourceStatusEnum = z.enum([
  'AVAILABLE',
  'ALLOCATED',
  'IN_USE',
  'CLEANING_MAINTENANCE',
  'OUT_OF_SERVICE',
  'UNDER_REPAIR',
  'RETIRED_DISPOSED'
]);

const createResourceSchema = z.object({
  resourceName: z.string().min(2, 'Resource name must be at least 2 characters').max(191),
  resourceType: ResourceTypeEnum,
  subType: z.string().min(1, 'Sub-type / classification is required').max(100),
  departmentID: z.string().min(1, 'Department ID is required'),
  location: z.string().min(2, 'Location is required').max(191),
  identifierCode: z.string().min(2, 'Identifier code is required').max(100),
  quantityTotal: z.number().int().positive().default(1),
  quantityAvailable: z.number().int().nonnegative().optional(),
  specifications: z.union([z.string(), z.record(z.any())]).optional()
});

const updateResourceSchema = z.object({
  resourceName: z.string().min(2).max(191).optional(),
  subType: z.string().min(1).max(100).optional(),
  departmentID: z.string().min(1).optional(),
  location: z.string().min(2).max(191).optional(),
  quantityTotal: z.number().int().positive().optional(),
  quantityAvailable: z.number().int().nonnegative().optional(),
  specifications: z.union([z.string(), z.record(z.any())]).optional()
});

const updateStatusSchema = z.object({
  status: ResourceStatusEnum,
  reason: z.string().min(3, 'A clear reason for the status change is required').max(255)
});

module.exports = {
  ResourceTypeEnum,
  ResourceStatusEnum,
  createResourceSchema,
  updateResourceSchema,
  updateStatusSchema
};
