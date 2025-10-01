// controllers/export.controller.js
const path = require("path");
const fs = require("fs/promises");
const pool = require("../db/pool");
const { PDFDocument } = require("pdf-lib");
const mime = require("mime-types");
const puppeteer = require("puppeteer");

// ---------- helpers ----------
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
      `SELECT * FROM jasmani WHERE siswa_id = $1 ORDER BY created_at ASC`,
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

// ---------- controller ----------
exports.exportAllByNik = async (req, res) => {
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
};
