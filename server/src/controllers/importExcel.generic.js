// util generic untuk import excel -> tabel postgres
const XLSX = require('xlsx');
const pool = require('../db/pool');

// --- helpers ---
const toText = (v) => (v === null || v === undefined) ? '' : String(v).trim();
const normKey = (s) => toText(s).toLowerCase().replace(/\s+/g, '_').replace(/[^\w]+/g, '_');

function pickSheetName(sheets, preferList = []) {
  if (!sheets || sheets.length === 0) return null;
  const lower = sheets.map(s => s.toLowerCase());
  for (const kw of preferList) {
    const idx = lower.findIndex(n => n.includes(kw));
    if (idx >= 0) return sheets[idx];
  }
  return sheets[0];
}

async function ensureTable(table, ddl) {
  const q = await pool.query(`SELECT to_regclass($1) AS t`, [`public.${table}`]);
  if (!q.rows[0].t) {
    await pool.query(ddl);
  }
}

async function logAudit(admin, aksi, target, hasil, detail) {
  try {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS audit_log(
        id SERIAL PRIMARY KEY,
        admin VARCHAR(64),
        aksi VARCHAR(64),
        target VARCHAR(128),
        hasil VARCHAR(16),
        detail TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );`
    );
    await pool.query(
      `INSERT INTO audit_log(admin,aksi,target,hasil,detail) VALUES ($1,$2,$3,$4,$5)`,
      [admin||'admin', aksi, target, hasil, detail]
    );
  } catch (e) {
    console.error('[audit_log]', e.message);
  }
}

/**
 * @param {Object} cfg
 *  - table: string
 *  - ddl: string CREATE TABLE IF NOT EXISTS ...
 *  - uniqueKeys: string[] kolom unik untuk ON CONFLICT
 *  - sheetKeywords: string[] preferensi nama sheet
 *  - headerMap: object { canonicalKey: [variasi header] }
 */
async function importExcelGeneric(buffer, { dryRun, sheetName, admin }, cfg) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheets = wb.SheetNames || [];
  // pilih sheet
  const chosenSheetName = sheetName
    || pickSheetName(sheets, (cfg.sheetKeywords||[]).map(k=>k.toLowerCase()));

  if (!chosenSheetName) throw new Error('Workbook tidak punya sheet apapun');
  if (!sheets.includes(chosenSheetName)) throw new Error(`Sheet "${chosenSheetName}" tidak ditemukan`);

  // pastikan tabel
  await ensureTable(cfg.table, cfg.ddl);

  const ws = wb.Sheets[chosenSheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { raw: false, defval: '' });
  const headerRow = XLSX.utils.decode_range(ws['!ref'] || 'A1').s.r + 1;

  // build reverse header map
  const rev = {};
  for (const [canonical, aliases] of Object.entries(cfg.headerMap||{})) {
    for (const al of aliases) rev[normKey(al)] = canonical;
    rev[normKey(canonical)] = canonical;
  }

  // hasil
  const detailLists = { ok: [], skip: [], fail: [] };
  let ok=0, skip=0, fail=0;

  // fungsi insert/upsert
  async function upsertRow(record){
    // pisahkan kolom yg dikenal vs meta
    const knownCols = Object.keys(cfg.headerMap || {});
    const payload = {};
    const meta = {};
    for (const [k, v] of Object.entries(record)) {
      if (knownCols.includes(k)) payload[k] = v;
      else meta[k] = v;
    }
    if (!('meta' in payload)) payload.meta = meta;

    // bangun query dinamis
    const cols = Object.keys(payload);
    const vals = cols.map((_, i)=>`$${i+1}`);
    const updates = cols
      .filter(c => !cfg.uniqueKeys.includes(c))
      .map(c => `${c}=EXCLUDED.${c}`);
    const sql = `
      INSERT INTO ${cfg.table} (${cols.join(',')})
      VALUES (${vals.join(',')})
      ON CONFLICT (${cfg.uniqueKeys.join(',')})
      DO UPDATE SET ${updates.join(',')};
    `;
    const params = cols.map(c => payload[c]);
    await pool.query(sql, params);
  }

  for (const r of rows) {
    // normalisasi keys sesuai headerMap
    const rec = {};
    for (const [k, v] of Object.entries(r)) {
      const canonical = rev[normKey(k)] || normKey(k);
      rec[canonical] = toText(v);
    }

    // validasi minimal: harus ada nosis
    const nosis = toText(rec.nosis);
    const nama  = toText(rec.nama);
    if (!nosis) { fail++; detailLists.fail.push({ nosis, nama, error: 'NOSIS kosong' }); continue; }

    try {
      if (!dryRun) await upsertRow(rec);
      ok++; detailLists.ok.push({ nosis, nama });
    } catch (e) {
      fail++; detailLists.fail.push({ nosis, nama, error: e.message });
    }
  }

  // tidak ada skip default; kalau nanti perlu logika skip (duplikat dll) bisa ditambah.
  const result = {
    sheetUsed: chosenSheetName,
    rows: rows.length,
    headerRow,
    ok, skip, fail,
    detailLists
  };

  await logAudit(admin, 'import_excel', cfg.table, fail ? 'FAIL' : 'OK', JSON.stringify({ok,fail,rows:rows.length}));

  return result;
}

module.exports = { importExcelGeneric };
