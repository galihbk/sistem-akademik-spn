const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('authAPI', {
  setToken: (t) => ipcRenderer.invoke('auth:setToken', t),
  getToken: () => ipcRenderer.invoke('auth:getToken'),
  clearToken: () => ipcRenderer.invoke('auth:clearToken')
});
