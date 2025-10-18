// src/controllers/stats.controller.js
const pool = require("../db/pool");

const TREND_DAYS = 7;

function sanitizeAngkatan(val) {
  if (typeof val !== "string") return null;
  const v = val.trim();
  return v.length ? v : null;
}

function sanitizeJenis(val) {
  if (typeof val !== "string") return null;
  const v = val.trim();
  return v.length ? v : null;
}

async function summary(req, res) {
  try {
    const qAngkatan = sanitizeAngkatan(req.query.angkatan);
    const qJenis = sanitizeJenis(req.query.jenis || req.query.jenis_pendidikan);

    // ===== WHERE dinamis untuk tabel siswa =====
    const ws = [];
    const wp = [];
    if (qAngkatan) {
      ws.push(
        `LOWER(COALESCE(NULLIF(TRIM(kelompok_angkatan), ''), '')) = LOWER($${
          wp.length + 1
        })`
      );
      wp.push(qAngkatan);
    }
    if (qJenis) {
      ws.push(
        `LOWER(COALESCE(NULLIF(TRIM(jenis_pendidikan), ''), '')) = LOWER($${
          wp.length + 1
        })`
      );
      wp.push(qJenis);
    }
    const whereSiswa = ws.length ? `WHERE ${ws.join(" AND ")}` : "";

    // ===== total siswa & tanpa foto =====
    const { rows: rSiswa } = await pool.query(
      `
      SELECT
        COUNT(*)::int AS total,
        SUM(CASE WHEN COALESCE(NULLIF(TRIM(foto),''),'') = '' THEN 1 ELSE 0 END)::int AS no_foto
      FROM siswa
      ${whereSiswa}
      `,
      wp
    );

    // ===== distribusi angkatan =====
    const { rows: rAngkatan } = await pool.query(
      `
      WITH src AS (
        SELECT * FROM siswa
        ${whereSiswa}
      )
      SELECT
        COALESCE(NULLIF(TRIM(kelompok_angkatan),''), '(Tidak diisi)') AS angkatan,
        COUNT(*)::int AS total
      FROM src
      GROUP BY 1
      ORDER BY
        CASE
          WHEN COALESCE(NULLIF(TRIM(kelompok_angkatan),''), '(Tidak diisi)') = '(Tidak diisi)' THEN 1
          ELSE 0
        END,
        COALESCE(NULLIF(TRIM(kelompok_angkatan),''), '(Tidak diisi)')
      `,
      wp
    );

    // ===== total PDF BK & Pelanggaran (filter via siswa) =====
    const pdfParams = [];
    const conds = [];
    if (qAngkatan) {
      pdfParams.push(qAngkatan);
      conds.push(
        `LOWER(COALESCE(NULLIF(TRIM(s.kelompok_angkatan),''), '')) = LOWER($${pdfParams.length})`
      );
    }
    if (qJenis) {
      pdfParams.push(qJenis);
      conds.push(
        `LOWER(COALESCE(NULLIF(TRIM(s.jenis_pendidikan),''), '')) = LOWER($${pdfParams.length})`
      );
    }
    const existsS = conds.length ? ` AND ${conds.join(" AND ")}` : "";
    const pdfWhereBk = `WHERE EXISTS (SELECT 1 FROM siswa s WHERE s.id=bk.siswa_id${existsS})`;
    const pdfWherePel = `WHERE EXISTS (SELECT 1 FROM siswa s WHERE s.id=pelanggaran.siswa_id${existsS})`;

    const [{ rows: rBk }, { rows: rPel }] = await Promise.all([
      pool.query(
        `SELECT COUNT(*)::int AS total FROM bk ${pdfWhereBk}`,
        pdfParams
      ),
      pool.query(
        `SELECT COUNT(*)::int AS total FROM pelanggaran ${pdfWherePel}`,
        pdfParams
      ),
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

    // ===== tren 7 hari (hormati filter) =====
    const trendParams = [];
    const trendConds = [];
    if (qAngkatan) {
      trendParams.push(qAngkatan);
      trendConds.push(
        `LOWER(COALESCE(NULLIF(TRIM(s.kelompok_angkatan), ''), '')) = LOWER($${trendParams.length})`
      );
    }
    if (qJenis) {
      trendParams.push(qJenis);
      trendConds.push(
        `LOWER(COALESCE(NULLIF(TRIM(s.jenis_pendidikan), ''), '')) = LOWER($${trendParams.length})`
      );
    }
    const trendWhere = trendConds.length
      ? `AND ${trendConds.join(" AND ")}`
      : "";

    const { rows: rTrend } = await pool.query(
      `
      WITH days AS (
        SELECT generate_series(
          date_trunc('day', NOW()) - INTERVAL '${TREND_DAYS - 1} day',
          date_trunc('day', NOW() ),
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

    // ===== ringkasan PDF 30 hari terakhir =====
    const pdf30Params = [];
    const pdf30Conds = [];
    if (qAngkatan) {
      pdf30Params.push(qAngkatan);
      pdf30Conds.push(
        `LOWER(COALESCE(NULLIF(TRIM(s.kelompok_angkatan),''), '')) = LOWER($${pdf30Params.length})`
      );
    }
    if (qJenis) {
      pdf30Params.push(qJenis);
      pdf30Conds.push(
        `LOWER(COALESCE(NULLIF(TRIM(s.jenis_pendidikan),''), '')) = LOWER($${pdf30Params.length})`
      );
    }
    const condExpr = pdf30Conds.length
      ? ` AND ${pdf30Conds.join(" AND ")}`
      : "";

    const { rows: rPdf30 } = await pool.query(
      `
      SELECT 'bk' AS tipe, COUNT(*)::int AS total
      FROM bk
      WHERE created_at >= NOW() - INTERVAL '30 day'
        AND EXISTS (SELECT 1 FROM siswa s WHERE s.id=bk.siswa_id${condExpr})
      UNION ALL
      SELECT 'pelanggaran' AS tipe, COUNT(*)::int AS total
      FROM pelanggaran
      WHERE created_at >= NOW() - INTERVAL '30 day'
        AND EXISTS (SELECT 1 FROM siswa s WHERE s.id=pelanggaran.siswa_id${condExpr})
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
      server_status: "Online",
    });
  } catch (e) {
    console.error("[stats.summary]", e);
    res.status(500).json({ message: "Failed to get summary" });
  }
}

async function recentActivity(req, res) {
  try {
    const rows = (
      await pool.query(
        `
        SELECT id, admin, aksi, target, hasil, created_at
        FROM audit_log
        ORDER BY created_at DESC
        LIMIT 10
        `
      )
    ).rows;
    res.json({ items: rows });
  } catch (e) {
    console.error("[stats.recent]", e);
    res.status(500).json({ message: "Failed to get activity" });
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
    console.error("[stats.latestLogs]", e);
    res.status(500).json({ error: "Gagal ambil log terbaru" });
  }
}

module.exports = { summary, recentActivity, latestLogs };
