const fs = require("fs");
const XLSX = require("xlsx");
const pool = require("../db/pool");

function normMapel(s){
  return String(s||"").trim().replace(/\s+/g," ").replace(/\s*\/\s*/g,"/");
}
function toNum(v){
  if (v==null) return null;
  const f = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(f) ? f : null;
}

exports.importExcel = async (req, res) => {
  if (!req.file) return res.status(400).json({ ok:false, message:"File (field: file) wajib" });

  const filePath = req.file.path;
  try {
    const wb = XLSX.readFile(filePath, { cellDates:true });
    const ws = wb.Sheets["Rek_mat"];
    if (!ws) return res.status(400).json({ ok:false, message:"Sheet 'Rek_mat' tidak ditemukan" });

    const rows = XLSX.utils.sheet_to_json(ws, { defval:null });
    if (!rows.length) return res.json({ ok:true, sheet:"Rek_mat", summary:{inserted:0,updated:0,skipped:0,errors:0}, headers:[] });

    const ID_COLS = new Set(["nosis","nos","nama","angkatan","kelompok_angkatan"]);
    const headers = Object.keys(rows[0] || {});
    const mapelHeaders = headers.filter(h => !ID_COLS.has(String(h).toLowerCase()));

    const siswaByNosis = new Map();
    const siswaByNama  = new Map();

    async function getSiswaId(nosis, nama){
      if (nosis){
        const key = String(nosis).trim();
        if (siswaByNosis.has(key)) return siswaByNosis.get(key);
        const r = await pool.query(`SELECT id FROM siswa WHERE TRIM(nosis)=TRIM($1) LIMIT 1`, [key]);
        const id = r.rowCount ? r.rows[0].id : null;
        siswaByNosis.set(key, id);
        return id;
      }
      if (nama){
        const key = String(nama).trim().toLowerCase();
        if (siswaByNama.has(key)) return siswaByNama.get(key);
        const r = await pool.query(`SELECT id FROM siswa WHERE LOWER(TRIM(nama))=LOWER(TRIM($1)) LIMIT 1`, [key]);
        const id = r.rowCount ? r.rows[0].id : null;
        siswaByNama.set(key, id);
        return id;
      }
      return null;
    }

    let inserted=0, updated=0, skipped=0;
    const errors = [];

    for (let i=0;i<rows.length;i++){
      const raw = rows[i];
      const nosis = raw.NOSIS ?? raw.Nosis ?? raw.Nos ?? raw.nosis ?? null;
      const nama  = raw.Nama ?? raw.nama ?? null;

      const siswa_id = await getSiswaId(nosis, nama);
      if (!siswa_id){
        skipped++;
        errors.push(`Baris ${i+2}: siswa tidak ditemukan (NOSIS=${nosis||"-"}, Nama=${nama||"-"})`);
        continue;
      }

      for (const h of mapelHeaders){
        const nilai = toNum(raw[h]);
        if (nilai == null) continue;
        const mapel = normMapel(h);

        try{
          const q = `
            INSERT INTO mapel (siswa_id, mapel, nilai, updated_at)
            VALUES ($1,$2,$3, now())
            ON CONFLICT (siswa_id, mapel)
            DO UPDATE SET nilai = EXCLUDED.nilai, updated_at = now()
            RETURNING (xmax = 0) AS inserted;`;
          const r = await pool.query(q, [siswa_id, mapel, nilai]);
          if (r.rows[0].inserted) inserted++; else updated++;
        }catch(e){
          errors.push(`Baris ${i+2} "${mapel}": ${e.message}`);
        }
      }
    }

    res.json({
      ok:true,
      sheet:"Rek_mat",
      headers: mapelHeaders.map(normMapel),
      summary: { inserted, updated, skipped, errors: errors.length },
      errors
    });
  } catch (e) {
    console.error("[mapel.importExcel]", e);
    res.status(500).json({ ok:false, message:e.message });
  } finally {
    fs.promises.unlink(filePath).catch(()=>{});
  }
};
