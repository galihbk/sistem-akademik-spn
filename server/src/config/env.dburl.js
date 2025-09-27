const { ADMIN_USER, ADMIN_PASS_PLAIN, ADMIN_PASS_HASH, JWT_SECRET, PORT } = require('./env');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.warn('[db] DATABASE_URL not set. Please set in server/.env');
}

module.exports = { ADMIN_USER, ADMIN_PASS_PLAIN, ADMIN_PASS_HASH, JWT_SECRET, PORT, DATABASE_URL };
