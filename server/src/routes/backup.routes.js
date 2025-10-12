// routes/backup.routes.js
const { Router } = require('express');
const backupCtl = require('../controllers/backup.controller');
const restoreCtl = require('../controllers/restore.controller');

const r = Router();

// (Opsional) pasang middleware otentikasi admin di sini

// Backup (mirror): db.sql + uploads/**
r.get('/admin/backup/debug', backupCtl.debugInfo);
r.get('/admin/backup/db', backupCtl.streamDbSql);
r.get('/admin/backup/uploads-list', backupCtl.listUploads);
r.get('/admin/backup/upload-file', backupCtl.streamUploadFile);

// Restore
r.post('/admin/restore', restoreCtl.runRestore);

module.exports = r;
