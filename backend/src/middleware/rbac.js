/**
 * Role-Based Access Control (RBAC) Middleware
 * Restricts access to endpoints based on user roles defined in SRS.
 * Allowed roles:
 * - HOSPITAL_ADMINISTRATOR
 * - RECEPTION_STAFF
 * - DEPARTMENT_COORDINATOR
 * - SYSTEM_ADMINISTRATOR
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required prior to permission verification.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access denied. Role '${req.user.role}' is not authorized to perform this operation. Required: ${allowedRoles.join(', ')}.`
      });
    }

    next();
  };
}

module.exports = {
  authorize
};
