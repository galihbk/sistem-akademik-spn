// controllers/prestasi.controller.js
const fs = require("fs");
const path = require("path");
const pool = require("../db/pool");

function relPath(abs) {
  // hasilkan path relatif dari folder project (untuk disimpan di DB)
  const up = path.resolve(__dirname, "..");
  let rel = path.relative(up, abs).replace(/\\/g, "/");
  // simpan tanpa prefix "./"
  if (rel.startsWith("./")) rel = rel.slice(2);
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

    const fp = req.file ? relPath(req.file.path) : null;

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
      const abs = path.resolve(__dirname, "..", fp);
      fs.promises.unlink(abs).catch(() => {}); // abaikan kalau sudah tidak ada
    }

    res.json({ ok: true });
  } catch (e) {
    console.error("[prestasi.remove]", e);
    res.status(500).json({ ok: false, message: e.message });
  }
};
