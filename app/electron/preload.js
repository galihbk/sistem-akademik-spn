// electron/preload.js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("authAPI", {
  setToken: (t) => ipcRenderer.invoke("auth:setToken", t),
  getToken: () => ipcRenderer.invoke("auth:getToken"),
  clearToken: () => ipcRenderer.invoke("auth:clearToken"),
});

contextBridge.exposeInMainWorld("electronAPI", {
  // download / export
  download: (url, filename) =>
    ipcRenderer.invoke("download:start", url, { filename }), // ⬅️ filename optional
  getDefaultDownloadsDir: () => ipcRenderer.invoke("downloads:getDefaultDir"), // ⬅️ baru
  openInFolder: (fullPath) =>
    ipcRenderer.invoke("downloads:openInFolder", fullPath), // ⬅️ baru

  // status (backup, dll)
  onDownloadStatus: (cb) => {
    const fn = (_ev, payload) => cb && cb(payload);
    ipcRenderer.on("download:status", fn);
    return () => ipcRenderer.off("download:status", fn);
  },

  // settings
  getSettings: () => ipcRenderer.invoke("settings:getAll"),
  setSettings: (payload) => ipcRenderer.invoke("settings:set", payload),
  chooseFolder: (opts) => ipcRenderer.invoke("settings:chooseFolder", opts),

  // backup
  runBackup: (opts) => ipcRenderer.invoke("backup:run", opts),
});
