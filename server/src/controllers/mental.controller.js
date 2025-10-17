// controllers/mental.controller.js
const pool = require("../db/pool");

async function rekap(req, res) {
  try {
    const q = (req.query.q || "").trim().toLowerCase();
    const angkatan = (req.query.angkatan || "").trim();
    const jenis = (req.query.jenis || req.query.jenis_pendidikan || "").trim();

    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit || "20", 10), 1),
      200
    );
    const offset = (page - 1) * limit;

    const sortBy = ["nama", "nosis"].includes(
      (req.query.sort_by || "").toLowerCase()
    )
      ? req.query.sort_by.toLowerCase()
      : "nama";
    const sortDir = ["asc", "desc"].includes(
      (req.query.sort_dir || "").toLowerCase()
    )
      ? req.query.sort_dir.toLowerCase()
      : "asc";

    // WHERE dinamis utk siswa (count + page CTE + weeks)
    const params = [];
    let where = "WHERE 1=1";
    if (q) {
      params.push(`%${q}%`);
      const idx = params.length;
      where += ` AND (LOWER(s.nama) LIKE $${idx} OR LOWER(s.nosis) LIKE $${idx})`;
    }

    let angkatanIdx = null;
    if (angkatan) {
      params.push(angkatan);
      angkatanIdx = params.length;
      where += ` AND TRIM(s.kelompok_angkatan) = TRIM($${angkatanIdx})`;
    }

    let jenisIdx = null;
    if (jenis) {
      params.push(jenis);
      jenisIdx = params.length;
      where += ` AND TRIM(COALESCE(s.jenis_pendidikan,'')) = TRIM($${jenisIdx})`;
    }

    // total siswa yang match
    const { rows: cntRows } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM siswa s ${where};`,
      params
    );
    const total = cntRows?.[0]?.total ?? 0;

    // page data
    const pageSql = `
      WITH match AS (
        SELECT
          s.id, s.nosis, s.nama, s.kelompok_angkatan,
          s.batalion, s.ton,
          UPPER(NULLIF(regexp_replace(s.ton, '[^A-Za-z].*', ''), '')) AS kompi,
          CASE WHEN regexp_replace(s.ton, '\\D+', '', 'g') <> ''
               THEN (regexp_replace(s.ton, '\\D+', '', 'g'))::int
               ELSE NULL END AS pleton
        FROM siswa s
        ${where}
        ORDER BY ${sortBy} ${sortDir}
        LIMIT ${limit} OFFSET ${offset}
      ),
      mental_num AS (
        SELECT
          m.siswa_id,
          m.minggu_ke,
          m.nilai,
          CASE
            WHEN regexp_replace(COALESCE(m.nilai, ''), ',', '.', 'g') ~ '^[0-9]+(\\.[0-9]+)?$'
              THEN regexp_replace(m.nilai, ',', '.', 'g')::numeric
            ELSE NULL::numeric
          END AS nilai_num
        FROM mental m
        JOIN match mm ON mm.id = m.siswa_id
      ),
      agg AS (
        SELECT
          mm.id, mm.nosis, mm.nama, mm.kelompok_angkatan,
          mm.batalion, mm.ton, mm.kompi, mm.pleton,
          COALESCE(SUM(n.nilai_num), 0)::numeric                      AS sum_num,
          AVG(n.nilai_num)                                            AS avg_num,
          COALESCE(
            jsonb_object_agg((n.minggu_ke)::text, n.nilai ORDER BY n.minggu_ke)
              FILTER (WHERE n.minggu_ke IS NOT NULL),
            '{}'::jsonb
          ) AS weeks
        FROM match mm
        LEFT JOIN mental_num n ON n.siswa_id = mm.id
        GROUP BY mm.id, mm.nosis, mm.nama, mm.kelompok_angkatan, mm.batalion, mm.ton, mm.kompi, mm.pleton
      ),
      -- basis ranking untuk 1 angkatan + jenis (opsional)
      base AS (
        SELECT
          s.id, s.batalion,
          UPPER(NULLIF(regexp_replace(s.ton, '[^A-Za-z].*', ''), '')) AS kompi,
          CASE WHEN regexp_replace(s.ton, '\\D+', '', 'g') <> ''
               THEN (regexp_replace(s.ton, '\\D+', '', 'g'))::int
               ELSE NULL END AS pleton,
          AVG(
            CASE
              WHEN regexp_replace(COALESCE(m.nilai, ''), ',', '.', 'g') ~ '^[0-9]+(\\.[0-9]+)?$'
                THEN regexp_replace(m.nilai, ',', '.', 'g')::numeric
              ELSE NULL::numeric
            END
          ) AS avg_all
        FROM siswa s
        LEFT JOIN mental m ON m.siswa_id = s.id
        ${
          angkatan || jenis
            ? `WHERE ${[
                angkatan
                  ? `TRIM(s.kelompok_angkatan) = TRIM($${angkatanIdx})`
                  : null,
                jenis
                  ? `TRIM(COALESCE(s.jenis_pendidikan,'')) = TRIM($${jenisIdx})`
                  : null,
              ]
                .filter(Boolean)
                .join(" AND ")}`
            : ""
        }
        GROUP BY s.id, s.batalion, s.ton
      ),
      ranked AS (
        SELECT
          b.*,
          COUNT(avg_all) FILTER (WHERE avg_all IS NOT NULL) OVER ()                           AS total_global,
          COUNT(avg_all) FILTER (WHERE avg_all IS NOT NULL) OVER (PARTITION BY batalion)      AS total_batalion,
          COUNT(avg_all) FILTER (WHERE avg_all IS NOT NULL) OVER (PARTITION BY kompi)         AS total_kompi,
          COUNT(avg_all) FILTER (WHERE avg_all IS NOT NULL) OVER (PARTITION BY kompi, pleton) AS total_pleton,
          (RANK() OVER (ORDER BY avg_all DESC NULLS LAST))                                     AS rank_global,
          (RANK() OVER (PARTITION BY batalion ORDER BY avg_all DESC NULLS LAST))               AS rank_batalion,
          (RANK() OVER (PARTITION BY kompi ORDER BY avg_all DESC NULLS LAST))                  AS rank_kompi,
          (RANK() OVER (PARTITION BY kompi, pleton ORDER BY avg_all DESC NULLS LAST))          AS rank_pleton
        FROM base b
      )
      SELECT
        a.*, (r.rank_global)::int   AS rank_global,   r.total_global,
            (r.rank_batalion)::int AS rank_batalion, r.total_batalion,
            (r.rank_kompi)::int    AS rank_kompi,    r.total_kompi,
            (r.rank_pleton)::int   AS rank_pleton,   r.total_pleton
      FROM agg a
      LEFT JOIN ranked r ON r.id = a.id
      ORDER BY ${sortBy} ${sortDir};
    `;

    const { rows } = await pool.query(pageSql, params);

    const items = rows.map((r) => ({
      nosis: r.nosis,
      nama: r.nama,
      kelompok_angkatan: r.kelompok_angkatan,
      batalion: r.batalion,
      ton: r.ton,
      kompi: r.kompi,
      pleton: r.pleton,
      sum: r.sum_num == null ? 0 : Number(r.sum_num),
      avg: r.avg_num == null ? null : Number(r.avg_num),
      rank: {
        global: { pos: r.rank_global ?? null, total: r.total_global ?? null },
        batalion: {
          pos: r.rank_batalion ?? null,
          total: r.total_batalion ?? null,
        },
        kompi: { pos: r.rank_kompi ?? null, total: r.total_kompi ?? null },
        pleton: { pos: r.rank_pleton ?? null, total: r.total_pleton ?? null },
      },
      weeks: r.weeks || {},
    }));

    // weeks ikut filter where (sudah mengandung q/angkatan/jenis)
    const weeksSql = `
      SELECT ARRAY(
        SELECT DISTINCT m.minggu_ke
        FROM mental m JOIN siswa s ON s.id = m.siswa_id
        ${where}
        ORDER BY m.minggu_ke
      ) AS weeks;`;
    const weeksArr = (await pool.query(weeksSql, params)).rows[0]?.weeks || [];

    res.json({
      items,
      total,
      page,
      limit,
      sort_by: sortBy,
      sort_dir: sortDir,
      q,
      angkatan,
      jenis,
      weeks: weeksArr,
    });
  } catch (e) {
    console.error("[mental.rekap] error:", e);
    res.status(500).json({ message: "Gagal mengambil rekap mental" });
  }
}

module.exports = { rekap };
