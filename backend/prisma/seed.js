require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

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

  const officer1 = await prisma.user.upsert({
    where: { email: 'officer1@university.edu' },
    update: {},
    create: {
      email: 'officer1@university.edu',
      passwordHash,
      name: 'Club Officer 1',
      role: 'CLUB_ADMIN',
    },
  });
  console.log(`Created officer user: ${officer1.email}`);

  const officer2 = await prisma.user.upsert({
    where: { email: 'officer2@university.edu' },
    update: {},
    create: {
      email: 'officer2@university.edu',
      passwordHash,
      name: 'Club Officer 2',
      role: 'CLUB_ADMIN',
    },
  });
  console.log(`Created officer user: ${officer2.email}`);

  const student1 = await prisma.user.upsert({
    where: { email: 'student1@university.edu' },
    update: {},
    create: {
      email: 'student1@university.edu',
      passwordHash,
      name: 'Student One',
      role: 'STUDENT',
    },
  });
  console.log(`Created student user: ${student1.email}`);

  const student2 = await prisma.user.upsert({
    where: { email: 'student2@university.edu' },
    update: {},
    create: {
      email: 'student2@university.edu',
      passwordHash,
      name: 'Student Two',
      role: 'STUDENT',
    },
  });
  console.log(`Created student user: ${student2.email}`);

  const student3 = await prisma.user.upsert({
    where: { email: 'student3@university.edu' },
    update: {},
    create: {
      email: 'student3@university.edu',
      passwordHash,
      name: 'Student Three',
      role: 'STUDENT',
    },
  });
  console.log(`Created student user: ${student3.email}`);

  const student4 = await prisma.user.upsert({
    where: { email: 'student4@university.edu' },
    update: {},
    create: {
      email: 'student4@university.edu',
      passwordHash,
      name: 'Student Four',
      role: 'STUDENT',
    },
  });
  console.log(`Created student user: ${student4.email}`);

  const student5 = await prisma.user.upsert({
    where: { email: 'student5@university.edu' },
    update: {},
    create: {
      email: 'student5@university.edu',
      passwordHash,
      name: 'Student Five',
      role: 'STUDENT',
    },
  });
  console.log(`Created student user: ${student5.email}`);

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

    // Phase 7: officer and student memberships
    await prisma.clubMembership.create({
      data: { userId: officer1.id, clubId: clubs[0].id, status: 'ACTIVE', role: 'OFFICER' },
    });
    await prisma.clubMembership.create({
      data: { userId: officer2.id, clubId: clubs[1].id, status: 'ACTIVE', role: 'OFFICER' },
    });
    await prisma.clubMembership.create({
      data: { userId: student1.id, clubId: clubs[0].id, status: 'ACTIVE', role: 'MEMBER' },
    });
    await prisma.clubMembership.create({
      data: { userId: student2.id, clubId: clubs[0].id, status: 'PENDING', role: 'MEMBER' },
    });
    await prisma.clubMembership.create({
      data: { userId: student3.id, clubId: clubs[1].id, status: 'ACTIVE', role: 'MEMBER' },
    });
    await prisma.clubMembership.create({
      data: { userId: student4.id, clubId: clubs[2].id, status: 'ALUMNI', role: 'MEMBER' },
    });
    await prisma.clubMembership.create({
      data: { userId: student5.id, clubId: clubs[0].id, status: 'ACTIVE', role: 'MEMBER' },
    });
    console.log('Created officer and student memberships');

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
          endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
          location: 'Room 301',
        },
        {
          clubId: clubs[1].id,
          title: 'Tryouts',
          description: 'Open tryouts for the upcoming season',
          startTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
          location: 'Main Gym',
        },
        {
          clubId: clubs[2].id,
          title: 'Spring Play Auditions',
          description: 'Auditions for the spring theatre production',
          startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
          location: 'Auditorium',
        },
        {
          clubId: clubs[2].id,
          title: 'Improv Night',
          description: 'An evening of spontaneous comedy and fun',
          startTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
          endTime: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000),
          location: 'Black Box Theatre',
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
