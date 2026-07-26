const { prisma } = require('../src/lib/prisma');

const TABLES = [
  '"EventRsvp"',
  '"Announcement"',
  '"AuditLog"',
  '"EventHost"',
  '"Event"',
  '"ClubMembership"',
  '"Club"',
  '"User"',
];

async function resetDb() {
  const list = TABLES.join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE ${list} RESTART IDENTITY CASCADE;`);
}

module.exports = { prisma, resetDb, TABLES };
