const path = require("path");
const fs = require("fs");
const multer = require("multer");

const BASE = process.env.UPLOAD_BASE || path.resolve(process.cwd(), "uploads");
const MAX = Number(process.env.UPLOAD_MAX || 15 * 1024 * 1024); // default 15MB

/** Pastikan folder ada */
function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

/** Bersihkan nama file dari karakter aneh */
function safeName(name) {
  return String(name)
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 140);
}

/** storage dinamis: /uploads/{kind}/YYYY/MM/ */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const kind = (req.params.kind || "").toLowerCase();
    const now = new Date();
    const y = String(now.getFullYear());
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const dir = path.join(
      BASE,
      kind === "pelanggaran" ? "pelanggaran" : "bk",
      y,
      m
    );
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext =
      path.extname(file.originalname || ".pdf").toLowerCase() || ".pdf";
    const base =
      safeName(path.basename(file.originalname || "dokumen", ext)) || "dokumen";
    const ts = Date.now();
    cb(null, `${base}_${ts}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  // Beberapa browser kirim application/octet-stream; cek ext juga
  const okMime = file.mimetype === "application/pdf";
  const okExt = path.extname(file.originalname || "").toLowerCase() === ".pdf";
  if (okMime || okExt) return cb(null, true);
  cb(new Error("File harus PDF"));
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX },
});

module.exports = { upload, BASE };
