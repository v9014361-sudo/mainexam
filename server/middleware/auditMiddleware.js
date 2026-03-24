const { logSecurityEvent } = require('../utils/securityLogger');

/**
 * Middleware to log audit events for sensitive actions.
 * @param {string} action - The action being performed (e.g., 'auth.login', 'exam.create')
 * @param {string} resource - The resource type (e.g., 'User', 'Exam')
 */
const auditLogMiddleware = (action, resource) => {
  return (req, res, next) => {
    // We wrap the next call to log after the request is processed, 
    // or log immediately if that's the requirement.
    // For now, we log that the action was attempted.
    
    const details = {
      action,
      resource,
      userId: req.user ? req.user._id : 'anonymous',
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.originalUrl,
      method: req.method,
    };

    logSecurityEvent(action, details);
    
    next();
  };
};

module.exports = auditLogMiddleware;
