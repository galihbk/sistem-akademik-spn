// components/Shell.jsx
import { useEffect, useState } from "react";
import { ShellContext } from "../context/ShellContext";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function Shell({
  title = "SISTEM AKADEMIK",
  children,
  onLogout,
  nav = [],
  active,
  showAngkatan = false, // <<< baru: kontrol tampil/tidak dropdown
  onAngkatanChange, // <<< opsional: callback ke halaman
}) {
  // simpan pilihan user
  const [angkatan, setAngkatan] = useState(
    () => localStorage.getItem("sa.angkatan") || ""
  );
  const [angkatanOpts, setAngkatanOpts] = useState([]);

  // load opsi angkatan HANYA kalau perlu
  useEffect(() => {
    if (!showAngkatan) return; // tidak fetch kalau dropdown tidak dipakai

    let alive = true;
    (async () => {
      try {
        const token = await window.authAPI?.getToken?.();
        const res = await fetch(`${API}/ref/angkatan`, {
          headers: {
            Accept: "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!res.ok) {
          console.error("[Shell] angkatan", res.status, await res.text());
          return;
        }
        const data = await res.json();
        if (alive) setAngkatanOpts(Array.isArray(data.items) ? data.items : []);
      } catch (e) {
        console.error("[Shell] angkatan", e);
      }
    })();
    return () => {
      alive = false;
    };
  }, [showAngkatan]);

  // persist + notify ke halaman saat berubah
  useEffect(() => {
    localStorage.setItem("sa.angkatan", angkatan || "");
    if (typeof onAngkatanChange === "function") onAngkatanChange(angkatan);
  }, [angkatan, onAngkatanChange]);

  return (
    <ShellContext.Provider value={{ angkatan, setAngkatan }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "240px 1fr",
          height: "100vh",
        }}
      >
        {/* Sidebar (tetap ada) */}
        <aside
          style={{
            background: "#0b1220",
            borderRight: "1px solid #1f2937",
            padding: 16,
            position: "relative",
          }}
        >
          <div
            style={{
              fontWeight: 800,
              fontSize: 18,
              letterSpacing: 0.5,
              marginBottom: 16,
            }}
          >
            SISTEM AKADEMIK
          </div>
          <nav className="grid">
            {nav.map((item) => (
              <a
                key={item.key}
                href={item.href}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: active === item.key ? "#0f1424" : "transparent",
                  border:
                    active === item.key
                      ? "1px solid #1f2937"
                      : "1px solid transparent",
                  color: "#cbd5e1",
                }}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div style={{ position: "absolute", bottom: 16 }}>
            <button className="btn" onClick={onLogout}>
              Logout
            </button>
          </div>
        </aside>

        {/* Right */}
        <section style={{ display: "grid", gridTemplateRows: "64px 1fr" }}>
          {/* Topbar */}
          <header
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 16px",
              borderBottom: "1px solid #1f2937",
              background: "#0b1220",
              gap: 12,
            }}
          >
            <div style={{ fontWeight: 700 }}>{title}</div>

            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {/* Dropdown Angkatan hanya saat diminta */}
              {showAngkatan && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <label
                    htmlFor="angkatan"
                    style={{ color: "#cbd5e1", fontSize: 14 }}
                  >
                    Angkatan
                  </label>
                  <select
                    id="angkatan"
                    value={angkatan}
                    onChange={(e) => setAngkatan(e.target.value)}
                    style={{
                      background: "#0f1424",
                      color: "#e5e7eb",
                      border: "1px solid #1f2937",
                      borderRadius: 8,
                      padding: "6px 10px",
                      minWidth: 160,
                    }}
                  >
                    <option value="">Semua</option>
                    {angkatanOpts.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <span className="badge">Admin</span>
            </div>
          </header>

          {/* Content */}
          <main style={{ padding: 16, overflow: "auto" }}>{children}</main>
        </section>
      </div>
    </ShellContext.Provider>
  );
}
