const pool = require('../db/pool');

// GET /siswa?q=&page=1&limit=20&sort_by=nama|nosis&sort_dir=asc|desc
async function list(req, res) {
  try {
    const q        = (req.query.q || '').trim().toLowerCase();
    const page     = Math.max(parseInt(req.query.page  || '1', 10), 1);
    const limit    = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 200);
    const offset   = (page - 1) * limit;

    // whitelist sorting
    const sortBy   = ['nama','nosis'].includes((req.query.sort_by||'').toLowerCase())
      ? req.query.sort_by.toLowerCase()
      : 'nama';
    const sortDir  = ['asc','desc'].includes((req.query.sort_dir||'').toLowerCase())
      ? req.query.sort_dir.toLowerCase()
      : 'asc';

    const params = [];
    let where = 'WHERE 1=1';
    if (q) {
      params.push(`%${q}%`);
      // cari di dua kolom
      where += ` AND (LOWER(nama) LIKE $${params.length} OR LOWER(nosis) LIKE $${params.length})`;
    }

    const sqlData  = `
      SELECT nosis, nama
      FROM siswa
      ${where}
      ORDER BY ${sortBy} ${sortDir}
      LIMIT ${limit} OFFSET ${offset};
    `;
    const sqlCount = `SELECT COUNT(*)::int AS total FROM siswa ${where};`;

    const [data, count] = await Promise.all([
      pool.query(sqlData, params),
      pool.query(sqlCount, params)
    ]);

    res.json({
      items: data.rows,
      total: count.rows[0].total,
      page, limit,
      sort_by: sortBy, sort_dir: sortDir, q
    });
  } catch (e) {
    console.error('[siswa.list]', e);
    res.status(500).json({ message: 'Gagal mengambil data siswa' });
  }
}

// GET /siswa/:nosis
async function detail(req, res) {
  try {
    const { nosis } = req.params;
    const r = await pool.query(`SELECT * FROM siswa WHERE nosis = $1 LIMIT 1`, [nosis]);
    if (r.rowCount === 0) return res.status(404).json({ message: 'Siswa tidak ditemukan' });
    res.json(r.rows[0]);
  } catch (e) {
    console.error('[siswa.detail]', e);
    res.status(500).json({ message: 'Gagal mengambil detail siswa' });
  }
}
async function listSosiometri(req, res)        { return sendRowsOrEmpty(res, 'sosiometri',        req.params.nosis); }
async function listMental(req, res)            { return sendRowsOrEmpty(res, 'mental',            req.params.nosis); }
async function listBK(req, res)                { return sendRowsOrEmpty(res, 'bk',                req.params.nosis); }
async function listPelanggaran(req, res)       { return sendRowsOrEmpty(res, 'pelanggaran',       req.params.nosis); }
async function listMapel(req, res)             { return sendRowsOrEmpty(res, 'mapel',             req.params.nosis); }
async function listPrestasi(req, res)          { return sendRowsOrEmpty(res, 'prestasi',          req.params.nosis); }
async function listJasmani(req, res)           { return sendRowsOrEmpty(res, 'jasmani',           req.params.nosis); }
async function listRiwayatKesehatan(req, res)  { return sendRowsOrEmpty(res, 'riwayat_kesehatan', req.params.nosis); }
async function sendRowsOrEmpty(res, table, nosis) {
  try {
    // cek tabel ada?
    const check = await pool.query(
      `SELECT to_regclass($1) AS tname`, [`public.${table}`]
    );
    if (!check.rows[0].tname) return res.json([]);

    // ambil data by nosis
    const { rows } = await pool.query(
      `SELECT * FROM ${table} WHERE nosis = $1 ORDER BY 1 ASC`, [nosis]
    );
    return res.json(rows);
  } catch (e) {
    // kalau error (mis. kolom tidak pas), jangan putus UI: kirim []
    console.error(`[siswa.${table}]`, e.message);
    return res.json([]);
  }
}

module.exports = {
  list, detail,
  listSosiometri, listMental, listBK, listPelanggaran,
  listMapel, listPrestasi, listJasmani, listRiwayatKesehatan,
};
