const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../../lib/prisma');
const { JWT_SECRET } = require('../../config/env');
const { AppError } = require('../../utils/errors');
const { saveUploadedImage } = require('../../lib/imageStore');

const SALT_ROUNDS = 10;
const JWT_EXPIRY = '24h';

async function register({ email, password, name, phone, studentId, idCardBuffer }) {
  email = email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError('Email already registered', 409);
  }

  const existingStudentId = await prisma.user.findUnique({ where: { studentId } });
  if (existingStudentId) {
    throw new AppError('Student ID already registered', 409);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const idCardUrl = await saveUploadedImage(idCardBuffer);

  const user = await prisma.user.create({
    data: { email, passwordHash, name, phone, studentId, idCardUrl, role: 'STUDENT' },
    select: { id: true, email: true, name: true, phone: true, studentId: true, idCardUrl: true, department: true, homeDistrict: true, role: true, createdAt: true, updatedAt: true },
  });

  return user;
}

async function login(email, password) {
  email = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AppError('Invalid credentials', 401);
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );

  const userWithoutPassword = {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    studentId: user.studentId,
    idCardUrl: user.idCardUrl,
    department: user.department,
    homeDistrict: user.homeDistrict,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  return { token, user: userWithoutPassword };
}

async function getMe(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, phone: true, studentId: true, idCardUrl: true, department: true, homeDistrict: true, role: true, createdAt: true, updatedAt: true },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return user;
}

async function updateProfile(userId, { name, email, phone, studentId, idCardUrl, department, homeDistrict }) {
  if (email) {
    email = email.toLowerCase().trim();
    const existing = await prisma.user.findFirst({ where: { email, id: { not: userId } } });
    if (existing) {
      throw new AppError('Email already in use', 409);
    }
  }

  if (studentId) {
    const existingStudentId = await prisma.user.findFirst({ where: { studentId, id: { not: userId } } });
    if (existingStudentId) {
      throw new AppError('Student ID already in use', 409);
    }
  }

  const data = {};
  if (name !== undefined) data.name = name;
  if (email !== undefined) data.email = email;
  if (phone !== undefined) data.phone = phone;
  if (studentId !== undefined) data.studentId = studentId;
  if (idCardUrl !== undefined) data.idCardUrl = idCardUrl;
  if (department !== undefined) data.department = department;
  if (homeDistrict !== undefined) data.homeDistrict = homeDistrict;

  if (Object.keys(data).length === 0) {
    throw new AppError('No fields to update', 400);
  }

  return prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, email: true, name: true, phone: true, studentId: true, idCardUrl: true, department: true, homeDistrict: true, role: true, createdAt: true, updatedAt: true },
  });
}

async function changePassword(userId, currentPassword, newPassword) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    throw new AppError('Current password is incorrect', 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  return { success: true };
}

module.exports = { register, login, getMe, updateProfile, changePassword };
