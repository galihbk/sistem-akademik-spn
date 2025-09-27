const pool = require('../db/pool');
const { importSiswaFromWorkbookBuffer } = require('../services/siswaImport.service');

async function importSiswa(req, res) {
  if (!req.file?.buffer) return res.status(400).json({ message: 'File is required' });
  const dryRun = String(req.query.dryRun || 'false') === 'true';

  try {
    const result = await importSiswaFromWorkbookBuffer(req.file.buffer, { dryRun });

    if (!dryRun) {
      const admin = (req.user?.username) || 'admin';
      await pool.query(
        `INSERT INTO audit_log (admin, aksi, target, hasil, detail)
         VALUES ($1,$2,$3,$4,$5)`,
        [admin, 'import_siswa', 'sheet=data siswa', 'ok', JSON.stringify(result)]
      );
    }

    res.json(result);
  } catch (e) {
    console.error('[import.controller]', e);
    res.status(400).json({ message: e.message, stack: e.stack });
  }
}

module.exports = { importSiswa };
