const authService = require('./auth.service');
const { asyncHandler } = require('../../utils/asyncHandler');
const { AppError } = require('../../utils/errors');

const register = asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) throw new AppError('Missing required fields', 400);
  const user = await authService.register(email, password, name);
  res.status(201).json(user);
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new AppError('Missing required fields', 400);
  const result = await authService.login(email, password);
  res.status(200).json(result);
});

const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user.userId);
  res.status(200).json(user);
});

module.exports = { register, login, getMe };
