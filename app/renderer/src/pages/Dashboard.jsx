// src/pages/Dashboard.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { getSummary, getRecentActivity } from "../api/stats";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

/* -------------------- Server Status -------------------- */

function msSince(ts) {
  if (!ts) return "—";
  const diff = Date.now() - ts;
  if (diff < 1000) return `${diff} ms ago`;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

async function fetchWithTimeout(url, { timeout = 5000, ...opts } = {}) {
  const ctl = new AbortController();
  const id = setTimeout(() => ctl.abort(), timeout);
  try {
    const res = await fetch(url, { signal: ctl.signal, ...opts });
    return res;
  } finally {
    clearTimeout(id);
  }
}

async function checkServerOnce() {
  const t0 = performance.now();
  try {
    const res = await fetchWithTimeout(`${API}/health`, { timeout: 4000 });
    const t1 = performance.now();
    const okBasic = res.ok;
    let okDB = false;
    let dbErr = "";

    try {
      const rdb = await fetchWithTimeout(`${API}/health/db`, { timeout: 4000 });
      okDB = rdb.ok;
      if (!okDB) dbErr = await rdb.text().catch(() => "");
    } catch (e) {
      okDB = false;
      dbErr = e?.message || "timeout";
    }

    const latency = Math.max(0, Math.round(t1 - t0));
    if (okBasic && okDB) {
      return { state: "online", latency, lastError: "" };
    }
    if (okBasic && !okDB) {
      return { state: "degraded", latency, lastError: dbErr || "DB not OK" };
    }
    return { state: "offline", latency: null, lastError: "Health not OK" };
  } catch (e) {
    return {
      state: "offline",
      latency: null,
      lastError: e?.message || "error",
    };
  }
}

function ServerStatus() {
  const [status, setStatus] = useState({
    state: "checking", // checking | online | degraded | offline
    latency: null,
    lastChecked: null,
    lastError: "",
  });
  const timerRef = useRef(null);

  const color = useMemo(() => {
    switch (status.state) {
      case "online":
        return {
          border: "#14532d",
          bg: "#072714",
          fg: "#86efac",
          dot: "#22c55e",
        };
      case "degraded":
        return {
          border: "#7c2d12",
          bg: "#2a1307",
          fg: "#fdba74",
          dot: "#f59e0b",
        };
      case "offline":
        return {
          border: "#7f1d1d",
          bg: "#1b0c0c",
          fg: "#fca5a5",
          dot: "#ef4444",
        };
      default:
        return {
          border: "#334155",
          bg: "#0f172a",
          fg: "#e2e8f0",
          dot: "#94a3b8",
        };
    }
  }, [status.state]);

  async function runCheck() {
    const r = await checkServerOnce();
    setStatus((s) => ({
      ...s,
      state: r.state,
      latency: r.latency,
      lastChecked: Date.now(),
      lastError: r.lastError,
    }));
  }

  useEffect(() => {
    runCheck();
    timerRef.current = setInterval(runCheck, 10_000); // 10 detik
    return () => clearInterval(timerRef.current);
  }, []);

  return (
    <div
      className="card"
      style={{
        border: `1px solid ${color.border}`,
        background: color.bg,
        color: color.fg,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              display: "inline-block",
              width: 10,
              height: 10,
              borderRadius: 999,
              background: color.dot,
              boxShadow: `0 0 0 3px ${color.dot}22`,
            }}
          />
          <div>
            <div style={{ fontWeight: 700 }}>Status Server</div>
            <div className="muted" style={{ fontSize: 12 }}>
              {status.state === "checking" && "Memeriksa…"}
              {status.state === "online" && "Online"}
              {status.state === "degraded" && "Online (DB bermasalah)"}
              {status.state === "offline" && "Offline / tidak terjangkau"}
              {" · "}
              {status.latency != null
                ? `Latency ~${status.latency} ms`
                : "Latency —"}
              {" · "}
              Terakhir cek: {msSince(status.lastChecked)}
            </div>
            {status.lastError && status.state !== "online" && (
              <div style={{ fontSize: 12, marginTop: 6, opacity: 0.9 }}>
                Detail: {status.lastError}
              </div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <code
            className="badge"
            style={{ background: "#111827", color: "#cbd5e1" }}
          >
            {API}
          </code>
          <button className="btn" onClick={runCheck} title="Cek ulang">
            Cek Ulang
          </button>
        </div>
      </div>
    </div>
  );
}

/* -------------------- Dashboard -------------------- */

export default function Dashboard() {
  const [sum, setSum] = useState(null);
  const [act, setAct] = useState({ items: [] });
  const [err, setErr] = useState("");

  // filter angkatan
  const [angkatan, setAngkatan] = useState(
    () => localStorage.getItem("ui.angkatan") || ""
  );
  const [opts, setOpts] = useState([]);

  const [lastUpdated, setLastUpdated] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(() => {
    const v = localStorage.getItem("ui.autoRefresh");
    return v == null ? true : v === "1";
  });
  const [intervalMs, setIntervalMs] = useState(() => {
    const v = parseInt(localStorage.getItem("ui.refreshMs") || "15000", 10);
    return Number.isFinite(v) ? v : 15000;
  });

  async function load() {
    try {
      setErr("");
      const token = await window.authAPI.getToken();
      // panggil API stats dengan query angkatan bila ada (opsional: backend dukung ?angkatan=...)
      const [s, a] = await Promise.all([
        getSummary(token, angkatan), // kamu bisa ubah implementasi getSummary agar forward param
        getRecentActivity(token, angkatan),
      ]);
      setSum(s);
      setAct(a);
      setLastUpdated(Date.now());
    } catch (e) {
      setErr(e.message || "Gagal memuat data");
    }
  }

  // load awal + opsi angkatan
  useEffect(() => {
    load();
    (async () => {
      try {
        const token = await window.authAPI.getToken();
        const res = await fetch(`${API}/ref/angkatan`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        setOpts(Array.isArray(data.items) ? data.items : []);
      } catch {
        setOpts([]);
      }
    })();
  }, []);

  // reload saat ganti angkatan
  useEffect(() => {
    localStorage.setItem("ui.angkatan", angkatan || "");
    load();
  }, [angkatan]);

  // auto refresh
  useEffect(() => {
    localStorage.setItem("ui.autoRefresh", autoRefresh ? "1" : "0");
    localStorage.setItem("ui.refreshMs", String(intervalMs));
    if (!autoRefresh) return;
    const id = setInterval(load, Math.max(5000, intervalMs));
    return () => clearInterval(id);
  }, [autoRefresh, intervalMs, angkatan]);

  return (
    <div className="grid">
      {/* Status server */}
      <ServerStatus />

      {err && (
        <div
          className="card"
          style={{ borderColor: "#7f1d1d", color: "#fecaca" }}
        >
          ⚠ {err}
        </div>
      )}

      {/* Filter bar */}
      <div
        className="card"
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontWeight: 700 }}>Filter</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label className="muted">Angkatan</label>
          <select
            value={angkatan}
            onChange={(e) => setAngkatan(e.target.value)}
            style={{
              background: "#0f1424",
              border: "1px solid #1f2937",
              color: "#e5e7eb",
              borderRadius: 8,
              padding: "6px 10px",
              minWidth: 160,
            }}
          >
            <option value="">Semua</option>
            {opts.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: 1 }} />

        <div className="muted" style={{ fontSize: 12 }}>
          Last updated:{" "}
          {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : "—"}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={load}>
            Refresh
          </button>
          <label
            className="muted"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
            }}
            title="Auto refresh"
          >
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto refresh
          </label>
          <select
            value={intervalMs}
            onChange={(e) => setIntervalMs(parseInt(e.target.value, 10))}
            style={{
              background: "#0f1424",
              border: "1px solid #1f2937",
              color: "#e5e7eb",
              borderRadius: 8,
              padding: "6px 10px",
            }}
            title="Interval"
          >
            <option value={10000}>10s</option>
            <option value={15000}>15s</option>
            <option value={30000}>30s</option>
            <option value={60000}>60s</option>
          </select>
        </div>
      </div>

      {/* ringkasan KPI */}
      <div className="grid grid-4">
        <a className="card" href="#/siswa" style={{ textDecoration: "none" }}>
          <div style={{ fontSize: 12, color: "#94a3b8" }}>
            Siswa{angkatan ? ` (Angkatan ${angkatan})` : ""}
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, marginTop: 6 }}>
            {sum?.siswa_total ?? "—"}
          </div>
        </a>
        <a
          className="card"
          href="#/siswa#bk"
          style={{ textDecoration: "none" }}
        >
          <div style={{ fontSize: 12, color: "#94a3b8" }}>PDF BK</div>
          <div style={{ fontSize: 26, fontWeight: 800, marginTop: 6 }}>
            {sum?.bk_pdf_total ?? "—"}
          </div>
        </a>
        <a
          className="card"
          href="#/siswa#pelanggaran"
          style={{ textDecoration: "none" }}
        >
          <div style={{ fontSize: 12, color: "#94a3b8" }}>PDF Pelanggaran</div>
          <div style={{ fontSize: 26, fontWeight: 800, marginTop: 6 }}>
            {sum?.pelanggaran_pdf_total ?? "—"}
          </div>
        </a>
        <div className="card">
          <div style={{ fontSize: 12, color: "#94a3b8" }}>Import Terakhir</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginTop: 6 }}>
            {sum?.last_import_at
              ? new Date(sum.last_import_at).toLocaleString("id-ID")
              : "—"}
          </div>
        </div>
      </div>

      {/* aktivitas terbaru */}
      <div className="grid grid-2">
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 8 }}>
            Aktivitas Terbaru
          </div>
          <ul
            style={{
              margin: 0,
              paddingLeft: 18,
              lineHeight: 1.8,
              color: "#cbd5e1",
            }}
          >
            {(act.items || []).map((item) => (
              <li key={item.id}>
                <b>{item.aksi}</b> oleh{" "}
                <span className="badge">{item.admin || "admin"}</span>{" "}
                <span style={{ color: "#94a3b8" }}>
                  {new Date(item.created_at).toLocaleString("id-ID")}
                </span>
              </li>
            ))}
            {(!act.items || act.items.length === 0) && (
              <li>Tidak ada aktivitas.</li>
            )}
          </ul>
        </div>
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Quick Actions</div>
          <div className="grid">
            {/* <a className="btn" href="#/import">
              Buka Halaman Import
            </a> */}
            <a className="btn" href="#/import/siswa">
              Cari Siswa
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
