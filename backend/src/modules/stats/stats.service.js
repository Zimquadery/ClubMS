const { prisma } = require('../../lib/prisma');
const { AppError } = require('../../utils/errors');

async function getDashboardStats(userId, userRole) {
  const now = new Date();

  if (userRole === 'PLATFORM_ADMIN') {
    const [totalClubs, totalUsers, totalEvents, pendingMemberships, upcomingEvents] = await Promise.all([
      prisma.club.count(),
      prisma.user.count(),
      prisma.event.count(),
      prisma.clubMembership.count({ where: { status: 'PENDING' } }),
      prisma.event.count({ where: { startTime: { gte: now } } }),
    ]);
    return { totalClubs, totalUsers, totalEvents, pendingMemberships, upcomingEvents };
  }

  if (userRole === 'CLUB_ADMIN' || userRole === 'FACULTY') {
    const adminMemberships = await prisma.clubMembership.findMany({
      where: { userId, role: 'OFFICER', status: 'ACTIVE' },
      select: { clubId: true },
    });
    const clubIds = adminMemberships.map((m) => m.clubId);

    if (clubIds.length === 0) {
      return { myClubs: 0, totalMembers: 0, upcomingEvents: 0, pendingRequests: 0 };
    }

    const [totalMembers, upcomingEvents, pendingRequests] = await Promise.all([
      prisma.clubMembership.count({ where: { clubId: { in: clubIds }, status: 'ACTIVE' } }),
      prisma.event.count({ where: { clubId: { in: clubIds }, startTime: { gte: now } } }),
      prisma.clubMembership.count({ where: { clubId: { in: clubIds }, status: 'PENDING' } }),
    ]);

    return { myClubs: clubIds.length, totalMembers, upcomingEvents, pendingRequests };
  }

  const [myClubs, upcomingEvents] = await Promise.all([
    prisma.clubMembership.count({ where: { userId, status: 'ACTIVE' } }),
    prisma.event.count({
      where: {
        startTime: { gte: now },
        club: { memberships: { some: { userId, status: 'ACTIVE' } } },
      },
    }),
  ]);

  return { myClubs, upcomingEvents };
}

module.exports = { getDashboardStats };
