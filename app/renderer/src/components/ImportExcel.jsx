import { useEffect, useMemo, useState } from "react";
const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

// Peta reason code -> teks yang ramah
const REASON_TEXT = {
  no_nosis: "Tidak ada NOSIS pada baris ini.",
  no_week_value: "Tidak ada nilai minggu apa pun pada baris ini.",
  siswa_not_found_in_angkatan: "Siswa (NOSIS+Angkatan) tidak ditemukan.",
  no_nik_or_nosis: "Tidak ada NIK maupun NOSIS (baris dilewati).",
  siswa_not_found: "Siswa tidak ditemukan.",
};

function translateReason(code) {
  return REASON_TEXT[code] || code || "-";
}

export default function ImportExcel({
  endpoint,
  title,
  requireAngkatan = false,
}) {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState(null); // "ok" | "skip" | "fail"

  // Angkatan
  const [angkatanOpts, setAngkatanOpts] = useState([]);
  const [angkatan, setAngkatan] = useState("");

  // load opsi angkatan (kalau diminta)
  useEffect(() => {
    if (!requireAngkatan) return;
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
          console.error(
            "[ImportExcel] load angkatan:",
            res.status,
            await res.text()
          );
          return;
        }
        const data = await res.json(); // { items: [...] }
        if (alive) setAngkatanOpts(Array.isArray(data.items) ? data.items : []);
      } catch (e) {
        console.error("[ImportExcel] load angkatan error:", e);
      }
    })();
    return () => {
      alive = false;
    };
  }, [requireAngkatan]);

  async function requestImport(dryRun) {
    if (!file) return;
    if (requireAngkatan && !angkatan) {
      setResult({ error: "Silakan pilih angkatan terlebih dahulu." });
      return;
    }
    setLoading(true);
    setResult(null);
    setActiveTab(null);
    try {
      const token = await window.authAPI.getToken?.();
      const form = new FormData();
      form.append("file", file);

      const url = new URL(`${API}/import/${endpoint}`);
      if (dryRun) url.searchParams.set("dryRun", "true");
      if (requireAngkatan && angkatan)
        url.searchParams.set("angkatan", angkatan);

      const res = await fetch(url.toString(), {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      const data = await res.json();

      // Normalisasi bentuk payload detail -> detailLists
      const detail = data?.detailLists ||
        data?.detail || {
          ok: data?.okList || [],
          skip: data?.skipList || [],
          fail: data?.failList || [],
        };

      const normalized = {
        ...data,
        detailLists: {
          ok: Array.isArray(detail.ok) ? detail.ok : [],
          skip: Array.isArray(detail.skip) ? detail.skip : [],
          fail: Array.isArray(detail.fail) ? detail.fail : [],
        },
      };

      setResult(normalized);

      // Pilih tab default: fail > skip > ok
      if (!("error" in data)) {
        if ((normalized.fail ?? 0) > 0 || normalized.detailLists.fail.length) {
          setActiveTab("fail");
        } else if (
          (normalized.skip ?? 0) > 0 ||
          normalized.detailLists.skip.length
        ) {
          setActiveTab("skip");
        } else {
          setActiveTab("ok");
        }
      }
    } catch (e) {
      setResult({ error: e.message || "Gagal import" });
    } finally {
      setLoading(false);
    }
  }

  function back() {
    window.location.hash = "#/import";
  }

  const lists = useMemo(
    () => result?.detailLists || { ok: [], skip: [], fail: [] },
    [result]
  );
  const current = activeTab ? lists[activeTab] || [] : [];

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
          <div className="muted">Gunakan file .xlsx sesuai template</div>
        </div>
        <button className="btn" onClick={back}>
          Kembali
        </button>
      </div>

      <div className="card">
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setFile(e.target.files[0])}
          />

          {requireAngkatan && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label htmlFor="angkatan" className="muted">
                Angkatan
              </label>
              <select
                id="angkatan"
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
                <option value="">– Pilih –</option>
                {angkatanOpts.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            className="btn"
            disabled={!file || loading || (requireAngkatan && !angkatan)}
            onClick={() => requestImport(true)}
          >
            Cek (Dry Run)
          </button>
          <button
            className="btn"
            disabled={!file || loading || (requireAngkatan && !angkatan)}
            onClick={() => requestImport(false)}
          >
            Mulai Import
          </button>
        </div>

        {result && (
          <div style={{ marginTop: 12 }}>
            {"error" in result ? (
              <div style={{ color: "#fca5a5" }}>
                ⚠ {result.error || result.message}
              </div>
            ) : (
              <>
                <div className="muted">
                  Sheet: <b>{result.sheetUsed}</b> · Rows: <b>{result.rows}</b>{" "}
                  · Header row: <b>{result.headerRow}</b>
                  {Array.isArray(result.weeksDetected) &&
                    result.weeksDetected.length > 0 && (
                      <>
                        {" "}
                        · Weeks: <b>{result.weeksDetected.join(", ")}</b>
                      </>
                    )}
                </div>

                {/* TAB HEADERS (tombol besar) */}
                <div
                  style={{
                    marginTop: 12,
                    display: "flex",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <TabButton
                    label={`OK: ${result.ok ?? lists.ok.length ?? 0}`}
                    active={activeTab === "ok"}
                    onClick={() => setActiveTab("ok")}
                    color={{ border: "#334155", bg: "#0f172a", fg: "#e2e8f0" }}
                  />
                  <TabButton
                    label={`Skip: ${result.skip ?? lists.skip.length ?? 0}`}
                    active={activeTab === "skip"}
                    onClick={() => setActiveTab("skip")}
                    color={{ border: "#3f3f46", bg: "#111827", fg: "#fbbf24" }}
                  />
                  <TabButton
                    label={`Fail: ${result.fail ?? lists.fail.length ?? 0}`}
                    active={activeTab === "fail"}
                    onClick={() => setActiveTab("fail")}
                    color={{ border: "#7f1d1d", bg: "#1b0c0c", fg: "#fca5a5" }}
                  />
                </div>

                {/* TAB CONTENT */}
                {activeTab && (
                  <div
                    className="card"
                    style={{
                      marginTop: 12,
                      padding: 0,
                      background: "#0b1220",
                      border: "1px solid #1f2937",
                      borderRadius: 12,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 12px",
                        borderBottom: "1px solid #1f2937",
                      }}
                    >
                      <div style={{ fontWeight: 800 }}>
                        Detail {activeTab.toUpperCase()} ({current.length})
                      </div>
                    </div>

                    <div
                      style={{
                        maxHeight: "60vh",
                        overflow: "auto",
                        padding: 12,
                      }}
                    >
                      <table className="table" style={{ width: "100%" }}>
                        <thead
                          style={{
                            position: "sticky",
                            top: 0,
                            background: "#0b1220",
                            zIndex: 1,
                          }}
                        >
                          <tr>
                            <th style={{ textAlign: "left" }}>NOSIS</th>
                            <th style={{ textAlign: "left" }}>Nama</th>
                            {activeTab === "skip" && (
                              <th style={{ textAlign: "left" }}>Alasan</th>
                            )}
                            {activeTab === "fail" && (
                              <th style={{ textAlign: "left" }}>Error</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {current.length === 0 ? (
                            <tr>
                              <td
                                colSpan={
                                  activeTab === "fail" || activeTab === "skip"
                                    ? 3
                                    : 2
                                }
                                className="muted"
                                style={{ padding: 12 }}
                              >
                                Tidak ada data.
                              </td>
                            </tr>
                          ) : (
                            current.map((r, i) => (
                              <tr key={i}>
                                <td style={{ whiteSpace: "nowrap" }}>
                                  {r.nosis || "-"}
                                </td>
                                <td>{r.nama || "-"}</td>
                                {activeTab === "skip" && (
                                  <td
                                    style={{
                                      maxWidth: 600,
                                      overflowWrap: "anywhere",
                                    }}
                                  >
                                    {translateReason(r.reason)}
                                  </td>
                                )}
                                {activeTab === "fail" && (
                                  <td
                                    style={{
                                      maxWidth: 600,
                                      overflowWrap: "anywhere",
                                    }}
                                  >
                                    {r.error || "-"}
                                  </td>
                                )}
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Tombol tab besar */
function TabButton({ label, active, onClick, color }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "12px 18px",
        borderRadius: 12,
        border: `2px solid ${color?.border || "#334155"}`,
        background: color?.bg || "#0f172a",
        color: color?.fg || "#e2e8f0",
        fontWeight: 800,
        cursor: "pointer",
        minWidth: 150,
        boxShadow: active ? "0 0 0 2px rgba(255,255,255,0.08) inset" : "none",
        opacity: active ? 1 : 0.9,
      }}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}
