// controllers/restore.controller.js
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { parse } = require('pg-connection-string');
const fse = require('fs-extra');

const DATABASE_URL = process.env.DATABASE_URL;
const PROJECT_ROOT = process.env.PROJECT_ROOT
  ? path.resolve(process.env.PROJECT_ROOT)
  : path.resolve(process.cwd());

const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(PROJECT_ROOT, 'uploads');

exports.runRestore = async (req, res) => {
  try {
    const { backupPath } = req.body || {};
    if (!backupPath || !fs.existsSync(backupPath)) {
      return res.status(400).json({ error: 'Folder cadangan tidak ditemukan.' });
    }

    const dbFile = path.join(backupPath, 'db.sql');
    if (!fs.existsSync(dbFile)) {
      return res.status(400).json({ error: 'File db.sql tidak ditemukan di folder cadangan.' });
    }

    if (!DATABASE_URL) {
      return res.status(500).json({ error: 'DATABASE_URL tidak diset' });
    }
    const cfg = parse(DATABASE_URL);

    // 1) Restore database dengan psql
    await new Promise((resolve, reject) => {
      const args = [
        '-h', cfg.host || 'localhost',
        '-p', String(cfg.port || 5432),
        '-U', cfg.user,
        '-d', cfg.database,
        '-f', dbFile,
      ];
      const env = { ...process.env, PGPASSWORD: cfg.password || '' };
      const ps = spawn('psql', args, { env });

      ps.stdout.on('data', (d) => console.log('[psql]', d.toString()));
      ps.stderr.on('data', (d) => console.error('[psql-err]', d.toString()));
      ps.on('error', (e) => reject(e));
      ps.on('close', (code) => code === 0 ? resolve() : reject(new Error(`psql exited ${code}`)));
    });

    // 2) Salin ulang uploads
    const srcUploads = path.join(backupPath, 'uploads');
    if (fs.existsSync(srcUploads)) {
      await fse.copy(srcUploads, UPLOAD_DIR, { overwrite: true });
    }

    res.json({ ok: true, message: 'Data berhasil dipulihkan dari cadangan.' });
  } catch (e) {
    console.error('[restore]', e);
    res.status(500).json({ error: e.message });
  }
};
