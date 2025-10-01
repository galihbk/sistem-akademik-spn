// siswaImport.service.js
// Import Siswa dari Excel/XLSX dengan menjaga leading zero (e.g. "0001")
// Syarat: Di Excel, kolom NOSIS diformat Text / Custom "0000" atau diketik '0001

const XLSX = require("xlsx");
const pool = require("../db/pool");

// header persis dari Excel -> kolom DB
const MAP = {
  NAMA: "nama",
  NOSIS: "nosis",
  TON: "ton",

  // Tambahan: BATALION & beberapa sinonim header yang sering muncul
  BATALION: "batalion",
  BATALYON: "batalion", // ejaan alternatif
  "BATALION/PLETON": "batalion", // kalau header gabungan
  "BATALION / PLETON": "batalion",

  NIK: "nik",
  "FILE  KTP": "file_ktp",
  ALAMAT: "alamat",
  "TEMPAT LAHIR": "tempat_lahir",
  "TANGGAL LAHIR": "tanggal_lahir",
  UMUR: "umur",
  AGAMA: "agama",
  "JENIS KELAMIN": "jenis_kelamin",
  EMAIL: "email",
  "NO. HP.": "no_hp",
  "DIKUM AKHIR": "dikum_akhir",
  JURUSAN: "jurusan",
  TB: "tb",
  BB: "bb",
  "GOL. DARAH": "gol_darah",
  "NO. BPJS": "no_bpjs",
  "SIM YANG DIMILIKI": "sim_yang_dimiliki",
  "NO. HP. KELUARGA": "no_hp_keluarga",
  "NAMA AYAH KANDUNG": "nama_ayah_kandung",
  "NAMA IBU KANDUNG": "nama_ibu_kandung",
  "PEKERJAAN AYAH KANDUNG": "pekerjaan_ayah_kandung",
  "PEKERJAAN IBU KANDUNG": "pekerjaan_ibu_kandung",
  "ASAL POLDA": "asal_polda",
  "ASAL POLRES": "asal_polres",
  "KELOMPOK ANGKATAN": "kelompok_angkatan",
  "DIKTUK AWAL": "diktuk_awal",
  "TAHUN DIKTUK": "tahun_diktuk",
  PERSONEL: "personel",
  "UKURAN PAKAIAN": "ukuran_pakaian",
  "UKURAN CELANA": "ukuran_celana",
  "UKURAN SEPATU": "ukuran_sepatu",
  "UKURAN TUTUP KEPALA": "ukuran_tutup_kepala",
  "JENIS REKRUTMEN": "jenis_rekrutmen",
};

function pickDataSiswaSheet(wb) {
  if (!wb.SheetNames || wb.SheetNames.length === 0) return null;

  // coba cari sheet yang namanya mirip "data siswa"
  const target = wb.SheetNames.find((n) =>
    n.toLowerCase().replace(/\s+/g, "").includes("datasiswa")
  );

  // fallback → pakai sheet pertama
  return target ? wb.Sheets[target] : wb.Sheets[wb.SheetNames[0]];
}

function detectHeaderRow(ws) {
  // Ambil baris awal apa adanya (raw:true) hanya untuk deteksi header
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
  const top = rows.slice(0, 30);
  let best = { idx: 0, score: -1, header: [] };
  for (let i = 0; i < top.length; i++) {
    const row = top[i] || [];
    const header = row.map((c) => (c == null ? "" : String(c).trim()));
    const score = header.filter((h) => MAP[h?.trim()?.toUpperCase()]).length;
    if (score > best.score) best = { idx: i, score, header };
  }
  return best;
}

/**
 * Import siswa dari Workbook buffer (file .xlsx)
 * @param {Buffer} buffer
 * @param {{dryRun?: boolean}} param1
 * @returns {Promise<{sheetUsed: string, rows: number, ok: number, skip: number, fail: number, headerDetected: object, headerRow: number, skipReasons: object, detailLists: object}>}
 */
async function importSiswaFromWorkbookBuffer(buffer, { dryRun = false } = {}) {
  const wb = XLSX.read(buffer, {
    type: "buffer",
    cellDates: true,
    cellNF: true, // simpan informasi number format
    cellText: true, // sediakan teks tampilan (.w)
  });
  const ws = pickDataSiswaSheet(wb);
  console.log("[DEBUG] SheetNames:", wb.SheetNames);
  console.log("[DEBUG] Buffer size:", buffer.length);
  if (!ws) {
    throw new Error("Workbook tidak punya sheet apapun");
  }

  const best = detectHeaderRow(ws);
  if (best.score <= 0) throw new Error("Header tidak cocok dengan template");

  // Set ulang range agar baris pertama = baris header terdeteksi
  const range = XLSX.utils.decode_range(ws["!ref"]);
  range.s.r = best.idx;
  ws["!ref"] = XLSX.utils.encode_range(range);

  // raw:false => gunakan TEKS TAMPILAN (mempertahankan leading zero apabila
  // kolom di Excel diformat Text / Custom "0000" atau diketik dengan apostrof '0001)
  const rows = XLSX.utils.sheet_to_json(ws, {
    defval: "",
    raw: false,
    blankrows: false,
  });

  const srcHeaders = Object.keys(rows[0] || {});
  const mapped = srcHeaders.reduce((acc, h) => {
    const keyUpper = String(h || "")
      .trim()
      .toUpperCase();
    const k = MAP[keyUpper] || null;
    if (k) acc[h] = k;
    return acc;
  }, {});

  // Log header yang belum termap (membantu debugging)
  const unmapped = srcHeaders
    .map((h) => String(h || "").trim())
    .filter((h) => !MAP[h.toUpperCase()]);
  if (unmapped.length) {
    console.warn("[IMPORT] Unmapped headers:", unmapped);
  }

  if (!Object.values(mapped).includes("nama"))
    throw new Error('Kolom "NAMA" wajib ada');
  if (!Object.values(mapped).includes("nosis"))
    throw new Error('Kolom "NOSIS" wajib ada');

  // Debug kecil untuk memastikan NOSIS sudah ber-leading zero
  try {
    const nosisHeaderKey = Object.keys(mapped).find(
      (h) => mapped[h] === "nosis"
    );
    const sampleNosis = rows
      .slice(0, 5)
      .map((r) => r[nosisHeaderKey])
      .filter(Boolean);
    console.log("[DEBUG] Sample NOSIS from rows:", sampleNosis);
  } catch (_) {}

  let ok = 0,
    skip = 0,
    fail = 0;
  const skipReasons = { noname: 0, nonosis: 0 };
  const detailLists = { ok: [], skip: [], fail: [] };

  // Opsional: transaksi
  const client = await pool.connect();
  if (!dryRun) await client.query("BEGIN");

  try {
    for (const row of rows) {
      const payload = {};
      for (const [from, to] of Object.entries(mapped)) {
        const v = row[from];
        // Jadikan null jika kosong; sisanya simpan sebagai string TRIM
        // (leading zero tetap aman karena raw:false)
        payload[to] = v === "" ? null : String(v).trim();
      }

      const nama = payload.nama || null;
      const nosis = payload.nosis || null;

      if (!nama) {
        skip++;
        skipReasons.noname++;
        detailLists.skip.push({ nosis, nama });
        continue;
      }
      if (!nosis) {
        skip++;
        skipReasons.nonosis++;
        detailLists.skip.push({ nosis, nama });
        continue;
      }

      // siapkan kolom & nilai (jangan paksa updated_at di insert; update saat upsert)
      const cols = Object.keys(payload).filter((k) => payload[k] !== null);
      const vals = cols.map((k) => payload[k]);

      // ON CONFLICT: jika ada NIK (tidak kosong/null), targetkan partial unique index via
      // "ON CONFLICT (nik) WHERE nik IS NOT NULL"
      const hasNik = payload.nik && String(payload.nik).trim() !== "";

      // kolom yang di-update saat upsert (jangan update 'nik')
      const updateCols = cols.filter((c) => c !== "nik");
      const setClause = updateCols
        .map((c) => `${c}=COALESCE(EXCLUDED.${c}, siswa.${c})`)
        .concat("updated_at=NOW()")
        .join(", ");

      const colNames = cols.join(", ");
      const ph = cols.map((_, i) => `$${i + 1}`).join(", ");

      const sql = `
        INSERT INTO siswa (${colNames})
        VALUES (${ph})
        ${
          hasNik
            ? `ON CONFLICT (nik) WHERE nik IS NOT NULL DO UPDATE SET ${setClause}`
            : ``
        }
      ;`;

      try {
        if (!dryRun) {
          await client.query(sql, vals);
        }
        ok++;
        detailLists.ok.push({ nosis, nama });
      } catch (e) {
        fail++;
        detailLists.fail.push({ nosis, nama, error: e.message });
        console.error("[IMPORT ERROR]", e.message, {
          row: payload,
          sql,
        });
      }
    }

    if (!dryRun) await client.query("COMMIT");
  } catch (e) {
    if (!dryRun) await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }

  return {
    sheetUsed: "data siswa",
    rows: rows.length,
    ok,
    skip,
    fail,
    headerDetected: mapped,
    headerRow: best.idx + 1,
    skipReasons,
    detailLists,
  };
}

module.exports = { importSiswaFromWorkbookBuffer };
