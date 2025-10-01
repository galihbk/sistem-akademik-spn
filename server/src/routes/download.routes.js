// routes/download.routes.js
const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

// 1) Tentukan BASE upload directory
//    Pastikan ENV ini diset ke folder yang benar (tempat Multer menyimpan file).
//    Fallback ke "<project-root>/uploads".
const UPLOAD_DIR = path.resolve(
  process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads")
);

// Log sekali saat server start
console.log("[download] UPLOAD_DIR =", UPLOAD_DIR);

// 2) Normalisasi path yang datang dari client agar aman & konsisten
function normalizeToAbs(incoming) {
  if (!incoming) return null;

  let p = String(incoming).trim();

  // ganti backslash -> slash
  p = p.replace(/\\/g, "/");

  // hapus query-leading slash
  p = p.replace(/^\/+/, "");

  // buang prefix "uploads/" jika ada
  p = p.replace(/^uploads\//i, "");

  // Jika user kirim path absolut (mis. /var/app/uploads/bk/..)
  // jadikan relatif terhadap UPLOAD_DIR
  if (path.isAbsolute(p)) {
    // kalau sudah mengandung UPLOAD_DIR, ambil relatifnya
    const base = path.resolve(UPLOAD_DIR);
    const absFromUser = path.resolve(p);
    if (absFromUser.startsWith(base)) {
      p = path.relative(base, absFromUser).replace(/\\/g, "/");
    } else {
      // absolut tapi bukan di bawah UPLOAD_DIR -> tolak
      return null;
    }
  }

  // bentuk ABSOLUTE final
  const base = path.resolve(UPLOAD_DIR);
  const abs = path.resolve(base, p);

  // pastikan tidak keluar dari UPLOAD_DIR (anti traversal)
  if (!abs.startsWith(base)) return null;

  return abs;
}

// Helper debug log
function dbg(label, rel, abs, exists) {
  if (process.env.NODE_ENV === "development") {
    console.log(`[download] ${label}`, {
      requested: rel,
      resolved: abs,
      exists,
    });
  }
}

// HEAD /download?path=...
router.head("/", (req, res) => {
  const rel = req.query.path;
  const abs = normalizeToAbs(rel);
  if (!abs) {
    dbg("HEAD invalid", rel, abs, false);
    return res.status(400).end();
  }
  const ok = fs.existsSync(abs);
  dbg("HEAD check", rel, abs, ok);
  if (!ok) return res.status(404).end();

  try {
    const stat = fs.statSync(abs);
    res.setHeader("Content-Length", stat.size);
  } catch {}
  return res.status(200).end();
});

// GET /download?path=...
router.get("/", (req, res) => {
  const rel = req.query.path;
  const abs = normalizeToAbs(rel);
  if (!abs) {
    dbg("GET invalid", rel, abs, false);
    return res.status(400).json({ message: "path tidak valid" });
  }

  const ok = fs.existsSync(abs);
  dbg("GET send", rel, abs, ok);
  if (!ok) {
    return res
      .status(404)
      .json({ message: "Tidak ada data / file tidak ditemukan" });
  }

  return res.download(abs, path.basename(abs));
});

// (Opsional) endpoint bantu ngecek resolve (JSON)
router.get("/debug/resolve", (req, res) => {
  const rel = req.query.path;
  const abs = normalizeToAbs(rel);
  const exists = abs ? fs.existsSync(abs) : false;
  res.json({
    UPLOAD_DIR,
    requested: rel || null,
    resolved: abs,
    exists,
  });
});

module.exports = router;
