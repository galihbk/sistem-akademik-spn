// src/controllers/stats.controller.js
const pool = require('../db/pool');

const TREND_DAYS = 7;

function sanitizeAngkatan(val) {
  if (typeof val !== 'string') return null;
  const v = val.trim();
  return v.length ? v : null;
}

async function summary(req, res) {
  try {
    const qAngkatan = sanitizeAngkatan(req.query.angkatan);

    // ===== total siswa & tanpa foto (opsional filter angkatan) =====
    const whereSiswa = qAngkatan ? `WHERE COALESCE(NULLIF(TRIM(kelompok_angkatan), ''), '') = $1` : '';
    const { rows: rSiswa } = await pool.query(
      `
      SELECT
        COUNT(*)::int AS total,
        SUM(CASE WHEN COALESCE(NULLIF(TRIM(foto),''),'') = '' THEN 1 ELSE 0 END)::int AS no_foto
      FROM siswa
      ${whereSiswa}
      `,
      qAngkatan ? [qAngkatan] : []
    );

    // ===== distribusi angkatan (tanpa pakai alias di ORDER BY) =====
    const { rows: rAngkatan } = await pool.query(
      `
      SELECT
        COALESCE(NULLIF(TRIM(kelompok_angkatan),''), '(Tidak diisi)') AS angkatan,
        COUNT(*)::int AS total
      FROM siswa
      GROUP BY 1
      ORDER BY
        CASE
          WHEN COALESCE(NULLIF(TRIM(kelompok_angkatan),''), '(Tidak diisi)') = '(Tidak diisi)' THEN 1
          ELSE 0
        END,
        COALESCE(NULLIF(TRIM(kelompok_angkatan),''), '(Tidak diisi)')
      `
    );

    // ===== total PDF BK & Pelanggaran (opsional filter angkatan lewat relasi siswa) =====
    // Jika mau, join ke siswa agar bisa filter per angkatan
    const pdfParams = [];
    const pdfWhereBk = qAngkatan
      ? (pdfParams.push(qAngkatan), `WHERE EXISTS (SELECT 1 FROM siswa s WHERE s.id=bk.siswa_id AND COALESCE(NULLIF(TRIM(s.kelompok_angkatan),''), '') = $1)`)
      : '';
    const pdfWherePel = qAngkatan
      ? (pdfParams.push(qAngkatan), `WHERE EXISTS (SELECT 1 FROM siswa s WHERE s.id=pelanggaran.siswa_id AND COALESCE(NULLIF(TRIM(s.kelompok_angkatan),''), '') = $2)`)
      : '';

    const [{ rows: rBk }, { rows: rPel }] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS total FROM bk ${pdfWhereBk}`, pdfParams.length ? [pdfParams[0]] : []),
      pool.query(`SELECT COUNT(*)::int AS total FROM pelanggaran ${pdfWherePel}`, pdfParams.length === 2 ? [pdfParams[1]] : []),
    ]);

    // ===== info import terakhir =====
    const { rows: rLast } = await pool.query(`
      SELECT
        created_at,
        COALESCE((detail::jsonb ->> 'rows')::int, 0)  AS rows,
        COALESCE((detail::jsonb ->> 'ok')::int, 0)    AS ok,
        COALESCE((detail::jsonb ->> 'skip')::int, 0)  AS skip,
        COALESCE((detail::jsonb ->> 'fail')::int, 0)  AS fail
      FROM audit_log
      WHERE aksi = 'import_siswa'
      ORDER BY created_at DESC
      LIMIT 1
    `);

    // ===== tren 7 hari (siswa baru per hari, hormati filter angkatan) =====
    const trendParams = [];
    let trendWhere = '';
    if (qAngkatan) {
      trendParams.push(qAngkatan);
      trendWhere = `AND COALESCE(NULLIF(TRIM(s.kelompok_angkatan), ''), '') = $1`;
    }
    const { rows: rTrend } = await pool.query(
      `
      WITH days AS (
        SELECT generate_series(
          date_trunc('day', NOW()) - INTERVAL '${TREND_DAYS - 1} day',
          date_trunc('day', NOW()),
          '1 day'
        )::date AS d
      )
      SELECT
        to_char(d.d, 'YYYY-MM-DD') AS day,
        COALESCE((
          SELECT COUNT(*)::int
          FROM siswa s
          WHERE s.created_at::date = d.d
          ${trendWhere}
        ), 0) AS count
      FROM days d
      ORDER BY d.d
      `,
      trendParams
    );

    // ===== ringkasan PDF 30 hari terakhir (opsional filter angkatan) =====
    const pdf30Params = [];
    let subWhereBk = `created_at >= NOW() - INTERVAL '30 day'`;
    let subWherePel = `created_at >= NOW() - INTERVAL '30 day'`;
    if (qAngkatan) {
      pdf30Params.push(qAngkatan, qAngkatan);
      subWhereBk += ` AND EXISTS (SELECT 1 FROM siswa s WHERE s.id=bk.siswa_id AND COALESCE(NULLIF(TRIM(s.kelompok_angkatan),''), '') = $1)`;
      subWherePel += ` AND EXISTS (SELECT 1 FROM siswa s WHERE s.id=pelanggaran.siswa_id AND COALESCE(NULLIF(TRIM(s.kelompok_angkatan),''), '') = $2)`;
    }
    const { rows: rPdf30 } = await pool.query(
      `
      SELECT 'bk' AS tipe, COUNT(*)::int AS total
      FROM bk
      WHERE ${subWhereBk}
      UNION ALL
      SELECT 'pelanggaran' AS tipe, COUNT(*)::int AS total
      FROM pelanggaran
      WHERE ${subWherePel}
      `,
      pdf30Params
    );

    res.json({
      siswa_total: rSiswa[0]?.total ?? 0,
      siswa_no_foto: rSiswa[0]?.no_foto ?? 0,
      angkatan_dist: rAngkatan,
      bk_pdf_total: rBk[0]?.total ?? 0,
      pelanggaran_pdf_total: rPel[0]?.total ?? 0,
      last_import: rLast[0] || null,
      trend_7d: rTrend,
      pdf_last30: rPdf30,
      server_status: 'Online',
    });
  } catch (e) {
    console.error('[stats.summary]', e);
    res.status(500).json({ message: 'Failed to get summary' });
  }
}

async function recentActivity(req, res) {
  try {
    const qAngkatan = sanitizeAngkatan(req.query.angkatan);
    let rows;

    if (qAngkatan) {
      // Jika ingin filter aktivitas via target siswa, contoh sederhana:
      // (Anda bisa sesuaikan berdasarkan format kolom target/hasil)
      rows = (
        await pool.query(
          `
          SELECT id, admin, aksi, target, hasil, created_at
          FROM audit_log
          ORDER BY created_at DESC
          LIMIT 10
          `
        )
      ).rows;
    } else {
      rows = (
        await pool.query(
          `
          SELECT id, admin, aksi, target, hasil, created_at
          FROM audit_log
          ORDER BY created_at DESC
          LIMIT 10
          `
        )
      ).rows;
    }

    res.json({ items: rows });
  } catch (e) {
    console.error('[stats.recent]', e);
    res.status(500).json({ message: 'Failed to get activity' });
  }
}

async function latestLogs(_req, res) {
  try {
    const { rows } = await pool.query(
      `SELECT id, admin, aksi, target, hasil, created_at
       FROM audit_log
       ORDER BY created_at DESC
       LIMIT 5`
    );
    res.json(rows);
  } catch (e) {
    console.error('[stats.latestLogs]', e);
    res.status(500).json({ error: 'Gagal ambil log terbaru' });
  }
}

module.exports = { summary, recentActivity, latestLogs };
