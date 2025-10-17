// electron/preload.js
const { contextBridge, ipcRenderer } = require("electron");

// ===== Auth API =====
contextBridge.exposeInMainWorld("authAPI", {
  setToken: (t) => ipcRenderer.invoke("auth:setToken", t),
  getToken: () => ipcRenderer.invoke("auth:getToken"),
  clearToken: () => ipcRenderer.invoke("auth:clearToken"),
});

// ===== Electron API (downloads, settings, backup/restore) =====
contextBridge.exposeInMainWorld("electronAPI", {
  // Download / Export
  download: (url, filename) =>
    ipcRenderer.invoke("download:start", url, { filename }),
  getDefaultDownloadsDir: () => ipcRenderer.invoke("downloads:getDefaultDir"),
  openInFolder: (fullPath) =>
    ipcRenderer.invoke("downloads:openInFolder", fullPath),

  // Progress/event (opsional)
  onDownloadStatus: (cb) => {
    const fn = (_ev, payload) => cb && cb(payload);
    ipcRenderer.on("download:status", fn);
    return () => ipcRenderer.off("download:status", fn);
  },

  // Settings (lokal Electron)
  getSettings: () => ipcRenderer.invoke("settings:getAll"),
  setSettings: (payload) => ipcRenderer.invoke("settings:set", payload),
  chooseFolder: (opts) => ipcRenderer.invoke("settings:chooseFolder", opts),

  // Backup lokal ke client
  runBackup: (apiBaseOrOpts) => ipcRenderer.invoke("backup:run", apiBaseOrOpts),
  backupLastLocal: () => ipcRenderer.invoke("backup:lastLocal"),

  // Restore dari ZIP lokal
  restoreFromLocal: (apiBaseOrOpts) =>
    ipcRenderer.invoke("backup:restoreFromLocal", apiBaseOrOpts),
});
