// server/src/services/mentalImport.service.js
const XLSX = require("xlsx");
const pool = require("../db/pool");

/* =============== Helpers =============== */

function cellToString(v) {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString();
  return String(v).trim();
}

function canon(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function isIdHeader(h) {
  const c = canon(h);
  return (
    c === "nosis" ||
    c === "nomorsiswa" ||
    c === "nosissiswa" ||
    c === "nama" ||
    c === "namalengkap"
  );
}

function isWeekHeaderRaw(h) {
  const s = cellToString(h);
  if (!s) return false;
  if (/^m(?:inggu)?\s*\d+$/i.test(s)) return true;
  if (/^w\s*\d+$/i.test(s)) return true;
  if (/^\d+$/.test(s)) return true;
  return false;
}

function parseWeek(h) {
  const s = cellToString(h);
  let m = s.match(/^m(?:inggu)?\s*(\d+)$/i);
  if (m) return parseInt(m[1], 10);
  m = s.match(/^w\s*(\d+)$/i);
  if (m) return parseInt(m[1], 10);
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  return null;
}

function pickMentalSheetByContent(wb) {
  if (!wb.SheetNames?.length) return { ws: null, name: null };

  let best = { score: -1, ws: null, name: null, headerRow: -1, header: [] };
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
    const top = rows.slice(0, 80);

    for (let i = 0; i < top.length; i++) {
      const header = (top[i] || []).map(cellToString);
      const hasId = header.some(isIdHeader);
      if (!hasId) continue;

      const weekCols = header.filter(isWeekHeaderRaw).length;
      let sheetBonus = 0;
      const nm = canon(name);
      if (
        nm.includes("mk") ||
        nm.includes("mental") ||
        nm.includes("kepribadian")
      )
        sheetBonus = 30;

      const score = sheetBonus + 50 + weekCols;
      if (score > best.score) best = { score, ws, name, headerRow: i, header };
    }
  }
  return best.ws
    ? {
        ws: best.ws,
        name: best.name,
        headerRow: best.headerRow,
        header: best.header,
      }
    : { ws: null, name: null };
}

function detectHeaderRow(ws) {
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true });
  const top = rows.slice(0, 80);
  let best = { idx: -1, score: -1, header: [] };

  for (let i = 0; i < top.length; i++) {
    const header = (top[i] || []).map(cellToString);
    const hasId = header.some(isIdHeader);
    if (!hasId) continue;

    let weekCount = header.filter(isWeekHeaderRaw).length;
    if (weekCount === 0 && top[i + 1]) {
      const mergedHeader = (top[i + 1] || []).map(cellToString);
      weekCount = mergedHeader.filter(isWeekHeaderRaw).length;
    }
    const score = 50 + weekCount;
    if (score > best.score) best = { idx: i, score, header };
  }
  return best;
}

function normalizeHeader(h) {
  const raw = cellToString(h);
  const c = canon(raw);

  if (c === "nosis" || c === "nomorsiswa" || c === "nosissiswa") return "nosis";
  if (c === "nama" || c === "namalengkap") return "nama";
  if (c === "nik" || c === "nikktp") return "nik";
  if (c === "ton" || c === "peleton") return "ton";

  if (isWeekHeaderRaw(raw)) {
    const w = parseWeek(raw);
    if (Number.isInteger(w) && w > 0) return { week: w };
  }
  return null;
}

// fallback: deteksi blok payung “SKOR TIAP INDIKATOR …” → “JUMLAH SKOR”
function detectWeeksByBlockHeaders(srcHeaders) {
  const C_SKOR = "skortiapindikatoryangdiberikanpengasuh";
  const C_JUMLAH = "jumlahskor";

  const cHeaders = srcHeaders.map(canon);
  const start = cHeaders.findIndex(
    (c) => c.includes(C_SKOR) || c.startsWith("skor")
  );
  const end = cHeaders.findIndex(
    (c) => c.includes(C_JUMLAH) || c === "jumlah" || c === "jumlahskor"
  );

  if (start !== -1 && end !== -1 && end - start > 1) {
    const weeks = [];
    let w = 1;
    for (let i = start + 1; i < end; i++) {
      weeks.push({ index: i, week: w++ });
    }
    return weeks;
  }
  return [];
}

async function resolveSiswaIdByNosisAngkatan({ nosis, angkatan }) {
  nosis = (nosis || "").trim();
  angkatan = (angkatan || "").trim();
  if (!nosis || !angkatan) return null;

  const sql = `
    SELECT id
    FROM siswa
    WHERE nosis = $1
      AND TRIM(kelompok_angkatan) = TRIM($2)
    ORDER BY id ASC
    LIMIT 1;
  `;
  const r = await pool.query(sql, [nosis, angkatan]);
  return r.rows[0]?.id || null;
}

/* =============== Core Importer =============== */

async function importMentalFromWorkbookBuffer(
  buffer,
  { dryRun = false, angkatan = "" } = {}
) {
  if (!buffer?.length) throw new Error("File kosong / tidak terbaca.");
  if (!angkatan || !String(angkatan).trim())
    throw new Error("Parameter 'angkatan' wajib diisi untuk import mental.");

  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });

  const picked = pickMentalSheetByContent(wb);
  const ws = picked.ws;
  const sheetName = picked.name || (wb.SheetNames || [])[0] || "MK";
  if (!ws) throw new Error("Workbook tidak memiliki sheet yang cocok.");

  let best = { idx: picked.headerRow, score: 1, header: picked.header || [] };
  if (best.idx == null || best.idx < 0) best = detectHeaderRow(ws);
  if (!best || best.idx == null || best.idx < 0 || best.score <= 0) {
    const rowsPrev = XLSX.utils
      .sheet_to_json(ws, { header: 1, raw: true })
      .slice(0, 5);
    const preview = rowsPrev
      .map((r) => r.map(cellToString).join(" | "))
      .join("\n");
    throw new Error(
      'Header MK tidak cocok. Wajib ada kolom "NOSIS" dan kolom minggu (M1/MINGGU 1/1/2/...).\nPratinjau 5 baris pertama:\n' +
        preview
    );
  }

  // Set range agar baris header jadi header
  const range = XLSX.utils.decode_range(ws["!ref"]);
  range.s.r = best.idx;
  ws["!ref"] = XLSX.utils.encode_range(range);

  const rows = XLSX.utils.sheet_to_json(ws, { defval: "", raw: true });
  const srcHeaders = Object.keys(rows[0] || {});

  // Mapping header normal
  const idKeys = []; // {header, key:'nosis'|'nama'|'nik'|'ton'}
  let weekCols = []; // {header, week}
  for (let i = 0; i < srcHeaders.length; i++) {
    const hdr = srcHeaders[i];
    const norm = normalizeHeader(hdr);
    if (
      norm === "nosis" ||
      norm === "nama" ||
      norm === "nik" ||
      norm === "ton"
    ) {
      idKeys.push({ header: hdr, key: norm });
    } else if (norm && typeof norm === "object" && norm.week) {
      weekCols.push({ header: hdr, week: norm.week });
    }
  }

  // Fallback blok payung
  if (weekCols.length === 0) {
    const blockWeeks = detectWeeksByBlockHeaders(srcHeaders);
    if (blockWeeks.length) {
      weekCols = blockWeeks.map(({ index, week }) => ({
        header: srcHeaders[index],
        week,
      }));
    }
  }

  const nosisHeader = idKeys.find((k) => k.key === "nosis")?.header;
  if (!nosisHeader) {
    const hdrRaw = srcHeaders.join(" | ");
    throw new Error(
      `Wajib ada kolom "NOSIS" pada sheet MK. Header terdeteksi: ${hdrRaw}`
    );
  }
  if (weekCols.length === 0) {
    const hdrRaw = srcHeaders.join(" | ");
    throw new Error(
      `Tidak ada kolom minggu terdeteksi. Gunakan header seperti: 1, 2, 3 ... atau M1 / MINGGU 1 / W1. Header: ${hdrRaw}`
    );
  }

  weekCols.sort((a, b) => a.week - b.week);

  // ===== NEW: filter hanya baris yang “mirip data siswa” =====
  const looksLikeStudentRow = (row) => {
    const nosis = cellToString(row[nosisHeader]);
    const anyWeek = weekCols.some((wc) => {
      const v = row[wc.header];
      return v !== "" && v != null && cellToString(v) !== "";
    });
    // Baris data jika:
    // - NOSIS angka (umum), atau
    // - tidak ada NOSIS tapi ada nilai minggu (jarang, tapi tetap kita proses → nanti di-skip karena no_nosis)
    if (nosis) {
      if (!/^\d+$/.test(nosis)) return false; // buang “Mengetahui”, “KAKORSIS”, dll.
      return true;
    }
    return anyWeek; // kalau tidak ada NOSIS & tidak ada nilai → ignore total (bukan data)
  };

  const filteredRows = rows.filter(looksLikeStudentRow);

  let ok = 0,
    skip = 0,
    fail = 0;
  const detail = { ok: [], skip: [], fail: [] };

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const row of filteredRows) {
      const nosis = cellToString(row[nosisHeader]);
      const nama =
        cellToString(row[idKeys.find((x) => x.key === "nama")?.header]) || null;

      if (!nosis) {
        // sampai sini artinya baris memang berisi angka minggu, tapi tanpa NOSIS
        skip++;
        detail.skip.push({ nosis: "-", nama: nama || "-", reason: "no_nosis" });
        continue;
      }

      const siswa_id = await resolveSiswaIdByNosisAngkatan({ nosis, angkatan });
      if (!siswa_id) {
        skip++;
        detail.skip.push({
          nosis,
          nama: nama || "-",
          reason: "siswa_not_found_in_angkatan",
        });
        continue;
      }

      const weekValues = [];
      for (const wc of weekCols) {
        const vraw = row[wc.header];
        const v = vraw === "" || vraw == null ? null : cellToString(vraw);
        if (v) weekValues.push({ minggu_ke: wc.week, nilai: v });
      }

      if (weekValues.length === 0) {
        skip++;
        detail.skip.push({ nosis, nama: nama || "-", reason: "no_week_value" });
        continue;
      }

      if (!dryRun) {
        for (const w of weekValues) {
          await client.query(
            `DELETE FROM mental WHERE siswa_id = $1 AND minggu_ke = $2`,
            [siswa_id, w.minggu_ke]
          );
          await client.query(
            `INSERT INTO mental (siswa_id, minggu_ke, nilai, catatan, meta, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,NOW(),NOW())`,
            [
              siswa_id,
              w.minggu_ke,
              w.nilai,
              null,
              JSON.stringify({ source: "import_mk" }),
            ]
          );
        }
      }

      ok += weekValues.length;
      detail.ok.push({
        nosis,
        nama: nama || "-",
        minggu_diimport: weekValues.map((w) => w.minggu_ke).join(","),
      });
    }

    if (!dryRun) await client.query("COMMIT");
    else await client.query("ROLLBACK");
  } catch (e) {
    await client.query("ROLLBACK");
    fail++;
    detail.fail.push({ error: e.message });
    throw e;
  } finally {
    client.release();
  }

  return {
    sheetUsed: sheetName,
    rows: filteredRows.length, // hanya hitung baris kandidat data
    ok,
    skip,
    fail,
    headerRow: best.idx + 1,
    weeksDetected: weekCols.map((w) => w.week),
    detail,
  };
}

module.exports = { importMentalFromWorkbookBuffer };
