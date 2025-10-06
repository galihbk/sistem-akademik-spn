// src/pages/ImportJasmani.jsx
import { useEffect, useState } from "react";
import Modal from "../components/Modal";
import ImportExcel from "../components/ImportExcel";
import RekapJasmani from "./RekapJasmani";
import { useShell } from "../context/ShellContext";

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
          ? "Import jasmani berhasil"
          : "Import jasmani selesai dengan error"}
        {summary && (
          <span style={{ marginLeft: 8, color: "#e5e7eb" }}>
            (Inserted: <b>{summary.inserted}</b>, Updated:{" "}
            <b>{summary.updated}</b>, Skipped: <b>{summary.skipped}</b>, Errors:{" "}
            <b>{summary.errors}</b>)
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

export default function ImportJasmani() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // ambil angkatan default dari Shell (kalau ada)
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
          <div style={{ fontWeight: 800, fontSize: 18 }}>Nilai Jasmani</div>
          <div className="muted">
            Rekap hasil jasmani per siswa (ambil 1 baris per tahap).
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
        <RekapJasmani />
      </div>

      {/* Modal import */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Import Nilai Jasmani"
        width={920}
      >
        <ImportExcel
          endpoint="/jasmani/import-excel" // POST /jasmani/import-excel
          title="Import Nilai Jasmani (Sheet: REKAP)"
          requireAngkatan // <-- ini yang memunculkan dropdown angkatan
          defaultAngkatan={angkatanFromShell || ""} // prefill dari Shell kalau ada
          // kalau mau sertakan tahap di query import, isi extraQuery:
          // extraQuery={{ tahap: 1 }}
          onAfterImport={({ success, summary }) => {
            setStatus({ success: !!success, summary: summary || {} });
            setOpen(false);
            setRefreshKey((k) => k + 1); // refresh tabel
          }}
        />
      </Modal>
    </>
  );
}
