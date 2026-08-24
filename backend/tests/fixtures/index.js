const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { prisma } = require('../db');

const JWT_SECRET = process.env.JWT_SECRET;
const DEFAULT_PASSWORD = 'Password123!';
let cachedHash = null;

async function defaultHash() {
  if (!cachedHash) cachedHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  return cachedHash;
}

let counter = 0;
function uniqueEmail(prefix = 'user') {
  counter += 1;
  return `${prefix}.${Date.now().toString(36)}.${counter}@test.local`;
}

async function makeUser(overrides = {}) {
  counter += 1;
  const email = overrides.email || uniqueEmail(overrides.role ? overrides.role.toLowerCase() : 'user');
  const password = overrides.password || DEFAULT_PASSWORD;
  const passwordHash = overrides.passwordHash
    ?? (password === DEFAULT_PASSWORD ? await defaultHash() : await bcrypt.hash(password, 10));
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name: overrides.name || `Test ${email}`,
      role: overrides.role || 'STUDENT',
      phone: overrides.phone || '01700000000',
      studentId: overrides.studentId || String(10000000 + counter),
      idCardUrl: overrides.idCardUrl || '/uploads/Dummy_ID_card.jpg',
      department: overrides.department !== undefined ? overrides.department : null,
      homeDistrict: overrides.homeDistrict !== undefined ? overrides.homeDistrict : null,
    },
    select: { id: true, email: true, name: true, phone: true, studentId: true, idCardUrl: true, department: true, homeDistrict: true, role: true, createdAt: true, updatedAt: true },
  });
  return { ...user, password };
}

async function makeClub(overrides = {}) {
  const suffix = crypto.randomBytes(4).toString('hex');
  return prisma.club.create({
    data: {
      name: overrides.name || `Club ${suffix}`,
      description: overrides.description !== undefined ? overrides.description : 'Test club',
      category: overrides.category || 'Academic',
      logoUrl: overrides.logoUrl !== undefined ? overrides.logoUrl : null,
      joinRuleMode: overrides.joinRuleMode || 'ALL',
      joinDepartments: overrides.joinDepartments || [],
      rules: overrides.rules !== undefined ? overrides.rules : null,
    },
  });
}

async function makeMembership({ userId, clubId, status = 'PENDING', role = 'MEMBER' }) {
  return prisma.clubMembership.create({
    data: { userId, clubId, status, role },
  });
}

async function makeOfficer({ userId, clubId }) {
  await prisma.user.update({ where: { id: userId }, data: { role: 'CLUB_ADMIN' } });
  return prisma.clubMembership.create({
    data: { userId, clubId, status: 'ACTIVE', role: 'OFFICER' },
  });
}

async function makeActiveMember({ userId, clubId, role = 'MEMBER' }) {
  return prisma.clubMembership.create({
    data: { userId, clubId, status: 'ACTIVE', role },
  });
}

async function makeVenue(overrides = {}) {
  const suffix = crypto.randomBytes(4).toString('hex');
  return prisma.venue.create({
    data: {
      name: overrides.name || `Venue ${suffix}`,
    },
  });
}

async function makeEvent({ primaryClubId, coHostClubIds = [], overrides = {}, creatorUserId = null }) {
  const created = await prisma.event.create({
    data: {
      title: overrides.title || 'Test Event',
      description: overrides.description !== undefined ? overrides.description : 'desc',
      startTime: overrides.startTime || new Date(Date.now() + 86_400_000),
      endTime: overrides.endTime || new Date(Date.now() + 2 * 86_400_000),
      venue: overrides.venue !== undefined ? overrides.venue : 'Room A',
      venueId: overrides.venueId !== undefined ? overrides.venueId : null,
      bannerUrl: overrides.bannerUrl !== undefined ? overrides.bannerUrl : null,
      tags: overrides.tags !== undefined ? overrides.tags : [],
    },
  });
  await prisma.eventHost.create({
    data: { eventId: created.id, clubId: primaryClubId, isPrimary: true, addedById: creatorUserId },
  });
  for (const clubId of coHostClubIds) {
    await prisma.eventHost.create({
      data: { eventId: created.id, clubId, isPrimary: false, addedById: creatorUserId },
    });
  }
  return created;
}

async function makeAnnouncement({ clubId, authorId, overrides = {} }) {
  return prisma.announcement.create({
    data: {
      clubId,
      authorId,
      title: overrides.title || 'Test announcement',
      content: overrides.content || 'Body',
      pinned: overrides.pinned || false,
    },
  });
}

async function makeRsvp({ eventId, userId, status = 'GOING' }) {
  return prisma.eventRsvp.create({ data: { eventId, userId, status } });
}

async function makeCohostInvite({ eventId, clubId }) {
  return prisma.eventHostInvite.create({ data: { eventId, clubId } });
}

function tokenFor(user) {
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
  return `Bearer ${token}`;
}

function expiredTokenFor(user) {
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '-1s' }
  );
  return `Bearer ${token}`;
}

function as(request, user) {
  return request.set('Authorization', tokenFor(user));
}

async function waitFor(fn, { timeout = 1500, interval = 25 } = {}) {
  const start = Date.now();
  let lastErr;
  while (Date.now() - start < timeout) {
    try {
      const result = await fn();
      if (result !== null && result !== undefined && result !== false) return result;
    } catch (err) {
      lastErr = err;
    }
    await new Promise((r) => setTimeout(r, interval));
  }
  if (lastErr) throw lastErr;
  throw new Error(`waitFor: condition not met within ${timeout}ms`);
}

module.exports = {
  DEFAULT_PASSWORD,
  makeUser,
  makeClub,
  makeMembership,
  makeOfficer,
  makeActiveMember,
  makeEvent,
  makeVenue,
  makeAnnouncement,
  makeRsvp,
  makeCohostInvite,
  tokenFor,
  expiredTokenFor,
  as,
  waitFor,
};
