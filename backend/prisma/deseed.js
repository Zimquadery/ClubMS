require('dotenv').config();
const { prisma } = require('../src/lib/prisma');

async function main() {
  console.log('Deseeding database...');

  const deletedEvents = await prisma.event.deleteMany();
  console.log(`Deleted ${deletedEvents.count} events`);

  const deletedMemberships = await prisma.clubMembership.deleteMany();
  console.log(`Deleted ${deletedMemberships.count} memberships`);

  const deletedClubs = await prisma.club.deleteMany();
  console.log(`Deleted ${deletedClubs.count} clubs`);

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
