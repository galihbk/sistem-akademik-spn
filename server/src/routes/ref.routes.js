const router = require("express").Router();
const ref = require("../controllers/ref.controller");

router.get("/angkatan", ref.listAngkatan); // will be /ref/angkatan setelah diprefix

module.exports = router;
