const prisma = require('../services/prisma');

class DepartmentController {
  static async getAll(req, res, next) {
    try {
      const departments = await prisma.department.findMany({
        orderBy: { departmentName: 'asc' },
        include: {
          _count: {
            select: { resources: true, users: true, allocations: true }
          }
        }
      });
      res.json({
        success: true,
        departments
      });
    } catch (error) {
      next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const { departmentName, code, description } = req.body;
      if (!departmentName || !code) {
        return res.status(400).json({
          success: false,
          message: 'departmentName and code are required.'
        });
      }

      const department = await prisma.department.create({
        data: { departmentName, code, description }
      });

      res.status(201).json({
        success: true,
        message: `Department '${departmentName}' created successfully.`,
        department
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = DepartmentController;
