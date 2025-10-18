// controllers/mapel.controller.js
const fs = require("fs");
const XLSX = require("xlsx");
const pool = require("../db/pool");

// ---------------- utils impor ----------------
function normMapel(s) {
  return String(s || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\s*\/\s*/g, "/");
}
function toNum(v) {
  if (v == null || v === "") return null;
  const f = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(f) ? f : null;
}
async function resolveSiswaId(client, nosis, nama, cache) {
  const { siswaByNosis, siswaByNama } = cache;
  if (nosis) {
    const key = String(nosis).trim();
    if (siswaByNosis.has(key)) return siswaByNosis.get(key);
    const r = await client.query(
      `SELECT id FROM siswa WHERE TRIM(nosis)=TRIM($1) LIMIT 1`,
      [key]
    );
    const id = r.rowCount ? r.rows[0].id : null;
    siswaByNosis.set(key, id);
    return id;
  }
  if (nama) {
    const key = String(nama).trim().toLowerCase();
    if (siswaByNama.has(key)) return siswaByNama.get(key);
    const r = await client.query(
      `SELECT id FROM siswa WHERE LOWER(TRIM(nama))=LOWER(TRIM($1)) LIMIT 1`,
      [key]
    );
    const id = r.rowCount ? r.rows[0].id : null;
    siswaByNama.set(key, id);
    return id;
  }
  return null;
}

// ---------------- import Rek_mat ----------------
exports.importExcel = async (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ ok: false, message: "File (field: file) wajib" });
  }

  const filePath = req.file.path;
  const client = await pool.connect();
  try {
    const wb = XLSX.readFile(filePath, { cellDates: true });
    const ws = wb.Sheets["Rek_mat"];
    if (!ws) {
      return res
        .status(400)
        .json({ ok: false, message: "Sheet 'Rek_mat' tidak ditemukan" });
    }

    const rows = XLSX.utils.sheet_to_json(ws, { defval: null });
    if (!rows.length) {
      return res.json({
        ok: true,
        sheet: "Rek_mat",
        summary: { inserted: 0, updated: 0, skipped: 0, errors: 0 },
        headers: [],
      });
    }

    // deteksi PERTEMUAN N
    const headers = Object.keys(rows[0] || {});
    const pertemuanHeaders = [];
    for (const h of headers) {
      const m = String(h).match(/^\s*pertemuan\s*(\d+)\s*$/i);
      if (m) {
        const num = parseInt(m[1], 10);
        if (Number.isInteger(num) && num > 0)
          pertemuanHeaders.push({ key: h, num });
      }
    }
    if (!pertemuanHeaders.length) {
      return res.status(400).json({
        ok: false,
        message:
          "Tidak ditemukan kolom 'PERTEMUAN N'. Pastikan header seperti 'PERTEMUAN 1', 'PERTEMUAN 2', dst.",
      });
    }

    let inserted = 0,
      updated = 0,
      skipped = 0;
    const errors = [];

    const cache = {
      siswaByNosis: new Map(),
      siswaByNama: new Map(),
    };

    await client.query("BEGIN");

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];

      const nosis = raw.NOSIS ?? raw.Nosis ?? raw.Nos ?? raw.nosis ?? null;
      const nama = raw.NAMA ?? raw.Nama ?? raw.nama ?? null;
      const mapel = normMapel(raw.MAPEL ?? raw.Mapel ?? raw.mapel ?? "");

      const siswa_id = await resolveSiswaId(client, nosis, nama, cache);
      if (!siswa_id) {
        skipped++;
        errors.push(
          `Baris ${i + 2}: siswa tidak ditemukan (NOSIS=${nosis || "-"}, NAMA=${
            nama || "-"
          })`
        );
        continue;
      }

      for (const { key, num } of pertemuanHeaders) {
        const nilai = toNum(raw[key]);
        if (nilai == null) continue;

        try {
          const q = `
            INSERT INTO mapel (siswa_id, mapel, pertemuan, nilai, updated_at)
            VALUES ($1,$2,$3,$4, NOW())
            ON CONFLICT (siswa_id, mapel, pertemuan)
            DO UPDATE SET nilai = EXCLUDED.nilai, updated_at = NOW()
            RETURNING (xmax = 0) AS inserted;
          `;
          const r = await client.query(q, [
            siswa_id,
            mapel || "MAPEL",
            num,
            String(nilai),
          ]);
          if (r.rows[0].inserted) inserted++;
          else updated++;
        } catch (e) {
          errors.push(`Baris ${i + 2} "${mapel}" P${num}: ${e.message}`);
        }
      }
    }

    await client.query("COMMIT");
    res.json({
      ok: true,
      sheet: "Rek_mat",
      headers: pertemuanHeaders.map((h) => h.key),
      summary: { inserted, updated, skipped, errors: errors.length },
      errors,
    });
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    console.error("[mapel.importExcel]", e);
    res.status(500).json({ ok: false, message: e.message });
  } finally {
    fs.promises.unlink(filePath).catch(() => {});
    client.release();
  }
};

// ---------------- rekap (mirip mental.rekap) ----------------
exports.rekap = async (req, res) => {
  try {
    const q = (req.query.q || "").trim().toLowerCase();
    const angkatan = (req.query.angkatan || "").trim();
    const mapel = (req.query.mapel || "").trim();
    const jenis = (req.query.jenis || req.query.jenis_pendidikan || "").trim(); // ← Jenis Pendidikan

    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit || "20", 10), 1),
      200
    );
    const offset = (page - 1) * limit;

    const sortBy = ["nama", "nosis"].includes(
      (req.query.sort_by || "").toLowerCase()
    )
      ? req.query.sort_by.toLowerCase()
      : "nama";
    const sortDir = ["asc", "desc"].includes(
      (req.query.sort_dir || "").toLowerCase()
    )
      ? req.query.sort_dir.toLowerCase()
      : "asc";

    // ---- WHERE untuk siswa (count + page CTE match)
    const params = [];
    let whereS = "WHERE 1=1";
    if (q) {
      params.push(`%${q}%`);
      const idx = params.length;
      whereS += ` AND (LOWER(s.nama) LIKE $${idx} OR LOWER(s.nosis) LIKE $${idx})`;
    }

    let angkatanIdx = null;
    if (angkatan) {
      params.push(angkatan);
      angkatanIdx = params.length;
      // ⬇️ case/trim-insensitive
      whereS += ` AND LOWER(TRIM(s.kelompok_angkatan)) = LOWER(TRIM($${angkatanIdx}))`;
    }

    let jenisIdx = null;
    if (jenis) {
      params.push(jenis);
      jenisIdx = params.length;
      // ⬇️ case/trim-insensitive
      whereS += ` AND LOWER(TRIM(COALESCE(s.jenis_pendidikan,''))) = LOWER(TRIM($${jenisIdx}))`;
    }

    // ---- hitung total siswa match
    const { rows: cntRows } = await pool.query(
      `SELECT COUNT(*)::int AS total
       FROM siswa s
       ${whereS};`,
      params
    );
    const total = cntRows?.[0]?.total ?? 0;

    // ---- siapkan index placeholder utk mapel (ditambahkan paling akhir)
    const mapelIdx = mapel ? params.length + 1 : null;

    // ---- Query page (rekap + rank)
    const pageSql = `
      WITH match AS (
        SELECT
          s.id, s.nosis, s.nama, s.kelompok_angkatan,
          s.batalion, s.ton,
          UPPER(NULLIF(regexp_replace(s.ton, '[^A-Za-z].*', ''), '')) AS kompi,
          CASE WHEN regexp_replace(s.ton, '\\D+', '', 'g') <> ''
               THEN (regexp_replace(s.ton, '\\D+', '', 'g'))::int
               ELSE NULL END AS pleton
        FROM siswa s
        ${whereS}
        ORDER BY ${sortBy} ${sortDir}
        LIMIT ${limit} OFFSET ${offset}
      ),
      mapel_num AS (
        SELECT
          m.siswa_id,
          m.mapel,
          m.pertemuan,
          m.nilai,
          CASE
            WHEN regexp_replace(COALESCE(m.nilai, ''), ',', '.', 'g') ~ '^[0-9]+(\\.[0-9]+)?$'
              THEN regexp_replace(m.nilai, ',', '.', 'g')::numeric
            ELSE NULL::numeric
          END AS nilai_num
        FROM mapel m
        JOIN match mm ON mm.id = m.siswa_id
        ${mapel ? `WHERE LOWER(m.mapel) = LOWER($${mapelIdx})` : ""}
      ),
      agg AS (
        SELECT
          mm.id, mm.nosis, mm.nama, mm.kelompok_angkatan,
          mm.batalion, mm.ton, mm.kompi, mm.pleton,
          COALESCE(SUM(n.nilai_num), 0)::numeric AS sum_num,
          AVG(n.nilai_num)                       AS avg_num,
          COALESCE(
            jsonb_object_agg((n.pertemuan)::text, n.nilai ORDER BY n.pertemuan)
              FILTER (WHERE n.pertemuan IS NOT NULL),
            '{}'::jsonb
          ) AS weeks
        FROM match mm
        LEFT JOIN mapel_num n ON n.siswa_id = mm.id
        GROUP BY mm.id, mm.nosis, mm.nama, mm.kelompok_angkatan, mm.batalion, mm.ton, mm.kompi, mm.pleton
      ),
      base AS (
        -- basis ranking utk 1 angkatan/jenis (opsional)
        SELECT
          s.id, s.batalion,
          UPPER(NULLIF(regexp_replace(s.ton, '[^A-Za-z].*', ''), '')) AS kompi,
          CASE WHEN regexp_replace(s.ton, '\\D+', '', 'g') <> ''
               THEN (regexp_replace(s.ton, '\\D+', '', 'g'))::int
               ELSE NULL END AS pleton,
          AVG(
            CASE
              WHEN regexp_replace(COALESCE(m.nilai, ''), ',', '.', 'g') ~ '^[0-9]+(\\.[0-9]+)?$'
                THEN regexp_replace(m.nilai, ',', '.', 'g')::numeric
              ELSE NULL::numeric
            END
          ) AS avg_all
        FROM siswa s
        LEFT JOIN mapel m ON m.siswa_id = s.id
        ${
          angkatan || jenis
            ? `WHERE ${[
                angkatan
                  ? `LOWER(TRIM(s.kelompok_angkatan)) = LOWER(TRIM($${angkatanIdx}))`
                  : null,
                jenis
                  ? `LOWER(TRIM(COALESCE(s.jenis_pendidikan,''))) = LOWER(TRIM($${jenisIdx}))`
                  : null,
              ]
                .filter(Boolean)
                .join(" AND ")}`
            : ""
        }
${
  mapel
    ? `${
        angkatan || jenis ? "AND" : "WHERE"
      } LOWER(m.mapel) = LOWER($${mapelIdx})`
    : ""
}

        GROUP BY s.id, s.batalion, s.ton
      ),
      ranked AS (
        SELECT
          b.*,
          COUNT(avg_all) FILTER (WHERE avg_all IS NOT NULL) OVER ()                           AS total_global,
          COUNT(avg_all) FILTER (WHERE avg_all IS NOT NULL) OVER (PARTITION BY batalion)      AS total_batalion,
          COUNT(avg_all) FILTER (WHERE avg_all IS NOT NULL) OVER (PARTITION BY kompi)         AS total_kompi,
          COUNT(avg_all) FILTER (WHERE avg_all IS NOT NULL) OVER (PARTITION BY kompi, pleton) AS total_pleton,
          (RANK() OVER (ORDER BY avg_all DESC NULLS LAST))                                     AS rank_global,
          (RANK() OVER (PARTITION BY batalion ORDER BY avg_all DESC NULLS LAST))               AS rank_batalion,
          (RANK() OVER (PARTITION BY kompi ORDER BY avg_all DESC NULLS LAST))                  AS rank_kompi,
          (RANK() OVER (PARTITION BY kompi, pleton ORDER BY avg_all DESC NULLS LAST))          AS rank_pleton
        FROM base b
      )
      SELECT
        a.*, (r.rank_global)::int   AS rank_global,   r.total_global,
            (r.rank_batalion)::int AS rank_batalion, r.total_batalion,
            (r.rank_kompi)::int    AS rank_kompi,    r.total_kompi,
            (r.rank_pleton)::int   AS rank_pleton,   r.total_pleton
      FROM agg a
      LEFT JOIN ranked r ON r.id = a.id
      ORDER BY ${sortBy} ${sortDir};
    `;

    const pageParams = mapel ? [...params, mapel] : params;
    const { rows } = await pool.query(pageSql, pageParams);

    const items = rows.map((r) => ({
      nosis: r.nosis,
      nama: r.nama,
      kelompok_angkatan: r.kelompok_angkatan,
      batalion: r.batalion,
      ton: r.ton,
      kompi: r.kompi,
      pleton: r.pleton,
      sum: r.sum_num == null ? 0 : Number(r.sum_num),
      avg: r.avg_num == null ? null : Number(r.avg_num),
      rank: {
        global: { pos: r.rank_global ?? null, total: r.total_global ?? null },
        batalion: {
          pos: r.rank_batalion ?? null,
          total: r.total_batalion ?? null,
        },
        kompi: { pos: r.rank_kompi ?? null, total: r.total_kompi ?? null },
        pleton: { pos: r.rank_pleton ?? null, total: r.total_pleton ?? null },
      },
      weeks: r.weeks || {},
    }));

    // ---- daftar pertemuan (ikut filter angkatan/jenis/mapel)
    const weeksConds = [];
    const weeksParams = [];
    if (angkatan) {
      weeksParams.push(angkatan);
      weeksConds.push(
        `LOWER(TRIM(s.kelompok_angkatan)) = LOWER(TRIM($${weeksParams.length}))`
      );
    }
    if (jenis) {
      weeksParams.push(jenis);
      weeksConds.push(
        `LOWER(TRIM(COALESCE(s.jenis_pendidikan,''))) = LOWER(TRIM($${weeksParams.length}))`
      );
    }
    if (mapel) {
      weeksParams.push(mapel);
      weeksConds.push(`LOWER(m.mapel) = LOWER($${weeksParams.length})`);
    }

    const weeksSql = `
      SELECT ARRAY(
        SELECT DISTINCT m.pertemuan
        FROM mapel m
        JOIN siswa s ON s.id = m.siswa_id
        ${weeksConds.length ? `WHERE ${weeksConds.join(" AND ")}` : ""}
        ORDER BY m.pertemuan
      ) AS weeks;
    `;
    const weeksArr =
      (await pool.query(weeksSql, weeksParams)).rows[0]?.weeks || [];

    res.json({
      items,
      total,
      page,
      limit,
      sort_by: sortBy,
      sort_dir: sortDir,
      q,
      angkatan,
      mapel,
      jenis,
      weeks: weeksArr,
    });
  } catch (e) {
    console.error("[mapel.rekap] error:", e);
    res.status(500).json({ message: "Gagal mengambil rekap mapel" });
  }
};

// ---------------- referensi daftar mapel ----------------
exports.refMapel = async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT ARRAY(
         SELECT DISTINCT mapel FROM mapel WHERE COALESCE(TRIM(mapel),'') <> ''
         ORDER BY mapel
       ) AS items;`
    );
    res.json({ items: rows?.[0]?.items || [] });
  } catch (e) {
    res.json({ items: [] });
  }
};
