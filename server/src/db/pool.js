// Pastikan env DATABASE_URL sudah di-set, contoh:
// postgres://sa_user:password@localhost:5432/sistem_akademik
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // ssl: { rejectUnauthorized: false } // aktifkan jika perlu (prod)
});

// Jaga-jaga: pakai schema public
pool.on("connect", (client) => {
  client.query("SET search_path TO public");
});

module.exports = pool;
