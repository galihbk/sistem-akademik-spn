// src/pages/RekapMental.jsx
import { useEffect, useMemo, useState } from "react";
import { useShell } from "../context/ShellContext";
import { useToast } from "../components/Toaster";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

// lebar konsisten utk kolom sticky
const W_NOSIS = 120;
const W_NAMA = 280;
const W_NUM = 110;

// auto-close
const SUCCESS_CLOSE_MS = 5000;
const ERROR_CLOSE_MS = 6000;

export default function RekapMental() {
  const { angkatan: angkatanFromShell } = useShell();
  const toast = useToast();

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [sortBy, setSortBy] = useState("nama");
  const [sortDir, setSortDir] = useState("asc");

  const [angkatanOpts, setAngkatanOpts] = useState([]);
  const [angkatanFilter, setAngkatanFilter] = useState("");

  const [weekColumns, setWeekColumns] = useState([]);

  // === Jenis Pendidikan aktif (disimpan saat login)
  const [jenis, setJenis] = useState(
    () => localStorage.getItem("sa.jenis_pendidikan") || ""
  );
  // sync jika berubah di tab lain
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "sa.jenis_pendidikan") setJenis(e.newValue || "");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // opsi angkatan (ikut filter jenis)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const token = await window.authAPI?.getToken?.();
        const url = new URL(`${API}/ref/angkatan`);
        if (jenis) url.searchParams.set("jenis", jenis);
        const r = await fetch(url.toString(), {
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
  }, [jenis]);

  const angkatanEffective = angkatanFilter || angkatanFromShell || "";

  // URL data rekap
  const url = useMemo(() => {
    const u = new URL(`${API}/mental/rekap`);
    if (q) u.searchParams.set("q", q);
    if (angkatanEffective) u.searchParams.set("angkatan", angkatanEffective);
    if (jenis) u.searchParams.set("jenis", jenis);
    u.searchParams.set("page", String(page));
    u.searchParams.set("limit", String(limit));
    u.searchParams.set("sort_by", sortBy);
    u.searchParams.set("sort_dir", sortDir);
    return u.toString();
  }, [q, page, limit, sortBy, sortDir, angkatanEffective, jenis]);

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

        const arr = Array.isArray(data.items) ? data.items : [];
        setItems(arr);
        setTotal(data.total ?? arr.length ?? 0);

        const weeks = Array.isArray(data.weeks) ? data.weeks : [];
        const uniq = Array.from(
          new Set(
            weeks
              .map((w) => Number(String(w).trim()))
              .filter((n) => Number.isFinite(n))
          )
        ).sort((a, b) => a - b);
        setWeekColumns(uniq);
      } catch {
        if (!alive) return;
        setItems([]);
        setTotal(0);
        setWeekColumns([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [url]);

  // reset page saat filter/sort berubah
  useEffect(() => {
    setPage(1);
  }, [q, angkatanFilter, angkatanFromShell, sortBy, sortDir, jenis]);

  // ==== helpers (sticky)
  const stickyLeftTH = (px) => ({
    position: "sticky",
    top: 0,
    left: px,
    background: "var(--table-header-bg)",
    zIndex: 6,
    boxShadow: px
      ? "var(--table-sticky-shadow-left)"
      : "inset 0 -1px 0 var(--border)",
  });
  const stickyLeftTD = (px) => ({
    position: "sticky",
    left: px,
    background: "var(--panel)",
    zIndex: 5,
    boxShadow: px ? "var(--table-sticky-shadow-left)" : "none",
  });
  const stickyTop = {
    position: "sticky",
    top: 0,
    background: "var(--table-header-bg)",
    zIndex: 4,
  };
  const thBase = {
    whiteSpace: "nowrap",
    fontWeight: 700,
    borderBottom: "1px solid var(--border)",
  };
  const numCell = {
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
    whiteSpace: "nowrap",
  };

  const fmtRank = (r) =>
    r?.pos != null && r?.total ? `${r.pos}/${r.total}` : "-";
  const fmtAvg = (v) => (v == null ? "-" : Number(v).toFixed(3));
  const fmtSum = (v) => (v == null ? "-" : Number(v).toFixed(3));

  // ---------- EXPORT (single button, semua hasil filter) ----------
  function buildExportExcelUrl() {
    // GET /export/mental_rekap.xlsx?q=&angkatan=&jenis=&sort_by=&sort_dir=&all=1
    const u = new URL(`${API}/export/mental_rekap.xlsx`);
    if (q) u.searchParams.set("q", q);
    if (angkatanEffective) u.searchParams.set("angkatan", angkatanEffective);
    if (jenis) u.searchParams.set("jenis", jenis);
    u.searchParams.set("sort_by", sortBy);
    u.searchParams.set("sort_dir", sortDir);
    u.searchParams.set("all", "1");
    return u.toString();
  }

  // ===== util unduh (fallback web) =====
  function formatBytes(b) {
    if (!b) return "0 B";
    const u = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(b) / Math.log(1024));
    return `${(b / Math.pow(1024, i)).toFixed(1)} ${u[i]}`;
  }
  function triggerDownloadBlob(blob, filename) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 0);
  }
  async function downloadViaFetchWithProgress(url, suggestedName) {
    let tid = null;
    try {
      const token = await window.authAPI?.getToken?.();
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        let text = "";
        try {
          text = await res.text();
        } catch {}
        throw new Error(text || `HTTP ${res.status}`);
      }
      const contentLength = Number(res.headers.get("content-length") || 0);
      tid = toast.show({
        type: "loading",
        title: "Mengunduh file…",
        message: contentLength
          ? "Menghitung progres unduhan"
          : "Ukuran tidak diketahui",
        progress: contentLength ? 0 : null,
        indeterminate: !contentLength,
        canDismiss: true,
        duration: 0,
      });

      const reader = res.body?.getReader?.();
      if (!reader) {
        const blob = await res.blob();
        triggerDownloadBlob(blob, suggestedName);
        toast.update(tid, {
          type: "success",
          title: "Selesai",
          message: `File tersimpan (${suggestedName}).`,
          progress: 100,
          indeterminate: false,
          duration: SUCCESS_CLOSE_MS,
        });
        return;
      }

      let loaded = 0;
      const chunks = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.byteLength;
        if (contentLength) {
          toast.update(tid, {
            message: `Mengunduh ${formatBytes(loaded)} / ${formatBytes(
              contentLength
            )}`,
            progress: (loaded / contentLength) * 100,
            indeterminate: false,
          });
        }
      }

      const blob = new Blob(chunks);
      triggerDownloadBlob(blob, suggestedName);
      toast.update(tid, {
        type: "success",
        title: "Unduhan selesai",
        message: `File: ${suggestedName}`,
        progress: 100,
        indeterminate: false,
        duration: SUCCESS_CLOSE_MS,
      });
    } catch (e) {
      if (tid) {
        toast.update(tid, {
          type: "error",
          title: "Gagal unduh",
          message: e?.message || "Terjadi kesalahan saat mengunduh.",
          duration: ERROR_CLOSE_MS,
          indeterminate: false,
        });
      } else {
        toast.show({
          type: "error",
          title: "Gagal unduh",
          message: e?.message || "Terjadi kesalahan saat mengunduh.",
          duration: ERROR_CLOSE_MS,
        });
      }
      throw e;
    }
  }

  async function exportExcelAll() {
    let tid = null;
    try {
      const url = buildExportExcelUrl();
      const ts = new Date();
      const y = ts.getFullYear();
      const m = String(ts.getMonth() + 1).padStart(2, "0");
      const d = String(ts.getDate()).padStart(2, "0");
      const hh = String(ts.getHours()).padStart(2, "0");
      const mm = String(ts.getMinutes()).padStart(2, "0");
      const ss = String(ts.getSeconds()).padStart(2, "0");
      const labelAngkatan = angkatanEffective
        ? `-angkatan-${angkatanEffective}`
        : "";
      const labelJenis = jenis ? `-jenis-${jenis}` : "";
      const fname = `rekap-mental${labelAngkatan}${labelJenis}-${y}${m}${d}-${hh}${mm}${ss}.xlsx`;

      if (window.electronAPI?.download) {
        const info = await window.electronAPI
          .getDefaultDownloadsDir?.()
          .catch(() => null);
        tid = toast.show({
          type: "loading",
          title: "Menyiapkan unduhan…",
          message: info?.dir
            ? `Menyimpan ke: ${info.dir}`
            : "Menyimpan berkas…",
          indeterminate: true,
          canDismiss: true,
          duration: 0,
        });

        const res = await (window.electronAPI.download.length >= 2
          ? window.electronAPI.download(url, fname)
          : window.electronAPI.download(url));

        if (!res?.ok) throw new Error(res?.message || "Gagal mengunduh");
        const fullPath = res.path;

        toast.update(tid, {
          type: "success",
          title: "Selesai",
          message: `Tersimpan: ${fullPath}`,
          indeterminate: false,
          duration: SUCCESS_CLOSE_MS,
        });
      } else {
        await downloadViaFetchWithProgress(url, fname);
      }
    } catch (e) {
      if (tid) {
        toast.update(tid, {
          type: "error",
          title: "Gagal export",
          message: e?.message || "Terjadi kesalahan saat mengunduh.",
          duration: ERROR_CLOSE_MS,
          indeterminate: false,
        });
      } else {
        toast.show({
          type: "error",
          title: "Gagal export",
          message: e?.message || "Terjadi kesalahan saat mengunduh.",
          duration: ERROR_CLOSE_MS,
        });
      }
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
          <label htmlFor="angkatan" className="muted">
            Angkatan
          </label>
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
              <option key={opt} value={opt}>
                {opt}
              </option>
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

        <div style={{ marginLeft: "auto", color: "#94a3b8" }}>
          Total: {total}
        </div>

        {/* Tombol Export (single) */}
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn"
            onClick={exportExcelAll}
            title="Export Excel (semua hasil filter)"
          >
            Export
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ overflow: "auto" }}>
          <table
            className="table"
            style={{
              width: "100%",
              minWidth: 1300,
              borderCollapse: "separate",
              borderSpacing: 0,
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    ...thBase,
                    ...stickyLeftTH(0),
                    minWidth: W_NOSIS,
                    width: W_NOSIS,
                  }}
                >
                  NOSIS
                </th>
                <th
                  style={{
                    ...thBase,
                    ...stickyLeftTH(W_NOSIS),
                    minWidth: W_NAMA,
                    width: W_NAMA,
                  }}
                >
                  Nama
                </th>
                <th
                  style={{
                    ...thBase,
                    ...stickyTop,
                    textAlign: "left",
                    minWidth: 110,
                  }}
                >
                  Angkatan
                </th>
                <th
                  style={{
                    ...thBase,
                    ...stickyTop,
                    ...numCell,
                    minWidth: W_NUM,
                  }}
                >
                  Jumlah
                </th>
                <th
                  style={{
                    ...thBase,
                    ...stickyTop,
                    ...numCell,
                    minWidth: W_NUM,
                  }}
                >
                  Rata-rata
                </th>
                <th
                  style={{
                    ...thBase,
                    ...stickyTop,
                    textAlign: "center",
                    minWidth: 110,
                  }}
                >
                  R. Batalion
                </th>
                <th
                  style={{
                    ...thBase,
                    ...stickyTop,
                    textAlign: "center",
                    minWidth: 100,
                  }}
                >
                  R. Kompi
                </th>
                <th
                  style={{
                    ...thBase,
                    ...stickyTop,
                    textAlign: "center",
                    minWidth: 110,
                  }}
                >
                  R. Pleton
                </th>
                {weekColumns.map((w) => (
                  <th
                    key={`wh-${w}`}
                    style={{
                      ...thBase,
                      ...stickyTop,
                      textAlign: "right",
                      minWidth: 90,
                    }}
                  >
                    {w}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={9 + weekColumns.length}
                    className="muted"
                    style={{ padding: 12 }}
                  >
                    Tidak ada data.
                  </td>
                </tr>
              ) : (
                items.map((r, i) => {
                  const weeks = r?.weeks || {};
                  return (
                    <tr key={`${r.nosis}-${i}`}>
                      <td
                        style={{
                          ...stickyLeftTD(0),
                          minWidth: W_NOSIS,
                          width: W_NOSIS,
                        }}
                      >
                        {r.nosis ?? "-"}
                      </td>
                      <td
                        style={{
                          ...stickyLeftTD(W_NOSIS),
                          minWidth: W_NAMA,
                          width: W_NAMA,
                        }}
                      >
                        {r.nama ?? "-"}
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {r.kelompok_angkatan ?? "-"}
                      </td>
                      <td style={{ ...numCell }}>{fmtSum(r.sum)}</td>
                      <td style={{ ...numCell }}>{fmtAvg(r.avg)}</td>
                      <td style={{ textAlign: "center" }}>
                        {fmtRank(r.rank?.batalion)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {fmtRank(r.rank?.kompi)}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {fmtRank(r.rank?.pleton)}
                      </td>
                      {weekColumns.map((w) => (
                        <td key={`wk-${i}-${w}`} style={{ ...numCell }}>
                          {weeks?.[w] ?? weeks?.[String(w)] ?? ""}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div
        style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}
      >
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
