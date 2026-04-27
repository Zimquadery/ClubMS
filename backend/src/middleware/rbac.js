const membershipsService = require('../modules/memberships/memberships.service');
const { AppError } = require('../utils/errors');

const ROLE_INHERITS = {
  PLATFORM_ADMIN: ['PLATFORM_ADMIN', 'CLUB_ADMIN'],
  CLUB_ADMIN: ['CLUB_ADMIN'],
  STUDENT: ['STUDENT'],
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const effectiveRoles = ROLE_INHERITS[req.user.role] || [req.user.role];
  const hasRole = roles.some((role) => effectiveRoles.includes(role));
  if (!hasRole) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};

function requireClubAdmin(req, res, next) {
  if (req.user.role === 'PLATFORM_ADMIN') return next();

  const { clubId } = req.params;
  membershipsService
    .isClubAdmin(req.user.userId, clubId)
    .then((isAdmin) => {
      if (!isAdmin) return next(new AppError('Not an admin of this club', 403));
      next();
    })
    .catch(next);
}

module.exports = { requireRole, requireClubAdmin };
