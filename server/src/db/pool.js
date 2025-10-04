const { Pool } = require("pg");
require("dotenv").config(); // jika pakai .env

const hasUrl = !!process.env.DATABASE_URL;

const pool = hasUrl
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      // ssl: { rejectUnauthorized: false } // prod jika perlu
    })
  : new Pool({
      user: process.env.PGUSER || "sa_user",
      password: process.env.PGPASSWORD || "password",
      host: process.env.PGHOST || "localhost",
      port: Number(process.env.PGPORT || 5432),
      database: process.env.PGDATABASE || "sistem_akademik",
      // ssl: { rejectUnauthorized: false }
    });

pool.on("connect", (client) => {
  client.query("SET search_path TO public");
});

module.exports = pool;
