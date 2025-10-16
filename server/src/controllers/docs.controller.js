// server/src/controllers/docs.controller.js
const path = require("path");
const fs = require("fs");
const pool = require("../db/pool");

/** Samakan dengan app.js */
const PROJECT_ROOT = process.env.PROJECT_ROOT
  ? path.resolve(process.env.PROJECT_ROOT)
  : path.resolve(process.cwd());

const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(PROJECT_ROOT, "uploads");

/** Hapus file aman: hanya jika path berada di dalam UPLOAD_DIR */
async function unlinkIfSafe(filePath) {
  if (!filePath) return;
  try {
    const abs = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(PROJECT_ROOT, filePath);
    const inside = abs.startsWith(UPLOAD_DIR + path.sep) || abs === UPLOAD_DIR;
    if (!inside) return; // abaikan path mencurigakan
    await fs.promises.unlink(abs).catch(() => {});
  } catch {
    // ignore
  }
}

/**
 * Factory controller untuk tabel dokumen sederhana (bk | pelanggaran).
 * GET /bk?page=1&limit=20&sort_dir=desc&q=adhade
 */
function makeListController(tableName) {
  return async function list(req, res) {
    try {
      const q = String(req.query.q || "")
        .trim()
        .toLowerCase();
      const page = Math.max(parseInt(req.query.page || "1", 10), 1);
      const limit = Math.min(
        Math.max(parseInt(req.query.limit || "20", 10), 1),
        200
      );
      const offset = (page - 1) * limit;
      const sortDir = ["asc", "desc"].includes(
        String(req.query.sort_dir || "").toLowerCase()
      )
        ? req.query.sort_dir.toLowerCase()
        : "desc";

      const params = [];
      let where = "WHERE 1=1";

      if (q) {
        params.push(`%${q}%`);
        where += ` AND (LOWER(d.judul) LIKE $${params.length}
                    OR LOWER(s.nama) LIKE $${params.length}
                    OR LOWER(s.nosis) LIKE $${params.length})`;
      }

      const orderClause = `
        ORDER BY d.created_at ${sortDir} NULLS LAST,
                 d.id ${sortDir}
      `;

      const sqlData = `
        SELECT
          d.id, d.judul, d.tanggal, d.file_path, d.created_at,
          s.id AS siswa_id, s.nosis, s.nama, s.nik
        FROM ${tableName} d
        JOIN siswa s ON s.id = d.siswa_id
        ${where}
        ${orderClause}
        LIMIT ${limit} OFFSET ${offset};
      `;

      const sqlCount = `
        SELECT COUNT(*)::int AS total
        FROM ${tableName} d
        JOIN siswa s ON s.id = d.siswa_id
        ${where};
      `;

      const [data, count] = await Promise.all([
        pool.query(sqlData, params),
        pool.query(sqlCount, params),
      ]);

      res.json({
        items: data.rows,
        total: count.rows[0].total,
        page,
        limit,
        sort_dir: sortDir,
        q,
      });
    } catch (e) {
      console.error(`[${tableName}.list]`, e);
      res.status(500).json({ message: `Gagal mengambil data ${tableName}` });
    }
  };
}

/**
 * DELETE /bk/:id atau /pelanggaran/:id
 * Hapus baris + file fisik (kalau ada)
 */
function makeDeleteController(tableName) {
  return async function del(req, res) {
    const id = Number(req.params.id) || 0;
    if (!id) {
      return res.status(400).json({ ok: false, message: "ID tidak valid" });
    }
    try {
      // ambil file_path dulu lalu hapus baris
      const { rows, rowCount } = await pool.query(
        `DELETE FROM ${tableName} WHERE id=$1 RETURNING file_path`,
        [id]
      );
      if (!rowCount) {
        return res
          .status(404)
          .json({ ok: false, message: "Data tidak ditemukan" });
      }
      const filePath = rows[0]?.file_path || null;
      await unlinkIfSafe(filePath);
      return res.json({ ok: true, deleted_id: id });
    } catch (e) {
      console.error(`[${tableName}.delete]`, e);
      return res
        .status(500)
        .json({ ok: false, message: `Gagal menghapus data ${tableName}` });
    }
  };
}

/** (Masih kamu punya; biarkan) */
async function listPrestasi(req, res) {
  const q = (req.query.q || "").trim().toLowerCase();
  const page = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(
    Math.max(parseInt(req.query.limit || "20", 10), 1),
    200
  );
  const offset = (page - 1) * limit;
  const sortDir =
    (req.query.sort_dir || "desc").toLowerCase() === "asc" ? "asc" : "desc";

  const params = [];
  let where = "WHERE 1=1";
  if (q) {
    params.push(`%${q}%`);
    where += ` AND (LOWER(p.judul) LIKE $${params.length} OR LOWER(s.nama) LIKE $${params.length} OR LOWER(s.nosis) LIKE $${params.length})`;
  }

  const sql = `
    SELECT p.id, p.judul, p.tingkat, p.deskripsi, p.tanggal, p.created_at, p.file_path,
           s.nosis, s.nama
    FROM prestasi p
    JOIN siswa s ON s.id = p.siswa_id
    ${where}
    ORDER BY COALESCE(p.created_at, NOW()) ${sortDir}, p.id ${sortDir}
    LIMIT ${limit} OFFSET ${offset};
  `;
  const sqlCount = `
    SELECT COUNT(*)::int AS total
    FROM prestasi p
    JOIN siswa s ON s.id = p.siswa_id
    ${where};
  `;
  const [data, cnt] = await Promise.all([
    pool.query(sql, params),
    pool.query(sqlCount, params),
  ]);
  res.json({
    items: data.rows,
    total: cnt.rows[0].total,
    page,
    limit,
    sort_dir: sortDir,
    q,
  });
}

module.exports = {
  makeListController,
  makeDeleteController,
  listPrestasi,
};
