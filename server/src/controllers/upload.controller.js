// server/src/controllers/upload.controller.js
const path = require("path");
const fs = require("fs");
const pool = require("../db/pool");

/** Lokasi root & folder upload (samakan dengan app.js) */
const PROJECT_ROOT = process.env.PROJECT_ROOT
  ? path.resolve(process.env.PROJECT_ROOT)
  : path.resolve(process.cwd());
const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(PROJECT_ROOT, "uploads");

/** Hapus file jika ada error (path absolut/relatif aman) */
function safeUnlink(filePath) {
  if (!filePath) return;
  try {
    const abs = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(PROJECT_ROOT, filePath);
    // hanya hapus kalau di dalam UPLOAD_DIR
    const inside = abs.startsWith(UPLOAD_DIR + path.sep) || abs === UPLOAD_DIR;
    if (!inside) return;
    fs.promises.unlink(abs).catch(() => {});
  } catch {
    /* ignore */
  }
}

/** Validasi & normalisasi tanggal ke format DATE PostgreSQL (YYYY-MM-DD) */
function normalizeDate(input) {
  if (!input) return null;
  const s = String(input).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (isNaN(d)) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * POST /upload/:kind
 * FormData: siswa_id, judul, tanggal?, file
 * kind: "bk" | "pelanggaran"
 */
async function uploadPdf(req, res) {
  const kind = (req.params.kind || "").toLowerCase();
  const table = kind === "pelanggaran" ? "pelanggaran" : "bk"; // default bk
  const file = req.file;

  let { siswa_id, judul, tanggal } = req.body || {};
  siswa_id = siswa_id ? String(siswa_id).trim() : "";
  judul = judul ? String(judul).trim() : "";
  tanggal = normalizeDate(tanggal);

  // Validasi dasar
  if (!file) {
    return res.status(400).json({ message: "File PDF wajib diunggah." });
  }
  if (!siswa_id) {
    safeUnlink(file.path);
    return res.status(400).json({ message: "siswa_id wajib diisi." });
  }
  if (!judul) {
    safeUnlink(file.path);
    return res.status(400).json({ message: "Judul wajib diisi." });
  }

  // Pastikan siswa_id valid
  try {
    const s = await pool.query("SELECT id FROM siswa WHERE id=$1 LIMIT 1", [
      siswa_id,
    ]);
    if (!s.rows.length) {
      safeUnlink(file.path);
      return res.status(404).json({ message: "Siswa tidak ditemukan." });
    }
  } catch (e) {
    safeUnlink(file.path);
    console.error("[upload] cek siswa error:", e);
    return res.status(500).json({ message: "Internal error (cek siswa)." });
  }

  // Simpan metadata ke DB (simpan path relatif biar portable)
  const relPath = path.relative(PROJECT_ROOT, file.path).replace(/\\/g, "/");

  const sql = `
    INSERT INTO ${table} (siswa_id, judul, tanggal, file_path)
    VALUES ($1, $2, $3, $4)
    RETURNING id, siswa_id, judul, tanggal, file_path, created_at
  `;

  try {
    const { rows } = await pool.query(sql, [siswa_id, judul, tanggal, relPath]);
    return res.json({
      message: "OK",
      item: rows[0],
      kind,
    });
  } catch (e) {
    safeUnlink(file.path);
    console.error("[upload] insert error:", e);
    return res.status(500).json({ message: "Gagal menyimpan metadata file." });
  }
}

/**
 * DELETE /bk/:id atau /pelanggaran/:id
 * Hapus baris + file fisik di /uploads
 */
function deleteDoc(kind) {
  const table = kind === "pelanggaran" ? "pelanggaran" : "bk";
  return async function (req, res) {
    const id = Number(req.params.id) || 0;
    if (!id) {
      return res.status(400).json({ ok: false, message: "ID tidak valid" });
    }
    try {
      const { rows, rowCount } = await pool.query(
        `DELETE FROM ${table} WHERE id=$1 RETURNING file_path`,
        [id]
      );
      if (!rowCount) {
        return res
          .status(404)
          .json({ ok: false, message: "Data tidak ditemukan" });
      }
      const filePath = rows[0]?.file_path || null;
      safeUnlink(filePath);
      return res.json({ ok: true, deleted_id: id });
    } catch (e) {
      console.error(`[${table}.delete]`, e);
      return res
        .status(500)
        .json({ ok: false, message: "Gagal menghapus dokumen" });
    }
  };
}

/**
 * (Opsional) GET /bk atau /pelanggaran – untuk riwayat list
 * Dipakai oleh halaman UploadPdf riwayat
 */
function listDocs(kind) {
  const table = kind === "pelanggaran" ? "pelanggaran" : "bk";
  return async function (req, res) {
    try {
      const page = Math.max(parseInt(req.query.page || "1", 10), 1);
      const limit = Math.min(
        Math.max(parseInt(req.query.limit || "20", 10), 1),
        200
      );
      const offset = (page - 1) * limit;
      const sortDir = ["asc", "desc"].includes(
        String(req.query.sort_dir || "").toLowerCase()
      )
        ? String(req.query.sort_dir).toLowerCase()
        : "desc";

      const cnt = await pool.query(
        `SELECT COUNT(*)::int AS total FROM ${table}`
      );
      const sql = `
        SELECT d.id, d.siswa_id, d.judul, d.tanggal, d.file_path, d.created_at,
               s.nosis, s.nama
        FROM ${table} d
        LEFT JOIN siswa s ON s.id = d.siswa_id
        ORDER BY d.created_at ${sortDir}
        LIMIT $1 OFFSET $2
      `;
      const { rows } = await pool.query(sql, [limit, offset]);

      res.json({
        items: rows,
        total: cnt.rows?.[0]?.total ?? rows.length,
        page,
        limit,
        sort_dir: sortDir,
      });
    } catch (e) {
      console.error(`[${table}.list]`, e);
      res.status(500).json({ ok: false, message: "Gagal mengambil data" });
    }
  };
}

module.exports = { uploadPdf, deleteDoc, listDocs };
