// electron/main.js
const { app, BrowserWindow, ipcMain, dialog, session } = require("electron");
const path = require("path");
const url = require("url");
const Store = require("electron-store");
const fs = require("fs");

// ===== Config =====
const store = new Store({ name: "prefs" });
const isDev = process.env.NODE_ENV === "development";
const RENDERER_URL = process.env.RENDERER_URL || "http://localhost:5173";

let win;

function createWindow() {
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
  loadRenderer().catch((err) =>
    console.error("[electron] loadRenderer failed:", err)
  );

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

  // ====== Download / Export handler (terpusat) ======
  const sess =
    session.fromPartition("persist:sa-default") || session.defaultSession;

  // Terapkan listener di session default
  sess.on("will-download", (event, item /* DownloadItem */, webContents) => {
    // Preferensi
    const askWhere = !!store.get("save.askWhere", false);
    const saveFolder = store.get("save.folder", "");
    const exportFolder = store.get("export.folder", "");
    const urlStr = item.getURL();

    // Deteksi apakah ini export (kasar: path /export/all)
    const isExport = /\/export\/all/i.test(urlStr);

    // Nama file default dari server
    const filename = item.getFilename() || `download_${Date.now()}`;

    // Tentukan save path
    let chosenPath = null;

    if (askWhere) {
      // Buka dialog Save As
      event.preventDefault(); // kita override save path
      dialog
        .showSaveDialog(win, {
          title: isExport ? "Simpan File Export" : "Simpan File",
          defaultPath: path.join(
            isExport && exportFolder
              ? exportFolder
              : saveFolder || app.getPath("downloads"),
            filename
          ),
        })
        .then(({ canceled, filePath }) => {
          if (canceled || !filePath) {
            item.cancel();
            return;
          }
          item.setSavePath(filePath);
          afterSetSavePath(item, filePath);
        })
        .catch(() => item.cancel());
    } else {
      // Tanpa dialog -> simpan ke folder setting
      const baseDir =
        isExport && exportFolder
          ? exportFolder
          : saveFolder || app.getPath("downloads");
      try {
        fs.mkdirSync(baseDir, { recursive: true });
      } catch {}
      chosenPath = path.join(baseDir, filename);
      item.setSavePath(chosenPath);
      afterSetSavePath(item, chosenPath);
    }

    function afterSetSavePath(downloadItem, finalPath) {
      // Kirim status ke renderer
      if (win && !win.isDestroyed()) {
        win.webContents.send("download:status", {
          state: "started",
          filename,
          path: finalPath,
          url: urlStr,
          isExport,
        });
      }

      downloadItem.on("updated", (_e, state) => {
        if (state === "interrupted") {
          if (win && !win.isDestroyed()) {
            win.webContents.send("download:status", {
              state: "failed",
              filename,
              path: finalPath,
              url: urlStr,
              isExport,
              error: "Terputus",
            });
          }
        } else if (state === "progressing") {
          const recv = downloadItem.getReceivedBytes();
          const total = downloadItem.getTotalBytes();
          const percent = total > 0 ? Math.round((recv / total) * 100) : null;
          if (win && !win.isDestroyed()) {
            win.webContents.send("download:status", {
              state: "progress",
              filename,
              path: finalPath,
              url: urlStr,
              isExport,
              percent,
            });
          }
        }
      });

      downloadItem.once("done", (_e, state) => {
        if (!win || win.isDestroyed()) return;
        if (state === "completed") {
          win.webContents.send("download:status", {
            state: "completed",
            filename,
            path: finalPath,
            url: urlStr,
            isExport,
          });
        } else {
          win.webContents.send("download:status", {
            state: "failed",
            filename,
            path: finalPath,
            url: urlStr,
            isExport,
            error: state,
          });
        }
      });
    }
  });
}

async function loadRenderer() {
  if (!win) return;

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

// ===== IPC: settings (download/export) =====
ipcMain.handle("settings:getAll", () => {
  return {
    askWhere: !!store.get("save.askWhere", false),
    saveFolder: store.get("save.folder", ""),
    exportFolder: store.get("export.folder", ""),
  };
});

ipcMain.handle("settings:set", (_e, payload = {}) => {
  if ("askWhere" in payload) store.set("save.askWhere", !!payload.askWhere);
  if ("saveFolder" in payload)
    store.set("save.folder", String(payload.saveFolder || ""));
  if ("exportFolder" in payload)
    store.set("export.folder", String(payload.exportFolder || ""));
  return true;
});

ipcMain.handle(
  "settings:chooseFolder",
  async (_e, { initialPath = "", title = "Pilih Folder" } = {}) => {
    const result = await dialog.showOpenDialog(win, {
      title,
      properties: ["openDirectory", "createDirectory"],
      defaultPath: initialPath || undefined,
    });
    if (result.canceled || !result.filePaths?.[0]) return null;
    return result.filePaths[0];
  }
);

// ===== IPC: trigger download via URL =====
ipcMain.handle("download:start", async (_e, urlStr) => {
  if (!win) throw new Error("Window not ready");
  await win.webContents.downloadURL(urlStr);
  return true;
});
