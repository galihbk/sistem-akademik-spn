const router = require("express").Router();
const { upload } = require("../middlewares/upload");
const { uploadPdf } = require("../controllers/upload.controller");

// (opsional) middleware auth, contoh:
// const requireAuth = require("../middlewares/requireAuth");

router.post(
  "/:kind(bk|pelanggaran)",
  // requireAuth,          // aktifkan kalau kamu pakai auth
  upload.single("file"), // field name = "file"
  uploadPdf
);

module.exports = router;
