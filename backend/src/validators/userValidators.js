const { z } = require('zod');

const RoleEnum = z.enum([
  'HOSPITAL_ADMINISTRATOR',
  'RECEPTION_STAFF',
  'DEPARTMENT_COORDINATOR',
  'SYSTEM_ADMINISTRATOR'
]);

const createUserSchema = z.object({
  username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain alphanumeric characters, hyphens, and underscores'),
  email: z.string().email('Valid email address is required').max(191),
  fullName: z.string().min(2).max(191),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  role: RoleEnum,
  departmentID: z.string().nullable().optional()
});

const updateUserSchema = z.object({
  fullName: z.string().min(2).max(191).optional(),
  email: z.string().email().max(191).optional(),
  role: RoleEnum.optional(),
  departmentID: z.string().nullable().optional(),
  isActive: z.boolean().optional()
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters long')
});

module.exports = {
  RoleEnum,
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema
};
