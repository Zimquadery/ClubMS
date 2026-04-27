const express = require('express');
const authController = require('./auth.controller');
const { authMiddleware } = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { register: registerSchema, login: loginSchema, updateProfile: updateProfileSchema, changePassword: changePasswordSchema } = require('./auth.schemas');

const router = express.Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.get('/me', authMiddleware, authController.getMe);
router.patch('/profile', authMiddleware, validate(updateProfileSchema), authController.updateProfile);
router.patch('/password', authMiddleware, validate(changePasswordSchema), authController.changePassword);

module.exports = router;
