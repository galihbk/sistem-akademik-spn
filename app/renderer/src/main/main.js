// main/main.js
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const { loadSettings, saveSettings } = require("./settingsStore");
const { resolveDefaultFolder, ensureExists } = require("./downloadHelper");

let mainWindow;
let cachedSettings = null;

async function createWindow() {
  cachedSettings = await loadSettings();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // dev / prod loader
  if (process.env.VITE_DEV_SERVER_URL || process.env.ELECTRON_START_URL) {
    await mainWindow.loadURL(
      process.env.VITE_DEV_SERVER_URL || process.env.ELECTRON_START_URL
    );
  } else {
    await mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  // Optional: log lokasi file settings
  // console.log('Settings file:', require('./settingsStore').SETTINGS_FILE);
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

/* -------- IPC: Settings -------- */
ipcMain.handle("settings:get", async () => {
  if (!cachedSettings) cachedSettings = await loadSettings();
  return cachedSettings;
});

ipcMain.handle("settings:set", async (_evt, payload) => {
  cachedSettings = await saveSettings(payload || {});
  return cachedSettings;
});

/* -------- IPC: Choose folder -------- */
ipcMain.handle("folder:choose", async (_evt, { initialPath, title } = {}) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: title || "Pilih Folder",
    defaultPath: initialPath || undefined,
    properties: ["openDirectory", "createDirectory"],
  });
  if (result.canceled || !result.filePaths?.length) return null;
  return result.filePaths[0];
});

/* -------- Contoh pemakaian saat akan menyimpan file --------
   Kamu bisa panggil ini dari bagian manapun di main process
   untuk menentukan destinasi default saat askWhere=false.
*/
async function saveSomeFileExample({
  isExport = false,
  filename = "output.pdf",
  data = Buffer.from(""),
}) {
  const s = cachedSettings || (await loadSettings());

  if (s.askWhere) {
    // Tampilkan dialog "Save As"
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: isExport ? "Simpan Export" : "Simpan File",
      defaultPath: filename,
      filters: isExport ? [{ name: "PDF", extensions: ["pdf"] }] : undefined,
    });
    if (canceled || !filePath) return { canceled: true };
    require("fs").writeFileSync(filePath, data);
    return { canceled: false, path: filePath };
  } else {
    // Pakai folder default (saveFolder / exportFolder / Downloads)
    const folder = resolveDefaultFolder(s, { isExport });
    ensureExists(folder);
    const target = path.join(folder, filename);
    require("fs").writeFileSync(target, data);
    return { canceled: false, path: target };
  }
}
