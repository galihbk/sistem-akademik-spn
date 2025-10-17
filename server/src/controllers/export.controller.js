// server/src/controllers/export.controller.js
const path = require("path");
const fs = require("fs/promises");
const pool = require("../db/pool");
const { PDFDocument } = require("pdf-lib");
const mime = require("mime-types");
const puppeteer = require("puppeteer");
const ExcelJS = require("exceljs"); // untuk export Excel

/* =========================================================================
   =                         HELPER UMUM (PDF)                             =
   ========================================================================= */

async function tryReadFileBuffer(rootDir, relPath) {
  try {
    if (!relPath) return null;
    const clean = String(relPath).replace(/^\/+/, "");
    const abs = path.resolve(rootDir, clean);
    const buf = await fs.readFile(abs);
    return buf;
  } catch {
    return null;
  }
}

async function getAllDataByNik(nik) {
  // siswa
  const siswaRes = await pool.query(
    `SELECT * FROM siswa WHERE nik = $1 LIMIT 1`,
    [nik]
  );
  const siswa = siswaRes.rows[0] || null;
  if (!siswa) return null;

  const siswaId = siswa.id;

  // Catatan skema:
  // - bk               : ada file_path
  // - pelanggaran      : ada file_path
  // - prestasi         : TIDAK ada file_path
  // - riwayat_kesehatan: TIDAK ada file_path
  const [
    sosiometriRes,
    mentalRes,
    bkRes,
    pelRes,
    mapelRes,
    prestasiRes,
    jasmaniRes,
    rikesRes,
  ] = await Promise.all([
    pool.query(
      `SELECT * FROM sosiometri WHERE siswa_id = $1 ORDER BY created_at ASC`,
      [siswaId]
    ),
    pool.query(
      `SELECT * FROM mental WHERE siswa_id = $1 ORDER BY created_at ASC`,
      [siswaId]
    ),
    // BK: punya file_path
    pool.query(
      `SELECT id, siswa_id, judul, tanggal, file_path, created_at
         FROM bk
        WHERE siswa_id = $1
        ORDER BY tanggal ASC`,
      [siswaId]
    ),
    // Pelanggaran: punya file_path
    pool.query(
      `SELECT id, siswa_id, judul, tanggal, file_path, created_at
         FROM pelanggaran
        WHERE siswa_id = $1
        ORDER BY tanggal ASC`,
      [siswaId]
    ),
    pool.query(
      `SELECT * FROM mapel WHERE siswa_id = $1 ORDER BY created_at ASC`,
      [siswaId]
    ),
    // Prestasi: TANPA file_path
    pool.query(
      `SELECT id, siswa_id, judul, tingkat, deskripsi, tanggal, created_at
         FROM prestasi
        WHERE siswa_id = $1
        ORDER BY tanggal ASC`,
      [siswaId]
    ),
    pool.query(
      `SELECT * FROM jasmani_spn WHERE siswa_id = $1 ORDER BY created_at ASC`,
      [siswaId]
    ),
    // Riwayat kesehatan: TANPA file_path
    pool.query(
      `SELECT id, siswa_id, judul, deskripsi, tanggal, created_at
         FROM riwayat_kesehatan
        WHERE siswa_id = $1
        ORDER BY tanggal ASC`,
      [siswaId]
    ),
  ]);

  return {
    siswa,
    tabs: {
      sosiometri: sosiometriRes.rows,
      mental: mentalRes.rows,
      bk: bkRes.rows,
      pelanggaran: pelRes.rows,
      mapel: mapelRes.rows,
      prestasi: prestasiRes.rows,
      jasmani: jasmaniRes.rows,
      riwayat_kesehatan: rikesRes.rows,
    },
  };
}

function esc(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function fmtDate(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (isNaN(d)) return String(v);
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function tableHTML(title, rows) {
  if (!rows || rows.length === 0) {
    return `
      <h2>${esc(title)}</h2>
      <div class="muted">Belum ada data.</div>
    `;
  }
  const cols = Object.keys(rows[0]);
  const thead = cols.map((c) => `<th>${esc(c.toUpperCase())}</th>`).join("");
  const tbody = rows
    .map((r) => {
      const tds = cols.map((c) => `<td>${esc(r[c])}</td>`).join("");
      return `<tr>${tds}</tr>`;
    })
    .join("");

  return `
    <h2>${esc(title)}</h2>
    <table class="table">
      <thead><tr>${thead}</tr></thead>
      <tbody>${tbody}</tbody>
    </table>
  `;
}

function biodataHTML(s) {
  const pairs = [
    ["Nama", s.nama],
    ["NOSIS", s.nosis],
    ["NIK", s.nik],
    ["Batalion", s.batalion],
    ["Ton", s.ton],
    ["Jenis Kelamin", s.jenis_kelamin],
    ["Agama", s.agama],
    ["Jenis Rekrutmen", s.jenis_rekrutmen],
    ["Alamat", s.alamat],
    ["Email", s.email],
    ["No HP", s.no_hp],
    ["No HP Keluarga", s.no_hp_keluarga],
    ["Tempat Lahir", s.tempat_lahir],
    ["Tanggal Lahir", fmtDate(s.tanggal_lahir)],
    ["Umur", s.umur],
    ["Dikum Akhir", s.dikum_akhir],
    ["Jurusan", s.jurusan],
    ["TB", s.tb],
    ["BB", s.bb],
    ["Gol. Darah", s.gol_darah],
    ["No BPJS", s.no_bpjs],
    ["SIM", s.sim_yang_dimiliki],
    ["Nama Ayah", s.nama_ayah_kandung],
    ["Pekerjaan Ayah", s.pekerjaan_ayah_kandung],
    ["Nama Ibu", s.nama_ibu_kandung],
    ["Pekerjaan Ibu", s.pekerjaan_ibu_kandung],
    ["Asal Polda", s.asal_polda],
    ["Asal Polres", s.asal_polres],
    ["Kelompok Angkatan", s.kelompok_angkatan],
    ["Diktuk Awal", s.diktuk_awal],
    ["Tahun Diktuk", s.tahun_diktuk],
    ["Ukuran Pakaian", s.ukuran_pakaian],
    ["Ukuran Celana", s.ukuran_celana],
    ["Ukuran Sepatu", s.ukuran_sepatu],
    ["Ukuran Tutup Kepala", s.ukuran_tutup_kepala],
    ["Dibuat", fmtDate(s.created_at)],
    ["Diubah", fmtDate(s.updated_at)],
  ];

  const grid = pairs
    .map(
      ([k, v]) => `
    <div class="card">
      <div class="muted">${esc(k)}</div>
      <div class="val">${esc(v ?? "-")}</div>
    </div>
  `
    )
    .join("");

  const fotoNote = s.foto
    ? `<div class="muted small">Foto: ${esc(s.foto)}</div>`
    : "";

  return `
    <h1>Biodata Siswa</h1>
    ${fotoNote}
    <div class="grid">${grid}</div>
  `;
}

function buildHTML({ siswa, tabs }) {
  return `
<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>Export Siswa ${esc(siswa.nama || "")}</title>
<style>
  body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial; color:#0b1220; }
  h1 { font-size: 22px; margin: 0 0 12px 0; }
  h2 { font-size: 18px; margin: 24px 0 8px 0; }
  .muted { color: #475569; }
  .small { font-size: 12px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; }
  .val { font-weight: 700; font-size: 14px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; vertical-align: top; }
  th { background: #f1f5f9; }
  .section { page-break-inside: avoid; }
  .hr { border-top: 2px solid #e2e8f0; margin: 24px 0; }
  .footer-note { font-size: 11px; color:#64748b; margin-top: 8px; }
</style>
</head>
<body>

<div class="section">
  ${biodataHTML(siswa)}
</div>

<div class="hr"></div>

<div class="section">
  ${tableHTML("Sosiometri", tabs.sosiometri)}
</div>

<div class="section">
  ${tableHTML("Mental Kepribadian", tabs.mental)}
</div>

<div class="section">
  ${tableHTML("BK (Daftar Dokumen)", tabs.bk)}
  <div class="footer-note">Lampiran dokumen PDF/Gambar akan disertakan di bagian paling bawah.</div>
</div>

<div class="section">
  ${tableHTML("Pelanggaran (Daftar Dokumen)", tabs.pelanggaran)}
  <div class="footer-note">Lampiran dokumen PDF/Gambar akan disertakan di bagian paling bawah.</div>
</div>

<div class="section">
  ${tableHTML("Mapel", tabs.mapel)}
</div>

<div class="section">
  ${tableHTML("Prestasi", tabs.prestasi)}
</div>

<div class="section">
  ${tableHTML("Jasmani", tabs.jasmani)}
</div>

<div class="section">
  ${tableHTML("Riwayat Kesehatan", tabs.riwayat_kesehatan)}
</div>

<div class="hr"></div>
<h2>Lampiran</h2>
<div class="muted small">
  Semua file lampiran (PDF dan gambar) akan muncul setelah halaman ini.
</div>

</body>
</html>
`;
}

async function renderHTMLToPDF(html) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "16mm", right: "12mm", bottom: "16mm", left: "12mm" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

async function mergeWithAttachments(basePdfBuf, attachments) {
  let masterDoc = await PDFDocument.load(basePdfBuf);

  for (const att of attachments) {
    if (!att?.buffer || !att?.mime) continue;

    const m = String(att.mime).toLowerCase();

    try {
      if (m.includes("pdf")) {
        const src = await PDFDocument.load(att.buffer);
        const pages = await masterDoc.copyPages(src, src.getPageIndices());
        pages.forEach((p) => masterDoc.addPage(p));
      } else if (
        m.includes("png") ||
        m.includes("jpg") ||
        m.includes("jpeg") ||
        m.includes("webp")
      ) {
        const imgDoc = await PDFDocument.create();
        let img;
        if (m.includes("png")) img = await imgDoc.embedPng(att.buffer);
        else img = await imgDoc.embedJpg(att.buffer);

        const page = imgDoc.addPage([595.28, 841.89]); // A4
        const maxW = 595.28 - 40;
        const maxH = 841.89 - 40;
        let w = img.width,
          h = img.height;
        const ratio = Math.min(maxW / w, maxH / h);
        w *= ratio;
        h *= ratio;
        const x = (595.28 - w) / 2;
        const y = (841.89 - h) / 2;
        page.drawImage(img, { x, y, width: w, height: h });

        const imgBuf = await imgDoc.save();
        const src = await PDFDocument.load(imgBuf);
        const pages = await masterDoc.copyPages(src, [0]);
        masterDoc.addPage(pages[0]);
      } else {
        continue; // tipe selain pdf/gambar di-skip
      }
    } catch {
      continue; // lampiran bermasalah -> skip
    }
  }

  const finalBuf = await masterDoc.save();
  return Buffer.from(finalBuf);
}

/* =========================================================================
   =                        CONTROLLER: PDF by NIK                         =
   ========================================================================= */

async function exportAllByNik(req, res) {
  try {
    const nik = String(req.query.nik || "").trim();
    if (!nik) return res.status(400).send("nik query required");

    const data = await getAllDataByNik(nik);
    if (!data) return res.status(404).send("Siswa tidak ditemukan");

    const html = buildHTML(data);
    const basePdf = await renderHTMLToPDF(html);

    const uploadsRoot = path.resolve(process.cwd(), "uploads");

    // Lampiran HANYA dari bk & pelanggaran (punya file_path)
    const fileRows = []
      .concat(data.tabs.bk || [])
      .concat(data.tabs.pelanggaran || []);

    const attachments = [];
    for (const r of fileRows) {
      const p = r.file_path;
      if (!p) continue;
      const buf = await tryReadFileBuffer(uploadsRoot, p);
      if (!buf) continue;
      const guessedMime = mime.lookup(p) || "application/octet-stream";
      attachments.push({
        buffer: buf,
        mime: guessedMime,
        name: path.basename(p),
      });
    }

    const finalPdf = await mergeWithAttachments(basePdf, attachments);

    if (req.method === "HEAD") {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Length", String(finalPdf.length));
      return res.status(200).end();
    }

    const filename = `Export_${nik}_${Date.now()}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(finalPdf);
  } catch (e) {
    console.error("[exportAllByNik] error:", e);
    return res.status(500).send("Gagal membuat PDF");
  }
}

/* =========================================================================
   =                 CONTROLLER: Excel daftar siswa (ALL COLS)             =
   =            (ENDPOINT TETAP: GET /export/siswa.xlsx)                   =
   ========================================================================= */

function toTitleCase(h) {
  // "ukuran_tutup_kepala" -> "Ukuran Tutup Kepala"
  return String(h || "")
    .split("_")
    .map((s) => (s ? s[0].toUpperCase() + s.slice(1) : s))
    .join(" ");
}

function parseBool(v) {
  if (v == null) return false;
  const s = String(v).toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

async function getSiswaColumnsMeta() {
  // Ambil daftar kolom & tipe data dari tabel siswa sesuai urutan aslinya.
  const sql = `
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'siswa'
    ORDER BY ordinal_position
  `;
  const { rows } = await pool.query(sql);
  return rows; // [{column_name, data_type}, ...]
}

async function exportSiswaXlsx(req, res) {
  try {
    const q = (req.query.q || "").toString().trim();
    const angkatan = (req.query.angkatan || "").toString().trim();
    const all = parseBool(req.query.all);

    // Sorting whitelist (aman)
    const SORT_WHITELIST = new Map([
      ["nama", "LOWER(nama)"],
      ["nosis", "LOWER(nosis)"],
      ["nik", "LOWER(nik)"],
      ["created_at", "created_at"],
      ["updated_at", "updated_at"],
    ]);

    let sort_by = (req.query.sort_by || "nama").toString();
    let sort_dir = (req.query.sort_dir || "asc").toString().toLowerCase();
    sort_dir = sort_dir === "desc" ? "DESC" : "ASC";
    const sortExpr = SORT_WHITELIST.get(sort_by) || SORT_WHITELIST.get("nama");

    // Pagination (jika all != true)
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.min(
      20000,
      Math.max(1, parseInt(req.query.limit || "1000", 10))
    );
    const offset = (page - 1) * limit;

    // WHERE
    const where = [];
    const params = [];

    if (angkatan) {
      params.push(angkatan);
      where.push(
        `COALESCE(NULLIF(TRIM(kelompok_angkatan), ''), '') = $${params.length}`
      );
    }
    if (q) {
      params.push(`%${q.toLowerCase()}%`);
      where.push(`(
        LOWER(COALESCE(nama, '')) LIKE $${params.length}
        OR LOWER(COALESCE(nosis, '')) LIKE $${params.length}
        OR LOWER(COALESCE(nik, '')) LIKE $${params.length}
        OR LOWER(COALESCE(email, '')) LIKE $${params.length}
      )`);
    }

    const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // Ambil metadata kolom dinamis
    const colsMeta = await getSiswaColumnsMeta(); // urut sesuai ordinal_position
    if (!colsMeta.length) {
      return res
        .status(500)
        .json({ message: "Tidak menemukan metadata kolom siswa." });
    }

    // Susun SELECT dinamis (nama kolom di-escape pakai double quotes)
    const selectList = colsMeta.map((c) => `"${c.column_name}"`).join(", ");

    // Query data
    const sql = `
      SELECT ${selectList}
      FROM siswa
      ${whereSQL}
      ORDER BY ${sortExpr} ${sort_dir}
      ${all ? "" : `LIMIT $${params.length + 1} OFFSET $${params.length + 2}`}
    `;

    const rows = (
      await pool.query(sql, all ? params : [...params, limit, offset])
    ).rows;

    // Workbook
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Siswa");

    // Definisikan kolom worksheet sesuai metadata
    ws.columns = colsMeta.map((c) => ({
      header: toTitleCase(c.column_name),
      key: c.column_name,
      width: Math.min(40, Math.max(10, c.column_name.length + 4)),
    }));
    ws.getRow(1).font = { bold: true };

    // Isi baris data
    for (const r of rows) {
      const obj = {};
      for (const c of colsMeta) {
        const name = c.column_name;
        const dtype = String(c.data_type).toLowerCase();
        const val = r[name];

        if (val == null) {
          obj[name] = null;
        } else if (dtype.includes("timestamp") || dtype.includes("date")) {
          const d = new Date(val);
          obj[name] = isNaN(d) ? String(val) : d;
        } else {
          obj[name] = val;
        }
      }
      ws.addRow(obj);
    }

    // Format kolom bertipe tanggal/waktu
    colsMeta.forEach((c, idx) => {
      const dtype = String(c.data_type).toLowerCase();
      if (dtype.includes("timestamp") || dtype.includes("date")) {
        ws.getColumn(idx + 1).numFmt = "yyyy-mm-dd hh:mm";
      }
    });

    // Nama file
    const ts = new Date();
    const y = ts.getFullYear();
    const m = String(ts.getMonth() + 1).padStart(2, "0");
    const d = String(ts.getDate()).padStart(2, "0");
    const hh = String(ts.getHours()).padStart(2, "0");
    const mm = String(ts.getMinutes()).padStart(2, "0");
    const ss = String(ts.getSeconds()).padStart(2, "0");
    const labelAngkatan = angkatan ? `-angkatan-${angkatan}` : "";
    const fname = `siswa-ALLCOLS${labelAngkatan}-${y}${m}${d}-${hh}${mm}${ss}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fname}"`);

    await wb.xlsx.write(res);
    res.end();
  } catch (e) {
    console.error("[export.siswa.xlsx]", e);
    res.status(500).json({ message: "Gagal membuat Excel." });
  }
}

/* =========================================================================
   =                 CONTROLLER: Excel Rekap Mental (filter)               =
   =          ENDPOINT: GET /export/mental_rekap.xlsx?all=1                =
   ========================================================================= */

function sanitizeSort({ sort_by, sort_dir }) {
  const sortCols = new Set(["nama", "nosis"]);
  const col = sortCols.has((sort_by || "").toLowerCase()) ? sort_by : "nama";
  const dir =
    String(sort_dir || "asc").toLowerCase() === "desc" ? "DESC" : "ASC";
  return { col, dir };
}

async function exportMentalRekapExcel(req, res) {
  try {
    const q = (req.query.q || "").trim();
    const angkatan = (req.query.angkatan || "").trim();
    const { col: sortCol, dir: sortDir } = sanitizeSort({
      sort_by: req.query.sort_by,
      sort_dir: req.query.sort_dir,
    });

    // ---- filter & param
    const where = [];
    const params = [];
    let p = 1;

    if (angkatan) {
      where.push(`COALESCE(s.kelompok_angkatan,'') = $${p++}`);
      params.push(angkatan);
    }
    if (q) {
      where.push(
        `(LOWER(s.nama) LIKE LOWER($${p}) OR LOWER(s.nosis) LIKE LOWER($${p}))`
      );
      params.push(`%${q}%`);
      p++;
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // ---- 1) ambil daftar minggu
    const weeksSql = `
      SELECT DISTINCT m.minggu_ke
      FROM mental m
      JOIN siswa s ON s.id = m.siswa_id
      ${whereSql}
      ORDER BY 1 ASC
    `;
    const weekRes = await pool.query(weeksSql, params);
    const weeks = weekRes.rows
      .map((r) => Number(r.minggu_ke))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b);

    // ---- 2) query utama (PERBAIKAN: pakai alias 'b' di pivotExprs)
    const pivotExprs = weeks
      .map(
        (w) =>
          `MAX(CASE WHEN b.minggu_ke = ${w} THEN b.nilai_num END) AS "Minggu ${w}"`
      )
      .join(",\n          ");

    const sql = `
      WITH base AS (
        SELECT
          s.id AS siswa_id,
          s.nosis,
          s.nama,
          s.kelompok_angkatan,
          s.batalion,
          s.ton,
          UPPER(NULLIF(regexp_replace(COALESCE(s.ton,''), '[^A-Za-z].*', ''), '')) AS kompi,
          CASE
            WHEN regexp_replace(COALESCE(s.ton,''), '\\D+', '', 'g') <> '' THEN
              (regexp_replace(s.ton, '\\D+', '', 'g'))::int
            ELSE NULL
          END AS pleton,
          (CASE WHEN m.nilai ~ '^-?\\d+(\\.\\d+)?$' THEN m.nilai::numeric ELSE NULL END) AS nilai_num,
          m.minggu_ke
        FROM mental m
        JOIN siswa s ON s.id = m.siswa_id
        ${whereSql}
      ),
      agg AS (
        SELECT
          siswa_id, nosis, nama, kelompok_angkatan, batalion, ton, kompi, pleton,
          SUM(nilai_num)::numeric(20,3) AS sum_nilai,
          AVG(nilai_num)::numeric(20,3) AS avg_nilai
        FROM base
        GROUP BY siswa_id, nosis, nama, kelompok_angkatan, batalion, ton, kompi, pleton
      ),
      ranks AS (
        SELECT
          a.*,
          RANK() OVER (ORDER BY a.avg_nilai DESC NULLS LAST) AS rk_global,
          COUNT(*) OVER () AS total_global,
          RANK() OVER (PARTITION BY a.batalion ORDER BY a.avg_nilai DESC NULLS LAST) AS rk_batalion,
          COUNT(*) OVER (PARTITION BY a.batalion) AS total_batalion,
          RANK() OVER (PARTITION BY a.kompi ORDER BY a.avg_nilai DESC NULLS LAST) AS rk_kompi,
          COUNT(*) OVER (PARTITION BY a.kompi) AS total_kompi,
          RANK() OVER (PARTITION BY a.pleton ORDER BY a.avg_nilai DESC NULLS LAST) AS rk_pleton,
          COUNT(*) OVER (PARTITION BY a.pleton) AS total_pleton
        FROM agg a
      ),
      pivot AS (
        SELECT
          b.siswa_id
          ${weeks.length ? "," : ""}
          ${weeks.length ? pivotExprs : "NULL::numeric AS _no_weeks_"}
        FROM base b
        GROUP BY b.siswa_id
      )
      SELECT
        r.nosis, r.nama, r.kelompok_angkatan,
        r.batalion, r.kompi, r.pleton,
        r.sum_nilai, r.avg_nilai,
        r.rk_global, r.total_global,
        r.rk_batalion, r.total_batalion,
        r.rk_kompi, r.total_kompi,
        r.rk_pleton, r.total_pleton
        ${weeks.length ? "," : ""}
        ${weeks.map((w) => `"Minggu ${w}"`).join(", ")}
      FROM ranks r
      LEFT JOIN pivot p ON p.siswa_id = r.siswa_id
      ORDER BY ${
        sortCol === "nosis" ? "r.nosis" : "r.nama"
      } ${sortDir}, r.nosis ASC
    `;

    const dataRes = await pool.query(sql, params);
    const rows = dataRes.rows || [];

    // ---- 3) build Excel
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Rekap Mental");

    const baseCols = [
      { header: "NOSIS", key: "nosis", width: 16 },
      { header: "Nama", key: "nama", width: 28 },
      { header: "Angkatan", key: "kelompok_angkatan", width: 14 },
      { header: "Batalion", key: "batalion", width: 12 },
      { header: "Kompi", key: "kompi", width: 10 },
      { header: "Pleton", key: "pleton", width: 10 },
      {
        header: "Jumlah",
        key: "sum_nilai",
        width: 14,
        style: { numFmt: "0.000" },
      },
      {
        header: "Rata-rata",
        key: "avg_nilai",
        width: 14,
        style: { numFmt: "0.000" },
      },
      { header: "R. Global", key: "rk_global_disp", width: 12 },
      { header: "R. Batalion", key: "rk_batalion_disp", width: 12 },
      { header: "R. Kompi", key: "rk_kompi_disp", width: 12 },
      { header: "R. Pleton", key: "rk_pleton_disp", width: 12 },
    ];
    const weekCols = weeks.map((w) => ({
      header: `Minggu ${w}`,
      key: `minggu_${w}`,
      width: 12,
      style: { numFmt: "0.000" },
    }));
    ws.columns = [...baseCols, ...weekCols];
    ws.getRow(1).font = { bold: true };

    for (const r of rows) {
      const obj = {
        nosis: r.nosis ?? "",
        nama: r.nama ?? "",
        kelompok_angkatan: r.kelompok_angkatan ?? "",
        batalion: r.batalion ?? "",
        kompi: r.kompi ?? "",
        pleton: r.pleton ?? "",
        sum_nilai: r.sum_nilai != null ? Number(r.sum_nilai) : null,
        avg_nilai: r.avg_nilai != null ? Number(r.avg_nilai) : null,
        rk_global_disp:
          r.rk_global != null && r.total_global
            ? `${r.rk_global}/${r.total_global}`
            : "-",
        rk_batalion_disp:
          r.rk_batalion != null && r.total_batalion
            ? `${r.rk_batalion}/${r.total_batalion}`
            : "-",
        rk_kompi_disp:
          r.rk_kompi != null && r.total_kompi
            ? `${r.rk_kompi}/${r.total_kompi}`
            : "-",
        rk_pleton_disp:
          r.rk_pleton != null && r.total_pleton
            ? `${r.rk_pleton}/${r.total_pleton}`
            : "-",
      };
      for (const w of weeks) {
        const colName = `Minggu ${w}`;
        obj[`minggu_${w}`] = r[colName] != null ? Number(r[colName]) : null;
      }
      ws.addRow(obj);
    }

    const ts = new Date();
    const y = ts.getFullYear();
    const m = String(ts.getMonth() + 1).padStart(2, "0");
    const d = String(ts.getDate()).padStart(2, "0");
    const hh = String(ts.getHours()).padStart(2, "0");
    const mm = String(ts.getMinutes()).padStart(2, "0");
    const ss = String(ts.getSeconds()).padStart(2, "0");
    const labelAngkatan = angkatan ? `-angkatan-${angkatan}` : "";
    const filename = `rekap-mental${labelAngkatan}-${y}${m}${d}-${hh}${mm}${ss}.xlsx`;

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    await wb.xlsx.write(res);
    return res.status(200).end();
  } catch (e) {
    console.error("[exportMentalRekapExcel] error:", e);
    return res.status(500).send("Gagal membuat Excel rekap mental");
  }
}

// whitelist kolom sort agar aman dari SQL injection
function sanitizeMapelSort({ sort_by, sort_dir }) {
  const map = new Map([
    ["nama", "LOWER(s.nama)"],
    ["nosis", "LOWER(s.nosis)"],
    ["mapel", "LOWER(m.mapel)"],
    ["semester", "LOWER(m.semester)"],
    ["pertemuan", "m.pertemuan"],
    ["created_at", "m.created_at"],
    ["updated_at", "m.updated_at"],
  ]);
  const col = map.get(String(sort_by || "nama")) || "LOWER(s.nama)";
  const dir =
    String(sort_dir || "asc").toLowerCase() === "desc" ? "DESC" : "ASC";
  return { col, dir };
}

async function exportMapelXlsx(req, res) {
  try {
    const q = String(req.query.q || "").trim();
    const angkatan = String(req.query.angkatan || "").trim();
    const semester = String(req.query.semester || "").trim();
    const mapelName = String(req.query.mapel || "").trim();
    const all = String(req.query.all || "1") === "1";

    const { col: sortCol, dir: sortDir } = sanitizeMapelSort({
      sort_by: req.query.sort_by,
      sort_dir: req.query.sort_dir,
    });

    // Jika mapel tidak diisi → fallback ke export flat lama (aman).
    if (!mapelName) {
      // ===== EXPORT FLAT (seperti sebelumnya) =====
      const where = [];
      const params = [];
      let p = 1;

      if (angkatan) {
        where.push(`COALESCE(s.kelompok_angkatan, '') = $${p++}`);
        params.push(angkatan);
      }
      if (semester) {
        where.push(`COALESCE(m.semester, '') = $${p++}`);
        params.push(semester);
      }
      if (q) {
        where.push(`(
          LOWER(COALESCE(s.nama,''))   LIKE LOWER($${p})
          OR LOWER(COALESCE(s.nosis,'')) LIKE LOWER($${p})
          OR LOWER(COALESCE(m.mapel,'')) LIKE LOWER($${p})
        )`);
        params.push(`%${q}%`);
        p++;
      }
      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

      const sql = `
        SELECT
          s.nosis, s.nama, s.kelompok_angkatan, s.batalion, s.ton,
          m.mapel, m.semester, m.pertemuan, m.nilai, m.catatan, m.created_at, m.updated_at
        FROM mapel m
        JOIN siswa s ON s.id = m.siswa_id
        ${whereSql}
        ORDER BY ${sortCol} ${sortDir}, s.nosis ASC, m.mapel ASC, m.pertemuan ASC
        ${all ? "" : "LIMIT 1000"}
      `;
      const { rows } = await pool.query(sql, params);

      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet("Mapel (Flat)");
      ws.columns = [
        { header: "NOSIS", key: "nosis", width: 14 },
        { header: "Nama", key: "nama", width: 28 },
        { header: "Angkatan", key: "kelompok_angkatan", width: 14 },
        { header: "Batalion", key: "batalion", width: 12 },
        { header: "Ton", key: "ton", width: 10 },
        { header: "Mapel", key: "mapel", width: 20 },
        { header: "Semester", key: "semester", width: 12 },
        { header: "Pertemuan", key: "pertemuan", width: 12 },
        { header: "Nilai", key: "nilai", width: 12 },
        { header: "Catatan", key: "catatan", width: 30 },
        {
          header: "Created At",
          key: "created_at",
          width: 20,
          style: { numFmt: "yyyy-mm-dd hh:mm" },
        },
        {
          header: "Updated At",
          key: "updated_at",
          width: 20,
          style: { numFmt: "yyyy-mm-dd hh:mm" },
        },
      ];
      ws.getRow(1).font = { bold: true };

      for (const r of rows) {
        ws.addRow({
          nosis: r.nosis ?? "",
          nama: r.nama ?? "",
          kelompok_angkatan: r.kelompok_angkatan ?? "",
          batalion: r.batalion ?? "",
          ton: r.ton ?? "",
          mapel: r.mapel ?? "",
          semester: r.semester ?? "",
          pertemuan: r.pertemuan ?? null,
          nilai: r.nilai ?? "",
          catatan: r.catatan ?? "",
          created_at: r.created_at ? new Date(r.created_at) : null,
          updated_at: r.updated_at ? new Date(r.updated_at) : null,
        });
      }

      const ts = new Date();
      const fname = `mapel${
        angkatan ? `-angkatan-${angkatan}` : ""
      }-${ts.getFullYear()}${String(ts.getMonth() + 1).padStart(
        2,
        "0"
      )}${String(ts.getDate()).padStart(2, "0")}-${String(
        ts.getHours()
      ).padStart(2, "0")}${String(ts.getMinutes()).padStart(2, "0")}${String(
        ts.getSeconds()
      ).padStart(2, "0")}.xlsx`;
      const arrBuf = await wb.xlsx.writeBuffer();
      const nodeBuf = Buffer.from(arrBuf);
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader("Content-Length", String(nodeBuf.length));
      res.setHeader("Content-Disposition", `attachment; filename="${fname}"`);
      if (req.method === "HEAD") return res.status(200).end();
      return res.status(200).send(nodeBuf);
    }

    // ===== EXPORT PIVOT (pertemuan ke samping) untuk mapel tertentu =====
    const where = [];
    const params = [];
    let p = 1;

    if (angkatan) {
      where.push(`COALESCE(s.kelompok_angkatan, '') = $${p++}`);
      params.push(angkatan);
    }
    if (semester) {
      where.push(`COALESCE(m.semester, '') = $${p++}`);
      params.push(semester);
    }
    // mapelName WAJIB di jalur pivot
    where.push(`LOWER(COALESCE(m.mapel,'')) = LOWER($${p++})`);
    params.push(mapelName);

    if (q) {
      where.push(`(
        LOWER(COALESCE(s.nama,'')) LIKE LOWER($${p})
        OR LOWER(COALESCE(s.nosis,'')) LIKE LOWER($${p})
      )`);
      params.push(`%${q}%`);
      p++;
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    // 1) ambil daftar pertemuan (minggu) yang relevan
    const weeksSql = `
      SELECT DISTINCT m.pertemuan AS w
      FROM mapel m
      JOIN siswa s ON s.id = m.siswa_id
      ${whereSql}
      ORDER BY 1 ASC
    `;
    const weekRes = await pool.query(weeksSql, params);
    const weeks = weekRes.rows
      .map((r) => Number(r.w))
      .filter((n) => Number.isFinite(n))
      .sort((a, b) => a - b);

    // 2) Query utama: base → agg → ranks → pivot
    const pivotExprs = weeks.length
      ? weeks
          .map(
            (w) =>
              `MAX(CASE WHEN b.pertemuan = ${w} THEN b.nilai_num END) AS "Pertemuan ${w}"`
          )
          .join(",\n          ")
      : `NULL::numeric AS "_no_weeks_"`;

    const sql = `
      WITH base AS (
        SELECT
          s.id AS siswa_id,
          s.nosis,
          s.nama,
          s.kelompok_angkatan,
          s.batalion,
          s.ton,
          UPPER(NULLIF(regexp_replace(COALESCE(s.ton,''), '[^A-Za-z].*', ''), '')) AS kompi,
          CASE
            WHEN regexp_replace(COALESCE(s.ton,''), '\\D+', '', 'g') <> '' THEN
              (regexp_replace(s.ton, '\\D+', '', 'g'))::int
            ELSE NULL
          END AS pleton,
          m.pertemuan,
          (CASE WHEN m.nilai ~ '^-?\\d+(\\.\\d+)?$' THEN m.nilai::numeric ELSE NULL END) AS nilai_num
        FROM mapel m
        JOIN siswa s ON s.id = m.siswa_id
        ${whereSql}
      ),
      agg AS (
        SELECT
          siswa_id, nosis, nama, kelompok_angkatan, batalion, ton, kompi, pleton,
          SUM(nilai_num)::numeric(20,3) AS sum_nilai,
          AVG(nilai_num)::numeric(20,3) AS avg_nilai
        FROM base
        GROUP BY siswa_id, nosis, nama, kelompok_angkatan, batalion, ton, kompi, pleton
      ),
      ranks AS (
        SELECT
          a.*,
          RANK() OVER (ORDER BY a.avg_nilai DESC NULLS LAST) AS rk_global,
          COUNT(*) OVER () AS total_global,
          RANK() OVER (PARTITION BY a.batalion ORDER BY a.avg_nilai DESC NULLS LAST) AS rk_batalion,
          COUNT(*) OVER (PARTITION BY a.batalion) AS total_batalion,
          RANK() OVER (PARTITION BY a.kompi ORDER BY a.avg_nilai DESC NULLS LAST) AS rk_kompi,
          COUNT(*) OVER (PARTITION BY a.kompi) AS total_kompi,
          RANK() OVER (PARTITION BY a.pleton ORDER BY a.avg_nilai DESC NULLS LAST) AS rk_pleton,
          COUNT(*) OVER (PARTITION BY a.pleton) AS total_pleton
        FROM agg a
      ),
      pivot AS (
        SELECT
          b.siswa_id
          ${weeks.length ? "," : ""}
          ${pivotExprs}
        FROM base b
        GROUP BY b.siswa_id
      )
      SELECT
        r.nosis, r.nama, r.kelompok_angkatan, r.batalion, r.kompi, r.pleton,
        r.sum_nilai, r.avg_nilai,
        r.rk_global, r.total_global,
        r.rk_batalion, r.total_batalion,
        r.rk_kompi, r.total_kompi,
        r.rk_pleton, r.total_pleton
        ${weeks.length ? "," : ""}
        ${weeks.map((w) => `"Pertemuan ${w}"`).join(", ")}
      FROM ranks r
      LEFT JOIN pivot p ON p.siswa_id = r.siswa_id
      ORDER BY ${
        sortCol === "nosis" ? "r.nosis" : "r.nama"
      } ${sortDir}, r.nosis ASC
    `;

    const dataRes = await pool.query(sql, params);
    const rows = dataRes.rows || [];

    // 3) Build Excel (pivot)
    const wb = new ExcelJS.Workbook();
    const sheetTitle = `Rekap ${mapelName}${
      semester ? ` (Smt ${semester})` : ""
    }`;
    const ws = wb.addWorksheet(sheetTitle.substring(0, 31)); // excel limit 31 chars

    const baseCols = [
      { header: "NOSIS", key: "nosis", width: 14 },
      { header: "Nama", key: "nama", width: 28 },
      { header: "Angkatan", key: "kelompok_angkatan", width: 14 },
      { header: "Batalion", key: "batalion", width: 12 },
      { header: "Kompi", key: "kompi", width: 10 },
      { header: "Pleton", key: "pleton", width: 10 },
      {
        header: "Jumlah",
        key: "sum_nilai",
        width: 14,
        style: { numFmt: "0.000" },
      },
      {
        header: "Rata-rata",
        key: "avg_nilai",
        width: 14,
        style: { numFmt: "0.000" },
      },
      { header: "R. Global", key: "rk_global_disp", width: 12 },
      { header: "R. Batalion", key: "rk_batalion_disp", width: 12 },
      { header: "R. Kompi", key: "rk_kompi_disp", width: 12 },
      { header: "R. Pleton", key: "rk_pleton_disp", width: 12 },
    ];
    const weekCols = weeks.map((w) => ({
      header: `Pertemuan ${w}`,
      key: `pertemuan_${w}`,
      width: 13,
      style: { numFmt: "0.000" },
    }));
    ws.columns = [...baseCols, ...weekCols];
    ws.getRow(1).font = { bold: true };

    for (const r of rows) {
      const obj = {
        nosis: r.nosis ?? "",
        nama: r.nama ?? "",
        kelompok_angkatan: r.kelompok_angkatan ?? "",
        batalion: r.batalion ?? "",
        kompi: r.kompi ?? "",
        pleton: r.pleton ?? "",
        sum_nilai: r.sum_nilai != null ? Number(r.sum_nilai) : null,
        avg_nilai: r.avg_nilai != null ? Number(r.avg_nilai) : null,
        rk_global_disp:
          r.rk_global != null && r.total_global
            ? `${r.rk_global}/${r.total_global}`
            : "-",
        rk_batalion_disp:
          r.rk_batalion != null && r.total_batalion
            ? `${r.rk_batalion}/${r.total_batalion}`
            : "-",
        rk_kompi_disp:
          r.rk_kompi != null && r.total_kompi
            ? `${r.rk_kompi}/${r.total_kompi}`
            : "-",
        rk_pleton_disp:
          r.rk_pleton != null && r.total_pleton
            ? `${r.rk_pleton}/${r.total_pleton}`
            : "-",
      };
      for (const w of weeks) {
        const colName = `Pertemuan ${w}`;
        obj[`pertemuan_${w}`] = r[colName] != null ? Number(r[colName]) : null;
      }
      ws.addRow(obj);
    }

    // 4) Kirim response
    const ts = new Date();
    const y = ts.getFullYear();
    const m2 = String(ts.getMonth() + 1).padStart(2, "0");
    const d2 = String(ts.getDate()).padStart(2, "0");
    const hh = String(ts.getHours()).padStart(2, "0");
    const mm2 = String(ts.getMinutes()).padStart(2, "0");
    const ss = String(ts.getSeconds()).padStart(2, "0");
    const labelAngkatan = angkatan ? `-angkatan-${angkatan}` : "";
    const labelMapel = mapelName ? `-mapel-${mapelName}` : "";
    const labelSemester = semester ? `-semester-${semester}` : "";
    const fname = `rekap-mapel${labelAngkatan}${labelMapel}${labelSemester}-${y}${m2}${d2}-${hh}${mm2}${ss}.xlsx`;

    const arrBuf = await wb.xlsx.writeBuffer();
    const nodeBuf = Buffer.from(arrBuf);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Length", String(nodeBuf.length));
    res.setHeader("Content-Disposition", `attachment; filename="${fname}"`);
    if (req.method === "HEAD") return res.status(200).end();
    return res.status(200).send(nodeBuf);
  } catch (e) {
    console.error("[export.mapel.xlsx pivot]", e);
    return res.status(500).send("Gagal membuat Excel Mapel (pivot).");
  }
}

// ---------- helper: apakah tabel punya kolom tertentu ----------
async function tableHasColumn(tableName, columnName) {
  const sql = `
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name=$1 AND column_name=$2
    LIMIT 1
  `;
  const { rows } = await pool.query(sql, [tableName, columnName]);
  return rows.length > 0;
}

// ---------- helper: whitelist sort ----------
function sanitizeSimpleSort({ sort_by, sort_dir }) {
  const col =
    String(sort_by || "nama").toLowerCase() === "nosis" ? "nosis" : "nama";
  const dir =
    String(sort_dir || "asc").toLowerCase() === "desc" ? "DESC" : "ASC";
  return { col, dir };
}

async function exportJasmaniRekapExcel(req, res) {
  try {
    const q = String(req.query.q || "").trim();
    const angkatan = String(req.query.angkatan || "").trim();
    const tahapInput = String(req.query.tahap ?? "").trim(); // "" = auto
    const { col: sortCol, dir: sortDir } = sanitizeSimpleSort({
      sort_by: req.query.sort_by,
      sort_dir: req.query.sort_dir,
    });

    // WHERE dasar (filter siswa)
    const whereParts = [];
    const params = [];
    let p = 1;

    if (angkatan) {
      whereParts.push(`COALESCE(s.kelompok_angkatan,'') = $${p++}`);
      params.push(angkatan);
    }
    if (q) {
      whereParts.push(
        `(LOWER(s.nama) LIKE LOWER($${p}) OR LOWER(s.nosis) LIKE LOWER($${p}))`
      );
      params.push(`%${q}%`);
      p++;
    }
    const whereSQL = whereParts.length
      ? `WHERE ${whereParts.join(" AND ")}`
      : "";

    // Cek apakah tabel jasmani_spn punya kolom tahap
    const hasTahap = await tableHasColumn("jasmani_spn", "tahap");

    // Tentukan tahapFinal bila kolom ada
    let tahapFinal = null;
    if (hasTahap) {
      if (tahapInput !== "") {
        const n = parseInt(tahapInput, 10);
        if (Number.isFinite(n)) tahapFinal = n;
      }
      if (tahapFinal == null) {
        const maxSql = `
          SELECT MAX(j.tahap)::int AS max_tahap
          FROM jasmani_spn j
          JOIN siswa s ON s.id = j.siswa_id
          ${whereSQL}
        `;
        const maxRes = await pool.query(maxSql, params);
        tahapFinal = maxRes.rows?.[0]?.max_tahap ?? null;
        if (tahapFinal == null) {
          // tidak ada data → kembalikan file kosong yang informatif
          const wbEmpty = new ExcelJS.Workbook();
          const wsEmpty = wbEmpty.addWorksheet("Rekap Jasmani");
          wsEmpty.addRow(["Tidak ada data untuk filter ini"]);
          res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          );
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="rekap-jasmani-empty.xlsx"`
          );
          await wbEmpty.xlsx.write(res);
          return res.end();
        }
      }
    }

    // SQL utama: dua jalur (punya tahap vs tidak)
    const sql = hasTahap
      ? `
        WITH base AS (
          SELECT
            s.id AS siswa_id,
            s.nosis, s.nama, s.kelompok_angkatan, s.batalion, s.ton,
            UPPER(NULLIF(regexp_replace(COALESCE(s.ton,''), '[^A-Za-z].*', ''), '')) AS kompi,
            CASE
              WHEN regexp_replace(COALESCE(s.ton,''), '\\D+', '', 'g') <> '' THEN
                (regexp_replace(s.ton, '\\D+', '', 'g'))::int
              ELSE NULL
            END AS pleton,
            j.tahap,
            j.lari_12_menit_ts::numeric   AS lari_12_menit_ts,
            j.lari_12_menit_rs::numeric   AS lari_12_menit_rs,
            j.sit_up_ts::numeric          AS sit_up_ts,
            j.sit_up_rs::numeric          AS sit_up_rs,
            j.shuttle_run_ts::numeric     AS shuttle_run_ts,
            j.shuttle_run_rs::numeric     AS shuttle_run_rs,
            j.push_up_ts::numeric         AS push_up_ts,
            j.push_up_rs::numeric         AS push_up_rs,
            j.pull_up_ts::numeric         AS pull_up_ts,
            j.pull_up_rs::numeric         AS pull_up_rs,
            j.nilai_akhir::numeric        AS nilai_akhir,
            j.keterangan
          FROM jasmani_spn j
          JOIN siswa s ON s.id = j.siswa_id
          ${whereSQL}
            ${whereSQL ? "AND" : "WHERE"} j.tahap = $${p}
        ),
        ranked AS (
          SELECT
            b.*,
            RANK() OVER (ORDER BY b.nilai_akhir DESC NULLS LAST) AS rk_global,
            COUNT(*) OVER () AS total_global,
            RANK() OVER (PARTITION BY b.batalion ORDER BY b.nilai_akhir DESC NULLS LAST) AS rk_batalion,
            COUNT(*) OVER (PARTITION BY b.batalion) AS total_batalion,
            RANK() OVER (PARTITION BY b.kompi ORDER BY b.nilai_akhir DESC NULLS LAST) AS rk_kompi,
            COUNT(*) OVER (PARTITION BY b.kompi) AS total_kompi,
            RANK() OVER (PARTITION BY b.pleton ORDER BY b.nilai_akhir DESC NULLS LAST) AS rk_pleton,
            COUNT(*) OVER (PARTITION BY b.pleton) AS total_pleton
          FROM base b
        )
        SELECT *
        FROM ranked
        ORDER BY ${sortCol === "nosis" ? "nosis" : "nama"} ${sortDir}, nosis ASC
      `
      : `
        -- Tidak filter tahap: ambil baris TERBARU per siswa (created_at paling baru)
        WITH latest AS (
          SELECT DISTINCT ON (j.siswa_id) j.*
          FROM jasmani_spn j
          ORDER BY j.siswa_id, j.created_at DESC
        ),
        base AS (
          SELECT
            s.id AS siswa_id,
            s.nosis, s.nama, s.kelompok_angkatan, s.batalion, s.ton,
            UPPER(NULLIF(regexp_replace(COALESCE(s.ton,''), '[^A-Za-z].*', ''), '')) AS kompi,
            CASE
              WHEN regexp_replace(COALESCE(s.ton,''), '\\D+', '', 'g') <> '' THEN
                (regexp_replace(s.ton, '\\D+', '', 'g'))::int
              ELSE NULL
            END AS pleton,
            NULL::int AS tahap,
            l.lari_12_menit_ts::numeric   AS lari_12_menit_ts,
            l.lari_12_menit_rs::numeric   AS lari_12_menit_rs,
            l.sit_up_ts::numeric          AS sit_up_ts,
            l.sit_up_rs::numeric          AS sit_up_rs,
            l.shuttle_run_ts::numeric     AS shuttle_run_ts,
            l.shuttle_run_rs::numeric     AS shuttle_run_rs,
            l.push_up_ts::numeric         AS push_up_ts,
            l.push_up_rs::numeric         AS push_up_rs,
            l.pull_up_ts::numeric         AS pull_up_ts,
            l.pull_up_rs::numeric         AS pull_up_rs,
            l.nilai_akhir::numeric        AS nilai_akhir,
            l.keterangan
          FROM latest l
          JOIN siswa s ON s.id = l.siswa_id
          ${whereSQL}
        ),
        ranked AS (
          SELECT
            b.*,
            RANK() OVER (ORDER BY b.nilai_akhir DESC NULLS LAST) AS rk_global,
            COUNT(*) OVER () AS total_global,
            RANK() OVER (PARTITION BY b.batalion ORDER BY b.nilai_akhir DESC NULLS LAST) AS rk_batalion,
            COUNT(*) OVER (PARTITION BY b.batalion) AS total_batalion,
            RANK() OVER (PARTITION BY b.kompi ORDER BY b.nilai_akhir DESC NULLS LAST) AS rk_kompi,
            COUNT(*) OVER (PARTITION BY b.kompi) AS total_kompi,
            RANK() OVER (PARTITION BY b.pleton ORDER BY b.nilai_akhir DESC NULLS LAST) AS rk_pleton,
            COUNT(*) OVER (PARTITION BY b.pleton) AS total_pleton
          FROM base b
        )
        SELECT *
        FROM ranked
        ORDER BY ${sortCol === "nosis" ? "nosis" : "nama"} ${sortDir}, nosis ASC
      `;

    const { rows } = await pool.query(
      sql,
      hasTahap ? [...params, tahapFinal] : params
    );

    // ===== Build Excel: header 2-level seperti UI RekapJasmani.jsx =====
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Rekap Jasmani");

    // Baris 1 (judul grup) & Baris 2 (subjudul TS/RS)
    const row1 = [
      "NOSIS",
      "Nama",
      "Angkatan",
      "Tahap",
      "R. Batalion",
      "R. Kompi",
      "R. Pleton",
      "Lari 12 Menit",
      "",
      "Sit Up",
      "",
      "Shuttle Run",
      "",
      "Push Up",
      "",
      "Pull Up",
      "",
      "Nilai Akhir",
      "Keterangan",
    ];
    const row2 = [
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "TS",
      "RS",
      "TS",
      "RS",
      "TS",
      "RS",
      "TS",
      "RS",
      "TS",
      "RS",
      "",
      "",
    ];

    ws.addRow(row1);
    ws.addRow(row2);

    // Merge header
    [
      "A1:A2",
      "B1:B2",
      "C1:C2",
      "D1:D2",
      "E1:E2",
      "F1:F2",
      "G1:G2",
      "H1:I1",
      "J1:K1",
      "L1:M1",
      "N1:O1",
      "P1:Q1",
      "R1:R2",
      "S1:S2",
    ].forEach((r) => ws.mergeCells(r));

    // Styling header
    [1, 2].forEach((rn) => {
      const r = ws.getRow(rn);
      r.font = { bold: true };
      r.alignment = {
        vertical: "middle",
        horizontal: "center",
        wrapText: true,
      };
    });

    // Lebar kolom
    const widths = {
      A: 14,
      B: 28,
      C: 14,
      D: 8,
      E: 12,
      F: 10,
      G: 10,
      H: 12,
      I: 12,
      J: 12,
      K: 12,
      L: 14,
      M: 14,
      N: 12,
      O: 12,
      P: 12,
      Q: 12,
      R: 14,
      S: 30,
    };
    Object.entries(widths).forEach(([col, w]) => (ws.getColumn(col).width = w));

    // Format angka untuk metrik & nilai akhir
    ["H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R"].forEach((c) => {
      ws.getColumn(c).numFmt = "0.000";
    });

    // Data
    for (const r of rows) {
      ws.addRow([
        r.nosis ?? "",
        r.nama ?? "",
        r.kelompok_angkatan ?? "",
        r.tahap ?? null,
        r.rk_batalion != null && r.total_batalion
          ? `${r.rk_batalion}/${r.total_batalion}`
          : "-",
        r.rk_kompi != null && r.total_kompi
          ? `${r.rk_kompi}/${r.total_kompi}`
          : "-",
        r.rk_pleton != null && r.total_pleton
          ? `${r.rk_pleton}/${r.total_pleton}`
          : "-",

        r.lari_12_menit_ts != null ? Number(r.lari_12_menit_ts) : null,
        r.lari_12_menit_rs != null ? Number(r.lari_12_menit_rs) : null,

        r.sit_up_ts != null ? Number(r.sit_up_ts) : null,
        r.sit_up_rs != null ? Number(r.sit_up_rs) : null,

        r.shuttle_run_ts != null ? Number(r.shuttle_run_ts) : null,
        r.shuttle_run_rs != null ? Number(r.shuttle_run_rs) : null,

        r.push_up_ts != null ? Number(r.push_up_ts) : null,
        r.push_up_rs != null ? Number(r.push_up_rs) : null,

        r.pull_up_ts != null ? Number(r.pull_up_ts) : null,
        r.pull_up_rs != null ? Number(r.pull_up_rs) : null,

        r.nilai_akhir != null ? Number(r.nilai_akhir) : null,
        r.keterangan ?? "",
      ]);
    }

    // Freeze header dan kolom identitas
    ws.views = [{ state: "frozen", xSplit: 7, ySplit: 2 }];

    // Nama file
    const ts = new Date();
    const y = ts.getFullYear();
    const m2 = String(ts.getMonth() + 1).padStart(2, "0");
    const d2 = String(ts.getDate()).padStart(2, "0");
    const hh = String(ts.getHours()).padStart(2, "0");
    const mm2 = String(ts.getMinutes()).padStart(2, "0");
    const ss = String(ts.getSeconds()).padStart(2, "0");
    const labelAngkatan = angkatan ? `-angkatan-${angkatan}` : "";
    const labelTahap =
      hasTahap && tahapFinal != null ? `-tahap-${tahapFinal}` : "";
    const fname = `rekap-jasmani${labelAngkatan}${labelTahap}-${y}${m2}${d2}-${hh}${mm2}${ss}.xlsx`;

    const arrBuf = await wb.xlsx.writeBuffer();
    const nodeBuf = Buffer.from(arrBuf);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Length", String(nodeBuf.length));
    res.setHeader("Content-Disposition", `attachment; filename="${fname}"`);
    return res.status(200).send(nodeBuf);
  } catch (e) {
    console.error("[export.jasmani_rekap.xlsx]", e);
    return res.status(500).send("Gagal membuat Excel rekap jasmani");
  }
}

/* =========================================================================
   =                               EXPORTS                                 =
   ========================================================================= */

module.exports = {
  exportAllByNik,
  exportSiswaXlsx,
  exportMentalRekapExcel,
  exportMapelXlsx,
  exportJasmaniRekapExcel,
};
