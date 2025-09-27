const router = require('express').Router();
const requireAuth = require('../middlewares/requireAuth');
const c = require('../controllers/siswa.controller');

router.get('/', requireAuth, c.list);
router.get('/:nosis', requireAuth, c.detail);

// sub-resources per tab
router.get('/:nosis/sosiometri',         requireAuth, c.listSosiometri);
router.get('/:nosis/mental',             requireAuth, c.listMental);
router.get('/:nosis/bk',                 requireAuth, c.listBK);
router.get('/:nosis/pelanggaran',        requireAuth, c.listPelanggaran);
router.get('/:nosis/mapel',              requireAuth, c.listMapel);
router.get('/:nosis/prestasi',           requireAuth, c.listPrestasi);
router.get('/:nosis/jasmani',            requireAuth, c.listJasmani);
router.get('/:nosis/riwayat_kesehatan',  requireAuth, c.listRiwayatKesehatan);

module.exports = router;
