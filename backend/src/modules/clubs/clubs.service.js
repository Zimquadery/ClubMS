const { prisma } = require('../../lib/prisma');
const { AppError } = require('../../utils/errors');
const { CLUB_CATEGORIES } = require('./clubs.constants');

async function list({ search, category }) {
  const where = {};

  if (search) {
    where.name = { contains: search, mode: 'insensitive' };
  }

  if (category) {
    where.category = category;
  }

  const clubs = await prisma.club.findMany({
    where,
    include: {
      _count: {
        select: { memberships: { where: { status: 'ACTIVE' } } },
      },
    },
    orderBy: { name: 'asc' },
  });

  return clubs;
}

async function getById(id) {
  const club = await prisma.club.findUnique({
    where: { id },
    include: {
      memberships: {
        where: { status: 'ACTIVE' },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      },
      events: {
        where: { startTime: { gte: new Date() } },
        orderBy: { startTime: 'asc' },
      },
    },
  });

  if (!club) {
    throw new AppError('Club not found', 404);
  }

  return club;
}

async function create({ name, description, category, logoUrl, adminUserId }) {
  const existing = await prisma.club.findFirst({ where: { name } });
  if (existing) {
    throw new AppError('A club with this name already exists', 409);
  }

  if (!CLUB_CATEGORIES.includes(category)) {
    throw new AppError(`Invalid category. Must be one of: ${CLUB_CATEGORIES.join(', ')}`, 400);
  }

  const club = await prisma.club.create({
    data: {
      name,
      description: description || null,
      category,
      logoUrl: logoUrl || null,
    },
  });

  if (adminUserId) {
    const user = await prisma.user.findUnique({ where: { id: adminUserId } });
    if (!user) {
      throw new AppError('Specified admin user not found', 400);
    }

    await prisma.clubMembership.create({
      data: {
        userId: adminUserId,
        clubId: club.id,
        status: 'ACTIVE',
        role: 'OFFICER',
      },
    });

    await prisma.user.update({
      where: { id: adminUserId },
      data: { role: 'CLUB_ADMIN' },
    });
  }

  return club;
}

async function deleteClub(id) {
  const club = await prisma.club.findUnique({ where: { id } });
  if (!club) {
    throw new AppError('Club not found', 404);
  }

  await prisma.club.delete({ where: { id } });

  return { success: true };
}

function getCategories() {
  return CLUB_CATEGORIES;
}

module.exports = { list, getById, create, deleteClub, getCategories };
