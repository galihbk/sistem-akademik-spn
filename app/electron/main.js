const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const url = require("url");
const Store = require("electron-store");

// ===== Config =====
const store = new Store({ name: "prefs" });
const isDev = process.env.NODE_ENV === "development"; // <-- yang benar
const RENDERER_URL = process.env.RENDERER_URL || "http://localhost:5173";

let win;

function createWindow() {
  // pulihkan ukuran jendela terakhir
  const last = store.get("winBounds", {
    width: 1200,
    height: 800,
    isMaximized: false,
  });

  win = new BrowserWindow({
    width: last.width,
    height: last.height,
    backgroundColor: "#0b1220",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (last.isMaximized) win.maximize();

  // Muat renderer
  loadRenderer().catch((err) => {
    console.error("[electron] loadRenderer failed:", err);
  });

  // simpan ukuran saat close
  win.on("close", () => {
    if (!win) return;
    const isMax = win.isMaximized();
    const bounds = win.getBounds();
    store.set("winBounds", {
      width: bounds.width,
      height: bounds.height,
      isMaximized: isMax,
    });
  });

  win.on("closed", () => {
    win = null;
  });
}

async function loadRenderer() {
  if (!win) return;

  // Mode DEV: coba ke dev server dulu, fallback ke file dist jika gagal
  if (isDev && RENDERER_URL) {
    try {
      await win.loadURL(RENDERER_URL);
      win.webContents.openDevTools({ mode: "detach" });
      return;
    } catch (e) {
      console.warn(
        "[electron] DEV URL gagal, fallback ke file dist:",
        e.message
      );
    }
  }

  // Mode PROD (atau fallback): file dist
  const indexPath = path.join(__dirname, "../renderer/dist/index.html");
  const fileUrl = url.pathToFileURL(indexPath).toString();
  await win.loadURL(fileUrl);
}

// ===== Lifecycle =====
app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ===== IPC: token store =====
ipcMain.handle("auth:setToken", (_e, t) => {
  store.set("auth.token", t || "");
  return true;
});
ipcMain.handle("auth:getToken", () => store.get("auth.token", ""));
ipcMain.handle("auth:clearToken", () => {
  store.delete("auth.token");
  return true;
});
