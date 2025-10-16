const router = require("express").Router();
const ctrl = require("../controllers/riwayat.controller");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Direktori upload
const BASE_UPLOAD =
  process.env.UPLOAD_DIR || path.join(__dirname, "../../uploads");

// storage dinamis: uploads/riwayat/YYYY/MM/
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
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

// simpan path relatif dari folder uploads/
function rememberRelativePath(req, _res, next) {
  if (req.file) {
    const rel = path.relative(BASE_UPLOAD, req.file.path).replace(/\\/g, "/");
    req.file.storedAs = rel.startsWith("uploads/")
      ? rel.replace(/^uploads\//, "")
      : rel;
  }
  next();
}

// LIST
router.get("/", ctrl.list);

// CREATE (multipart)
router.post("/", upload.single("file"), rememberRelativePath, ctrl.create);

// DELETE
router.delete("/:id", ctrl.remove);

module.exports = router;
