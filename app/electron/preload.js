// electron/preload.js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("authAPI", {
  setToken: (t) => ipcRenderer.invoke("auth:setToken", t),
  getToken: () => ipcRenderer.invoke("auth:getToken"),
  clearToken: () => ipcRenderer.invoke("auth:clearToken"),
});

contextBridge.exposeInMainWorld("electronAPI", {
  // download/export
  download: (url) => ipcRenderer.invoke("download:start", url),
  onDownloadStatus: (cb) => {
    const fn = (_ev, payload) => cb && cb(payload);
    ipcRenderer.on("download:status", fn);
    return () => ipcRenderer.off("download:status", fn);
  },

  // settings
  getSettings: () => ipcRenderer.invoke("settings:getAll"),
  setSettings: (payload) => ipcRenderer.invoke("settings:set", payload),
  chooseFolder: (opts) => ipcRenderer.invoke("settings:chooseFolder", opts),
});
