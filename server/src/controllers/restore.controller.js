// controllers/restore.controller.js
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const { parse } = require("pg-connection-string");

const PROJECT_ROOT = process.env.PROJECT_ROOT
  ? path.resolve(process.env.PROJECT_ROOT)
  : process.cwd();
const BACKUP_ROOT = process.env.BACKUP_DIR
  ? path.resolve(process.env.BACKUP_DIR)
  : path.join(PROJECT_ROOT, "backups");
const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(PROJECT_ROOT, "uploads");
const DATABASE_URL = process.env.DATABASE_URL;

async function listSnapshots(root) {
  if (!fs.existsSync(root)) return [];
  const names = await fs.promises.readdir(root, { withFileTypes: true });
  const dirs = [];
  for (const e of names)
    if (e.isDirectory()) {
      const p = path.join(root, e.name);
      const st = await fs.promises.stat(p);
      dirs.push({ name: e.name, path: p, mtimeMs: st.mtimeMs });
    }
  dirs.sort((a, b) => b.mtimeMs - a.mtimeMs || b.name.localeCompare(a.name));
  return dirs;
}

async function ensureDir(p) {
  await fs.promises.mkdir(p, { recursive: true });
}

async function cpRecursive(src, dst) {
  if (!fs.existsSync(src)) return;
  if (fs.promises.cp)
    return fs.promises.cp(src, dst, { recursive: true, force: true });
  const st = await fs.promises.stat(src);
  if (st.isDirectory()) {
    await ensureDir(dst);
    const ents = await fs.promises.readdir(src, { withFileTypes: true });
    for (const e of ents)
      await cpRecursive(path.join(src, e.name), path.join(dst, e.name));
  } else {
    await ensureDir(path.dirname(dst));
    await fs.promises.copyFile(src, dst);
  }
}

exports.runRestore = async (req, res) => {
  try {
    if (!DATABASE_URL) throw new Error("DATABASE_URL tidak diset");
    const cfg = parse(DATABASE_URL);
    const env = { ...process.env, PGPASSWORD: cfg.password || "" };

    // pilih snapshot
    let baseDir = req.body?.backupPath
      ? path.resolve(req.body.backupPath)
      : null;
    if (!baseDir) {
      const last = (await listSnapshots(BACKUP_ROOT))[0];
      if (!last) throw new Error("Snapshot tidak ditemukan di BACKUP_ROOT");
      baseDir = last.path;
    }

    const dbSql = path.join(baseDir, "db.sql");
    if (!fs.existsSync(dbSql))
      throw new Error(`db.sql tidak ditemukan di ${dbSql}`);

    // reset schema
    await new Promise((ok, bad) => {
      const ps = spawn(
        "psql",
        [
          "-h",
          cfg.host || "localhost",
          "-p",
          String(cfg.port || 5432),
          "-U",
          cfg.user,
          "-d",
          cfg.database,
          "-c",
          "DROP SCHEMA public CASCADE; CREATE SCHEMA public;",
        ],
        { env }
      );
      let err = "";
      ps.stderr.on("data", (d) => (err += String(d || "")));
      ps.on("error", bad);
      ps.on("close", (c) =>
        c === 0 ? ok() : bad(new Error(`psql reset exited ${c}: ${err}`))
      );
    });

    // import db.sql
    await new Promise((ok, bad) => {
      const ps = spawn(
        "psql",
        [
          "-h",
          cfg.host || "localhost",
          "-p",
          String(cfg.port || 5432),
          "-U",
          cfg.user,
          "-d",
          cfg.database,
          "-f",
          dbSql,
        ],
        { env }
      );
      let err = "";
      ps.stderr.on("data", (d) => (err += String(d || "")));
      ps.on("error", bad);
      ps.on("close", (c) =>
        c === 0 ? ok() : bad(new Error(`psql restore exited ${c}: ${err}`))
      );
    });

    // restore uploads
    await ensureDir(UPLOAD_DIR);
    await cpRecursive(path.join(baseDir, "uploads"), UPLOAD_DIR);

    res.json({ ok: true, message: `Dipulihkan dari ${baseDir}` });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};
