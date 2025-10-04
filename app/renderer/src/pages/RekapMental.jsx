import { useEffect, useMemo, useState } from "react";
import { useShell } from "../context/ShellContext";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

// lebar konsisten utk kolom sticky
const W_NOSIS = 120;
const W_NAMA = 280;
const W_NUM = 110;

export default function RekapMental() {
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

  const [weekColumns, setWeekColumns] = useState([]);

  // opsi angkatan
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

  // URL
  const url = useMemo(() => {
    const u = new URL(`${API}/mental/rekap`);
    if (q) u.searchParams.set("q", q);
    if (angkatanEffective) u.searchParams.set("angkatan", angkatanEffective);
    u.searchParams.set("page", String(page));
    u.searchParams.set("limit", String(limit));
    u.searchParams.set("sort_by", sortBy);
    u.searchParams.set("sort_dir", sortDir);
    return u.toString();
  }, [q, page, limit, sortBy, sortDir, angkatanEffective]);

  // fetch
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

  useEffect(() => {
    setPage(1);
  }, [q, angkatanFilter, angkatanFromShell, sortBy, sortDir]);

  // ==== helpers (sticky)
  const stickyLeftTH = (px) => ({
    position: "sticky",
    top: 0,
    left: px,
    background: "#0b1220",
    zIndex: 6, // header di atas sel
    boxShadow: px ? "6px 0 10px rgba(0,0,0,.35)" : "inset 0 -1px 0 #1f2937",
  });
  const stickyLeftTD = (px) => ({
    position: "sticky",
    left: px,
    background: "#0b1220",
    zIndex: 5,
    boxShadow: px ? "6px 0 10px rgba(0,0,0,.35)" : "none",
  });
  const stickyTop = {
    position: "sticky",
    top: 0,
    background: "#0b1220",
    zIndex: 4,
  };
  const thBase = {
    whiteSpace: "nowrap",
    fontWeight: 700,
    borderBottom: "1px solid #1f2937",
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
                        {r.kelompok_angkatan ?? "-"}
                      </td>
                      <td style={{ ...numCell }}>{fmtSum(r.sum)}</td>
                      <td style={{ ...numCell }}>{fmtAvg(r.avg)}</td>
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
