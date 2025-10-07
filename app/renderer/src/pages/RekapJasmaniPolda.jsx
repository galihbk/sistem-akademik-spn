// src/pages/RekapJasmaniPolda.jsx
import { useEffect, useMemo, useState } from "react";
import { useShell } from "../context/ShellContext";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

// widths
const W_NOPANDA = 140;
const W_NAMA = 280;
const W_TEXT = 130;
const W_NUM = 100;

export default function RekapJasmaniPolda() {
  const { angkatan: angkatanFromShell } = useShell();

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const [sortBy, setSortBy] = useState("nama");
  const [sortDir, setSortDir] = useState("asc");

  // filters (cukup angkatan)
  const [angkatanOpts, setAngkatanOpts] = useState([]);
  const [angkatanFilter, setAngkatanFilter] = useState("");

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

  // build url data
  const url = useMemo(() => {
    const u = new URL(`${API}/jasmani-polda/rekap`);
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

  // reset page jika filter/sort berubah
  useEffect(() => {
    setPage(1);
  }, [q, angkatanFilter, angkatanFromShell, sortBy, sortDir]);

  // styles
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

  const fmtNum = (v) => (v == null || Number.isNaN(v) ? "-" : Number(v));

  // definisi grup kolom sesuai DB jasmani_polda
  const anthroCols = [
    { key: "tb_cm", label: "TB (cm)" },
    { key: "bb_kg", label: "BB (kg)" },
    { key: "ratio_index", label: "Ratio" }, // text
    { key: "somato_type", label: "Somato" }, // text
    { key: "klasifikasi_tipe_tubuh", label: "Klasifikasi" }, // text
    { key: "nilai_tipe_tubuh", label: "Nilai Tipe", num: true },
    { key: "nilai_kelainan", label: "Nilai Kelainan", num: true },
    { key: "nilai_terkecil", label: "Nilai Terkecil", num: true },
    { key: "nilai_anthro", label: "Nilai Anthro", num: true },
    { key: "pencapaian_nbl", label: "NBL" }, // text
  ];

  const samaptaCols = [
    { key: "lari_12_menit", label: "Lari 12 Menit", num: true },
    { key: "pull_up_chinning", label: "Pull Up/Chinning", num: true },
    { key: "sit_up", label: "Sit Up", num: true },
    { key: "push_up", label: "Push Up", num: true },
    { key: "shuttle_run", label: "Shuttle Run", num: true },
    { key: "renang", label: "Renang", num: true },
  ];

  const rekapCols = [
    { key: "nilai_b", label: "Nilai B", num: true },
    { key: "na_a_b", label: "NA A+B", num: true },
    { key: "antro", label: "Antro", num: true },
    { key: "renang_x20", label: "Renang ×20", num: true },
    { key: "samapta_x80", label: "Samapta ×80", num: true },
    { key: "nilai_akhir", label: "Nilai Akhir", num: true },
    { key: "ktgr", label: "KTGR" },
    { key: "ket", label: "KET" },
    { key: "catatan", label: "Catatan" },
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
          placeholder="Cari Nama / NO PANDA ..."
          style={{
            background: "#0f1424",
            border: "1px solid #1f2937",
            color: "#e5e7eb",
            borderRadius: 8,
            padding: "8px 10px",
            minWidth: 260,
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
          <option value="no_panda">No Panda</option>
          <option value="angkatan">Angkatan</option>
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
              minWidth: 1800,
              borderCollapse: "separate",
              borderSpacing: 0,
            }}
          >
            <thead>
              {/* Baris 1: grup header */}
              <tr>
                <th
                  rowSpan={2}
                  style={{
                    ...thBase,
                    ...stickyLeftTH(0),
                    minWidth: W_NOPANDA,
                    width: W_NOPANDA,
                  }}
                >
                  NO PANDA
                </th>
                <th
                  rowSpan={2}
                  style={{
                    ...thBase,
                    ...stickyLeftTH(W_NOPANDA),
                    minWidth: W_NAMA,
                    width: W_NAMA,
                  }}
                >
                  Nama
                </th>
                <th
                  rowSpan={2}
                  style={{ ...thBase, ...stickyTop, minWidth: 80 }}
                >
                  JK
                </th>
                <th
                  rowSpan={2}
                  style={{ ...thBase, ...stickyTop, minWidth: W_TEXT }}
                >
                  Jalur Seleksi
                </th>
                <th
                  rowSpan={2}
                  style={{ ...thBase, ...stickyTop, minWidth: 110 }}
                >
                  Angkatan
                </th>

                <th
                  colSpan={anthroCols.length}
                  style={{ ...thBase, ...stickyTop }}
                >
                  ANTHRO
                </th>

                <th
                  colSpan={samaptaCols.length}
                  style={{ ...thBase, ...stickyTop }}
                >
                  KESAMAPTAAN & RENANG
                </th>

                <th
                  colSpan={rekapCols.length}
                  style={{ ...thBase, ...stickyTop }}
                >
                  REKAP
                </th>
              </tr>

              {/* Baris 2: sub kolom */}
              <tr>
                {anthroCols.map((c) => (
                  <th
                    key={`anth-${c.key}`}
                    style={{
                      ...thBase,
                      ...stickyTop,
                      minWidth: c.num ? W_NUM : W_TEXT,
                    }}
                  >
                    {c.label}
                  </th>
                ))}
                {samaptaCols.map((c) => (
                  <th
                    key={`sam-${c.key}`}
                    style={{
                      ...thBase,
                      ...stickyTop,
                      minWidth: c.num ? W_NUM : W_TEXT,
                    }}
                  >
                    {c.label}
                  </th>
                ))}
                {rekapCols.map((c) => (
                  <th
                    key={`rek-${c.key}`}
                    style={{
                      ...thBase,
                      ...stickyTop,
                      minWidth: c.num ? W_NUM : W_TEXT,
                    }}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    className="muted"
                    colSpan={
                      5 /* ident */ +
                      anthroCols.length +
                      samaptaCols.length +
                      rekapCols.length
                    }
                    style={{ padding: 12 }}
                  >
                    Tidak ada data.
                  </td>
                </tr>
              ) : (
                items.map((r, i) => (
                  <tr key={`${r.no_panda ?? r.nama}-${i}`}>
                    {/* identitas */}
                    <td
                      style={{
                        ...stickyLeftTD(0),
                        minWidth: W_NOPANDA,
                        width: W_NOPANDA,
                      }}
                    >
                      {r.no_panda ?? "-"}
                    </td>
                    <td
                      style={{
                        ...stickyLeftTD(W_NOPANDA),
                        minWidth: W_NAMA,
                        width: W_NAMA,
                      }}
                    >
                      {r.nama ?? "-"}
                    </td>
                    <td>{r.jk ?? "-"}</td>
                    <td>{r.jalur_seleksi ?? "-"}</td>
                    <td>{r.angkatan ?? "-"}</td>

                    {/* anthro */}
                    {anthroCols.map((c) => (
                      <td
                        key={`anth-val-${c.key}`}
                        style={c.num ? numCell : undefined}
                      >
                        {c.num ? fmtNum(r[c.key]) : r[c.key] ?? "-"}
                      </td>
                    ))}

                    {/* samapta & renang */}
                    {samaptaCols.map((c) => (
                      <td
                        key={`sam-val-${c.key}`}
                        style={c.num ? numCell : undefined}
                      >
                        {c.num ? fmtNum(r[c.key]) : r[c.key] ?? "-"}
                      </td>
                    ))}

                    {/* rekap */}
                    {rekapCols.map((c) => (
                      <td
                        key={`rek-val-${c.key}`}
                        style={c.num ? numCell : undefined}
                      >
                        {c.num ? fmtNum(r[c.key]) : r[c.key] ?? "-"}
                      </td>
                    ))}
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
