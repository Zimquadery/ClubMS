const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { PORT, FRONTEND_URL } = require('./config/env');
const { errorHandler } = require('./utils/errors');
const authRoutes = require('./modules/auth/auth.routes');
const clubRoutes = require('./modules/clubs/clubs.routes');
const eventsRoutes = require('./modules/events/events.routes');
const { router: membershipsRoutes, adminRouter: membershipsAdminRouter } = require('./modules/memberships/memberships.routes');
const { prisma } = require('./lib/prisma');

const app = express();

app.use(helmet());
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));
app.use(express.json({ limit: '10kb' }));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Too many requests, please try again later' } });
const generalLimiter = rateLimit({ windowMs: 60 * 1000, max: 100, message: { error: 'Too many requests, please try again later' } });

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

app.use('/api/auth', authRoutes);
app.use('/api/clubs', clubRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/clubs', membershipsRoutes);
app.use('/api/memberships', membershipsAdminRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
