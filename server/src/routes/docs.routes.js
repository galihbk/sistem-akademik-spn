// server/src/routes/docs.routes.js
const router = require("express").Router();
const { makeListController } = require("../controllers/docs.controller");

/**
 * Buat router untuk tabel dokumen (bk | pelanggaran)
 * Pemakaian di server/index.js:
 *   const makeDocsRoutes = require('./routes/docs.routes');
 *   app.use('/bk', makeDocsRoutes('bk'));
 *   app.use('/pelanggaran', makeDocsRoutes('pelanggaran'));
 */
module.exports = function makeDocsRoutes(tableName) {
  const r = router.clone ? router.clone() : require("express").Router();
  r.get("/", makeListController(tableName));
  return r;
};
