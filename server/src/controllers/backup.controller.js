// controllers/backup.controller.js
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { parse } = require('pg-connection-string');

const PROJECT_ROOT = process.env.PROJECT_ROOT
  ? path.resolve(process.env.PROJECT_ROOT)
  : path.resolve(process.cwd());

const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(PROJECT_ROOT, 'uploads');

const DATABASE_URL = process.env.DATABASE_URL;

// Debug info lokasi uploads
exports.debugInfo = async (_req, res) => {
  try {
    let count = 0;
    if (fs.existsSync(UPLOAD_DIR)) {
      const stack = [UPLOAD_DIR];
      while (stack.length) {
        const cur = stack.pop();
        const ents = fs.readdirSync(cur, { withFileTypes: true });
        for (const e of ents) {
          const abs = path.join(cur, e.name);
          if (e.isDirectory()) stack.push(abs);
          else if (e.isFile()) count++;
        }
      }
    }
    res.json({
      PROJECT_ROOT,
      UPLOAD_DIR,
      exists: fs.existsSync(UPLOAD_DIR),
      fileCount: count,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Stream dump DB → db.sql (text)
exports.streamDbSql = (req, res) => {
  if (!DATABASE_URL) {
    res.status(500).json({ error: 'DATABASE_URL tidak diset' });
    return;
  }
  const cfg = parse(DATABASE_URL);
  const args = [
    '-h', cfg.host || 'localhost',
    '-p', String(cfg.port || 5432),
    '-U', cfg.user,
    '-d', cfg.database,
    '--no-owner',
    '--no-privileges',
    '--encoding', 'UTF8',
    '--format', 'plain',
  ];
  const env = { ...process.env, PGPASSWORD: cfg.password || '' };

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="db.sql"');

  // NOTE: di Windows, jika pg_dump tidak ada di PATH, ganti 'pg_dump' ke path absolut .exe
  const pg = spawn('pg_dump', args, { env });

  pg.on('error', (e) => res.status(500).end(`pg_dump error: ${e.message}\n`));
  pg.stdout.pipe(res);
  pg.stderr.on('data', () => {}); // info non fatal

  pg.on('close', (code) => {
    if (code !== 0 && !res.headersSent) res.status(500).end(`pg_dump exited with code ${code}\n`);
  });
};

// List isi uploads → JSON
exports.listUploads = async (_req, res) => {
  try {
    const base = path.resolve(UPLOAD_DIR);
    const list = [];

    async function walk(dir) {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });
      for (const ent of entries) {
        const abs = path.join(dir, ent.name);
        if (ent.isDirectory()) {
          await walk(abs);
        } else if (ent.isFile()) {
          const rel = path.relative(base, abs).replace(/\\/g, '/');
          const st = await fs.promises.stat(abs);
          list.push({ path: rel, size: st.size, mtimeMs: st.mtimeMs });
        }
      }
    }

    if (!fs.existsSync(base)) return res.json({ base, items: [], note: 'UPLOAD_DIR not found' });
    await walk(base);
    res.json({ base, items: list });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Stream satu berkas upload by ?p=relative/path
exports.streamUploadFile = (req, res) => {
  try {
    const relRaw = String(req.query.p || '');
    const rel = relRaw.replace(/^\/+/, '');
    const safe = rel.replace(/\.\.+/g, ''); // cegah ../
    const base = path.resolve(UPLOAD_DIR);
    const abs = path.resolve(base, safe);

    // anti path traversal
    if (!abs.startsWith(base + path.sep) && abs !== base) {
      return res.status(400).json({ error: 'invalid path', rel: safe, base, abs });
    }
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
      return res.status(404).json({
        error: 'file not found',
        rel: safe,
        base,
        abs,
        hint: 'Periksa UPLOAD_DIR & apakah file benar-benar ada di path ini.',
      });
    }

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(safe)}"`);
    fs.createReadStream(abs).pipe(res);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
