// controllers/jasmani.controller.js
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const pool = require("../db/pool");

/* ========= Helpers ========= */

const toNum = (v) => {
  if (v == null || v === "") return null;
  const f = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(f) ? f : null;
};

const toInt = (v) => {
  if (v == null || v === "") return null;
  const n = parseInt(String(v).trim(), 10);
  return Number.isFinite(n) ? n : null;
};

// Normalisasi header: semua non-alfanumerik -> spasi; rapikan spasi
function normKey(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function detectColumns(headersRaw) {
  const headers = headersRaw.map((h) => ({ raw: h, key: normKey(h) }));

  const want = {
    nosis: [/^nosis$/, /^no\s*sis$/, /^no\s*induk$/],
    nama: [/^nama$/],
    tahap: [/^tahap$/],

    // Lari 12 menit
    lari_12_menit_ts: [/\blari\s*12\s*menit\b.*\bts\b/, /\blari12\b.*\bts\b/],
    lari_12_menit_rs: [/\blari\s*12\s*menit\b.*\brs\b/, /\blari12\b.*\brs\b/],

    // Sit up
    sit_up_ts: [/\bsit\s*up\b.*\bts\b/, /\bsitup\b.*\bts\b/],
    sit_up_rs: [/\bsit\s*up\b.*\brs\b/, /\bsitup\b.*\brs\b/],

    // Shuttle run
    shuttle_run_ts: [/\bshuttle\s*run\b.*\bts\b/, /\bshuttlerun\b.*\bts\b/],
    shuttle_run_rs: [/\bshuttle\s*run\b.*\brs\b/, /\bshuttlerun\b.*\brs\b/],

    // Push up
    push_up_ts: [/\bpush\s*up\b.*\bts\b/, /\bpushup\b.*\bts\b/],
    push_up_rs: [/\bpush\s*up\b.*\brs\b/, /\bpushup\b.*\brs\b/],

    // Pull up / chinning
    pull_up_ts: [
      /\bpull\s*up\b.*\bts\b/,
      /\bpullup\b.*\bts\b/,
      /\bchinning\b.*\bts\b/,
    ],
    pull_up_rs: [
      /\bpull\s*up\b.*\brs\b/,
      /\bpullup\b.*\brs\b/,
      /\bchinning\b.*\brs\b/,
    ],

    // Nilai akhir
    nilai_akhir: [
      /\brata\s*nilai\s*a\s*b\b/,
      /\brata\s*nilai\s*b\b/,
      /\bnilai\s*akhir\b/,
      /^\btotal\b$/,
      /^\bnilai\b$/,
    ],

    keterangan: [/^keterangan$/, /^ket$/],
  };

  function findOne(regexList) {
    for (const { raw, key } of headers) {
      for (const rx of regexList) if (rx.test(key)) return raw;
    }
    return null;
  }

  const map = {};
  for (const k of Object.keys(want)) map[k] = findOne(want[k]);

  if (process.env.NODE_ENV === "development") {
    console.log("[detectColumns] raw:", headersRaw);
    console.log(
      "[detectColumns] norm:",
      headers.map((h) => h.key)
    );
    console.log("[detectColumns] map:", map);
  }

  return map;
}

// Cache siswa_id by nosis/nama
async function resolveSiswaId(client, nosis, nama, caches) {
  const { byNosis, byNama } = caches;
  if (nosis) {
    const key = String(nosis).trim();
    if (byNosis.has(key)) return byNosis.get(key);
    const r = await client.query(
      `SELECT id FROM siswa WHERE TRIM(nosis)=TRIM($1) LIMIT 1`,
      [key]
    );
    const id = r.rowCount ? r.rows[0].id : null;
    byNosis.set(key, id);
    return id;
  }
  if (nama) {
    const key = String(nama).trim().toLowerCase();
    if (byNama.has(key)) return byNama.get(key);
    const r = await client.query(
      `SELECT id FROM siswa WHERE LOWER(TRIM(nama))=LOWER(TRIM($1)) LIMIT 1`,
      [key]
    );
    const id = r.rowCount ? r.rows[0].id : null;
    byNama.set(key, id);
    return id;
  }
  return null;
}

/* =========================================================
 * POST /import/jasmani_polda?tahap=1&dryRun=true
 * Body: multipart/form-data (file field: "file")
 * Sheet wajib: "REKAP"
 * ========================================================= */
exports.importExcel = async (req, res) => {
  if (!req.file)
    return res
      .status(400)
      .json({ ok: false, message: "File (field: file) wajib" });

  const filePath = req.file.path;
  const tahapQuery = toInt(req.query.tahap || null); // default tahap dari query

  const client = await pool.connect();
  try {
    const wb = XLSX.readFile(filePath, { cellDates: true });
    const ws = wb.Sheets["REKAP"];
    if (!ws) {
      return res
        .status(400)
        .json({ ok: false, message: "Sheet 'REKAP' tidak ditemukan" });
    }

    const rows = XLSX.utils.sheet_to_json(ws, { defval: null });
    if (!rows.length) {
      return res.json({
        ok: true,
        sheet: "REKAP",
        summary: { inserted: 0, updated: 0, skipped: 0, errors: 0 },
        errors: [],
      });
    }

    const headers = Object.keys(rows[0] || {});
    const cols = detectColumns(headers);

    if (!cols.nosis && !cols.nama) {
      return res.status(400).json({
        ok: false,
        message: "Kolom 'NOSIS' atau 'NAMA' wajib ada di sheet REKAP.",
      });
    }

    // (opsional) warning
    if (!cols.nilai_akhir) {
      console.warn(
        "[importExcel] Kolom Nilai Akhir (contoh: 'RATA NILAI A+B') tidak terdeteksi"
      );
    }
    if (!cols.lari_12_menit_ts && !cols.lari_12_menit_rs) {
      console.warn("[importExcel] Kolom Lari 12 Menit TS/RS tidak terdeteksi");
    }

    let inserted = 0,
      updated = 0,
      skipped = 0;
    const errors = [];
    const caches = { byNosis: new Map(), byNama: new Map() };

    const clientTx = client;
    await clientTx.query("BEGIN");

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];

      const nosis = cols.nosis ? raw[cols.nosis] : null;
      const nama = cols.nama ? raw[cols.nama] : null;

      const siswa_id = await resolveSiswaId(clientTx, nosis, nama, caches);
      if (!siswa_id) {
        skipped++;
        errors.push(
          `Baris ${i + 2}: siswa tidak ditemukan (NOSIS=${nosis || "-"}, NAMA=${
            nama || "-"
          })`
        );
        continue;
      }

      // tahap per baris (kolom) > query > null
      const tahapCell = cols.tahap ? raw[cols.tahap] : null;
      const tahap = toInt(tahapCell) ?? tahapQuery ?? null;

      // payload sesuai kolom DB
      const payload = {
        siswa_id,
        nosis: nosis ? String(nosis) : null,

        lari_12_menit_ts: toNum(
          cols.lari_12_menit_ts ? raw[cols.lari_12_menit_ts] : null
        ),
        lari_12_menit_rs: toNum(
          cols.lari_12_menit_rs ? raw[cols.lari_12_menit_rs] : null
        ),

        sit_up_ts: toNum(cols.sit_up_ts ? raw[cols.sit_up_ts] : null),
        sit_up_rs: toNum(cols.sit_up_rs ? raw[cols.sit_up_rs] : null),

        shuttle_run_ts: toNum(
          cols.shuttle_run_ts ? raw[cols.shuttle_run_ts] : null
        ),
        shuttle_run_rs: toNum(
          cols.shuttle_run_rs ? raw[cols.shuttle_run_rs] : null
        ),

        push_up_ts: toNum(cols.push_up_ts ? raw[cols.push_up_ts] : null),
        push_up_rs: toNum(cols.push_up_rs ? raw[cols.push_up_rs] : null),

        pull_up_ts: toNum(cols.pull_up_ts ? raw[cols.pull_up_ts] : null),
        pull_up_rs: toNum(cols.pull_up_rs ? raw[cols.pull_up_rs] : null),

        nilai_akhir: toNum(cols.nilai_akhir ? raw[cols.nilai_akhir] : null),
        keterangan: cols.keterangan
          ? String(raw[cols.keterangan] ?? "").trim()
          : null,

        tahap,
        sumber_file: path.basename(
          req.file.originalname || req.file.filename || ""
        ),
      };

      // cek existing (siswa_id + tahap)
      let existingId = null;
      if (payload.tahap != null) {
        const r = await clientTx.query(
          `SELECT id FROM jasmani_spn WHERE siswa_id = $1 AND tahap = $2 LIMIT 1`,
          [siswa_id, payload.tahap]
        );
        existingId = r.rowCount ? r.rows[0].id : null;
      }

      if (existingId) {
        const q = `UPDATE jasmani_spn SET
          lari_12_menit_ts = COALESCE($1,  lari_12_menit_ts),
          lari_12_menit_rs = COALESCE($2,  lari_12_menit_rs),
          sit_up_ts        = COALESCE($3,  sit_up_ts),
          sit_up_rs        = COALESCE($4,  sit_up_rs),
          shuttle_run_ts   = COALESCE($5,  shuttle_run_ts),
          shuttle_run_rs   = COALESCE($6,  shuttle_run_rs),
          push_up_ts       = COALESCE($7,  push_up_ts),
          push_up_rs       = COALESCE($8,  push_up_rs),
          pull_up_ts       = COALESCE($9,  pull_up_ts),
          pull_up_rs       = COALESCE($10, pull_up_rs),
          nilai_akhir      = COALESCE($11, nilai_akhir),
          keterangan       = COALESCE($12, keterangan),
          sumber_file      = COALESCE($13, sumber_file),
          updated_at       = NOW()
        WHERE id = $14`;
        await clientTx.query(q, [
          payload.lari_12_menit_ts,
          payload.lari_12_menit_rs,
          payload.sit_up_ts,
          payload.sit_up_rs,
          payload.shuttle_run_ts,
          payload.shuttle_run_rs,
          payload.push_up_ts,
          payload.push_up_rs,
          payload.pull_up_ts,
          payload.pull_up_rs,
          payload.nilai_akhir,
          payload.keterangan,
          payload.sumber_file,
          existingId,
        ]);
        updated++;
      } else {
        const q = `INSERT INTO jasmani_spn
          (siswa_id, nosis,
           lari_12_menit_ts, lari_12_menit_rs,
           sit_up_ts, sit_up_rs,
           shuttle_run_ts, shuttle_run_rs,
           push_up_ts, push_up_rs,
           pull_up_ts, pull_up_rs,
           nilai_akhir, keterangan, tahap, sumber_file)
         VALUES
          ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`;
        await clientTx.query(q, [
          payload.siswa_id,
          payload.nosis,
          payload.lari_12_menit_ts,
          payload.lari_12_menit_rs,
          payload.sit_up_ts,
          payload.sit_up_rs,
          payload.shuttle_run_ts,
          payload.shuttle_run_rs,
          payload.push_up_ts,
          payload.push_up_rs,
          payload.pull_up_ts,
          payload.pull_up_rs,
          payload.nilai_akhir,
          payload.keterangan,
          payload.tahap,
          payload.sumber_file,
        ]);
        inserted++;
      }
    }

    await clientTx.query("COMMIT");
    res.json({
      ok: true,
      sheet: "REKAP",
      summary: { inserted, updated, skipped, errors: errors.length },
      errors,
    });
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    console.error("[jasmani.importExcel]", e);
    res.status(500).json({ ok: false, message: e.message });
  } finally {
    client.release();
    fs.promises.unlink(filePath).catch(() => {});
  }
};

/* =========================================================
 * GET /jasmani/template?angkatan=55&tahap=1&jenis=DIKTUK
 *  - Sheet: REKAP
 *  - Header menyertakan kolom TAHAP
 *  - Jika ?tahap=... dikirim, isi default kolom TAHAP
 *  - Kalau ?jenis=... dikirim, filter siswa berdasarkan s.jenis_pendidikan
 * ========================================================= */
exports.template = async (req, res) => {
  try {
    const angkatan = (req.query.angkatan || "").trim();
    const jenis = (req.query.jenis || "").trim();
    const tahapDefault = toInt(req.query.tahap || null);

    const params = [];
    let where = "WHERE 1=1";
    if (angkatan) {
      params.push(angkatan);
      where += ` AND LOWER(TRIM(kelompok_angkatan)) = LOWER(TRIM($${params.length}))`;
    }
    if (jenis) {
      params.push(jenis);
      where += ` AND LOWER(TRIM(COALESCE(jenis_pendidikan,''))) = LOWER(TRIM($${params.length}))`;
    }

    const { rows } = await pool.query(
      `SELECT nosis, nama FROM siswa ${where} ORDER BY nama ASC`,
      params
    );

    const data = [
      [
        "NOSIS",
        "TAHAP",
        "LARI 12 MENIT (TS)",
        "LARI 12 MENIT (RS)",
        "SIT UP (TS)",
        "SIT UP (RS)",
        "SHUTTLE RUN (TS)",
        "SHUTTLE RUN (RS)",
        "PUSH UP (TS)",
        "PUSH UP (RS)",
        "PULL UP (TS)",
        "PULL UP (RS)",
        "RATA NILAI A+B",
        "KETERANGAN",
      ],
      ...rows.map((r) => [
        r.nosis || "",
        tahapDefault ?? "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "REKAP");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const fname = `Template_Jasmani_REKAP${
      angkatan ? `_Angkatan_${angkatan}` : ""
    }${jenis ? `_Jenis_${jenis}` : ""}${
      tahapDefault != null ? `_Tahap_${tahapDefault}` : ""
    }.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fname}"`);
    return res.send(buf);
  } catch (e) {
    console.error("[jasmani.template]", e);
    res.status(500).json({ ok: false, message: e.message });
  }
};

/* =========================================================
 * GET /jasmani/rekap?q=&angkatan=&jenis=&tahap=&page=&limit=&sort_by=&sort_dir=
 *   — Termasuk ranking (global/batalion/kompi/pleton) berdasar nilai_akhir
 * ========================================================= */
exports.rekap = async (req, res) => {
  try {
    const q = (req.query.q || "").trim().toLowerCase();
    const angkatan = (req.query.angkatan || "").trim();
    const jenis = (req.query.jenis || "").trim();
    const tahapParam = req.query.tahap;
    const tahap =
      tahapParam != null && tahapParam !== "" ? parseInt(tahapParam, 10) : null;

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

    const params = [];
    let where = "WHERE 1=1";
    if (q) {
      params.push(`%${q}%`);
      where += ` AND (LOWER(s.nama) LIKE $${params.length} OR LOWER(s.nosis) LIKE $${params.length})`;
    }
    let idxAngkatan = null;
    if (angkatan) {
      params.push(angkatan);
      idxAngkatan = params.length;
      where += ` AND LOWER(TRIM(s.kelompok_angkatan)) = LOWER(TRIM($${idxAngkatan}))`;
    }
    let idxJenis = null;
    if (jenis) {
      params.push(jenis);
      idxJenis = params.length;
      where += ` AND LOWER(TRIM(COALESCE(s.jenis_pendidikan,''))) = LOWER(TRIM($${idxJenis}))`;
    }

    // --------- TOTAL siswa match
    const { rows: cnt } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM siswa s ${where};`,
      params
    );
    const total = cnt?.[0]?.total ?? 0;

    // --------- SQL rekap + ranking
    const pageSql = `
      WITH all_match AS (
        SELECT
          s.id, s.nosis, s.nama, s.kelompok_angkatan, s.batalion, s.ton,
          UPPER(NULLIF(regexp_replace(s.ton, '[^A-Za-z].*', ''), '')) AS kompi,
          CASE WHEN regexp_replace(s.ton, '\\D+', '', 'g') <> ''
               THEN (regexp_replace(s.ton, '\\D+', '', 'g'))::int
               ELSE NULL END AS pleton
        FROM siswa s
        ${where}
      ),
      all_chosen AS (
        ${
          tahap !== null
            ? `
        SELECT DISTINCT ON (j.siswa_id)
          j.siswa_id, j.tahap,
          j.lari_12_menit_ts, j.lari_12_menit_rs,
          j.sit_up_ts, j.sit_up_rs,
          j.shuttle_run_ts, j.shuttle_run_rs,
          j.push_up_ts, j.push_up_rs,
          j.pull_up_ts, j.pull_up_rs,
          j.nilai_akhir, j.keterangan, j.sumber_file, j.updated_at
        FROM jasmani_spn j
        JOIN all_match m ON m.id = j.siswa_id
        WHERE j.tahap = ${Number.isFinite(tahap) ? tahap : "NULL"}
        ORDER BY j.siswa_id, j.updated_at DESC
        `
            : `
        (
          SELECT DISTINCT ON (j.siswa_id)
            j.siswa_id, j.tahap,
            j.lari_12_menit_ts, j.lari_12_menit_rs,
            j.sit_up_ts, j.sit_up_rs,
            j.shuttle_run_ts, j.shuttle_run_rs,
            j.push_up_ts, j.push_up_rs,
            j.pull_up_ts, j.pull_up_rs,
            j.nilai_akhir, j.keterangan, j.sumber_file, j.updated_at
          FROM jasmani_spn j
          JOIN all_match m ON m.id = j.siswa_id
          WHERE j.tahap IS NOT NULL
          ORDER BY j.siswa_id, j.tahap DESC, j.updated_at DESC
        )
        UNION ALL
        (
          SELECT x.*
          FROM (
            SELECT DISTINCT ON (j.siswa_id)
              j.siswa_id, j.tahap,
              j.lari_12_menit_ts, j.lari_12_menit_rs,
              j.sit_up_ts, j.sit_up_rs,
              j.shuttle_run_ts, j.shuttle_run_rs,
              j.push_up_ts, j.push_up_rs,
              j.pull_up_ts, j.pull_up_rs,
              j.nilai_akhir, j.keterangan, j.sumber_file, j.updated_at
            FROM jasmani_spn j
            JOIN all_match m ON m.id = j.siswa_id
            WHERE j.tahap IS NULL
            ORDER BY j.siswa_id, j.updated_at DESC
          ) x
          WHERE NOT EXISTS (
            SELECT 1 FROM jasmani_spn j2
            WHERE j2.siswa_id = x.siswa_id AND j2.tahap IS NOT NULL
          )
        )
        `
        }
      ),
      rank_base AS (
        SELECT
          am.id,
          am.batalion,
          am.kompi,
          am.pleton,
          CASE
            WHEN ac.nilai_akhir IS NOT NULL THEN ac.nilai_akhir::numeric
            ELSE NULL::numeric
          END AS score
        FROM all_match am
        LEFT JOIN all_chosen ac ON ac.siswa_id = am.id
      ),
      ranked AS (
        SELECT
          rb.*,
          COUNT(score) FILTER (WHERE score IS NOT NULL)                          OVER ()                            AS total_global,
          COUNT(score) FILTER (WHERE score IS NOT NULL)                          OVER (PARTITION BY batalion)       AS total_batalion,
          COUNT(score) FILTER (WHERE score IS NOT NULL)                          OVER (PARTITION BY kompi)          AS total_kompi,
          COUNT(score) FILTER (WHERE score IS NOT NULL)                          OVER (PARTITION BY kompi, pleton)  AS total_pleton,
          (RANK() OVER (ORDER BY score DESC NULLS LAST))                                                             AS rank_global,
          (RANK() OVER (PARTITION BY batalion      ORDER BY score DESC NULLS LAST))                                  AS rank_batalion,
          (RANK() OVER (PARTITION BY kompi         ORDER BY score DESC NULLS LAST))                                  AS rank_kompi,
          (RANK() OVER (PARTITION BY kompi, pleton ORDER BY score DESC NULLS LAST))                                  AS rank_pleton
        FROM rank_base rb
      ),
      match AS (
        SELECT * FROM all_match
        ORDER BY ${sortBy} ${sortDir}
        LIMIT ${limit} OFFSET ${offset}
      ),
      chosen AS (
        SELECT ac.* FROM all_chosen ac
        JOIN match m ON m.id = ac.siswa_id
      )
      SELECT
        m.*,
        c.tahap,
        c.lari_12_menit_ts, c.lari_12_menit_rs,
        c.sit_up_ts, c.sit_up_rs,
        c.shuttle_run_ts, c.shuttle_run_rs,
        c.push_up_ts, c.push_up_rs,
        c.pull_up_ts, c.pull_up_rs,
        c.nilai_akhir, c.keterangan, c.sumber_file, c.updated_at,
        (r.rank_global)::int   AS rank_global,   r.total_global,
        (r.rank_batalion)::int AS rank_batalion, r.total_batalion,
        (r.rank_kompi)::int    AS rank_kompi,    r.total_kompi,
        (r.rank_pleton)::int   AS rank_pleton,   r.total_pleton
      FROM match m
      LEFT JOIN chosen c ON c.siswa_id = m.id
      LEFT JOIN ranked r ON r.id = m.id
      ORDER BY ${sortBy} ${sortDir};
    `;

    const { rows } = await pool.query(pageSql, params);

    const items = rows.map((r) => ({
      nosis: r.nosis,
      nama: r.nama,
      kelompok_angkatan: r.kelompok_angkatan,
      batalion: r.batalion,
      ton: r.ton,
      kompi: r.kompi,
      pleton: r.pleton,
      tahap: r.tahap,
      nilai: {
        lari_12_menit: {
          ts: numOrNull(r.lari_12_menit_ts),
          rs: numOrNull(r.lari_12_menit_rs),
        },
        sit_up: { ts: numOrNull(r.sit_up_ts), rs: numOrNull(r.sit_up_rs) },
        shuttle_run: {
          ts: numOrNull(r.shuttle_run_ts),
          rs: numOrNull(r.shuttle_run_rs),
        },
        push_up: { ts: numOrNull(r.push_up_ts), rs: numOrNull(r.push_up_rs) },
        pull_up: { ts: numOrNull(r.pull_up_ts), rs: numOrNull(r.pull_up_rs) },
      },
      nilai_akhir: r.nilai_akhir == null ? null : Number(r.nilai_akhir),
      keterangan: r.keterangan || null,
      sumber_file: r.sumber_file || null,
      updated_at: r.updated_at || null,
      rank: {
        global: { pos: r.rank_global ?? null, total: r.total_global ?? null },
        batalion: {
          pos: r.rank_batalion ?? null,
          total: r.total_batalion ?? null,
        },
        kompi: { pos: r.rank_kompi ?? null, total: r.total_kompi ?? null },
        pleton: { pos: r.rank_pleton ?? null, total: r.total_pleton ?? null },
      },
    }));

    res.json({
      items,
      total,
      page,
      limit,
      sort_by: sortBy,
      sort_dir: sortDir,
      q,
      angkatan,
      jenis,
      tahap,
    });
  } catch (e) {
    console.error("[jasmani.rekap] error:", e);
    res
      .status(500)
      .json({ ok: false, message: "Gagal mengambil rekap jasmani" });
  }
};

function numOrNull(v) {
  return v == null ? null : Number(v);
}
