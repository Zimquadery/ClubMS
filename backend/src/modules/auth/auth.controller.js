const authService = require('./auth.service');
const { asyncHandler } = require('../../utils/asyncHandler');

const register = asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;
  const user = await authService.register(email, password, name);
  res.status(201).json(user);
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);
  res.status(200).json(result);
});

const getMe = asyncHandler(async (req, res) => {
  const user = await authService.getMe(req.user.userId);
  res.status(200).json(user);
});

const updateProfile = asyncHandler(async (req, res) => {
  const user = await authService.updateProfile(req.user.userId, req.body);
  res.status(200).json(user);
});

const changePassword = asyncHandler(async (req, res) => {
  const result = await authService.changePassword(req.user.userId, req.body.currentPassword, req.body.newPassword);
  res.status(200).json(result);
});

module.exports = { register, login, getMe, updateProfile, changePassword };
