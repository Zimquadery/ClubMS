const { prisma } = require('../../lib/prisma');

async function log({ action, actorId, targetType, targetId, metadata, ipAddress }) {
  return prisma.auditLog.create({
    data: {
      action,
      actorId: actorId || null,
      targetType: targetType || null,
      targetId: targetId || null,
      metadata: metadata ? JSON.stringify(metadata) : null,
      ipAddress: ipAddress || null,
    },
    include: { actor: { select: { id: true, name: true, email: true, role: true } } },
  });
}

async function list({ action, actorId, targetType, targetId, page = 1, limit = 50 } = {}) {
  const where = {};
  if (action) where.action = action;
  if (actorId) where.actorId = actorId;
  if (targetType) where.targetType = targetType;
  if (targetId) where.targetId = targetId;

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { actor: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

module.exports = { log, list };
