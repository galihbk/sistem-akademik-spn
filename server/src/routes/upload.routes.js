// server/src/routes/upload.routes.js
const router = require("express").Router();
const { upload } = require("../middlewares/upload");
const {
  uploadPdf,
  deleteDoc,
  listDocs,
  download,
} = require("../controllers/upload.controller");

// (opsional) middleware auth
// const requireAuth = require("../middlewares/requireAuth");

// --------------------
// DOWNLOAD FILE (PDF)
// --------------------
router.get(
  "/download",
  // requireAuth,
  download
);

// --------------------
// RIWAYAT & HAPUS — BK
// --------------------
router.get(
  "/bk",
  // requireAuth,
  listDocs("bk")
);

router.delete(
  "/bk/:id",
  // requireAuth,
  deleteDoc("bk")
);

// ---------------------------
// RIWAYAT & HAPUS — PELANGGARAN
// ---------------------------
router.get(
  "/pelanggaran",
  // requireAuth,
  listDocs("pelanggaran")
);

router.delete(
  "/pelanggaran/:id",
  // requireAuth,
  deleteDoc("pelanggaran")
);

// --------------------
// UPLOAD PDF (BK/PELANGGARAN)
// Kompatibel dengan fetch ke `${API}/upload/bk` atau `${API}/upload/pelanggaran`
// --------------------

// Jika router ini di-mount di root (app.use("/", router))
// maka path POST /upload/:kind akan tetap cocok dengan frontend.
router.post(
  "/upload/:kind(bk|pelanggaran)",
  // requireAuth,
  upload.single("file"), // field name = "file"
  uploadPdf
);

// (opsional) kalau kamu sebelumnya mount router ini di `/upload`,
// endpoint POST lama `/upload/:kind` juga bisa diganti ke path di bawah:
// router.post(
//   "/:kind(bk|pelanggaran)",
//   // requireAuth,
//   upload.single("file"),
//   uploadPdf
// );

module.exports = router;
