// routes/backup.routes.js
const { Router } = require("express");
const backupCtl = require("../controllers/backup.controller");
const restoreCtl = require("../controllers/restore.controller");

const r = Router();

// (Opsional) middleware auth admin

// ===== BACKUP =====
r.get("/admin/backup/debug", backupCtl.debugInfo);
r.get("/admin/backup/db", backupCtl.streamDbSql);
r.get("/admin/backup/uploads-list", backupCtl.listUploads);
r.get("/admin/backup/upload-file", backupCtl.streamUploadFile);
r.get("/admin/backup/latest", backupCtl.latestBackupInfo);

// ⬇⬇⬇ TAMBAHKAN INI ⬇⬇⬇
r.post("/admin/backup", backupCtl.backupNow); // <-- supaya POST /api/admin/backup jalan

// ===== RESTORE =====
r.post("/admin/restore", restoreCtl.runRestore);

module.exports = r;
