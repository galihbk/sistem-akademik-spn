// routes/mental.routes.js
const router = require("express").Router();
const ctrl = require("../controllers/mental.controller");

// Rekap mental (pivot mingguan)
router.get("/rekap", ctrl.rekap);

module.exports = router;
