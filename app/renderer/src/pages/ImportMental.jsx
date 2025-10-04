// src/pages/ImportMental.jsx
import { useEffect, useState } from "react";
import Modal from "../components/Modal";
import ImportExcel from "../components/ImportExcel";
import RekapMental from "./RekapMental";

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
          ? "Import mental berhasil"
          : "Import mental selesai dengan error"}
        {summary && (
          <span style={{ marginLeft: 8, color: "#e5e7eb" }}>
            (OK: <b>{summary.ok}</b>, Skip: <b>{summary.skip}</b>, Fail:{" "}
            <b>{summary.fail}</b>)
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

export default function ImportMental() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0); // remount rekap setelah import

  // auto-dismiss banner
  useEffect(() => {
    if (!status) return;
    const t = setTimeout(() => setStatus(null), 6000);
    return () => clearTimeout(t);
  }, [status]);

  return (
    <>
      {/* Header + tombol Import */}
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
            Mental Kepribadian
          </div>
          <div className="muted">Rekap nilai mental per minggu</div>
        </div>
        <button className="btn" onClick={() => setOpen(true)}>
          ⬇️ Import Excel
        </button>
      </div>

      {/* Banner status */}
      <StatusBanner status={status} onClose={() => setStatus(null)} />

      {/* Rekap mental */}
      <div key={refreshKey}>
        <RekapMental />
      </div>

      {/* Modal import */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Import Mental Kepribadian"
        width={920}
      >
        <ImportExcel
          endpoint="mental"
          title="Import Mental Kepribadian"
          requireAngkatan
          onAfterImport={({ success, summary }) => {
            setStatus({ success: !!success, summary });
            setOpen(false);
            setRefreshKey((k) => k + 1);
          }}
        />
      </Modal>
    </>
  );
}
