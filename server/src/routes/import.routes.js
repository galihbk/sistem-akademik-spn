// src/routes/import.routes.js
const router = require("express").Router();
const multer = require("multer");
const requireAuth = require("../middlewares/requireAuth");

// Multer setup
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ].includes(file.mimetype);
    return ok
      ? cb(null, true)
      : cb(new Error("Invalid file type (.xlsx/.xls only)"));
  },
});

// Controller: pake satu gaya saja (destructuring)
const {
  importSiswa,
  importMental,
} = require("../controllers/import.controller");

// === ROUTES ===

// Import Siswa (Excel)
router.post("/siswa", requireAuth, upload.single("file"), importSiswa);

// Import Mental (Excel, sheet MK)
router.post("/mental", requireAuth, upload.single("file"), importMental);

module.exports = router;
