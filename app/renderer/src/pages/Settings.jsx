// renderer/src/pages/Settings.jsx
import { useEffect, useState } from "react";

export default function Settings() {
  const [askWhere, setAskWhere] = useState(false);
  const [saveFolder, setSaveFolder] = useState("");
  const [exportFolder, setExportFolder] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const s = await window.electronAPI?.getSettings?.();
        if (!alive || !s) return;
        setAskWhere(!!s.askWhere);
        setSaveFolder(s.saveFolder || "");
        setExportFolder(s.exportFolder || "");
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, []);

  async function pickSaveFolder() {
    const dir = await window.electronAPI?.chooseFolder?.({
      initialPath: saveFolder,
      title: "Pilih Folder Download",
    });
    if (dir) setSaveFolder(dir);
  }

  async function pickExportFolder() {
    const dir = await window.electronAPI?.chooseFolder?.({
      initialPath: exportFolder,
      title: "Pilih Folder Export",
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
      setMsg(`Gagal simpan: ${e.message}`);
    }
  }

  return (
    <div className="grid">
      <div className="card">
        <div style={{ fontWeight: 800, fontSize: 18 }}>Pengaturan</div>
        <div className="muted" style={{ marginTop: 4 }}>
          Atur lokasi dan perilaku Download & Export.
        </div>
      </div>

      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 8 }}>
          Perilaku Penyimpanan
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
          <div className="muted">Folder Download (default)</div>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <input
              className="input"
              readOnly
              value={saveFolder}
              placeholder="(kosong = Downloads OS)"
            />
            <button className="btn" type="button" onClick={pickSaveFolder}>
              Pilih…
            </button>
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            Dipakai untuk unduhan **non-export** saat "Tanyakan lokasi"
            dimatikan.
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div className="muted">Folder Export (default)</div>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <input
              className="input"
              readOnly
              value={exportFolder}
              placeholder="(kosong = sama dengan Download)"
            />
            <button className="btn" type="button" onClick={pickExportFolder}>
              Pilih…
            </button>
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            Dipakai untuk **Export PDF** saat "Tanyakan lokasi" dimatikan.
          </div>
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

        <div style={{ marginTop: 12 }}>
          <button className="btn" onClick={saveSettings}>
            Simpan Pengaturan
          </button>
        </div>
      </div>

      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Info Aplikasi</div>
        <div style={{ color: "#cbd5e1" }}>SISTEM AKADEMIK — versi dev</div>
        <div className="badge" style={{ marginTop: 8 }}>
          Build: Electron + React + Express
        </div>
      </div>
    </div>
  );
}
