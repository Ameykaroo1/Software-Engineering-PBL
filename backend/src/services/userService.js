const bcrypt = require('bcryptjs');
const prisma = require('./prisma');
const AuditService = require('./auditService');

class UserService {
  /**
   * Create a new user account (System Administrator only)
   */
  static async createUser(userData, requestingUser) {
    const { username, email, fullName, password, role, departmentID } = userData;

    // Check unique username and email
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }]
      }
    });

    if (existing) {
      if (existing.username === username) {
        throw new Error(`Username '${username}' is already in use.`);
      }
      throw new Error(`Email '${email}' is already registered.`);
    }

    // Hash password with bcrypt
    const passwordSalt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, passwordSalt);

    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        fullName,
        passwordHash,
        role,
        departmentID: departmentID || null,
        isActive: true
      },
      include: { department: true }
    });

    delete newUser.passwordHash;

    // Record audit log
    await AuditService.log({
      userID: requestingUser.userID,
      action: 'USER_ACCOUNT_CREATED',
      entityType: 'USER',
      entityID: newUser.userID,
      details: {
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        department: newUser.department?.departmentName || 'None'
      }
    });

    return newUser;
  }

  /**
   * List all users
   */
  static async getUsers({ role, departmentID, isActive, search, page = 1, limit = 50 }) {
    const where = {};
    if (role) where.role = role;
    if (departmentID) where.departmentID = departmentID;
    if (isActive !== undefined) where.isActive = isActive === 'true' || isActive === true;

    if (search) {
      where.OR = [
        { username: { contains: search } },
        { fullName: { contains: search } },
        { email: { contains: search } }
      ];
    }

    const skip = (Math.max(1, parseInt(page, 10)) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take,
        select: {
          userID: true,
          username: true,
          email: true,
          fullName: true,
          role: true,
          departmentID: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          department: true
        },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    return {
      total,
      page: parseInt(page, 10),
      limit: take,
      totalPages: Math.ceil(total / take),
      users
    };
  }

  /**
   * Get user by ID with recent activity logs
   */
  static async getUserById(userID) {
    const user = await prisma.user.findUnique({
      where: { userID },
      select: {
        userID: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        departmentID: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        department: true,
        allocations: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { resource: true, department: true }
        },
        auditLogs: {
          take: 15,
          orderBy: { timestamp: 'desc' }
        }
      }
    });

    if (!user) {
      throw new Error(`User '${userID}' not found.`);
    }

    return user;
  }

  /**
   * Update user details and roles (Prevent user from changing their own role)
   */
  static async updateUser(targetUserID, updateData, requestingUser) {
    const targetUser = await prisma.user.findUnique({
      where: { userID: targetUserID }
    });

    if (!targetUser) {
      throw new Error(`User '${targetUserID}' not found.`);
    }

    // Protection: User cannot modify their own role
    if (requestingUser.userID === targetUserID && updateData.role && updateData.role !== targetUser.role) {
      throw new Error('Security Violation: You are not permitted to alter your own administrative role.');
    }

    // Protection: Prevent deactivating the last active System Administrator
    if (updateData.isActive === false && targetUser.role === 'SYSTEM_ADMINISTRATOR') {
      const activeSysAdmins = await prisma.user.count({
        where: { role: 'SYSTEM_ADMINISTRATOR', isActive: true }
      });
      if (activeSysAdmins <= 1) {
        throw new Error('Action blocked: Cannot deactivate the sole active System Administrator account.');
      }
    }

    const updated = await prisma.user.update({
      where: { userID: targetUserID },
      data: updateData,
      select: {
        userID: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        departmentID: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        department: true
      }
    });

    await AuditService.log({
      userID: requestingUser.userID,
      action: 'USER_ACCOUNT_UPDATED',
      entityType: 'USER',
      entityID: targetUserID,
      details: {
        changes: updateData,
        targetUsername: updated.username
      }
    });

    return updated;
  }

  /**
   * Reset user password
   */
  static async resetPassword(targetUserID, newPassword, requestingUser) {
    const targetUser = await prisma.user.findUnique({
      where: { userID: targetUserID }
    });

    if (!targetUser) {
      throw new Error(`User '${targetUserID}' not found.`);
    }

    const passwordSalt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, passwordSalt);

    await prisma.user.update({
      where: { userID: targetUserID },
      data: { passwordHash }
    });

    await AuditService.log({
      userID: requestingUser.userID,
      action: 'USER_PASSWORD_RESET',
      entityType: 'USER',
      entityID: targetUserID,
      details: { targetUsername: targetUser.username }
    });

    return { message: `Password for user '${targetUser.username}' was successfully reset.` };
  }
}

module.exports = UserService;
