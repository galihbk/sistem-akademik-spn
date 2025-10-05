const router = require("express").Router();
const ctrl = require("../controllers/prestasi.controller");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const BASE_UPLOAD = process.env.UPLOAD_DIR || path.join(__dirname, "../../uploads");

// simpan ke uploads/prestasi/YYYY/MM/
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const now = new Date();
    const dir = path.join(
      BASE_UPLOAD,
      "prestasi",
      String(now.getFullYear()),
      String(now.getMonth() + 1).padStart(2, "0")
    );
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").slice(0, 10) || "";
    cb(null, `PRS_${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

// set path relatif dari folder uploads/
function rememberRelativePath(req, _res, next) {
  if (req.file) {
    const abs = req.file.path;
    const rel = abs
      .split(path.join(BASE_UPLOAD, path.sep))
      .pop()
      .replace(/\\/g, "/");
    req.file.storedAs = rel.startsWith("uploads/") ? rel.replace(/^uploads\//, "") : rel;
  }
  next();
}

// LIST
router.get("/", ctrl.list);

// CREATE
router.post("/", upload.single("file"), rememberRelativePath, ctrl.create);

// DELETE
router.delete("/:id", ctrl.remove);

module.exports = router;
