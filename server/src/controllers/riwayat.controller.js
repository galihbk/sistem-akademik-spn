const fs = require("fs");
const path = require("path");
const pool = require("../db/pool");

exports.create = async (req, res) => {
  try {
    const { siswa_id, judul, deskripsi, tanggal } = req.body || {};
    const sid = parseInt(siswa_id, 10);

    if (
      !sid ||
      !String(judul || "").trim() ||
      !String(deskripsi || "").trim()
    ) {
      return res
        .status(400)
        .json({ ok: false, message: "siswa_id, judul, deskripsi wajib diisi" });
    }

    const s = await pool.query("SELECT id FROM siswa WHERE id=$1", [sid]);
    if (!s.rowCount) {
      return res
        .status(404)
        .json({ ok: false, message: "Siswa tidak ditemukan" });
    }

    // path relatif hasil dari middleware rememberRelativePath
    const fileRelPath = req.file ? req.file.storedAs : null;

    const { rows } = await pool.query(
      `INSERT INTO riwayat_kesehatan (siswa_id, judul, deskripsi, tanggal, file_path)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [sid, judul.trim(), deskripsi.trim(), tanggal || null, fileRelPath]
    );

    res.json({ ok: true, item: rows[0] });
  } catch (e) {
    console.error("[riwayat.create]", e);
    res.status(500).json({ ok: false, message: e.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ ok: false, message: "ID invalid" });

    const { rows } = await pool.query(
      "DELETE FROM riwayat_kesehatan WHERE id=$1 RETURNING file_path",
      [id]
    );
    if (!rows.length) {
      return res
        .status(404)
        .json({ ok: false, message: "Data tidak ditemukan" });
    }

    // hapus file jika ada
    const rel = rows[0].file_path;
    if (rel) {
      const base =
        process.env.UPLOAD_DIR || path.join(__dirname, "../../uploads");
      const abs = path.join(base, rel);
      fs.promises.unlink(abs).catch(() => {});
    }

    res.json({ ok: true });
  } catch (e) {
    console.error("[riwayat.remove]", e);
    res.status(500).json({ ok: false, message: e.message });
  }
};

exports.list = async (req, res) => {
  try {
    const q = (req.query.q || "").trim().toLowerCase();
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit || "20", 10), 1),
      100
    );
    const offset = (page - 1) * limit;

    const sortBy = ["created_at", "tanggal"].includes(
      (req.query.sort_by || "").toLowerCase()
    )
      ? req.query.sort_by.toLowerCase()
      : "created_at";
    const sortDir = ["asc", "desc"].includes(
      (req.query.sort_dir || "").toLowerCase()
    )
      ? req.query.sort_dir.toLowerCase()
      : "desc";

    const params = [];
    let where = "WHERE 1=1";
    if (q) {
      // tambahkan 3 parameter sekaligus
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
      where += `
        AND (
          LOWER(r.judul) LIKE $${params.length - 2}
          OR LOWER(s.nama)  LIKE $${params.length - 1}
          OR LOWER(s.nosis) LIKE $${params.length}
        )`;
    }

    const sqlData = `
      SELECT
        r.id,
        r.siswa_id,
        s.nosis,
        s.nama,
        r.judul,
        r.deskripsi,
        r.tanggal,
        r.file_path,
        r.created_at
      FROM riwayat_kesehatan r
      JOIN siswa s ON s.id = r.siswa_id
      ${where}
      ORDER BY r.${sortBy} ${sortDir}, r.id DESC
      LIMIT ${limit} OFFSET ${offset};
    `;
    const sqlCount = `
      SELECT COUNT(*)::int AS total
      FROM riwayat_kesehatan r
      JOIN siswa s ON s.id = r.siswa_id
      ${where};
    `;

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
    });
  } catch (e) {
    console.error("[riwayat.list]", e);
    res.status(500).json({ ok: false, message: "Gagal mengambil data" });
  }
};
