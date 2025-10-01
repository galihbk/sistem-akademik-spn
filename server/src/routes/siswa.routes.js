const router = require("express").Router();
const ctrl = require("../controllers/siswa.controller");

// List + filter + sort + paginate
router.get("/", ctrl.list);

// Detail by NIK (utama)
router.get("/nik/:nik", ctrl.detailByNik);

// (Legacy) detail by NOSIS bila masih dipakai
router.get("/nosis/:nosis", ctrl.detailByNosis);

// Relasi by NIK
router.get("/nik/:nik/sosiometri", ctrl.listSosiometri);
router.get("/nik/:nik/mental", ctrl.listMental);
router.get("/nik/:nik/bk", ctrl.listBK);
router.get("/nik/:nik/pelanggaran", ctrl.listPelanggaran);
router.get("/nik/:nik/mapel", ctrl.listMapel);
router.get("/nik/:nik/prestasi", ctrl.listPrestasi);
router.get("/nik/:nik/jasmani", ctrl.listJasmani);
router.get("/nik/:nik/riwayat_kesehatan", ctrl.listRiwayatKesehatan);
router.get("/nik/:nik/mental/rank", ctrl.rankMentalByNik);
// Upsert by NIK
router.post("/upsert", ctrl.upsertByNik);

module.exports = router;
