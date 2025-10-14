// server/src/controllers/import.controller.js
const pool = require("../db/pool");
const {
  importSiswaFromWorkbookBuffer,
} = require("../services/siswaImport.service");
const {
  importMentalFromWorkbookBuffer,
} = require("../services/mentalImport.service");

async function importSiswa(req, res) {
  if (!req.file?.buffer)
    return res.status(400).json({ message: "File is required" });

  const dryRun = String(req.query.dryRun || "false") === "true";

  // 🔽 NEW: ambil jenis_pendidikan dari body → query → header
  const jenisPendidikan =
    (req.body &&
      typeof req.body.jenis_pendidikan === "string" &&
      req.body.jenis_pendidikan.trim()) ||
    (typeof req.query.jenis_pendidikan === "string" &&
      req.query.jenis_pendidikan.trim()) ||
    (req.get("x-jenis-pendidikan") && req.get("x-jenis-pendidikan").trim()) ||
    null;

  try {
    const result = await importSiswaFromWorkbookBuffer(req.file.buffer, {
      dryRun,
      jenisPendidikan, // 🔽 kirim ke service
    });

    if (!dryRun) {
      const admin = req.user?.username || "admin";
      // (opsional) taruh jenis_pendidikan di 'target' agar jejak audit lebih jelas
      const target = `sheet=data siswa${
        jenisPendidikan ? `; jenis=${jenisPendidikan}` : ""
      }`;
      await pool.query(
        `INSERT INTO audit_log (admin, aksi, target, hasil, detail)
         VALUES ($1,$2,$3,$4,$5)`,
        [admin, "import_siswa", target, "ok", JSON.stringify(result)]
      );
    }

    res.json(result);
  } catch (e) {
    console.error("[import.siswa]", e);
    res.status(400).json({ message: e.message, stack: e.stack });
  }
}

async function importMental(req, res) {
  if (!req.file?.buffer)
    return res.status(400).json({ message: "File is required" });
  const dryRun = String(req.query.dryRun || "false") === "true";
  const angkatan = (req.query.angkatan || "").trim();

  try {
    const result = await importMentalFromWorkbookBuffer(req.file.buffer, {
      dryRun,
      angkatan,
    });

    if (!dryRun) {
      const admin = req.user?.username || "admin";
      await pool.query(
        `INSERT INTO audit_log (admin, aksi, target, hasil, detail)
         VALUES ($1,$2,$3,$4,$5)`,
        [
          admin,
          "import_mental",
          `sheet=MK;angkatan=${angkatan || "-"}`,
          "ok",
          JSON.stringify(result),
        ]
      );
    }

    res.json(result);
  } catch (e) {
    console.error("[import.mental]", e);
    res.status(400).json({ message: e.message, stack: e.stack });
  }
}

module.exports = { importSiswa, importMental };
