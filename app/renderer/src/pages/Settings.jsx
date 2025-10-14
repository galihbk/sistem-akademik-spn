// renderer/src/pages/Settings.jsx
import { useEffect, useState } from "react";

export default function Settings() {
  const [askWhere, setAskWhere] = useState(false);
  const [saveFolder, setSaveFolder] = useState("");
  const [exportFolder, setExportFolder] = useState("");
  const [msg, setMsg] = useState("");
  const [lastBackupAt, setLastBackupAt] = useState(null); // ⬅️ BARU

  const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

  // helper format tanggal lokal (Asia/Jakarta)
  function fmtLocal(iso) {
    try {
      const d = new Date(iso);
      return new Intl.DateTimeFormat("id-ID", {
        dateStyle: "full",
        timeStyle: "medium",
        timeZone: "Asia/Jakarta",
      }).format(d);
    } catch {
      return iso || "-";
    }
  }

  async function fetchLatestBackup() {
    try {
      const res = await fetch(`${API}/api/admin/backup/latest`);
      if (!res.ok) return;
      const j = await res.json();
      if (j?.ok && j.exists && j.lastBackupISO) {
        setLastBackupAt(j.lastBackupISO);
      } else {
        setLastBackupAt(null);
      }
    } catch {
      // diamkan saja; jangan ganggu UI
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const s = await window.electronAPI?.getSettings?.();
        if (!alive || !s) return;
        setAskWhere(!!s.askWhere);
        setSaveFolder(s.saveFolder || "");
        setExportFolder(s.exportFolder || "");
      } catch (e) {}
      await fetchLatestBackup(); // ⬅️ BARU
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function pickSaveFolder() {
    const dir = await window.electronAPI?.chooseFolder?.({
      initialPath: saveFolder,
      title: "Pilih Folder Unduhan",
    });
    if (dir) setSaveFolder(dir);
  }

  async function pickExportFolder() {
    const dir = await window.electronAPI?.chooseFolder?.({
      initialPath: exportFolder,
      title: "Pilih Folder Ekspor",
    });
    if (dir) setExportFolder(dir);
  }

  async function saveSettings() {
    try {
      await window.electronAPI?.setSettings?.({
        askWhere,
        saveFolder,
        exportFolder,
      });
      setMsg("✔️ Pengaturan disimpan.");
      setTimeout(() => setMsg(""), 3000);
    } catch (e) {
      setMsg(`Gagal menyimpan: ${e.message}`);
    }
  }

  // === BACKUP default ===
  function defaultBackupDir() {
    return path.join(app.getPath("userData"), "backups");
  }

  ipcMain.handle("backup:run", async (_evt, apiBase) => {
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

  // Upload ZIP lokal ke server untuk restore
  ipcMain.handle("backup:restoreFromLocal", async (_evt, apiBase) => {
    const last = (await ipcMain.invoke) ? null : null; // (noop, kita panggil langsung di renderer di bawah)
    return;
  });

  return (
    <div className="grid">
      {/* ===== Card: Info ===== */}
      <div className="card">
        <div style={{ fontWeight: 800, fontSize: 18 }}>Pengaturan</div>
        <div className="muted" style={{ marginTop: 4 }}>
          Atur lokasi penyimpanan dan proses cadangan/pemulihan data.
        </div>
      </div>

      {/* ===== Card: Penyimpanan ===== */}
      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 8 }}>
          Penyimpanan Unduhan & Ekspor
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={askWhere}
            onChange={(e) => setAskWhere(e.target.checked)}
          />
          Tanyakan lokasi setiap kali menyimpan (Save As…)
        </label>

        <div style={{ marginTop: 12 }}>
          <div className="muted">Folder Unduhan (default)</div>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <input
              className="input"
              readOnly
              value={saveFolder}
              placeholder="(kosong = folder Unduhan pada sistem)"
            />
            <button className="btn" type="button" onClick={pickSaveFolder}>
              Pilih…
            </button>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div className="muted">Folder Ekspor (default)</div>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <input
              className="input"
              readOnly
              value={exportFolder}
              placeholder="(kosong = mengikuti Folder Unduhan)"
            />
            <button className="btn" type="button" onClick={pickExportFolder}>
              Pilih…
            </button>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <button className="btn" onClick={saveSettings}>
            Simpan Pengaturan
          </button>
        </div>
      </div>

      {/* ===== Card: Cadangan & Pemulihan ===== */}
      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 8 }}>
          Cadangan & Pemulihan Data
        </div>
        <div className="muted" style={{ marginBottom: 12 }}>
          Cadangan disimpan otomatis ke <code>backups/&lt;timestamp&gt;/</code>{" "}
          berisi <code>db.sql</code> dan <code>uploads/</code>.
        </div>

        {/* ⬇️ BARU: Tanggal terakhir */}
        <div className="muted" style={{ marginBottom: 12 }}>
          <strong>Pencadangan terakhir:</strong>{" "}
          {lastBackupAt ? fmtLocal(lastBackupAt) : <em>belum ada</em>}
        </div>

        <div
          style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}
        >
          <button className="btn" type="button" onClick={runBackup}>
            Buat Cadangan Sekarang
          </button>
          <button className="btn" type="button" onClick={restoreBackup}>
            Pulihkan (snapshot terbaru)
          </button>
        </div>

        {msg && (
          <div
            style={{
              marginTop: 10,
              color: msg.startsWith("✔") ? "#86efac" : "#fca5a5",
            }}
          >
            {msg}
          </div>
        )}
      </div>

      {/* ===== Card: Info Aplikasi ===== */}
      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Info Aplikasi</div>
        <div style={{ color: "#cbd5e1" }}>
          SISTEM AKADEMIK — versi pengembangan
        </div>
        <div className="badge" style={{ marginTop: 8 }}>
          Build: Electron + React + Express
        </div>
      </div>
    </div>
  );
}
