const express = require("express");
const router = express.Router();
const exportCtrl = require("../controllers/export.controller");

router.get("/siswa.xlsx", exportCtrl.exportSiswaXlsx);

router.get("/mental_rekap.xlsx", exportCtrl.exportMentalRekapExcel);
router.get("/mapel.xlsx", exportCtrl.exportMapelXlsx);
router.head("/mapel.xlsx", exportCtrl.exportMapelXlsx);
router.get("/all-by-nik.pdf", exportCtrl.exportAllByNik);
router.get("/jasmani_rekap.xlsx", exportCtrl.exportJasmaniRekapExcel);

module.exports = router;
