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
};
