const { createApp } = require('./app');
const { logger } = require('./lib/logger');
const { PORT } = require('./config/env');

const app = createApp();

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Server running');
});

module.exports = { app };
