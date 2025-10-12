// src/pages/Siswa.jsx
import { useEffect, useMemo, useState } from "react";
import { useShell } from "../context/ShellContext";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function Siswa() {
  const { angkatan: angkatanFromShell } = useShell();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [sortBy, setSortBy] = useState("nama");
  const [sortDir, setSortDir] = useState("asc");

  // filter Angkatan (halaman)
  const [angkatanOpts, setAngkatanOpts] = useState([]);
  const [angkatanFilter, setAngkatanFilter] = useState("");

  // status export/download
  const [dlMsg, setDlMsg] = useState("");

  // dengarkan notifikasi dari proses utama (Electron)
  useEffect(() => {
    const off = window.electronAPI?.onDownloadStatus?.((p) => {
      if (!p || p.type !== "download") return;
      if (p.phase === "start") {
        setDlMsg("Menyiapkan file untuk diunduh…");
      } else if (p.phase === "progress") {
        const pct = p.total
          ? Math.min(100, Math.round((p.received / p.total) * 100))
          : null;
        setDlMsg(
          pct != null
            ? `Mengunduh… ${pct}% (${p.received} / ${p.total} bytes)`
            : `Mengunduh… ${p.received} bytes`
        );
      } else if (p.phase === "done") {
        setDlMsg(`✔️ Selesai. Tersimpan di: ${p.path}`);
        clearMsgLater();
      } else if (p.phase === "error") {
        setDlMsg(`Gagal mengunduh: ${p.message}`);
        clearMsgLater();
      }
    });
    return () => off && off();
  }, []);

  function clearMsgLater(ms = 7000) {
    window.clearTimeout(clearMsgLater._t);
    clearMsgLater._t = window.setTimeout(() => setDlMsg(""), ms);
  }

  // load opsi angkatan 1x
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const token = await window.authAPI?.getToken?.();
        const r = await fetch(`${API}/ref/angkatan`, {
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!r.ok) return;
        const data = await r.json();
        if (alive) setAngkatanOpts(Array.isArray(data.items) ? data.items : []);
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, []);

  const angkatanEffective = angkatanFilter || angkatanFromShell || "";

  // build URL data (REST list siswa)
  const url = useMemo(() => {
    const u = new URL(`${API}/siswa`);
    if (q) u.searchParams.set("q", q);
    if (angkatanEffective) u.searchParams.set("angkatan", angkatanEffective);
    u.searchParams.set("page", String(page));
    u.searchParams.set("limit", String(limit));
    u.searchParams.set("sort_by", sortBy);
    u.searchParams.set("sort_dir", sortDir);
    return u.toString();
  }, [q, page, limit, sortBy, sortDir, angkatanEffective]);

  // fetch data
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const token = await window.authAPI?.getToken?.();
        const r = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await r.json();
        if (!alive) return;
        setItems(Array.isArray(data.items) ? data.items : []);
        setTotal(data.total ?? 0);
      } catch {
        if (!alive) return;
        setItems([]);
        setTotal(0);
      }
    })();
    return () => {
      alive = false;
    };
  }, [url]);

  // reset halaman saat filter berubah
  useEffect(() => {
    setPage(1);
  }, [angkatanFilter, angkatanFromShell]);

  // ---------- Export Excel (semua hasil filter; tanpa pagination) ----------
  function buildExportUrl() {
    const u = new URL(`${API}/export/siswa.xlsx`);
    if (q) u.searchParams.set("q", q);
    if (angkatanEffective) u.searchParams.set("angkatan", angkatanEffective);
    u.searchParams.set("sort_by", sortBy);
    u.searchParams.set("sort_dir", sortDir);
    u.searchParams.set("all", "1"); // ekspor semua sesuai filter
    return u.toString();
  }

  async function exportExcelAll() {
    try {
      const url = buildExportUrl();
      const ts = new Date();
      const y = ts.getFullYear();
      const m = String(ts.getMonth() + 1).padStart(2, "0");
      const d = String(ts.getDate()).padStart(2, "0");
      const hh = String(ts.getHours()).padStart(2, "0");
      const mm = String(ts.getMinutes()).padStart(2, "0");
      const ss = String(ts.getSeconds()).padStart(2, "0");
      const labelAngkatan = angkatanEffective ? `-angkatan-${angkatanEffective}` : "";
      const fname = `siswa${labelAngkatan}-${y}${m}${d}-${hh}${mm}${ss}.xlsx`;

      setDlMsg("Menyiapkan file untuk diunduh…");

      if (window.electronAPI?.download) {
        // Mode Electron
        const res = await window.electronAPI.download(url, fname);
        if (res?.ok && res.path) {
          setDlMsg(`✔️ Selesai. Tersimpan di: ${res.path}`);
          clearMsgLater();
        } else if (!res?.ok) {
          setDlMsg(`Gagal mengunduh: ${res?.message || "unknown error"}`);
          clearMsgLater();
        }
      } else {
        // Mode browser dev (fallback)
        const token = await window.authAPI?.getToken?.();
        const r = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!r.ok) throw new Error(await r.text().catch(() => `HTTP ${r.status}`));
        const blob = await r.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = fname;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          URL.revokeObjectURL(a.href);
          a.remove();
        }, 0);
        setDlMsg("✔️ Selesai. Cek folder unduhan (Downloads) di browser Anda.");
        clearMsgLater();
      }
    } catch (e) {
      setDlMsg(`Gagal export: ${e.message}`);
      clearMsgLater();
    }
  }

  return (
    <>
      {/* Toolbar */}
      <div
        className="card"
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label htmlFor="angkatan" className="muted">Angkatan</label>
          <select
            id="angkatan"
            value={angkatanFilter}
            onChange={(e) => setAngkatanFilter(e.target.value)}
            style={{
              background: "#0f1424",
              border: "1px solid #1f2937",
              color: "#e5e7eb",
              borderRadius: 8,
              padding: "6px 10px",
              minWidth: 160,
            }}
          >
            <option value="">Semua</option>
            {angkatanOpts.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(1); }}
          placeholder="Cari nama / nosis ..."
          style={{
            background: "#0f1424",
            border: "1px solid #1f2937",   // <- fixed here
            color: "#e5e7eb",
            borderRadius: 8,
            padding: "8px 10px",
            minWidth: 240,
          }}
        />

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{
            background: "#0f1424",
            border: "1px solid #1f2937",
            color: "#e5e7eb",
            borderRadius: 8,
            padding: "6px 8px",
          }}
        >
          <option value="nama">Nama</option>
          <option value="nosis">NOSIS</option>
        </select>

        <select
          value={sortDir}
          onChange={(e) => setSortDir(e.target.value)}
          style={{
            background: "#0f1424",
            border: "1px solid #1f2937",
            color: "#e5e7eb",
            borderRadius: 8,
            padding: "6px 8px",
          }}
        >
          <option value="asc">Asc</option>
          <option value="desc">Desc</option>
        </select>

        <div style={{ marginLeft: "auto", color: "#94a3b8" }}>
          Total: {total}
        </div>

        {/* Tombol Export */}
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={exportExcelAll} title="Export Excel (semua hasil filter)">
            Export Excel
          </button>
        </div>
      </div>

      {/* Info unduh */}
      {dlMsg && (
        <div className="card" style={{ color: dlMsg.startsWith("✔") ? "#86efac" : "#cbd5e1" }}>
          {dlMsg}
        </div>
      )}

      {/* Tabel */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="table" style={{ width: "100%" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>NOSIS</th>
              <th style={{ textAlign: "left" }}>Nama</th>
              <th style={{ textAlign: "left" }}>Angkatan</th>
              <th style={{ textAlign: "left", width: 1 }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={4} className="muted" style={{ padding: 12 }}>
                  Tidak ada data.
                </td>
              </tr>
            ) : (
              items.map((r) => {
                const nosis = r?.nosis ?? "-";
                const nama = r?.nama ?? "-";
                const angkatan = r?.kelompok_angkatan ?? "-";
                const nik = String(r?.nik ?? "").trim();
                return (
                  <tr key={`${r?.id ?? nosis}-${nosis}`}>
                    <td>{nosis}</td>
                    <td>{nama}</td>
                    <td>{angkatan}</td>
                    <td>
                      {nik ? (
                        <button
                          className="btn"
                          onClick={() =>
                            (window.location.hash = `#/siswa/nik/${encodeURIComponent(nik)}`)
                          }
                        >
                          Detail
                        </button>
                      ) : (
                        <span className="muted">NIK kosong</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
        <button
          className="btn"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
        >
          Prev
        </button>
        <span className="badge">Page {page}</span>
        <button
          className="btn"
          onClick={() => setPage((p) => p + 1)}
          disabled={items.length < limit}
        >
          Next
        </button>
      </div>
    </>
  );
}
