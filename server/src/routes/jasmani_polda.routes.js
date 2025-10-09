// server/src/routes/jasmani_polda.routes.js
const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const ctrl = require("../controllers/jasmani_polda.controller");

const BASE_UPLOAD =
  process.env.UPLOAD_DIR || path.join(__dirname, "../../uploads");

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const now = new Date();
    const dir = path.join(
      BASE_UPLOAD,
      "import",
      "jasmani-polda",
      String(now.getFullYear()),
      String(now.getMonth() + 1).padStart(2, "0")
    );
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    cb(
      null,
      "JASMANI_POLDA_" + Date.now() + path.extname(file.originalname || "")
    );
  },
});
const upload = multer({ storage });

// endpoints
router.post("/import-excel", upload.single("file"), ctrl.importExcel);
router.get("/rekap", ctrl.rekap);
router.patch("/:id/set-siswa", ctrl.setSiswa);

module.exports = router;
