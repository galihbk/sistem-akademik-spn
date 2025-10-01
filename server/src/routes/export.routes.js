// routes/export.routes.js
const router = require("express").Router();
const ctrl = require("../controllers/export.controller");
// (opsional) kalau Anda pakai auth middleware:
// const requireAuth = require("../middlewares/requireAuth");

// 1) Format utama: /export/nik/:nik
router.get(
  "/nik/:nik",
  /*requireAuth,*/ (req, res, next) => {
    // ubah ke bentuk yg sama (req.query.nik) agar controller 1 fungsi saja
    req.query.nik = req.params.nik;
    return ctrl.exportAllByNik(req, res, next);
  }
);

// 2) Alias: /export/all?nik=xxxx  (tetap panggil fungsi yang sama)
router.get("/all", /*requireAuth,*/ ctrl.exportAllByNik);

module.exports = router;
