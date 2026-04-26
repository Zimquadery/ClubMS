const eventsService = require('./events.service');
const membershipsService = require('../memberships/memberships.service');
const { AppError } = require('../../utils/errors');

async function list(req, res, next) {
  try {
    const { clubId } = req.query;
    const joinedBool = req.query.joined === 'true';
    const userId = req.user.userId;

    const events = await eventsService.list({
      clubId: clubId || undefined,
      joined: joinedBool,
      userId,
    });

    res.status(200).json(events);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const { clubId } = req.params;
    const { title, description, startTime, endTime, location, bannerUrl } = req.body;

    if (req.user.role !== 'PLATFORM_ADMIN') {
      const isAdmin = await membershipsService.isClubAdmin(req.user.userId, clubId);
      if (!isAdmin) {
        throw new AppError('Not an admin of this club', 403);
      }
    }

    const event = await eventsService.create(clubId, {
      title,
      description,
      startTime,
      endTime,
      location,
      bannerUrl,
    });

    res.status(201).json(event);
  } catch (err) {
    next(err);
  }
}

async function deleteEvent(req, res, next) {
  try {
    const { id } = req.params;
    const isPlatformAdmin = req.user.role === 'PLATFORM_ADMIN';
    const result = await eventsService.remove(id, req.user.userId, isPlatformAdmin);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, deleteEvent };
