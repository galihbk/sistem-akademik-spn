// main/settingsStore.js
const { app } = require("electron");
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");

const SETTINGS_FILE = path.join(app.getPath("userData"), "settings.json");

const DEFAULTS = {
  askWhere: false,
  saveFolder: "", // "" = pakai OS Downloads
  exportFolder: "", // "" = fallback ke saveFolder/Downloads
};

async function ensureDir(p) {
  await fsp.mkdir(path.dirname(p), { recursive: true }).catch(() => {});
}

async function loadSettings() {
  try {
    const buf = await fsp.readFile(SETTINGS_FILE, "utf8");
    const parsed = JSON.parse(buf);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

async function saveSettings(s) {
  const merged = { ...DEFAULTS, ...s };
  await ensureDir(SETTINGS_FILE);
  await fsp.writeFile(SETTINGS_FILE, JSON.stringify(merged, null, 2), "utf8");
  return merged;
}

module.exports = { loadSettings, saveSettings, SETTINGS_FILE, DEFAULTS };
