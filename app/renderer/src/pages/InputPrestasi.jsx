import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useToast } from "../components/Toaster";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

/* ======================= Utils ======================= */
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
          background: "var(--panel)",
          border: "1px solid var(--border)",
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
          <button type="button" className="btn" onClick={onClose}>
            Tutup
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ======================= Halaman ======================= */
export default function InputPrestasi() {
  const toast = useToast();

  /* ---------- state: history ---------- */
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [qHist, setQHist] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loadingList, setLoadingList] = useState(false);

  /* ---------- state: modal form ---------- */
  const [open, setOpen] = useState(false);

  const [siswaId, setSiswaId] = useState(null);
  const [query, setQuery] = useState(""); // "NOSIS — Nama"
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

  /* ---------- URL builder & fetchList ---------- */
  const buildListUrl = useCallback(
    (pageArg, qArg) => {
      const u = new URL(`${API}/prestasi`);
      if (qArg.trim()) u.searchParams.set("q", qArg.trim());
      u.searchParams.set("page", String(pageArg));
      u.searchParams.set("limit", String(limit));
      u.searchParams.set("sort_dir", "desc");
      return u.toString();
    },
    [limit]
  );

  const fetchList = useCallback(
    async (pageArg = page, qArg = qHist) => {
      setLoadingList(true);
      try {
        const token = await window.authAPI?.getToken?.();
        const r = await fetch(buildListUrl(pageArg, qArg), {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await r.json().catch(() => ({}));
        const arr = Array.isArray(data.items) ? data.items : [];
        setItems(arr);
        setTotal(data.total ?? 0);
        return arr.length;
      } catch {
        setItems([]);
        setTotal(0);
        return 0;
      } finally {
        setLoadingList(false);
      }
    },
    [page, qHist, buildListUrl]
  );

  useEffect(() => {
    fetchList(page, qHist);
  }, [page, qHist, fetchList]);

  /* ---------- search siswa (modal) ---------- */
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

  // Tutup dropdown pada klik di luar / Esc
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
    setQuery(`${s.nosis} — ${s.nama}`);
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
    if (!siswaId) {
      toast.error("Pilih siswa dari daftar terlebih dahulu.");
      return;
    }
    if (!judul.trim()) {
      toast.error("Judul wajib diisi.");
      return;
    }
    if (!tingkat.trim()) {
      toast.error("Tingkatan wajib diisi.");
      return;
    }

    let tId;
    try {
      setSaving(true);
      tId = toast.loading("Menyimpan prestasi…", { autoClose: false });

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
      let data = {};
      try {
        data = await res.json();
      } catch {}

      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);

      toast.update(tId, {
        type: "success",
        message: "Berhasil disimpan.",
        autoClose: 2000,
      });

      // refresh list dari page 1 SEKARANG
      setPage(1);
      await fetchList(1, qHist);

      // kosongkan sebagian field biar input beruntun
      setJudul("");
      setTingkat("");
      setDeskripsi("");
      setFile(null);
      const el = document.getElementById("prestasiFileInput");
      if (el) el.value = "";

      setTimeout(() => {
        setOpen(false);
        setOpenList(false);
      }, 400);
    } catch (e) {
      if (tId) {
        toast.update(tId, {
          type: "error",
          message: `Gagal: ${e.message}`,
          autoClose: 5000,
        });
      } else {
        toast.error(`Gagal: ${e.message}`, { autoClose: 5000 });
      }
    } finally {
      setSaving(false);
    }
  }

  /* ---------- hapus ---------- */
  async function handleDelete(row) {
    if (!row?.id) return;
    const ok = confirm(`Hapus data prestasi "${row.judul || "-"}"?`);
    if (!ok) return;

    let tId;
    try {
      tId = toast.loading("Menghapus…", { autoClose: false });
      const token = await window.authAPI?.getToken?.();
      const r = await fetch(`${API}/prestasi/${row.id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      let data = {};
      try {
        data = await r.json();
      } catch {}
      if (!r.ok) throw new Error(data.message || `HTTP ${r.status}`);

      // refetch current page
      const len = await fetchList(page, qHist);
      // kalau page jadi kosong & page > 1 → mundur 1, refetch
      if (len === 0 && page > 1) {
        setPage((p) => p - 1);
        await fetchList(page - 1, qHist);
      }

      toast.update(tId, {
        type: "success",
        message: "Berhasil dihapus.",
        autoClose: 1800,
      });
    } catch (e) {
      if (tId) {
        toast.update(tId, {
          type: "error",
          message: `Gagal menghapus: ${e.message}`,
          autoClose: 5000,
        });
      } else {
        toast.error(`Gagal menghapus: ${e.message}`, { autoClose: 5000 });
      }
    }
  }

  /* ---------- toaster progres unduhan (Electron) ---------- */
  useEffect(() => {
    const off = window.electronAPI?.onDownloadStatus?.((p) => {
      if (!p || p.type !== "download") return;

      if (!InputPrestasi._dlToastId && p.phase === "start") {
        InputPrestasi._dlToastId = toast.loading("Menyiapkan file…", {
          autoClose: false,
        });
        return;
      }

      const id = InputPrestasi._dlToastId;
      if (!id) return;

      if (p.phase === "progress") {
        const pct = p.total
          ? Math.min(100, Math.round((p.received / p.total) * 100))
          : null;
        toast.update(id, {
          type: "loading",
          message:
            pct != null
              ? `Mengunduh… ${pct}% (${p.received} / ${p.total} bytes)`
              : `Mengunduh… ${p.received} bytes`,
          progress: pct ?? undefined,
          autoClose: false,
        });
      } else if (p.phase === "done") {
        toast.update(id, {
          type: "success",
          message: `Selesai. Tersimpan di: ${p.path}`,
          autoClose: 6000,
        });
        InputPrestasi._dlToastId = null;
      } else if (p.phase === "error") {
        toast.update(id, {
          type: "error",
          message: `Gagal mengunduh: ${p.message}`,
          autoClose: 7000,
        });
        InputPrestasi._dlToastId = null;
      }
    });

    return () => {
      off && off();
    };
  }, [toast]);

  /* ---------- UI ---------- */
  return (
    <div className="grid">
      {/* Header + button */}
      <div
        className="card"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Input Prestasi</div>
          <div className="muted">
            Catat prestasi per-siswa, lampiran opsional.
          </div>
        </div>
        <button type="button" className="btn" onClick={() => setOpen(true)}>
          + Input Prestasi
        </button>
      </div>

      {/* Toolbar kecil list */}
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
                <th style={{ textAlign: "left" }}>Tingkat</th>
                <th style={{ textAlign: "left" }}>Tanggal</th>
                <th style={{ textAlign: "left" }}>File</th>
                <th style={{ textAlign: "left" }}>Dibuat</th>
                <th style={{ textAlign: "left" }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loadingList ? (
                <tr>
                  <td colSpan={8} className="muted" style={{ padding: 12 }}>
                    Memuat…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="muted" style={{ padding: 12 }}>
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
                    <td style={{ whiteSpace: "nowrap" }}>
                      {fmtDate(r.tanggal)}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {r.file_path ? (
                        <button
                          type="button"
                          className="btn"
                          style={{ padding: "6px 10px" }}
                          onClick={async () => {
                            const url = buildDownloadUrl(r.file_path);
                            const ok = await tryHead(url);
                            if (!ok) {
                              toast.error("File tidak ditemukan.", {
                                autoClose: 5000,
                              });
                              return;
                            }
                            if (window.electronAPI?.download) {
                              window.electronAPI.download(url);
                              if (!InputPrestasi._dlToastId) {
                                InputPrestasi._dlToastId = toast.loading(
                                  "Menyiapkan file…",
                                  {
                                    autoClose: false,
                                  }
                                );
                              }
                            } else {
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = "";
                              document.body.appendChild(a);
                              a.click();
                              a.remove();
                              toast.success("Unduhan dimulai (browser).", {
                                autoClose: 4000,
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
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button
                        type="button"
                        className="btn"
                        style={{
                          background: "#1b0c0c",
                          border: "1px solid #7f1d1d",
                          color: "#fca5a5",
                          padding: "6px 10px",
                        }}
                        onClick={() => handleDelete(r)}
                      >
                        Hapus
                      </button>
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
          type="button"
          className="btn"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
        >
          Prev
        </button>
        <span className="badge">Page {page}</span>
        <button
          type="button"
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
          setOpenList(false);
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

            {/* Dropdown – hanya muncul saat BELUM memilih siswa */}
            {openList && !siswaId && q.length >= 2 && (
              <div
                ref={listRef}
                style={{
                  position: "absolute",
                  zIndex: 30,
                  left: 0,
                  right: 0,
                  marginTop: 6,
                  background: "var(--panel)",
                  border: "1px solid " + "var(--border)",
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
                        {s.nosis ?? "-"} — {s.nama || "-"}
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
          <button
            type="button"
            className="btn"
            disabled={saving}
            onClick={submit}
          >
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
          <button
            type="button"
            className="btn"
            onClick={clearForm}
            disabled={saving}
          >
            Reset
          </button>
        </div>
      </Modal>
    </div>
  );
}

InputPrestasi._dlToastId = null;
