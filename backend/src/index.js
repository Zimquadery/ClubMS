const express = require('express');
const cors = require('cors');
const { PORT } = require('./config/env');
const { errorHandler } = require('./utils/errors');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
