require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-to-a-random-secret';

module.exports = { PORT, JWT_SECRET };
