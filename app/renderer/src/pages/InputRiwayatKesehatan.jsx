import { useEffect, useMemo, useRef, useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function InputRiwayatKesehatan() {
  // form state
  const [siswaId, setSiswaId] = useState(null);
  const [q, setQ] = useState("");
  const [judul, setJudul] = useState("");
  const [deskripsi, setDeskripsi] = useState("");
  const [tanggal, setTanggal] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [file, setFile] = useState(null);

  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // autocomplete state
  const [openList, setOpenList] = useState(false);
  const [items, setItems] = useState([]);
  const [searching, setSearching] = useState(false);
  const listRef = useRef(null);
  const debounceRef = useRef(null);

  // --- cari siswa (debounced) ---
  useEffect(() => {
    const val = String(q || "").trim();

    // jika sudah memilih, jangan cari lagi
    if (siswaId) return;

    // clear debounce
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (val.length < 2) {
      setItems([]);
      setOpenList(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      let alive = true;
      setSearching(true);
      try {
        const token = await window.authAPI?.getToken?.();
        const url = new URL(`${API}/siswa`);
        url.searchParams.set("q", val);
        url.searchParams.set("page", "1");
        url.searchParams.set("limit", "20");
        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || "Gagal cari siswa");
        if (alive) {
          setItems(Array.isArray(data.items) ? data.items : []);
          setOpenList(true);
        }
      } catch {
        setItems([]);
        setOpenList(true);
      } finally {
        setSearching(false);
      }
      return () => {
        alive = false;
      };
    }, 250); // debounce 250ms
  }, [q, siswaId]);

  // --- tutup list saat klik di luar ---
  useEffect(() => {
    function onDocClick(e) {
      if (!listRef.current) return;
      if (!listRef.current.parentElement?.contains(e.target))
        setOpenList(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function pickSiswa(s) {
    setSiswaId(s.id);
    setQ(`${(s.nosis || "").toString().padStart(4, "0")} — ${s.nama}`);
    setOpenList(false);
  }

  function resetPick() {
    setSiswaId(null);
    setQ("");
    setItems([]);
    setOpenList(false);
  }

  async function submit() {
    setMsg("");
    if (!siswaId || !judul.trim() || !deskripsi.trim()) {
      setMsg("Lengkapi siswa, Judul, dan Deskripsi.");
      return;
    }
    try {
      setLoading(true);
      const token = await window.authAPI.getToken();

      const form = new FormData();
      form.append("siswa_id", String(siswaId));
      form.append("judul", judul.trim());
      form.append("deskripsi", deskripsi.trim());
      form.append("tanggal", tanggal || "");
      if (file) form.append("file", file); // lampiran opsional

      const res = await fetch(`${API}/riwayat_kesehatan`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal simpan");

      setMsg("Berhasil disimpan.");
      setJudul("");
      setDeskripsi("");
      setFile(null);
      const el = document.getElementById("rkFileInput");
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
          <div style={{ fontWeight: 800, fontSize: 18 }}>
            Input Riwayat Kesehatan
          </div>
          <div className="muted">Catat riwayat kesehatan per siswa</div>
        </div>
        <button className="btn" onClick={back}>
          Kembali
        </button>
      </div>

      <div className="card">
        <div className="grid grid-2">
          <div style={{ position: "relative" }}>
            <label className="muted">Cari NOSIS / Nama</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="input"
                placeholder="mis. 0123 / Achmad…"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setSiswaId(null);
                }}
                onFocus={() => {
                  if (items.length) setOpenList(true);
                }}
              />
              {siswaId && (
                <button
                  className="btn"
                  type="button"
                  onClick={resetPick}
                  title="Ganti siswa"
                >
                  Ganti
                </button>
              )}
            </div>

            {/* Dropdown hasil pencarian (tema lebih terang) */}
            {openList && (
              <div
                ref={listRef}
                style={{
                  position: "absolute",
                  zIndex: 30,
                  left: 0,
                  right: 0,
                  marginTop: 6,
                  background: "#1e293b", // slate-800
                  border: "1px solid #475569", // slate-600
                  borderRadius: 10,
                  boxShadow: "0 10px 20px rgba(0,0,0,.35)",
                  maxHeight: 300,
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

                {!searching && items.length === 0 ? (
                  <div
                    className="muted"
                    style={{ padding: "10px", color: "#cbd5e1" }}
                  >
                    {q.trim().length < 2
                      ? "Ketik minimal 2 karakter."
                      : "Tidak ada hasil."}
                  </div>
                ) : (
                  items.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => pickSiswa(s)}
                      onMouseDown={(e) => e.preventDefault()}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "10px 12px",
                        border: 0,
                        background: "#1f2a3a",
                        borderBottom: "1px solid #334155",
                        cursor: "pointer",
                        color: "#e5e7eb",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "#2b3a55")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "#1f2a3a")
                      }
                    >
                      <div style={{ fontWeight: 700 }}>
                        {(s.nosis || "").toString().padStart(4, "0")} — {s.nama}
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

        <div style={{ marginTop: 10 }}>
          <label className="muted">Judul</label>
          <input
            className="input"
            placeholder="mis. Kontrol Rutin / Alergi…"
            value={judul}
            onChange={(e) => setJudul(e.target.value)}
          />
        </div>

        <div style={{ marginTop: 10 }}>
          <label className="muted">Deskripsi</label>
          <textarea
            className="input"
            rows={3}
            value={deskripsi}
            onChange={(e) => setDeskripsi(e.target.value)}
          />
        </div>

        <div style={{ marginTop: 10 }}>
          <label className="muted">Lampiran (opsional)</label>
          <input
            id="rkFileInput"
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          {file && (
            <div className="muted" style={{ marginTop: 4 }}>
              Dipilih: <b>{file.name}</b>
            </div>
          )}
        </div>

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

        <div style={{ marginTop: 12 }}>
          <button className="btn" disabled={loading} onClick={submit}>
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}
