// server/src/controllers/jasmani_polda.controller.js
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");
const pool = require("../db/pool");

// ------------------------- helpers -------------------------
const toNum = (v) => {
  if (v == null || v === "") return null;
  const s = String(v).replace(",", ".");
  const f = parseFloat(s);
  return Number.isFinite(f) ? f : null;
};

// Normalisasi header: huruf kecil, hapus simbol aneh, rapikan spasi/newline
const normKey = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/\r?\n+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[^\w\sx×+']/g, "")
    .trim();

// Pemetaan header -> kolom yang kita butuhkan
function detectColumns(headersRaw) {
  const headers = headersRaw.map((h) => ({ raw: h, key: normKey(h) }));

  const want = {
    // identitas (wajib minimal nama/no_panda)
    no_panda: [/^panda$|^no panda$/], // kolom header kamu: "PANDA" / "NO PANDA"
    nama: [/^nama$/],
    jk: [/^jk$|^jenis kelamin$/],
    jalur_seleksi: [/^jalur seleksi$/],

    // opsional untuk resolve siswa_id
    nosis: [/^nosis$|^no sis$|^no induk$/],

    // meta untuk kunci pencocokan
    angkatan: [/^angkatan$/],

    // (masih boleh ada di meta, tapi TIDAK dipakai untuk kunci)
    tahun: [/^tahun$/],
    polda: [/^polda$/],

    // ANTHRO
    tb_cm: [/^tb cm$|^tinggi badan$|^tb$/],
    bb_kg: [/^bb kg$|^berat badan$|^bb$/],
    ratio_index: [/^ratio index$/],
    somato_type: [/^somato type$/],
    klasifikasi_tipe_tubuh: [
      /^klasifikasi tipe tibuh$|^klasifikasi tipe tubuh$/,
    ],
    nilai_tipe_tubuh: [/^nilai tipe tubuh$/],
    nilai_kelainan: [/^nilai kelainan$/],
    nilai_terkecil: [/^nilai terkecil$/],
    nilai_anthro: [/^nilai anthro$|^anthro$/],
    pencapaian_nbl: [/^pencapaian nbl$/],

    // RENANG
    renang_nilai: [/^renang nilai$/],
    renang_x20: [/^renang x20$|^renang ×20$/],

    // KESAMAPTAAN A (kalau tersedia)
    lari_12_menit: [/^lari 12 menit$|^lari 12$/],

    // KESAMAPTAAN B → pakai nilai (NGB)
    pull_up_ngb1: [/^pull up ngb1$/],
    sit_up_ngb2: [/^sit up ngb2$/],
    push_up_ngb3: [/^push up ngb3$/],
    shuttle_run_ngb4: [/^shuttle run ngb4$/],

    // rekap / agregat
    nilai_b: [/^nilai b$/],
    na_a_b: [/^na a\+b$|^na a\+ b$|^na a b$/],
    antro: [/^antro$/],
    samapta_x80: [/^samapta x80$|^kesamaptaan x80$|^samapta ×80$/],
    nilai_akhir: [/^nilai akhir$|^total$|^nilai$/],
    ktgr: [/^ktgr$|^kategori$/],
    ket: [/^ket$|^keterangan$/],
    catatan: [/^catatan$/],
  };

  function findOne(regexList) {
    for (const { raw, key } of headers) {
      for (const rx of regexList) if (rx.test(key)) return raw;
    }
    return null;
  }

  const map = {};
  for (const k of Object.keys(want)) map[k] = findOne(want[k]);
  return map;
}

// resolve siswa_id opsional; biarkan NULL kalau tak ketemu
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

// === KUNCI PENCARIAN EXISTING: (no_panda, angkatan) SAJA ===
async function findExistingRowId(client, payload) {
  if (payload.no_panda && payload.angkatan) {
    const r = await client.query(
      `SELECT id FROM jasmani_polda
       WHERE TRIM(COALESCE(no_panda,''))=TRIM($1)
         AND TRIM(COALESCE(angkatan,''))=TRIM($2)
       ORDER BY updated_at DESC
       LIMIT 1`,
      [payload.no_panda, payload.angkatan]
    );
    if (r.rowCount) return r.rows[0].id;
  }
  // fallback ringan: kalau no_panda kosong, coba (nama, angkatan)
  if (payload.nama && payload.angkatan) {
    const r = await client.query(
      `SELECT id FROM jasmani_polda
       WHERE LOWER(TRIM(COALESCE(nama,'')))=LOWER(TRIM($1))
         AND TRIM(COALESCE(angkatan,''))=TRIM($2)
       ORDER BY updated_at DESC
       LIMIT 1`,
      [payload.nama, payload.angkatan]
    );
    if (r.rowCount) return r.rows[0].id;
  }
  return null;
}

// ===========================================================
// POST /jasmani-polda/import-excel
// body/query opsional: sheet_name (default "Sheet1"), angkatan, tahun, polda, panda
// (tahun/polda/panda tetap disimpan sebagai meta, TIDAK dipakai sebagai kunci)
// ===========================================================
exports.importExcel = async (req, res) => {
  if (!req.file)
    return res
      .status(400)
      .json({ ok: false, message: "File (field: file) wajib" });

  const filePath = req.file.path;
  const sheetName =
    (req.body.sheet_name || req.query.sheet_name || "Sheet1").trim() ||
    "Sheet1";

  // meta default dari query/body (kalau kolom di sheet kosong)
  const metaDefault = {
    angkatan: (req.body.angkatan || req.query.angkatan || "").trim() || null, // PENTING utk kunci
    tahun: (req.body.tahun || req.query.tahun || "").trim() || null, // meta
    polda: (req.body.polda || req.query.polda || "").trim() || null, // meta
    panda: (req.body.panda || req.query.panda || "").trim() || null, // meta
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
      updated = 0;
    const errors = [];

    await client.query("BEGIN");

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];

      // identitas dasar
      const no_panda = cols.no_panda
        ? String(raw[cols.no_panda] ?? "").trim()
        : null;
      const nama = cols.nama ? String(raw[cols.nama] ?? "").trim() : null;
      const jk = cols.jk ? String(raw[cols.jk] ?? "").trim() : null;
      const jalur_seleksi = cols.jalur_seleksi
        ? String(raw[cols.jalur_seleksi] ?? "").trim()
        : null;

      // ANGGAPKAN ANGKATAN WAJIB untuk merge; sumber: kolom "ANGKATAN" jika ada, kalau tidak pakai metaDefault
      const angkatan =
        (cols.angkatan && raw[cols.angkatan] != null
          ? String(raw[cols.angkatan]).trim()
          : metaDefault.angkatan) || null;

      // meta lain: simpan saja (tidak mempengaruhi kunci)
      const tahun =
        (cols.tahun && raw[cols.tahun] != null
          ? String(raw[cols.tahun]).trim()
          : metaDefault.tahun) || null;

      const polda =
        (cols.polda && raw[cols.polda] != null
          ? String(raw[cols.polda]).trim()
          : metaDefault.polda) || null;

      const panda_meta = metaDefault.panda || null;

      const payload = {
        no_panda: no_panda || null,
        nama: nama || null,
        jk: jk || null,
        jalur_seleksi: jalur_seleksi || null,

        // ANTHRO
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
        pencapaian_nbl: cols.pencapaian_nbl
          ? String(raw[cols.pencapaian_nbl] ?? "").trim()
          : null,

        // renang
        renang: toNum(cols.renang_nilai ? raw[cols.renang_nilai] : null),
        renang_x20: toNum(cols.renang_x20 ? raw[cols.renang_x20] : null),

        // kesamaptaan A (kalau ada)
        lari_12_menit: toNum(
          cols.lari_12_menit ? raw[cols.lari_12_menit] : null
        ),

        // kesamaptaan B → NGB (nilai)
        pull_up_chinning: toNum(
          cols.pull_up_ngb1 ? raw[cols.pull_up_ngb1] : null
        ),
        sit_up: toNum(cols.sit_up_ngb2 ? raw[cols.sit_up_ngb2] : null),
        push_up: toNum(cols.push_up_ngb3 ? raw[cols.push_up_ngb3] : null),
        shuttle_run: toNum(
          cols.shuttle_run_ngb4 ? raw[cols.shuttle_run_ngb4] : null
        ),

        // rekap
        nilai_b: toNum(cols.nilai_b ? raw[cols.nilai_b] : null),
        na_a_b: toNum(cols.na_a_b ? raw[cols.na_a_b] : null),
        antro: toNum(cols.antro ? raw[cols.antro] : null),
        samapta_x80: toNum(cols.samapta_x80 ? raw[cols.samapta_x80] : null),
        nilai_akhir: toNum(cols.nilai_akhir ? raw[cols.nilai_akhir] : null),
        ktgr: cols.ktgr ? String(raw[cols.ktgr] ?? "").trim() : null,
        ket: cols.ket ? String(raw[cols.ket] ?? "").trim() : null,
        catatan: cols.catatan ? String(raw[cols.catatan] ?? "").trim() : null,
        paraf: null,

        // meta (bukan kunci)
        polda,
        panda: panda_meta,
        tahun,
        angkatan,
        sheet_name: sheetName,
        sumber_file: path.basename(
          req.file.originalname || req.file.filename || ""
        ),
      };

      // resolve siswa (opsional)
      const nosis = cols.nosis ? raw[cols.nosis] : null;
      payload.siswa_id = await resolveSiswaId(client, nosis, nama);

      // pastikan ada angkatan untuk bisa merge
      if (!payload.angkatan) {
        errors.push(
          `Baris ${i + 2}: kolom/param ANGKATAN kosong — baris dilewati.`
        );
        continue;
      }
      if (!payload.no_panda && !payload.nama) {
        errors.push(`Baris ${i + 2}: NO PANDA & NAMA kosong — baris dilewati.`);
        continue;
      }

      // upsert berdasarkan (no_panda, angkatan) atau (nama, angkatan) fallback
      const existingId = await findExistingRowId(client, payload);

      if (existingId) {
        const q = `
          UPDATE jasmani_polda SET
            siswa_id = COALESCE($1, siswa_id),
            no_panda = COALESCE($2, no_panda),
            nama = COALESCE($3, nama),
            jk = COALESCE($4, jk),
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
            pencapaian_nbl = COALESCE($15, pencapaian_nbl),

            renang = COALESCE($16, renang),
            renang_x20 = COALESCE($17, renang_x20),
            lari_12_menit = COALESCE($18, lari_12_menit),

            pull_up_chinning = COALESCE($19, pull_up_chinning),
            sit_up = COALESCE($20, sit_up),
            push_up = COALESCE($21, push_up),
            shuttle_run = COALESCE($22, shuttle_run),

            nilai_b = COALESCE($23, nilai_b),
            na_a_b = COALESCE($24, na_a_b),
            antro = COALESCE($25, antro),
            samapta_x80 = COALESCE($26, samapta_x80),
            nilai_akhir = COALESCE($27, nilai_akhir),
            ktgr = COALESCE($28, ktgr),
            ket = COALESCE($29, ket),
            catatan = COALESCE($30, catatan),
            paraf = COALESCE($31, paraf),

            polda = COALESCE($32, polda),
            panda = COALESCE($33, panda),
            tahun = COALESCE($34, tahun),
            angkatan = COALESCE($35, angkatan),
            sheet_name = COALESCE($36, sheet_name),
            sumber_file = COALESCE($37, sumber_file),
            updated_at = NOW()
          WHERE id = $38
        `;
        await client.query(q, [
          payload.siswa_id,
          payload.no_panda,
          payload.nama,
          payload.jk,
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
          payload.pencapaian_nbl,

          payload.renang,
          payload.renang_x20,
          payload.lari_12_menit,

          payload.pull_up_chinning,
          payload.sit_up,
          payload.push_up,
          payload.shuttle_run,

          payload.nilai_b,
          payload.na_a_b,
          payload.antro,
          payload.samapta_x80,
          payload.nilai_akhir,
          payload.ktgr,
          payload.ket,
          payload.catatan,
          payload.paraf,

          payload.polda,
          payload.panda,
          payload.tahun,
          payload.angkatan,
          payload.sheet_name,
          payload.sumber_file,
          existingId,
        ]);
        updated++;
      } else {
        const q = `
          INSERT INTO jasmani_polda (
            siswa_id, no_panda, nama, jk, jalur_seleksi,
            tb_cm, bb_kg, ratio_index, somato_type, klasifikasi_tipe_tubuh,
            nilai_tipe_tubuh, nilai_kelainan, nilai_terkecil, nilai_anthro, pencapaian_nbl,
            renang, renang_x20, lari_12_menit,
            pull_up_chinning, sit_up, push_up, shuttle_run,
            nilai_b, na_a_b, antro, samapta_x80, nilai_akhir, ktgr, ket, catatan, paraf,
            polda, panda, tahun, angkatan, sheet_name, sumber_file
          ) VALUES (
            $1,$2,$3,$4,$5,
            $6,$7,$8,$9,$10,
            $11,$12,$13,$14,$15,
            $16,$17,$18,
            $19,$20,$21,$22,
            $23,$24,$25,$26,$27,$28,$29,$30,$31,
            $32,$33,$34,$35,$36,$37
          )
        `;
        await client.query(q, [
          payload.siswa_id,
          payload.no_panda,
          payload.nama,
          payload.jk,
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
          payload.pencapaian_nbl,

          payload.renang,
          payload.renang_x20,
          payload.lari_12_menit,

          payload.pull_up_chinning,
          payload.sit_up,
          payload.push_up,
          payload.shuttle_run,

          payload.nilai_b,
          payload.na_a_b,
          payload.antro,
          payload.samapta_x80,
          payload.nilai_akhir,
          payload.ktgr,
          payload.ket,
          payload.catatan,
          payload.paraf,

          payload.polda,
          payload.panda,
          payload.tahun,
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
      summary: {
        inserted,
        updated,
        skipped: errors.length ? 0 : 0,
        errors: errors.length,
      },
      errors,
    });
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    console.error("[jasmani_polda.importExcel]", e);
    res.status(500).json({ ok: false, message: e.message });
  } finally {
    fs.promises.unlink(filePath).catch(() => {});
    client.release();
  }
};

// ===========================================================
// GET /jasmani-polda/rekap?q=&angkatan=&tahun=&polda=&panda=&page=&limit=&sort_by=&sort_dir=
// (angkatan bisa dipakai filter utama di UI baru)
// ===========================================================
exports.rekap = async (req, res) => {
  try {
    const q = (req.query.q || "").trim().toLowerCase();
    const angkatan = (req.query.angkatan || "").trim();
    const tahun = (req.query.tahun || "").trim();
    const polda = (req.query.polda || "").trim();
    const panda = (req.query.panda || "").trim();

    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(
      Math.max(parseInt(req.query.limit || "20", 10), 1),
      200
    );
    const offset = (page - 1) * limit;

    const sortable = new Set(["nama", "no_panda", "angkatan", "tahun"]);
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
    if (tahun) {
      params.push(tahun);
      where += ` AND TRIM(COALESCE(jp.tahun,'')) = TRIM($${params.length})`;
    }
    if (polda) {
      params.push(polda);
      where += ` AND TRIM(COALESCE(jp.polda,'')) = TRIM($${params.length})`;
    }
    if (panda) {
      params.push(panda);
      where += ` AND TRIM(COALESCE(jp.panda,'')) = TRIM($${params.length})`;
    }

    const { rows: cnt } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM jasmani_polda jp ${where};`,
      params
    );
    const total = cnt?.[0]?.total ?? 0;

    const sql = `
      SELECT jp.* FROM jasmani_polda jp
      ${where}
      ORDER BY ${sortBy} ${sortDir}
      LIMIT ${limit} OFFSET ${offset}
    `;
    const { rows } = await pool.query(sql, params);

    const items = rows.map((r) => ({
      id: r.id,
      siswa_id: r.siswa_id,
      no_panda: r.no_panda,
      nama: r.nama,
      jk: r.jk,
      jalur_seleksi: r.jalur_seleksi,

      angkatan: r.angkatan,
      tahun: r.tahun,
      polda: r.polda,
      panda: r.panda,

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
      pencapaian_nbl: r.pencapaian_nbl,

      renang: r.renang == null ? null : Number(r.renang),
      renang_x20: r.renang_x20 == null ? null : Number(r.renang_x20),
      lari_12_menit: r.lari_12_menit == null ? null : Number(r.lari_12_menit),

      pull_up_chinning:
        r.pull_up_chinning == null ? null : Number(r.pull_up_chinning),
      sit_up: r.sit_up == null ? null : Number(r.sit_up),
      push_up: r.push_up == null ? null : Number(r.push_up),
      shuttle_run: r.shuttle_run == null ? null : Number(r.shuttle_run),

      nilai_b: r.nilai_b == null ? null : Number(r.nilai_b),
      na_a_b: r.na_a_b == null ? null : Number(r.na_a_b),
      antro: r.antro == null ? null : Number(r.antro),
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
      tahun,
      polda,
      panda,
    });
  } catch (e) {
    console.error("[jasmani_polda.rekap]", e);
    res
      .status(500)
      .json({ ok: false, message: "Gagal mengambil rekap jasmani POLDA" });
  }
};
