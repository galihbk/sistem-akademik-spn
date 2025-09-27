const pool = require('../db/pool');

async function listSiswa({ q = '', limit = 20, offset = 0 }) {
  // cari nama LIKE case-insensitive; kalau q kosong → semua
  const params = [];
  let where = '1=1';
  if (q) { params.push(`%${q}%`); where = `LOWER(nama) LIKE LOWER($${params.length})`; }

  params.push(limit);  const pLimit = `$${params.length}`;
  params.push(offset); const pOffset = `$${params.length}`;

  const sql = `
    SELECT id, nisn, nik, nama, ttl, alamat
    FROM siswa
    WHERE ${where}
    ORDER BY nama ASC
    LIMIT ${pLimit} OFFSET ${pOffset}
  `;
  const sqlCount = `SELECT COUNT(*)::int AS total FROM siswa WHERE ${where}`;

  const [rowsRes, countRes] = await Promise.all([
    pool.query(sql, params),
    pool.query(sqlCount, params.slice(0, q ? 1 : 0)) // kalau q ada → 1 param, kalau tidak → 0
  ]);

  return { rows: rowsRes.rows, total: countRes.rows[0].total };
}

async function getSiswaById(id) {
  const r = await pool.query(
    `SELECT id, nisn, nik, nama, ttl, alamat, created_at, updated_at
     FROM siswa WHERE id = $1`, [id]
  );
  return r.rows[0] || null;
}

module.exports = { listSiswa, getSiswaById };
