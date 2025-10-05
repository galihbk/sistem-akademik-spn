// src/pages/InputPrestasi.jsx
import { useEffect, useMemo, useRef, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

/* ======================= Util kecil ======================= */
function buildDownloadUrl(filePath) {
  if (!filePath) return "#";
  const clean = String(filePath)
    .replace(/^\/+/, "")
    .replace(/^uploads\//i, "");
  return `${API}/download?path=${encodeURIComponent(clean)}`;
}
async function tryHead(url) {
  try {
    const r = await fetch(url, { method: "HEAD" });
    return r.ok;
  } catch {
    return false;
  }
}
function fmtDate(v) {
  if (!v) return "-";
  try {
    const d = new Date(v);
    if (Number.isNaN(+d)) return String(v);
    return d.toLocaleDateString("id-ID");
  } catch {
    return String(v);
  }
}
function closeAfter(ms = 900) {
  setTimeout(() => {
    setOpen(false);
    setOpenList(false);
  }, ms);
}
const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "");

/* ======================= Modal ======================= */
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(3,6,17,0.66)",
        backdropFilter: "blur(2px)",
        display: "grid",
        placeItems: "center",
        zIndex: 1000,
        padding: 16,
      }}
      onMouseDown={onClose}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: "min(960px, 96vw)",
          maxHeight: "86vh",
          overflow: "auto",
          background: "#0b1220",
          border: "1px solid #1f2937",
          borderRadius: 14,
          padding: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <div style={{ fontWeight: 800, fontSize: 18 }}>{title}</div>
          <button className="btn" onClick={onClose}>
            Tutup
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ======================= Komponen utama ======================= */
export default function InputPrestasi() {
  /* ---------- state: history ---------- */
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [qHist, setQHist] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loadingList, setLoadingList] = useState(false);
  const [alert, setAlert] = useState({ type: "", text: "" }); // {type:'success'|'danger', text:''}

  /* ---------- state: modal form ---------- */
  const [open, setOpen] = useState(false);

  const [siswaId, setSiswaId] = useState(null);     // << sama seperti Riwayat (pakai ID saja)
  const [query, setQuery] = useState("");           // tampilan teks (NOSIS — Nama)
  const [judul, setJudul] = useState("");
  const [tingkat, setTingkat] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [tanggal, setTanggal] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  // dropdown siswa (autocomplete)
  const [searching, setSearching] = useState(false);
  const [sug, setSug] = useState([]);
  const [openList, setOpenList] = useState(false);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const q = useMemo(() => query.trim(), [query]);

  const filteredSug = useMemo(() => {
    const n = norm(q);
    if (n.length < 2) return [];
    return (sug || [])
      .filter((s) => norm(s.nosis).includes(n) || norm(s.nama).includes(n))
      .slice(0, 20);
  }, [sug, q]);

  /* ---------- fetch history ---------- */
  const listUrl = useMemo(() => {
    const u = new URL(`${API}/prestasi`);
    if (qHist.trim()) u.searchParams.set("q", qHist.trim());
    u.searchParams.set("page", String(page));
    u.searchParams.set("limit", String(limit));
    u.searchParams.set("sort_dir", "desc");
    return u.toString();
  }, [qHist, page, limit]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingList(true);
        const token = await window.authAPI?.getToken?.();
        const r = await fetch(listUrl, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await r.json().catch(() => ({}));
        if (!alive) return;
        setItems(Array.isArray(data.items) ? data.items : []);
        setTotal(data.total ?? 0);
      } catch {
        if (!alive) return;
        setItems([]);
        setTotal(0);
      } finally {
        if (!alive) return;
        setLoadingList(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [listUrl]);

  /* ---------- search siswa (modal) — sama seperti Riwayat ---------- */
  useEffect(() => {
    let stop = false;

    if (siswaId) {
      // Sudah memilih siswa ⇒ jangan tampilkan dropdown lagi
      setOpenList(false);
      return;
    }
    if (q.length < 2) {
      setSug([]);
      setOpenList(false);
      return;
    }

    const t = setTimeout(async () => {
      try {
        setSearching(true);
        const token = await window.authAPI?.getToken?.();
        const u = new URL(`${API}/siswa`);
        u.searchParams.set("q", q);
        u.searchParams.set("page", "1");
        u.searchParams.set("limit", "50");
        const r = await fetch(u.toString(), {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await r.json().catch(() => ({}));
        if (stop) return;
        setSug(
          (Array.isArray(data.items) ? data.items : []).map((s) => ({
            id: s.id,
            nosis: s.nosis,
            nama: s.nama,
            nik: s.nik,
          }))
        );
        setOpenList(true);
      } catch {
        if (!stop) {
          setSug([]);
          setOpenList(true);
        }
      } finally {
        if (!stop) setSearching(false);
      }
    }, 250);

    return () => {
      stop = true;
      clearTimeout(t);
    };
  }, [q, siswaId]);

  // Tutup dropdown pada klik di luar / Esc — sama seperti Riwayat
  useEffect(() => {
    function onDocClick(e) {
      const inInput = inputRef.current?.contains?.(e.target);
      const inList = listRef.current?.contains?.(e.target);
      if (!inInput && !inList) setOpenList(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpenList(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function pickSiswa(s) {
    setSiswaId(s.id);
    setQuery(`${String(s.nosis || "").padStart(4, "0")} — ${s.nama}`);
    setOpenList(false);
  }

  function clearForm() {
    setSiswaId(null);
    setQuery("");
    setJudul("");
    setTingkat("");
    setDeskripsi("");
    setTanggal(new Date().toISOString().slice(0, 10));
    setFile(null);
    const el = document.getElementById("prestasiFileInput");
    if (el) el.value = "";
  }

  /* ---------- submit ---------- */
  async function submit() {
    setAlert({ type: "", text: "" });
    if (!siswaId) {
      setAlert({ type: "danger", text: "Pilih siswa dari daftar terlebih dahulu." });
      return;
    }
    if (!judul.trim()) {
      setAlert({ type: "danger", text: "Judul wajib diisi." });
      return;
    }
    if (!tingkat.trim()) {
      setAlert({ type: "danger", text: "Tingkatan wajib diisi." });
      return;
    }
    try {
      setSaving(true);
      const token = await window.authAPI?.getToken?.();
      const form = new FormData();
      form.append("siswa_id", String(siswaId));
      form.append("judul", judul.trim());
      form.append("tingkat", tingkat.trim());
      form.append("deskripsi", deskripsi.trim());
      form.append("tanggal", tanggal || "");
      if (file) form.append("file", file);

      const res = await fetch(`${API}/prestasi`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Gagal menyimpan prestasi");

      setAlert({ type: "success", text: "Berhasil disimpan." });
      // refresh list dari page 1
      setPage(1);
      // tetap di modal; kosongkan field selain siswa agar input beruntun
      setJudul("");
      setTingkat("");
      setDeskripsi("");
      setFile(null);
      const el = document.getElementById("prestasiFileInput");
      if (el) el.value = "";
    } catch (e) {
      setAlert({ type: "danger", text: `Gagal: ${e.message}` });
    } finally {
      setSaving(false);
    }
    setAlert({ type: "success", text: "Berhasil disimpan." });
setPage(1);
setJudul(""); setTingkat(""); setDeskripsi(""); setFile(null);
const el = document.getElementById("prestasiFileInput"); if (el) el.value = "";
closeAfter();
  }

  /* ---------- UI ---------- */
  return (
    <div className="grid">
      {/* Header + button */}
      <div
        className="card"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Input Prestasi</div>
          <div className="muted">Catat prestasi per-siswa, lampiran opsional.</div>
        </div>
        <button className="btn" onClick={() => setOpen(true)}>
          + Input Prestasi
        </button>
      </div>

      {/* Alerts di atas tabel */}
      {alert.text && (
        <div
          className="card"
          style={{
            border: `1px solid ${alert.type === "success" ? "#166534" : "#7f1d1d"}`,
            background: alert.type === "success" ? "#052e1a" : "#1b0c0c",
            color: alert.type === "success" ? "#86efac" : "#fca5a5",
            padding: "8px 12px",
            borderRadius: 12,
          }}
        >
          {alert.text}
        </div>
      )}

      {/* Toolbar kecil list */}
      <div className="card" style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input
          className="input"
          placeholder="Cari judul / nama / nosis …"
          value={qHist}
          onChange={(e) => {
            setQHist(e.target.value);
            setPage(1);
          }}
          style={{ minWidth: 280 }}
        />
        <div style={{ marginLeft: "auto", color: "#94a3b8" }}>Total: {total}</div>
      </div>

      {/* Tabel history */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="table-wrap" style={{ maxHeight: "60vh", overflow: "auto" }}>
          <table className="table" style={{ width: "100%" }}>
            <thead style={{ position: "sticky", top: 0, background: "#0b1220", zIndex: 1 }}>
              <tr>
                <th style={{ textAlign: "left" }}>NOSIS</th>
                <th style={{ textAlign: "left" }}>Nama</th>
                <th style={{ textAlign: "left" }}>Judul</th>
                <th style={{ textAlign: "left" }}>Tingkat</th>
                <th style={{ textAlign: "left" }}>Tanggal</th>
                <th style={{ textAlign: "left" }}>File</th>
                <th style={{ textAlign: "left" }}>Dibuat</th>
              </tr>
            </thead>
            <tbody>
              {loadingList ? (
                <tr>
                  <td colSpan={7} className="muted" style={{ padding: 12 }}>
                    Memuat…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="muted" style={{ padding: 12 }}>
                    Tidak ada data.
                  </td>
                </tr>
              ) : (
                items.map((r) => (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{r.nosis ?? "-"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{r.nama ?? "-"}</td>
                    <td>{r.judul ?? "-"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{r.tingkat ?? "-"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{fmtDate(r.tanggal)}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {r.file_path ? (
                        <button
                          className="btn"
                          style={{ padding: "6px 10px" }}
                          onClick={async () => {
                            const url = buildDownloadUrl(r.file_path);
                            if (!(await tryHead(url))) {
                              setAlert({ type: "danger", text: "File tidak ditemukan." });
                              return;
                            }
                            if (window.electronAPI?.download) {
                              window.electronAPI.download(url);
                            } else {
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = "";
                              document.body.appendChild(a);
                              a.click();
                              a.remove();
                            }
                          }}
                        >
                          Download
                        </button>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>{fmtDate(r.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
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

      {/* Modal Form */}
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setOpenList(false); // ⬅ penting: tutup dropdown saat modal ditutup (persis seperti Riwayat)
        }}
        title="Input Prestasi"
      >
        {/* Cari siswa + tanggal */}
        <div className="grid grid-2" style={{ gap: 12, position: "relative" }}>
          <div ref={inputRef} style={{ position: "relative" }}>
            <label className="muted">Cari NOSIS / Nama</label>
            <input
              className="input"
              placeholder="Ketik min. 2 huruf lalu pilih dari daftar"
              value={query}
              onChange={(e) => {
                const v = e.target.value;
                setQuery(v);
                // saat user mengetik ulang, batalkan selection
                if (siswaId) setSiswaId(null);
              }}
              onFocus={() => {
                // hanya buka dropdown kalau belum memilih siswa
                if (!siswaId && q.length >= 2) setOpenList(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpenList(false);
              }}
              autoComplete="off"
            />

            {/* Dropdown – hanya muncul saat BELUM memilih siswa */}
            {openList && !siswaId && (
              <div
                ref={listRef}
                style={{
                  position: "absolute",
                  zIndex: 30,
                  left: 0,
                  right: 0,
                  marginTop: 6,
                  background: "#1e293b",
                  border: "1px solid #475569",
                  borderRadius: 10,
                  boxShadow: "0 10px 20px rgba(0,0,0,.35)",
                  maxHeight: 280,
                  overflow: "auto",
                  color: "#e2e8f0",
                }}
              >
                <div
                  className="muted"
                  style={{
                    padding: "8px 10px",
                    borderBottom: "1px solid #334155",
                    color: "#cbd5e1",
                    background: "#243447",
                  }}
                >
                  {searching ? "Mencari..." : "Pilih dari daftar:"}
                </div>

                {filteredSug.length === 0 ? (
                  <div className="muted" style={{ padding: 10, color: "#cbd5e1" }}>
                    {q.length < 2 ? "Ketik minimal 2 karakter." : "Tidak ada hasil."}
                  </div>
                ) : (
                  filteredSug.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => pickSiswa(s)}
                      onMouseDown={(e) => e.preventDefault()}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "10px 12px",
                        background: "#1f2a3a",
                        border: 0,
                        borderBottom: "1px solid #334155",
                        cursor: "pointer",
                        color: "#e5e7eb",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "#2b3a55")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "#1f2a3a")}
                    >
                      <div style={{ fontWeight: 700 }}>
                        {String(s.nosis || "-").padStart(4, "0")} — {s.nama}
                      </div>
                      <div className="muted" style={{ fontSize: 12, color: "#cbd5e1" }}>
                        {s.nik ? `NIK ${s.nik}` : "NIK -"}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div>
            <label className="muted">Tanggal</label>
            <input
              className="input"
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
            />
          </div>
        </div>

        {/* Judul */}
        <div style={{ marginTop: 10 }}>
          <label className="muted">Judul</label>
          <input
            className="input"
            placeholder="Judul prestasi (mis. Juara 1 Lomba A)"
            value={judul}
            onChange={(e) => setJudul(e.target.value)}
          />
        </div>

        {/* Tingkatan */}
        <div style={{ marginTop: 10 }}>
          <label className="muted">Tingkatan</label>
          <input
            className="input"
            placeholder="Kabupaten / Provinsi / Nasional / Internasional"
            value={tingkat}
            onChange={(e) => setTingkat(e.target.value)}
          />
        </div>

        {/* Deskripsi */}
        <div style={{ marginTop: 10 }}>
          <label className="muted">Catatan / Deskripsi</label>
          <textarea
            className="input"
            rows={3}
            placeholder="Tuliskan deskripsi singkat prestasi"
            value={deskripsi}
            onChange={(e) => setDeskripsi(e.target.value)}
          />
        </div>

        {/* File */}
        <div style={{ marginTop: 10 }}>
          <label className="muted">Lampiran (opsional)</label>
          <input
            id="prestasiFileInput"
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          {file && (
            <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
              {file.name} — {(file.size / 1024).toFixed(1)} KB
            </div>
          )}
        </div>

        {/* Action */}
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <button className="btn" disabled={saving} onClick={submit}>
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
          <button className="btn" onClick={clearForm} disabled={saving}>
            Reset
          </button>
        </div>
      </Modal>
    </div>
  );
}
