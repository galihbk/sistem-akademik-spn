const express = require("express");
const router = express.Router();
const exportCtrl = require("../controllers/export.controller");

// Excel daftar siswa (semua kolom)
router.get("/siswa.xlsx", exportCtrl.exportSiswaXlsx);

// Excel rekap mental (satu tombol, berdasarkan filter)
router.get("/mental_rekap.xlsx", exportCtrl.exportMentalRekapExcel);
// Excel Mapel (filter sama seperti di RekapMapel.jsx, always export all)
router.get("/mapel.xlsx", exportCtrl.exportMapelXlsx);
// (opsional) HEAD untuk preflight/progress detector di FE
router.head("/mapel.xlsx", exportCtrl.exportMapelXlsx);
// PDF per NIK (opsional, jika sudah ada route-nya)
router.get("/all-by-nik.pdf", exportCtrl.exportAllByNik);
router.get("/jasmani_rekap.xlsx", exportCtrl.exportJasmaniRekapExcel);

module.exports = router;
