import { useEffect, useMemo, useRef, useState } from "react";
import { fetchSiswa } from "../api/siswa";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // hapus diakritik
    .replace(/\s+/g, ""); // hapus spasi
}

export default function UploadPdf({ kind }) {
  const title = useMemo(
    () => (kind === "bk" ? "Upload BK (PDF)" : "Upload Pelanggaran (PDF)"),
    [kind]
  );

  const [query, setQuery] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [judul, setJudul] = useState("");
  const [file, setFile] = useState(null);

  // kandidat & pilihan
  const [items, setItems] = useState([]); // hasil fetch (mentah)
  const [openList, setOpenList] = useState(false);
  const [selected, setSelected] = useState(null); // {id, nosis, nama, nik}

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const boxRef = useRef(null);
  const timerRef = useRef(null);

  // Filter ketat di sisi client (ILike nosis/nama)
  const filtered = useMemo(() => {
    const q = norm(query);
    if (!q || q.length < 2) return [];
    const arr = Array.isArray(items) ? items : [];
    return arr
      .filter((it) => {
        const a = norm(it.nosis);
        const b = norm(it.nama);
        return a.includes(q) || b.includes(q);
      })
      .slice(0, 20);
  }, [items, query]);

  // Debounced fetch saat query berubah
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const q = query.trim();
    if (q.length < 2) {
      setItems([]);
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
  }, [query]);

  // Tutup dropdown ketika klik di luar
  useEffect(() => {
    function onDocClick(e) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target)) setOpenList(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function onPick(it) {
    setSelected(it); // simpan {id, nosis, nama, nik}
    setQuery(`${it.nosis} — ${it.nama}`);
    setOpenList(false);
  }

  async function submit() {
    setMsg("");
    if (!selected?.id) {
      setMsg("Silakan pilih siswa dari daftar.");
      return;
    }
    if (!judul.trim() || !file) {
      setMsg("Lengkapi Judul dan File.");
      return;
    }
    if (file.type !== "application/pdf") {
      setMsg("File harus PDF.");
      return;
    }

    try {
      setLoading(true);
      const token = await window.authAPI?.getToken?.();
      const form = new FormData();
      form.append("file", file);
      form.append("siswa_id", String(selected.id)); // <- pakai siswa_id!
      form.append("judul", judul.trim());
      form.append("tanggal", date);

      const res = await fetch(`${API}/upload/${kind}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Gagal upload");

      setMsg(`Berhasil diunggah untuk ${selected.nosis} — ${selected.nama}.`);
      setFile(null);
      const inp = document.getElementById("pdfInput");
      if (inp) inp.value = "";
    } catch (e) {
      setMsg(`Gagal: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  function back() {
    window.location.hash = "#/import";
  }

  return (
    <div className="grid">
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
        <button className="btn" onClick={back}>
          Kembali
        </button>
      </div>

      <div className="card">
        <div className="grid grid-2">
          {/* Input pencarian */}
          <div ref={boxRef} style={{ position: "relative" }}>
            <label className="muted">Cari NOSIS / Nama</label>
            <input
              className="input"
              placeholder="Ketik NOSIS atau nama (min. 2 huruf) lalu pilih"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(null);
                setOpenList(true);
              }}
              onFocus={() => query.trim().length >= 2 && setOpenList(true)}
            />
            {/* Dropdown */}
            {openList && query.trim().length >= 2 && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: "100%",
                  marginTop: 6,
                  maxHeight: 300,
                  overflow: "auto",
                  background: "#111827", // ⬅ bukan hitam; abu navy
                  border: "1px solid #334155", // ⬅ border lebih terang
                  borderRadius: 12,
                  padding: 8,
                  zIndex: 20,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.25)", // sedikit elevasi
                }}
              >
                <div
                  className="muted"
                  style={{ padding: "6px 10px", color: "#cbd5e1" }} // teks lebih jelas
                >
                  Ketik <b>NOSIS</b> atau nama (min. 2 huruf), lalu pilih dari
                  daftar.
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
                        background: "#0f1424", // kartu item bukan hitam
                        color: "#e5e7eb",
                        border: "1px solid #334155",
                        borderRadius: 10,
                        marginBottom: 8,
                        cursor: "pointer",
                        transition: "background .15s, border-color .15s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#1f2937"; // hover lebih terang
                        e.currentTarget.style.borderColor = "#475569";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "#0f1424";
                        e.currentTarget.style.borderColor = "#334155";
                      }}
                    >
                      <div style={{ fontWeight: 800 }}>
                        {String(it.nosis || "-").padStart(4, "0")} —{" "}
                        {it.nama || "-"}
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

          {/* Tanggal */}
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

        {/* Judul */}
        <div style={{ marginTop: 10 }}>
          <label className="muted">Judul</label>
          <input
            className="input"
            placeholder="Judul dokumen"
            value={judul}
            onChange={(e) => setJudul(e.target.value)}
          />
        </div>

        {/* File */}
        <div style={{ marginTop: 10 }}>
          <label className="muted">File PDF</label>
          <input
            id="pdfInput"
            type="file"
            accept="application/pdf"
            onChange={(e) => setFile(e.target.files[0] || null)}
          />
        </div>

        {/* Info pilihan */}
        {selected?.id && (
          <div className="muted" style={{ marginTop: 8 }}>
            Akan diupload untuk: <b>{selected.nosis}</b> — {selected.nama} (ID:{" "}
            {selected.id})
          </div>
        )}

        {/* Pesan */}
        {msg && (
          <div
            style={{
              marginTop: 10,
              color: msg.startsWith("Berhasil") ? "#86efac" : "#fca5a5",
            }}
          >
            {msg}
          </div>
        )}

        {/* Tombol */}
        <div style={{ marginTop: 12 }}>
          <button className="btn" disabled={loading} onClick={submit}>
            {loading ? "Mengunggah..." : "Unggah"}
          </button>
        </div>
      </div>
    </div>
  );
}
