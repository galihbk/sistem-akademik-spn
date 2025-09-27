const { Pool } = require('pg');
const { DATABASE_URL } = require('../config/env.dburl');

module.exports = new Pool({
  connectionString: DATABASE_URL,
  // ssl: { rejectUnauthorized: false } // kalau nanti butuh SSL (prod)
});
