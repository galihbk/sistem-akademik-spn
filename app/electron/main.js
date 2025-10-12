// electron/main.js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const urlMod = require('url');
const http = require('http');
const https = require('https');

let mainWindow = null;

/* =========================
 *  Logger sederhana ke file
 * ========================= */
let LOG_FILE = null;
function initLogger() {
  try {
    const dir = path.join(app.getPath('userData'), 'logs');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    LOG_FILE = path.join(dir, 'electron-main.log');
    log('[init] logger ready at', LOG_FILE);
  } catch (e) {
    console.error('[logger-init-error]', e);
  }
}
function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.map(String).join(' ')}\n`;
  try { if (LOG_FILE) fs.appendFileSync(LOG_FILE, line); } catch {}
  console.log(...args);
}
function showErrorBox(title, err) {
  const msg = (err && err.stack) ? err.stack : (err && err.message) ? err.message : String(err);
  log('[ERRORBOX]', title, msg);
  try { dialog.showErrorBox(title, msg); } catch {}
}

/* ====================
 *  Global App State
 * ==================== */
let settingsCache = {
  askWhere: false,
  saveFolder: '',
  exportFolder: '',
  backupFolder: '',
};
let authToken = null;

/* =========================
 *  Create Browser Window
 * ========================= */
function createWindow() {
  try {
    const preloadPath = path.join(__dirname, 'preload.js');
    if (!fs.existsSync(preloadPath)) {
      showErrorBox('Preload tidak ditemukan', new Error(preloadPath));
    }

    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
      show: false,
    });

    mainWindow.once('ready-to-show', () => {
      try { mainWindow.show(); } catch (e) { log('[ready-to-show error]', e); }
      if (process.env.OPEN_DEVTOOLS === '1' || process.env.NODE_ENV !== 'production') {
        try { mainWindow.webContents.openDevTools({ mode: 'detach' }); } catch {}
      }
    });

    const RENDERER_URL = process.env.RENDERER_URL;
    if (RENDERER_URL) {
      log('[loadURL]', RENDERER_URL);
      mainWindow.loadURL(RENDERER_URL).catch((e) => showErrorBox('Gagal load RENDERER_URL', e));
    } else {
      const indexPath = path.join(process.cwd(), 'renderer', 'dist', 'index.html');
      log('[loadFile]', indexPath);
      mainWindow.loadFile(indexPath).catch((e) => showErrorBox('Gagal load renderer index.html', e));
    }

    mainWindow.on('closed', () => { mainWindow = null; });
  } catch (e) {
    showErrorBox('createWindow error', e);
  }
}

/* =======================
 *  App Lifecycle Hooks
 * ======================= */
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    initLogger();
    log('[app] ready');
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

/* =========================
 *  Global Error Handlers
 * ========================= */
process.on('uncaughtException', (err) => {
  showErrorBox('Uncaught Exception (main)', err);
});
process.on('unhandledRejection', (reason) => {
  showErrorBox('Unhandled Rejection (main)', reason instanceof Error ? reason : new Error(String(reason)));
});
app.on('render-process-gone', (_e, wc, details) => {
  log('[render-process-gone]', details && JSON.stringify(details));
});

/* =========================
 *  Helper Utilities (HTTP)
 * ========================= */
function notify(payload) {
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('download:status', payload);
    }
  } catch (e) {
    log('[notify error]', e.message);
  }
}

function getClientAndOpts(urlStr, token) {
  const u = urlMod.parse(urlStr);
  const isHttps = u.protocol === 'https:';
  const client = isHttps ? https : http;
  const opts = {
    protocol: u.protocol,
    hostname: u.hostname,
    port: u.port,
    path: (u.pathname || '') + (u.search || ''),
    method: 'GET',
    headers: {},
    rejectUnauthorized: false, // set true jika TLS valid
  };
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  return { client, opts };
}

function encodePathSegments(rel) {
  return rel.split('/').map(encodeURIComponent).join('/');
}
function ensureDir(p) {
  try { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); } catch (e) { log('[ensureDir]', p, e.message); }
}

function httpGetJson(urlStr, token) {
  log('[httpGetJson]', urlStr);
  return new Promise((resolve, reject) => {
    const { client, opts } = getClientAndOpts(urlStr, token);
    const req = client.request(opts, (res) => {
      if (res.statusCode !== 200) {
        const err = new Error(`HTTP ${res.statusCode} for ${opts.path}`);
        log('[httpGetJson status!=200]', err.message);
        res.resume();
        return reject(err);
      }
      let buf = '';
      res.setEncoding('utf8');
      res.on('data', (d) => (buf += d));
      res.on('end', () => {
        try { resolve(JSON.parse(buf)); }
        catch (e) { log('[httpGetJson parse]', e.message); reject(e); }
      });
    });
    req.on('error', (e) => { log('[httpGetJson req error]', e.message); reject(e); });
    req.end();
  });
}

// Download file dari beberapa sumber (dipakai backup uploads)
function downloadWithFallbackToFile(urls, outPath, token) {
  log('[downloadWithFallbackToFile]', urls.join(' | '), '->', outPath);
  return new Promise((resolve, reject) => {
    const errs = [];
    const tryOne = (idx) => {
      if (idx >= urls.length) {
        const err = new Error(`All sources failed: ${errs.join(' | ')}`);
        return reject(err);
      }
      const { client, opts } = getClientAndOpts(urls[idx], token);
      const out = fs.createWriteStream(outPath);
      const req = client.request(opts, (res) => {
        if (res.statusCode !== 200) {
          out.destroy();
          errs.push(`HTTP ${res.statusCode} for ${opts.path}`);
          res.resume();
          log('[download fail]', urls[idx], '->', `HTTP ${res.statusCode}`);
          return tryOne(idx + 1);
        }
        res.pipe(out);
        res.on('end', () => out.end(resolve));
      });
      req.on('error', (e) => {
        out.destroy();
        errs.push(e.message);
        log('[download req error]', urls[idx], e.message);
        tryOne(idx + 1);
      });
      out.on('error', (e) => {
        errs.push(e.message);
        log('[download out error]', outPath, e.message);
        tryOne(idx + 1);
      });
      req.end();
    };
    tryOne(0);
  });
}

/* ======================================
 *  Generic Download (Export, dsb)
 * ====================================== */
function getDefaultDirForDownload() {
  if (settingsCache.exportFolder && fs.existsSync(settingsCache.exportFolder)) return settingsCache.exportFolder;
  if (settingsCache.saveFolder   && fs.existsSync(settingsCache.saveFolder))   return settingsCache.saveFolder;
  return app.getPath('downloads');
}
function inferFilenameFrom(urlStr, headers = {}) {
  const cd = headers['content-disposition'] || headers['Content-Disposition'];
  if (cd) {
    // filename atau filename*
    const star = /filename\*=(?:UTF-8'')?["']?([^"';]+)["']?/i.exec(cd);
    if (star && star[1]) return decodeURIComponent(star[1]);
    const plain = /filename=["']?([^"';]+)["']?/i.exec(cd);
    if (plain && plain[1]) return plain[1];
  }
  try {
    const u = new URL(urlStr);
    const base = path.basename(u.pathname || '');
    if (base && base !== '/' && base !== '.') return base;
  } catch {}
  return `download-${Date.now()}`;
}
async function downloadToFile(urlStr, suggestedName) {
  // 1) tentukan lokasi & nama file
  let defaultDir = getDefaultDirForDownload();
  ensureDir(defaultDir);
  let defaultPath = path.join(defaultDir, suggestedName || inferFilenameFrom(urlStr));

  // 2) jika askWhere → dialog simpan
  if (settingsCache.askWhere) {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Simpan File',
      defaultPath: defaultPath,
    });
    if (canceled || !filePath) return { ok: false, message: 'Dibatalkan' };
    defaultPath = filePath;
  } else {
    ensureDir(path.dirname(defaultPath));
  }

  // 3) request
  return await new Promise((resolve) => {
    const { client, opts } = getClientAndOpts(urlStr, authToken);
    const out = fs.createWriteStream(defaultPath);
    const req = client.request(opts, (res) => {
      if (res.statusCode !== 200) {
        out.destroy();
        res.resume();
        return resolve({ ok: false, message: `HTTP ${res.statusCode}` });
      }

      // update nama file dari header bila ada
      const hdrName = inferFilenameFrom(urlStr, res.headers);
      if (hdrName) {
        const newPath = path.join(path.dirname(defaultPath), hdrName);
        if (newPath !== defaultPath) {
          try {
            out.close();
            // alihkan stream keluaran ke file baru
            const out2 = fs.createWriteStream(newPath);
            res.pipe(out2);
            res.on('end', () => out2.end(() => resolve({ ok: true, path: newPath })));
            return; // jangan lanjut ke res.pipe(out)
          } catch {}
        }
      }

      res.pipe(out);
      res.on('end', () => out.end(() => resolve({ ok: true, path: defaultPath })));
    });
    req.on('error', (e) => {
      out.destroy();
      resolve({ ok: false, message: e.message });
    });
    out.on('error', (e) => resolve({ ok: false, message: e.message }));
    req.end();
  });
}

/* ========================
 *  IPC: AUTH & SETTINGS
 * ======================== */
ipcMain.handle('auth:setToken', async (_e, t) => { authToken = t || null; log('[auth:setToken]', !!authToken); return true; });
ipcMain.handle('auth:getToken', async () => authToken);
ipcMain.handle('auth:clearToken', async () => { authToken = null; log('[auth:clearToken]'); return true; });

ipcMain.handle('settings:getAll', async () => settingsCache);
ipcMain.handle('settings:set', async (_evt, s) => {
  settingsCache = { ...settingsCache, ...s };
  log('[settings:set]', JSON.stringify(settingsCache));
  return true;
});
ipcMain.handle('settings:chooseFolder', async (_evt, { initialPath, title }) => {
  const res = await dialog.showOpenDialog({
    title: title || 'Pilih Folder',
    defaultPath: initialPath || undefined,
    properties: ['openDirectory', 'createDirectory'],
  });
  if (res.canceled || !res.filePaths?.[0]) return null;
  return res.filePaths[0];
});

/* ===========================
 *  IPC: DOWNLOAD (generic)
 * =========================== */
ipcMain.handle('download:start', async (_evt, urlStr, opt = {}) => {
  if (!urlStr) return { ok: false, message: 'URL kosong' };
  try {
    const res = await downloadToFile(urlStr, opt.filename);
    log('[download:start]', urlStr, '->', res.ok ? res.path : res.message);
    return res;
  } catch (e) {
    log('[download:start error]', e.message);
    return { ok: false, message: e.message };
  }
});

/* ======================================
 *  IPC: BACKUP (mirror db.sql + uploads)
 * ====================================== */
ipcMain.handle('backup:run', async (_evt, { chooseDir } = {}) => {
  try {
    let root = settingsCache.backupFolder && fs.existsSync(settingsCache.backupFolder)
      ? settingsCache.backupFolder
      : (settingsCache.exportFolder && fs.existsSync(settingsCache.exportFolder)
          ? settingsCache.exportFolder
          : app.getPath('downloads'));

    if (chooseDir) {
      const picked = await dialog.showOpenDialog({
        title: 'Pilih Folder Root Backup',
        defaultPath: root,
        properties: ['openDirectory', 'createDirectory'],
      });
      if (picked.canceled || !picked.filePaths?.[0]) {
        return { ok: false, message: 'Dibatalkan' };
      }
      root = picked.filePaths[0];
    }
    ensureDir(root);

    const BASE = process.env.BACKEND_URL_BASE || 'http://localhost:4000';
    const DB_URL   = `${BASE}/api/admin/backup/db`;
    const LIST_URL = `${BASE}/api/admin/backup/uploads-list`;
    const FILE_URL = `${BASE}/api/admin/backup/upload-file?p=`;

    // 1) Dump DB
    notify({ type: 'backup', phase: 'db:start' });
    const dbPath = path.join(root, 'db.sql');
    await downloadWithFallbackToFile([DB_URL], dbPath, authToken);
    notify({ type: 'backup', phase: 'db:done', path: dbPath });

    // 2) List uploads
    notify({ type: 'backup', phase: 'files:scan' });
    const listJson = await httpGetJson(LIST_URL, authToken);
    const items = Array.isArray(listJson.items) ? listJson.items : [];
    const total = items.length;
    log('[backup:list] total', total);

    if (total === 0) {
      notify({ type: 'backup', phase: 'done', root, message: 'Uploads kosong / UPLOAD_DIR tidak ditemukan' });
      return { ok: true, root, note: 'no uploads' };
    }

    // 3) Mirror uploads
    let done = 0;
    const failed = [];
    for (const it of items) {
      done++;
      const rel = it.path;
      const dst = path.join(root, 'uploads', rel);
      ensureDir(path.dirname(dst));

      // skip jika ukuran sama (hemat bandwidth)
      let skip = false;
      try {
        const st = fs.statSync(dst);
        if (st.isFile() && Number(st.size) === Number(it.size)) skip = true;
      } catch {}

      if (!skip) {
        const encRelForQuery = encodeURIComponent(rel).replace(/%2F/g, '/');
        const encRelForStatic = encodePathSegments(rel);

        const primary = `${FILE_URL}${encRelForQuery}`.replace('/api/admin/backup/upload-file?p=', `${BASE}/api/admin/backup/upload-file?p=`);
        const fallback = `${BASE}/uploads/${encRelForStatic}`;

        try {
          await downloadWithFallbackToFile([primary, fallback], dst, authToken);
        } catch (e) {
          failed.push({ rel, error: e.message });
          log('[backup:file failed]', rel, e.message);
        }
      }

      if (done % 50 === 0 || done === total) {
        notify({ type: 'backup', phase: 'files:progress', done, total, message: `Menyalin uploads… ${done}/${total}` });
      }
    }

    if (failed.length) {
      notify({ type: 'backup', phase: 'done', root, failedCount: failed.length, message: `Selesai dengan ${failed.length} gagal` });
      log('[backup:failed count]', failed.length);
    } else {
      notify({ type: 'backup', phase: 'done', root });
    }

    return { ok: true, root, failedCount: failed.length };
  } catch (e) {
    notify({ type: 'backup', phase: 'error', message: e.message });
    showErrorBox('Backup gagal', e);
    return { ok: false, message: e.message };
  }
});
