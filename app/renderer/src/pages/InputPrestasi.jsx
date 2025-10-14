import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "../components/Toaster";

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
  const { toast } = useToast();

  /* ---------- state: history ---------- */
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [qHist, setQHist] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loadingList, setLoadingList] = useState(false);

  /* ---------- state: modal form ---------- */
  const [open, setOpen] = useState(false);

  const [siswaId, setSiswaId] = useState(null); // pakai ID
  const [query, setQuery] = useState(""); // tampilan teks (NOSIS — Nama)
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

  // helper untuk tutup modal setelah delay
  const closeAfter = (ms = 900) => {
    setTimeout(() => {
      setOpen(false);
      setOpenList(false);
    }, ms);
  };

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
    // validasi → toast error
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
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Gagal menyimpan prestasi");

      toast.update(tId, {
        type: "success",
        message: "Berhasil disimpan.",
        autoClose: 2500,
      });

      // refresh list dari page 1
      setPage(1);
      // kosongkan field selain siswa agar input beruntun
      setJudul("");
      setTingkat("");
      setDeskripsi("");
      setFile(null);
      const el = document.getElementById("prestasiFileInput");
      if (el) el.value = "";

      closeAfter(600); // tutup modal agak cepat
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

  /* ---------- toaster untuk progres unduhan (Electron) ---------- */
  useEffect(() => {
    // Dengarkan proses unduhan global
    const off = window.electronAPI?.onDownloadStatus?.((p) => {
      if (!p || p.type !== "download") return;

      // simpan id toast pada closure
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <button className="btn" onClick={() => setOpen(true)}>
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

                            // periksa file ada
                            const ok = await tryHead(url);
                            if (!ok) {
                              toast.error("File tidak ditemukan.", {
                                autoClose: 5000,
                              });
                              return;
                            }

                            // Mulai unduh (IPC Electron → akan update progres lewat onDownloadStatus)
                            if (window.electronAPI?.download) {
                              window.electronAPI.download(url);
                              // munculkan toast awal jika plugin progres belum sempat kirim 'start'
                              if (!InputPrestasi._dlToastId) {
                                InputPrestasi._dlToastId = toast.loading(
                                  "Menyiapkan file…",
                                  {
                                    autoClose: false,
                                  }
                                );
                              }
                            } else {
                              // fallback browser
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
          setOpenList(false); // penting: tutup dropdown saat modal ditutup
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

// simpan id toast unduhan pada fungsi (static properti)
InputPrestasi._dlToastId = null;
