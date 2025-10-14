// src/pages/InputRiwayatKesehatan.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "../components/Toaster";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

/* ===== Utils ===== */
function buildDownloadUrl(filePath) {
  if (!filePath) return "#";
  const clean = String(filePath)
    .replace(/^\/+/, "")
    .replace(/^uploads\//i, "");
  return `${API}/download?path=${encodeURIComponent(clean)}`;
}
async function headOK(url) {
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
    return Number.isNaN(+d) ? String(v) : d.toLocaleDateString("id-ID");
  } catch {
    return String(v);
  }
}
const norm = (s) =>
  String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "");

/* ===== Modal ===== */
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      onMouseDown={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(3,6,17,.66)",
        backdropFilter: "blur(2px)",
        display: "grid",
        placeItems: "center",
        padding: 16,
        zIndex: 1000,
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: "min(960px,96vw)",
          maxHeight: "86vh",
          overflow: "auto",
          background: "var(--panel)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: 14,
          color: "var(--text)",
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

/* ===== Page ===== */
export default function InputRiwayatKesehatan() {
  const toast = useToast();

  /* ---------- History List ---------- */
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [qHist, setQHist] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20;
  const [loadingList, setLoadingList] = useState(false);

  const listUrl = useMemo(() => {
    const u = new URL(`${API}/riwayat_kesehatan`);
    if (qHist.trim()) u.searchParams.set("q", qHist.trim());
    u.searchParams.set("page", String(page));
    u.searchParams.set("limit", String(limit));
    u.searchParams.set("sort_dir", "desc");
    return u.toString();
  }, [qHist, page]);

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
        setList(Array.isArray(data.items) ? data.items : []);
        setTotal(data.total ?? 0);
      } catch {
        if (!alive) return;
        setList([]);
        setTotal(0);
        toast.show({
          type: "error",
          title: "Gagal",
          message: "Gagal memuat daftar riwayat.",
        });
      } finally {
        if (!alive) return;
        setLoadingList(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [listUrl, toast]);

  /* ---------- Modal Form ---------- */
  const [open, setOpen] = useState(false);

  const [siswaId, setSiswaId] = useState(null);
  const [query, setQuery] = useState("");
  const [judul, setJudul] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [tanggal, setTanggal] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  // autocomplete
  const [searching, setSearching] = useState(false);
  const [sug, setSug] = useState([]);
  const [openList, setOpenList] = useState(false);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const q = useMemo(() => query.trim(), [query]);

  // fetch siswa (debounce)
  useEffect(() => {
    let stop = false;

    if (siswaId) {
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
        const arr = Array.isArray(data.items) ? data.items : [];
        setSug(
          arr.map((s) => ({
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

  // close dropdown on outside click / Esc
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

  const filteredSug = useMemo(() => {
    const n = norm(q);
    if (n.length < 2) return [];
    return sug
      .filter((s) => norm(s.nosis).includes(n) || norm(s.nama).includes(n))
      .slice(0, 20);
  }, [sug, q]);

  function pickSiswa(s) {
    setSiswaId(s.id);
    setQuery(`${String(s.nosis || "").padStart(4, "0")} — ${s.nama}`);
    setOpenList(false);
  }

  function resetForm() {
    setSiswaId(null);
    setQuery("");
    setJudul("");
    setDeskripsi("");
    setTanggal(new Date().toISOString().slice(0, 10));
    setFile(null);
    const el = document.getElementById("rkFileInput");
    if (el) el.value = "";
  }

  function closeModalAndReset() {
    setOpen(false);
    setOpenList(false);
    resetForm();
  }

  /* ---------- Submit (pakai toaster) ---------- */
  async function submit() {
    if (!siswaId || !judul.trim() || !deskripsi.trim()) {
      toast.show({
        type: "error",
        title: "Validasi",
        message: "Lengkapi siswa, Judul, dan Deskripsi.",
      });
      closeModalAndReset();
      return;
    }

    let tId;
    try {
      setSaving(true);
      tId = toast.show({
        type: "loading",
        title: "Menyimpan riwayat…",
        indeterminate: true,
        canDismiss: true,
        duration: 0,
      });

      const token = await window.authAPI?.getToken?.();

      const form = new FormData();
      form.append("siswa_id", String(siswaId));
      form.append("judul", judul.trim());
      form.append("deskripsi", deskripsi.trim());
      form.append("tanggal", tanggal || "");
      if (file) form.append("file", file);

      const r = await fetch(`${API}/riwayat_kesehatan`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.message || "Gagal menyimpan data.");

      toast.update(tId, {
        type: "success",
        title: "Berhasil",
        message: "Riwayat disimpan.",
        duration: 2500,
        indeterminate: false,
      });

      setPage(1);
      closeModalAndReset();
    } catch (e) {
      toast.update(tId, {
        type: "error",
        title: "Gagal",
        message: e?.message || "Terjadi kesalahan.",
        duration: 5000,
        indeterminate: false,
      });
    } finally {
      setSaving(false);
    }
  }

  const dlToastIdRef = useRef(null);

  useEffect(() => {
    const off = window.electronAPI?.onDownloadStatus?.((p) => {
      if (!p || p.type !== "download") return;

      if (p.phase === "progress") {
        const pct = p.total
          ? Math.min(100, Math.round((p.received / p.total) * 100))
          : null;

        if (!dlToastIdRef.current) {
          dlToastIdRef.current = toast.show({
            type: "loading",
            title: "Mengunduh file…",
            message:
              pct != null
                ? `Mengunduh… ${pct}% (${p.received} / ${p.total} bytes)`
                : `Mengunduh… ${p.received} bytes`,
            progress: pct ?? null,
            indeterminate: pct == null,
            canDismiss: true,
            duration: 0,
          });
        } else {
          toast.update(dlToastIdRef.current, {
            type: "loading",
            title: "Mengunduh file…",
            message:
              pct != null
                ? `Mengunduh… ${pct}% (${p.received} / ${p.total} bytes)`
                : `Mengunduh… ${p.received} bytes`,
            progress: pct ?? null,
            indeterminate: pct == null,
            duration: 0,
          });
        }
        return;
      }

      // DONE / ERROR: jika belum ada toast progress (file kecil), tampilkan satu toast final saja
      if (p.phase === "done") {
        if (!dlToastIdRef.current) {
          toast.show({
            type: "success",
            title: "Selesai",
            message: `Tersimpan di: ${p.path}`,
            duration: 6000,
          });
        } else {
          toast.update(dlToastIdRef.current, {
            type: "success",
            title: "Selesai",
            message: `Tersimpan di: ${p.path}`,
            duration: 6000,
            progress: 100,
            indeterminate: false,
          });
          dlToastIdRef.current = null;
        }
      } else if (p.phase === "error") {
        const msg = p.message || "Gagal mengunduh.";
        if (!dlToastIdRef.current) {
          toast.show({
            type: "error",
            title: "Gagal",
            message: msg,
            duration: 7000,
          });
        } else {
          toast.update(dlToastIdRef.current, {
            type: "error",
            title: "Gagal",
            message: msg,
            duration: 7000,
            indeterminate: false,
          });
          dlToastIdRef.current = null;
        }
      }
    });

    return () => {
      off && off();
    };
  }, [toast]);

  /* ---------- UI ---------- */
  return (
    <div className="grid">
      {/* Header + open modal */}
      <div
        className="card"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Riwayat Kesehatan</div>
          <div className="muted">Catat riwayat kesehatan per siswa</div>
        </div>
        <button className="btn" onClick={() => setOpen(true)}>
          + Input Riwayat
        </button>
      </div>

      {/* Toolbar list */}
      <div
        className="card"
        style={{ display: "flex", gap: 8, alignItems: "center" }}
      >
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
        <div style={{ marginLeft: "auto", color: "var(--muted)" }}>
          Total: {total}
        </div>
      </div>

      {/* Tabel history */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div
          className="table-wrap"
          style={{ maxHeight: "60vh", overflow: "auto" }}
        >
          <table className="table" style={{ width: "100%" }}>
            <thead
              style={{
                position: "sticky",
                top: 0,
                background: "var(--panel)",
                zIndex: 1,
              }}
            >
              <tr>
                <th style={{ textAlign: "left" }}>NOSIS</th>
                <th style={{ textAlign: "left" }}>Nama</th>
                <th style={{ textAlign: "left" }}>Judul</th>
                <th style={{ textAlign: "left" }}>Tanggal</th>
                <th style={{ textAlign: "left" }}>File</th>
                <th style={{ textAlign: "left" }}>Dibuat</th>
              </tr>
            </thead>
            <tbody>
              {loadingList ? (
                <tr>
                  <td colSpan={6} className="muted" style={{ padding: 12 }}>
                    Memuat…
                  </td>
                </tr>
              ) : list.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted" style={{ padding: 12 }}>
                    Tidak ada data.
                  </td>
                </tr>
              ) : (
                list.map((r) => (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{r.nosis ?? "-"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{r.nama ?? "-"}</td>
                    <td>{r.judul ?? "-"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {fmtDate(r.tanggal)}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {r.file_path ? (
                        <button
                          className="btn"
                          style={{ padding: "6px 10px" }}
                          onClick={async () => {
                            const url = buildDownloadUrl(r.file_path);

                            // cek file ada
                            if (!(await headOK(url))) {
                              toast.show({
                                type: "error",
                                title: "Gagal",
                                message: "File tidak ditemukan.",
                                duration: 5000,
                              });
                              return;
                            }

                            // mulai unduh via Electron (tanpa membuat toast awal)
                            if (window.electronAPI?.download) {
                              window.electronAPI.download(url);
                            } else {
                              // fallback browser
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = "";
                              document.body.appendChild(a);
                              a.click();
                              a.remove();
                              toast.show({
                                type: "success",
                                title: "Unduhan dimulai",
                                message: "Unduhan berjalan via browser.",
                                duration: 4000,
                              });
                            }
                          }}
                        >
                          Download
                        </button>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {fmtDate(r.created_at)}
                    </td>
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
          disabled={list.length < limit}
        >
          Next
        </button>
      </div>

      {/* Modal Form */}
      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          setOpenList(false);
        }}
        title="Input Riwayat Kesehatan"
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
                if (siswaId) setSiswaId(null);
              }}
              onFocus={() => {
                if (!siswaId && q.length >= 2) setOpenList(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpenList(false);
              }}
              autoComplete="off"
            />

            {/* Dropdown */}
            {openList && !siswaId && (
              <div
                ref={listRef}
                style={{
                  position: "absolute",
                  zIndex: 30,
                  left: 0,
                  right: 0,
                  marginTop: 6,
                  background: "var(--panel)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  boxShadow: "0 10px 20px rgba(0,0,0,.35)",
                  maxHeight: 280,
                  overflow: "auto",
                  color: "var(--text)",
                }}
              >
                <div
                  className="muted"
                  style={{
                    padding: "8px 10px",
                    borderBottom: "1px solid var(--border)",
                    background: "var(--panel-alt)",
                  }}
                >
                  {searching ? "Mencari..." : "Pilih dari daftar:"}
                </div>

                {filteredSug.length === 0 ? (
                  <div className="muted" style={{ padding: 10 }}>
                    {q.length < 2
                      ? "Ketik minimal 2 karakter."
                      : "Tidak ada hasil."}
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
                        background: "transparent",
                        border: 0,
                        borderBottom: "1px solid var(--border)",
                        cursor: "pointer",
                        color: "var(--text)",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background =
                          "var(--table-row-hover)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <div style={{ fontWeight: 700 }}>
                        {String(s.nosis || "-").padStart(4, "0")} — {s.nama}
                      </div>
                      <div className="muted" style={{ fontSize: 12 }}>
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
            placeholder="mis. Kontrol Rutin / Alergi…"
            value={judul}
            onChange={(e) => setJudul(e.target.value)}
          />
        </div>

        {/* Deskripsi */}
        <div style={{ marginTop: 10 }}>
          <label className="muted">Deskripsi</label>
          <textarea
            className="input"
            rows={3}
            placeholder="Tuliskan detail singkat"
            value={deskripsi}
            onChange={(e) => setDeskripsi(e.target.value)}
          />
        </div>

        {/* File */}
        <div style={{ marginTop: 10 }}>
          <label className="muted">Lampiran (opsional)</label>
          <input
            id="rkFileInput"
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          {file && (
            <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
              {file.name} — {(file.size / 1024).toFixed(1)} KB
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <button className="btn" disabled={saving} onClick={submit}>
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
          <button className="btn" onClick={resetForm} disabled={saving}>
            Reset
          </button>
        </div>
      </Modal>
    </div>
  );
}
