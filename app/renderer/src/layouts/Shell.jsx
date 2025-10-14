import { useEffect, useMemo, useState } from "react";
import { ShellContext } from "../context/ShellContext";
import ThemeToggle from "../components/ThemeToggle";
import DownloadToasterBinder from "../components/DownloadToastBinder"; // ⬅️ tetap

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

function isActiveHref(href) {
  if (!href) return false;
  const hash = window.location.hash || "#/dashboard";
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
        border: active ? "1px solid var(--border)" : "1px solid transparent",
        background: active ? "var(--panel-alt)" : "transparent",
        color: "var(--text-muted-strong)",
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
          border: open ? "1px solid var(--border)" : "1px solid transparent",
          background: open ? "var(--panel-alt)" : "transparent",
          color: "var(--text-muted-strong)",
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
            borderLeft: "2px solid var(--border-soft)",
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
                    background: "var(--divider)",
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

// --- Brand komponen kecil untuk sidebar (pakai logo kamu) ---
function BrandBSMS() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        alignItems: "center",
        gap: 10,
        marginBottom: 12,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        flexShrink: 0,
      }}
      title="BSMS SPN Purwokerto"
    >
      <img
        src="/bsms-logo.png"
        alt="BSMS"
        width={28}
        height={28}
        style={{ objectFit: "contain", borderRadius: 6 }}
        onError={(e) => {
          // kalau file belum ada, sembunyikan img agar layout tetap rapi
          e.currentTarget.style.display = "none";
        }}
      />
      <div style={{ lineHeight: 1.15 }}>
        <div
          style={{
            fontWeight: 800,
            fontSize: 16,
            letterSpacing: 0.3,
            color: "var(--text-strong)",
          }}
        >
          BSMS SPN Purwokerto
        </div>
        <div className="muted" style={{ fontSize: 11, opacity: 0.9 }}>
          Bhayangkara Student Management System
        </div>
      </div>
    </div>
  );
}

export default function Shell({
  title = "SISTEM AKADEMIK",
  children,
  onLogout,
  nav = [],
  active, // tidak dipakai lagi
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
      {/* Binder toast download global (cukup dipasang sekali di Shell) */}
      <DownloadToasterBinder />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "240px 1fr",
          height: "100vh",
          overflow: "hidden",
          background: "var(--bg)",
          color: "var(--text)",
        }}
      >
        {/* Sidebar */}
        <aside
          style={{
            background: "var(--panel)",
            borderRight: "1px solid var(--border)",
            padding: 16,
            display: "flex",
            flexDirection: "column",
            height: "100vh",
            width: 240,
            overflow: "hidden",
          }}
        >
          {/* Brand (ganti blok lama menjadi komponen BrandBSMS) */}
          <BrandBSMS />

          {/* NAV AREA (scrollable) */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              paddingRight: 4,
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

          {/* FOOTER */}
          <div style={{ paddingTop: 12, flexShrink: 0 }}>
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
        <section
          style={{
            display: "grid",
            gridTemplateRows: "64px 1fr",
            height: "100vh",
            overflow: "hidden",
          }}
        >
          {/* Topbar */}
          <header
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 16px",
              borderBottom: "1px solid var(--border)",
              background: "var(--panel)",
              gap: 12,
              color: "var(--text)",
              zIndex: 1,
            }}
          >
            {/* Kamu tetap bisa override prop `title` dari luar */}
            <div style={{ fontWeight: 700 }}>{title}</div>

            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <ThemeToggle />
              {showAngkatan && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <label
                    htmlFor="angkatan"
                    className="muted"
                    style={{ fontSize: 14 }}
                  >
                    Angkatan
                  </label>
                  <select
                    id="angkatan"
                    value={angkatan}
                    onChange={(e) => setAngkatan(e.target.value)}
                    style={{
                      background: "var(--input-bg)",
                      color: "var(--text)",
                      border: "1px solid var(--border)",
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
