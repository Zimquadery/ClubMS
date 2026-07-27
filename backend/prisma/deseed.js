require('dotenv').config();
const { prisma } = require('../src/lib/prisma');

async function main() {
  console.log('Deseeding database...');

  const deletedRsvps = await prisma.eventRsvp.deleteMany();
  console.log(`Deleted ${deletedRsvps.count} RSVPs`);

  const deletedAnnouncements = await prisma.announcement.deleteMany();
  console.log(`Deleted ${deletedAnnouncements.count} announcements`);

  const deletedAuditLogs = await prisma.auditLog.deleteMany();
  console.log(`Deleted ${deletedAuditLogs.count} audit logs`);

  const deletedEventHosts = await prisma.eventHost.deleteMany();
  console.log(`Deleted ${deletedEventHosts.count} event host associations`);

  const deletedEvents = await prisma.event.deleteMany();
  console.log(`Deleted ${deletedEvents.count} events`);

  const deletedMemberships = await prisma.clubMembership.deleteMany();
  console.log(`Deleted ${deletedMemberships.count} memberships`);

  const deletedClubs = await prisma.club.deleteMany();
  console.log(`Deleted ${deletedClubs.count} clubs`);

  const deletedVenues = await prisma.venue.deleteMany();
  console.log(`Deleted ${deletedVenues.count} venues`);

  const deletedUsers = await prisma.user.deleteMany();
  console.log(`Deleted ${deletedUsers.count} users`);

  console.log('Deseeding complete!');
}

main()
  .catch((e) => {
    console.error('Deseeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
