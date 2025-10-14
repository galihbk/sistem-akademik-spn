// src/pages/RekapMapel.jsx
import { useEffect, useMemo, useState } from "react";
import { useShell } from "../context/ShellContext";
import { useToast } from "../components/Toaster";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

// lebar konsisten utk kolom sticky (sama seperti RekapMental.jsx)
const W_NOSIS = 120;
const W_NAMA = 280;
const W_NUM = 110;

// auto-close
const SUCCESS_CLOSE_MS = 5000;
const ERROR_CLOSE_MS = 6000;

export default function RekapMapel() {
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

  const [mapelOpts, setMapelOpts] = useState([]);
  const [mapelFilter, setMapelFilter] = useState("");

  const [weekColumns, setWeekColumns] = useState([]); // daftar pertemuan (1,2,3,...)

  // ==== opsi angkatan
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

  // ==== opsi mapel (opsional; fallback derive dari data)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const token = await window.authAPI?.getToken?.();
        const r = await fetch(`${API}/mapel/ref/mapel`, {
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!r.ok) return; // tidak ada endpoint, biarkan derive nanti
        const data = await r.json();
        const opts = Array.isArray(data.items) ? data.items : [];
        if (alive && opts.length) {
          const sorted = opts.map(String).sort((a, b) => a.localeCompare(b));
          setMapelOpts(sorted);
          if (!mapelFilter) setMapelFilter(sorted[0]);
        }
      } catch {}
    })();
    return () => {
      alive = false;
    };
  }, []);

  const angkatanEffective = angkatanFilter || angkatanFromShell || "";

  // ==== URL data (rekap)
  const url = useMemo(() => {
    const u = new URL(`${API}/mapel/rekap`);
    if (q) u.searchParams.set("q", q);
    if (angkatanEffective) u.searchParams.set("angkatan", angkatanEffective);
    if (mapelFilter) u.searchParams.set("mapel", mapelFilter);
    u.searchParams.set("page", String(page));
    u.searchParams.set("limit", String(limit));
    u.searchParams.set("sort_by", sortBy);
    u.searchParams.set("sort_dir", sortDir);
    return u.toString();
  }, [q, page, limit, sortBy, sortDir, angkatanEffective, mapelFilter]);

  // ==== fetch data
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const token = await window.authAPI?.getToken?.();
        const r = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        // Response bisa:
        // A) { items, total, weeks }
        // B) [ flat rows ... ]
        const data = await r.json();
        if (!alive) return;

        if (data && Array.isArray(data.items)) {
          const arr = data.items;
          setItems(arr);
          setTotal(data.total ?? arr.length ?? 0);

          let weeks = Array.isArray(data.weeks) ? data.weeks : [];
          if (!weeks.length) weeks = deriveWeeksFromItems(arr);
          setWeekColumns(weeks);

          if (mapelOpts.length === 0) {
            const derived = deriveMapelsFromItems(arr);
            if (derived.length) {
              setMapelOpts(derived);
              if (!mapelFilter) setMapelFilter(derived[0]);
            }
          }
          return;
        }

        if (Array.isArray(data)) {
          const flat = data;

          if (mapelOpts.length === 0) {
            const derived = deriveMapelsFromFlat(flat);
            if (derived.length) {
              setMapelOpts(derived);
              if (!mapelFilter) setMapelFilter(derived[0]);
            }
          }

          const flatFiltered = mapelFilter
            ? flat.filter((r) => (r.mapel || "") === mapelFilter)
            : flat;

          const { items: pivoted, weeks } = pivotFlatRows(flatFiltered, q);
          setItems(pivoted);
          setTotal(pivoted.length);
          setWeekColumns(weeks);
          return;
        }

        setItems([]);
        setTotal(0);
        setWeekColumns([]);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  useEffect(() => {
    setPage(1);
  }, [q, angkatanFilter, angkatanFromShell, sortBy, sortDir, mapelFilter]);

  /* =======================
     EXPORT (1 tombol, semua)
     ======================= */
  function buildExportUrl() {
    const u = new URL(`${API}/export/mapel.xlsx`);
    if (q) u.searchParams.set("q", q);
    if (angkatanEffective) u.searchParams.set("angkatan", angkatanEffective);
    if (mapelFilter) u.searchParams.set("mapel", mapelFilter);
    u.searchParams.set("sort_by", sortBy);
    u.searchParams.set("sort_dir", sortDir);
    u.searchParams.set("all", "1"); // selalu semua baris hasil filter
    return u.toString();
  }

  // ===== util unduh (browser) dgn progress =====
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
      const url = buildExportUrl();

      const ts = new Date();
      const y = ts.getFullYear();
      const m = String(ts.getMonth() + 1).padStart(2, "0");
      const d = String(ts.getDate()).padStart(2, "0");
      const hh = String(ts.getHours()).padStart(2, "0");
      const mm = String(ts.getMinutes()).padStart(2, "0");
      const ss = String(ts.getSeconds()).padStart(2, "0");
      const fname =
        `mapel${angkatanEffective ? `-angkatan-${angkatanEffective}` : ""}` +
        `${mapelFilter ? `-mapel-${mapelFilter}` : ""}` +
        `-${y}${m}${d}-${hh}${mm}${ss}.xlsx`;

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

        // dukung signature (url, filename) bila tersedia
        const res = await (window.electronAPI.download.length >= 2
          ? window.electronAPI.download(url, fname)
          : window.electronAPI.download(url));

        if (!res?.ok) throw new Error(res?.message || "Gagal mengunduh");
        toast.update(tid, {
          type: "success",
          title: "Selesai",
          message: `Tersimpan: ${res.path}`,
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
          indeterminate: false,
          duration: ERROR_CLOSE_MS,
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

  // ==== helpers sticky + format
  // ==== helpers (sticky) – GANTI SEMUA WARNA KE VAR() ====
  const stickyLeftTH = (px) => ({
    position: "sticky",
    top: 0,
    left: px,
    background: "var(--table-header-bg)",
    zIndex: 6, // header di atas sel
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
        {/* Angkatan */}
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

        {/* Mapel */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <label htmlFor="mapel" className="muted">
            Mapel
          </label>
          <select
            id="mapel"
            value={mapelFilter}
            onChange={(e) => setMapelFilter(e.target.value)}
            style={{
              background: "#0f1424",
              border: "1px solid #1f2937",
              color: "#e5e7eb",
              borderRadius: 8,
              padding: "6px 10px",
              minWidth: 200,
            }}
          >
            <option value="">(Semua / auto)</option>
            {mapelOpts.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Cari */}
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

        {/* Sort */}
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

        <div
          style={{
            marginLeft: "auto",
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <button
            className="btn"
            onClick={exportExcelAll}
            title="Export Excel (semua hasil filter)"
          >
            Export Excel
          </button>

          <div className="muted">Total: {total}</div>
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
                  R. Global
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
                        {r.kelompok_angkatan ?? r.angkatan ?? "-"}
                      </td>
                      <td style={{ ...numCell }}>
                        {fmtSum(r.sum ?? r.jumlah)}
                      </td>
                      <td style={{ ...numCell }}>{fmtAvg(r.avg ?? r.rata2)}</td>
                      <td style={{ textAlign: "center" }}>
                        {fmtRank(r.rank?.global)}
                      </td>
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

/* ===== Helpers ===== */

function deriveWeeksFromItems(arr) {
  const s = new Set();
  for (const it of arr) {
    const weeks = it?.weeks || {};
    Object.keys(weeks).forEach((k) => {
      const n = Number(String(k).trim());
      if (Number.isFinite(n)) s.add(n);
    });
  }
  return Array.from(s).sort((a, b) => a - b);
}

function deriveMapelsFromItems(arr) {
  const s = new Set();
  for (const it of arr) if (it.mapel) s.add(String(it.mapel));
  return Array.from(s).sort((a, b) => a.localeCompare(b));
}

function deriveMapelsFromFlat(rows) {
  const s = new Set();
  for (const r of rows) if (r.mapel) s.add(String(r.mapel));
  return Array.from(s).sort((a, b) => a.localeCompare(b));
}

function pivotFlatRows(flatRows, q) {
  const query = (q || "").trim().toLowerCase();
  const byKey = new Map();
  const weeksSet = new Set();

  for (const r of flatRows) {
    if (query) {
      const hay = `${(r.nama || "").toLowerCase()} ${(
        r.nosis || ""
      ).toLowerCase()}`;
      if (!hay.includes(query)) continue;
    }
    const key = `${r.nosis || ""}||${r.nama || ""}`;
    if (!byKey.has(key)) {
      byKey.set(key, {
        nosis: r.nosis || "",
        nama: r.nama || "",
        kelompok_angkatan: r.kelompok_angkatan || r.angkatan || "",
        weeks: {},
        sum: 0,
        _cnt: 0,
      });
    }
    const row = byKey.get(key);
    const p = toInt(r.pertemuan);
    const nilaiStr = r.nilai != null ? String(r.nilai) : null;
    if (Number.isInteger(p) && p > 0 && nilaiStr) {
      row.weeks[p] = nilaiStr;
      weeksSet.add(p);
      const num = toNum(nilaiStr);
      if (num != null) {
        row.sum += num;
        row._cnt += 1;
      }
    }
  }

  const items = Array.from(byKey.values())
    .map((x) => ({ ...x, avg: x._cnt > 0 ? x.sum / x._cnt : null }))
    .sort((a, b) => String(a.nama).localeCompare(String(b.nama)));

  return { items, weeks: Array.from(weeksSet).sort((a, b) => a - b) };
}

function toInt(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}
function toNum(v) {
  if (v == null) return null;
  const f = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(f) ? f : null;
}
function fmtRank(r) {
  return r?.pos != null && r?.total ? `${r.pos}/${r.total}` : "-";
}
function fmtAvg(v) {
  return v == null ? "-" : Number(v).toFixed(3);
}
function fmtSum(v) {
  return v == null ? "-" : Number(v).toFixed(3);
}
