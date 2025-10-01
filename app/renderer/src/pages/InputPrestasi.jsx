import { useEffect, useMemo, useRef, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function InputPrestasi() {
  // form state
  const [query, setQuery] = useState("");
  const [selectedSiswa, setSelectedSiswa] = useState(null); // {id, nosis, nama, nik}
  const [judul, setJudul] = useState("");
  const [tingkat, setTingkat] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [tanggal, setTanggal] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [file, setFile] = useState(null);

  // ui state
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [openList, setOpenList] = useState(false);
  const [searching, setSearching] = useState(false);
  const [items, setItems] = useState([]); // hasil pencarian siswa

  const inputRef = useRef(null);
  const listRef = useRef(null);
  const q = useMemo(() => query.trim(), [query]);

  // debounce pencarian
  useEffect(() => {
    let stop = false;
    const min = q.length >= 2;
    if (!min) {
      setItems([]);
      return;
    }
    (async () => {
      try {
        setSearching(true);
        const token = await window.authAPI?.getToken?.();
        const url = new URL(`${API}/siswa`);
        url.searchParams.set("q", q);
        url.searchParams.set("limit", "20");
        url.searchParams.set("page", "1");
        const res = await fetch(url.toString(), {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json().catch(() => ({}));
        if (!stop) {
          const arr = Array.isArray(data.items) ? data.items : [];
          setItems(
            arr.map((s) => ({
              id: s.id,
              nosis: s.nosis,
              nama: s.nama,
              nik: s.nik,
            }))
          );
          setOpenList(true);
        }
      } catch (e) {
        if (!stop) setItems([]);
      } finally {
        if (!stop) setSearching(false);
      }
    })();
    return () => {
      stop = true;
    };
  }, [q]);

  function pickSiswa(s) {
    setSelectedSiswa(s);
    setQuery(`${s.nosis} — ${s.nama}`);
    setOpenList(false);
  }

  function clearSiswa() {
    setSelectedSiswa(null);
    setQuery("");
    inputRef.current?.focus();
  }

  async function submit() {
    setMsg("");

    if (!selectedSiswa?.id) {
      setMsg("Pilih siswa dari daftar terlebih dahulu.");
      return;
    }
    if (!judul.trim()) {
      setMsg("Judul wajib diisi.");
      return;
    }
    if (!tingkat.trim()) {
      setMsg("Tingkatan wajib diisi.");
      return;
    }
    // file opsional; jika wajib, tambahkan validasi di sini.

    try {
      setLoading(true);
      const token = await window.authAPI?.getToken?.();
      const form = new FormData();
      form.append("siswa_id", String(selectedSiswa.id));
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

      setMsg("Berhasil disimpan.");
      // reset sebagian field (jaga pilihan siswa tetap)
      setJudul("");
      setTingkat("");
      setDeskripsi("");
      setFile(null);
      const el = document.getElementById("prestasiFileInput");
      if (el) el.value = "";
    } catch (e) {
      setMsg(`Gagal: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  function back() {
    window.location.hash = "#/import";
  }

  // tutup dropdown saat klik di luar
  useEffect(() => {
    function onDocClick(e) {
      const inInput = inputRef.current?.contains?.(e.target);
      const inList = listRef.current?.contains?.(e.target);
      if (!inInput && !inList) setOpenList(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

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
          <div style={{ fontWeight: 800, fontSize: 18 }}>Input Prestasi</div>
          <div className="muted">
            Masukkan prestasi per siswa (bisa lampirkan file apa saja)
          </div>
        </div>
        <button className="btn" onClick={back}>
          Kembali
        </button>
      </div>

      <div className="card">
        {/* Siswa & Tanggal */}
        <div className="grid grid-2" style={{ position: "relative", gap: 12 }}>
          <div style={{ position: "relative" }}>
            <label className="muted">Cari NOSIS / Nama</label>
            <input
              ref={inputRef}
              className="input"
              placeholder="Ketik NOSIS (mis. 0123) atau Nama (min. 2 huruf)"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedSiswa(null);
              }}
              onFocus={() => q.length >= 2 && setOpenList(true)}
              autoComplete="off"
            />
            {selectedSiswa && (
              <div
                className="muted"
                style={{
                  marginTop: 6,
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                }}
              >
                <span>
                  Terpilih: <b>{selectedSiswa.nosis}</b> — {selectedSiswa.nama}{" "}
                  {selectedSiswa.nik ? (
                    <span style={{ color: "#64748b" }}>
                      (NIK {selectedSiswa.nik})
                    </span>
                  ) : null}
                </span>
                <button
                  className="btn"
                  style={{ padding: "4px 8px" }}
                  onClick={clearSiswa}
                >
                  Ganti
                </button>
              </div>
            )}

            {/* Dropdown hasil pencarian */}
            {/* Dropdown hasil pencarian */}
            {openList && (
              <div
                ref={listRef}
                style={{
                  position: "absolute",
                  zIndex: 30,
                  left: 0,
                  right: 0,
                  marginTop: 6,
                  // ⬇⬇ WAS: background: "#0f1424", border: "#334155"
                  background: "#1e293b", // slate-800 (lebih terang, tidak hitam)
                  border: "1px solid #475569", // slate-600
                  borderRadius: 10,
                  boxShadow: "0 10px 20px rgba(0,0,0,.35)",
                  maxHeight: 280,
                  overflow: "auto",
                  color: "#e2e8f0", // teks terang
                }}
              >
                <div
                  className="muted"
                  style={{
                    padding: "8px 10px",
                    borderBottom: "1px solid #334155", // slate-700
                    color: "#cbd5e1", // slate-300
                    background: "#243447", // sedikit kontras header
                  }}
                >
                  {searching ? "Mencari..." : "Pilih dari daftar:"}
                </div>

                {items.length === 0 ? (
                  <div
                    className="muted"
                    style={{ padding: "10px", color: "#cbd5e1" }}
                  >
                    {q.length < 2
                      ? "Ketik minimal 2 karakter."
                      : "Tidak ada hasil."}
                  </div>
                ) : (
                  items.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => pickSiswa(s)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "10px 12px",
                        border: 0,
                        // ⬇⬇ WAS: background: "transparent", borderBottom: "#111827"
                        background: "#1f2a3a", // slate-850-ish
                        borderBottom: "1px solid #334155",
                        cursor: "pointer",
                        color: "#e5e7eb",
                      }}
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "#2b3a55")
                      } // hover: sedikit lebih terang
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "#1f2a3a")
                      }
                    >
                      <div style={{ fontWeight: 700 }}>
                        {s.nosis?.padStart(4, "0")} — {s.nama}
                      </div>
                      <div
                        className="muted"
                        style={{ fontSize: 12, color: "#cbd5e1" }}
                      >
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
            placeholder="Mis. Kabupaten / Provinsi / Nasional / Internasional"
            value={tingkat}
            onChange={(e) => setTingkat(e.target.value)}
          />
        </div>

        {/* Deskripsi / Catatan */}
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

        {/* File bebas */}
        <div style={{ marginTop: 10 }}>
          <label className="muted">Lampiran (opsional, file bebas)</label>
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

        {/* Pesan */}
        {msg && (
          <div
            style={{
              marginTop: 10,
              color: msg.startsWith("Berhasil") ? "#86efac" : "#fca5a5",
              whiteSpace: "pre-line",
            }}
          >
            {msg}
          </div>
        )}

        {/* Tombol */}
        <div style={{ marginTop: 12 }}>
          <button className="btn" disabled={loading} onClick={submit}>
            {loading ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}
