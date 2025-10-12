// src/pages/RekapJasmani.jsx
import { useEffect, useMemo, useState, Fragment } from "react";
import { useShell } from "../context/ShellContext";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

const W_NOSIS = 120;
const W_NAMA = 280;
const W_TEXT = 110;
const W_NUM = 90;

export default function RekapJasmani() {
  const { angkatan: angkatanFromShell } = useShell();

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [sortBy, setSortBy] = useState("nama");
  const [sortDir, setSortDir] = useState("asc");

  const [angkatanOpts, setAngkatanOpts] = useState([]);
  const [angkatanFilter, setAngkatanFilter] = useState("");
  const [tahap, setTahap] = useState(""); // "" = auto tahap terakhir

  // status export
  const [exportInfo, setExportInfo] = useState(null);
  const [exporting, setExporting] = useState(false);

  // ambil daftar angkatan
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
        const data = await r.json();
        if (alive) setAngkatanOpts(Array.isArray(data.items) ? data.items : []);
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, []);

  const angkatanEffective = angkatanFilter || angkatanFromShell || "";

  const url = useMemo(() => {
    const u = new URL(`${API}/jasmani/rekap`);
    if (q) u.searchParams.set("q", q);
    if (angkatanEffective) u.searchParams.set("angkatan", angkatanEffective);
    if (tahap !== "") u.searchParams.set("tahap", String(tahap));
    u.searchParams.set("page", String(page));
    u.searchParams.set("limit", String(limit));
    u.searchParams.set("sort_by", sortBy);
    u.searchParams.set("sort_dir", sortDir);
    return u.toString();
  }, [q, page, limit, sortBy, sortDir, angkatanEffective, tahap]);

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
        const arr = Array.isArray(data.items) ? data.items : [];
        setItems(arr);
        setTotal(data.total ?? arr.length ?? 0);
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

  useEffect(() => {
    setPage(1);
  }, [q, angkatanFilter, angkatanFromShell, sortBy, sortDir, tahap]);

  // ==== EXPORT (1 tombol, semua baris sesuai filter) ====
  function buildExportUrl() {
    const u = new URL(`${API}/export/jasmani_rekap.xlsx`);
    if (q) u.searchParams.set("q", q);
    if (angkatanEffective) u.searchParams.set("angkatan", angkatanEffective);
    if (tahap !== "") u.searchParams.set("tahap", String(tahap));
    u.searchParams.set("sort_by", sortBy);
    u.searchParams.set("sort_dir", sortDir);
    u.searchParams.set("all", "1");
    return u.toString();
  }

  async function downloadViaFetch(url, suggestedName = "rekap-jasmani.xlsx") {
    const token = await window.authAPI?.getToken?.();
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `HTTP ${res.status}`);
    }
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = suggestedName;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 0);
  }

  async function exportExcelAll() {
    try {
      setExporting(true);
      setExportInfo({ state: "preparing" });

      const url = buildExportUrl();
      const ts = new Date();
      const y = ts.getFullYear();
      const m = String(ts.getMonth() + 1).padStart(2, "0");
      const d = String(ts.getDate()).padStart(2, "0");
      const hh = String(ts.getHours()).padStart(2, "0");
      const mm = String(ts.getMinutes()).padStart(2, "0");
      const ss = String(ts.getSeconds()).padStart(2, "0");
      const fname = `rekap-jasmani${angkatanEffective ? `-angkatan-${angkatanEffective}` : ""}${tahap !== "" ? `-tahap-${tahap}` : ""}-${y}${m}${d}-${hh}${mm}${ss}.xlsx`;

      if (window.electronAPI?.download) {
        await window.electronAPI.download(url); // Electron: simpan ke Downloads
        setExportInfo({
          state: "done",
          pathHint: "Downloads",
          filename: "(periksa file terbaru di Downloads)",
        });
      } else {
        await downloadViaFetch(url, fname);
        setExportInfo({ state: "done", pathHint: "browser", filename: fname });
      }

      setTimeout(() => setExportInfo(null), 5000);
    } catch (e) {
      setExportInfo({ state: "error", message: e.message || "Gagal export." });
      setTimeout(() => setExportInfo(null), 6000);
    } finally {
      setExporting(false);
    }
  }

  // sticky helpers
  const stickyLeftTH = (px) => ({
    position: "sticky",
    top: 0,
    left: px,
    background: "#0b1220",
    zIndex: 6,
    boxShadow: px ? "6px 0 10px rgba(0,0,0,.35)" : "inset 0 -1px 0 #1f2937",
  });
  const stickyLeftTD = (px) => ({
    position: "sticky",
    left: px,
    background: "#0b1220",
    zIndex: 5,
    boxShadow: px ? "6px 0 10px rgba(0,0,0,.35)" : "none",
  });
  const stickyTop = { position: "sticky", top: 0, background: "#0b1220", zIndex: 4 };
  const thBase = { whiteSpace: "nowrap", fontWeight: 700, borderBottom: "1px solid #1f2937" };
  const numCell = { textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" };
  const centerCell = { textAlign: "center", whiteSpace: "nowrap" };

  const fmtNum = (v) => (v == null || Number.isNaN(v) ? "-" : Number(v));
  const fmtRank = (r) => (r?.pos != null && r?.total ? `${r.pos}/${r.total}` : "-");

  const groups = [
    { key: "lari_12_menit", label: "Lari 12 Menit" },
    { key: "sit_up", label: "Sit Up" },
    { key: "shuttle_run", label: "Shuttle Run" },
    { key: "push_up", label: "Push Up" },
    { key: "pull_up", label: "Pull Up" },
  ];

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
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari nama / nosis ..."
          style={{
            background: "#0f1424",
            border: "1px solid #1f2937",
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

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label className="muted">Tahap</label>
          <input
            type="number"
            min="0"
            step="1"
            value={tahap}
            onChange={(e) => setTahap(e.target.value)}
            placeholder="(auto pilih terakhir)"
            style={{
              width: 160,
              background: "#0f1424",
              border: "1px solid #1f2937",
              color: "#e5e7eb",
              borderRadius: 8,
              padding: "6px 10px",
            }}
          />
        </div>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          <button
            className="btn"
            onClick={exportExcelAll}
            disabled={exporting}
            title="Export Excel (semua hasil filter)"
          >
            {exporting ? "Menyiapkan…" : "Export Excel"}
          </button>

          <div className="muted">Total: {total}</div>
        </div>
      </div>

      {/* Notif Export */}
      {exportInfo && (
        <div
          className="card"
          style={{
            marginBottom: 12,
            border: exportInfo.state === "error" ? "1px solid #7f1d1d" : "1px solid #1f2937",
            background: exportInfo.state === "error" ? "#2a0b0b" : "#0f1424",
            color: exportInfo.state === "error" ? "#fecaca" : "#e5e7eb",
          }}
          role="status"
          aria-live="polite"
        >
          {exportInfo.state === "preparing" && "Menyiapkan file export…"}
          {exportInfo.state === "done" &&
            `File export dikirim ke ${exportInfo.pathHint}. ${exportInfo.filename || ""}`}
          {exportInfo.state === "error" && `Gagal export: ${exportInfo.message}`}
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ overflow: "auto" }}>
          <table
            className="table"
            style={{
              width: "100%",
              minWidth: 1700,
              borderCollapse: "separate",
              borderSpacing: 0,
            }}
          >
            <thead>
              {/* baris 1: header grup */}
              <tr>
                <th rowSpan={2} style={{ ...thBase, ...stickyLeftTH(0), minWidth: W_NOSIS, width: W_NOSIS }}>
                  NOSIS
                </th>
                <th rowSpan={2} style={{ ...thBase, ...stickyLeftTH(W_NOSIS), minWidth: W_NAMA, width: W_NAMA }}>
                  Nama
                </th>
                <th rowSpan={2} style={{ ...thBase, ...stickyTop, textAlign: "left", minWidth: W_TEXT }}>
                  Angkatan
                </th>
                <th rowSpan={2} style={{ ...thBase, ...stickyTop, ...centerCell, minWidth: 80 }}>
                  Tahap
                </th>

                <th rowSpan={2} style={{ ...thBase, ...stickyTop, ...centerCell, minWidth: 110 }}>R. Global</th>
                <th rowSpan={2} style={{ ...thBase, ...stickyTop, ...centerCell, minWidth: 110 }}>R. Batalion</th>
                <th rowSpan={2} style={{ ...thBase, ...stickyTop, ...centerCell, minWidth: 100 }}>R. Kompi</th>
                <th rowSpan={2} style={{ ...thBase, ...stickyTop, ...centerCell, minWidth: 110 }}>R. Pleton</th>

                {groups.map((g) => (
                  <th key={`grp-${g.key}`} colSpan={2} style={{ ...thBase, ...stickyTop, textAlign: "center", minWidth: W_NUM * 2 }}>
                    {g.label}
                  </th>
                ))}

                <th rowSpan={2} style={{ ...thBase, ...stickyTop, ...numCell, minWidth: W_NUM }}>
                  Nilai Akhir
                </th>
                <th rowSpan={2} style={{ ...thBase, ...stickyTop, textAlign: "left", minWidth: 220 }}>
                  Keterangan
                </th>
              </tr>

              {/* baris 2: subkolom TS / RS */}
              <tr>
                {groups.map((g) => (
                  <Fragment key={`sub-${g.key}`}>
                    <th style={{ ...thBase, ...stickyTop, ...centerCell, minWidth: W_NUM }}>TS</th>
                    <th style={{ ...thBase, ...stickyTop, ...centerCell, minWidth: W_NUM }}>RS</th>
                  </Fragment>
                ))}
              </tr>
            </thead>

            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={
                      4 /* ident */ +
                      4 /* rank */ +
                      groups.length * 2 +
                      2 /* nilai akhir + ket */
                    }
                    className="muted"
                    style={{ padding: 12 }}
                  >
                    Tidak ada data.
                  </td>
                </tr>
              ) : (
                items.map((r, i) => (
                  <tr key={`${r.nosis}-${i}`}>
                    <td style={{ ...stickyLeftTD(0), minWidth: W_NOSIS, width: W_NOSIS }}>{r.nosis ?? "-"}</td>
                    <td style={{ ...stickyLeftTD(W_NOSIS), minWidth: W_NAMA, width: W_NAMA }}>{r.nama ?? "-"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{r.kelompok_angkatan ?? "-"}</td>
                    <td style={{ ...centerCell }}>{r.tahap ?? "-"}</td>

                    <td style={{ ...centerCell }}>{fmtRank(r.rank?.global)}</td>
                    <td style={{ ...centerCell }}>{fmtRank(r.rank?.batalion)}</td>
                    <td style={{ ...centerCell }}>{fmtRank(r.rank?.kompi)}</td>
                    <td style={{ ...centerCell }}>{fmtRank(r.rank?.pleton)}</td>

                    <td style={{ ...numCell }}>{fmtNum(r.nilai?.lari_12_menit?.ts)}</td>
                    <td style={{ ...numCell }}>{fmtNum(r.nilai?.lari_12_menit?.rs)}</td>

                    <td style={{ ...numCell }}>{fmtNum(r.nilai?.sit_up?.ts)}</td>
                    <td style={{ ...numCell }}>{fmtNum(r.nilai?.sit_up?.rs)}</td>

                    <td style={{ ...numCell }}>{fmtNum(r.nilai?.shuttle_run?.ts)}</td>
                    <td style={{ ...numCell }}>{fmtNum(r.nilai?.shuttle_run?.rs)}</td>

                    <td style={{ ...numCell }}>{fmtNum(r.nilai?.push_up?.ts)}</td>
                    <td style={{ ...numCell }}>{fmtNum(r.nilai?.push_up?.rs)}</td>

                    <td style={{ ...numCell }}>{fmtNum(r.nilai?.pull_up?.ts)}</td>
                    <td style={{ ...numCell }}>{fmtNum(r.nilai?.pull_up?.rs)}</td>

                    <td style={{ ...numCell }}>{fmtNum(r.nilai_akhir)}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{r.keterangan ?? ""}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
        <button className="btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
          Prev
        </button>
        <span className="badge">Page {page}</span>
        <button className="btn" onClick={() => setPage((p) => p + 1)} disabled={items.length < limit}>
          Next
        </button>
      </div>
    </>
  );
}
