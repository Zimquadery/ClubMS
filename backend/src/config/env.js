require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const PORT = process.env.PORT || 4000;

module.exports = { PORT };
