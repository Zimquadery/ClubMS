const auditService = require('../modules/audit/audit.service');

function auditLog(action, targetExtractor) {
  return (req, res, next) => {
    const originalEnd = res.end;
    res.end = function (...args) {
      if (res.statusCode < 400) {
        const target = targetExtractor ? targetExtractor(req) : {};
        auditService.log({
          action,
          actorId: req.user?.userId,
          targetType: target.type,
          targetId: target.id,
          metadata: target.metadata,
          ipAddress: req.ip || req.connection?.remoteAddress,
        }).catch(() => {});
      }
      originalEnd.apply(res, args);
    };
    next();
  };
}

module.exports = { auditLog };
