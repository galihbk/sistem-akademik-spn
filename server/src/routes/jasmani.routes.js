// server/src/routes/jasmani.routes.js
const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const ctrl = require("../controllers/jasmani.controller");

const BASE_UPLOAD =
  process.env.UPLOAD_DIR || path.join(__dirname, "../../uploads");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const now = new Date();
    const dir = path.join(
      BASE_UPLOAD,
      "import",
      "jasmani",
      String(now.getFullYear()),
      String(now.getMonth() + 1).padStart(2, "0")
    );
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    cb(null, "JASMANI_" + Date.now() + path.extname(file.originalname || ""));
  },
});
const upload = multer({ storage });

// === endpoints (mirror mapel) ===
router.post("/import-excel", upload.single("file"), ctrl.importExcel);
router.get("/rekap", ctrl.rekap);
router.get("/template", ctrl.template);

module.exports = router;
