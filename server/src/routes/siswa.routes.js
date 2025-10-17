// routes/siswa.routes.js
const router = require("express").Router();
const ctrl = require("../controllers/siswa.controller");
const multer = require("multer");

// pakai memory storage supaya bisa tulis manual ke /uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// List + filter + sort + paginate
router.get("/", ctrl.list);

// Detail by NIK (utama)
router.get("/nik/:nik", ctrl.detailByNik);

// (Legacy) detail by NOSIS bila masih dipakai
router.get("/nosis/:nosis", ctrl.detailByNosis);

// ====== Relasi by NIK ======
router.get("/nik/:nik/mental", ctrl.listMental);
router.get("/nik/:nik/bk", ctrl.listBK);
router.get("/nik/:nik/pelanggaran", ctrl.listPelanggaran);
router.get("/nik/:nik/mapel", ctrl.listMapel);
router.get("/nik/:nik/prestasi", ctrl.listPrestasi);

// Jasmani (biasa) → sekarang membaca dari VIEW v_jasmani_itemized
router.get("/nik/:nik/jasmani", ctrl.listJasmani);

router.get("/nik/:nik/riwayat_kesehatan", ctrl.listRiwayatKesehatan);
router.get("/nik/:nik/jasmani_polda", ctrl.listJasmaniPolda);

// Ranking mental
router.get("/nik/:nik/mental/rank", ctrl.rankMentalByNik);

// ====== Write ======
router.post("/upsert", ctrl.upsertByNik);
router.patch("/nik/:nik", ctrl.updatePartialByNik);
router.post("/nik/:nik/foto", upload.single("foto"), ctrl.uploadFotoByNik);

module.exports = router;
