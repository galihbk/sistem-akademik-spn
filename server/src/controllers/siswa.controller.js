const pool = require("../db/pool");

/**
 * GET /siswa?q=&page=1&limit=20&sort_by=nama|nik|nosis&sort_dir=asc|desc&angkatan=XXXX
 */
async function list(req, res) {
  try {
    const q = (req.query.q || "").trim().toLowerCase();
    const angkatan = (req.query.angkatan || "").trim(); // << tambah ini
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

    // << filter angkatan (pakai kolom kelompok_angkatan)
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
      angkatan, // << kembalikan untuk UI
    });
  } catch (e) {
    console.error("[siswa.list]", e);
    res.status(500).json({ message: "Gagal mengambil data siswa" });
  }
}

/**
 * GET /siswa/nik/:nik
 * Detail berbasis NIK (unik)
 */
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

/**
 * (Legacy) GET /siswa/nosis/:nosis
 * Hanya jika masih butuh endpoint lama.
 */
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

/** Helper: ambil siswa_id dari NIK */
async function getSiswaIdByNik(nik) {
  const r = await pool.query(`SELECT id FROM siswa WHERE nik = $1 LIMIT 1`, [
    nik,
  ]);
  return r.rowCount ? r.rows[0].id : null;
}

/** Helper: cek tabel ada */
async function tableExists(table) {
  const chk = await pool.query(`SELECT to_regclass($1) AS tname`, [
    `public.${table}`,
  ]);
  return !!chk.rows[0].tname;
}

/**
 * GET /siswa/nik/:nik/<table>
 * table ∈ { sosiometri | mental | bk | pelanggaran | mapel | prestasi | jasmani | riwayat_kesehatan }
 */
async function sendRowsOrEmptyByNik(res, table, nik) {
  try {
    if (!(await tableExists(table))) return res.json([]);
    const siswaId = await getSiswaIdByNik(nik);
    if (!siswaId) return res.json([]);

    // urut default: created_at kalau ada; fallback ke id
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

async function listSosiometri(req, res) {
  return sendRowsOrEmptyByNik(res, "sosiometri", req.params.nik);
}
async function listMental(req, res) {
  return sendRowsOrEmptyByNik(res, "mental", req.params.nik);
}
async function listBK(req, res) {
  return sendRowsOrEmptyByNik(res, "bk", req.params.nik);
}
async function listPelanggaran(req, res) {
  return sendRowsOrEmptyByNik(res, "pelanggaran", req.params.nik);
}
async function listMapel(req, res) {
  return sendRowsOrEmptyByNik(res, "mapel", req.params.nik);
}
async function listPrestasi(req, res) {
  return sendRowsOrEmptyByNik(res, "prestasi", req.params.nik);
}
async function listJasmani(req, res) {
  return sendRowsOrEmptyByNik(res, "jasmani", req.params.nik);
}
async function listRiwayatKesehatan(req, res) {
  return sendRowsOrEmptyByNik(res, "riwayat_kesehatan", req.params.nik);
}

/**
 * POST /siswa/upsert
 * Body minimal: { nik: "...", ...kolom lain... }
 * - Jika NIK ada → update kolom yang dikirim
 * - Jika belum ada → insert
 */
async function upsertByNik(req, res) {
  try {
    const payload = req.body || {};
    const { nik } = payload;
    if (!nik) return res.status(400).json({ message: "nik wajib diisi" });

    // Kolom yang diizinkan
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
      // pastikan nik ikut
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
async function rankMentalByNik(req, res) {
  console.log("test");
  const nikParam = (req.params.nik || "").trim();
  const angkatanOverride = (req.query.angkatan || "").trim();

  if (!nikParam) return res.status(400).json({ error: "NIK is required" });

  // 1) Ambil identitas siswa & angkatan (atau pakai override)
  const qGet = `
    SELECT id, nama, nosis, nik, batalion, ton, kelompok_angkatan
    FROM siswa
    WHERE nik = $1
    LIMIT 1;
  `;
  try {
    const meQ = await pool.query(qGet, [nikParam]);
    if (!meQ.rows.length) {
      return res.status(404).json({ error: "Siswa tidak ditemukan" });
    }
    const me = meQ.rows[0];
    const angkatan = angkatanOverride || me.kelompok_angkatan;
    if (!angkatan) {
      return res.status(400).json({
        error:
          "Kelompok angkatan siswa tidak diketahui. Isi kolom kelompok_angkatan, atau tambahkan ?angkatan=....",
      });
    }

    // 2) Hitung rata-rata nilai mental (numeric saja) & ranking dalam angkatan tsb
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
          UPPER(NULLIF(regexp_replace(s.ton, '[^A-Za-z].*', ''), '')) AS kompi,  -- huruf awal (A1 -> A)
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
      avg: r.avg_nilai, // numeric atau null
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
module.exports = {
  list,
  detailByNik,
  detailByNosis, // optional legacy
  listSosiometri,
  listMental,
  listBK,
  listPelanggaran,
  listMapel,
  listPrestasi,
  listJasmani,
  listRiwayatKesehatan,
  upsertByNik,
  rankMentalByNik,
};
