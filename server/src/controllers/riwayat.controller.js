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
    if (!s.rowCount)
      return res
        .status(404)
        .json({ ok: false, message: "Siswa tidak ditemukan" });

    const fileRelPath = req.file ? req.file.storedAs : null; // diset di middleware
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
    if (!rows.length)
      return res
        .status(404)
        .json({ ok: false, message: "Data tidak ditemukan" });

    // hapus file jika ada
    const rel = rows[0].file_path;
    if (rel) {
      const abs = path.join(
        process.env.UPLOAD_DIR || path.join(__dirname, "../../uploads"),
        rel
      );
      fs.promises.unlink(abs).catch(() => {});
    }
    res.json({ ok: true });
  } catch (e) {
    console.error("[riwayat.remove]", e);
    res.status(500).json({ ok: false, message: e.message });
  }
};
