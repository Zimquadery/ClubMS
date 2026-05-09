require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const STUDENT_COUNT = 50;
const EMAIL_PREFIX = 'bulk-student';
const EMAIL_DOMAIN = '@university.edu';

async function seed() {
  console.log('Seeding 50 bulk students...');

  const clubs = await prisma.club.findMany();
  if (clubs.length === 0) {
    console.error('No clubs found. Run the main seed first.');
    process.exit(1);
  }
  console.log(`Found ${clubs.length} clubs`);

  const passwordHash = await bcrypt.hash('password123', 10);

  const userData = Array.from({ length: STUDENT_COUNT }, (_, i) => ({
    email: `${EMAIL_PREFIX}-${i + 1}${EMAIL_DOMAIN}`,
    name: `Bulk Student ${i + 1}`,
    role: 'STUDENT',
  }));

  const createdUsers = [];
  for (const u of userData) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { email: u.email, passwordHash, name: u.name, role: u.role },
    });
    createdUsers.push(user);
  }
  console.log(`Created ${createdUsers.length} users`);

  let membershipCount = 0;
  for (const club of clubs) {
    for (const user of createdUsers) {
      await prisma.clubMembership.upsert({
        where: { userId_clubId: { userId: user.id, clubId: club.id } },
        update: {},
        create: { userId: user.id, clubId: club.id, status: 'ACTIVE', role: 'MEMBER' },
      });
      membershipCount++;
    }
  }
  console.log(`Created ${membershipCount} memberships`);

  console.log('Bulk student seeding complete!');
}

async function deseed() {
  console.log('Deseeding bulk students...');

  const users = await prisma.user.findMany({
    where: { email: { startsWith: EMAIL_PREFIX } },
  });
  console.log(`Found ${users.length} bulk students`);

  if (users.length === 0) {
    console.log('No bulk students to deseed.');
    return;
  }

  const userIds = users.map(u => u.id);

  const deletedMemberships = await prisma.clubMembership.deleteMany({
    where: { userId: { in: userIds } },
  });
  console.log(`Deleted ${deletedMemberships.count} memberships`);

  const deletedUsers = await prisma.user.deleteMany({
    where: { id: { in: userIds } },
  });
  console.log(`Deleted ${deletedUsers.count} users`);

  console.log('Bulk student deseeding complete!');
}

const command = process.argv[2];

if (command === 'deseed') {
  deseed()
    .catch((e) => {
      console.error('Bulk student deseeding failed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
} else if (command === 'seed' || !command) {
  seed()
    .catch((e) => {
      console.error('Bulk student seeding failed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
} else {
  console.error('Usage: node prisma/bulk-students.js [seed|deseed]');
  process.exit(1);
}
