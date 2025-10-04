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
const translateReason = (code) => REASON_TEXT[code] || code || "-";

export default function ImportExcel({
  endpoint,
  title,
  requireAngkatan = false,
  onAfterImport, // callback ke halaman: {success, summary}
}) {
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(null); // "ok" | "skip" | "fail"
  const [angkatanOpts, setAngkatanOpts] = useState([]);
  const [angkatan, setAngkatan] = useState("");

  // ringkasan terakhir (untuk badge kecil di atas tab)
  const [lastImport, setLastImport] = useState(null); // { mode:'dry'|'import', ok, skip, fail }

  // warn before unload
  useEffect(() => {
    function handleBeforeUnload(e) {
      if (!loading) return;
      e.preventDefault();
      e.returnValue = "Proses import sedang berjalan. Jangan tutup halaman.";
      return e.returnValue;
    }
    if (loading) window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [loading]);

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

  function summarize(payload) {
    const ok = payload?.ok ?? payload?.detailLists?.ok?.length ?? 0;
    const skip = payload?.skip ?? payload?.detailLists?.skip?.length ?? 0;
    const fail = payload?.fail ?? payload?.detailLists?.fail?.length ?? 0;
    return {
      ok: Number(ok) || 0,
      skip: Number(skip) || 0,
      fail: Number(fail) || 0,
    };
  }

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

      // Tab default: fail > skip > ok
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

      // Ringkasan & status
      const s = summarize(normalized);
      setLastImport({ mode: dryRun ? "dry" : "import", ...s });

      // Callback sukses setelah import (non-dry-run)
      const success = res.ok && !dryRun && !data?.error;
      if (!dryRun && typeof onAfterImport === "function") {
        onAfterImport({
          success,
          summary: s,
          raw: normalized,
        });
      }
    } catch (e) {
      setResult({ error: e.message || "Gagal import" });
      setLastImport({
        mode: dryRun ? "dry" : "import",
        ok: 0,
        skip: 0,
        fail: 1,
      });
      if (!dryRun && typeof onAfterImport === "function") {
        onAfterImport({ success: false, summary: { ok: 0, skip: 0, fail: 1 } });
      }
    } finally {
      setLoading(false);
    }
  }

  const lists = useMemo(
    () => result?.detailLists || { ok: [], skip: [], fail: [] },
    [result]
  );
  const current = activeTab ? lists[activeTab] || [] : [];

  return (
    <div className="grid" style={{ position: "relative" }}>
      {/* OVERLAY LOADING */}
      {loading && <LoadingOverlay />}

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
      </div>

      <div className="card">
        {loading && (
          <div
            role="status"
            aria-live="polite"
            style={{
              background: "#1b0c0c",
              border: "1px solid #7f1d1d",
              color: "#fca5a5",
              padding: "8px 12px",
              borderRadius: 8,
              marginBottom: 12,
              fontWeight: 600,
            }}
          >
            ⏳ Import sedang diproses. <b>Jangan tutup / refresh halaman ini</b>{" "}
            sampai proses selesai.
          </div>
        )}

        {/* Badge ringkasan terakhir */}
        {lastImport && (
          <div
            style={{
              marginBottom: 10,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span
              className="badge"
              style={{ background: "#0f172a", border: "1px solid #334155" }}
            >
              Mode:{" "}
              <b style={{ marginLeft: 6 }}>
                {lastImport.mode === "dry" ? "Cek (Dry Run)" : "Import"}
              </b>
            </span>
            <span className="badge">OK: {lastImport.ok}</span>
            <span className="badge">Skip: {lastImport.skip}</span>
            <span className="badge">Fail: {lastImport.fail}</span>
          </div>
        )}

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
            disabled={loading}
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
                disabled={loading}
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
            aria-busy={loading}
          >
            {loading ? "Memproses..." : "Cek (Dry Run)"}
          </button>
          <button
            className="btn"
            disabled={!file || loading || (requireAngkatan && !angkatan)}
            onClick={() => requestImport(false)}
            aria-busy={loading}
          >
            {loading ? "Memproses..." : "Mulai Import"}
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
                <div className="muted" aria-live="polite">
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

                {/* TAB HEADERS */}
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
                    disabled={loading}
                  />
                  <TabButton
                    label={`Skip: ${result.skip ?? lists.skip.length ?? 0}`}
                    active={activeTab === "skip"}
                    onClick={() => setActiveTab("skip")}
                    color={{ border: "#3f3f46", bg: "#111827", fg: "#fbbf24" }}
                    disabled={loading}
                  />
                  <TabButton
                    label={`Fail: ${result.fail ?? lists.fail.length ?? 0}`}
                    active={activeTab === "fail"}
                    onClick={() => setActiveTab("fail")}
                    color={{ border: "#7f1d1d", bg: "#1b0c0c", fg: "#fca5a5" }}
                    disabled={loading}
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
                      opacity: loading ? 0.75 : 1,
                    }}
                    aria-busy={loading}
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
function TabButton({ label, active, onClick, color, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "12px 18px",
        borderRadius: 12,
        border: `2px solid ${color?.border || "#334155"}`,
        background: color?.bg || "#0f172a",
        color: color?.fg || "#e2e8f0",
        fontWeight: 800,
        cursor: disabled ? "not-allowed" : "pointer",
        minWidth: 150,
        boxShadow: active ? "0 0 0 2px rgba(255,255,255,0.08) inset" : "none",
        opacity: disabled ? 0.6 : active ? 1 : 0.9,
      }}
      aria-pressed={active}
      aria-disabled={disabled}
    >
      {label}
    </button>
  );
}

/** Overlay loading */
function LoadingOverlay() {
  return (
    <div
      aria-live="assertive"
      role="alert"
      style={{
        position: "absolute",
        inset: 0,
        background: "rgba(3,6,17,0.82)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 999,
      }}
    >
      <div
        style={{
          display: "grid",
          gap: 12,
          placeItems: "center",
          padding: 20,
          borderRadius: 14,
          border: "1px solid #1f2937",
          background: "rgba(10,16,32,0.95)",
          maxWidth: 520,
          textAlign: "center",
        }}
      >
        <Spinner />
        <div style={{ fontWeight: 800, fontSize: 18 }}>Memproses Import…</div>
        <div className="muted" style={{ lineHeight: 1.4 }}>
          Proses ini dapat memakan waktu beberapa menit tergantung ukuran file.
          <br />
          <b>Jangan tutup / pindah halaman</b> sampai proses selesai.
        </div>
      </div>
    </div>
  );
}
function Spinner() {
  return (
    <div
      aria-hidden
      style={{
        width: 36,
        height: 36,
        borderRadius: "50%",
        border: "3px solid #1f2937",
        borderTopColor: "#e5e7eb",
        animation: "spin 0.9s linear infinite",
      }}
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
