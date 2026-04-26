const express = require('express');
const cors = require('cors');
const { PORT } = require('./config/env');
const { errorHandler } = require('./utils/errors');
const authRoutes = require('./modules/auth/auth.routes');
const clubRoutes = require('./modules/clubs/clubs.routes');
const eventsRoutes = require('./modules/events/events.routes');
const { router: membershipsRoutes, adminRouter: membershipsAdminRouter } = require('./modules/memberships/memberships.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
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
