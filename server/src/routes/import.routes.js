// src/routes/import.routes.js
const router = require("express").Router();
const multer = require("multer");
const requireAuth = require("../middlewares/requireAuth");

// Multer setup (memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // naikkan limit jadi 25MB
  fileFilter: (_req, file, cb) => {
    const mt = (file.mimetype || "").toLowerCase();
    const name = (file.originalname || "").toLowerCase();
    const okByMime =
      mt ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      mt === "application/vnd.ms-excel" ||
      mt === "application/octet-stream"; // beberapa browser/OS pakai ini
    const okByExt = name.endsWith(".xlsx") || name.endsWith(".xls");
    return okByMime || okByExt
      ? cb(null, true)
      : cb(new Error("Invalid file type (.xlsx/.xls only)"));
  },
});

// Controller
const {
  importSiswa,
  importMental,
} = require("../controllers/import.controller");

// Routes
router.post("/siswa", requireAuth, upload.single("file"), importSiswa);
router.post("/mental", requireAuth, upload.single("file"), importMental);

// (opsional) handler error untuk multer agar balasan jelas
router.use((err, _req, res, _next) => {
  if (
    err &&
    err.message &&
    /Invalid file type|File too large/i.test(err.message)
  ) {
    return res.status(400).json({ message: err.message });
  }
  return res
    .status(500)
    .json({ message: "Upload failed", error: err?.message });
});

module.exports = router;
