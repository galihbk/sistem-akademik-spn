// components/Shell.jsx
import { useEffect, useMemo, useState } from "react";
import { ShellContext } from "../context/ShellContext";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

function isActiveHref(href) {
  if (!href) return false;
  const hash = window.location.hash || "#/dashboard";
  // Aktif jika persis sama, atau prefix + "/" (bukan sekadar prefix)
  // Contoh: "#/import/xxx" tidak akan mengaktifkan "#/import/xx"
  return hash === href || hash.startsWith(href + "/");
}

function SideLink({ item }) {
  const active = isActiveHref(item.href);
  return (
    <a
      href={item.href}
      className="side-link"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 12px",
        borderRadius: 10,
        border: active ? "1px solid #1f2937" : "1px solid transparent",
        background: active ? "#0f1424" : "transparent",
        color: "#cbd5e1",
        textDecoration: "none",
        fontWeight: 600,
      }}
      title={item.label}
    >
      {item.icon && <span style={{ fontSize: 16 }}>{item.icon}</span>}
      <span>{item.label}</span>
    </a>
  );
}

function SideGroup({ item }) {
  const [hash, setHash] = useState(window.location.hash || "#/dashboard");

  useEffect(() => {
    const h = () => setHash(window.location.hash || "#/dashboard");
    window.addEventListener("hashchange", h);
    return () => window.removeEventListener("hashchange", h);
  }, []);

  const hasActiveChild = useMemo(() => {
    if (!item?.children?.length) return false;
    // Untuk membuka group, kita tetap pakai startsWith agar semua route child bikin group kebuka
    return item.children.some((c) => c.href && hash.startsWith(c.href));
  }, [item, hash]);

  const [open, setOpen] = useState(hasActiveChild);

  useEffect(() => {
    if (hasActiveChild) setOpen(true);
  }, [hasActiveChild]);

  const toggle = (e) => {
    e.preventDefault();
    setOpen((v) => !v);
  };

  return (
    <div style={{ marginBottom: 8 }}>
      <button
        className="side-link"
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggle(e);
          }
        }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          width: "100%",
          padding: "10px 12px",
          borderRadius: 10,
          border: open ? "1px solid #1f2937" : "1px solid transparent",
          background: open ? "#0f1424" : "transparent",
          color: "#cbd5e1",
          cursor: "pointer",
          textAlign: "left",
          fontWeight: 800,
        }}
        aria-expanded={open}
        aria-controls={`group-${item.key}`}
      >
        {item.icon && <span style={{ fontSize: 16 }}>{item.icon}</span>}
        <span>{item.label}</span>
        <span style={{ marginLeft: "auto", opacity: 0.8 }}>
          {open ? "▾" : "▸"}
        </span>
      </button>

      {open && (
        <div
          id={`group-${item.key}`}
          style={{
            marginTop: 6,
            marginLeft: 8,
            paddingLeft: 10,
            borderLeft: "2px solid rgba(255,255,255,0.07)",
            display: "grid",
            gap: 6,
          }}
        >
          {item.children.map((c) => (
            <div key={c.key}>
              {c.separator && (
                <div
                  style={{
                    height: 1,
                    background: "rgba(255, 255, 255, 0.12)",
                    margin: "6px 0",
                  }}
                />
              )}
              <SideLink item={c} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Shell({
  title = "SISTEM AKADEMIK",
  children,
  onLogout,
  nav = [],
  active, // tidak dipakai lagi untuk highlight; kita pakai hash agar child bisa aktif
  showAngkatan = false,
  onAngkatanChange,
}) {
  const [angkatan, setAngkatan] = useState(
    () => localStorage.getItem("sa.angkatan") || ""
  );
  const [angkatanOpts, setAngkatanOpts] = useState([]);

  useEffect(() => {
    if (!showAngkatan) return;
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
        {/* Sidebar */}
        <aside
          style={{
            background: "#0b1220",
            borderRight: "1px solid #1f2937",
            padding: 16,
            display: "flex",
            flexDirection: "column",
            height: "100vh",
            width: 240,
          }}
        >
          {/* Brand */}
          <div
            style={{
              fontWeight: 800,
              fontSize: 18,
              letterSpacing: 0.5,
              marginBottom: 12,
              color: "#e2e8f0",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            SISTEM AKADEMIK
          </div>

          {/* NAV AREA (scrollable) */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              paddingRight: 4, // ruang untuk scrollbar
            }}
            className="scroll-slim"
          >
            <nav style={{ display: "grid", gap: 8 }}>
              {nav.map((item) =>
                item.children?.length ? (
                  <SideGroup key={item.key} item={item} />
                ) : (
                  <SideLink key={item.key} item={item} />
                )
              )}
            </nav>
          </div>

          {/* FOOTER (non-scroll) */}
          <div style={{ paddingTop: 12 }}>
            <button
              className="btn"
              onClick={onLogout}
              style={{ width: "100%" }}
            >
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
              color: "#e2e8f0",
            }}
          >
            <div style={{ fontWeight: 700 }}>{title}</div>

            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
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
