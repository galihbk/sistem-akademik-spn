// renderer/src/pages/UploadPdf.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { fetchSiswa } from "../api/siswa";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "");
}

function Modal({ open, title, onClose, children, width = 720 }) {
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
        zIndex: 1000,
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: width,
          background: "#0b1220",
          border: "1px solid #1f2937",
          borderRadius: 14,
          padding: 0,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "12px 14px",
            borderBottom: "1px solid #1f2937",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
          }}
        >
          <div style={{ fontWeight: 800 }}>{title}</div>
          <button className="btn" onClick={onClose}>
            Tutup
          </button>
        </div>
        <div style={{ padding: 14 }}>{children}</div>
      </div>
    </div>
  );
}

export default function UploadPdf({ kind }) {
  const isBK = kind === "bk";
  const title = isBK ? "Upload BK (PDF)" : "Upload Pelanggaran (PDF)";

  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // form (modal)
  const [query, setQuery] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [judul, setJudul] = useState("");
  const [file, setFile] = useState(null);
  const [selected, setSelected] = useState(null);

  // dropdown siswa
  const [items, setItems] = useState([]);
  const [openList, setOpenList] = useState(false);
  const boxRef = useRef(null);
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  // history
  const [history, setHistory] = useState([]);
  const [histLoading, setHistLoading] = useState(false);

  // alerts (di atas tabel)
  const [alert, setAlert] = useState({ type: "", text: "" }); // "success" | "danger" | ""

  // ===== filtered siswa (client) =====
  const filtered = useMemo(() => {
    const q = norm(query);
    if (!q || q.length < 2) return [];
    return (items || [])
      .filter((it) => norm(it.nosis).includes(q) || norm(it.nama).includes(q))
      .slice(0, 20);
  }, [items, query]);

  // debounce fetch siswa (dengan guard jika query=label selected)
  useEffect(() => {
    if (!open) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    const q = query.trim();
    const selectedLabel = selected
      ? `${selected.nosis} — ${selected.nama}`
      : "";

    // jika pendek atau sama dengan label pilihan -> jangan fetch & tutup popover
    if (q.length < 2 || (selected?.id && norm(q) === norm(selectedLabel))) {
      setItems([]);
      setOpenList(false);
      return;
    }

    timerRef.current = setTimeout(async () => {
      try {
        const token = await window.authAPI?.getToken?.();
        const data = await fetchSiswa({ q, page: 1, limit: 50 }, token);
        setItems(Array.isArray(data.items) ? data.items : []);
        setOpenList(true);
      } catch (e) {
        console.error("[UploadPdf] fetchSiswa:", e);
      }
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [query, open, selected]);

  // close dropdown on outside click
  useEffect(() => {
    function onDocClick(e) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target)) setOpenList(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // ====== HISTORY (pakai endpoint /bk atau /pelanggaran) ======
  async function loadHistory() {
    try {
      setHistLoading(true);
      const token = await window.authAPI?.getToken?.();
      const u = new URL(`${API}/${isBK ? "bk" : "pelanggaran"}`);
      u.searchParams.set("page", "1");
      u.searchParams.set("limit", "20");
      u.searchParams.set("sort_dir", "desc");
      const r = await fetch(u.toString(), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await r.json().catch(() => ({}));
      const arr = Array.isArray(data.items)
        ? data.items
        : Array.isArray(data)
        ? data
        : [];
      setHistory(arr);
    } catch (e) {
      console.error("[UploadPdf] loadHistory:", e);
      setHistory([]);
      setAlert({ type: "danger", text: "Gagal memuat riwayat." });
    } finally {
      setHistLoading(false);
    }
  }
  useEffect(() => {
    loadHistory();
  }, [kind]);

  // ====== actions ======
  function onPick(it) {
    setSelected(it);
    setQuery(`${it.nosis} — ${it.nama}`);
    setOpenList(false);
    setItems([]); // kosongkan list agar popover tak muncul lagi
    inputRef.current?.blur(); // tutup via blur
  }

  async function submit() {
    setAlert({ type: "", text: "" });

    if (!selected?.id) {
      setAlert({ type: "danger", text: "Silakan pilih siswa dari daftar." });
      return;
    }
    if (!judul.trim() || !file) {
      setAlert({ type: "danger", text: "Lengkapi Judul dan File." });
      return;
    }
    if (file.type !== "application/pdf") {
      setAlert({ type: "danger", text: "File harus PDF." });
      return;
    }

    try {
      setUploading(true);
      const token = await window.authAPI?.getToken?.();
      const form = new FormData();
      form.append("file", file);
      form.append("siswa_id", String(selected.id));
      form.append("judul", judul.trim());
      form.append("tanggal", date);

      const res = await fetch(`${API}/upload/${isBK ? "bk" : "pelanggaran"}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Gagal upload");

      // reset form & close
      setFile(null);
      const fileEl = document.getElementById("pdfInput");
      if (fileEl) fileEl.value = "";
      setSelected(null);
      setJudul("");
      setQuery("");
      setOpen(false);

      setAlert({ type: "success", text: "Berhasil mengunggah dokumen." });
      await loadHistory();
    } catch (e) {
      setAlert({ type: "danger", text: `Gagal mengunggah: ${e.message}` });
    } finally {
      setUploading(false);
    }
  }

  function handleDownload(filePath) {
    if (!filePath) return;
    const clean = String(filePath)
      .replace(/^\/+/, "")
      .replace(/^uploads\//i, "");
    const url = `${API}/download?path=${encodeURIComponent(clean)}`;
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
  }

  async function handleDelete(row) {
    if (!row?.id) return;
    const ok = confirm(`Hapus "${row.judul || "-"}"?`);
    if (!ok) return;
    try {
      const token = await window.authAPI?.getToken?.();
      const r = await fetch(`${API}/${isBK ? "bk" : "pelanggaran"}/${row.id}`, {
        method: "DELETE",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        throw new Error(t || `HTTP ${r.status}`);
      }
      setAlert({ type: "success", text: "Berhasil menghapus dokumen." });
      await loadHistory();
    } catch (e) {
      setAlert({ type: "danger", text: `Gagal menghapus: ${e.message}` });
    }
  }

  function back() {
    window.location.hash = "#/import";
  }

  // ====== render ======
  return (
    <div className="grid">
      {/* Header */}
      <div
        className="card"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>{title}</div>
          <div className="muted">Lampirkan file PDF sesuai siswa</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => setOpen(true)}>
            + Upload PDF
          </button>
        </div>
      </div>

      {/* History + ALERTS di atas tabel */}
      <div className="card" style={{ padding: 0 }}>
        <div
          style={{
            padding: 12,
            borderBottom: "1px solid #1f2937",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontWeight: 700 }}>Riwayat Terbaru</div>
        </div>

        {/* ALERT BANNER */}
        {alert.type && (
          <div
            role="status"
            style={{
              margin: 12,
              padding: "8px 12px",
              borderRadius: 10,
              border: `1px solid ${
                alert.type === "success" ? "#14532d" : "#7f1d1d"
              }`,
              background: alert.type === "success" ? "#0b2e1a" : "#1b0c0c",
              color: alert.type === "success" ? "#86efac" : "#fca5a5",
            }}
          >
            {alert.text}
          </div>
        )}

        <div style={{ overflowX: "auto", padding: 12 }}>
          <table className="table" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", whiteSpace: "nowrap" }}>
                  Judul
                </th>
                <th style={{ textAlign: "left", whiteSpace: "nowrap" }}>
                  NOSIS
                </th>
                <th style={{ textAlign: "left", whiteSpace: "nowrap" }}>
                  Nama
                </th>
                <th style={{ textAlign: "left", whiteSpace: "nowrap" }}>
                  Tanggal
                </th>
                <th style={{ textAlign: "left", whiteSpace: "nowrap" }}>
                  File
                </th>
                <th style={{ textAlign: "left", whiteSpace: "nowrap" }}>
                  Dibuat
                </th>
                <th style={{ textAlign: "left", whiteSpace: "nowrap" }}>
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={7} className="muted" style={{ padding: 12 }}>
                    Belum ada data.
                  </td>
                </tr>
              ) : (
                history.map((r) => (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{r.judul ?? "-"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{r.nosis ?? "-"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>{r.nama ?? "-"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {r.tanggal
                        ? new Date(r.tanggal).toLocaleDateString("id-ID")
                        : "-"}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {r.file_path ? (
                        <button
                          className="btn"
                          onClick={() => handleDownload(r.file_path)}
                          style={{ padding: "6px 10px" }}
                        >
                          Download
                        </button>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {r.created_at
                        ? new Date(r.created_at).toLocaleString("id-ID")
                        : "-"}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button
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

      {/* Modal Upload */}
      <Modal
        open={open}
        title={title}
        onClose={() => setOpen(false)}
        width={780}
      >
        <div className="grid grid-2">
          <div ref={boxRef} style={{ position: "relative" }}>
            <label className="muted">Cari NOSIS / Nama</label>
            <input
              ref={inputRef}
              className="input"
              placeholder="Ketik NOSIS atau nama (min. 2 huruf) lalu pilih"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(null);
                setOpenList(true);
              }}
              onFocus={() => {
                const label = selected
                  ? `${selected.nosis} — ${selected.nama}`
                  : "";
                if (query.trim().length >= 2 && norm(query) !== norm(label)) {
                  setOpenList(true);
                }
              }}
            />
            {openList &&
              query.trim().length >= 2 &&
              !(
                selected?.id &&
                norm(query) === norm(`${selected.nosis} — ${selected.nama}`)
              ) && (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    top: "100%",
                    marginTop: 6,
                    maxHeight: 300,
                    overflow: "auto",
                    background: "#111827",
                    border: "1px solid #334155",
                    borderRadius: 12,
                    padding: 8,
                    zIndex: 1010,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
                  }}
                >
                  <div
                    className="muted"
                    style={{ padding: "6px 10px", color: "#cbd5e1" }}
                  >
                    Ketik <b>NOSIS</b> atau nama, lalu pilih dari daftar.
                  </div>

                  {filtered.length === 0 ? (
                    <div
                      className="muted"
                      style={{ padding: "8px 10px", color: "#cbd5e1" }}
                    >
                      Tidak ada hasil untuk <b>{query}</b>.
                    </div>
                  ) : (
                    filtered.map((it) => (
                      <button
                        key={it.id}
                        type="button"
                        onClick={() => onPick(it)}
                        style={{
                          display: "block",
                          width: "100%",
                          textAlign: "left",
                          padding: "10px 12px",
                          background: "#0f1424",
                          color: "#e5e7eb",
                          border: "1px solid #334155",
                          borderRadius: 10,
                          marginBottom: 8,
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#1f2937";
                          e.currentTarget.style.borderColor = "#475569";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#0f1424";
                          e.currentTarget.style.borderColor = "#334155";
                        }}
                      >
                        <div style={{ fontWeight: 800 }}>
                          {it.nosis ?? "-"} — {it.nama || "-"}
                        </div>
                        <div style={{ color: "#94a3b8", fontSize: 12 }}>
                          NIK {it.nik || "-"}
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
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          <label className="muted">Judul</label>
          <input
            className="input"
            placeholder="Judul dokumen"
            value={judul}
            onChange={(e) => setJudul(e.target.value)}
          />
        </div>

        <div style={{ marginTop: 10 }}>
          <label className="muted">File PDF</label>
          <input
            id="pdfInput"
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files[0] || null)}
          />
        </div>

        <div
          style={{
            marginTop: 12,
            display: "flex",
            gap: 8,
            justifyContent: "flex-end",
          }}
        >
          <button className="btn" onClick={() => setOpen(false)}>
            Batal
          </button>
          <button className="btn" onClick={submit} disabled={uploading}>
            {uploading ? "Mengunggah…" : "Unggah"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
