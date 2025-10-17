// server/src/controllers/backup.controller.js
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const fsp = fs.promises;
const { parse } = require("pg-connection-string");
const archiver = require("archiver");

// === Paths & ENV ===
const PROJECT_ROOT = process.env.PROJECT_ROOT
  ? path.resolve(process.env.PROJECT_ROOT)
  : path.resolve(process.cwd());

const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(PROJECT_ROOT, "uploads");

const BACKUP_ROOT = process.env.BACKUP_DIR
  ? path.resolve(process.env.BACKUP_DIR)
  : path.join(PROJECT_ROOT, "backups");

const DATABASE_URL = process.env.DATABASE_URL;

// === Utils ===
function tsStamp() {
  const d = new Date();
  const p2 = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(
    d.getHours()
  )}${p2(d.getMinutes())}${p2(d.getSeconds())}`;
}

async function ensureDir(p) {
  await fsp.mkdir(p, { recursive: true });
  return p;
}

async function cpRecursive(src, dst) {
  if (!fs.existsSync(src)) return;
  if (fsp.cp) return fsp.cp(src, dst, { recursive: true, force: true });

  const st = await fsp.stat(src);
  if (st.isDirectory()) {
    await ensureDir(dst);
    const entries = await fsp.readdir(src, { withFileTypes: true });
    for (const e of entries) {
      const s = path.join(src, e.name);
      const d = path.join(dst, e.name);
      if (e.isDirectory()) await cpRecursive(s, d);
      else if (e.isFile()) await fsp.copyFile(s, d);
    }
  } else if (st.isFile()) {
    await ensureDir(path.dirname(dst));
    await fsp.copyFile(src, dst);
  }
}

async function listSnapshots(root) {
  if (!fs.existsSync(root)) return [];
  const entries = await fsp.readdir(root, { withFileTypes: true });
  const dirs = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const p = path.join(root, e.name);
    const st = await fsp.stat(p);
    dirs.push({ name: e.name, path: p, mtimeMs: st.mtimeMs });
  }
  dirs.sort((a, b) => b.mtimeMs - a.mtimeMs || b.name.localeCompare(a.name));
  return dirs;
}

async function latestSnapshot(root) {
  const list = await listSnapshots(root);
  return list[0] || null;
}

// === Controllers ===

// Info debug lokasi & hitung file uploads
const debugInfo = async (_req, res) => {
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
      BACKUP_ROOT,
      exists: fs.existsSync(UPLOAD_DIR),
      fileCount: count,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Stream hasil pg_dump langsung sebagai db.sql
const streamDbSql = (req, res) => {
  if (!DATABASE_URL) {
    res.status(500).json({ error: "DATABASE_URL tidak diset" });
    return;
  }
  const cfg = parse(DATABASE_URL);
  const args = [
    "-h",
    cfg.host || "localhost",
    "-p",
    String(cfg.port || 5432),
    "-U",
    cfg.user,
    "-d",
    cfg.database,
    "--no-owner",
    "--no-privileges",
    "--encoding",
    "UTF8",
    "--format",
    "plain",
  ];
  const env = { ...process.env, PGPASSWORD: cfg.password || "" };

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="db.sql"');

  const pg = spawn("pg_dump", args, { env });

  pg.on("error", (e) => res.status(500).end(`pg_dump error: ${e.message}\n`));
  pg.stdout.pipe(res);
  pg.stderr.on("data", () => {}); // abaikan log
  pg.on("close", (code) => {
    if (code !== 0 && !res.headersSent)
      res.status(500).end(`pg_dump exited with code ${code}\n`);
  });
};

// List file di uploads (JSON)
const listUploads = async (_req, res) => {
  try {
    const base = path.resolve(UPLOAD_DIR);
    const list = [];

    async function walk(dir) {
      const entries = await fsp.readdir(dir, { withFileTypes: true });
      for (const ent of entries) {
        const abs = path.join(dir, ent.name);
        if (ent.isDirectory()) await walk(abs);
        else if (ent.isFile()) {
          const rel = path.relative(base, abs).replace(/\\/g, "/");
          const st = await fsp.stat(abs);
          list.push({ path: rel, size: st.size, mtimeMs: st.mtimeMs });
        }
      }
    }

    if (!fs.existsSync(base))
      return res.json({ base, items: [], note: "UPLOAD_DIR not found" });

    await walk(base);
    res.json({ base, items: list });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Stream satu file upload via ?p=relative/path
const streamUploadFile = (req, res) => {
  try {
    const relRaw = String(req.query.p || "");
    const rel = relRaw.replace(/^\/+/, "");
    const safe = rel.replace(/\.\.+/g, "");
    const base = path.resolve(UPLOAD_DIR);
    const abs = path.resolve(base, safe);

    if (!abs.startsWith(base + path.sep) && abs !== base) {
      return res
        .status(400)
        .json({ error: "invalid path", rel: safe, base, abs });
    }
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
      return res.status(404).json({
        error: "file not found",
        rel: safe,
        base,
        abs,
        hint: "Periksa UPLOAD_DIR & path file.",
      });
    }

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${path.basename(safe)}"`
    );
    fs.createReadStream(abs).pipe(res);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

// Backup: buat snapshot BACKUP_ROOT/<timestamp>/{db.sql, uploads/**}
const backupNow = async (_req, res) => {
  try {
    if (!DATABASE_URL) throw new Error("DATABASE_URL tidak diset");
    await ensureDir(BACKUP_ROOT);

    const snapshotDir = path.join(BACKUP_ROOT, tsStamp());
    const uploadsDst = path.join(snapshotDir, "uploads");
    const dbSqlPath = path.join(snapshotDir, "db.sql");
    await ensureDir(snapshotDir);

    // 1) Dump DB → db.sql
    const cfg = parse(DATABASE_URL);
    const args = [
      "-h",
      cfg.host || "localhost",
      "-p",
      String(cfg.port || 5432),
      "-U",
      cfg.user,
      "-d",
      cfg.database,
      "--no-owner",
      "--no-privileges",
      "--encoding",
      "UTF8",
      "--format",
      "plain",
    ];
    const env = { ...process.env, PGPASSWORD: cfg.password || "" };

    await new Promise((resolve, reject) => {
      const out = fs.createWriteStream(dbSqlPath);
      const pg = spawn("pg_dump", args, { env });
      let errBuf = "";
      pg.on("error", reject);
      pg.stderr.on("data", (d) => (errBuf += String(d || "")));
      pg.stdout.pipe(out);
      pg.on("close", (code) => {
        out.close();
        code === 0
          ? resolve()
          : reject(new Error(`pg_dump ${code}: ${errBuf}`));
      });
    });

    // 2) Copy uploads jika ada
    if (fs.existsSync(UPLOAD_DIR)) {
      await cpRecursive(UPLOAD_DIR, uploadsDst);
    }

    res.json({
      ok: true,
      path: snapshotDir,
      lastBackupISO: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};

// Info snapshot terbaru
const latestBackupInfo = async (_req, res) => {
  try {
    const last = await latestSnapshot(BACKUP_ROOT);
    if (!last) return res.json({ ok: true, exists: false });

    // Ambil waktu dari nama folder YYYYMMDD-HHmmss jika bisa
    let parsed = null;
    const m = /^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})$/.exec(last.name);
    if (m) {
      const [, Y, Mo, D, H, Mi, S] = m;
      parsed = new Date(`${Y}-${Mo}-${D}T${H}:${Mi}:${S}Z`);
    }
    res.json({
      ok: true,
      exists: true,
      path: last.path,
      name: last.name,
      lastBackupISO: parsed
        ? parsed.toISOString()
        : new Date(last.mtimeMs).toISOString(),
      derivedFrom: parsed ? "folder-name" : "mtime",
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};

// ZIP-kan snapshot terbaru (jika belum ada → buat dulu), lalu stream ke client
const downloadArchiveZip = async (req, res) => {
  try {
    let snap = await latestSnapshot(BACKUP_ROOT);
    if (!snap) {
      // buat dulu snapshot
      await backupNow(
        req,
        { json: () => {} } // dummy response
      );
      snap = await latestSnapshot(BACKUP_ROOT);
      if (!snap) throw new Error("Gagal membuat snapshot.");
    }

    const outName = `${path.basename(snap.path)}.zip`;
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${outName}"`);

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", (err) => {
      if (!res.headersSent) res.status(500);
      res.end(`archive error: ${err.message}`);
    });

    archive.pipe(res);

    const dbFile = path.join(snap.path, "db.sql");
    if (fs.existsSync(dbFile)) archive.file(dbFile, { name: "db.sql" });

    const upDir = path.join(snap.path, "uploads");
    if (fs.existsSync(upDir)) archive.directory(upDir, "uploads");

    await archive.finalize();
  } catch (e) {
    if (!res.headersSent) res.status(500).json({ ok: false, error: e.message });
  }
};

module.exports = {
  debugInfo,
  streamDbSql,
  listUploads,
  streamUploadFile,
  backupNow,
  latestBackupInfo,
  downloadArchiveZip,
};
