// routes/prestasi.routes.js
const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const ctrl = require("../controllers/prestasi.controller");

// ====== FIX: base uploads di server/uploads (bukan server/src/uploads)
const UPLOAD_BASE = path.resolve(__dirname, "..", "..", "uploads");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const now = new Date();
    const dir = path.resolve(
      UPLOAD_BASE,
      "prestasi",
      String(now.getFullYear()),
      String(now.getMonth() + 1).padStart(2, "0")
    );
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const safe = (file.originalname || "file")
      .replace(/[^a-zA-Z0-9.\-_]+/g, "_")
      .slice(-120);
    cb(null, `${Date.now()}_${safe}`);
  },
});

const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

router.post("/", upload.single("file"), ctrl.create);
router.delete("/:id", ctrl.remove);

module.exports = router;
