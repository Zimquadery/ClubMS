const express = require('express');
const authController = require('./auth.controller');
const { authMiddleware } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { register: registerSchema, login: loginSchema, updateProfile: updateProfileSchema, changePassword: changePasswordSchema } = require('./auth.schemas');

const router = express.Router();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, phone]
 *             properties:
 *               name: { type: string, minLength: 1, maxLength: 100 }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 6 }
 *               phone: { type: string, pattern: '^\\+?\\d{6,15}$' }
 *     responses:
 *       201:
 *         description: User registered
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email already exists
 */
router.post('/register', validate(registerSchema), authController.register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 6 }
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', validate(loginSchema), authController.login);

/**
 * @openapi
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user
 *     responses:
 *       200:
 *         description: Current user data
 *       401:
 *         description: Unauthorized
 */
router.get('/me', authMiddleware, authController.getMe);

/**
 * @openapi
 * /auth/profile:
 *   patch:
 *     tags: [Auth]
 *     summary: Update profile
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, minLength: 1, maxLength: 100 }
 *               email: { type: string, format: email }
 *               phone: { type: string, pattern: '^\\+?\\d{6,15}$' }
 *     responses:
 *       200:
 *         description: Profile updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Email already taken
 */
router.patch('/profile', authMiddleware, validate(updateProfileSchema), authController.updateProfile);

/**
 * @openapi
 * /auth/password:
 *   patch:
 *     tags: [Auth]
 *     summary: Change password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string, minLength: 6 }
 *               newPassword: { type: string, minLength: 6 }
 *     responses:
 *       200:
 *         description: Password changed
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized or wrong current password
 */
router.patch('/password', authMiddleware, validate(changePasswordSchema), authController.changePassword);

module.exports = router;
