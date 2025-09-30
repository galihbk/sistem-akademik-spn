const XLSX = require("xlsx");
const pool = require("../db/pool");

// header persis dari Excel -> kolom DB
const MAP = {
  NAMA: "nama",
  NOSIS: "nosis",
  TON: "ton",
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

  // coba cari sheet yg namanya mirip "data siswa"
  const target = wb.SheetNames.find((n) =>
    n.toLowerCase().replace(/\s+/g, "").includes("datasiswa")
  );

  // fallback → pakai sheet pertama
  return target ? wb.Sheets[target] : wb.Sheets[wb.SheetNames[0]];
}

function detectHeaderRow(ws) {
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

async function importSiswaFromWorkbookBuffer(buffer, { dryRun = false } = {}) {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const ws = pickDataSiswaSheet(wb);
  console.log("[DEBUG] SheetNames:", wb.SheetNames); // << cek daftar sheet
  console.log("[DEBUG] Buffer size:", buffer.length);
  if (!ws) {
    throw new Error("Workbook tidak punya sheet apapun");
  }

  const best = detectHeaderRow(ws);
  if (best.score <= 0) throw new Error("Header tidak cocok dengan template");

  const range = XLSX.utils.decode_range(ws["!ref"]);
  range.s.r = best.idx;
  ws["!ref"] = XLSX.utils.encode_range(range);

  const rows = XLSX.utils.sheet_to_json(ws, { defval: "", raw: true });
  const srcHeaders = Object.keys(rows[0] || {});
  const mapped = srcHeaders.reduce((acc, h) => {
    const k =
      MAP[
        String(h || "")
          .trim()
          .toUpperCase()
      ] || null;
    if (k) acc[h] = k;
    return acc;
  }, {});

  if (!Object.values(mapped).includes("nama"))
    throw new Error('Kolom "NAMA" wajib ada');
  if (!Object.values(mapped).includes("nosis"))
    throw new Error('Kolom "NOSIS" wajib ada');

  let ok = 0,
    skip = 0,
    fail = 0;
  const skipReasons = { noname: 0, nonosis: 0 };
  const detailLists = { ok: [], skip: [], fail: [] };

  for (const row of rows) {
    const payload = {};
    for (const [from, to] of Object.entries(mapped)) {
      const v = row[from];
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

    // siapkan kolom & nilai
    const cols = Object.keys(payload).filter((k) => payload[k] !== null);
    if (!cols.includes("updated_at")) cols.push("updated_at");
    const vals = cols.map((k) =>
      k === "updated_at" ? new Date() : payload[k]
    );

    // ⛔️ HAPUS blok tukar urutan 'nosis' (nggak perlu)
    // (biarkan urutan kolom apa adanya)

    let sql = "";
    try {
      if (!dryRun) {
        const colNames = cols.join(", ");
        const ph = cols.map((_, i) => `$${i + 1}`).join(", ");

        // kolom yang di-update saat upsert (jangan update 'nik' & 'updated_at' di SET)

        const hasNik = payload.nik && String(payload.nik).trim() !== "";

        const updateCols = cols.filter(
          (c) => c !== "nik" && c !== "updated_at"
        );
        const setClause = updateCols
          .map((c) => `${c}=COALESCE(EXCLUDED.${c}, siswa.${c})`)
          .concat("updated_at=NOW()")
          .join(", ");
        sql = `
  INSERT INTO siswa (${colNames})
  VALUES (${ph})
  ${
    hasNik
      ? `ON CONFLICT ON CONSTRAINT uq_siswa_nik DO UPDATE SET ${setClause}`
      : ``
  };
`;

        await pool.query(sql, vals);
      }
      ok++;
      detailLists.ok.push({ nosis, nama });
    } catch (e) {
      fail++;
      detailLists.fail.push({ nosis, nama, error: e.message });
      console.error("[IMPORT ERROR]", e.message, { row: payload, sql });
    }
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
