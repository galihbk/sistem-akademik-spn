// main/preload.js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getSettings: () => ipcRenderer.invoke("settings:get"),
  setSettings: (payload) => ipcRenderer.invoke("settings:set", payload),
  chooseFolder: (opts) => ipcRenderer.invoke("folder:choose", opts),

  // (opsional) contoh trigger simpan file dari renderer:
  // savePdf: (args) => ipcRenderer.invoke('file:save-pdf', args),
});
