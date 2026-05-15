const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const pinoHttp = require('pino-http');
const { PORT, FRONTEND_URL } = require('./config/env');
const { errorHandler } = require('./utils/errors');
const { logger } = require('./lib/logger');
const authRoutes = require('./modules/auth/auth.routes');
const clubRoutes = require('./modules/clubs/clubs.routes');
const eventsRoutes = require('./modules/events/events.routes');
const rsvpRoutes = require('./modules/rsvp/rsvp.routes');
const { router: membershipsRoutes, adminRouter: membershipsAdminRouter } = require('./modules/memberships/memberships.routes');
const statsRoutes = require('./modules/stats/stats.routes');
const uploadRoutes = require('./modules/upload/upload.routes');
const auditRoutes = require('./modules/audit/audit.routes');
const { router: announcementsRoutes, recentRouter: announcementsRecentRouter } = require('./modules/announcements/announcements.routes');
const swaggerUi = require('swagger-ui-express');
const { specs } = require('./config/swagger');
const { prisma } = require('./lib/prisma');

const app = express();

app.use(helmet());
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));
app.use(express.json({ limit: '10kb' }));
app.use(pinoHttp({ logger }));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { message: 'Too many requests, please try again later' } });
const generalLimiter = rateLimit({ windowMs: 60 * 1000, max: 100, message: { message: 'Too many requests, please try again later' } });

app.use('/api/auth', authLimiter);
app.use('/api', generalLimiter);

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', db: 'connected' });
  } catch {
    res.status(503).json({ status: 'error', db: 'disconnected' });
  }
});

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/clubs', clubRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/events', rsvpRoutes);
app.use('/api/clubs', announcementsRoutes);
app.use('/api/clubs', membershipsRoutes);
app.use('/api/memberships', membershipsAdminRouter);
app.use('/api/stats', statsRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/announcements', announcementsRecentRouter);
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(specs));

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Server running');
});
