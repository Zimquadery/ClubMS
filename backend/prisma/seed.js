require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcryptjs');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

async function main() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // ── Users
  const users = {};
  const userData = [
    { email: 'admin@university.edu', name: 'Platform Admin', role: 'PLATFORM_ADMIN' },
    { email: 'officer1@university.edu', name: 'Alice Chen', role: 'CLUB_ADMIN' },
    { email: 'officer2@university.edu', name: 'Bob Martinez', role: 'CLUB_ADMIN' },
    { email: 'officer3@university.edu', name: 'Carol Singh', role: 'CLUB_ADMIN' },
    { email: 'student1@university.edu', name: 'David Kim', role: 'STUDENT' },
    { email: 'student2@university.edu', name: 'Eva Rossi', role: 'STUDENT' },
    { email: 'student3@university.edu', name: 'Frank Okafor', role: 'STUDENT' },
    { email: 'student4@university.edu', name: 'Grace Liu', role: 'STUDENT' },
    { email: 'student5@university.edu', name: 'Hassan Ali', role: 'STUDENT' },
    { email: 'student6@university.edu', name: 'Iris Tanaka', role: 'STUDENT' },
    { email: 'student7@university.edu', name: 'Jake Wilson', role: 'STUDENT' },
    { email: 'student8@university.edu', name: 'Kira Petrov', role: 'CLUB_ADMIN' },
    { email: 'student9@university.edu', name: 'Leo Nguyen', role: 'STUDENT' },
    { email: 'student10@university.edu', name: 'Maya Johnson', role: 'STUDENT' },
    { email: 'student11@university.edu', name: 'Noah Brown', role: 'STUDENT' },
    { email: 'faculty1@university.edu', name: 'Dr. Sarah Palmer', role: 'FACULTY' },
    { email: 'faculty2@university.edu', name: 'Prof. James Wright', role: 'FACULTY' },
    { email: 'faculty3@university.edu', name: 'Dr. Emily Watson', role: 'FACULTY' },
  ];

  for (const u of userData) {
    users[u.email] = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { email: u.email, passwordHash, name: u.name, role: u.role },
    });
  }
  console.log(`Created ${userData.length} users`);

  const admin = users['admin@university.edu'];
  const officer1 = users['officer1@university.edu'];
  const officer2 = users['officer2@university.edu'];
  const officer3 = users['officer3@university.edu'];
  const s1 = users['student1@university.edu'];
  const s2 = users['student2@university.edu'];
  const s3 = users['student3@university.edu'];
  const s4 = users['student4@university.edu'];
  const s5 = users['student5@university.edu'];
  const s6 = users['student6@university.edu'];
  const s7 = users['student7@university.edu'];
  const s8 = users['student8@university.edu'];
  const s9 = users['student9@university.edu'];
  const s10 = users['student10@university.edu'];
  const s11 = users['student11@university.edu'];
  const f1 = users['faculty1@university.edu'];
  const f2 = users['faculty2@university.edu'];
  const f3 = users['faculty3@university.edu'];

  // ── Clubs
  const existingClubs = await prisma.club.findMany();
  if (existingClubs.length > 0) {
    console.log('Clubs already exist, skipping seeding');
    console.log('Seeding complete!');
    return;
  }

  const clubsData = [
    { name: 'Coding Club', description: 'Learn and practice programming together', category: 'Technology', logoUrl: '/uploads/logo-coding.png' },
    { name: 'Basketball Team', description: 'Competitive basketball for all skill levels', category: 'Sports', logoUrl: '/uploads/logo-basketball.png' },
    { name: 'Drama Society', description: 'Theatre productions and acting workshops', category: 'Arts' },
    { name: 'Science Olympiad', description: 'Academic competition and research group', category: 'Academic', logoUrl: '/uploads/logo-science.png' },
    { name: 'Cultural Exchange', description: null, category: 'Cultural' },
    { name: 'Volunteer Corps', description: 'Community service and outreach programs', category: 'Community' },
  ];

  const clubs = {};
  for (const data of clubsData) {
    const club = await prisma.club.create({ data });
    clubs[club.name] = club;
    console.log(`Created club: ${club.name}`);
  }

  const cc = clubs['Coding Club'];
  const bt = clubs['Basketball Team'];
  const ds = clubs['Drama Society'];
  const so = clubs['Science Olympiad'];
  const ce = clubs['Cultural Exchange'];
  const vc = clubs['Volunteer Corps'];

  // ── Memberships
  const mem = (userId, clubId, status, role) => ({ userId, clubId, status, role });

  const memberships = [
    // Coding Club — rich membership
    mem(officer1.id, cc.id, 'ACTIVE', 'OFFICER'),
    mem(s1.id, cc.id, 'ACTIVE', 'MEMBER'),
    mem(s2.id, cc.id, 'PENDING', 'MEMBER'),
    mem(s5.id, cc.id, 'ACTIVE', 'MEMBER'),
    mem(s6.id, cc.id, 'ACTIVE', 'MEMBER'),
    mem(s9.id, cc.id, 'REJECTED', 'MEMBER'),

    // Basketball Team
    mem(officer2.id, bt.id, 'ACTIVE', 'OFFICER'),
    mem(s3.id, bt.id, 'ACTIVE', 'MEMBER'),
    mem(s7.id, bt.id, 'ACTIVE', 'MEMBER'),
    mem(s4.id, bt.id, 'PENDING', 'MEMBER'),
    mem(s10.id, bt.id, 'ALUMNI', 'MEMBER'),

    // Drama Society
    mem(s4.id, ds.id, 'ALUMNI', 'MEMBER'),
    mem(s8.id, ds.id, 'ACTIVE', 'OFFICER'),
    mem(s11.id, ds.id, 'ACTIVE', 'MEMBER'),
    mem(s1.id, ds.id, 'PENDING', 'MEMBER'),
    mem(s6.id, ds.id, 'REJECTED', 'MEMBER'),

    // Science Olympiad
    mem(officer3.id, so.id, 'ACTIVE', 'OFFICER'),
    mem(s2.id, so.id, 'ACTIVE', 'MEMBER'),
    mem(s5.id, so.id, 'ACTIVE', 'MEMBER'),
    mem(s3.id, so.id, 'PENDING', 'MEMBER'),
    mem(s10.id, so.id, 'ACTIVE', 'MEMBER'),
    mem(s11.id, so.id, 'ALUMNI', 'MEMBER'),

    // Cultural Exchange
    mem(s8.id, ce.id, 'ACTIVE', 'OFFICER'),
    mem(s7.id, ce.id, 'ACTIVE', 'MEMBER'),
    mem(s9.id, ce.id, 'ACTIVE', 'MEMBER'),
    mem(s1.id, ce.id, 'ACTIVE', 'MEMBER'),
    mem(s3.id, ce.id, 'PENDING', 'MEMBER'),

    // Volunteer Corps
    mem(s8.id, vc.id, 'ACTIVE', 'OFFICER'),
    mem(s2.id, vc.id, 'ACTIVE', 'MEMBER'),
    mem(s5.id, vc.id, 'ACTIVE', 'MEMBER'),
    mem(s10.id, vc.id, 'ACTIVE', 'MEMBER'),
    mem(s7.id, vc.id, 'REJECTED', 'MEMBER'),
    mem(s11.id, vc.id, 'PENDING', 'MEMBER'),

    // Faculty members
    mem(f1.id, cc.id, 'ACTIVE', 'OFFICER'),   // advisor-officer of Coding Club
    mem(f1.id, so.id, 'ACTIVE', 'MEMBER'),    // cross-club: also helps Science Olympiad
    mem(f2.id, so.id, 'ACTIVE', 'MEMBER'),    // member of Science Olympiad
    mem(f2.id, vc.id, 'PENDING', 'MEMBER'),   // pending join to Volunteer Corps
    // f3 — intentionally unaffiliated (no memberships)
  ];

  for (const m of memberships) {
    await prisma.clubMembership.create({ data: m });
  }
  console.log(`Created ${memberships.length} memberships`);

  // ── Events
  const now = Date.now();

  const eventsData = [
    // --- Past events ---
    {
      clubId: cc.id, title: 'Intro to Python Workshop', description: 'Beginner-friendly workshop covering Python basics',
      startTime: new Date(now - 30 * DAY), endTime: new Date(now - 30 * DAY + 2 * HOUR), location: 'Room 201',
    },
    {
      clubId: bt.id, title: 'Pre-Season Scrimmage', description: 'Friendly match to warm up for the season',
      startTime: new Date(now - 14 * DAY), endTime: new Date(now - 14 * DAY + 3 * HOUR), location: 'Main Gym',
    },
    {
      clubId: ds.id, title: 'Fall Play: Romeo & Juliet', description: null,
      startTime: new Date(now - 60 * DAY), endTime: new Date(now - 60 * DAY + 3 * HOUR), location: 'Auditorium',
    },
    {
      clubId: so.id, title: 'Regional Science Fair', description: 'Students presented their research projects at the regional fair',
      startTime: new Date(now - 45 * DAY), endTime: new Date(now - 44 * DAY), location: 'Science Building A',
    },
    {
      clubId: cc.id, title: 'Hackathon 2024', description: 'Last year\'s 24-hour coding competition',
      startTime: new Date(now - 180 * DAY), endTime: new Date(now - 179 * DAY), location: 'Computer Lab B',
      bannerUrl: '/uploads/banner-hackathon2024.jpg',
    },

    // --- Upcoming events ---
    {
      clubId: cc.id, title: 'Hackathon 2025', description: '24-hour coding competition with prizes',
      startTime: new Date(now + 7 * DAY), endTime: new Date(now + 8 * DAY), location: 'Computer Lab B',
      bannerUrl: '/uploads/banner-hackathon2025.jpg',
    },
    {
      clubId: cc.id, title: 'Weekly Code Review', description: 'Review each other\'s projects and learn best practices',
      startTime: new Date(now + 2 * DAY), endTime: new Date(now + 2 * DAY + 2 * HOUR), location: 'Room 301',
    },
    {
      clubId: bt.id, title: 'Tryouts', description: 'Open tryouts for the upcoming season',
      startTime: new Date(now + 5 * DAY), endTime: new Date(now + 5 * DAY + 3 * HOUR), location: 'Main Gym',
    },
    {
      clubId: ds.id, title: 'Spring Play Auditions', description: 'Auditions for the spring theatre production',
      startTime: new Date(now + 3 * DAY), endTime: new Date(now + 3 * DAY + 3 * HOUR), location: 'Auditorium',
    },
    {
      clubId: ds.id, title: 'Improv Night', description: 'An evening of spontaneous comedy and fun',
      startTime: new Date(now + 10 * DAY), endTime: new Date(now + 10 * DAY + 2 * HOUR), location: 'Black Box Theatre',
    },
    {
      clubId: so.id, title: 'Robotics Build Session', description: 'Hands-on session building competition robots',
      startTime: new Date(now + 4 * DAY), endTime: new Date(now + 4 * DAY + 4 * HOUR), location: 'Engineering Lab',
    },
    {
      clubId: so.id, title: 'State Championship Prep', description: 'Final preparation for the state-level olympiad',
      startTime: new Date(now + 12 * DAY), endTime: new Date(now + 12 * DAY + 6 * HOUR), location: null,
    },
    {
      clubId: ce.id, title: 'International Food Festival', description: 'Taste cuisines from around the world',
      startTime: new Date(now + 6 * DAY), endTime: new Date(now + 6 * DAY + 4 * HOUR), location: 'Student Center',
      bannerUrl: '/uploads/banner-foodfest.jpg',
    },
    {
      clubId: ce.id, title: 'Language Exchange Meetup', description: null,
      startTime: new Date(now + 9 * DAY), endTime: new Date(now + 9 * DAY + 2 * HOUR), location: 'Lounge B',
    },
    {
      clubId: vc.id, title: 'Park Cleanup Drive', description: 'Help us clean up Riverside Park',
      startTime: new Date(now + 1 * DAY), endTime: new Date(now + 1 * DAY + 3 * HOUR), location: 'Riverside Park Entrance',
    },
    {
      clubId: vc.id, title: 'Tutoring Volunteer Orientation', description: 'Orientation for new tutoring volunteers',
      startTime: new Date(now + 8 * DAY), endTime: new Date(now + 8 * DAY + 2 * HOUR), location: null,
    },
  ];

  const events = [];
  for (const data of eventsData) {
    const { clubId, ...rest } = data;
    const ev = await prisma.event.create({ data: rest });
    await prisma.eventHost.create({
      data: { eventId: ev.id, clubId, isPrimary: true, addedById: officer1.id },
    });
    events.push({ ...ev, clubId });
  }
  console.log(`Created ${eventsData.length} events (${eventsData.filter(e => e.startTime.getTime() < now).length} past, ${eventsData.filter(e => e.startTime.getTime() >= now).length} upcoming)`);

  // One collaborative event: Coding Club + Basketball Team co-hosting
  const collabEvent = await prisma.event.create({
    data: {
      title: 'Sports & Code: Hack & Play Tournament',
      description: 'A collaborative event: coding challenges in the morning, basketball tournament in the afternoon.',
      startTime: new Date(now + 14 * DAY),
      endTime: new Date(now + 14 * DAY + 8 * HOUR),
      location: 'Main Gym + Computer Lab B',
      bannerUrl: '/uploads/banner-hackathon2025.jpg',
    },
  });
  await prisma.eventHost.create({
    data: { eventId: collabEvent.id, clubId: cc.id, isPrimary: true, addedById: officer1.id },
  });
  await prisma.eventHost.create({
    data: { eventId: collabEvent.id, clubId: bt.id, isPrimary: false, addedById: officer2.id },
  });
  events.push(collabEvent);
  console.log('Created 1 multi-host (collaborative) event');

  // ── RSVPs
  const upcoming = events.filter(e => e.startTime.getTime() >= now);
  const past = events.filter(e => e.startTime.getTime() < now);

  const rsvpStatuses = ['GOING', 'MAYBE', 'NOT_GOING'];
  const rsvps = [];

  const rsvpMap = [
    // Hackathon 2025 (upcoming, index 0 in upcoming) — popular event
    { ev: 0, users: [[s1, 'GOING'], [s5, 'GOING'], [s6, 'GOING'], [s2, 'MAYBE'], [s3, 'NOT_GOING'], [f1, 'GOING']] },
    // Weekly Code Review
    { ev: 1, users: [[s1, 'GOING'], [s5, 'GOING']] },
    // Tryouts
    { ev: 2, users: [[s7, 'GOING'], [s4, 'GOING'], [s10, 'MAYBE']] },
    // Spring Play Auditions
    { ev: 3, users: [[s11, 'GOING'], [s1, 'MAYBE']] },
    // Improv Night
    { ev: 4, users: [[s11, 'GOING'], [s4, 'GOING'], [s6, 'MAYBE'], [s1, 'GOING']] },
    // Robotics Build Session
    { ev: 5, users: [[s2, 'GOING'], [s5, 'GOING'], [s10, 'GOING'], [f1, 'MAYBE']] },
    // State Championship Prep — faculty RSVP tests attendance
    { ev: 6, users: [[f2, 'GOING']] },
    // International Food Festival
    { ev: 7, users: [[s9, 'GOING'], [s1, 'GOING'], [s3, 'GOING'], [s7, 'MAYBE'], [s11, 'GOING'], [f1, 'GOING']] },
    // Language Exchange Meetup
    { ev: 8, users: [[s7, 'GOING'], [s9, 'MAYBE']] },
    // Park Cleanup Drive
    { ev: 9, users: [[s2, 'GOING'], [s5, 'GOING'], [s10, 'GOING'], [s11, 'MAYBE'], [f2, 'GOING']] },
    // Tutoring Volunteer Orientation — no RSVPs
    { ev: 10, users: [] },
  ];

  for (const entry of rsvpMap) {
    const ev = upcoming[entry.ev];
    if (!ev) continue;
    for (const [user, status] of entry.users) {
      await prisma.eventRsvp.create({
        data: { eventId: ev.id, userId: user.id, status },
      });
      rsvps.push(1);
    }
  }

  // Past events get some RSVPs too
  const pastRsvpMap = [
    { ev: 0, users: [[s1, 'GOING'], [s5, 'GOING'], [s6, 'GOING']] },
    { ev: 1, users: [[s3, 'GOING'], [s7, 'GOING']] },
    { ev: 3, users: [[s2, 'GOING'], [s5, 'GOING'], [s10, 'NOT_GOING']] },
    { ev: 4, users: [[s1, 'GOING'], [s5, 'GOING'], [s6, 'GOING']] },
  ];

  for (const entry of pastRsvpMap) {
    const ev = past[entry.ev];
    if (!ev) continue;
    for (const [user, status] of entry.users) {
      await prisma.eventRsvp.create({
        data: { eventId: ev.id, userId: user.id, status },
      });
      rsvps.push(1);
    }
  }

  console.log(`Created ${rsvps.length} RSVPs`);

  // ── Announcements ───────
  const announcementsData = [
    { clubId: cc.id, authorId: officer1.id, title: 'Welcome to Coding Club!', content: 'We are excited to have everyone join us this semester. Check out our upcoming events and workshops.', pinned: true, createdAt: new Date(now - 25 * DAY) },
    { clubId: cc.id, authorId: admin.id, title: 'Hackathon Registration Open', content: 'Registration for Hackathon 2025 is now open. Form teams of 2-4 and sign up before the deadline.', pinned: true, createdAt: new Date(now - 5 * DAY) },
    { clubId: cc.id, authorId: officer1.id, title: 'Weekly Code Review Moved to Room 301', content: 'Starting next week, our weekly code review sessions will be held in Room 301 instead of Room 201.', pinned: false, createdAt: new Date(now - 2 * DAY) },

    { clubId: bt.id, authorId: officer2.id, title: 'Season Schedule Released', content: 'The full season schedule has been posted. Check the upcoming events for game dates and locations.', pinned: true, createdAt: new Date(now - 20 * DAY) },
    { clubId: bt.id, authorId: officer2.id, title: 'New Equipment Arriving', content: 'New basketballs and training equipment will be available starting next week.', pinned: false, createdAt: new Date(now - 8 * DAY) },

    { clubId: ds.id, authorId: s8.id, title: 'Spring Play Casting Complete', content: 'Thank you to everyone who auditioned. The cast list for the spring production has been posted on the bulletin board.', pinned: true, createdAt: new Date(now - 15 * DAY) },
    { clubId: ds.id, authorId: s8.id, title: 'Improv Night This Friday', content: 'Join us for a fun evening of improvisational comedy. All skill levels welcome!', pinned: false, createdAt: new Date(now - 3 * DAY) },

    { clubId: so.id, authorId: officer3.id, title: 'State Championship Qualifiers', content: 'Congratulations to our team for qualifying for the state championship! Practice schedule will be intensified.', pinned: true, createdAt: new Date(now - 10 * DAY) },
    { clubId: so.id, authorId: officer3.id, title: 'Study Sessions for Regionals', content: 'Mandatory study sessions every Tuesday and Thursday from 4-6 PM in the Science Building.', pinned: false, createdAt: new Date(now - 7 * DAY) },
    { clubId: so.id, authorId: officer3.id, title: 'Lab Safety Reminder', content: 'Please review the updated lab safety guidelines before our next build session.', pinned: false, createdAt: new Date(now - 1 * DAY) },

    { clubId: ce.id, authorId: s8.id, title: 'Food Festival Planning Meeting', content: 'Volunteers needed for the International Food Festival planning committee. Meeting this Wednesday at 5 PM.', pinned: true, createdAt: new Date(now - 12 * DAY) },

    { clubId: vc.id, authorId: s8.id, title: 'Park Cleanup This Weekend', content: 'Remember to bring gloves and wear comfortable clothes for the Riverside Park cleanup.', pinned: true, createdAt: new Date(now - 4 * DAY) },
    { clubId: vc.id, authorId: s8.id, title: 'Tutoring Program Expands', content: 'We are expanding our tutoring program to three more schools. Sign up if interested.', pinned: false, createdAt: new Date(now - 18 * DAY) },
  ];

  for (const data of announcementsData) {
    await prisma.announcement.create({ data });
  }
  console.log(`Created ${announcementsData.length} announcements`);

  // ── Audit Logs
  const auditLogs = [
    { action: 'club.create', actorId: admin.id, targetType: 'Club', targetId: cc.id, metadata: JSON.stringify({ name: cc.name }), ipAddress: '127.0.0.1' },
    { action: 'club.create', actorId: admin.id, targetType: 'Club', targetId: bt.id, metadata: JSON.stringify({ name: bt.name }), ipAddress: '127.0.0.1' },
    { action: 'membership.approve', actorId: officer1.id, targetType: 'ClubMembership', targetId: s1.id, metadata: JSON.stringify({ club: cc.name, user: s1.name }), ipAddress: '127.0.0.1' },
    { action: 'membership.approve', actorId: officer2.id, targetType: 'ClubMembership', targetId: s3.id, metadata: JSON.stringify({ club: bt.name, user: s3.name }), ipAddress: '127.0.0.1' },
    { action: 'membership.reject', actorId: officer1.id, targetType: 'ClubMembership', targetId: s9.id, metadata: JSON.stringify({ club: cc.name, user: s9.name }), ipAddress: '127.0.0.1' },
    { action: 'event.create', actorId: officer1.id, targetType: 'Event', targetId: events[5].id, metadata: JSON.stringify({ title: 'Hackathon 2025' }), ipAddress: '127.0.0.1' },
    { action: 'event.create', actorId: officer2.id, targetType: 'Event', targetId: events[7].id, metadata: JSON.stringify({ title: 'Tryouts' }), ipAddress: '127.0.0.1' },
    { action: 'event.create', actorId: s8.id, targetType: 'Event', targetId: events[10].id, metadata: JSON.stringify({ title: 'Spring Play Auditions' }), ipAddress: '127.0.0.1' },
    { action: 'membership.approve', actorId: officer3.id, targetType: 'ClubMembership', targetId: s2.id, metadata: JSON.stringify({ club: so.name, user: s2.name }), ipAddress: '127.0.0.1' },
    { action: 'membership.promote', actorId: admin.id, targetType: 'ClubMembership', targetId: s8.id, metadata: JSON.stringify({ club: ds.name, user: s8.name, newRole: 'OFFICER' }), ipAddress: '127.0.0.1' },
    { action: 'user.role.update', actorId: admin.id, targetType: 'User', targetId: f1.id, metadata: JSON.stringify({ user: f1.name, newRole: 'FACULTY' }), ipAddress: '127.0.0.1' },
    { action: 'user.role.update', actorId: admin.id, targetType: 'User', targetId: f2.id, metadata: JSON.stringify({ user: f2.name, newRole: 'FACULTY' }), ipAddress: '127.0.0.1' },
    { action: 'user.role.update', actorId: admin.id, targetType: 'User', targetId: f3.id, metadata: JSON.stringify({ user: f3.name, newRole: 'FACULTY' }), ipAddress: '127.0.0.1' },
  ];

  for (const log of auditLogs) {
    await prisma.auditLog.create({ data: log });
  }
  console.log(`Created ${auditLogs.length} audit logs`);

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
