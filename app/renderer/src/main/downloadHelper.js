// main/downloadHelper.js
const { app } = require("electron");
const path = require("path");
const fs = require("fs");

function getOsDownloads() {
  // Electron sudah sediakan "downloads"
  return app.getPath("downloads");
}

/**
 * Resolve folder tujuan.
 * @param {object} settings { askWhere, saveFolder, exportFolder }
 * @param {object} opts { isExport: boolean }
 * @returns {string} absolute path folder tujuan default (bila TIDAK askWhere)
 */
function resolveDefaultFolder(settings, { isExport = false } = {}) {
  const downloads = getOsDownloads();
  const base =
    (isExport
      ? settings.exportFolder || settings.saveFolder
      : settings.saveFolder) || downloads;
  return base;
}

/**
 * Pastikan folder ada (opsional, boleh kamu panggil sebelum menulis file).
 */
function ensureExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

module.exports = { resolveDefaultFolder, ensureExists, getOsDownloads };
