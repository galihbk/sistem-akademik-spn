// renderer/src/pages/Settings.jsx
import { useEffect, useState } from "react";

export default function Settings() {
  const [askWhere, setAskWhere] = useState(false);
  const [saveFolder, setSaveFolder] = useState("");
  const [exportFolder, setExportFolder] = useState("");
  const [backupFolder, setBackupFolder] = useState("");
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
        setBackupFolder(s.backupFolder || "");
      } catch (e) {
        console.error(e);
      }
    })();
    return () => { alive = false; };
  }, []);

  // Dengarkan progres backup
  useEffect(() => {
    const off = window.electronAPI?.onDownloadStatus?.((p) => {
      if (!p || p.type !== "backup") return;
      if (p.phase === "db:start") setMsg("Membuat salinan database…");
      else if (p.phase === "db:done") setMsg("Database selesai disalin. Menyiapkan berkas…");
      else if (p.phase === "files:scan") setMsg("Membaca daftar berkas…");
      else if (p.phase === "files:progress") setMsg(p.message || `Menyalin berkas… ${p.done}/${p.total}`);
      else if (p.phase === "done") {
        const note = p.message ? ` (${p.message})` : "";
        setMsg(`✔️ Cadangan selesai di: ${p.root}${note}`);
        setTimeout(() => setMsg(""), 6000);
      } else if (p.phase === "error") setMsg(`Gagal melakukan cadangan: ${p.message}`);
    });
    return () => off && off();
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

  async function pickBackupFolder() {
    const dir = await window.electronAPI?.chooseFolder?.({
      initialPath: backupFolder || exportFolder || "",
      title: "Pilih Folder Penyimpanan Cadangan",
    });
    if (dir) setBackupFolder(dir);
  }

  async function saveSettings() {
    try {
      await window.electronAPI?.setSettings?.({
        askWhere, saveFolder, exportFolder, backupFolder,
      });
      setMsg("✔️ Pengaturan disimpan.");
      setTimeout(() => setMsg(""), 3000);
    } catch (e) {
      setMsg(`Gagal menyimpan: ${e.message}`);
    }
  }

  async function runBackup() {
    setMsg("Menyiapkan proses cadangan…");
    const res = await window.electronAPI?.runBackup?.({ chooseDir: !backupFolder });
    if (res && !res.ok) {
      setMsg(`Gagal melakukan cadangan: ${res.message}`);
      setTimeout(() => setMsg(""), 5000);
    }
  }

  // === PULIHKAN DARI CADANGAN ===
  async function restoreBackup() {
    setMsg("Menyiapkan pemulihan data…");
    try {
      const dir = await window.electronAPI?.chooseFolder?.({
        initialPath: backupFolder || "",
        title: "Pilih Folder Cadangan (berisi db.sql dan folder uploads/)",
      });
      if (!dir) {
        setMsg("Pemulihan dibatalkan.");
        return;
      }

      // Panggil API restore di backend
      const API = import.meta.env.VITE_API_URL || "http://localhost:4000";
      const res = await fetch(`${API}/api/admin/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backupPath: dir }),
      });

      if (!res.ok) {
        let text = "";
        try { text = await res.text(); } catch {}
        throw new Error(text || `HTTP ${res.status}`);
      }
      const out = await res.json();
      setMsg(`✔️ Pemulihan selesai: ${out.message || "data telah diperbarui"}`);
      setTimeout(() => setMsg(""), 6000);
    } catch (e) {
      setMsg(`Gagal memulihkan: ${e.message}`);
    }
  }

  return (
    <div className="grid">
      {/* ===== Card: Info ===== */}
      <div className="card">
        <div style={{ fontWeight: 800, fontSize: 18 }}>Pengaturan</div>
        <div className="muted" style={{ marginTop: 4 }}>
          Atur lokasi penyimpanan dan proses cadangan/pemulihan data.
        </div>
      </div>

      {/* ===== Card: Penyimpanan (Download & Export) ===== */}
      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Penyimpanan Unduhan & Ekspor</div>

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
            <input className="input" readOnly value={saveFolder} placeholder="(kosong = folder Unduhan pada sistem)" />
            <button className="btn" type="button" onClick={pickSaveFolder}>Pilih…</button>
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            Dipakai untuk berkas non-ekspor ketika opsi “Tanyakan lokasi” dimatikan.
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div className="muted">Folder Ekspor (default)</div>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <input className="input" readOnly value={exportFolder} placeholder="(kosong = mengikuti Folder Unduhan)" />
            <button className="btn" type="button" onClick={pickExportFolder}>Pilih…</button>
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            Dipakai untuk hasil ekspor (mis. PDF) dan dapat dijadikan lokasi cadangan.
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <button className="btn" onClick={saveSettings}>Simpan Pengaturan</button>
        </div>
      </div>

      {/* ===== Card: Cadangan & Pemulihan ===== */}
      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Cadangan & Pemulihan Data</div>
        <div className="muted" style={{ marginBottom: 12 }}>
          Fitur ini membuat salinan data <strong>database</strong> (berkas <code>db.sql</code>) dan seluruh berkas di folder <code>uploads/</code>.
          Saat melakukan cadangan ulang, berkas yang sama tidak akan diunduh lagi.
        </div>

        <div>
          <div className="muted">Folder Penyimpanan Cadangan</div>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <input className="input" readOnly value={backupFolder} placeholder="(kosong = pilih lokasi saat melakukan cadangan)" />
            <button className="btn" type="button" onClick={pickBackupFolder}>Pilih…</button>
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            Struktur hasil cadangan: <code>{`<folder>/db.sql`}</code> & <code>{`<folder>/uploads/**`}</code>
          </div>
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn" type="button" onClick={runBackup}>Buat Cadangan Sekarang</button>
          <button className="btn" type="button" onClick={restoreBackup}>Pulihkan dari Cadangan</button>
          <button className="btn" type="button" onClick={saveSettings}>Simpan Lokasi</button>
        </div>

        {msg && (
          <div style={{ marginTop: 10, color: msg.startsWith("✔") ? "#86efac" : "#fca5a5" }}>
            {msg}
          </div>
        )}
      </div>

      {/* ===== Card: Info Aplikasi ===== */}
      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Info Aplikasi</div>
        <div style={{ color: "#cbd5e1" }}>SISTEM AKADEMIK — versi pengembangan</div>
        <div className="badge" style={{ marginTop: 8 }}>Build: Electron + React + Express</div>
      </div>
    </div>
  );
}
