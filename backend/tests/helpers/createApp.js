const express = require('express');
const { errorHandler } = require('../../src/utils/errors');
const authRoutes = require('../../src/modules/auth/auth.routes');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
