const { z } = require('zod');

const phoneField = z.string().trim().regex(/^\+?\d{6,15}$/, 'Phone must be 6-15 digits, optionally starting with +');
const studentIdField = z.string().trim().regex(/^[0-9]{1,8}$/, 'Student ID must be 1-8 digits');

const register = z.object({
  email: z.string().email('Invalid email format').max(255),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
  name: z.string().min(1, 'Name is required').max(100),
  phone: phoneField,
  studentId: studentIdField,
});

const login = z.object({
  email: z.string().email('Invalid email format').max(255),
  password: z.string().min(1, 'Password is required').max(128),
});

const updateProfile = z.object({
  name: z.string().min(1, 'Name is required').max(100).optional(),
  email: z.string().email('Invalid email format').max(255).optional(),
  phone: phoneField.optional(),
  studentId: studentIdField.optional(),
  idCardUrl: z.string().max(500).regex(/^\/uploads\/[^\s]+$/, 'ID card must be an uploaded image').optional(),
  department: z.string().trim().min(1, 'Department cannot be empty').max(100, 'Department must be at most 100 characters').nullable().optional(),
  homeDistrict: z.string().trim().min(1, 'Home district cannot be empty').max(100, 'Home district must be at most 100 characters').nullable().optional(),
});

const changePassword = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters').max(128),
});

module.exports = { register, login, updateProfile, changePassword };
