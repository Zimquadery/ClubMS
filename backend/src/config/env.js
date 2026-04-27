require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });

const PORT = process.env.PORT || 4000;
if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET environment variable is required');
const JWT_SECRET = process.env.JWT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

module.exports = { PORT, JWT_SECRET, FRONTEND_URL };
