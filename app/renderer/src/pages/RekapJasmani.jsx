// renderer/src/pages/RekapJasmani.jsx
import { useEffect, useMemo, useState, Fragment } from "react";
import { useShell } from "../context/ShellContext";
import { useToast } from "../components/Toaster";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

const W_NOSIS = 120;
const W_NAMA = 280;
const W_TEXT = 110;
const W_NUM = 90;

// durasi auto-close
const SUCCESS_CLOSE_MS = 5000; // 5s
const ERROR_CLOSE_MS = 6000; // 6s

export default function RekapJasmani() {
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
  const [tahap, setTahap] = useState(""); // "" = auto tahap terakhir

  const [exporting, setExporting] = useState(false);

  // ===== Jenis Pendidikan (di-set saat login)
  const [jenis, setJenis] = useState(
    () => localStorage.getItem("sa.jenis_pendidikan") || ""
  );
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "sa.jenis_pendidikan") setJenis(e.newValue || "");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // ambil daftar angkatan (ikut filter jenis)
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

  const url = useMemo(() => {
    const u = new URL(`${API}/jasmani/rekap`);
    if (q) u.searchParams.set("q", q);
    if (angkatanEffective) u.searchParams.set("angkatan", angkatanEffective);
    if (tahap !== "") u.searchParams.set("tahap", String(tahap));
    if (jenis) u.searchParams.set("jenis", jenis);
    u.searchParams.set("page", String(page));
    u.searchParams.set("limit", String(limit));
    u.searchParams.set("sort_by", sortBy);
    u.searchParams.set("sort_dir", sortDir);
    return u.toString();
  }, [q, page, limit, sortBy, sortDir, angkatanEffective, tahap, jenis]);

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
  }, [q, angkatanFilter, angkatanFromShell, sortBy, sortDir, tahap, jenis]);

  // ==== EXPORT (1 tombol, semua baris sesuai filter) ====
  function buildExportUrl() {
    const u = new URL(`${API}/export/jasmani_rekap.xlsx`);
    if (q) u.searchParams.set("q", q);
    if (angkatanEffective) u.searchParams.set("angkatan", angkatanEffective);
    if (tahap !== "") u.searchParams.set("tahap", String(tahap));
    if (jenis) u.searchParams.set("jenis", jenis);
    u.searchParams.set("sort_by", sortBy);
    u.searchParams.set("sort_dir", sortDir);
    u.searchParams.set("all", "1");
    return u.toString();
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

  function formatBytes(b) {
    if (!b) return "0 B";
    const u = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(b) / Math.log(1024));
    return `${(b / Math.pow(1024, i)).toFixed(1)} ${u[i]}`;
  }

  // --- WEB (non-Electron): fetch streaming dengan progress + error-handling
  async function downloadViaFetchWithProgress(
    url,
    suggestedName = "rekap-jasmani.xlsx"
  ) {
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
        duration: 0, // loading: tidak auto-close
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
          const pct = (loaded / contentLength) * 100;
          toast.update(tid, {
            message: `Mengunduh ${formatBytes(loaded)} / ${formatBytes(
              contentLength
            )}`,
            progress: pct,
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
    let tid = null; // toast id untuk Electron branch
    try {
      setExporting(true);

      const url = buildExportUrl();
      const ts = new Date();
      const y = ts.getFullYear();
      const m = String(ts.getMonth() + 1).padStart(2, "0");
      const d = String(ts.getDate()).padStart(2, "0");
      const hh = String(ts.getHours()).padStart(2, "0");
      const mm = String(ts.getMinutes()).padStart(2, "0");
      const ss = String(ts.getSeconds()).padStart(2, "0");
      const fname = `rekap-jasmani${
        angkatanEffective ? `-angkatan-${angkatanEffective}` : ""
      }${tahap !== "" ? `-tahap-${tahap}` : ""}${
        jenis ? `-jenis-${jenis}` : ""
      }-${y}${m}${d}-${hh}${mm}${ss}.xlsx`;

      if (window.electronAPI?.download) {
        const info = await window.electronAPI
          .getDefaultDownloadsDir()
          .catch(() => null);
        tid = toast.show({
          type: "loading",
          title: "Menyiapkan unduhan…",
          message: info?.dir
            ? `Menyimpan ke: ${info.dir}`
            : "Menyimpan berkas…",
          indeterminate: true,
          canDismiss: true,
          duration: 0, // loading: tidak auto-close
        });

        const res = await window.electronAPI.download(url, fname);
        if (!res?.ok) {
          throw new Error(res?.message || "Gagal mengunduh");
        }

        const fullPath = res.path;
        toast.update(tid, {
          type: "success",
          title: "Selesai",
          message: `Tersimpan: ${fullPath}`,
          indeterminate: false,
          duration: SUCCESS_CLOSE_MS, // auto-close
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
          duration: ERROR_CLOSE_MS, // auto-close
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
    } finally {
      setExporting(false);
    }
  }

  // ==== helpers (sticky) – gunakan CSS var()
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
  const centerCell = { textAlign: "center", whiteSpace: "nowrap" };

  const fmtNum = (v) => (v == null || Number.isNaN(v) ? "-" : Number(v));
  const fmtRank = (r) =>
    r?.pos != null && r?.total ? `${r.pos}/${r.total}` : "-";

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
            disabled={exporting}
            title="Export Excel (semua hasil filter)"
          >
            {exporting ? "Menyiapkan…" : "Export Excel"}
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
              minWidth: 1700,
              borderCollapse: "separate",
              borderSpacing: 0,
            }}
          >
            <thead>
              <tr>
                <th
                  rowSpan={2}
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
                  rowSpan={2}
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
                  rowSpan={2}
                  style={{
                    ...thBase,
                    ...stickyTop,
                    textAlign: "left",
                    minWidth: W_TEXT,
                  }}
                >
                  Angkatan
                </th>
                <th
                  rowSpan={2}
                  style={{
                    ...thBase,
                    ...stickyTop,
                    ...centerCell,
                    minWidth: 80,
                  }}
                >
                  Tahap
                </th>
                <th
                  rowSpan={2}
                  style={{
                    ...thBase,
                    ...stickyTop,
                    ...centerCell,
                    minWidth: 110,
                  }}
                >
                  R. Batalion
                </th>
                <th
                  rowSpan={2}
                  style={{
                    ...thBase,
                    ...stickyTop,
                    ...centerCell,
                    minWidth: 100,
                  }}
                >
                  R. Kompi
                </th>
                <th
                  rowSpan={2}
                  style={{
                    ...thBase,
                    ...stickyTop,
                    ...centerCell,
                    minWidth: 110,
                  }}
                >
                  R. Pleton
                </th>

                {groups.map((g) => (
                  <th
                    key={`grp-${g.key}`}
                    colSpan={2}
                    style={{
                      ...thBase,
                      ...stickyTop,
                      textAlign: "center",
                      minWidth: W_NUM * 2,
                    }}
                  >
                    {g.label}
                  </th>
                ))}

                <th
                  rowSpan={2}
                  style={{
                    ...thBase,
                    ...stickyTop,
                    ...numCell,
                    minWidth: W_NUM,
                  }}
                >
                  Nilai Akhir
                </th>
                <th
                  rowSpan={2}
                  style={{
                    ...thBase,
                    ...stickyTop,
                    textAlign: "left",
                    minWidth: 220,
                  }}
                >
                  Keterangan
                </th>
              </tr>

              <tr>
                {groups.map((g) => (
                  <Fragment key={`sub-${g.key}`}>
                    <th
                      style={{
                        ...thBase,
                        ...stickyTop,
                        ...centerCell,
                        minWidth: W_NUM,
                      }}
                    >
                      TS
                    </th>
                    <th
                      style={{
                        ...thBase,
                        ...stickyTop,
                        ...centerCell,
                        minWidth: W_NUM,
                      }}
                    >
                      RS
                    </th>
                  </Fragment>
                ))}
              </tr>
            </thead>

            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={4 + 4 + groups.length * 2 + 2}
                    className="muted"
                    style={{ padding: 12 }}
                  >
                    Tidak ada data.
                  </td>
                </tr>
              ) : (
                items.map((r, i) => (
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
                    <td style={{ ...centerCell }}>{r.tahap ?? "-"}</td>
                    <td style={{ ...centerCell }}>
                      {fmtRank(r.rank?.batalion)}
                    </td>
                    <td style={{ ...centerCell }}>{fmtRank(r.rank?.kompi)}</td>
                    <td style={{ ...centerCell }}>{fmtRank(r.rank?.pleton)}</td>

                    <td style={{ ...numCell }}>
                      {fmtNum(r.nilai?.lari_12_menit?.ts)}
                    </td>
                    <td style={{ ...numCell }}>
                      {fmtNum(r.nilai?.lari_12_menit?.rs)}
                    </td>

                    <td style={{ ...numCell }}>
                      {fmtNum(r.nilai?.sit_up?.ts)}
                    </td>
                    <td style={{ ...numCell }}>
                      {fmtNum(r.nilai?.sit_up?.rs)}
                    </td>

                    <td style={{ ...numCell }}>
                      {fmtNum(r.nilai?.shuttle_run?.ts)}
                    </td>
                    <td style={{ ...numCell }}>
                      {fmtNum(r.nilai?.shuttle_run?.rs)}
                    </td>

                    <td style={{ ...numCell }}>
                      {fmtNum(r.nilai?.push_up?.ts)}
                    </td>
                    <td style={{ ...numCell }}>
                      {fmtNum(r.nilai?.push_up?.rs)}
                    </td>

                    <td style={{ ...numCell }}>
                      {fmtNum(r.nilai?.pull_up?.ts)}
                    </td>
                    <td style={{ ...numCell }}>
                      {fmtNum(r.nilai?.pull_up?.rs)}
                    </td>

                    <td style={{ ...numCell }}>{fmtNum(r.nilai_akhir)}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {r.keterangan ?? ""}
                    </td>
                  </tr>
                ))
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
