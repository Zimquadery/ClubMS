const authService = require('./auth.service');

async function register(req, res, next) {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      const { AppError } = require('../../utils/errors');
      throw new AppError('Missing required fields', 400);
    }

    const user = await authService.register(email, password, name);
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      const { AppError } = require('../../utils/errors');
      throw new AppError('Missing required fields', 400);
    }

    const result = await authService.login(email, password);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const user = await authService.getMe(req.user.userId);
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, getMe };
