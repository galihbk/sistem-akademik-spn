// src/controllers/siswa.controller.js
const path = require("path");
const fs = require("fs/promises");
const pool = require("../db/pool");

// =====================================================
// Konstanta VIEW
// =====================================================
const TABLE_JASMANI_LABEL = "v_jasmani_itemized";
const TABLE_JASMANI_IDENT = "v_jasmani_itemized";

// ======================== UTIL DB =====================

/** Cek objek ada (table / view / matview) */
async function schemaHasTable(schema, tableLabel) {
  const q = `
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = $1
      AND c.relname = $2
      AND c.relkind IN ('r','v','m')
    LIMIT 1;
  `;
  const r = await pool.query(q, [schema, tableLabel]);
  return r.rowCount > 0;
}

/** Ambil daftar kolom + map lower->original (buat quoting yang aman) */
async function getTableColumns(schema, tableLabel) {
  const q = `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = $1 AND table_name = $2
  `;
  const r = await pool.query(q, [schema, tableLabel]);
  const cols = r.rows.map((x) => x.column_name);
  const lowerMap = new Map(cols.map((c) => [c.toLowerCase(), c]));
  return { cols, lowerMap };
}

/** Helper: ambil siswa_id by NIK */
async function getSiswaIdByNik(nik) {
  const r = await pool.query(`SELECT id FROM siswa WHERE nik = $1 LIMIT 1`, [
    nik,
  ]);
  return r.rowCount ? r.rows[0].id : null;
}

/**
 * Ambil baris by NIK dengan prioritas (util lama untuk tabel2 lain):
 *   1) "siswa_id" = id siswa (exact)
 *   2) "nik" = nik (case/trim-insensitive)
 *   3) "siswa_nik" = nik (case/trim-insensitive)
 *   4) "nosis" = nosis siswa (case/trim-insensitive)
 */
async function smartRowsByNik(nik, opt) {
  const { schema = "public", tableLabel, tableIdent } = opt;

  const exists = await schemaHasTable(schema, tableLabel);
  if (!exists) return [];

  const { lowerMap } = await getTableColumns(schema, tableLabel);
  const has = (name) => lowerMap.has(String(name).toLowerCase());
  const col = (name) => `"${lowerMap.get(String(name).toLowerCase())}"`;

  const orderCandidate = [
    "created_at",
    "updated_at",
    "tanggal",
    "tgl",
    "createdAt",
    "updatedAt",
    "id",
  ].find((c) => has(c));
  const orderSql = orderCandidate
    ? ` ORDER BY ${col(orderCandidate)} NULLS LAST${
        has("id") && orderCandidate !== "id" ? `, ${col("id")}` : ""
      }`
    : "";

  const siswaId = await getSiswaIdByNik(nik);
  let nosisByNik = null;
  if (siswaId) {
    const rs = await pool.query(
      `SELECT nosis FROM siswa WHERE id = $1 LIMIT 1`,
      [siswaId]
    );
    nosisByNik = rs.rowCount ? rs.rows[0].nosis : null;
  }

  async function tryWhereExact(colName, value) {
    if (!has(colName) || value == null) return null;
    const sql = `SELECT * FROM ${tableIdent} WHERE ${col(
      colName
    )} = $1${orderSql};`;
    const r = await pool.query(sql, [value]);
    return r.rowCount ? r.rows : null;
  }
  async function tryWhereInsensitive(colName, value) {
    if (!has(colName) || value == null) return null;
    const sql = `SELECT * FROM ${tableIdent}
                 WHERE TRIM(LOWER(${col(
                   colName
                 )})) = TRIM(LOWER($1))${orderSql};`;
    const r = await pool.query(sql, [String(value)]);
    return r.rowCount ? r.rows : null;
  }

  if (siswaId) {
    const r1 = await tryWhereExact("siswa_id", siswaId);
    if (r1) return r1;
  }
  const r2 = await tryWhereInsensitive("nik", nik);
  if (r2) return r2;

  const r3 = await tryWhereInsensitive("siswa_nik", nik);
  if (r3) return r3;

  if (nosisByNik) {
    const r4 = await tryWhereInsensitive("nosis", nosisByNik);
    if (r4) return r4;
  }

  return [];
}

// ================= HANDLER LIST/DETAIL SISWA ================

/** GET /siswa */
async function list(req, res) {
  try {
    const q = (req.query.q || "").trim().toLowerCase();
    const angkatan = (req.query.angkatan || "").trim();
    const jenis = (req.query.jenis || req.query.jenis_pendidikan || "").trim(); // <== TAMBAH: jenis pendidikan
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

    const params = [];
    let where = "WHERE 1=1";

    if (q) {
      params.push(`%${q}%`);
      where += ` AND (LOWER(nama) LIKE $${params.length} OR LOWER(nosis) LIKE $${params.length})`;
    }
    if (angkatan) {
      params.push(angkatan);
      where += ` AND TRIM(kelompok_angkatan) = TRIM($${params.length})`;
    }
    if (jenis) {
      params.push(jenis);
      where += ` AND TRIM(COALESCE(jenis_pendidikan,'')) = TRIM($${params.length})`; // <== TAMBAH: filter jenis_pendidikan
    }

    const sqlData = `
      SELECT id, nosis, nama, kelompok_angkatan, nik
      FROM siswa
      ${where}
      ORDER BY ${sortBy} ${sortDir}
      LIMIT ${limit} OFFSET ${offset};
    `;
    const sqlCount = `SELECT COUNT(*)::int AS total FROM siswa ${where};`;

    const [data, count] = await Promise.all([
      pool.query(sqlData, params),
      pool.query(sqlCount, params),
    ]);

    res.json({
      items: data.rows,
      total: count.rows[0].total,
      page,
      limit,
      sort_by: sortBy,
      sort_dir: sortDir,
      q,
      angkatan,
      jenis, // echo
    });
  } catch (e) {
    console.error("[siswa.list]", e);
    res.status(500).json({ message: "Gagal mengambil data siswa" });
  }
}

/** GET /siswa/nik/:nik */
async function detailByNik(req, res) {
  try {
    const { nik } = req.params;
    const r = await pool.query(`SELECT * FROM siswa WHERE nik = $1 LIMIT 1`, [
      nik,
    ]);
    if (r.rowCount === 0)
      return res.status(404).json({ message: "Siswa tidak ditemukan" });
    res.json(r.rows[0]);
  } catch (e) {
    console.error("[siswa.detailByNik]", e);
    res.status(500).json({ message: "Gagal mengambil detail siswa" });
  }
}

/** (Legacy) GET /siswa/nosis/:nosis */
async function detailByNosis(req, res) {
  try {
    const { nosis } = req.params;
    const r = await pool.query(`SELECT * FROM siswa WHERE nosis = $1 LIMIT 1`, [
      nosis,
    ]);
    if (r.rowCount === 0)
      return res.status(404).json({ message: "Siswa tidak ditemukan" });
    res.json(r.rows[0]);
  } catch (e) {
    console.error("[siswa.detailByNosis]", e);
    res.status(500).json({ message: "Gagal mengambil detail siswa" });
  }
}

// ================= RELASI (BY NIK) =================

async function sendRowsOrEmptyByNik_legacy(res, table, nik) {
  try {
    const chk = await pool.query(`SELECT to_regclass($1) AS tname`, [
      `public.${table}`,
    ]);
    if (!chk.rows[0].tname) return res.json([]);

    const siswaId = await getSiswaIdByNik(nik);
    if (!siswaId) return res.json([]);

    const { rows } = await pool.query(
      `SELECT * FROM ${table} WHERE siswa_id = $1 ORDER BY COALESCE(created_at, NOW()), id`,
      [siswaId]
    );
    return res.json(rows);
  } catch (e) {
    console.error(`[siswa.${table}]`, e.message);
    return res.json([]);
  }
}

async function listMental(req, res) {
  return sendRowsOrEmptyByNik_legacy(res, "mental", req.params.nik);
}
async function listBK(req, res) {
  return sendRowsOrEmptyByNik_legacy(res, "bk", req.params.nik);
}
async function listPelanggaran(req, res) {
  return sendRowsOrEmptyByNik_legacy(res, "pelanggaran", req.params.nik);
}
async function listMapel(req, res) {
  return sendRowsOrEmptyByNik_legacy(res, "mapel", req.params.nik);
}
async function listPrestasi(req, res) {
  return sendRowsOrEmptyByNik_legacy(res, "prestasi", req.params.nik);
}

/** GET /siswa/nik/:nik/jasmani
 *  Sumber utama: VIEW v_jasmani_itemized
 *  (…tetap seperti kode kamu)
 */
async function listJasmani(req, res) {
  try {
    const nik = (req.params.nik || "").trim();
    if (!nik) return res.json([]);

    const r = await pool.query(`SELECT id FROM siswa WHERE nik = $1 LIMIT 1`, [
      nik,
    ]);
    if (!r.rowCount) return res.json([]);
    const siswaId = r.rows[0].id;

    const chk = await pool.query(
      `SELECT to_regclass('public.v_jasmani_itemized') AS tname`
    );
    const hasView = !!chk.rows?.[0]?.tname;

    if (hasView) {
      try {
        const { rows } = await pool.query(
          `
          SELECT
            jasmani_spn_id,
            siswa_id,
            nosis,
            nama,
            kompi,
            pleton,
            tahap,
            item,
            nilai,
            kategori,
            keterangan,
            sumber_file,
            created_at,
            updated_at
          FROM v_jasmani_itemized
          WHERE siswa_id = $1
          ORDER BY COALESCE(updated_at, created_at) NULLS LAST, jasmani_spn_id, item
          `,
          [siswaId]
        );

        if (!rows.length) return res.json([]);

        const spnTime = new Map();
        for (const r of rows) {
          const t = r.updated_at || r.created_at || null;
          const ms = t ? new Date(t).getTime() : 0;
          const prev = spnTime.get(r.jasmani_spn_id) ?? -1;
          if (ms > prev) spnTime.set(r.jasmani_spn_id, ms);
        }

        const orderedSpn = Array.from(spnTime.entries())
          .sort((a, b) => a[1] - b[1])
          .map(([id]) => id);

        const autoTahap = new Map();
        orderedSpn.forEach((id, idx) => autoTahap.set(id, idx + 1));

        const out = rows.map((x) => {
          let tahap = x.tahap;
          if (
            tahap == null ||
            (typeof tahap === "number" && !Number.isFinite(tahap)) ||
            (typeof tahap === "string" && tahap.trim() === "")
          ) {
            tahap = autoTahap.get(x.jasmani_spn_id) || null;
          }
          return {
            ...x,
            tahap,
          };
        });

        return res.json(out);
      } catch (err) {
        console.error("[listJasmani:view-error]", err?.message || err);
      }
    }

    const q2 = await pool.query(
      `
      SELECT *
      FROM jasmani_spn
      WHERE siswa_id = $1
      ORDER BY COALESCE(updated_at, created_at) DESC, id DESC
      LIMIT 1
      `,
      [siswaId]
    );
    if (!q2.rowCount) return res.json([]);

    const j = q2.rows[0];
    const time = j.updated_at || j.created_at || null;
    const items = [
      {
        item: "Lari 12 Menit (TS)",
        nilai: j.lari_12_menit_ts,
        keterangan: j.keterangan,
      },
      {
        item: "Lari 12 Menit (RS)",
        nilai: j.lari_12_menit_rs,
        keterangan: j.keterangan,
      },
      { item: "Sit Up (TS)", nilai: j.sit_up_ts, keterangan: j.keterangan },
      { item: "Sit Up (RS)", nilai: j.sit_up_rs, keterangan: j.keterangan },
      {
        item: "Shuttle Run (TS)",
        nilai: j.shuttle_run_ts,
        keterangan: j.keterangan,
      },
      {
        item: "Shuttle Run (RS)",
        nilai: j.shuttle_run_rs,
        keterangan: j.keterangan,
      },
      { item: "Push Up (TS)", nilai: j.push_up_ts, keterangan: j.keterangan },
      { item: "Push Up (RS)", nilai: j.push_up_rs, keterangan: j.keterangan },
      { item: "Pull Up (TS)", nilai: j.pull_up_ts, keterangan: j.keterangan },
      { item: "Pull Up (RS)", nilai: j.pull_up_rs, keterangan: j.keterangan },
      { item: "Nilai Akhir", nilai: j.nilai_akhir, keterangan: j.keterangan },
    ].map((x) => ({
      ...x,
      siswa_id: siswaId,
      jasmani_spn_id: j.id,
      tahap: j.tahap ?? 1,
      created_at: time,
      updated_at: time,
    }));

    return res.json(items);
  } catch (e) {
    console.error("[listJasmaniByNik]", e);
    return res.json([]);
  }
}

/** GET /siswa/nik/:nik/jasmani_overview */
async function jasmaniOverviewByNik(req, res) {
  const client = req.app.get("db") || pool;
  const { nik } = req.params;

  try {
    const qSiswa = `
      SELECT
        s.id AS siswa_id,
        s.nik,
        s.nama,
        s.batalion,
        COALESCE(s.kelompok_angkatan, '')::text AS angkatan,
        COALESCE(s.ton, '')::text AS ton
      FROM siswa s
      WHERE s.nik = $1
      LIMIT 1
    `;
    const rSiswa = await client.query(qSiswa, [nik]);
    if (rSiswa.rowCount === 0) {
      return res.status(404).json({ message: "Siswa tidak ditemukan" });
    }
    const siswa = rSiswa.rows[0];

    const qRank = `
      WITH me AS (
        SELECT
          s.id AS siswa_id,
          s.nik,
          s.batalion,
          COALESCE(s.kelompok_angkatan, '')::text AS angkatan,
          COALESCE(s.ton, '')::text AS ton
        FROM siswa s
        WHERE s.nik = $1
        LIMIT 1
      ),
      same_angkatan AS (
        SELECT
          s.id AS siswa_id,
          s.nik,
          s.batalion,
          COALESCE(s.kelompok_angkatan, '')::text AS angkatan,
          COALESCE(s.ton, '')::text AS ton
        FROM siswa s
        JOIN me ON COALESCE(s.kelompok_angkatan,'') = me.angkatan
      ),
      latest_js_raw AS (
        SELECT DISTINCT ON (j.siswa_id)
          j.siswa_id,
          NULLIF(
            regexp_replace(COALESCE(j.nilai_akhir::text, ''), '[^0-9,\\.\\-]', '', 'g'),
            ''
          ) AS cleaned,
          COALESCE(j.updated_at, j.created_at) AS ts
        FROM jasmani_spn j
        JOIN same_angkatan sa ON sa.siswa_id = j.siswa_id
        ORDER BY j.siswa_id, COALESCE(j.updated_at, j.created_at) DESC, j.id DESC
      ),
      latest_js AS (
        SELECT
          siswa_id,
          CASE
            WHEN cleaned IS NOT NULL AND cleaned ~ '^-?[0-9]+([\\.,][0-9]+)?$'
              THEN REPLACE(cleaned, ',', '.')::double precision
            ELSE NULL::double precision
          END AS score,
          ts
        FROM latest_js_raw
      ),
      joined AS (
        SELECT
          sa.siswa_id,
          sa.nik,
          sa.batalion,
          sa.angkatan,
          UPPER(NULLIF(regexp_replace(sa.ton, '[^A-Za-z].*', ''), '')) AS kompi,
          UPPER(COALESCE(sa.ton, '')) AS pleton,
          lj.score
        FROM same_angkatan sa
        LEFT JOIN latest_js lj ON lj.siswa_id = sa.siswa_id
      ),
      ranked AS (
        SELECT
          *,
          RANK()  OVER (ORDER BY score DESC NULLS LAST)                                 AS r_global,
          COUNT(*) FILTER (WHERE score IS NOT NULL) OVER ()                              AS t_global,
          RANK()  OVER (PARTITION BY batalion            ORDER BY score DESC NULLS LAST) AS r_batalion,
          COUNT(*) FILTER (WHERE score IS NOT NULL) OVER (PARTITION BY batalion)         AS t_batalion,
          RANK()  OVER (PARTITION BY kompi               ORDER BY score DESC NULLS LAST) AS r_kompi,
          COUNT(*) FILTER (WHERE score IS NOT NULL) OVER (PARTITION BY kompi)            AS t_kompi,
          RANK()  OVER (PARTITION BY kompi, pleton       ORDER BY score DESC NULLS LAST) AS r_pleton,
          COUNT(*) FILTER (WHERE score IS NOT NULL) OVER (PARTITION BY kompi, pleton)    AS t_pleton
        FROM joined
      )
      SELECT *
      FROM ranked
      WHERE nik = (SELECT nik FROM me)
      LIMIT 1
    `;

    const rRank = await client.query(qRank, [nik]);
    const row = rRank.rows[0] || null;

    const kompi =
      row?.kompi ||
      (siswa.ton ? String(siswa.ton).slice(0, 1).toUpperCase() : null);
    const pleton =
      row?.pleton || (siswa.ton ? String(siswa.ton).toUpperCase() : null);

    const out = {
      angkatan: siswa.angkatan || null,
      batalion: siswa.batalion || null,
      kompi: kompi || null,
      pleton: pleton || null,
      rank: row
        ? {
            global: { pos: row.r_global ?? null, total: row.t_global ?? null },
            batalion: {
              pos: row.r_batalion ?? null,
              total: row.t_batalion ?? null,
            },
            kompi: { pos: row.r_kompi ?? null, total: row.t_kompi ?? null },
            pleton: { pos: row.r_pleton ?? null, total: row.t_pleton ?? null },
          }
        : {
            global: { pos: null, total: null },
            batalion: { pos: null, total: null },
            kompi: { pos: null, total: null },
            pleton: { pos: null, total: null },
          },
    };

    return res.json(out);
  } catch (err) {
    console.error("[siswa.jasmani_overview] error:", err);
    return res.status(500).json({ message: "Internal error" });
  }
}

async function listRiwayatKesehatan(req, res) {
  return sendRowsOrEmptyByNik_legacy(res, "riwayat_kesehatan", req.params.nik);
}

/** GET /siswa/nik/:nik/jasmani_polda */
async function listJasmaniPolda(req, res) {
  return sendRowsOrEmptyByNik_legacy(res, "jasmani_polda", req.params.nik);
}

// ============== RANKING (by NIK & by Pleton) ==============

/** Tetap: GET /ranking/mental/nik/:nik  */
async function rankMentalByNik(req, res) {
  console.log("test");
  const nikParam = (req.params.nik || "").trim();
  const angkatanOverride = (req.query.angkatan || "").trim();

  if (!nikParam) return res.status(400).json({ error: "NIK is required" });

  const qGet = `
    SELECT id, nama, nosis, nik, batalion, ton, kelompok_angkatan
    FROM siswa
    WHERE nik = $1
    LIMIT 1;
  `;
  try {
    const meQ = await pool.query(qGet, [nikParam]);
    if (!meQ.rows.length)
      return res.status(404).json({ error: "Siswa tidak ditemukan" });
    const me = meQ.rows[0];
    const angkatan = angkatanOverride || me.kelompok_angkatan;
    if (!angkatan) {
      return res.status(400).json({
        error:
          "Kelompok angkatan siswa tidak diketahui. Isi kolom kelompok_angkatan, atau tambahkan ?angkatan=....",
      });
    }

    const sql = `
      WITH base AS (
        SELECT
          s.id AS siswa_id,
          s.nik,
          s.nosis,
          s.nama,
          s.batalion,
          s.ton,
          s.kelompok_angkatan,
          UPPER(NULLIF(regexp_replace(s.ton, '[^A-Za-z].*', ''), '')) AS kompi,
          CASE
            WHEN regexp_replace(COALESCE(s.ton, ''), '[^0-9]+', '', 'g') <> ''
              THEN (regexp_replace(s.ton, '[^0-9]+', '', 'g'))::int
            ELSE NULL
          END AS pleton
        FROM siswa s
        WHERE s.kelompok_angkatan = $2
      ),
      mental_num AS (
        SELECT
          m.siswa_id,
          CASE
            WHEN regexp_replace(COALESCE(m.nilai, ''), ',', '.', 'g') ~ '^[0-9]+(\\.[0-9]+)?$'
              THEN regexp_replace(m.nilai, ',', '.', 'g')::numeric
            ELSE NULL::numeric
          END AS nilai_num
        FROM mental m
        JOIN base b ON b.siswa_id = m.siswa_id
      ),
      avg_mental AS (
        SELECT
          b.*,
          AVG(n.nilai_num) AS avg_nilai
        FROM base b
        LEFT JOIN mental_num n ON n.siswa_id = b.siswa_id
        GROUP BY b.siswa_id, b.nik, b.nosis, b.nama, b.batalion, b.ton, b.kelompok_angkatan, b.kompi, b.pleton
      ),
      ranked AS (
        SELECT
          *,
          COUNT(avg_nilai) FILTER (WHERE avg_nilai IS NOT NULL) OVER ()                           AS total_global,
          COUNT(avg_nilai) FILTER (WHERE avg_nilai IS NOT NULL) OVER (PARTITION BY batalion)      AS total_batalion,
          COUNT(avg_nilai) FILTER (WHERE avg_nilai IS NOT NULL) OVER (PARTITION BY kompi)         AS total_kompi,
          COUNT(avg_nilai) FILTER (WHERE avg_nilai IS NOT NULL) OVER (PARTITION BY kompi, pleton) AS total_pleton,

          CASE WHEN avg_nilai IS NOT NULL
               THEN RANK() OVER (ORDER BY avg_nilai DESC NULLS LAST)
               END AS rank_global,

          CASE WHEN avg_nilai IS NOT NULL
               THEN RANK() OVER (PARTITION BY batalion ORDER BY avg_nilai DESC NULLS LAST)
               END AS rank_batalion,

          CASE WHEN avg_nilai IS NOT NULL
               THEN RANK() OVER (PARTITION BY kompi ORDER BY avg_nilai DESC NULLS LAST)
               END AS rank_kompi,

          CASE WHEN avg_nilai IS NOT NULL
               THEN RANK() OVER (PARTITION BY kompi, pleton ORDER BY avg_nilai DESC NULLS LAST)
               END AS rank_pleton
        FROM avg_mental
      )
      SELECT
        nik, nosis, nama, batalion, ton, kelompok_angkatan,
        kompi, pleton, avg_nilai,
        rank_global,   total_global,
        rank_batalion, total_batalion,
        rank_kompi,    total_kompi,
        rank_pleton,   total_pleton
      FROM ranked
      WHERE nik = $1
      LIMIT 1;
    `;

    const { rows } = await pool.query(sql, [nikParam, angkatan]);
    if (!rows.length) {
      return res
        .status(404)
        .json({ error: "Siswa tidak ditemukan di angkatan tersebut" });
    }

    const r = rows[0];
    return res.json({
      nik: r.nik,
      nosis: r.nosis,
      nama: r.nama,
      batalion: r.batalion,
      ton: r.ton,
      angkatan,
      kompi: r.kompi,
      pleton: r.pleton,
      avg: r.avg_nilai,
      rank: {
        global: { pos: r.rank_global, total: r.total_global },
        batalion: { pos: r.rank_batalion, total: r.total_batalion },
        kompi: { pos: r.rank_kompi, total: r.total_kompi },
        pleton: { pos: r.rank_pleton, total: r.total_pleton },
      },
    });
  } catch (e) {
    console.error("[rankMentalByNik] error:", e);
    return res.status(500).json({ error: "Internal error" });
  }
}

/** GET /ranking/mental/pleton?angkatan=2025&kompi=A&pleton=1 */
async function rankMentalByPleton(req, res) {
  try {
    const angkatan = (req.query.angkatan || "").trim();
    const kompi = (req.query.kompi || "").trim().toUpperCase();
    const pleton = parseInt(req.query.pleton, 10);

    if (!angkatan || !kompi || !Number.isFinite(pleton)) {
      return res.status(400).json({ error: "angkatan, kompi, pleton wajib" });
    }

    const sql = `
      WITH base AS (
        SELECT
          s.id AS siswa_id,
          s.nik, s.nosis, s.nama,
          s.batalion, s.ton, s.kelompok_angkatan,
          UPPER(NULLIF(regexp_replace(s.ton, '[^A-Za-z].*', ''), '')) AS kompi,
          CASE
            WHEN regexp_replace(COALESCE(s.ton,''), '[^0-9]+', '', 'g') <> ''
              THEN (regexp_replace(s.ton, '[^0-9]+', '', 'g'))::int
            ELSE NULL
          END AS pleton
        FROM siswa s
        WHERE s.kelompok_angkatan = $1
      ),
      mental_num AS (
        SELECT
          m.siswa_id,
          CASE
            WHEN regexp_replace(COALESCE(m.nilai,''), ',', '.', 'g') ~ '^[0-9]+(\\.[0-9]+)?$'
              THEN regexp_replace(m.nilai, ',', '.', 'g')::numeric
            ELSE NULL::numeric
          END AS nilai_num
        FROM mental m
        JOIN base b ON b.siswa_id = m.siswa_id
      ),
      avg_mental AS (
        SELECT
          b.*,
          AVG(n.nilai_num) AS avg_nilai
        FROM base b
        LEFT JOIN mental_num n ON n.siswa_id = b.siswa_id
        GROUP BY b.siswa_id, b.nik, b.nosis, b.nama, b.batalion, b.ton, b.kelompok_angkatan, b.kompi, b.pleton
      )
      SELECT
        nik, nosis, nama, batalion, ton, kelompok_angkatan,
        kompi, pleton, avg_nilai,
        RANK() OVER (PARTITION BY kompi, pleton ORDER BY avg_nilai DESC NULLS LAST) AS rank_pleton
      FROM avg_mental
      WHERE kompi = $2 AND pleton = $3
      ORDER BY avg_nilai DESC NULLS LAST, nama ASC;
    `;

    const { rows } = await pool.query(sql, [angkatan, kompi, pleton]);
    return res.json({
      angkatan,
      kompi,
      pleton,
      total: rows.filter((r) => r.avg_nilai != null).length,
      items: rows,
    });
  } catch (e) {
    console.error("[rankMentalByPleton] error:", e);
    return res.status(500).json({ error: "Internal error" });
  }
}

// ===================== WRITE ======================

/** POST /siswa/upsert */
async function upsertByNik(req, res) {
  try {
    const payload = req.body || {};
    const { nik } = payload;
    if (!nik) return res.status(400).json({ message: "nik wajib diisi" });

    const allowed = [
      "nik",
      "nosis",
      "nama",
      "file_ktp",
      "alamat",
      "tempat_lahir",
      "tanggal_lahir",
      "umur",
      "agama",
      "jenis_kelamin",
      "email",
      "no_hp",
      "dikum_akhir",
      "jurusan",
      "jenis_pendidikan",
      "tb",
      "bb",
      "gol_darah",
      "no_bpjs",
      "sim_yang_dimiliki",
      "no_hp_keluarga",
      "nama_ayah_kandung",
      "nama_ibu_kandung",
      "pekerjaan_ayah_kandung",
      "pekerjaan_ibu_kandung",
      "asal_polda",
      "asal_polres",
      "kelompok_angkatan",
      "diktuk_awal",
      "tahun_diktuk",
      "personel",
      "ukuran_pakaian",
      "ukuran_celana",
      "ukuran_sepatu",
      "ukuran_tutup_kepala",
      "jenis_rekrutmen",
      "foto",
      "batalion",
      "ton",
    ];

    const cols = [];
    const vals = [];
    const sets = [];

    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(payload, key)) {
        cols.push(key);
        vals.push(payload[key]);
        sets.push(`${key} = EXCLUDED.${key}`);
      }
    }
    if (!cols.includes("nik")) {
      cols.unshift("nik");
      vals.unshift(nik);
      sets.unshift("nik = EXCLUDED.nik");
    }

    const colList = cols.map((c) => `"${c}"`).join(", ");
    const phList = vals.map((_, idx) => `$${idx + 1}`).join(", ");
    const setList = sets.join(", ");

    const sql = `
      INSERT INTO siswa (${colList})
      VALUES (${phList})
      ON CONFLICT (nik) DO UPDATE SET
        ${setList},
        updated_at = NOW()
      RETURNING *;
    `;
    const r = await pool.query(sql, vals);
    res.json({ message: "OK", data: r.rows[0] });
  } catch (e) {
    console.error("[siswa.upsertByNik]", e);
    res.status(500).json({ message: "Gagal menyimpan data siswa" });
  }
}

/** PATCH /siswa/nik/:nik */
async function updatePartialByNik(req, res) {
  try {
    const nikParam = (req.params.nik || "").trim();
    if (!nikParam) return res.status(400).json({ message: "NIK wajib diisi" });

    const allowed = [
      "nosis",
      "nama",
      "file_ktp",
      "alamat",
      "tempat_lahir",
      "tanggal_lahir",
      "umur",
      "agama",
      "jenis_kelamin",
      "email",
      "no_hp",
      "dikum_akhir",
      "jurusan",
      "jenis_pendidikan",
      "tb",
      "bb",
      "gol_darah",
      "no_bpjs",
      "sim_yang_dimiliki",
      "no_hp_keluarga",
      "nama_ayah_kandung",
      "nama_ibu_kandung",
      "pekerjaan_ayah_kandung",
      "pekerjaan_ibu_kandung",
      "asal_polda",
      "asal_polres",
      "kelompok_angkatan",
      "diktuk_awal",
      "tahun_diktuk",
      "personel",
      "ukuran_pakaian",
      "ukuran_celana",
      "ukuran_sepatu",
      "ukuran_tutup_kepala",
      "jenis_rekrutmen",
      "batalion",
      "ton",
    ];

    const body = req.body || {};
    const sets = [];
    const vals = [];
    let i = 1;

    for (const k of allowed) {
      if (Object.prototype.hasOwnProperty.call(body, k)) {
        sets.push(`"${k}" = $${i++}`);
        vals.push(body[k]);
      }
    }
    if (sets.length === 0) {
      return res
        .status(400)
        .json({ message: "Tidak ada kolom untuk diupdate" });
    }
    vals.push(nikParam);

    const sql = `
      UPDATE siswa
      SET ${sets.join(", ")}, updated_at = NOW()
      WHERE nik = $${i}
      RETURNING *;
    `;
    const r = await pool.query(sql, vals);
    if (r.rowCount === 0) {
      return res.status(404).json({ message: "Siswa tidak ditemukan" });
    }
    return res.json(r.rows[0]);
  } catch (e) {
    console.error("[siswa.updatePartialByNik]", e);
    return res.status(500).json({ message: "Gagal update data siswa" });
  }
}

/** POST /siswa/nik/:nik/foto */
async function ensureDir(p) {
  try {
    await fs.mkdir(p, { recursive: true });
  } catch {}
}
async function uploadFotoByNik(req, res) {
  try {
    const nikParam = (req.params.nik || "").trim();
    if (!nikParam) return res.status(400).json({ message: "NIK wajib diisi" });
    if (!req.file)
      return res.status(400).json({ message: "file 'foto' wajib ada" });

    const baseDir = path.join(process.cwd(), "uploads", "foto_siswa");
    await ensureDir(baseDir);

    const ext =
      path.extname(req.file.originalname || ".jpg").toLowerCase() || ".jpg";
    const safeExt = [".jpg", ".jpeg", ".png", ".webp"].includes(ext)
      ? ext
      : ".jpg";
    const filename = `${nikParam}-${Date.now()}${safeExt}`;
    const target = path.join(baseDir, filename);

    await fs.writeFile(target, req.file.buffer);

    const relativePath = `foto_siswa/${filename}`;
    const up = await pool.query(
      `UPDATE siswa SET foto = $1, updated_at = NOW() WHERE nik = $2 RETURNING *`,
      [relativePath, nikParam]
    );
    if (up.rowCount === 0) {
      return res.status(404).json({ message: "Siswa tidak ditemukan" });
    }
    return res.json({ message: "OK", foto: relativePath, data: up.rows[0] });
  } catch (e) {
    console.error("[siswa.uploadFotoByNik]", e);
    return res.status(500).json({ message: "Gagal upload foto" });
  }
}

// ================== EXPORT HANDLERS ==================
module.exports = {
  // list/detail
  list,
  detailByNik,
  detailByNosis,

  // relasi by nik
  listMental,
  listBK,
  listPelanggaran,
  listMapel,
  listPrestasi,
  listJasmani,
  listRiwayatKesehatan,
  listJasmaniPolda,

  // write
  upsertByNik,
  updatePartialByNik,
  uploadFotoByNik,

  // rank
  rankMentalByNik,
  rankMentalByPleton,
  jasmaniOverviewByNik,
};
