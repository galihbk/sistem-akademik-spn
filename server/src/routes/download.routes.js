// routes/download.routes.js
const express = require("express");
const fs = require("fs");
const path = require("path");
const mime = require("mime-types"); // ← gunakan mime-types (lookup)

const router = express.Router();

// Folder base untuk semua upload
const UPLOAD_DIR = path.resolve(
  process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads")
);
console.log("[download] UPLOAD_DIR =", UPLOAD_DIR);

// Normalisasi path agar aman & konsisten
function normalizeToAbs(incoming) {
  if (!incoming) return null;

  let p = String(incoming).trim();

  // backslash -> slash, hapus leading slash
  p = p.replace(/\\/g, "/").replace(/^\/+/, "");

  // buang prefix "uploads/" kalau ada (FE kirim relatif)
  p = p.replace(/^uploads\//i, "");

  // kalau user kirim absolut → hanya izinkan bila masih di bawah UPLOAD_DIR
  if (path.isAbsolute(p)) {
    const base = path.resolve(UPLOAD_DIR);
    const absFromUser = path.resolve(p);
    if (absFromUser.startsWith(base)) {
      p = path.relative(base, absFromUser).replace(/\\/g, "/");
    } else {
      return null;
    }
  }

  // bentuk absolut final + anti path traversal
  const base = path.resolve(UPLOAD_DIR);
  const abs = path.resolve(base, p);
  if (!abs.startsWith(base)) return null;

  return abs;
}

function dbg(label, rel, abs, exists) {
  if (process.env.NODE_ENV === "development") {
    console.log(`[download] ${label}`, {
      requested: rel,
      resolved: abs,
      exists,
    });
  }
}

function contentTypeFor(filePath) {
  return mime.lookup(filePath) || "application/octet-stream";
}

// ====== HEAD /download?path=... (&inline=1 opsional) ======
router.head("/", (req, res) => {
  const rel = req.query.path;
  const abs = normalizeToAbs(rel);
  if (!abs) {
    dbg("HEAD invalid", rel, abs, false);
    return res.status(400).end();
  }
  if (!fs.existsSync(abs)) {
    dbg("HEAD 404", rel, abs, false);
    return res.status(404).end();
  }

  try {
    const stat = fs.statSync(abs);
    res.setHeader("Content-Length", stat.size);
    if (req.query.inline === "1") {
      // penting utk embed lintas origin
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.type(contentTypeFor(abs));
    }
  } catch {
    // abaikan
  }
  return res.status(200).end();
});

// ====== GET /download?path=... (&inline=1 opsional) ======
router.get("/", (req, res) => {
  const rel = req.query.path;
  const abs = normalizeToAbs(rel);
  if (!abs) {
    dbg("GET invalid", rel, abs, false);
    return res.status(400).json({ message: "path tidak valid" });
  }

  if (!fs.existsSync(abs)) {
    dbg("GET 404", rel, abs, false);
    return res
      .status(404)
      .json({ message: "Tidak ada data / file tidak ditemukan" });
  }

  // Jika inline=1 → kirim inline (bisa dirender <img>, <video>, dll)
  if (req.query.inline === "1") {
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.type(contentTypeFor(abs));
    dbg("GET inline", rel, abs, true);
    return res.sendFile(abs, (err) => {
      if (err) {
        console.error("[download inline] sendFile error:", err?.message || err);
        if (!res.headersSent)
          res.status(500).json({ message: "Gagal mengirim file" });
      }
    });
  }

  // Default: paksa unduh (perilaku lama)
  dbg("GET download", rel, abs, true);
  return res.download(abs, path.basename(abs), (err) => {
    if (err) {
      console.error("[download attach] error:", err?.message || err);
      if (!res.headersSent)
        res.status(500).json({ message: "Gagal mengunduh file" });
    }
  });
});

// (Opsional) Debug resolver
router.get("/debug/resolve", (req, res) => {
  const rel = req.query.path;
  const abs = normalizeToAbs(rel);
  const exists = abs ? fs.existsSync(abs) : false;
  res.json({ UPLOAD_DIR, requested: rel || null, resolved: abs, exists });
});

module.exports = router;
