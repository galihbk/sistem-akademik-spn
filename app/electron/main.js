// electron/main.js
const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const urlMod = require("url");
const http = require("http");
const https = require("https");
const { nativeImage } = require("electron");

let mainWindow = null;
// Helper: resolve path aset (dev vs packaged)
function assetPath(rel) {
  const base = app.isPackaged
    ? path.join(process.resourcesPath, "assets") // saat packaged
    : path.join(__dirname, "assets"); // saat dev
  return path.join(base, rel);
}
/* ================= Logger sederhana ================= */
let LOG_FILE = null;
function initLogger() {
  try {
    const dir = path.join(app.getPath("userData"), "logs");
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    LOG_FILE = path.join(dir, "electron-main.log");
    log("[init] logger ready at", LOG_FILE);
  } catch (e) {
    console.error("[logger-init-error]", e);
  }
}
function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.map(String).join(" ")}\n`;
  try {
    if (LOG_FILE) fs.appendFileSync(LOG_FILE, line);
  } catch {}
  console.log(...args);
}
function showErrorBox(title, err) {
  const msg =
    err && err.stack
      ? err.stack
      : err && err.message
      ? err.message
      : String(err);
  log("[ERRORBOX]", title, msg);
  try {
    dialog.showErrorBox(title, msg);
  } catch {}
}

/* ================= Global App State ================= */
let settingsCache = {
  askWhere: false,
  saveFolder: "",
  exportFolder: "",
  backupFolder: "",
};
let authToken = null;

/* ================= BrowserWindow ================= */
app.setAppUserModelId("BSMS.SPNPurwokerto");
function createWindow() {
  try {
    const preloadPath = path.join(__dirname, "preload.js");
    if (!fs.existsSync(preloadPath)) {
      showErrorBox("Preload tidak ditemukan", new Error(preloadPath));
    }

    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      icon: nativeImage.createFromPath(assetPath("bsms.ico")),
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
      show: false,
    });

    mainWindow.once("ready-to-show", () => {
      try {
        mainWindow.show();
      } catch (e) {
        log("[ready-to-show error]", e);
      }
      if (
        process.env.OPEN_DEVTOOLS === "1" ||
        process.env.NODE_ENV !== "production"
      ) {
        try {
          mainWindow.webContents.openDevTools({ mode: "detach" });
        } catch {}
      }
    });

    const RENDERER_URL = process.env.RENDERER_URL;
    if (RENDERER_URL) {
      log("[loadURL]", RENDERER_URL);
      mainWindow
        .loadURL(RENDERER_URL)
        .catch((e) => showErrorBox("Gagal load RENDERER_URL", e));
    } else {
      const indexPath = path.join(
        process.cwd(),
        "renderer",
        "dist",
        "index.html"
      );
      log("[loadFile]", indexPath);
      mainWindow
        .loadFile(indexPath)
        .catch((e) => showErrorBox("Gagal load renderer index.html", e));
    }

    mainWindow.on("closed", () => {
      mainWindow = null;
    });
  } catch (e) {
    showErrorBox("createWindow error", e);
  }
}

/* ================= App Lifecycle ================= */
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    initLogger();
    log("[app] ready");
    createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

/* ============== Global Error Handlers ============== */
process.on("uncaughtException", (err) => {
  showErrorBox("Uncaught Exception (main)", err);
});
process.on("unhandledRejection", (reason) => {
  showErrorBox(
    "Unhandled Rejection (main)",
    reason instanceof Error ? reason : new Error(String(reason))
  );
});
app.on("render-process-gone", (_e, wc, details) => {
  log("[render-process-gone]", details && JSON.stringify(details));
});

/* ================= HTTP helpers ================== */
function notify(payload) {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("download:status", payload);
    }
  } catch (e) {
    log("[notify error]", e.message);
  }
}

function getClientAndOpts(urlStr, token) {
  const u = urlMod.parse(urlStr);
  const isHttps = u.protocol === "https:";
  const client = isHttps ? https : http;
  const opts = {
    protocol: u.protocol,
    hostname: u.hostname,
    port: u.port,
    path: (u.pathname || "") + (u.search || ""),
    method: "GET",
    headers: {},
    // NOTE: set true jika TLS valid; untuk dev local biasanya false aman
    rejectUnauthorized: false,
  };
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  return { client, opts };
}

function encodePathSegments(rel) {
  return rel.split("/").map(encodeURIComponent).join("/");
}
function ensureDir(p) {
  try {
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  } catch (e) {
    log("[ensureDir]", p, e.message);
  }
}

function httpGetJson(urlStr, token) {
  log("[httpGetJson]", urlStr);
  return new Promise((resolve, reject) => {
    const { client, opts } = getClientAndOpts(urlStr, token);
    const req = client.request(opts, (res) => {
      if (res.statusCode !== 200) {
        const err = new Error(`HTTP ${res.statusCode} for ${opts.path}`);
        log("[httpGetJson status!=200]", err.message);
        res.resume();
        return reject(err);
      }
      let buf = "";
      res.setEncoding("utf8");
      res.on("data", (d) => (buf += d));
      res.on("end", () => {
        try {
          resolve(JSON.parse(buf));
        } catch (e) {
          log("[httpGetJson parse]", e.message);
          reject(e);
        }
      });
    });
    req.on("error", (e) => {
      log("[httpGetJson req error]", e.message);
      reject(e);
    });
    req.end();
  });
}

// Download (backup uploads) — dipakai mirror
function downloadWithFallbackToFile(urls, outPath, token) {
  log("[downloadWithFallbackToFile]", urls.join(" | "), "->", outPath);
  return new Promise((resolve, reject) => {
    const errs = [];
    const tryOne = (idx) => {
      if (idx >= urls.length) {
        const err = new Error(`All sources failed: ${errs.join(" | ")}`);
        return reject(err);
      }
      const { client, opts } = getClientAndOpts(urls[idx], token);
      const out = fs.createWriteStream(outPath);
      const req = client.request(opts, (res) => {
        if (res.statusCode !== 200) {
          out.destroy();
          errs.push(`HTTP ${res.statusCode} for ${opts.path}`);
          res.resume();
          log("[download fail]", urls[idx], "->", `HTTP ${res.statusCode}`);
          return tryOne(idx + 1);
        }
        res.pipe(out);
        res.on("end", () => out.end(resolve));
      });
      req.on("error", (e) => {
        out.destroy();
        errs.push(e.message);
        log("[download req error]", urls[idx], e.message);
        tryOne(idx + 1);
      });
      out.on("error", (e) => {
        errs.push(e.message);
        log("[download out error]", outPath, e.message);
        tryOne(idx + 1);
      });
      req.end();
    };
    tryOne(0);
  });
}

/* ================= Generic Download ================= */
function getDefaultDirForDownload() {
  if (settingsCache.exportFolder && fs.existsSync(settingsCache.exportFolder))
    return settingsCache.exportFolder;
  if (settingsCache.saveFolder && fs.existsSync(settingsCache.saveFolder))
    return settingsCache.saveFolder;
  return app.getPath("downloads");
}
function inferFilenameFrom(urlStr, headers = {}) {
  const cd = headers["content-disposition"] || headers["Content-Disposition"];
  if (cd) {
    const star = /filename\*=(?:UTF-8'')?["']?([^"';]+)["']?/i.exec(cd);
    if (star && star[1]) return decodeURIComponent(star[1]);
    const plain = /filename=["']?([^"';]+)["']?/i.exec(cd);
    if (plain && plain[1]) return plain[1];
  }
  try {
    const u = new URL(urlStr);
    const base = path.basename(u.pathname || "");
    if (base && base !== "/" && base !== ".") return base;
  } catch {}
  return `download-${Date.now()}`;
}

async function downloadToFile(urlStr, suggestedName) {
  // 1) Tentukan lokasi & nama
  let defaultDir = getDefaultDirForDownload();
  ensureDir(defaultDir);
  let defaultPath = path.join(
    defaultDir,
    suggestedName || inferFilenameFrom(urlStr)
  );

  // 2) Dialog save jika askWhere
  if (settingsCache.askWhere) {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: "Simpan File",
      defaultPath,
    });
    if (canceled || !filePath) {
      notify({
        type: "download",
        phase: "error",
        url: urlStr,
        message: "Dibatalkan",
      });
      return { ok: false, message: "Dibatalkan" };
    }
    defaultPath = filePath;
  } else {
    ensureDir(path.dirname(defaultPath));
  }

  // 3) Request + PROGRESS NOTIFY
  return await new Promise((resolve) => {
    try {
      notify({ type: "download", phase: "start", url: urlStr });

      const { client, opts } = getClientAndOpts(urlStr, authToken);
      const req = client.request(opts, (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          notify({
            type: "download",
            phase: "error",
            url: urlStr,
            message: `HTTP ${res.statusCode}`,
          });
          return resolve({ ok: false, message: `HTTP ${res.statusCode}` });
        }

        // Nama file dari header kalau ada
        const hdrName = inferFilenameFrom(urlStr, res.headers);
        if (hdrName) {
          const newPath = path.join(path.dirname(defaultPath), hdrName);
          if (newPath !== defaultPath) defaultPath = newPath;
        }

        const out = fs.createWriteStream(defaultPath);
        const total = Number(res.headers["content-length"] || 0);
        let received = 0;
        let lastTick = Date.now();

        res.on("data", (chunk) => {
          received += chunk.length;

          // throttle kirim progres biar gak banjir
          const now = Date.now();
          if (now - lastTick >= 120) {
            notify({
              type: "download",
              phase: "progress",
              url: urlStr,
              received,
              total,
            });
            lastTick = now;
          }
        });

        res.pipe(out);

        res.on("end", () => {
          out.end(() => {
            notify({
              type: "download",
              phase: "done",
              url: urlStr,
              path: defaultPath,
              received,
              total,
            });
            resolve({ ok: true, path: defaultPath });
          });
        });

        out.on("error", (e) => {
          notify({
            type: "download",
            phase: "error",
            url: urlStr,
            message: e.message,
          });
          resolve({ ok: false, message: e.message });
        });
      });

      req.on("error", (e) => {
        notify({
          type: "download",
          phase: "error",
          url: urlStr,
          message: e.message,
        });
        resolve({ ok: false, message: e.message });
      });

      req.end();
    } catch (e) {
      notify({
        type: "download",
        phase: "error",
        url: urlStr,
        message: e.message,
      });
      resolve({ ok: false, message: e.message });
    }
  });
}

/* ================ IPC: AUTH & SETTINGS ================ */
ipcMain.handle("auth:setToken", async (_e, t) => {
  authToken = t || null;
  log("[auth:setToken]", !!authToken);
  return true;
});
ipcMain.handle("auth:getToken", async () => authToken);
ipcMain.handle("auth:clearToken", async () => {
  authToken = null;
  log("[auth:clearToken]");
  return true;
});

ipcMain.handle("settings:getAll", async () => settingsCache);
ipcMain.handle("settings:set", async (_evt, s) => {
  settingsCache = { ...settingsCache, ...s };
  log("[settings:set]", JSON.stringify(settingsCache));
  return true;
});
ipcMain.handle(
  "settings:chooseFolder",
  async (_evt, { initialPath, title }) => {
    const res = await dialog.showOpenDialog({
      title: title || "Pilih Folder",
      defaultPath: initialPath || undefined,
      properties: ["openDirectory", "createDirectory"],
    });
    if (res.canceled || !res.filePaths?.[0]) return null;
    return res.filePaths[0];
  }
);

/* ================ IPC: DOWNLOAD (generic) ================ */
ipcMain.handle("download:start", async (_evt, urlStr, opt = {}) => {
  if (!urlStr) return { ok: false, message: "URL kosong" };
  try {
    const res = await downloadToFile(urlStr, opt.filename);
    log("[download:start]", urlStr, "->", res.ok ? res.path : res.message);
    return res;
  } catch (e) {
    log("[download:start error]", e.message);
    notify({
      type: "download",
      phase: "error",
      url: urlStr,
      message: e.message,
    });
    return { ok: false, message: e.message };
  }
});

/* ====== Info default dir & open in folder ====== */
ipcMain.handle("downloads:getDefaultDir", async () => {
  const dir = getDefaultDirForDownload();
  return {
    dir,
    askWhere: !!settingsCache.askWhere,
    source:
      settingsCache.exportFolder && fs.existsSync(settingsCache.exportFolder)
        ? "exportFolder"
        : settingsCache.saveFolder && fs.existsSync(settingsCache.saveFolder)
        ? "saveFolder"
        : "system",
  };
});
ipcMain.handle("downloads:openInFolder", async (_e, fullPath) => {
  try {
    if (!fullPath) return false;
    if (!fs.existsSync(fullPath)) return false;
    shell.showItemInFolder(fullPath);
    return true;
  } catch {
    return false;
  }
});

/* ================== BACKUP & RESTORE ================== */
function defaultBackupDir() {
  return path.join(app.getPath("userData"), "backups");
}

async function getLastLocalBackupFile() {
  const dir = defaultBackupDir();
  if (!fs.existsSync(dir)) return null;
  const names = await fs.promises.readdir(dir);
  const files = names
    .filter((n) => n.endsWith(".zip"))
    .map((n) => path.join(dir, n));
  if (!files.length) return null;
  files.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return files[0];
}

ipcMain.handle("backup:run", async (_evt, apiBaseOrOpts) => {
  try {
    const apiBase =
      typeof apiBaseOrOpts === "string"
        ? apiBaseOrOpts
        : apiBaseOrOpts?.apiBase ||
          process.env.API_BASE ||
          "http://localhost:4000";

    const ts = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 15); // YYYYMMDDHHmmss
    const outDir = defaultBackupDir();
    const outPath = path.join(outDir, `backup-${ts}.zip`);
    await fs.promises.mkdir(outDir, { recursive: true });

    const url = new URL("/api/admin/backup/archive.zip", apiBase).toString();
    const client = url.startsWith("https") ? https : http;

    await new Promise((resolve, reject) => {
      const file = fs.createWriteStream(outPath);
      const req = client.get(url, (res) => {
        if (res.statusCode !== 200) {
          file.close();
          fs.unlink(outPath, () => {});
          return reject(new Error(`HTTP ${res.statusCode}`));
        }
        res.pipe(file);
        file.on("finish", () => file.close(resolve));
      });
      req.on("error", (err) => {
        file.close();
        fs.unlink(outPath, () => {});
        reject(err);
      });
    });

    return { ok: true, path: outPath };
  } catch (e) {
    return { ok: false, message: e.message };
  }
});

ipcMain.handle("backup:lastLocal", async () => {
  const dir = defaultBackupDir();
  if (!fs.existsSync(dir)) return { exists: false };
  const names = await fs.promises.readdir(dir);
  const files = names
    .filter((n) => n.endsWith(".zip"))
    .map((n) => path.join(dir, n));
  if (!files.length) return { exists: false };
  files.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return {
    exists: true,
    path: files[0],
    mtimeMs: fs.statSync(files[0]).mtimeMs,
  };
});

// Upload ZIP lokal ke server untuk restore (multipart/form-data)
ipcMain.handle("backup:restoreFromLocal", async (_evt, apiBaseOrOpts) => {
  try {
    const apiBase =
      typeof apiBaseOrOpts === "string"
        ? apiBaseOrOpts
        : apiBaseOrOpts?.apiBase ||
          process.env.API_BASE ||
          "http://localhost:4000";

    const zipPath = await getLastLocalBackupFile();
    if (!zipPath)
      return { ok: false, message: "Backup ZIP lokal tidak ditemukan." };

    const boundary = "----ElectronFormData" + Date.now();
    const urlObj = new URL("/api/admin/restore", apiBase);
    const isHttps = urlObj.protocol === "https:";
    const client = isHttps ? https : http;

    const opts = {
      method: "POST",
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + (urlObj.search || ""),
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      rejectUnauthorized: false, // dev local/self-signed
    };

    const head =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${path.basename(
        zipPath
      )}"\r\n` +
      `Content-Type: application/zip\r\n\r\n`;
    const tail = `\r\n--${boundary}--\r\n`;

    await new Promise((resolve, reject) => {
      const req = client.request(opts, (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (c) => (body += c));
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve();
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body || "(no body)"}`));
          }
        });
      });
      req.on("error", reject);

      req.write(head);
      const file = fs.createReadStream(zipPath);
      file.on("error", reject);
      file.on("end", () => {
        req.write(tail);
        req.end();
      });
      file.pipe(req, { end: false });
    });

    return { ok: true, path: zipPath };
  } catch (e) {
    return { ok: false, message: e.message };
  }
});
