const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store');
const store = new Store();

const isDev = process.env.NODE_ENV !== 'production';
const RENDERER_URL = process.env.RENDERER_URL || 'http://localhost:5173';

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev) win.loadURL(RENDERER_URL);
  else win.loadFile(path.join(__dirname, '../renderer/dist/index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => BrowserWindow.getAllWindows().length === 0 && createWindow());
});
app.on('window-all-closed', () => process.platform !== 'darwin' && app.quit());

// IPC token store
ipcMain.handle('auth:setToken', (_e, t) => { store.set('auth.token', t || ''); return true; });
ipcMain.handle('auth:getToken', () => store.get('auth.token', ''));
ipcMain.handle('auth:clearToken', () => { store.delete('auth.token'); return true; });
