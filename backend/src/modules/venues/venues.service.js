const { prisma } = require('../../lib/prisma');
const { AppError } = require('../../utils/errors');

async function list({ search, page = 1, limit = 20 }) {
  const where = {};
  if (search) where.name = { contains: search, mode: 'insensitive' };

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.venue.findMany({
      where,
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    }),
    prisma.venue.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function create({ name }) {
  const existing = await prisma.venue.findUnique({ where: { name } });
  if (existing) throw new AppError('A venue with this name already exists', 409);

  return prisma.venue.create({ data: { name } });
}

async function update(id, { name }) {
  const venue = await prisma.venue.findUnique({ where: { id } });
  if (!venue) throw new AppError('Venue not found', 404);

  if (name !== undefined) {
    if (name !== venue.name) {
      const existing = await prisma.venue.findUnique({ where: { name } });
      if (existing) throw new AppError('A venue with this name already exists', 409);
    }
    if (!name.trim()) throw new AppError('Name is required', 400);
    return prisma.venue.update({ where: { id }, data: { name: name.trim() } });
  }

  throw new AppError('No fields to update', 400);
}

async function remove(id) {
  const venue = await prisma.venue.findUnique({ where: { id } });
  if (!venue) throw new AppError('Venue not found', 404);

  // onDelete: SetNull on Event.venueId nulls the FK on linked events;
  // the snapshot name in Event.venue is preserved so events keep displaying.
  await prisma.venue.delete({ where: { id } });
  return { success: true };
}

module.exports = { list, create, update, remove };
