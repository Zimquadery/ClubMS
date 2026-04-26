require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@university.edu' },
    update: {},
    create: {
      email: 'admin@university.edu',
      passwordHash,
      name: 'Platform Admin',
      role: 'PLATFORM_ADMIN',
    },
  });
  console.log(`Created admin user: ${admin.email}`);

  const student = await prisma.user.upsert({
    where: { email: 'student@university.edu' },
    update: {},
    create: {
      email: 'student@university.edu',
      passwordHash,
      name: 'Test Student',
      role: 'STUDENT',
    },
  });
  console.log(`Created student user: ${student.email}`);

  const existingClubs = await prisma.club.findMany();
  if (existingClubs.length === 0) {
    const clubsData = [
      { name: 'Coding Club', description: 'Learn and practice programming together', category: 'Technology' },
      { name: 'Basketball Team', description: 'Competitive basketball for all skill levels', category: 'Sports' },
      { name: 'Drama Society', description: 'Theatre productions and acting workshops', category: 'Arts' },
      { name: 'Science Olympiad', description: 'Academic competition and research group', category: 'Academic' },
      { name: 'Cultural Exchange', description: 'Celebrate diversity and cultural awareness', category: 'Cultural' },
      { name: 'Volunteer Corps', description: 'Community service and outreach programs', category: 'Community' },
    ];

    const clubs = [];
    for (const data of clubsData) {
      const club = await prisma.club.create({ data });
      clubs.push(club);
      console.log(`Created club: ${club.name}`);
    }

    await prisma.clubMembership.create({
      data: {
        userId: admin.id,
        clubId: clubs[0].id,
        status: 'ACTIVE',
        role: 'OFFICER',
      },
    });
    console.log('Made admin an officer of Coding Club');

    await prisma.event.createMany({
      data: [
        {
          clubId: clubs[0].id,
          title: 'Hackathon 2025',
          description: '24-hour coding competition',
          startTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
          location: 'Computer Lab B',
        },
        {
          clubId: clubs[0].id,
          title: 'Weekly Code Review',
          description: 'Review each other\'s projects and learn best practices',
          startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          location: 'Room 301',
        },
        {
          clubId: clubs[1].id,
          title: 'Tryouts',
          description: 'Open tryouts for the upcoming season',
          startTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          location: 'Main Gym',
        },
        {
          clubId: clubs[2].id,
          title: 'Spring Play Auditions',
          description: 'Auditions for the spring theatre production',
          startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          location: 'Auditorium',
        },
      ],
    });
    console.log('Created sample events');
  } else {
    console.log('Clubs already exist, skipping club/event seeding');
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
