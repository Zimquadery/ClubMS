const membershipsService = require('./memberships.service');

async function requestJoin(req, res, next) {
  try {
    const membership = await membershipsService.requestJoin(req.params.clubId, req.user.userId);
    res.status(201).json(membership);
  } catch (err) {
    next(err);
  }
}

async function listMembers(req, res, next) {
  try {
    const { status } = req.query;
    const members = await membershipsService.listMembers(req.params.clubId, { status });
    res.status(200).json(members);
  } catch (err) {
    next(err);
  }
}

async function approve(req, res, next) {
  try {
    const membership = await membershipsService.approve(req.params.clubId, req.params.userId);
    res.status(200).json(membership);
  } catch (err) {
    next(err);
  }
}

async function reject(req, res, next) {
  try {
    const membership = await membershipsService.reject(req.params.clubId, req.params.userId);
    res.status(200).json(membership);
  } catch (err) {
    next(err);
  }
}

async function setAlumni(req, res, next) {
  try {
    const membership = await membershipsService.setAlumni(req.params.clubId, req.params.userId);
    res.status(200).json(membership);
  } catch (err) {
    next(err);
  }
}

async function transferAdmin(req, res, next) {
  try {
    const { newAdminId } = req.body;
    if (!newAdminId) {
      const { AppError } = require('../../utils/errors');
      throw new AppError('newAdminId is required', 400);
    }
    const result = await membershipsService.transferAdmin(req.params.clubId, req.user.userId, newAdminId);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function getAdminClubs(req, res, next) {
  try {
    const clubs = await membershipsService.getAdminClubs(req.user.userId);
    res.status(200).json(clubs);
  } catch (err) {
    next(err);
  }
}

module.exports = { requestJoin, listMembers, approve, reject, setAlumni, transferAdmin, getAdminClubs };
