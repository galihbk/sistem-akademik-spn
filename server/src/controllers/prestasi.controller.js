const fs = require("fs");
const path = require("path");
const pool = require("../db/pool");

const BASE_UPLOAD =
  process.env.UPLOAD_DIR || path.join(__dirname, "../../uploads");

function relPathFromProject(abs) {
  // path relatif dari folder uploads, supaya portable
  let rel = abs.split(path.join(BASE_UPLOAD, path.sep)).pop() || "";
  rel = rel.replace(/\\/g, "/");
  return rel;
}

exports.create = async (req, res) => {
  try {
    const { siswa_id, judul, tingkat, deskripsi, tanggal } = req.body || {};
    const sid = parseInt(siswa_id, 10);

    if (!sid || !judul || !judul.trim()) {
      return res
        .status(400)
        .json({ ok: false, message: "siswa_id & judul wajib diisi" });
    }

    // pastikan siswa ada
    const s = await pool.query("SELECT id FROM siswa WHERE id=$1", [sid]);
    if (!s.rowCount) {
      return res
        .status(404)
        .json({ ok: false, message: "Siswa tidak ditemukan" });
    }

    // ambil path relatif yang udah diset di middleware (kalau ada)
    let fp = null;
    if (req.file) {
      fp = req.file.storedAs || relPathFromProject(req.file.path);
    }

    const q =
      "INSERT INTO prestasi (siswa_id, tingkat, deskripsi, tanggal, judul, file_path) " +
      "VALUES ($1,$2,$3,$4,$5,$6) RETURNING *";
    const { rows } = await pool.query(q, [
      sid,
      tingkat || null,
      deskripsi || null,
      tanggal || null,
      judul.trim(),
      fp,
    ]);

    res.json({ ok: true, item: rows[0] });
  } catch (e) {
    console.error("[prestasi.create]", e);
    res.status(500).json({ ok: false, message: e.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ ok: false, message: "ID invalid" });

    const { rows } = await pool.query(
      "DELETE FROM prestasi WHERE id=$1 RETURNING file_path",
      [id]
    );
    if (!rows.length) {
      return res
        .status(404)
        .json({ ok: false, message: "Data tidak ditemukan" });
    }

    // hapus file kalau ada
    const fp = rows[0].file_path;
    if (fp) {
      const abs = path.join(BASE_UPLOAD, fp);
      fs.promises.unlink(abs).catch(() => {});
    }

    res.json({ ok: true });
  } catch (e) {
    console.error("[prestasi.remove]", e);
    res.status(500).json({ ok: false, message: e.message });
  }
};

exports.list = async (req, res) => {
  try {
    const qText = (req.query.q || "").trim().toLowerCase();
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit || "20", 10), 1),
      200
    );
    const offset = (page - 1) * limit;

    // ⬇️ Tambahan filter
    const angkatan = (req.query.angkatan || "").trim();
    const jenis = (req.query.jenis || req.query.jenis_pendidikan || "").trim();

    const params = [];
    const conds = [];

    // filter jenis/angkatan dari table siswa
    if (angkatan) {
      params.push(angkatan);
      conds.push(
        `LOWER(TRIM(COALESCE(s.kelompok_angkatan,''))) = LOWER(TRIM($${params.length}))`
      );
    }
    if (jenis) {
      params.push(jenis);
      conds.push(
        `LOWER(TRIM(COALESCE(s.jenis_pendidikan,''))) = LOWER(TRIM($${params.length}))`
      );
    }

    // filter q (judul/tingkat/nama/nosis)
    if (qText) {
      params.push(`%${qText}%`);
      const idx = params.length;
      conds.push(
        `(
          LOWER(p.judul) LIKE $${idx} OR
          LOWER(COALESCE(p.tingkat,'')) LIKE $${idx} OR
          LOWER(s.nama) LIKE $${idx} OR
          LOWER(s.nosis) LIKE $${idx}
        )`
      );
    }

    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

    const sqlData = `
      SELECT
        p.id, s.nosis, s.nama,
        p.judul, p.tingkat, p.tanggal, p.file_path,
        p.created_at
      FROM prestasi p
      JOIN siswa s ON s.id = p.siswa_id
      ${where}
      ORDER BY COALESCE(p.created_at, 'epoch'::timestamp) DESC, p.id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2};
    `;
    const sqlCount = `
      SELECT COUNT(*)::int AS total
      FROM prestasi p
      JOIN siswa s ON s.id = p.siswa_id
      ${where};
    `;

    const [data, count] = await Promise.all([
      pool.query(sqlData, [...params, limit, offset]),
      pool.query(sqlCount, params),
    ]);
    res.json({ items: data.rows, total: count.rows[0].total, page, limit });
  } catch (e) {
    console.error("[prestasi.list]", e);
    res.status(500).json({ message: "Gagal mengambil data prestasi" });
  }
};
