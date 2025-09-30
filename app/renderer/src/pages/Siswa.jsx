import { useEffect, useMemo, useState } from "react";
import { useShell } from "../context/ShellContext";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function Siswa() {
  const { angkatan: angkatanFromShell } = useShell(); // nilai dari Shell (boleh kosong)
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [sortBy, setSortBy] = useState("nama");
  const [sortDir, setSortDir] = useState("asc");

  // ---- Filter Angkatan (di halaman) ----
  const [angkatanOpts, setAngkatanOpts] = useState([]);
  const [angkatanFilter, setAngkatanFilter] = useState(""); // "" = semua

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
        if (!r.ok) {
          console.error(
            "[SiswaIndex] load angkatan:",
            r.status,
            await r.text()
          );
          return;
        }
        const data = await r.json();
        if (alive) setAngkatanOpts(Array.isArray(data.items) ? data.items : []);
      } catch (e) {
        console.error("[SiswaIndex] load angkatan error:", e);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // nilai angkatan efektif yang dipakai query
  const angkatanEffective = angkatanFilter || angkatanFromShell || "";

  // build URL
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
      } catch (e) {
        if (!alive) return;
        setItems([]);
        setTotal(0);
      }
    })();
    return () => {
      alive = false;
    };
  }, [url]);

  // reset halaman jika salah satu filter (local/shell) berubah
  useEffect(() => {
    setPage(1);
  }, [angkatanFilter, angkatanFromShell]);

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
        }}
      >
        {/* Dropdown Angkatan (halaman) */}
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
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
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

      {/* Tabel */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="table" style={{ width: "100%" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>NOSIS</th>
              <th style={{ textAlign: "left" }}>Nama</th>
              <th style={{ textAlign: "left" }}>Angkatan</th>
              <th style={{ textAlign: "left", width: 1 }}>Aksi</th> {/* NEW */}
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
                const nik = String(r?.nik ?? "").trim(); // <- selalu string

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
                            (window.location.hash = `#/siswa/nik/${encodeURIComponent(
                              nik
                            )}`)
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
