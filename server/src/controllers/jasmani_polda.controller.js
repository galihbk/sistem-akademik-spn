// server/src/controllers/jasmani_polda.controller.js
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const pool = require("../db/pool");

// ---------------- helpers ----------------
const toNum = (v) => {
  if (v == null) return null;
  const s = String(v).trim();
  if (s === "" || /^[-–—\s]+$/.test(s)) return null;
  if (/[A-Za-z]/.test(s)) return null;
  const f = parseFloat(s.replace(",", "."));
  return Number.isFinite(f) ? f : null;
};

const normKey = (s) => {
  let x = String(s || "")
    .replace(/[\r\n]+/g, " ") // newline -> spasi
    .replace(/["'`]+/g, " ") // kutip -> spasi
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  x = x.replace(/[×x]/g, "x"); // normalisasi x/×
  x = x.replace(/\+\s*/g, "+"); // "a + b" -> "a+b"
  x = x.replace(/(?:__+\d+|_\d+|\s+\d+)$/g, "");
  x = x.replace(/[^\w\s+]/g, "");
  x = x.replace(/\btibuh\b/g, "tubuh"); // typo umum
  return x.trim();
};

function detectColumns(headersRaw) {
  const headers = headersRaw.map((h) => {
    const raw = h;
    const key = normKey(h);
    const base = key.replace(/(?:__+\d+|_\d+|\s+\d+)$/g, "");
    return { raw, key, base };
  });

  function findOne(regexList) {
    for (const h of headers) {
      for (const rx of regexList) {
        if (rx.test(h.key) || rx.test(h.base)) return h.raw;
      }
    }
    return null;
  }

  const want = {
    // identitas
    no_panda: [/^no\s*panda$/],
    nama: [/^nama$/],
    jenis_kelamin: [/^(jk|jenis\s*kelamin)$/],
    jalur_seleksi: [/^jalur\s*seleksi$/],
    angkatan: [/^angkatan$/],
    nosis: [/^nosis$|^no\s*sis$|^no\s*induk$/],

    // antropometri
    tb_cm: [/^(tb|tinggi(?:\s*badan)?)\s*cm$/],
    tb_inchi: [/^tb\s*inchi$|^tb\s*inch$/],
    bb_kg: [/^(bb|berat(?:\s*badan)?)\s*kg$/],
    bb_akbb: [/^bb\s*akbb$/],
    ratio_index: [/^ratio\s*index$/],
    somato_type: [/^somato\s*type$/],
    klasifikasi_tipe_tubuh: [/^klasifikasi\s*tipe\s*tubuh$/],
    nilai_tipe_tubuh: [/^nilai\s*tipe\s*tubuh$/],
    nilai_kelainan: [/^nilai\s*kelainan$/],
    nilai_terkecil: [/^nilai\s*terkecil$/],
    nilai_anthro: [/^nilai\s*anthro$/],
    // kolom teks pembobotan & antro mentah
    antro_pembobotan: [/^anthro\s*pembobotan$|^antro\s*pembobotan$/],
    antro: [/^antro$/],
    pencapaian_nbl: [/^pencapaian\s*nbl$/],

    // renang detail & total
    renang_jarak: [/^renang\s*jarak$/],
    renang_waktu: [/^renang\s*waktu$/],
    renang_nilai: [/^renang\s*nilai$/],
    renang: [/^renang$/],

    // kesamaptaan (label)
    kesamaptaan_hga: [/^kesamaptaan\s*hga$/],
    kesamaptaan_nga: [/^kesamaptaan\s*nga$/],
    kesamaptaan_a_b: [
      /^kesamaptaan\s*a\+b$/,
      /^kesamaptaan\s*a\s*\+\s*b$/,
      /^kesamaptaan\s*a\s*b$/,
    ],

    // per komponen (HGB/NGB) — angka
    pull_up_hgb1: [/^pull\s*up\s*hgb1$/],
    pull_up_ngb1: [/^pull\s*up\s*ngb1$/],
    sit_up_hgb2: [/^sit\s*up\s*hgb2$/],
    sit_up_ngb2: [/^sit\s*up\s*ngb2$/],
    push_up_hgb3: [/^push\s*up\s*hgb3$/],
    push_up_ngb3: [/^push\s*up\s*ngb3$/],
    shuttle_run_hgb4: [/^shuttle\s*run\s*hgb4$/],
    shuttle_run_ngb4: [/^shuttle\s*run\s*ngb4$/],

    // rekap
    nilai_b: [/^nilai\s*b$/],
    na_a_b: [
      /^na\s*a\+b$/,
      /^na\s*a\s*\+\s*b$/,
      /^na\s*a\s*b$/,
      /^nilai\s*a\+b$/,
      /^nilai\s*a\s*\+\s*b$/,
      /^kesamaptaan\s*a\+b$/,
      /^kesamaptaan\s*a\s*\+\s*b$/,
      /^na\s*a\b.*\bb$/,
    ],
    renang_x20: [/^renang\s*x\s*20$/],
    samapta_x80: [/^(samapta|kesamaptaan)\s*x\s*80$/],
    nilai_akhir: [/^nilai\s*akhir$|^total$|^nilai$/],
    ktgr: [/^ktgr$|^kategori$/],
    ket: [/^ket(eran)?$/],
    catatan: [/^catatan$/],
  };

  const map = {};
  for (const k of Object.keys(want)) {
    map[k] = findOne(want[k]);
  }
  return map;
}

async function resolveSiswaId(client, nosis, nama) {
  if (nosis) {
    const key = String(nosis).trim();
    const r = await client.query(
      `SELECT id FROM siswa WHERE TRIM(nosis)=TRIM($1) LIMIT 1`,
      [key]
    );
    if (r.rowCount) return r.rows[0].id;
  }
  if (nama) {
    const key = String(nama).trim().toLowerCase();
    const r = await client.query(
      `SELECT id FROM siswa WHERE LOWER(TRIM(nama))=LOWER(TRIM($1)) LIMIT 1`,
      [key]
    );
    if (r.rowCount) return r.rows[0].id;
  }
  return null;
}

async function findExistingRowId(client, payload) {
  if (payload.no_panda) {
    const r = await client.query(
      `SELECT id FROM jasmani_polda
       WHERE TRIM(COALESCE(no_panda,'')) = TRIM($1::text)
         AND (COALESCE($2::text,'') = '' OR TRIM(COALESCE(angkatan,'')) = TRIM($2::text))
       ORDER BY updated_at DESC
       LIMIT 1`,
      [payload.no_panda, payload.angkatan]
    );
    if (r.rowCount) return r.rows[0].id;
  }
  if (payload.nama) {
    const r = await client.query(
      `SELECT id FROM jasmani_polda
       WHERE LOWER(TRIM(COALESCE(nama,''))) = LOWER(TRIM($1::text))
         AND (COALESCE($2::text,'') = '' OR TRIM(COALESCE(angkatan,'')) = TRIM($2::text))
       ORDER BY updated_at DESC
       LIMIT 1`,
      [payload.nama, payload.angkatan]
    );
    if (r.rowCount) return r.rows[0].id;
  }
  return null;
}

// ============================ CONTROLLERS ===============================
exports.importExcel = async (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ ok: false, message: "File (field: file) wajib" });
  }

  const filePath = req.file.path;
  const sheetName =
    (req.body.sheet_name || req.query.sheet_name || "Sheet1").trim() ||
    "Sheet1";
  const metaDefault = {
    angkatan: (req.body.angkatan || req.query.angkatan || "").trim() || null,
  };

  const client = await pool.connect();
  try {
    const wb = XLSX.readFile(filePath, { cellDates: true });
    const ws = wb.Sheets[sheetName];
    if (!ws) {
      return res
        .status(400)
        .json({ ok: false, message: `Sheet '${sheetName}' tidak ditemukan` });
    }

    const rows = XLSX.utils.sheet_to_json(ws, { defval: null });
    if (!rows.length) {
      return res.json({
        ok: true,
        sheet: sheetName,
        summary: { inserted: 0, updated: 0, skipped: 0, errors: 0 },
        errors: [],
      });
    }

    const headers = Object.keys(rows[0] || {});
    const cols = detectColumns(headers);

    let inserted = 0,
      updated = 0,
      skipped = 0;
    const errors = [];

    await client.query("BEGIN");

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];

      const no_panda = cols.no_panda
        ? String(raw[cols.no_panda] ?? "").trim()
        : null;
      const nama = cols.nama ? String(raw[cols.nama] ?? "").trim() : null;
      const jenis_kelamin = cols.jenis_kelamin
        ? String(raw[cols.jenis_kelamin] ?? "").trim()
        : null;
      const jalur_seleksi = cols.jalur_seleksi
        ? String(raw[cols.jalur_seleksi] ?? "").trim()
        : null;

      const angkatan =
        (cols.angkatan && raw[cols.angkatan] != null
          ? String(raw[cols.angkatan]).trim()
          : metaDefault.angkatan) || null;

      const payload = {
        no_panda: no_panda || null,
        nama: nama || null,
        jenis_kelamin: jenis_kelamin || null,
        jalur_seleksi: jalur_seleksi || null,

        tb_cm: toNum(cols.tb_cm ? raw[cols.tb_cm] : null),
        tb_inchi: toNum(cols.tb_inchi ? raw[cols.tb_inchi] : null),
        bb_kg: toNum(cols.bb_kg ? raw[cols.bb_kg] : null),
        bb_akbb: toNum(cols.bb_akbb ? raw[cols.bb_akbb] : null),
        ratio_index: cols.ratio_index
          ? String(raw[cols.ratio_index] ?? "").trim()
          : null,
        somato_type: cols.somato_type
          ? String(raw[cols.somato_type] ?? "").trim()
          : null,
        klasifikasi_tipe_tubuh: cols.klasifikasi_tipe_tubuh
          ? String(raw[cols.klasifikasi_tipe_tubuh] ?? "").trim()
          : null,
        nilai_tipe_tubuh: toNum(
          cols.nilai_tipe_tubuh ? raw[cols.nilai_tipe_tubuh] : null
        ),
        nilai_kelainan: toNum(
          cols.nilai_kelainan ? raw[cols.nilai_kelainan] : null
        ),
        nilai_terkecil: toNum(
          cols.nilai_terkecil ? raw[cols.nilai_terkecil] : null
        ),
        nilai_anthro: toNum(cols.nilai_anthro ? raw[cols.nilai_anthro] : null),

        antro_pembobotan: cols.antro_pembobotan
          ? String(raw[cols.antro_pembobotan] ?? "").trim()
          : null,
        antro: cols.antro ? String(raw[cols.antro] ?? "").trim() : null,
        pencapaian_nbl: cols.pencapaian_nbl
          ? String(raw[cols.pencapaian_nbl] ?? "").trim()
          : null,

        renang_jarak: toNum(cols.renang_jarak ? raw[cols.renang_jarak] : null),
        renang_waktu: toNum(cols.renang_waktu ? raw[cols.renang_waktu] : null),
        renang_nilai: toNum(cols.renang_nilai ? raw[cols.renang_nilai] : null),
        renang: toNum(cols.renang ? raw[cols.renang] : null),

        kesamaptaan_hga: cols.kesamaptaan_hga
          ? String(raw[cols.kesamaptaan_hga] ?? "").trim() || null
          : null,
        kesamaptaan_nga: cols.kesamaptaan_nga
          ? String(raw[cols.kesamaptaan_nga] ?? "").trim() || null
          : null,
        kesamaptaan_a_b: toNum(
          cols.kesamaptaan_a_b ? raw[cols.kesamaptaan_a_b] : null
        ),

        pull_up_hgb1: toNum(cols.pull_up_hgb1 ? raw[cols.pull_up_hgb1] : null),
        pull_up_ngb1: toNum(cols.pull_up_ngb1 ? raw[cols.pull_up_ngb1] : null),
        sit_up_hgb2: toNum(cols.sit_up_hgb2 ? raw[cols.sit_up_hgb2] : null),
        sit_up_ngb2: toNum(cols.sit_up_ngb2 ? raw[cols.sit_up_ngb2] : null),
        push_up_hgb3: toNum(cols.push_up_hgb3 ? raw[cols.push_up_hgb3] : null),
        push_up_ngb3: toNum(cols.push_up_ngb3 ? raw[cols.push_up_ngb3] : null),
        shuttle_run_hgb4: toNum(
          cols.shuttle_run_hgb4 ? raw[cols.shuttle_run_hgb4] : null
        ),
        shuttle_run_ngb4: toNum(
          cols.shuttle_run_ngb4 ? raw[cols.shuttle_run_ngb4] : null
        ),

        nilai_b: toNum(cols.nilai_b ? raw[cols.nilai_b] : null),
        na_a_b: toNum(cols.na_a_b ? raw[cols.na_a_b] : null),

        renang_x20: toNum(cols.renang_x20 ? raw[cols.renang_x20] : null),
        samapta_x80: toNum(cols.samapta_x80 ? raw[cols.samapta_x80] : null),
        nilai_akhir: toNum(cols.nilai_akhir ? raw[cols.nilai_akhir] : null),
        ktgr: cols.ktgr ? String(raw[cols.ktgr] ?? "").trim() : null,
        ket: cols.ket ? String(raw[cols.ket] ?? "").trim() : null,
        catatan: cols.catatan ? String(raw[cols.catatan] ?? "").trim() : null,

        angkatan,
        sheet_name: sheetName,
        sumber_file: path.basename(
          req.file.originalname || req.file.filename || ""
        ),
      };

      const nosis = cols.nosis ? raw[cols.nosis] : null;
      payload.siswa_id = await resolveSiswaId(client, nosis, nama);

      const existingId = await findExistingRowId(client, payload);

      if (existingId) {
        const q = `UPDATE jasmani_polda SET
  siswa_id = COALESCE($1, siswa_id),
  no_panda = COALESCE($2, no_panda),
  nama = COALESCE($3, nama),
  jenis_kelamin = COALESCE($4, jenis_kelamin),
  jalur_seleksi = COALESCE($5, jalur_seleksi),

  tb_cm = COALESCE($6, tb_cm),
  tb_inchi = COALESCE($7, tb_inchi),
  bb_kg = COALESCE($8, bb_kg),
  bb_akbb = COALESCE($9, bb_akbb),
  ratio_index = COALESCE($10, ratio_index),
  somato_type = COALESCE($11, somato_type),
  klasifikasi_tipe_tubuh = COALESCE($12, klasifikasi_tipe_tubuh),
  nilai_tipe_tubuh = COALESCE($13, nilai_tipe_tubuh),
  nilai_kelainan = COALESCE($14, nilai_kelainan),
  nilai_terkecil = COALESCE($15, nilai_terkecil),
  nilai_anthro = COALESCE($16, nilai_anthro),

  antro_pembobotan = COALESCE($17, antro_pembobotan),
  antro = COALESCE($18, antro),
  pencapaian_nbl = COALESCE($19, pencapaian_nbl),

  renang_jarak = COALESCE($20, renang_jarak),
  renang_waktu = COALESCE($21, renang_waktu),
  renang_nilai = COALESCE($22, renang_nilai),
  renang = COALESCE($23, renang),

  kesamaptaan_hga = COALESCE($24, kesamaptaan_hga),
  kesamaptaan_nga = COALESCE($25, kesamaptaan_nga),
  kesamaptaan_a_b = COALESCE($26, kesamaptaan_a_b),

  pull_up_hgb1 = COALESCE($27, pull_up_hgb1),
  pull_up_ngb1 = COALESCE($28, pull_up_ngb1),
  sit_up_hgb2 = COALESCE($29, sit_up_hgb2),
  sit_up_ngb2 = COALESCE($30, sit_up_ngb2),
  push_up_hgb3 = COALESCE($31, push_up_hgb3),
  push_up_ngb3 = COALESCE($32, push_up_ngb3),
  shuttle_run_hgb4 = COALESCE($33, shuttle_run_hgb4),
  shuttle_run_ngb4 = COALESCE($34, shuttle_run_ngb4),

  nilai_b = COALESCE($35, nilai_b),
  na_a_b = COALESCE($36, na_a_b),
  renang_x20 = COALESCE($37, renang_x20),
  samapta_x80 = COALESCE($38, samapta_x80),
  nilai_akhir = COALESCE($39, nilai_akhir),
  ktgr = COALESCE($40, ktgr),
  ket = COALESCE($41, ket),
  catatan = COALESCE($42, catatan),

  angkatan = COALESCE($43, angkatan),
  sheet_name = COALESCE($44, sheet_name),
  sumber_file = COALESCE($45, sumber_file),
  updated_at = NOW()
WHERE id = $46`;
        await client.query(q, [
          payload.siswa_id,
          payload.no_panda,
          payload.nama,
          payload.jenis_kelamin,
          payload.jalur_seleksi,

          payload.tb_cm,
          payload.tb_inchi,
          payload.bb_kg,
          payload.bb_akbb,
          payload.ratio_index,
          payload.somato_type,
          payload.klasifikasi_tipe_tubuh,
          payload.nilai_tipe_tubuh,
          payload.nilai_kelainan,
          payload.nilai_terkecil,
          payload.nilai_anthro,

          payload.antro_pembobotan,
          payload.antro,
          payload.pencapaian_nbl,

          payload.renang_jarak,
          payload.renang_waktu,
          payload.renang_nilai,
          payload.renang,

          payload.kesamaptaan_hga,
          payload.kesamaptaan_nga,
          payload.kesamaptaan_a_b,

          payload.pull_up_hgb1,
          payload.pull_up_ngb1,
          payload.sit_up_hgb2,
          payload.sit_up_ngb2,
          payload.push_up_hgb3,
          payload.push_up_ngb3,
          payload.shuttle_run_hgb4,
          payload.shuttle_run_ngb4,

          payload.nilai_b,
          payload.na_a_b,
          payload.renang_x20,
          payload.samapta_x80,
          payload.nilai_akhir,
          payload.ktgr,
          payload.ket,
          payload.catatan,

          payload.angkatan,
          payload.sheet_name,
          payload.sumber_file,
          existingId,
        ]);
        updated++;
      } else {
        const q = `INSERT INTO jasmani_polda (
  siswa_id, no_panda, nama, jenis_kelamin, jalur_seleksi,
  tb_cm, tb_inchi, bb_kg, bb_akbb, ratio_index, somato_type, klasifikasi_tipe_tubuh,
  nilai_tipe_tubuh, nilai_kelainan, nilai_terkecil, nilai_anthro,
  antro_pembobotan, antro, pencapaian_nbl,
  renang_jarak, renang_waktu, renang_nilai, renang,
  kesamaptaan_hga, kesamaptaan_nga, kesamaptaan_a_b,
  pull_up_hgb1, pull_up_ngb1, sit_up_hgb2, sit_up_ngb2, push_up_hgb3, push_up_ngb3, shuttle_run_hgb4, shuttle_run_ngb4,
  nilai_b, na_a_b, renang_x20, samapta_x80, nilai_akhir, ktgr, ket, catatan,
  angkatan, sheet_name, sumber_file
) VALUES (
  $1,$2,$3,$4,$5,
  $6,$7,$8,$9,$10,$11,$12,
  $13,$14,$15,$16,
  $17,$18,$19,
  $20,$21,$22,$23,
  $24,$25,$26,
  $27,$28,$29,$30,$31,$32,$33,$34,
  $35,$36,$37,$38,$39,$40,$41,$42,
  $43,$44,$45
)`;
        await client.query(q, [
          payload.siswa_id,
          payload.no_panda,
          payload.nama,
          payload.jenis_kelamin,
          payload.jalur_seleksi,

          payload.tb_cm,
          payload.tb_inchi,
          payload.bb_kg,
          payload.bb_akbb,
          payload.ratio_index,
          payload.somato_type,
          payload.klasifikasi_tipe_tubuh,

          payload.nilai_tipe_tubuh,
          payload.nilai_kelainan,
          payload.nilai_terkecil,
          payload.nilai_anthro,

          payload.antro_pembobotan,
          payload.antro,
          payload.pencapaian_nbl,

          payload.renang_jarak,
          payload.renang_waktu,
          payload.renang_nilai,
          payload.renang,

          payload.kesamaptaan_hga,
          payload.kesamaptaan_nga,
          payload.kesamaptaan_a_b,

          payload.pull_up_hgb1,
          payload.pull_up_ngb1,
          payload.sit_up_hgb2,
          payload.sit_up_ngb2,
          payload.push_up_hgb3,
          payload.push_up_ngb3,
          payload.shuttle_run_hgb4,
          payload.shuttle_run_ngb4,

          payload.nilai_b,
          payload.na_a_b,
          payload.renang_x20,
          payload.samapta_x80,
          payload.nilai_akhir,
          payload.ktgr,
          payload.ket,
          payload.catatan,

          payload.angkatan,
          payload.sheet_name,
          payload.sumber_file,
        ]);
        inserted++;
      }
    }

    await client.query("COMMIT");
    res.json({
      ok: true,
      sheet: sheetName,
      summary: { inserted, updated, skipped, errors: errors.length },
      errors,
    });
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    console.error("[jasmani_polda.importExcel] error:", e);
    res.status(500).json({ ok: false, message: e.message });
  } finally {
    client.release();
    fs.promises.unlink(filePath).catch(() => {});
  }
};

// GET /jasmani-polda/rekap
exports.rekap = async (req, res) => {
  try {
    const q = (req.query.q || "").trim().toLowerCase();
    const angkatan = (req.query.angkatan || "").trim();

    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit || "20", 10), 1),
      200
    );
    const offset = (page - 1) * limit;

    const sortable = new Set(["nama", "no_panda", "angkatan"]);
    const sortBy = sortable.has((req.query.sort_by || "").toLowerCase())
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
      where += ` AND (LOWER(COALESCE(jp.nama,'')) LIKE $${params.length}
                    OR LOWER(COALESCE(jp.no_panda,'')) LIKE $${params.length})`;
    }
    if (angkatan) {
      params.push(angkatan);
      where += ` AND TRIM(COALESCE(jp.angkatan,'')) = TRIM($${params.length})`;
    }

    const { rows: cnt } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM jasmani_polda jp ${where};`,
      params
    );
    const total = cnt?.[0]?.total ?? 0;

    const sql = `SELECT jp.* FROM jasmani_polda jp
                 ${where}
                 ORDER BY ${sortBy} ${sortDir}
                 LIMIT ${limit} OFFSET ${offset};`;
    const { rows } = await pool.query(sql, params);

    const items = rows.map((r) => ({
      id: r.id,
      siswa_id: r.siswa_id,
      no_panda: r.no_panda,
      nama: r.nama,
      jenis_kelamin: r.jenis_kelamin,
      jk: r.jenis_kelamin,
      jalur_seleksi: r.jalur_seleksi,
      angkatan: r.angkatan,

      tb_cm: r.tb_cm == null ? null : Number(r.tb_cm),
      tb_inchi: r.tb_inchi == null ? null : Number(r.tb_inchi),
      bb_kg: r.bb_kg == null ? null : Number(r.bb_kg),
      bb_akbb: r.bb_akbb == null ? null : Number(r.bb_akbb),
      ratio_index: r.ratio_index,
      somato_type: r.somato_type,
      klasifikasi_tipe_tubuh: r.klasifikasi_tipe_tubuh,
      nilai_tipe_tubuh:
        r.nilai_tipe_tubuh == null ? null : Number(r.nilai_tipe_tubuh),
      nilai_kelainan:
        r.nilai_kelainan == null ? null : Number(r.nilai_kelainan),
      nilai_terkecil:
        r.nilai_terkecil == null ? null : Number(r.nilai_terkecil),
      nilai_anthro: r.nilai_anthro == null ? null : Number(r.nilai_anthro),

      antro_pembobotan: r.antro_pembobotan || null,
      antro: r.antro || null,
      pencapaian_nbl: r.pencapaian_nbl,

      renang_jarak: r.renang_jarak == null ? null : Number(r.renang_jarak),
      renang_waktu: r.renang_waktu == null ? null : Number(r.renang_waktu),
      renang_nilai: r.renang_nilai == null ? null : Number(r.renang_nilai),
      renang: r.renang == null ? null : Number(r.renang),

      kesamaptaan_hga: r.kesamaptaan_hga || null,
      kesamaptaan_nga: r.kesamaptaan_nga || null,
      kesamaptaan_a_b:
        r.kesamaptaan_a_b == null ? null : Number(r.kesamaptaan_a_b),

      pull_up_hgb1: r.pull_up_hgb1 == null ? null : Number(r.pull_up_hgb1),
      pull_up_ngb1: r.pull_up_ngb1 == null ? null : Number(r.pull_up_ngb1),
      sit_up_hgb2: r.sit_up_hgb2 == null ? null : Number(r.sit_up_hgb2),
      sit_up_ngb2: r.sit_up_ngb2 == null ? null : Number(r.sit_up_ngb2),
      push_up_hgb3: r.push_up_hgb3 == null ? null : Number(r.push_up_hgb3),
      push_up_ngb3: r.push_up_ngb3 == null ? null : Number(r.push_up_ngb3),
      shuttle_run_hgb4:
        r.shuttle_run_hgb4 == null ? null : Number(r.shuttle_run_hgb4),
      shuttle_run_ngb4:
        r.shuttle_run_ngb4 == null ? null : Number(r.shuttle_run_ngb4),

      nilai_b: r.nilai_b == null ? null : Number(r.nilai_b),
      na_a_b: r.na_a_b == null ? null : Number(r.na_a_b),
      renang_x20: r.renang_x20 == null ? null : Number(r.renang_x20),
      samapta_x80: r.samapta_x80 == null ? null : Number(r.samapta_x80),
      nilai_akhir: r.nilai_akhir == null ? null : Number(r.nilai_akhir),
      ktgr: r.ktgr,
      ket: r.ket,
      catatan: r.catatan,

      sheet_name: r.sheet_name,
      sumber_file: r.sumber_file,
      created_at: r.created_at,
      updated_at: r.updated_at,
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
    });
  } catch (e) {
    console.error("[jasmani_polda.rekap]", e);
    res
      .status(500)
      .json({ ok: false, message: "Gagal mengambil rekap jasmani POLDA" });
  }
};

exports.setSiswa = async (req, res) => {
  try {
    const id = Number(req.params.id) || 0;
    if (!id)
      return res.status(400).json({ ok: false, message: "ID tidak valid" });

    const raw = (req.body && req.body.siswa_id) ?? null;
    const siswa_id =
      raw === null || raw === ""
        ? null
        : Number.isFinite(Number(raw))
        ? Number(raw)
        : NaN;

    if (Number.isNaN(siswa_id)) {
      return res
        .status(400)
        .json({ ok: false, message: "siswa_id harus angka atau null" });
    }

    const { rowCount: existJP } = await pool.query(
      `SELECT 1 FROM jasmani_polda WHERE id=$1 LIMIT 1`,
      [id]
    );
    if (!existJP) {
      return res
        .status(404)
        .json({ ok: false, message: "Data jasmani_polda tidak ditemukan" });
    }

    if (siswa_id !== null) {
      const { rowCount: existS } = await pool.query(
        `SELECT 1 FROM siswa WHERE id=$1 LIMIT 1`,
        [siswa_id]
      );
      if (!existS) {
        return res
          .status(404)
          .json({ ok: false, message: "Siswa tidak ditemukan" });
      }
    }

    const { rowCount, rows } = await pool.query(
      `UPDATE jasmani_polda
         SET siswa_id = $1,
             updated_at = NOW()
       WHERE id = $2
       RETURNING id, siswa_id`,
      [siswa_id, id]
    );

    if (!rowCount) {
      return res
        .status(500)
        .json({ ok: false, message: "Gagal memperbarui siswa_id" });
    }

    return res.json({ ok: true, item: rows[0] });
  } catch (e) {
    console.error("[jasmani_polda.setSiswa]", e);
    return res
      .status(500)
      .json({ ok: false, message: "Gagal mengubah mapping siswa" });
  }
};
