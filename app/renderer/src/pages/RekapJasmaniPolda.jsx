// src/pages/RekapJasmaniPolda.jsx
import { useEffect, useMemo, useState } from "react";
import { useShell } from "../context/ShellContext";
import { useToast } from "../components/Toaster";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

const W_NOSIS = 220; // diperlebar utk select
const W_NAMA = 240;
const W_TEXT = 130;
const W_NUM = 100;

// auto-close
const SUCCESS_CLOSE_MS = 4000;
const ERROR_CLOSE_MS = 6000;

export default function RekapJasmaniPolda() {
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

  // opsi siswa untuk select (id, nosis, nama)
  const [siswaOpts, setSiswaOpts] = useState([]);
  const [loadingSiswa, setLoadingSiswa] = useState(false);

  // load opsi angkatan
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

  // load opsi siswa (try beberapa endpoint umum; pakai yang ada di servermu)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingSiswa(true);
        const token = await window.authAPI?.getToken?.();

        // 1) coba endpoint referensi minimal
        let r = await fetch(`${API}/ref/siswa-min`, {
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        // 2) fallback ke endpoint alternatif
        if (!r.ok) {
          r = await fetch(`${API}/siswa?min=1&limit=5000`, {
            headers: {
              Accept: "application/json",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          });
        }

        const data = await r.json();
        const arr = Array.isArray(data.items)
          ? data.items
          : Array.isArray(data)
          ? data
          : [];

        // Normalisasi: {id, nosis, nama}
        const norm = arr
          .map((it) => ({
            id: it.id,
            nosis: it.nosis ?? "",
            nama: it.nama ?? "",
          }))
          .filter((x) => x.id);

        if (alive) setSiswaOpts(norm);
      } catch {
        if (alive) setSiswaOpts([]);
      } finally {
        if (alive) setLoadingSiswa(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const angkatanEffective = angkatanFilter || angkatanFromShell || "";

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

  // reset page bila filter berubah
  useEffect(() => {
    setPage(1);
  }, [q, angkatanFilter, angkatanFromShell, sortBy, sortDir]);

  // styles
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

  const fmtNum = (v) => (v == null || Number.isNaN(v) ? "-" : Number(v));

  // ==================== definisi kolom ====================
  const anthroCols = [
    { key: "tb_cm", label: "TB (cm)" },
    { key: "bb_kg", label: "BB (kg)" },
    { key: "ratio_index", label: "Ratio" },
    { key: "somato_type", label: "Somato" },
    { key: "klasifikasi_tipe_tubuh", label: "Klasifikasi" },
    { key: "nilai_tipe_tubuh", label: "Nilai Tipe", num: true },
    { key: "nilai_kelainan", label: "Nilai Kelainan", num: true },
    { key: "nilai_terkecil", label: "Nilai Terkecil", num: true },
    { key: "nilai_anthro", label: "Nilai Anthro", num: true },
    { key: "pencapaian_nbl", label: "NBL" },
  ];

  const hasLari = items.some((it) => it.lari_12_menit != null);

  const hasHgbNgb =
    items.some(
      (it) =>
        it.pull_up_hgb1 != null ||
        it.pull_up_ngb1 != null ||
        it.sit_up_hgb2 != null ||
        it.sit_up_ngb2 != null ||
        it.push_up_hgb3 != null ||
        it.push_up_ngb3 != null ||
        it.shuttle_run_hgb4 != null ||
        it.shuttle_run_ngb4 != null
    ) || true;

  const samaptaCols = [
    ...(hasLari
      ? [{ key: "lari_12_menit", label: "Lari 12 Menit", num: true }]
      : []),
    { key: "kesamaptaan_hga", label: "Kesamaptaan HGA" },
    { key: "kesamaptaan_nga", label: "Kesamaptaan NGA" },
    ...(hasHgbNgb
      ? [
          { key: "pull_up_hgb1", label: "Pull Up HGB1", num: true },
          { key: "pull_up_ngb1", label: "Pull Up NGB1", num: true },
          { key: "sit_up_hgb2", label: "Sit Up HGB2", num: true },
          { key: "sit_up_ngb2", label: "Sit Up NGB2", num: true },
          { key: "push_up_hgb3", label: "Push Up HGB3", num: true },
          { key: "push_up_ngb3", label: "Push Up NGB3", num: true },
          { key: "shuttle_run_hgb4", label: "Shuttle Run HGB4", num: true },
          { key: "shuttle_run_ngb4", label: "Shuttle Run NGB4", num: true },
        ]
      : []),
    { key: "renang", label: "Renang", num: true },
  ];

  const rekapCols = [
    { key: "nilai_b", label: "Nilai B", num: true },
    { key: "na_a_b", label: "NA A+B", num: true },
    { key: "antro_text", label: "Antro (Kategori)" },
    { key: "renang_x20", label: "Renang ×20", num: true },
    { key: "samapta_x80", label: "Samapta ×80", num: true },
    { key: "nilai_akhir", label: "Nilai Akhir", num: true },
    { key: "ktgr", label: "KTGR" },
    { key: "ket", label: "KET" },
    { key: "catatan", label: "Catatan" },
  ];

  // ==================== handlers ====================
  async function handleSetSiswa(row, newSiswaId) {
    const prev = row.siswa_id ?? null;

    // optimistik update UI
    setItems((old) =>
      old.map((it) =>
        it.id === row.id
          ? { ...it, siswa_id: newSiswaId ? Number(newSiswaId) : null }
          : it
      )
    );

    // toast loading
    const tId = toast.show({
      type: "loading",
      title: "Menyimpan mapping…",
      message: newSiswaId
        ? `Mengaitkan ke siswa ID ${newSiswaId}`
        : "Melepas kaitan siswa",
      indeterminate: true,
      canDismiss: true,
      duration: 0,
    });

    try {
      const token = await window.authAPI?.getToken?.();
      // ⚠️ SESUAIKAN DENGAN ROUTE SERVER KAMU
      const r = await fetch(`${API}/jasmani-polda/${row.id}/set-siswa`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          siswa_id: newSiswaId ? Number(newSiswaId) : null,
        }),
      });

      if (!r.ok) {
        // rollback kalau gagal
        setItems((old) =>
          old.map((it) => (it.id === row.id ? { ...it, siswa_id: prev } : it))
        );
        let msg = "";
        try {
          msg = await r.text();
        } catch {}
        throw new Error(msg || `HTTP ${r.status}`);
      }

      // sukses
      toast.update(tId, {
        type: "success",
        title: "Tersimpan",
        message: newSiswaId
          ? `Berhasil mengaitkan: ${findSiswaLabel(Number(newSiswaId))}`
          : "Berhasil melepas kaitan siswa",
        indeterminate: false,
        duration: SUCCESS_CLOSE_MS,
      });
    } catch (e) {
      // rollback kalau error
      setItems((old) =>
        old.map((it) => (it.id === row.id ? { ...it, siswa_id: prev } : it))
      );
      toast.update(tId, {
        type: "error",
        title: "Gagal menyimpan",
        message: e?.message || "Terjadi kesalahan jaringan.",
        indeterminate: false,
        duration: ERROR_CLOSE_MS,
      });
    }
  }

  const findSiswaLabel = (sid) => {
    if (!sid) return "— Pilih Siswa —";
    const s = siswaOpts.find((x) => x.id === sid);
    return s ? `${s.nosis || "-"} — ${s.nama}` : `ID ${sid}`;
  };

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
          placeholder="Cari nama / NO PANDA ..."
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
              minWidth: 2400,
              borderCollapse: "separate",
              borderSpacing: 0,
            }}
          >
            <thead>
              <tr>
                {/* Kolom NOSIS (select) */}
                <th
                  rowSpan={2}
                  style={{
                    ...thBase,
                    ...stickyLeftTH(0),
                    minWidth: W_NOSIS,
                    width: W_NOSIS,
                  }}
                >
                  NOSIS – Nama (Mapping)
                </th>

                <th
                  rowSpan={2}
                  style={{
                    ...thBase,
                    ...stickyLeftTH(W_NOSIS),
                    minWidth: 120,
                    width: 120,
                  }}
                >
                  NO PANDA
                </th>
                <th
                  rowSpan={2}
                  style={{
                    ...thBase,
                    ...stickyLeftTH(W_NOSIS + 120),
                    minWidth: W_NAMA,
                    width: W_NAMA,
                  }}
                >
                  Nama Excel
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
                      3 + // nosis select + no panda + nama excel
                      1 + // jalur
                      1 + // angkatan
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
                  <tr key={`${r.id}-${i}`}>
                    {/* NOSIS select */}
                    <td
                      style={{
                        ...stickyLeftTD(0),
                        minWidth: W_NOSIS,
                        width: W_NOSIS,
                      }}
                    >
                      <select
                        disabled={loadingSiswa}
                        value={r.siswa_id ?? ""}
                        onChange={(e) =>
                          handleSetSiswa(r, e.target.value || null)
                        }
                        title={findSiswaLabel(r.siswa_id ?? null)}
                        style={{
                          width: "100%",
                          background: "#0f1424",
                          border: "1px solid #1f2937",
                          color: "#e5e7eb",
                          borderRadius: 8,
                          padding: "6px 8px",
                        }}
                      >
                        <option value="">
                          {loadingSiswa ? "Memuat..." : "— Pilih Siswa —"}
                        </option>
                        {siswaOpts.map((s) => (
                          <option key={s.id} value={s.id}>
                            {(s.nosis || "-") + " — " + (s.nama || "-")}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* NO PANDA */}
                    <td
                      style={{
                        ...stickyLeftTD(W_NOSIS),
                        minWidth: 120,
                        width: 120,
                      }}
                    >
                      {r.no_panda ?? "-"}
                    </td>

                    {/* Nama dari Excel (apa adanya) */}
                    <td
                      style={{
                        ...stickyLeftTD(W_NOSIS + 120),
                        minWidth: W_NAMA,
                        width: W_NAMA,
                      }}
                    >
                      {r.nama ?? "-"}
                    </td>

                    <td>{r.jalur_seleksi ?? "-"}</td>
                    <td>{r.angkatan ?? "-"}</td>

                    {anthroCols.map((c) => (
                      <td
                        key={`anth-val-${c.key}`}
                        style={c.num ? numCell : undefined}
                      >
                        {c.num ? fmtNum(r[c.key]) : r[c.key] ?? "-"}
                      </td>
                    ))}

                    {samaptaCols.map((c) => (
                      <td
                        key={`sam-val-${c.key}`}
                        style={c.num ? numCell : undefined}
                      >
                        {c.num ? fmtNum(r[c.key]) : r[c.key] ?? "-"}
                      </td>
                    ))}

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
