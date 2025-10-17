// renderer/src/pages/Settings.jsx
import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function Settings() {
  const [askWhere, setAskWhere] = useState(false);
  const [saveFolder, setSaveFolder] = useState("");
  const [exportFolder, setExportFolder] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  // Info backup lokal (client)
  const [lastLocalBackup, setLastLocalBackup] = useState(null);

  function fmtLocal(isoOrMs) {
    try {
      const d =
        typeof isoOrMs === "number" ? new Date(isoOrMs) : new Date(isoOrMs);
      return new Intl.DateTimeFormat("id-ID", {
        dateStyle: "full",
        timeStyle: "medium",
        timeZone: "Asia/Jakarta",
      }).format(d);
    } catch {
      return isoOrMs || "-";
    }
  }

  async function fetchLocalLatestBackup() {
    try {
      const info = await window.electronAPI?.backupLastLocal?.();
      if (info && info.exists) {
        setLastLocalBackup({ path: info.path, mtimeMs: info.mtimeMs });
      } else {
        setLastLocalBackup(null);
      }
    } catch {
      setLastLocalBackup(null);
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const s = await window.electronAPI?.getSettings?.();
        if (alive && s) {
          setAskWhere(!!s.askWhere);
          setSaveFolder(s.saveFolder || "");
          setExportFolder(s.exportFolder || "");
        }
      } catch {}
      await fetchLocalLatestBackup();
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
      setMsg(`Gagal menyimpan: ${e?.message || "unknown error"}`);
    }
  }

  // === Backup ke CLIENT (userData/backups) ===
  async function runBackupToClient() {
    setMsg("");
    setBusy(true);
    try {
      // bisa kirim string atau object { apiBase }
      const r = await window.electronAPI?.runBackup?.(API);
      if (!r || !r.ok)
        throw new Error(r?.message || "Gagal membuat backup lokal");
      setMsg(`✔️ Cadangan lokal dibuat di: ${r.path}`);
      await fetchLocalLatestBackup();
    } catch (e) {
      setMsg(`Gagal membuat cadangan lokal: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  async function openLocalBackupInFolder() {
    try {
      if (!lastLocalBackup?.path) return;
      await window.electronAPI?.openInFolder?.(lastLocalBackup.path);
    } catch {}
  }

  // === Restore dari ZIP lokal terbaru ===
  async function restoreFromLocal() {
    setMsg("");
    setBusy(true);
    try {
      const r = await window.electronAPI?.restoreFromLocal?.(API);
      if (!r || !r.ok) throw new Error(r?.message || "Gagal memulihkan");
      setMsg("✔️ Pemulihan dari cadangan lokal berhasil.");
    } catch (e) {
      setMsg(`Gagal memulihkan: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  // Guard kecil: jika tidak dijalankan dalam Electron, beri info
  const inElectron = typeof window !== "undefined" && !!window.electronAPI;

  return (
    <div className="grid">
      {/* ===== Pengaturan ===== */}
      <div className="card">
        <div style={{ fontWeight: 800, fontSize: 18 }}>Pengaturan</div>
        <div className="muted" style={{ marginTop: 4 }}>
          Atur lokasi penyimpanan & proses cadangan/pemulihan data.
        </div>
        {!inElectron && (
          <div style={{ marginTop: 8, color: "#fca5a5" }}>
            ⚠️ Fitur backup/restore hanya aktif saat aplikasi berjalan di
            Electron.
          </div>
        )}
      </div>

      {/* ===== Penyimpanan ===== */}
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

      {/* ===== Cadangan Lokal (Client) ===== */}
      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 8 }}>
          Cadangan Lokal (Client)
        </div>
        <div className="muted" style={{ marginBottom: 8 }}>
          ZIP disimpan otomatis ke <code>userData/backups</code> (tanpa dialog).
        </div>

        <div className="muted" style={{ marginBottom: 12 }}>
          <strong>Pencadangan lokal terakhir:</strong>{" "}
          {lastLocalBackup ? (
            <>
              {fmtLocal(lastLocalBackup.mtimeMs)} —{" "}
              <code>{lastLocalBackup.path}</code>
            </>
          ) : (
            <em>belum ada</em>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            className="btn"
            onClick={runBackupToClient}
            disabled={busy || !inElectron}
          >
            {busy ? "Memproses…" : "Buat Cadangan ke Client"}
          </button>
          <button
            className="btn"
            onClick={openLocalBackupInFolder}
            disabled={!lastLocalBackup?.path || busy || !inElectron}
          >
            Buka Folder Cadangan
          </button>
          <button
            className="btn"
            onClick={restoreFromLocal}
            disabled={!lastLocalBackup?.path || busy || !inElectron}
          >
            Pulihkan dari Cadangan Lokal
          </button>
        </div>
      </div>

      {/* ===== Status / Info ===== */}
      {msg && (
        <div
          className="card"
          style={{
            borderColor: msg.startsWith("✔") ? "#22c55e" : "#ef4444",
          }}
        >
          <div style={{ color: msg.startsWith("✔") ? "#86efac" : "#fca5a5" }}>
            {msg}
          </div>
        </div>
      )}

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
