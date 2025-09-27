const router = require('express').Router();
const multer = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ].includes(file.mimetype);
    return ok ? cb(null, true) : cb(new Error('Invalid file type (.xlsx/.xls only)'));
  }
});



const requireAuth = require('../middlewares/requireAuth');
// ⬇️ gunakan objek, lalu akses .importSiswa
const importCtrl = require('../controllers/import.controller');
const { importExcel } = require('../controllers/importExcel.controller');

router.post(
  '/siswa',
  requireAuth,
  upload.single('file'),
  importCtrl.importSiswa   // ⬅️ jangan undefined
);
router.post('/:type(sosiometri|mental|mapel|jasmani)', requireAuth, upload.single('file'), importExcel);

module.exports = router;
