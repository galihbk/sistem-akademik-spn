/**
 * Import Siswa dari Excel (sheet pertama).
 * Jalankan:
 *   node src/db/import_siswa_from_excel.js "/path/ke/DATA CASIS DIKTUKBA T.A 2025.xlsx"
 *
 * Catatan:
 * - Mapping kolom disesuaikan di bagian CONFIG.
 * - Upsert berdasarkan NISN (kalau ada), kalau tidak ada pakai NIK.
 */

const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const pool = require('./pool');

const CONFIG = {
  // === UBAH sesuai nama kolom di file Excel kamu ===
  // Misal di file kolomnya: "NISN", "NIK", "NAMA", "TEMPAT/TGL LAHIR", "ALAMAT"
  // tulis persis ejaan header-nya.
  columns: {
    nisn: 'NISN',
    nik: 'NIK',
    nama: 'NAMA',
    ttl: 'TEMPAT/TGL LAHIR',   // boleh kosong kalau tidak ada
    alamat: 'ALAMAT'           // boleh kosong kalau tidak ada
  },
  // sheet index 0 = sheet pertama
  sheetIndex: 0,
  // berapa baris pertama yang di-skip (header biasanya baris 1)
  headerRow: 1
};

function normalizeStr(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: node src/db/import_siswa_from_excel.js "/abs/path/file.xlsx"');
    process.exit(1);
  }
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) {
    console.error('File not found:', abs);
    process.exit(1);
  }

  console.log('[import] reading', abs);
  const wb = XLSX.readFile(abs, { cellDates: true });
  const sheetNames = wb.SheetNames || [];
  if (!sheetNames.length) {
    console.error('No sheet in workbook');
    process.exit(1);
  }
  const sheetName = sheetNames[CONFIG.sheetIndex || 0];
  const ws = wb.Sheets[sheetName];

  // ambil data sebagai array of objects (key = header)
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: true });
  console.log(`[import] sheet "${sheetName}" rows:`, rows.length);

  const { nisn: K_NISN, nik: K_NIK, nama: K_NAMA, ttl: K_TTL, alamat: K_ALAMAT } = CONFIG.columns;

  let ok = 0, skip = 0, fail = 0;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];

    const nisn = normalizeStr(r[K_NISN]);
    const nik = normalizeStr(r[K_NIK]);
    const nama = normalizeStr(r[K_NAMA]);
    const ttl = normalizeStr(K_TTL ? r[K_TTL] : null);
    const alamat = normalizeStr(K_ALAMAT ? r[K_ALAMAT] : null);

    if (!nama) { skip++; continue; }
    if (!nisn && !nik) { // butuh minimal salah satu untuk jadi identitas
      skip++; continue;
    }

    try {
      // Upsert prioritas NISN, fallback NIK
      // CASE 1: ada NISN -> upsert by NISN
      if (nisn) {
        await pool.query(
          `INSERT INTO siswa (nisn, nik, nama, ttl, alamat, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW())
           ON CONFLICT (nisn) DO UPDATE
           SET nik=EXCLUDED.nik,
               nama=EXCLUDED.nama,
               ttl=EXCLUDED.ttl,
               alamat=EXCLUDED.alamat,
               updated_at=NOW()`,
          [nisn, nik, nama, ttl, alamat]
        );
        ok++;
        continue;
      }
      // CASE 2: tidak ada NISN, tapi ada NIK -> upsert by NIK
      await pool.query(
        `INSERT INTO siswa (nisn, nik, nama, ttl, alamat, updated_at)
         VALUES (NULL, $1, $2, $3, $4, NOW())
         ON CONFLICT (nik) DO UPDATE
         SET nama=EXCLUDED.nama,
             ttl=EXCLUDED.ttl,
             alamat=EXCLUDED.alamat,
             updated_at=NOW()`,
        [nik, nama, ttl, alamat]
      );
      ok++;
    } catch (e) {
      fail++;
      console.error(`[row ${i+1}]`, e.message);
    }
  }

  console.log(`[import] DONE. ok=${ok} skip=${skip} fail=${fail}`);
  await pool.end();
}

main().catch(async (e)=>{
  console.error('[import] fatal:', e);
  try { await pool.end(); } catch {}
  process.exit(1);
});
