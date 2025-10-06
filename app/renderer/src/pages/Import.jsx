import { useState } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000";

export default function ImportPage() {
  const [file, setFile] = useState(null);
  const [importType, setImportType] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ open: false, type: null, list: [] });

  // daftar jenis import (yang lain masih disabled dulu)
  const options = [
    { key: "siswa", label: "Data Siswa" },
    { key: "sosiometri", label: "Nilai Sosiometri", disabled: true },
    { key: "mental", label: "Mental Kepribadian", disabled: true },
    { key: "bk", label: "Bimbingan Konseling (BK)", disabled: true },
    { key: "pelanggaran", label: "Pelanggaran", disabled: true },
    { key: "prestasi", label: "Prestasi", disabled: true },
    { key: "jasmani", label: "Jasmani", disabled: true },
    { key: "riwayat_kesehatan", label: "Riwayat Kesehatan", disabled: true },
  ];

  const pickOption = (opt) => {
    if (opt.disabled) return;
    setImportType(opt.key);
    setResult(null); // clear hasil lama tiap ganti tipe
    setFile(null);
  };

  async function requestImport(dryRun) {
    if (!file || !importType) return;
    setLoading(true);
    setResult(null); // reset supaya nggak tampil hasil sebelumnya

    try {
      const token = await window.authAPI.getToken();
      const form = new FormData();
      form.append("file", file);

      const url = `${API}/import/${importType}${dryRun ? "?dryRun=true" : ""}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      const data = await res.json();
      setResult(data);
    } catch (e) {
      console.error(e);
      setResult({ error: e.message || "Gagal import" });
    } finally {
      setLoading(false);
    }
  }

  function openModal(type) {
    if (!result?.detailLists?.[type]) return;
    setModal({ open: true, type, list: result.detailLists[type] });
  }

  return (
    <div className="grid">
      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: 18 }}>Import</div>
            <div style={{ color: "#94a3b8" }}>
              Pilih jenis data yang akan di-import
            </div>
          </div>
        </div>

        {/* Grid pilihan jenis import */}
        <div className="import-grid" style={{ marginTop: 14 }}>
          {options.map((opt) => (
            <button
              key={opt.key}
              type="button"
              className={[
                "import-option",
                importType === opt.key ? "active" : "",
                opt.disabled ? "disabled" : "",
              ].join(" ")}
              onClick={() => pickOption(opt)}
            >
              <span>{opt.label}</span>
              {opt.disabled && <small className="muted">coming soon</small>}
            </button>
          ))}
        </div>

        {/* Panel upload muncul setelah pilih tipe */}
        {importType && (
          <div className="card" style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>
              {options.find((o) => o.key === importType)?.label}
            </div>
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
                onChange={(e) => setFile(e.target.files[0])}
                accept=".xlsx,.xls"
              />
              <button
                className="btn"
                onClick={() => requestImport(true)}
                disabled={!file || loading}
              >
                Cek (Dry Run)
              </button>
              <button
                className="btn"
                onClick={() => requestImport(false)}
                disabled={!file || loading}
              >
                Mulai Import
              </button>
            </div>

            {/* Ringkasan hasil */}
            {result && (
              <div style={{ marginTop: 12 }}>
                {"error" in result ? (
                  <div style={{ color: "#fca5a5" }}>
                    ⚠ {result.error || result.message}
                  </div>
                ) : (
                  <>
                    <div style={{ color: "#94a3b8" }}>
                      Sheet: <b>{result.sheetUsed}</b> · Rows:{" "}
                      <b>{result.rows}</b> · Header row:{" "}
                      <b>{result.headerRow}</b>
                    </div>
                    <div
                      style={{
                        marginTop: 8,
                        display: "flex",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        className="badge clickable"
                        onClick={() => openModal("ok")}
                      >
                        OK: {result.ok}
                      </span>
                      <span
                        className="badge clickable"
                        onClick={() => openModal("skip")}
                      >
                        Skip: {result.skip}
                      </span>
                      <span
                        className="badge clickable"
                        onClick={() => openModal("fail")}
                      >
                        Fail: {result.fail}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal detail OK / Skip / Fail */}
      {modal.open && (
        <div
          className="modal"
          onClick={() => setModal({ open: false, type: null, list: [] })}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ fontWeight: 800 }}>
                Detail {modal.type?.toUpperCase()} ({modal.list.length})
              </div>
              <button
                className="btn"
                onClick={() => setModal({ open: false, type: null, list: [] })}
              >
                Tutup
              </button>
            </div>
            <table className="table" style={{ marginTop: 10 }}>
              <thead>
                <tr>
                  <th>NOSIS</th>
                  <th>Nama</th>
                  {modal.type === "fail" && <th>Error</th>}
                </tr>
              </thead>
              <tbody>
                {modal.list.map((r, i) => (
                  <tr key={i}>
                    <td>{r.nosis || "-"}</td>
                    <td>{r.nama || "-"}</td>
                    {modal.type === "fail" && <td>{r.error || "-"}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
