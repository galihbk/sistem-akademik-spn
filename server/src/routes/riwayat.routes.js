const router = require("express").Router();
const ctrl = require("../controllers/riwayat.controller");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Direktori upload
const BASE_UPLOAD =
  process.env.UPLOAD_DIR || path.join(__dirname, "../../uploads");

// storage dinamis: uploads/riwayat/YY/MM/
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const now = new Date();
    const dir = path.join(
      BASE_UPLOAD,
      "riwayat",
      String(now.getFullYear()),
      String(now.getMonth() + 1).padStart(2, "0")
    );
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const ext = path.extname(file.originalname || "").slice(0, 10) || "";
    cb(null, `RK_${ts}${ext}`);
  },
});
const upload = multer({ storage });

// middleware kecil untuk menyimpan path relatif yg konsisten
function rememberRelativePath(req, _res, next) {
  if (req.file) {
    // simpan relative path dari folder uploads/
    const abs = req.file.path;
    const rel = abs
      .split(path.join(BASE_UPLOAD, path.sep))
      .pop()
      .replace(/\\/g, "/");
    req.file.storedAs = rel.startsWith("uploads/")
      ? rel.replace(/^uploads\//, "")
      : rel;
  }
  next();
}

// POST /riwayat_kesehatan  (multipart: siswa_id, judul, deskripsi, tanggal, file(optional))
router.post("/", upload.single("file"), rememberRelativePath, ctrl.create);

// DELETE /riwayat_kesehatan/:id  (hapus data + file fisik)
router.delete("/:id", ctrl.remove);

module.exports = router;
