const UserService = require('../services/userService');
const {
  createUserSchema,
  updateUserSchema,
  resetPasswordSchema
} = require('../validators/userValidators');

class UserController {
  static async create(req, res, next) {
    try {
      const parsed = createUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: parsed.error.errors[0].message
        });
      }

      const user = await UserService.createUser(parsed.data, req.user);
      res.status(201).json({
        success: true,
        message: `User account '${user.username}' created successfully.`,
        user
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAll(req, res, next) {
    try {
      const { role, departmentID, isActive, search, page, limit } = req.query;
      const result = await UserService.getUsers({
        role,
        departmentID,
        isActive,
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
      const user = await UserService.getUserById(req.params.id);
      res.json({
        success: true,
        user
      });
    } catch (error) {
      next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const parsed = updateUserSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: parsed.error.errors[0].message
        });
      }

      const updated = await UserService.updateUser(req.params.id, parsed.data, req.user);
      res.json({
        success: true,
        message: `User account '${updated.username}' updated successfully.`,
        user: updated
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req, res, next) {
    try {
      const { isActive } = req.body;
      if (typeof isActive !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: "'isActive' boolean flag is required."
        });
      }

      const updated = await UserService.updateUser(req.params.id, { isActive }, req.user);
      res.json({
        success: true,
        message: `User '${updated.username}' account status updated to ${isActive ? 'Active' : 'Inactive'}.`,
        user: updated
      });
    } catch (error) {
      next(error);
    }
  }

  static async resetPassword(req, res, next) {
    try {
      const parsed = resetPasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          message: parsed.error.errors[0].message
        });
      }

      const result = await UserService.resetPassword(req.params.id, parsed.data.newPassword, req.user);
      res.json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = UserController;
