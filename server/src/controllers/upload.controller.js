const path = require("path");
const fs = require("fs");
const pool = require("../db/pool");

/** Hapus file jika ada error */
function safeUnlink(filePath) {
  if (!filePath) return;
  fs.promises.unlink(filePath).catch(() => {
    /* ignore */
  });
}

/** Validasi & normalisasi tanggal ke format DATE PostgreSQL (YYYY-MM-DD) */
function normalizeDate(input) {
  if (!input) return null;
  const s = String(input).trim();
  // terima YYYY-MM-DD atau Date parsable
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

  // Simpan metadata ke DB
  const relPath = path.relative(process.cwd(), file.path).replace(/\\/g, "/"); // simpan path relatif (portable)
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

module.exports = { uploadPdf };
