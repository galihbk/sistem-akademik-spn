// controllers/siswa.controller.js
const path = require("path");
const fs = require("fs/promises");
const pool = require("../db/pool");

// =====================================================
// JASMANI (biasa) ambil dari VIEW yang cocok dgn UI:
//   v_jasmani_itemized  (kolom: item, nilai, keterangan, created_at, ...)
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
 * Ambil baris by NIK dengan prioritas:
 *   1) "siswa_id" = id siswa (exact)
 *   2) "nik" = nik (case/trim-insensitive)
 *   3) "siswa_nik" = nik (case/trim-insensitive)
 *   4) "nosis" = nosis siswa (case/trim-insensitive)
 *
 * ORDER BY pakai kolom yang tersedia: created_at/updated_at/tanggal/tgl/id.
 */
async function smartRowsByNik(nik, opt) {
  const { schema = "public", tableLabel, tableIdent } = opt;

  // 0) pastikan objek ada
  const exists = await schemaHasTable(schema, tableLabel);
  if (!exists) return [];

  // 1) list kolom
  const { lowerMap } = await getTableColumns(schema, tableLabel);
  const has = (name) => lowerMap.has(String(name).toLowerCase());
  const col = (name) => `"${lowerMap.get(String(name).toLowerCase())}"`;

  // 2) ORDER BY
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

  // 3) ambil siswa_id & nosis dari master
  const siswaId = await getSiswaIdByNik(nik);
  let nosisByNik = null;
  if (siswaId) {
    const rs = await pool.query(
      `SELECT nosis FROM siswa WHERE id = $1 LIMIT 1`,
      [siswaId]
    );
    nosisByNik = rs.rowCount ? rs.rows[0].nosis : null;
  }

  // helper WHERE exact (untuk integer id) & insensitive (text)
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

  // 4) prioritas filter
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

/** GET /siswa/nik/:nik/jasmani  → dari VIEW v_jasmani_itemized */
async function listJasmani(req, res) {
  try {
    const nik = (req.params.nik || "").trim();
    if (!nik) return res.json([]);

    // 1) Cari siswa_id dari master siswa
    const r = await pool.query(`SELECT id FROM siswa WHERE nik = $1 LIMIT 1`, [
      nik,
    ]);
    if (!r.rowCount) return res.json([]); // siswa tidak ada
    const siswaId = r.rows[0].id;

    // 2) Gunakan view v_jasmani_itemized jika ada; kalau tidak, fallback ke jasmani_spn
    const chkView = await pool.query(
      `SELECT to_regclass('public.v_jasmani_itemized') AS tname`
    );
    const hasView = !!chkView.rows[0].tname;

    if (hasView) {
      const sql = `
        SELECT *
        FROM v_jasmani_itemized
        WHERE siswa_id = $1
        ORDER BY COALESCE(updated_at, created_at) NULLS LAST, jasmani_spn_id
      `;
      const { rows } = await pool.query(sql, [siswaId]);
      return res.json(rows);
    } else {
      // fallback: tabel jasmani_spn langsung
      const sql = `
        SELECT *
        FROM jasmani_spn
        WHERE siswa_id = $1
        ORDER BY COALESCE(updated_at, created_at) NULLS LAST, id
      `;
      const { rows } = await pool.query(sql, [siswaId]);
      return res.json(rows);
    }
  } catch (e) {
    console.error("[siswa.listJasmani(strict by siswa_id)]", e);
    return res.json([]);
  }
}

async function listRiwayatKesehatan(req, res) {
  return sendRowsOrEmptyByNik_legacy(res, "riwayat_kesehatan", req.params.nik);
}

/** GET /siswa/nik/:nik/jasmani_polda */
async function listJasmaniPolda(req, res) {
  return sendRowsOrEmptyByNik_legacy(res, "jasmani_polda", req.params.nik);
}

// ============== RANKING (tetap) ==============
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
            WHEN regexp_replace(s.ton, '\\D+', '', 'g') <> ''
              THEN (regexp_replace(s.ton, '\\D+', '', 'g'))::int
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
  listJasmani, // ← dari v_jasmani_itemized
  listRiwayatKesehatan,
  listJasmaniPolda,

  // write
  upsertByNik,
  updatePartialByNik,
  uploadFotoByNik,

  // rank
  rankMentalByNik,
};
