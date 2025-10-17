// server/src/routes/backup.routes.js
const { Router } = require("express");
const backupCtl = require("../controllers/backup.controller");
const restoreCtl = require("../controllers/restore.controller"); // jika belum ada, buat stub saja

const r = Router();

// ==== BACKUP ====
r.get("/admin/backup/debug", backupCtl.debugInfo);
r.get("/admin/backup/db", backupCtl.streamDbSql);
r.get("/admin/backup/uploads-list", backupCtl.listUploads);
r.get("/admin/backup/upload-file", backupCtl.streamUploadFile);
r.get("/admin/backup/latest", backupCtl.latestBackupInfo);

// Buat snapshot baru (dipanggil tombol "Buat Cadangan Sekarang")
r.post("/admin/backup", backupCtl.backupNow);

// Unduh ZIP snapshot terbaru (dipakai Electron/Browser)
r.get("/admin/backup/archive.zip", backupCtl.downloadArchiveZip);

// ==== RESTORE (opsional) ====
r.post("/admin/restore", restoreCtl.runRestore);

module.exports = r;
