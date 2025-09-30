// src/controllers/ref.controller.js
const pool = require("../db/pool");

// DISTINCT angkatan dari kolom 'kelompok_angkatan' + urut angka lebih dulu (53 < 100 < A-01)
async function listAngkatan(_req, res) {
  try {
    const sql = `
      SELECT angkatan
      FROM (
        SELECT DISTINCT TRIM(kelompok_angkatan) AS angkatan
        FROM siswa
        WHERE kelompok_angkatan IS NOT NULL
          AND TRIM(kelompok_angkatan) <> ''
      ) AS t
      ORDER BY
        CASE WHEN angkatan ~ '^[0-9]+$'
             THEN LPAD(angkatan, 10, '0')
             ELSE angkatan
        END
    `;
    const { rows } = await pool.query(sql);
    res.json({ items: rows.map((r) => r.angkatan) });
  } catch (e) {
    console.error("[ref.listAngkatan] error:", e);
    res.status(500).json({ message: "Gagal mengambil daftar angkatan" });
  }
}

module.exports = { listAngkatan };
