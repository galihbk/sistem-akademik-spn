// server/src/controllers/jasmani_polda.controller.js
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const pool = require("../db/pool");

// ---------------- helpers ----------------
const toNum = (v) => {
  if (v == null || v === "") return null;
  const f = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(f) ? f : null;
};

const normKey = (s) => {
  let x = String(s || "")
    .replace(/[\r\n]+/g, " ")
    .replace(/["'`]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  x = x.replace(/(?:__+\d+|_\d+|\s+\d+)$/g, "");
  x = x.replace(/[^\w\sx×]/g, "");
  return x.trim();
};

function detectColumns(headersRaw) {
  const headers = headersRaw.map((h) => {
    const raw = h;
    const key = normKey(h);
    const base = key.replace(/(?:__+\d+|_\d+|\s+\d+)$/g, "");
    return { raw, key, base };
  });

  const want = {
    // identitas
    no_panda: [/^no\s*panda$/],
    nama: [/^nama$/],
    jenis_kelamin: [/^(jk|jenis\s*kelamin)$/],
    jalur_seleksi: [/^jalur\s*seleksi$/],
    angkatan: [/^angkatan$/],

    // antropometri (angka & teks)
    tb_cm: [/^(tb|tinggi(?:\s*badan)?)\s*cm$/],
    bb_kg: [/^(bb|berat(?:\s*badan)?)\s*kg$/],
    ratio_index: [/^ratio\s*index$/],
    somato_type: [/^somato\s*type$/],
    klasifikasi_tipe_tubuh: [/^klasifikasi\s*tipe\s*tubuh$/],
    nilai_tipe_tubuh: [/^nilai\s*tipe\s*tubuh$/],
    nilai_kelainan: [/^nilai\s*kelainan$/],
    nilai_terkecil: [/^nilai\s*terkecil$/],
    nilai_anthro: [/^nilai\s*anthro$/], // angka
    antro: [/^antro$/], // angka (rekap)
    antro_text: [/^antro\s*pembobotan$/], // teks kategori
    pencapaian_nbl: [/^pencapaian\s*nbl$/],

    // kesamaptaan & renang
    lari_12_menit: [/^lari\s*12\s*menit$|^kesamaptaan\s*a$/],
    pull_up_chinning: [/^pull\s*up\s*chinning$|^pull\s*up$|^chinning$/],
    sit_up: [/^sit\s*up$/],
    push_up: [/^push\s*up$/],
    shuttle_run: [/^shuttle\s*run$/],
    renang: [/^renang$/],

    // rekap
    nilai_b: [/^nilai\s*b$/],
    na_a_b: [/^na\s*a\+b$/],
    renang_x20: [/^renang\s*(x|×)\s*20$/],
    samapta_x80: [/^(samapta|kesamaptaan)\s*(x|×)\s*80$/],
    nilai_akhir: [/^nilai\s*akhir$|^total$|^nilai$/],
    ktgr: [/^ktgr$|^kategori$/],
    ket: [/^ket(eran)?$/],
    catatan: [/^catatan$/],
    paraf: [/^paraf$/],

    // optional mapper
    nosis: [/^nosis$|^no\s*sis$|^no\s*induk$/],
  };

  function findOne(regexList) {
    for (const h of headers) {
      for (const rx of regexList) {
        if (rx.test(h.key) || rx.test(h.base)) return h.raw;
      }
    }
    return null;
  }

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

// ✅ FIX: cast parameter ke text & gunakan COALESCE agar tipe jelas
async function findExistingRowId(client, payload) {
  if (payload.no_panda) {
    const r = await client.query(
      `SELECT id FROM jasmani_polda
       WHERE TRIM(COALESCE(no_panda,'')) = TRIM($1::text)
         AND (
           COALESCE($2::text,'') = '' OR
           TRIM(COALESCE(angkatan,'')) = TRIM($2::text)
         )
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
         AND (
           COALESCE($2::text,'') = '' OR
           TRIM(COALESCE(angkatan,'')) = TRIM($2::text)
         )
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
        bb_kg: toNum(cols.bb_kg ? raw[cols.bb_kg] : null),
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
        antro: toNum(cols.antro ? raw[cols.antro] : null),
        antro_text: cols.antro_text
          ? String(raw[cols.antro_text] ?? "").trim()
          : null,
        pencapaian_nbl: cols.pencapaian_nbl
          ? String(raw[cols.pencapaian_nbl] ?? "").trim()
          : null,

        lari_12_menit: toNum(
          cols.lari_12_menit ? raw[cols.lari_12_menit] : null
        ),
        pull_up_chinning: toNum(
          cols.pull_up_chinning ? raw[cols.pull_up_chinning] : null
        ),
        sit_up: toNum(cols.sit_up ? raw[cols.sit_up] : null),
        push_up: toNum(cols.push_up ? raw[cols.push_up] : null),
        shuttle_run: toNum(cols.shuttle_run ? raw[cols.shuttle_run] : null),
        renang: toNum(cols.renang ? raw[cols.renang] : null),

        nilai_b: toNum(cols.nilai_b ? raw[cols.nilai_b] : null),
        na_a_b: toNum(cols.na_a_b ? raw[cols.na_a_b] : null),
        renang_x20: toNum(cols.renang_x20 ? raw[cols.renang_x20] : null),
        samapta_x80: toNum(cols.samapta_x80 ? raw[cols.samapta_x80] : null),
        nilai_akhir: toNum(cols.nilai_akhir ? raw[cols.nilai_akhir] : null),
        ktgr: cols.ktgr ? String(raw[cols.ktgr] ?? "").trim() : null,
        ket: cols.ket ? String(raw[cols.ket] ?? "").trim() : null,
        catatan: cols.catatan ? String(raw[cols.catatan] ?? "").trim() : null,
        paraf: cols.paraf ? String(raw[cols.paraf] ?? "").trim() : null,

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
          bb_kg = COALESCE($7, bb_kg),
          ratio_index = COALESCE($8, ratio_index),
          somato_type = COALESCE($9, somato_type),
          klasifikasi_tipe_tubuh = COALESCE($10, klasifikasi_tipe_tubuh),
          nilai_tipe_tubuh = COALESCE($11, nilai_tipe_tubuh),
          nilai_kelainan = COALESCE($12, nilai_kelainan),
          nilai_terkecil = COALESCE($13, nilai_terkecil),
          nilai_anthro = COALESCE($14, nilai_anthro),
          antro = COALESCE($15, antro),
          antro_text = COALESCE($16, antro_text),
          pencapaian_nbl = COALESCE($17, pencapaian_nbl),

          lari_12_menit = COALESCE($18, lari_12_menit),
          pull_up_chinning = COALESCE($19, pull_up_chinning),
          sit_up = COALESCE($20, sit_up),
          push_up = COALESCE($21, push_up),
          shuttle_run = COALESCE($22, shuttle_run),
          renang = COALESCE($23, renang),

          nilai_b = COALESCE($24, nilai_b),
          na_a_b = COALESCE($25, na_a_b),
          renang_x20 = COALESCE($26, renang_x20),
          samapta_x80 = COALESCE($27, samapta_x80),
          nilai_akhir = COALESCE($28, nilai_akhir),
          ktgr = COALESCE($29, ktgr),
          ket = COALESCE($30, ket),
          catatan = COALESCE($31, catatan),
          paraf = COALESCE($32, paraf),

          angkatan = COALESCE($33, angkatan),
          sheet_name = COALESCE($34, sheet_name),
          sumber_file = COALESCE($35, sumber_file),
          updated_at = NOW()
        WHERE id = $36`;
        await client.query(q, [
          payload.siswa_id,
          payload.no_panda,
          payload.nama,
          payload.jenis_kelamin,
          payload.jalur_seleksi,

          payload.tb_cm,
          payload.bb_kg,
          payload.ratio_index,
          payload.somato_type,
          payload.klasifikasi_tipe_tubuh,
          payload.nilai_tipe_tubuh,
          payload.nilai_kelainan,
          payload.nilai_terkecil,
          payload.nilai_anthro,
          payload.antro,
          payload.antro_text,
          payload.pencapaian_nbl,

          payload.lari_12_menit,
          payload.pull_up_chinning,
          payload.sit_up,
          payload.push_up,
          payload.shuttle_run,
          payload.renang,

          payload.nilai_b,
          payload.na_a_b,
          payload.renang_x20,
          payload.samapta_x80,
          payload.nilai_akhir,
          payload.ktgr,
          payload.ket,
          payload.catatan,
          payload.paraf,

          payload.angkatan,
          payload.sheet_name,
          payload.sumber_file,
          existingId,
        ]);
        updated++;
      } else {
        const q = `INSERT INTO jasmani_polda (
          siswa_id, no_panda, nama, jenis_kelamin, jalur_seleksi,
          tb_cm, bb_kg, ratio_index, somato_type, klasifikasi_tipe_tubuh,
          nilai_tipe_tubuh, nilai_kelainan, nilai_terkecil, nilai_anthro, antro, antro_text, pencapaian_nbl,
          lari_12_menit, pull_up_chinning, sit_up, push_up, shuttle_run, renang,
          nilai_b, na_a_b, renang_x20, samapta_x80, nilai_akhir, ktgr, ket, catatan, paraf,
          angkatan, sheet_name, sumber_file
        ) VALUES (
          $1,$2,$3,$4,$5,
          $6,$7,$8,$9,$10,
          $11,$12,$13,$14,$15,$16,$17,
          $18,$19,$20,$21,$22,$23,
          $24,$25,$26,$27,$28,$29,$30,$31,$32,
          $33,$34,$35
        )`;
        await client.query(q, [
          payload.siswa_id,
          payload.no_panda,
          payload.nama,
          payload.jenis_kelamin,
          payload.jalur_seleksi,

          payload.tb_cm,
          payload.bb_kg,
          payload.ratio_index,
          payload.somato_type,
          payload.klasifikasi_tipe_tubuh,
          payload.nilai_tipe_tubuh,
          payload.nilai_kelainan,
          payload.nilai_terkecil,
          payload.nilai_anthro,
          payload.antro,
          payload.antro_text,
          payload.pencapaian_nbl,

          payload.lari_12_menit,
          payload.pull_up_chinning,
          payload.sit_up,
          payload.push_up,
          payload.shuttle_run,
          payload.renang,

          payload.nilai_b,
          payload.na_a_b,
          payload.renang_x20,
          payload.samapta_x80,
          payload.nilai_akhir,
          payload.ktgr,
          payload.ket,
          payload.catatan,
          payload.paraf,

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

// GET /jasmani-polda/rekap?q=&angkatan=&page=&limit=&sort_by=&sort_dir=
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
      bb_kg: r.bb_kg == null ? null : Number(r.bb_kg),
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
      antro: r.antro == null ? null : Number(r.antro),
      antro_text: r.antro_text || null,
      pencapaian_nbl: r.pencapaian_nbl,

      lari_12_menit: r.lari_12_menit == null ? null : Number(r.lari_12_menit),
      pull_up_chinning:
        r.pull_up_chinning == null ? null : Number(r.pull_up_chinning),
      sit_up: r.sit_up == null ? null : Number(r.sit_up),
      push_up: r.push_up == null ? null : Number(r.push_up),
      shuttle_run: r.shuttle_run == null ? null : Number(r.shuttle_run),
      renang: r.renang == null ? null : Number(r.renang),

      nilai_b: r.nilai_b == null ? null : Number(r.nilai_b),
      na_a_b: r.na_a_b == null ? null : Number(r.na_a_b),
      renang_x20: r.renang_x20 == null ? null : Number(r.renang_x20),
      samapta_x80: r.samapta_x80 == null ? null : Number(r.samapta_x80),
      nilai_akhir: r.nilai_akhir == null ? null : Number(r.nilai_akhir),
      ktgr: r.ktgr,
      ket: r.ket,
      catatan: r.catatan,
      paraf: r.paraf,

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
