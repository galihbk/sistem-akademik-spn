// src/pages/ImportJasmaniPolda.jsx
import { useEffect, useState } from "react";
import Modal from "../components/Modal";
import ImportExcel from "../components/ImportExcel";
import { useShell } from "../context/ShellContext";
import RekapJasmaniPolda from "./RekapJasmaniPolda";

function StatusBanner({ status, onClose }) {
  if (!status) return null;
  const { success, summary } = status;
  const tone = success
    ? { bg: "#07290f", br: "#14532d", fg: "#86efac" }
    : { bg: "#2a0b0b", br: "#7f1d1d", fg: "#fca5a5" };
  return (
    <div
      className="card"
      style={{
        background: tone.bg,
        border: `1px solid ${tone.br}`,
        color: tone.fg,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 12,
      }}
      role="status"
      aria-live="polite"
    >
      <div style={{ fontWeight: 700 }}>
        {success
          ? "Import jasmani POLDA berhasil"
          : "Import jasmani POLDA selesai dengan error"}
        {summary && (
          <span style={{ marginLeft: 8, color: "#e5e7eb" }}>
            (Inserted: <b>{summary.inserted ?? 0}</b>, Updated:{" "}
            <b>{summary.updated ?? 0}</b>, Skipped:{" "}
            <b>{summary.skipped ?? 0}</b>, Errors: <b>{summary.errors ?? 0}</b>)
          </span>
        )}
      </div>
      <button
        className="btn"
        onClick={onClose}
        style={{
          background: "transparent",
          border: `1px solid ${tone.br}`,
          color: tone.fg,
        }}
      >
        Tutup
      </button>
    </div>
  );
}

export default function ImportJasmaniPolda() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // prefill angkatan dari Shell (kalau diaktifkan di Topbar Shell)
  const { angkatan: angkatanFromShell } = useShell();

  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), 6000);
    return () => clearTimeout(t);
  }, [status]);

  return (
    <>
      {/* Header */}
      <div
        className="card"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>
            Nilai Jasmani POLDA
          </div>
          <div className="muted">
            Import-only ke tabel <code>jasmani_polda</code>; <b>siswa_id</b>{" "}
            akan di-plot manual kemudian.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => setOpen(true)}>
            ⬇️ Import Excel
          </button>
        </div>
      </div>

      {/* Banner */}
      <StatusBanner status={status} onClose={() => setStatus(null)} />

      {/* Rekap */}
      <div key={refreshKey}>
        <RekapJasmaniPolda />
      </div>

      {/* Modal import */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Import Nilai Jasmani POLDA"
        width={920}
      >
        <ImportExcel
          // samakan pola dengan SPN: endpoint khusus excel
          endpoint="/jasmani-polda/import-excel" // POST (multipart)
          title="Import Nilai Jasmani POLDA (Sheet: Sheet1)"
          templatePath="templates/Template-import-jasmani-polda.xlsx"
          requireAngkatan
          defaultAngkatan={angkatanFromShell || ""}
          // opsional: kirim meta (tahun/polda/panda) via query/body ImportExcel (sesuaikan komponenmu)
          // extraQuery={{ tahun: 2025, polda: 'POLDA DIY', panda: 'PANDA DIY' }}
          onAfterImport={({ success, summary }) => {
            setStatus({ success: !!success, summary: summary || {} });
            setOpen(false);
            setRefreshKey((k) => k + 1);
          }}
        />
      </Modal>
    </>
  );
}
